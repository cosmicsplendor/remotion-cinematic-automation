import React, { useMemo } from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
} from 'remotion';
import { segmentDevanagariText } from './utils';

const data = {
  title: "भ्यागुता खोज्ने केटाहरु",
  subtitle: "एक अनसुलझा रहस्यको खोजीमा",
};

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
  
  // Segment the title into proper syllabic units
  const titleClusters = useMemo(() => {
    return segmentDevanagariText(data.title);
  }, [data.title]);
  console.log(titleClusters)
  // Calculate visible clusters for typewriter effect
  const visibleClusters = Math.floor(
    interpolate(frame, [40, 80], [0, titleClusters.length], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    })
  );
  
  // Join the visible clusters to form the displayed title
  const displayedTitle = titleClusters.slice(0, visibleClusters).join('');
  
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
          <span></span>
        </h1>
        
        <h2
          style={{
            fontSize: 32,
            opacity: subtitleOpacity,
            fontWeight: 400,
          }}
        >
          {data.subtitle}
        </h2>
      </div>
    </AbsoluteFill>
  );
};