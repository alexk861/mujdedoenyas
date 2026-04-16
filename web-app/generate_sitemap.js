/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  Sitemap Generator with Video Sitemap Extensions
 *  For: mujdedoenyas.com
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *  Generates a sitemap.xml with:
 *  - Main page entry with video:video extensions for each video
 *  - Proper publication dates from raw ISO data (publishedAt field)
 *  - ISO 8601 durations for video:duration
 *  - High-res thumbnails
 *
 *  Run: node generate_sitemap.js  (executed automatically by `npm run prebuild`)
 * ═══════════════════════════════════════════════════════════════════════════
 */

import fs from 'fs';

const videos = JSON.parse(fs.readFileSync('./src/data/videos.json', 'utf8'));

// Determine the most recent video date for <lastmod>
const latestDate = videos.reduce((latest, v) => {
  const d = v.publishedAt || '2024-01-01';
  return d > latest ? d : latest;
}, '2024-01-01');

/**
 * Convert ISO 8601 duration (PT4M29S) to total seconds for video:duration.
 * The video sitemap spec requires duration in seconds.
 */
function isoDurationToSeconds(isoDuration) {
  if (!isoDuration) return null;
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return null;
  const h = parseInt(match[1] || '0', 10);
  const m = parseInt(match[2] || '0', 10);
  const s = parseInt(match[3] || '0', 10);
  return h * 3600 + m * 60 + s;
}

/**
 * Escape XML special characters in content.
 */
function escapeXml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
  <url>
    <loc>https://www.mujdedoenyas.com/</loc>
    <lastmod>${latestDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
`;

videos.forEach(v => {
  // Use publishedAt (raw ISO date) if available, otherwise fallback
  const pubDate = v.publishedAt
    ? `${v.publishedAt}T00:00:00+00:00`
    : '2024-01-01T00:00:00+00:00';

  // Use maxresdefault for best thumbnail quality
  const thumbnail = `https://i.ytimg.com/vi/${v.videoId}/maxresdefault.jpg`;

  // Clean description: first 1000 chars, stripped of problematic characters
  const desc = (v.description || `Piano cover of ${v.title} by Müjde Doenyas`)
    .substring(0, 1000);

  sitemap += `    <video:video>
      <video:thumbnail_loc>${thumbnail}</video:thumbnail_loc>
      <video:title><![CDATA[${v.title}]]></video:title>
      <video:description><![CDATA[${desc}]]></video:description>
      <video:content_loc>https://www.youtube.com/watch?v=${v.videoId}</video:content_loc>
      <video:player_loc allow_embed="yes">https://www.youtube.com/embed/${v.videoId}</video:player_loc>
      <video:publication_date>${pubDate}</video:publication_date>
      <video:family_friendly>yes</video:family_friendly>
      <video:uploader info="https://www.youtube.com/@mujdedoenyas">Müjde Doenyas</video:uploader>`;

  // Add duration in seconds if available
  const durationSec = isoDurationToSeconds(v.isoDuration);
  if (durationSec) {
    sitemap += `\n      <video:duration>${durationSec}</video:duration>`;
  }

  // Add tag if available
  if (v.tag) {
    sitemap += `\n      <video:tag>${escapeXml(v.tag)}</video:tag>`;
  }
  sitemap += `\n      <video:tag>piano cover</video:tag>`;
  sitemap += `\n      <video:tag>Müjde Doenyas</video:tag>`;

  sitemap += `\n    </video:video>\n`;
});

sitemap += `  </url>
</urlset>`;

fs.writeFileSync('./public/sitemap.xml', sitemap);
console.log(`✓ Sitemap generated with ${videos.length} videos (lastmod: ${latestDate})`);
