// src/Root.jsx
import { Composition } from 'remotion';
import { DetectiveTimeline } from './components/DetectiveTimeline';
import { Intro } from './components/Intro/index.tsx';
import React from 'react';
import './fonts.css';
import boardData from '../data/board.ts';
import { DetectiveBoardPresentation } from './components/DetectiveBoard/index.tsx';
import parallaxData from '../data/parallax/frog_boys.json'; // Adjust the path as necessary
import { ParallaxComposition } from './components/ParallaxAnim/index.tsx';
const RES = {
  r1080p: { width: 1920, height: 1080 },
  r4k: { width: 3840, height: 2160 },
  r720p: { width: 1280, height: 720 },
  shorts: { width: 1296, height: 2250 },
  shorts_alt: { width: 720, height: 1280 },
}
import timelineData from '../data/timeline.json';
const transitionDuration = 30;
const holdDuration = 0;
const res = RES.r720p; // Change this to the desired resolution
const FPS = 60
export const DetectiveTimelineVideo = () => {
  const totalDurationInFrames = timelineData.events.reduce(
    (acc, event) => acc + Math.ceil((event.audioDuration || 3) * FPS),
    0
  );

  return <Composition
    id="DetectiveTimeline"
    component={DetectiveTimeline}
    durationInFrames={totalDurationInFrames}
    fps={FPS}
    width={res.width}
    height={res.height}
  />
};
export const ParallaxVideo = () => {
  const validatedLayers = parallaxData.layers.map(layer => ({
    id: layer.id,
    name: layer.name,
    parallaxFactor: {
      x: layer.parallaxFactor.x,
      y: layer.parallaxFactor.y
    },
    zIndex: layer.zIndex,
    elements: layer.elements.map(element => ({
      id: element.id,
      width: element.width,
      height: element.height,
      name: element.name,
      x: element.x,
      y: element.y,
      zIndex: element.zIndex,
      svgString: element.svgString,
      scale: element.scale,
      opacity: element.opacity,
      initialRotation: element.initialRotation,
      finalRotation: element.finalRotation,
      transformOriginX: element.transformOriginX,
      transformOriginY: element.transformOriginY,
      rotationAnimationType: element.rotationAnimationType === 'spring'
        ? 'spring' as const
        : 'easing' as const
    })),
    isVisible: layer.isVisible
  }));

  return (
    <>
      <Composition
        id="ParallaxScene"
        component={ParallaxComposition}
        durationInFrames={parallaxData.durationInFrames}
        fps={FPS}
        width={parallaxData.width || res.width}  // Use parallaxData width or fallback to res.width
        height={parallaxData.height || res.height}
        defaultProps={{
          durationInFrames: parallaxData.durationInFrames,
          compositionName: parallaxData.compositionName,
          camera: parallaxData.camera,
          backgroundColor: parallaxData.backgroundColor,
          layers: validatedLayers,
          reverse: false
        }}
      />
    </>
  );
};
export const RemotionRoot = () => {
  return (
    <>
      <ParallaxVideo />
      <DetectiveTimelineVideo />
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
