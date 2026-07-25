// Pulls the latest uploads from the channel's public RSS feed (no API key needed)
// and writes them to data/youtube.json for index.html to render statically.
const CHANNEL_ID = 'UCfmvPMFNYagPUL99b2MGgTQ'; // @paceyourself_
const FEED_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`;
const OUT_PATH = new URL('../data/youtube.json', import.meta.url);
const MAX_VIDEOS = 8;

function extractAll(regex, text) {
  const out = [];
  let m;
  while ((m = regex.exec(text)) !== null) out.push(m);
  return out;
}

function decodeEntities(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

async function main() {
  const res = await fetch(FEED_URL, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) throw new Error(`Feed fetch failed: ${res.status} ${res.statusText}`);
  const xml = await res.text();

  const entryBlocks = extractAll(/<entry>([\s\S]*?)<\/entry>/g, xml).map((m) => m[1]);

  const videos = entryBlocks.slice(0, MAX_VIDEOS).map((block) => {
    const videoId = (block.match(/<yt:videoId>([^<]+)<\/yt:videoId>/) || [])[1];
    const rawTitle = (block.match(/<title>([^<]*)<\/title>/) || [])[1] || '';
    const published = (block.match(/<published>([^<]+)<\/published>/) || [])[1];
    const thumb = (block.match(/<media:thumbnail url="([^"]+)"/) || [])[1];
    return {
      id: videoId,
      title: decodeEntities(rawTitle),
      url: `https://www.youtube.com/watch?v=${videoId}`,
      thumbnail: thumb,
      published,
    };
  }).filter((v) => v.id);

  const payload = {
    channel: '@paceyourself_',
    channelUrl: 'https://www.youtube.com/@paceyourself_',
    fetchedAt: new Date().toISOString(),
    videos,
  };

  await import('node:fs/promises').then((fs) =>
    fs.writeFile(OUT_PATH, JSON.stringify(payload, null, 2) + '\n')
  );
  console.log(`Wrote ${videos.length} videos to ${OUT_PATH.pathname}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
