import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  Sequence,
  spring,
  interpolate,
  Easing,
} from 'remotion';

export const Intro = () => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();
  
  const opacity = interpolate(
    frame,
    [0, 30, durationInFrames - 30, durationInFrames],
    [0, 1, 1, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );
  
  const titleOpacity = interpolate(
    frame,
    [0, 20, 40],
    [0, 0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );
  
  const subtitleOpacity = interpolate(
    frame,
    [40, 60, 80],
    [0, 0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );
  
  // Typewriter effect for the title
  const titleText = "THE WAREHOUSE MURDERS";
  const visibleCharacters = Math.floor(
    interpolate(frame, [40, 80], [0, titleText.length], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    })
  );
  
  const displayedTitle = titleText.substring(0, visibleCharacters);
  
  // Blinking cursor
  const showCursor = frame % 30 < 15 || frame < 80;
  
  return (
    <AbsoluteFill
      style={{
        backgroundColor: 'black',
        color: 'white',
        opacity,
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          width: '100%',
        }}
      >
        <h1
          style={{
            fontFamily: 'Special Elite, cursive',
            fontSize: 80,
            marginBottom: 20,
            opacity: titleOpacity,
          }}
        >
          {displayedTitle}
          {showCursor && <span style={{ opacity: frame % 30 < 15 ? 1 : 0 }}>|</span>}
        </h1>
        
        <h2
          style={{
            fontSize: 32,
            opacity: subtitleOpacity,
            fontWeight: 400,
          }}
        >
          A COLD CASE INVESTIGATION
        </h2>
        
        {frame > 100 && (
          <div
            style={{
              marginTop: 60,
              fontSize: 18,
              opacity: interpolate(frame, [100, 120], [0, 1], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              }),
            }}
          >
            EVIDENCE FILE #85-137
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};