const { getAudioDurationInSeconds } = require('get-audio-duration');
const fs = require('fs');
const path = require('path');

const timelineDataPath = path.join(__dirname, '../data/timeline.json');
const audioDir = path.join(__dirname, '../public/');
const timeline = require(timelineDataPath)

async function main() {
  // Load your timeline data (adjust import as needed)

  // For each event, compute duration
  for (const event of timeline.events) {
    if (event.audio) {
      const audioPath = path.join(audioDir, event.audio);
      try {
        const duration = await getAudioDurationInSeconds(audioPath);
        event.audioDuration = duration;
      } catch (e) {
        console.error(`Failed to get duration for ${audioPath}:`, e);
        event.audioDuration = 3; // fallback
      }
    }
  }

  // Write back to a JSON file for import in Remotion
  fs.writeFileSync(
    path.join(__dirname, '../data/timeline.json'),
    JSON.stringify(timeline, null, 2)
  );
}

main();