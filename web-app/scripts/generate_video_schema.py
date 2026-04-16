#!/usr/bin/env python3
"""
═══════════════════════════════════════════════════════════════════════════════
  Dynamic VideoObject Schema Generator
  For: mujdedoenyas.com — Müjde Doenyas Piano Covers
═══════════════════════════════════════════════════════════════════════════════

  Fetches YouTube video metadata via the Data API v3 and outputs a
  production-ready JSON-LD VideoObject schema block for injection into
  the <head> of any webpage.

  Usage:
    python generate_video_schema.py <VIDEO_ID>
    python generate_video_schema.py <VIDEO_ID> --output schema.json
    python generate_video_schema.py <VIDEO_ID> --batch ids.txt

  Environment:
    YOUTUBE_API_KEY  — required, set in .env or shell environment

  Output:
    A valid JSON-LD <script> block conforming to Google's VideoObject
    rich results spec: https://developers.google.com/search/docs/appearance/structured-data/video
═══════════════════════════════════════════════════════════════════════════════
"""

import os
import sys
import json
import argparse
import re
from datetime import datetime
from pathlib import Path

# ── Fix Windows console encoding (cp1252 can't handle emoji / non-Latin) ─────
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

# ── Optional: load .env from project root ────────────────────────────────────
try:
    from dotenv import load_dotenv
    # Walk up to find the .env file (supports running from /scripts or /web-app)
    env_path = Path(__file__).resolve().parent.parent / ".env"
    if env_path.exists():
        load_dotenv(env_path)
    env_local = Path(__file__).resolve().parent.parent / ".env.local"
    if env_local.exists():
        load_dotenv(env_local, override=True)
except ImportError:
    pass  # python-dotenv not installed — user must export YOUTUBE_API_KEY manually

# ── Google API Client ────────────────────────────────────────────────────────
try:
    from googleapiclient.discovery import build
    from googleapiclient.errors import HttpError
except ImportError:
    print("ERROR: google-api-python-client is required.")
    print("Install it:  pip install google-api-python-client")
    sys.exit(1)


# ═══════════════════════════════════════════════════════════════════════════════
#  Constants
# ═══════════════════════════════════════════════════════════════════════════════

SITE_URL = "https://www.mujdedoenyas.com"
PUBLISHER_NAME = "Müjde Doenyas"
PUBLISHER_LOGO = f"{SITE_URL}/og-image.jpg"
CHANNEL_URL = "https://www.youtube.com/@mujdedoenyas"


# ═══════════════════════════════════════════════════════════════════════════════
#  YouTube API Integration
# ═══════════════════════════════════════════════════════════════════════════════

def get_youtube_client(api_key: str):
    """Build and return a YouTube Data API v3 client."""
    return build("youtube", "v3", developerKey=api_key)


def fetch_video_metadata(youtube, video_id: str) -> dict:
    """
    Fetch comprehensive metadata for a single YouTube video.

    Returns a dict with:
      - title, description, publishedAt, channelTitle
      - thumbnails (all resolutions)
      - duration (ISO 8601), viewCount, likeCount
      - tags, categoryId
    """
    response = youtube.videos().list(
        part="snippet,contentDetails,statistics",
        id=video_id
    ).execute()

    if not response.get("items"):
        raise ValueError(f"Video not found: {video_id}")

    item = response["items"][0]
    snippet = item["snippet"]
    content = item["contentDetails"]
    stats = item.get("statistics", {})

    return {
        "videoId": video_id,
        "title": snippet["title"],
        "description": snippet.get("description", ""),
        "publishedAt": snippet["publishedAt"],          # ISO 8601 datetime
        "channelTitle": snippet.get("channelTitle", PUBLISHER_NAME),
        "thumbnails": snippet.get("thumbnails", {}),
        "duration": content["duration"],                 # ISO 8601 duration (PT4M29S)
        "viewCount": int(stats.get("viewCount", 0)),
        "likeCount": int(stats.get("likeCount", 0)),
        "tags": snippet.get("tags", []),
        "categoryId": snippet.get("categoryId", ""),
    }


# ═══════════════════════════════════════════════════════════════════════════════
#  Thumbnail Resolution Selection
# ═══════════════════════════════════════════════════════════════════════════════

def get_best_thumbnail(thumbnails: dict) -> str:
    """
    Select the highest-resolution thumbnail available.
    Priority: maxres (1280×720) > standard (640×480) > high (480×360) > medium > default
    """
    for key in ("maxres", "standard", "high", "medium", "default"):
        if key in thumbnails and thumbnails[key].get("url"):
            return thumbnails[key]["url"]
    return ""


# ═══════════════════════════════════════════════════════════════════════════════
#  ISO 8601 Duration Handling
# ═══════════════════════════════════════════════════════════════════════════════

def iso_duration_to_seconds(iso_duration: str) -> int:
    """
    Convert ISO 8601 duration (e.g. PT4M29S, PT1H2M3S) to total seconds.
    Used for the 'duration' property in VideoObject schema.
    """
    match = re.match(
        r"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?",
        iso_duration
    )
    if not match:
        return 0
    hours = int(match.group(1) or 0)
    minutes = int(match.group(2) or 0)
    seconds = int(match.group(3) or 0)
    return hours * 3600 + minutes * 60 + seconds


def format_display_duration(iso_duration: str) -> str:
    """Convert ISO 8601 duration to human-readable M:SS or H:MM:SS."""
    total = iso_duration_to_seconds(iso_duration)
    hours, remainder = divmod(total, 3600)
    minutes, seconds = divmod(remainder, 60)
    if hours > 0:
        return f"{hours}:{minutes:02d}:{seconds:02d}"
    return f"{minutes}:{seconds:02d}"


# ═══════════════════════════════════════════════════════════════════════════════
#  JSON-LD VideoObject Schema Builder
# ═══════════════════════════════════════════════════════════════════════════════

def build_video_schema(metadata: dict) -> dict:
    """
    Build a fully compliant JSON-LD VideoObject schema from YouTube metadata.

    Conforms to:
    - Google's VideoObject structured data spec
    - Schema.org VideoObject definition
    - Rich Results Test requirements

    Reference: https://developers.google.com/search/docs/appearance/structured-data/video
    """
    video_id = metadata["videoId"]
    thumbnail_url = get_best_thumbnail(metadata["thumbnails"])

    # Parse upload date to ISO 8601 date format
    upload_date = metadata["publishedAt"]  # Already ISO 8601 from YouTube

    # Build the primary description for schema
    # Use first 200 chars of the YouTube description, cleaned up
    raw_desc = metadata["description"]
    schema_description = _clean_description(raw_desc, metadata["title"])

    schema = {
        "@context": "https://schema.org",
        "@type": "VideoObject",

        # ── Required Properties ──────────────────────────────────────────
        "name": metadata["title"],
        "description": schema_description,
        "thumbnailUrl": [
            thumbnail_url,
            # Also include a fallback hqdefault URL
            f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg"
        ],
        "uploadDate": upload_date,

        # ── Duration (ISO 8601 format — required by Google) ──────────────
        "duration": metadata["duration"],  # e.g. "PT4M29S"

        # ── Content URLs ─────────────────────────────────────────────────
        "contentUrl": f"https://www.youtube.com/watch?v={video_id}",
        "embedUrl": f"https://www.youtube.com/embed/{video_id}",

        # ── Interaction Statistics ────────────────────────────────────────
        "interactionStatistic": {
            "@type": "InteractionCounter",
            "interactionType": {"@type": "WatchAction"},
            "userInteractionCount": metadata["viewCount"]
        },

        # ── Publisher (Person, not Organization) ─────────────────────────
        "author": {
            "@type": "Person",
            "name": PUBLISHER_NAME,
            "url": SITE_URL,
            "sameAs": [
                CHANNEL_URL,
                "https://www.instagram.com/mujdedoenyas"
            ]
        },

        # ── Additional recommended properties ───────────────────────────
        "publisher": {
            "@type": "Person",
            "name": PUBLISHER_NAME,
            "url": SITE_URL
        },

        # ── Where the video is hosted on our site ────────────────────────
        "mainEntityOfPage": {
            "@type": "WebPage",
            "@id": f"{SITE_URL}/#archive"
        },

        # ── Accessibility ────────────────────────────────────────────────
        "inLanguage": "en",
        "isFamilyFriendly": True,
    }

    # Add keywords from YouTube tags if available
    if metadata.get("tags"):
        schema["keywords"] = ", ".join(metadata["tags"][:15])

    return schema


def _clean_description(raw: str, title: str) -> str:
    """
    Clean a YouTube description for use in schema.org markup.
    - Strips subscribe/promo spam
    - Strips hashtags and emoji lines
    - Truncates to a reasonable SEO-friendly length
    - Adds a fallback if empty
    """
    if not raw or not raw.strip():
        return f"Piano cover of {title} by {PUBLISHER_NAME}. " \
               f"Watch the full performance at {SITE_URL}"

    lines = raw.split("\n")
    clean_lines = []

    # Patterns to strip
    spam_patterns = [
        re.compile(r"subscribe", re.IGNORECASE),
        re.compile(r"abone", re.IGNORECASE),
        re.compile(r"follow.*new.*video", re.IGNORECASE),
        re.compile(r"like.*share", re.IGNORECASE),
        re.compile(r"notification.*bell", re.IGNORECASE),
    ]

    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue
        # Skip hashtag lines
        if stripped.startswith("#") or stripped.count("#") >= 3:
            continue
        # Skip piano model lines
        if stripped.startswith("🎹"):
            continue
        # Skip subscribe / promo spam
        if any(p.search(stripped) for p in spam_patterns):
            continue
        clean_lines.append(stripped)

    # Join and truncate to ~300 chars for optimal SEO description
    result = " ".join(clean_lines)
    if len(result) > 300:
        result = result[:297].rsplit(" ", 1)[0] + "..."

    return result or f"Piano cover of {title} by {PUBLISHER_NAME}."


# ═══════════════════════════════════════════════════════════════════════════════
#  Output Formatters
# ═══════════════════════════════════════════════════════════════════════════════

def format_as_json_ld_tag(schema: dict) -> str:
    """Wrap the schema dict in a <script type="application/ld+json"> tag."""
    json_str = json.dumps(schema, indent=2, ensure_ascii=False)
    return f'<script type="application/ld+json">\n{json_str}\n</script>'


def format_as_raw_json(schema: dict) -> str:
    """Return just the JSON (no script tags) for API consumption."""
    return json.dumps(schema, indent=2, ensure_ascii=False)


# ═══════════════════════════════════════════════════════════════════════════════
#  Batch Processing
# ═══════════════════════════════════════════════════════════════════════════════

def process_batch(youtube, video_ids: list[str], output_dir: str = None) -> list[dict]:
    """
    Process multiple video IDs and return a list of schemas.
    Optionally writes individual .json files to output_dir.
    """
    results = []
    for vid in video_ids:
        vid = vid.strip()
        if not vid or vid.startswith("#"):
            continue
        try:
            print(f"  → Fetching: {vid}", file=sys.stderr)
            metadata = fetch_video_metadata(youtube, vid)
            schema = build_video_schema(metadata)
            results.append(schema)

            if output_dir:
                out_path = Path(output_dir) / f"{vid}.json"
                out_path.write_text(format_as_raw_json(schema), encoding="utf-8")
                print(f"    ✓ Saved to {out_path}", file=sys.stderr)

        except Exception as e:
            print(f"    ✗ Error for {vid}: {e}", file=sys.stderr)

    return results


# ═══════════════════════════════════════════════════════════════════════════════
#  CLI Entry Point
# ═══════════════════════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(
        description="Generate JSON-LD VideoObject schema from a YouTube video ID.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s dQw4w9WgXcQ
  %(prog)s dQw4w9WgXcQ --format json --output schema.json
  %(prog)s --batch video_ids.txt --output-dir ./schemas/
        """
    )

    parser.add_argument(
        "video_id",
        nargs="?",
        help="YouTube Video ID (e.g. dQw4w9WgXcQ)"
    )
    parser.add_argument(
        "--format",
        choices=["html", "json"],
        default="html",
        help="Output format: 'html' wraps in <script> tag, 'json' outputs raw JSON (default: html)"
    )
    parser.add_argument(
        "--output", "-o",
        help="Write output to file instead of stdout"
    )
    parser.add_argument(
        "--batch", "-b",
        help="Path to a text file with one video ID per line"
    )
    parser.add_argument(
        "--output-dir",
        help="Directory for batch output (one .json per video)"
    )
    parser.add_argument(
        "--api-key",
        help="YouTube API key (overrides YOUTUBE_API_KEY env var)"
    )

    args = parser.parse_args()

    # ── Resolve API key ──────────────────────────────────────────────────
    api_key = (
        args.api_key
        or os.environ.get("YOUTUBE_API_KEY")
        or os.environ.get("VITE_YOUTUBE_API_KEY")
    )

    if not api_key:
        print(
            "ERROR: YouTube API key not found.\n"
            "Set YOUTUBE_API_KEY in your .env file or pass --api-key <KEY>",
            file=sys.stderr
        )
        sys.exit(1)

    # ── Build YouTube client ─────────────────────────────────────────────
    youtube = get_youtube_client(api_key)

    # ── Batch mode ───────────────────────────────────────────────────────
    if args.batch:
        batch_path = Path(args.batch)
        if not batch_path.exists():
            print(f"ERROR: Batch file not found: {args.batch}", file=sys.stderr)
            sys.exit(1)

        video_ids = batch_path.read_text(encoding="utf-8").strip().splitlines()
        print(f"Processing {len(video_ids)} video(s)...", file=sys.stderr)

        out_dir = args.output_dir
        if out_dir:
            Path(out_dir).mkdir(parents=True, exist_ok=True)

        schemas = process_batch(youtube, video_ids, out_dir)

        # Also output combined array
        if args.output:
            Path(args.output).write_text(
                json.dumps(schemas, indent=2, ensure_ascii=False),
                encoding="utf-8"
            )
            print(f"\n✓ Combined output saved to {args.output}", file=sys.stderr)
        elif not out_dir:
            print(json.dumps(schemas, indent=2, ensure_ascii=False))

        print(f"\n✓ Processed {len(schemas)} video(s) successfully.", file=sys.stderr)
        return

    # ── Single video mode ────────────────────────────────────────────────
    if not args.video_id:
        parser.error("Video ID is required (or use --batch for multiple)")

    try:
        metadata = fetch_video_metadata(youtube, args.video_id)
        schema = build_video_schema(metadata)

        # Format output
        if args.format == "html":
            output = format_as_json_ld_tag(schema)
        else:
            output = format_as_raw_json(schema)

        # Write or print
        if args.output:
            Path(args.output).write_text(output, encoding="utf-8")
            print(f"✓ Schema saved to {args.output}", file=sys.stderr)
        else:
            print(output)

        # Print summary to stderr
        print(f"\n── Video Summary ──", file=sys.stderr)
        print(f"  Title:    {metadata['title']}", file=sys.stderr)
        print(f"  Duration: {metadata['duration']} ({format_display_duration(metadata['duration'])})", file=sys.stderr)
        print(f"  Views:    {metadata['viewCount']:,}", file=sys.stderr)
        print(f"  Uploaded: {metadata['publishedAt'][:10]}", file=sys.stderr)
        print(f"  Thumb:    {get_best_thumbnail(metadata['thumbnails'])}", file=sys.stderr)

    except ValueError as e:
        print(f"ERROR: {e}", file=sys.stderr)
        sys.exit(1)
    except HttpError as e:
        print(f"YouTube API Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
