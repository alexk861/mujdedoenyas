import fs from 'fs';
import path from 'path';

// Clean the title to make a nice slug, handling Turkish characters
function slugify(text) {
  const trMap = {
    'ç': 'c', 'Ç': 'c',
    'ğ': 'g', 'Ğ': 'g',
    'ı': 'i', 'I': 'i', 'İ': 'i',
    'ö': 'o', 'Ö': 'o',
    'ş': 's', 'Ş': 's',
    'ü': 'u', 'Ü': 'u'
  };

  return text
    .toString()
    .replace(/[çÇğĞıIİöÖşŞüÜ]/g, match => trMap[match])
    .toLowerCase()
    .normalize('NFD') // separate accents (for any other non-english characters)
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/\s+/g, '-')           // Replace spaces with -
    .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
    .replace(/\-\-+/g, '-')         // Replace multiple - with single -
    .replace(/^-+/, '')             // Trim - from start of text
    .replace(/-+$/, '');            // Trim - from end of text
}

async function fetchStats(videoId) {
  try {
    const res = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });
    const html = await res.text();
    const match = html.match(/var ytInitialData = (\{.*?\});/);
    if (match) {
      const data = JSON.parse(match[1]);
      const videoDetails = data.contents.twoColumnWatchNextResults.results.results.contents[0].videoPrimaryInfoRenderer;
      
      let views = videoDetails.viewCount.videoViewCountRenderer.viewCount.simpleText;
      views = views.replace(' views', '').replace(' görüntüleme', '');
      
      let likes = "0";
      try {
        const topLevelButtons = videoDetails.videoActions.menuRenderer.topLevelButtons;
        const likeButton = topLevelButtons.find(b => b.segmentedLikeDislikeButtonViewModel);
        if (likeButton) {
          likes = likeButton.segmentedLikeDislikeButtonViewModel.likeButtonViewModel.likeButtonViewModel.toggleButtonViewModel.toggleButtonViewModel.defaultButtonViewModel.buttonViewModel.title;
        }
      } catch(e) {}
      
      return { views, likes };
    }
  } catch(e) {
    console.error(`Error fetching stats for ${videoId}:`, e.message);
  }
  return null;
}

async function run() {
  const dataPath = path.resolve('./src/data/videos.json');
  const videos = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  
  console.log(`Syncing ${videos.length} videos...`);
  
  for (const video of videos) {
    // Ensure slug
    video.slug = slugify(video.title);
    
    console.log(`Fetching stats for: ${video.title} (${video.videoId})`);
    const stats = await fetchStats(video.videoId);
    if (stats) {
      video.views = stats.views;
      video.likes = stats.likes;
      console.log(` -> Views: ${stats.views}, Likes: ${stats.likes}`);
    } else {
      console.log(` -> Failed to fetch stats.`);
    }
    
    // Add small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  fs.writeFileSync(dataPath, JSON.stringify(videos, null, 2));
  console.log('Successfully updated videos.json!');
}

run();
