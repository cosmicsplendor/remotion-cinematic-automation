import React, { useMemo } from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
} from 'remotion';
import { segmentDevanagariText } from '../../utils';

const data = {
  title:  "खोजीको सुरुवात",
  subtitle: "एक रहस्यमय खोजको प्रारम्भ",
}
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
  // Calculate visible clusters for typewriter effect
  const visibleClusters = Math.floor(
    interpolate(frame, [30, 60], [0, titleClusters.length], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    })
  );
  
  // Join the visible clusters to form the displayed title
  const displayedTitle = titleClusters.slice(0, visibleClusters).join('');
  
  return (
    <AbsoluteFill
      className="bg-black text-white"
      style={{ opacity }}
    >
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center w-full">
        <h1
          className="font-special-elite text-[80px] mb-5"
          style={{ opacity: titleOpacity }}
        >
          {displayedTitle}
        </h1>
        <h2
          className="text-2xl font-normal"
          style={{ opacity: subtitleOpacity }}
        >
          {data.subtitle}
        </h2>
      </div>
    </AbsoluteFill>
  );
};