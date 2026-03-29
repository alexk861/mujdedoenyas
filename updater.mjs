import fs from 'fs/promises';

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function fetchDescription(videoId) {
  try {
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)", "Accept-Language": "en-US,en;q=0.9" } });
    if (!res.ok) return "";
    const html = await res.text();
    const match = html.match(/"shortDescription":"(.*?)"/);
    if (match) {
      let parsed = "";
      try {
        parsed = JSON.parse('"' + match[1] + '"');
      } catch (e) {
        parsed = match[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
      }
      return parsed.trim();
    }
    return "";
  } catch (e) {
    return "";
  }
}

async function main() {
  const file = './src/data/videos.js';
  const content = await fs.readFile(file, 'utf8');
  
  let newContent = content;
  // regex to match video objects
  const regex = /{\s*title:\s*".+?",\s*videoId:\s*"([^"]+)",[\s\S]*?tag:\s*".+?",\s*}/g;
  
  let match;
  let matches = [];
  while ((match = regex.exec(content)) !== null) {
      matches.push({
          fullMatch: match[0],
          videoId: match[1]
      });
  }
  
  console.log(`Found ${matches.length} videos.`);
  
  for (let m of matches) {
      console.log(`Fetching desc for ${m.videoId}...`);
      const desc = await fetchDescription(m.videoId);
      await sleep(1500); // polite delay
      
      let safeDesc = JSON.stringify(desc || "");
      
      // We know there's a trailing comma on tag (e.g. `tag: "classical",\n  }`)
      let replacement = m.fullMatch.replace(/(\n\s*)}$/, `\n    description: ${safeDesc},$1`);
      
      newContent = newContent.replace(m.fullMatch, replacement);
  }
  
  await fs.writeFile(file, newContent, 'utf8');
  console.log("Done parsing and injecting descriptions!");
}

main().catch(console.error);
