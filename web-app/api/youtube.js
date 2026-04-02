export default async function handler(req, res) {
  try {
    const API_KEY = process.env.VITE_YOUTUBE_API_KEY || process.env.YOUTUBE_API_KEY;
    if (!API_KEY) {
      return res.status(500).json({ error: 'YouTube API key is not configured.' });
    }

    const handle = 'mujdedoenyas';

    // 1. Get channel ID by handle
    const channelRes = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=contentDetails&forHandle=${handle}&key=${API_KEY}`);
    const channelData = await channelRes.json();

    if (!channelData.items || channelData.items.length === 0) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    const uploadsPlaylistId = channelData.items[0].contentDetails.relatedPlaylists.uploads;

    // 2. Fetch latest videos from uploads playlist
    const playlistRes = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsPlaylistId}&maxResults=10&key=${API_KEY}`);
    const playlistData = await playlistRes.json();

    if (!playlistData.items || playlistData.items.length === 0) {
      return res.status(200).json({ videos: [] });
    }

    const videoIds = playlistData.items.map(item => item.snippet.resourceId.videoId).join(',');

    // 3. Fetch video statistics (view count)
    const videosRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${videoIds}&key=${API_KEY}`);
    const videosData = await videosRes.json();

    // 4. Combine data
    const videos = playlistData.items.map(item => {
      const videoId = item.snippet.resourceId.videoId;
      const stats = videosData.items.find(v => v.id === videoId);

      return {
        title: item.snippet.title,
        url: `https://www.youtube.com/watch?v=${videoId}`,
        description: item.snippet.description,
        viewCount: stats?.statistics?.viewCount || '0',
        publishedAt: item.snippet.publishedAt,
        thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url
      };
    });

    // 5. Secure caching: 12 hours on Vercel CDN, refresh in background if stale
    res.setHeader('Cache-Control', 's-maxage=43200, stale-while-revalidate=86400');
    return res.status(200).json(videos);

  } catch (error) {
    console.error('YouTube API Error:', error);
    return res.status(500).json({ error: 'Failed to fetch YouTube data' });
  }
}
