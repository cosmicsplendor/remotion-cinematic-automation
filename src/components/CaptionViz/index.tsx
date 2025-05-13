import React, { useMemo, useEffect, useState } from 'react'
import { staticFile, useCurrentFrame, useVideoConfig, Video } from 'remotion'

// Caption data format
interface Caption {
  start: number
  end: number
  text: string
}

// Component props
interface CaptionVisualizerProps {
  data: Caption[]
  videoUrl: string
  yPosition: number
  mode: 'single' | 'multi'
  wordsToShow?: number
  backgroundOpacity?: number
  fontSize?: number
}

const CaptionVisualizer: React.FC<CaptionVisualizerProps> = ({
  data,
  videoUrl,
  yPosition,
  mode,
  wordsToShow = 5,
  backgroundOpacity = 0.7,
  fontSize = 40,
}) => {
  const frame = useCurrentFrame()
  const { fps, width, height } = useVideoConfig()
  const [videoError, setVideoError] = useState<Error | null>(null)

  const currentTimeInSeconds = frame / fps

  const activeCaption = useMemo(() => {
    if (!data || data.length === 0) return null

    return data.find(
      (caption) =>
        currentTimeInSeconds >= caption.start &&
        currentTimeInSeconds <= caption.end
    ) || null
  }, [data, currentTimeInSeconds])

  const currentBatchIndex = useMemo(() => {
    if (!activeCaption || !data.length) return 0

    const activeCaptionIndex = data.findIndex(
      (caption) =>
        caption.start === activeCaption.start && caption.end === activeCaption.end
    )

    return activeCaptionIndex === -1
      ? 0
      : Math.floor(activeCaptionIndex / wordsToShow)
  }, [activeCaption, data, wordsToShow])

  const safeYPosition = Math.max(0, Math.min(1, yPosition)) * height

  const backgroundStyle = {
    backgroundColor: `rgba(0, 0, 0, ${backgroundOpacity})`,
    padding: '10px 20px',
    borderRadius: '8px',
    fontSize: `${fontSize}px`,
    lineHeight: '1.5',
    textAlign: 'center' as const,
    maxWidth: '80%',
    color: 'white',
    display: 'inline-block',
  }

  return (
    <div style={{ width, height, position: 'relative' }}>
      <Video
        src={staticFile(videoUrl)}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
        onError={(error) => {
          console.error('Video playback error:', error)
          setVideoError(error)
        }}
      />

      {videoError && (
        <div
          style={{
            position: 'absolute',
            top: 10,
            left: 10,
            backgroundColor: 'rgba(255,0,0,0.7)',
            color: 'white',
            padding: '5px 10px',
            borderRadius: '4px',
            fontSize: '16px',
          }}
        >
          Video Error: {videoError.message}
        </div>
      )}

      <div
        style={{
          position: 'absolute',
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
          top: safeYPosition,
          left: 0,
          zIndex: 10,
        }}
      >
        {mode === 'single' ? (
          activeCaption?.text.trim().length ? (
            <div style={backgroundStyle}>
              <span style={{ fontWeight: 'bold' }}>
                {activeCaption.text}
              </span>
            </div>
          ) : null
        ) : (
          <BatchDisplay
            data={data || []}
            batchIndex={currentBatchIndex}
            wordsToShow={wordsToShow}
            currentTime={currentTimeInSeconds}
            backgroundStyle={backgroundStyle}
          />
        )}
      </div>
    </div>
  )
}

// Batch display component
const BatchDisplay: React.FC<{
  data: Caption[]
  batchIndex: number
  wordsToShow: number
  currentTime: number
  backgroundStyle: React.CSSProperties
}> = ({ data, batchIndex, wordsToShow, currentTime, backgroundStyle }) => {
  const captionsToShow = useMemo(() => {
    if (data.length === 0) return []

    const startIndex = batchIndex * wordsToShow
    const endIndex = Math.min(startIndex + wordsToShow, data.length)
    return data.slice(startIndex, endIndex)
  }, [data, batchIndex, wordsToShow])

  const hasVisibleText = captionsToShow.some((c) => c.text.trim().length > 0)
  if (!hasVisibleText) return null

  return (
    <div style={backgroundStyle}>
      {captionsToShow.map((caption, index) => {
        const isActive =
          currentTime >= caption.start && currentTime <= caption.end
        return (
          <span
            key={`caption-${batchIndex}-${index}`}
            style={{
              color: isActive ? 'cyan' : 'white',
              fontWeight: 500,
              margin: '0 4px',
              display: 'inline-block',
            }}
          >
            {caption.text}
          </span>
        )
      })}
    </div>
  )
}

export default CaptionVisualizer
