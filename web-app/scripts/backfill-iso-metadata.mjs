#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  Backfill ISO Metadata
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *  One-time script to add `isoDuration` and `publishedAt` fields to
 *  existing videos in videos.json that were synced before these fields
 *  were added to sync.js.
 *
 *  Run:  node scripts/backfill-iso-metadata.mjs
 *
 *  Requires:
 *    YOUTUBE_API_KEY or VITE_YOUTUBE_API_KEY in .env or environment
 * ═══════════════════════════════════════════════════════════════════════════
 */

import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Manual .env loader (no external dependency needed)
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const match = line.match(/^([^#=]+)=["']?(.+?)["']?\s*$/);
    if (match) process.env[match[1].trim()] = match[2].trim();
  }
}

const API_KEY = process.env.YOUTUBE_API_KEY || process.env.VITE_YOUTUBE_API_KEY;
if (!API_KEY) {
  console.error('ERROR: Set YOUTUBE_API_KEY in .env');
  process.exit(1);
}

const VIDEOS_PATH = './src/data/videos.json';
const videos = JSON.parse(fs.readFileSync(VIDEOS_PATH, 'utf8'));

// Find videos missing the new fields
const needsBackfill = videos.filter(v => !v.isoDuration || !v.publishedAt);

if (needsBackfill.length === 0) {
  console.log('✓ All videos already have ISO metadata. Nothing to do.');
  process.exit(0);
}

console.log(`Found ${needsBackfill.length} videos needing ISO metadata backfill...`);

// Fetch in batches of 50 (YouTube API limit)
for (let i = 0; i < needsBackfill.length; i += 50) {
  const batch = needsBackfill.slice(i, i + 50);
  const ids = batch.map(v => v.videoId).join(',');

  const url = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,snippet&id=${ids}&key=${API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();

  if (!data.items) {
    console.error('YouTube API error:', data.error?.message || 'Unknown error');
    continue;
  }

  const detailsMap = new Map();
  for (const item of data.items) {
    detailsMap.set(item.id, {
      isoDuration: item.contentDetails?.duration || 'PT0S',
      publishedAt: item.snippet?.publishedAt || '2024-01-01T00:00:00Z',
    });
  }

  // Apply to the main videos array
  for (const v of videos) {
    const details = detailsMap.get(v.videoId);
    if (details) {
      if (!v.isoDuration) v.isoDuration = details.isoDuration;
      if (!v.publishedAt) v.publishedAt = details.publishedAt;
    }
  }

  console.log(`  Batch ${Math.floor(i / 50) + 1}: backfilled ${data.items.length} videos`);

  // Small delay between batches
  if (i + 50 < needsBackfill.length) {
    await new Promise(r => setTimeout(r, 200));
  }
}

// Write updated videos.json
fs.writeFileSync(VIDEOS_PATH, JSON.stringify(videos, null, 2) + '\n');
console.log(`\n✓ Backfill complete. Updated ${VIDEOS_PATH}`);
