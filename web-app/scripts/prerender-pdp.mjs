/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  PDP Pre-renderer — Static Meta & JSON-LD for Crawlers
 *  For: mujdedoenyas.com
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *  After Vite builds dist/index.html, this script generates a static HTML
 *  file for each video PDP at dist/video/{slug}/index.html.
 *
 *  Each file is a copy of the SPA shell with the <head> meta tags and
 *  JSON-LD replaced with video-specific values. This ensures Google,
 *  Perplexity, ChatGPT, and other crawlers see correct structured data
 *  without needing JavaScript execution.
 *
 *  Run: node scripts/prerender-pdp.mjs  (executed by postbuild npm script)
 * ═══════════════════════════════════════════════════════════════════════════
 */

import fs from 'fs';
import path from 'path';

const DIST = './dist';
const VIDEOS_PATH = './src/data/videos.json';
const DOMAIN = 'https://www.mujdedoenyas.com';

const videos = JSON.parse(fs.readFileSync(VIDEOS_PATH, 'utf8'));
const shellHtml = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatUploadDate(value) {
  if (!value || typeof value !== 'string') return '2024-01-01T00:00:00Z';
  const t = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return `${t}T00:00:00Z`;
  if (/^\d{4}-\d{2}-\d{2}T/.test(t)) {
    return /[zZ]$/.test(t) || /[+-]\d{2}:\d{2}$/.test(t) ? t : `${t}Z`;
  }
  const d = new Date(t);
  return Number.isNaN(d.getTime()) ? '2024-01-01T00:00:00Z' : d.toISOString();
}

function viewsToInt(v) {
  if (!v) return 0;
  return parseInt(String(v).replace(/[^0-9]/g, ''), 10) || 0;
}

function cleanDescription(desc, title) {
  if (!desc) return `Piano performance of ${title} by Müjde Doenyas.`;
  return desc.split('\n')
    .filter(l => l.trim() && !l.startsWith('#'))
    .slice(0, 3)
    .join(' ')
    .substring(0, 300);
}

let generated = 0;

for (const video of videos) {
  if (!video.slug) continue;

  const canonicalUrl = `${DOMAIN}/video/${video.slug}`;
  const thumbUrl = `https://i.ytimg.com/vi/${video.videoId}/maxresdefault.jpg`;
  const uploadDate = formatUploadDate(video.publishedAt);
  const metaDesc = cleanDescription(video.description, video.title);
  const pageTitle = `${video.title} | Müjde Doenyas`;

  // Build JSON-LD
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "VideoObject",
        "@id": `${canonicalUrl}#video`,
        "name": video.title,
        "description": metaDesc,
        "thumbnailUrl": [thumbUrl, `https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`],
        "uploadDate": uploadDate,
        ...(video.isoDuration && { "duration": video.isoDuration }),
        "contentUrl": `https://www.youtube.com/watch?v=${video.videoId}`,
        "embedUrl": `https://www.youtube.com/embed/${video.videoId}`,
        "interactionStatistic": [
          {
            "@type": "InteractionCounter",
            "interactionType": { "@type": "WatchAction" },
            "userInteractionCount": viewsToInt(video.views)
          },
          ...(video.likes && video.likes !== "0" ? [{
            "@type": "InteractionCounter",
            "interactionType": { "@type": "LikeAction" },
            "userInteractionCount": parseInt(video.likes, 10) || 0
          }] : [])
        ],
        "author": {
          "@type": "Person",
          "@id": `${DOMAIN}/#person`,
          "name": "Müjde Doenyas",
          "url": DOMAIN,
          "sameAs": [
            "https://www.youtube.com/@mujdedoenyas",
            "https://www.instagram.com/mujdedoenyas"
          ]
        },
        "publisher": { "@id": `${DOMAIN}/#person` },
        "genre": video.tag === 'classical' ? 'Classical' : video.tag === 'turkish' ? 'Turkish Classical' : 'Film Soundtrack',
        "inLanguage": "tr",
        "isFamilyFriendly": true
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Home", "item": `${DOMAIN}/` },
          { "@type": "ListItem", "position": 2, "name": "Archive", "item": `${DOMAIN}/#archive` },
          { "@type": "ListItem", "position": 3, "name": video.title, "item": canonicalUrl }
        ]
      }
    ]
  };

  // Build the new <head> content to inject
  const metaBlock = `
    <title>${escapeHtml(pageTitle)}</title>
    <meta name="description" content="${escapeHtml(metaDesc)}" />
    <link rel="canonical" href="${canonicalUrl}" />
    <meta name="robots" content="index, follow, max-image-preview:large, max-video-preview:-1" />
    <meta property="og:title" content="${escapeHtml(pageTitle)}" />
    <meta property="og:description" content="${escapeHtml(metaDesc)}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${canonicalUrl}" />
    <meta property="og:site_name" content="Müjde Doenyas" />
    <meta property="og:image" content="${thumbUrl}" />
    <meta property="og:image:width" content="1280" />
    <meta property="og:image:height" content="720" />
    <meta property="og:locale" content="tr_TR" />
    <meta property="og:locale:alternate" content="en_US" />
    <meta property="og:locale:alternate" content="it_IT" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(pageTitle)}" />
    <meta name="twitter:description" content="${escapeHtml(metaDesc)}" />
    <meta name="twitter:image" content="${thumbUrl}" />
    <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`;

  // Replace fallback meta tags in shell HTML
  let html = shellHtml;

  // Replace <title>
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(pageTitle)}</title>`);

  // Replace meta description
  html = html.replace(
    /<meta name="description" content="[^"]*"\s*\/?>/,
    `<meta name="description" content="${escapeHtml(metaDesc)}" />`
  );

  // Replace OG tags
  html = html.replace(/<meta property="og:title" content="[^"]*"\s*\/?>/, `<meta property="og:title" content="${escapeHtml(pageTitle)}" />`);
  html = html.replace(/<meta property="og:description" content="[^"]*"\s*\/?>/, `<meta property="og:description" content="${escapeHtml(metaDesc)}" />`);
  html = html.replace(/<meta property="og:type" content="[^"]*"\s*\/?>/, `<meta property="og:type" content="website" />`);
  html = html.replace(/<meta property="og:url" content="[^"]*"\s*\/?>/, `<meta property="og:url" content="${canonicalUrl}" />`);
  html = html.replace(/<meta property="og:image" content="[^"]*"\s*\/?>/, `<meta property="og:image" content="${thumbUrl}" />`);

  // Replace Twitter tags
  html = html.replace(/<meta name="twitter:card" content="[^"]*"\s*\/?>/, `<meta name="twitter:card" content="summary_large_image" />`);
  html = html.replace(/<meta name="twitter:title" content="[^"]*"\s*\/?>/, `<meta name="twitter:title" content="${escapeHtml(pageTitle)}" />`);
  html = html.replace(/<meta name="twitter:description" content="[^"]*"\s*\/?>/, `<meta name="twitter:description" content="${escapeHtml(metaDesc)}" />`);

  // Inject canonical, robots, JSON-LD, and additional OG/Twitter tags before </head>
  const additionalTags = `
    <link rel="canonical" href="${canonicalUrl}" />
    <meta name="robots" content="index, follow, max-image-preview:large, max-video-preview:-1" />
    <meta property="og:site_name" content="Müjde Doenyas" />
    <meta property="og:image:width" content="1280" />
    <meta property="og:image:height" content="720" />
    <meta property="og:locale" content="tr_TR" />
    <meta property="og:locale:alternate" content="en_US" />
    <meta property="og:locale:alternate" content="it_IT" />
    <meta name="twitter:image" content="${thumbUrl}" />
    <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
  `;

  html = html.replace('</head>', `${additionalTags}</head>`);

  // Write to dist/video/{slug}/index.html
  const outDir = path.join(DIST, 'video', video.slug);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'index.html'), html);
  generated++;
}

console.log(`✓ Pre-rendered ${generated} PDP pages with SEO meta + JSON-LD`);
