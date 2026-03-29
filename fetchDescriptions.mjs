import fs from 'fs/promises';

async function main() {
  const url = 'https://www.youtube.com/watch?v=WFoqJ7Q0leQ';
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0"} });
  const html = await res.text();
  const match = html.match(/"shortDescription":"(.*?)"/);
  if (match) {
    const desc = match[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
    console.log(desc);
  } else {
    console.log("Not found.");
  }
}

main().catch(console.error);
