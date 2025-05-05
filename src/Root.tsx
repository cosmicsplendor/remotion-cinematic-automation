// src/Root.jsx
import { Composition } from 'remotion';
import { DetectiveTimeline } from './components/DetectiveTimeline';
import { Intro } from './components/Intro/index.tsx';
import React from 'react';
import './fonts.css';
import boardData from '../data/board.ts';
import { DetectiveBoardPresentation } from './components/DetectiveBoard/index.tsx';
const RES = {
  r1080p: { width: 1920, height: 1080 },
  r4k: { width: 3840, height: 2160 },
  r720p: { width: 1280, height: 720 },
  shorts: { width: 1296, height: 2250 },
  shorts_alt: { width: 720, height: 1280 },
}
const transitionDuration = 45;
const holdDuration = 0;
const res = RES.shorts_alt; // Change this to the desired resolution
const FPS = 30
export const RemotionRoot = () => {
  return (
    <>
      <Composition
        id="DetectiveBoard"
        component={DetectiveBoardPresentation}
        durationInFrames={
          boardData.reduce((acc, person) =>
            // For each person: audio duration + 2 transitions + hold
            acc + (person.audioDuration * FPS) + (2 * transitionDuration) + holdDuration,
            0
          )}
        fps={FPS}
        width={res.width}
        height={res.height}
        defaultProps={{
          holdDuration,
          transitionDuration
        }}
      />
      <Composition
        id="DetectiveTimeline"
        component={DetectiveTimeline}
        durationInFrames={FPS * 50}
        fps={FPS}
        width={res.width}
        height={res.height}
      />
      <Composition
        id="Intro"
        component={Intro}
        durationInFrames={150}
        fps={FPS}
        width={res.width}
        height={res.height}
      />
    </>
  );
};
