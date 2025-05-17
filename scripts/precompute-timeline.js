const { getAudioDurationInSeconds } = require('get-audio-duration')
const fs = require('fs')
const path = require('path')

const timelineDataPath = path.join(__dirname, '../data/timeline.json')
const audioDir = path.join(__dirname, '../public/assets/timeline/audio')
const mediaDir = path.join(__dirname, '../public/assets/timeline/media')

const timeline = require(timelineDataPath)

function findMatchingMedia(baseName) {
  const matches = fs.readdirSync(mediaDir).filter(file => {
    const fileBase = path.parse(file).name
    return fileBase === baseName
  })

  if (matches.length > 1) {
    throw new Error(`Multiple media files found for base name ${baseName}: ${matches.join(', ')}`)
  }

  if (matches.length === 0) {
    throw new Error(`No media file found for base name ${baseName}`)
  }

  return matches[0] // media filename with extension
}

async function main() {
  console.log(timeline.events.length)

  for (let index = 0; index < timeline.events.length; index++) {
    const event = timeline.events[index]
    const eventId = `timeline${index + 1}`

    const keyframes = []
    const audioFiles = fs.readdirSync(audioDir).filter(file => {
      const base = path.parse(file).name
      return base === eventId || base.startsWith(`${eventId}_`)
    })

    if (audioFiles.length === 0) {
      console.warn(`No audio found for event ${eventId}, skipping...`)
      continue
    }

    // Sort keyframes for consistent order (important if they are numbered)
    audioFiles.sort((a, b) => {
      const extractIndex = name => {
        const match = name.match(/_(\d+)$/)
        return match ? parseInt(match[1], 10) : 0
      }

      return extractIndex(path.parse(a).name) - extractIndex(path.parse(b).name)
    })

    for (const audioFile of audioFiles) {
      const audioFullPath = path.join(audioDir, audioFile)
      const audioBaseName = path.parse(audioFile).name
      const mediaFile = findMatchingMedia(audioBaseName)

      let duration
      try {
        duration = await getAudioDurationInSeconds(audioFullPath)
      } catch (e) {
        console.error(`Failed to get duration for ${audioFile}:`, e)
        duration = 3 // fallback
      }

      keyframes.push({
        duration,
        media: mediaFile,
        audio: audioFile
      })
    }

    // Inject data
    event.audioDuration = keyframes.reduce((acc, kf) => acc + kf.duration, 0)
    event.keyframes = keyframes
  }

  fs.writeFileSync(
    timelineDataPath,
    JSON.stringify(timeline, null, 2)
  )
}

main()
