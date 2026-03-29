import fs from 'fs';
import videos from './src/data/videos.js';

let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
  <url>
    <loc>https://www.mujdedoenyas.com/</loc>
    <lastmod>2026-03-29</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
`;

videos.forEach(v => {
  sitemap += `    <video:video>
      <video:thumbnail_loc>https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg</video:thumbnail_loc>
      <video:title><![CDATA[${v.title}]]></video:title>
      <video:description><![CDATA[${v.description.substring(0, 1000)}]]></video:description>
      <video:content_loc>https://www.youtube.com/watch?v=${v.videoId}</video:content_loc>
      <video:publication_date>2026-03-29T00:00:00+00:00</video:publication_date>
    </video:video>\n`;
});

sitemap += `  </url>
  <url>
    <loc>https://www.mujdedoenyas.com/#archive</loc>
    <lastmod>2026-03-29</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>`;

fs.writeFileSync('./public/sitemap.xml', sitemap);
console.log('Sitemap generated.');
