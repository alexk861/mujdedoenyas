async function test() {
  const res = await fetch('https://www.youtube.com/watch?v=cy7JfxykoU0', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9'
    }
  });
  const html = await res.text();
  const match = html.match(/var ytInitialData = (\{.*?\});/);
  if (match) {
    const data = JSON.parse(match[1]);
    try {
      const videoDetails = data.contents.twoColumnWatchNextResults.results.results.contents[0].videoPrimaryInfoRenderer;
      const views = videoDetails.viewCount.videoViewCountRenderer.viewCount.simpleText;
      let likes = "0";
      const topLevelButtons = videoDetails.videoActions.menuRenderer.topLevelButtons;
      const likeButton = topLevelButtons.find(b => b.segmentedLikeDislikeButtonViewModel);
      if (likeButton) {
        likes = likeButton.segmentedLikeDislikeButtonViewModel.likeButtonViewModel.likeButtonViewModel.toggleButtonViewModel.toggleButtonViewModel.defaultButtonViewModel.buttonViewModel.title;
      }
      console.log("Views:", views);
      console.log("Likes:", likes);
    } catch(e) {
      console.log("Error parsing:", e.message);
    }
  } else {
    console.log("Not found");
  }
}
test();
