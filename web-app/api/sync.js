import { classifyVideo } from './lib/tag-classifier.js';

/**
 * /api/sync — Vercel Serverless Function
 *
 * Triggered daily by Vercel Cron. Fetches all YouTube videos from the channel,
 * compares with the current videos.json in the GitHub repo, classifies any
 * new videos using keyword-based tagging, and commits the updated file.
 *
 * Environment variables required:
 *   YOUTUBE_API_KEY  — YouTube Data API v3 key
 *   GITHUB_TOKEN     — GitHub PAT with `repo` scope
 *   CRON_SECRET      — Auto-set by Vercel for cron security
 */

const CHANNEL_ID = 'UCJPSeKWHcTMJzF69bdt6G9g';
const GITHUB_OWNER = 'alexk861';
const GITHUB_REPO = 'mujdedoenyas';
const FILE_PATH = 'web-app/src/data/videos.json';
const BRANCH = 'main';

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Format a view count number into a human-readable string.
 * e.g. 55000 → "55K", 1300 → "1.3K", 500 → "500"
 */
function formatViews(count) {
  const n = parseInt(count, 10);
  if (isNaN(n)) return '0';
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(n);
}

/**
 * Format an ISO date string into "Mon YYYY".
 * e.g. "2026-03-15T..." → "Mar 2026"
 */
function formatDate(isoDate) {
  const d = new Date(isoDate);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/**
 * Format an ISO 8601 duration (PT4M29S) into "M:SS".
 */
function formatDuration(isoDuration) {
  if (!isoDuration) return '0:00';
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return '0:00';
  const h = parseInt(match[1] || '0', 10);
  const m = parseInt(match[2] || '0', 10);
  const s = parseInt(match[3] || '0', 10);
  const totalMin = h * 60 + m;
  return `${totalMin}:${String(s).padStart(2, '0')}`;
}

// ── YouTube API ────────────────────────────────────────────────────────────────

/**
 * Fetch ALL videos from the channel's uploads playlist (handles pagination).
 */
async function fetchAllYouTubeVideos(apiKey) {
  // 1. Get the uploads playlist ID
  const chUrl = `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${CHANNEL_ID}&key=${apiKey}`;
  const chRes = await fetch(chUrl);
  const chData = await chRes.json();

  if (!chData.items || chData.items.length === 0) {
    throw new Error('YouTube channel not found');
  }

  const uploadsPlaylistId = chData.items[0].contentDetails.relatedPlaylists.uploads;

  // 2. Paginate through playlist items
  const allItems = [];
  let pageToken = '';

  do {
    const plUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsPlaylistId}&maxResults=50&key=${apiKey}${pageToken ? `&pageToken=${pageToken}` : ''}`;
    const plRes = await fetch(plUrl);
    const plData = await plRes.json();

    if (plData.items) {
      allItems.push(...plData.items);
    }

    pageToken = plData.nextPageToken || '';
  } while (pageToken);

  // 3. Get video details (statistics + contentDetails for duration) — in batches of 50
  const videoDetails = {};
  for (let i = 0; i < allItems.length; i += 50) {
    const batch = allItems.slice(i, i + 50);
    const ids = batch.map(item => item.snippet.resourceId.videoId).join(',');
    const vUrl = `https://www.googleapis.com/youtube/v3/videos?part=statistics,contentDetails&id=${ids}&key=${apiKey}`;
    const vRes = await fetch(vUrl);
    const vData = await vRes.json();

    if (vData.items) {
      for (const v of vData.items) {
        videoDetails[v.id] = {
          viewCount: v.statistics?.viewCount || '0',
          duration: v.contentDetails?.duration || 'PT0S',
        };
      }
    }
  }

  // 4. Combine into our schema
  return allItems.map(item => {
    const videoId = item.snippet.resourceId.videoId;
    const details = videoDetails[videoId] || { viewCount: '0', duration: 'PT0S' };

    return {
      title: item.snippet.title,
      videoId,
      views: formatViews(details.viewCount),
      date: formatDate(item.snippet.publishedAt),
      duration: formatDuration(details.duration),
      description: item.snippet.description || '',
      // Tag will be assigned by the classifier
      _rawDescription: item.snippet.description || '',
    };
  });
}

// ── GitHub API ──────────────────────────────────────────────────────────────────

/**
 * Read the current videos.json from GitHub.
 * Returns { content: parsed JSON array, sha: file SHA for updating }.
 */
async function readGitHubFile(token) {
  const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${FILE_PATH}?ref=${BRANCH}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
    },
  });

  if (res.status === 404) {
    return { content: [], sha: null };
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub read failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  const decoded = Buffer.from(data.content, 'base64').toString('utf-8');
  return { content: JSON.parse(decoded), sha: data.sha };
}

/**
 * Write the updated videos.json to GitHub (creates a commit).
 */
async function writeGitHubFile(token, content, sha) {
  const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${FILE_PATH}`;
  const body = {
    message: `🎹 Sync: ${new Date().toISOString().split('T')[0]} — auto-update videos`,
    content: Buffer.from(JSON.stringify(content, null, 2) + '\n').toString('base64'),
    branch: BRANCH,
  };

  if (sha) {
    body.sha = sha;
  }

  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub write failed (${res.status}): ${text}`);
  }

  return await res.json();
}

// ── Main handler ───────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  try {
    // 1. Security: verify cron secret (Vercel sets this header automatically)
    const authHeader = req.headers['authorization'];
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // 2. Check environment
    const apiKey = process.env.YOUTUBE_API_KEY || process.env.VITE_YOUTUBE_API_KEY;
    const githubToken = process.env.GITHUB_TOKEN;

    if (!apiKey) {
      return res.status(500).json({ error: 'YOUTUBE_API_KEY not configured' });
    }
    if (!githubToken) {
      return res.status(500).json({ error: 'GITHUB_TOKEN not configured' });
    }

    // 3. Fetch current videos from YouTube
    console.log('[sync] Fetching videos from YouTube...');
    const youtubeVideos = await fetchAllYouTubeVideos(apiKey);
    console.log(`[sync] Found ${youtubeVideos.length} videos on YouTube`);

    // 4. Read current videos.json from GitHub
    console.log('[sync] Reading current videos.json from GitHub...');
    const { content: existingVideos, sha } = await readGitHubFile(githubToken);
    console.log(`[sync] Current videos.json has ${existingVideos.length} videos`);

    // 5. Find new videos (not in existing list)
    const existingIds = new Set(existingVideos.map(v => v.videoId));
    const newVideos = youtubeVideos.filter(v => !existingIds.has(v.videoId));

    // 6. Also update view counts and descriptions for existing videos
    const youtubeMap = new Map(youtubeVideos.map(v => [v.videoId, v]));

    const updatedExisting = existingVideos.map(v => {
      const yt = youtubeMap.get(v.videoId);
      if (yt) {
        return {
          ...v,
          views: yt.views,           // Update view count
          description: yt.description || v.description,  // Update description
        };
      }
      return v;
    });

    if (newVideos.length === 0) {
      // Still commit if view counts changed
      const viewsChanged = existingVideos.some((v, i) => v.views !== updatedExisting[i].views);
      if (viewsChanged) {
        console.log('[sync] No new videos, but view counts updated. Committing...');
        await writeGitHubFile(githubToken, updatedExisting, sha);
        return res.status(200).json({
          message: 'View counts updated',
          newVideos: 0,
          totalVideos: updatedExisting.length,
        });
      }

      console.log('[sync] No changes detected.');
      return res.status(200).json({
        message: 'Already up to date',
        newVideos: 0,
        totalVideos: existingVideos.length,
      });
    }

    // 7. Classify and format new videos
    console.log(`[sync] Classifying ${newVideos.length} new videos...`);
    const classifiedNewVideos = newVideos.map(v => {
      const tag = classifyVideo(v.title, v._rawDescription);
      console.log(`  → "${v.title}" → [${tag}]`);
      return {
        title: v.title,
        videoId: v.videoId,
        views: v.views,
        date: v.date,
        duration: v.duration,
        tag,
        description: v.description,
      };
    });

    // 8. Merge: new videos at the top (most recent first)
    const merged = [...classifiedNewVideos, ...updatedExisting];

    // 9. Commit to GitHub
    console.log(`[sync] Committing ${merged.length} videos to GitHub...`);
    await writeGitHubFile(githubToken, merged, sha);

    console.log('[sync] Done!');
    return res.status(200).json({
      message: `Synced ${newVideos.length} new video(s)`,
      newVideos: classifiedNewVideos.map(v => ({ title: v.title, tag: v.tag })),
      totalVideos: merged.length,
    });

  } catch (error) {
    console.error('[sync] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
