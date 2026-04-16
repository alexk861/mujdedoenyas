/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  /api/schema — Vercel Serverless Function
 *  Dynamic VideoObject JSON-LD Schema Generator
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *  Returns a production-ready JSON-LD VideoObject schema for any YouTube
 *  video ID. Designed for SEO injection, sitemap enrichment, and
 *  programmatic schema generation.
 *
 *  Usage:
 *    GET /api/schema?v=VIDEO_ID              → JSON-LD object
 *    GET /api/schema?v=VIDEO_ID&format=html   → wrapped in <script> tag
 *    GET /api/schema?v=ID1,ID2,ID3           → array of schemas (batch)
 *
 *  Environment variables required:
 *    YOUTUBE_API_KEY — YouTube Data API v3 key
 *
 *  Caching: 24h on Vercel CDN, stale-while-revalidate for 48h
 * ═══════════════════════════════════════════════════════════════════════════
 */

const SITE_URL = 'https://www.mujdedoenyas.com';
const PUBLISHER_NAME = 'Müjde Doenyas';
const CHANNEL_URL = 'https://www.youtube.com/@mujdedoenyas';

// ── Spam patterns to strip from descriptions ────────────────────────────────

const SPAM_PATTERNS = [
  /subscribe/i, /abone/i, /follow.*new.*video/i,
  /like.*share/i, /notification.*bell/i,
  /beğen.*paylaş/i, /bildiri.*zil/i,
];

/**
 * Clean a YouTube description for structured data use.
 * Strips spam, hashtags, piano model lines. Truncates to ~300 chars.
 */
function cleanDescription(raw, title) {
  if (!raw || !raw.trim()) {
    return `Piano cover of ${title} by ${PUBLISHER_NAME}. Watch the full performance at ${SITE_URL}`;
  }

  const lines = raw.split('\n');
  const clean = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('#') || trimmed.split('#').length > 3) continue;
    if (trimmed.startsWith('🎹')) continue;
    if (SPAM_PATTERNS.some(p => p.test(trimmed))) continue;
    clean.push(trimmed);
  }

  let result = clean.join(' ');
  if (result.length > 300) {
    result = result.substring(0, 297).replace(/\s\S*$/, '') + '...';
  }

  return result || `Piano cover of ${title} by ${PUBLISHER_NAME}.`;
}


/**
 * Fetch video metadata from YouTube Data API v3.
 */
async function fetchVideoData(apiKey, videoId) {
  const url = `https://www.googleapis.com/youtube/v3/videos`
    + `?part=snippet,contentDetails,statistics`
    + `&id=${videoId}`
    + `&key=${apiKey}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`YouTube API returned ${res.status}`);
  }

  const data = await res.json();
  if (!data.items || data.items.length === 0) {
    return null;
  }

  return data.items[0];
}


/**
 * Select the best available thumbnail URL.
 */
function getBestThumbnail(thumbnails) {
  for (const key of ['maxres', 'standard', 'high', 'medium', 'default']) {
    if (thumbnails[key]?.url) return thumbnails[key].url;
  }
  return '';
}


/**
 * Build a complete VideoObject JSON-LD schema from YouTube API response.
 *
 * Conforms to Google's VideoObject structured data requirements:
 * https://developers.google.com/search/docs/appearance/structured-data/video
 */
function buildSchema(item) {
  const { snippet, contentDetails, statistics } = item;
  const videoId = item.id;
  const thumbnailUrl = getBestThumbnail(snippet.thumbnails || {});

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',

    // ── Required properties ─────────────────────────────────────────────
    name: snippet.title,
    description: cleanDescription(snippet.description, snippet.title),
    thumbnailUrl: [
      thumbnailUrl,
      `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    ],
    uploadDate: snippet.publishedAt,

    // ── Duration in ISO 8601 (required by Google) ───────────────────────
    duration: contentDetails.duration,

    // ── Content URLs ────────────────────────────────────────────────────
    contentUrl: `https://www.youtube.com/watch?v=${videoId}`,
    embedUrl: `https://www.youtube.com/embed/${videoId}`,

    // ── Interaction count ───────────────────────────────────────────────
    interactionStatistic: {
      '@type': 'InteractionCounter',
      interactionType: { '@type': 'WatchAction' },
      userInteractionCount: parseInt(statistics?.viewCount || '0', 10),
    },

    // ── Author / Publisher ──────────────────────────────────────────────
    author: {
      '@type': 'Person',
      name: PUBLISHER_NAME,
      url: SITE_URL,
      sameAs: [CHANNEL_URL, 'https://www.instagram.com/mujdedoenyas'],
    },
    publisher: {
      '@type': 'Person',
      name: PUBLISHER_NAME,
      url: SITE_URL,
    },

    // ── Page context ────────────────────────────────────────────────────
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${SITE_URL}/#archive`,
    },

    inLanguage: 'en',
    isFamilyFriendly: true,
  };

  // Add keywords from YouTube tags
  if (snippet.tags?.length > 0) {
    schema.keywords = snippet.tags.slice(0, 15).join(', ');
  }

  return schema;
}


// ── Main Handler ────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  try {
    const apiKey = process.env.YOUTUBE_API_KEY || process.env.VITE_YOUTUBE_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'YOUTUBE_API_KEY not configured' });
    }

    const videoParam = req.query.v || req.query.id;
    const format = req.query.format || 'json'; // 'json' or 'html'

    if (!videoParam) {
      return res.status(400).json({
        error: 'Missing required parameter: v (video ID)',
        usage: '/api/schema?v=VIDEO_ID',
        batch: '/api/schema?v=ID1,ID2,ID3',
      });
    }

    // Support batch: comma-separated IDs
    const videoIds = videoParam.split(',').map(id => id.trim()).filter(Boolean);

    if (videoIds.length === 0) {
      return res.status(400).json({ error: 'No valid video IDs provided' });
    }

    // Fetch and build schemas
    const schemas = [];
    for (const vid of videoIds.slice(0, 10)) { // Cap at 10 for safety
      const item = await fetchVideoData(apiKey, vid);
      if (item) {
        schemas.push(buildSchema(item));
      }
    }

    if (schemas.length === 0) {
      return res.status(404).json({ error: 'No videos found for the provided ID(s)' });
    }

    // Cache aggressively — schema data changes rarely
    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=172800');
    res.setHeader('Content-Type', format === 'html' ? 'text/html; charset=utf-8' : 'application/json; charset=utf-8');

    // Single video: return object. Multiple: return array.
    const result = schemas.length === 1 ? schemas[0] : schemas;

    if (format === 'html') {
      const json = JSON.stringify(result, null, 2);
      return res.status(200).send(`<script type="application/ld+json">\n${json}\n</script>`);
    }

    return res.status(200).json(result);

  } catch (error) {
    console.error('[schema] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
