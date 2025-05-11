  import React, { useMemo } from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';

// Caption data format
interface Caption {
  start: number;
  end: number;
  text: string;
}

// Component props
interface CaptionVisualizerProps {
  // The data containing word timestamps
  data: Caption[];
  // URL to the video file
  videoUrl: string;
  // Vertical position (0-1, where 0 is top and 1 is bottom)
  yPosition: number;
  // Display mode: 'single' for one word at a time, 'multi' for multiple words
  mode: 'single' | 'multi';
  // Number of words to show in multi mode
  wordsToShow?: number;
  // Optional background opacity (0-1)
  backgroundOpacity?: number;
  // Optional font size in pixels
  fontSize?: number;
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
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // Convert frame to seconds
  const currentTimeInSeconds = frame / fps;

  // Find the active caption(s) at the current time
  const activeCaptions = useMemo(() => {
    return data.filter(
      (caption) => currentTimeInSeconds >= caption.start && currentTimeInSeconds <= caption.end
    );
  }, [data, currentTimeInSeconds]);

  // Calculate Y position clamped between 0 and 1
  const safeYPosition = Math.max(0, Math.min(1, yPosition)) * height;

  // Calculate background style
  const backgroundStyle = {
    backgroundColor: `rgba(0, 0, 0, ${backgroundOpacity})`,
    padding: '10px 20px',
    borderRadius: '8px',
    fontSize: `${fontSize}px`,
    lineHeight: '1.5',
    textAlign: 'center' as const,
    maxWidth: '80%',
  };

  return (
    <div style={{ width, height, position: 'relative' }}>
      {/* Video layer */}
      <video
        src={videoUrl}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          position: 'absolute',
        }}
      />

      {/* Caption display */}
      <div
        style={{
          position: 'absolute',
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
          top: safeYPosition,
          left: 0,
        }}
      >
        {mode === 'single' && activeCaptions.length > 0 ? (
          // Single word mode
          <div style={backgroundStyle}>
            <span style={{ color: 'white', fontWeight: 'bold' }}>
              {activeCaptions[0].text}
            </span>
          </div>
        ) : mode === 'multi' ? (
          // Multi-word mode
          <MultiWordDisplay
            data={data}
            activeCaptions={activeCaptions}
            wordsToShow={wordsToShow}
            currentTime={currentTimeInSeconds}
            backgroundStyle={backgroundStyle}
          />
        ) : null}
      </div>
    </div>
  );
};

// Multi-word display component
const MultiWordDisplay: React.FC<{
  data: Caption[];
  activeCaptions: Caption[];
  wordsToShow: number;
  currentTime: number;
  backgroundStyle: React.CSSProperties;
}> = ({ data, activeCaptions, wordsToShow, currentTime, backgroundStyle }) => {
  // Find the index of the current active caption
  const currentIndex = useMemo(() => {
    if (activeCaptions.length === 0) return -1;
    return data.findIndex((caption) => caption === activeCaptions[0]);
  }, [data, activeCaptions]);

  // Calculate the range of captions to show
  const captionsToShow = useMemo(() => {
    if (currentIndex === -1) return [];

    const halfWindow = Math.floor(wordsToShow / 2);
    let startIndex = Math.max(0, currentIndex - halfWindow);
    let endIndex = Math.min(data.length - 1, startIndex + wordsToShow - 1);
    
    // Adjust start index if we hit the end of the captions
    if (endIndex - startIndex + 1 < wordsToShow) {
      startIndex = Math.max(0, endIndex - wordsToShow + 1);
    }

    return data.slice(startIndex, endIndex + 1);
  }, [data, currentIndex, wordsToShow]);

  if (captionsToShow.length === 0) return null;

  return (
    <div style={backgroundStyle}>
      {captionsToShow.map((caption, index) => {
        const isActive = currentTime >= caption.start && currentTime <= caption.end;
        return (
          <span
            key={index}
            style={{
              color: isActive ? 'cyan' : 'white',
              fontWeight: isActive ? 'bold' : 'normal',
              margin: '0 4px',
            }}
          >
            {caption.text}
          </span>
        );
      })}
    </div>
  );
};

export default CaptionVisualizer;