import React from 'react';
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Easing,
  staticFile,
} from 'remotion';
import { useAudioData, visualizeAudio } from '@remotion/media-utils'; // Corrected import path

// Assuming this utility function exists and works correctly
import { segmentDevanagariText } from '../../utils';

type TimelineEventProps = {
  event: any; // Consider a more specific type if possible
  index: number;
  isLeft: boolean;
  isActive: boolean; // Parent determines if this is the active card
  initialOffset: number;
  eventSpacing: number;
  calculatedStartFrame: number; // Prop passed from parent with the calculated start frame
};

// Removed startFrame from TimelineEventData type - it's now calculated by the parent
export type TimelineEventData = {
  date: string;
  title: string;
  description: string;
  evidence: string;
  audio?: string; // Relative path from public/
  // startFrame is calculated by the parent component
}

export const OFFSET = 160;
export const CARD_SIZE = 200; // Height of each card, effectively vertical spacing

export const TimelineEvent: React.FC<TimelineEventProps> = ({ event, index, isLeft, isActive, initialOffset, eventSpacing, calculatedStartFrame }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Load audio data for THIS event using useAudioData
  // Pass null if event.audio is not provided
  const audioData = useAudioData(event.audio ? staticFile(event.audio) : "null");

  // Determine if the card should be visible based on its calculated startFrame
  const isVisible = frame >= calculatedStartFrame;
  if (!isVisible) {
    return null;
  }

  // Calculate frames since the card became visible using the calculatedStartFrame
  const sinceVisible = frame - calculatedStartFrame;

  // --- Existing Animations (using 'sinceVisible') ---
  // Timeline dot animation - faster spring
  const dotScale = spring({
    frame: sinceVisible,
    fps,
    config: {
      damping: 12,
      mass: 0.3,
      stiffness: 200,
    },
  });

  // Card animation - faster fade in
  const cardOpacity = interpolate(
    sinceVisible,
    [0, 30],
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.sin,
    },
  );

  const cardTranslate = interpolate(
    sinceVisible,
    [0, 8],
    [isLeft ? -50 : 50, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.out(Easing.ease),
    }
  );

  // Active event highlight (dot size/color)
  const dotSize = isActive ? 30 : 24;
  const dotColor = isActive ? '#ff5252' : '#c0392b';

  // Text reveal animation - faster text appearance
  const title = segmentDevanagariText(event.title || '');
  const titleCharacters = Math.floor(
    interpolate(sinceVisible, [5, 12], [0, title.length], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    })
  );

  const descriptionOpacity = interpolate(
    sinceVisible,
    [8, 12],
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );

  const evidenceOpacity = interpolate(
    sinceVisible,
    [10, 15],
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );
  // --- End Existing Animations ---

  // --- Audio Visualization Logic ---
  let glowOpacity = 0;

  // Only calculate glow opacity if the card is active AND audio data is available
  if (isActive && audioData) {
    // Calculate the frame number relative to the start of *this* audio clip's playback.
    // Use the calculatedStartFrame passed from the parent.
    const frameInAudio = frame - calculatedStartFrame;

    // If the current frame is before the audio is supposed to start, amplitude is 0.
    // visualizeAudio expects a non-negative frame number relative to the audio start.
    if (frameInAudio >= 0) {
        // Get amplitude using visualizeAudio for the current frame relative to the audio start
        const visualization = visualizeAudio({
            fps,
            frame: frameInAudio, // Use the relative frame
            audioData,
            numberOfSamples: 1, // Get a single amplitude value
        });

        // The result is an array, take the first element (overall amplitude)
        const currentAmplitude = visualization[0] || 0;

        // Map the amplitude (typically 0-1 range from visualizeAudio) to the desired opacity range (0-0.5)
        glowOpacity = interpolate(currentAmplitude, [0, 1], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
        });
    }

    // Ensure opacity stays within the desired range [0, 0.5]
    glowOpacity = Math.max(0, Math.min(0.5, glowOpacity));
  }
  // --- End Audio Visualization Logic ---


  // Calculate the box shadow for the card, including the dynamic glow
  const baseShadow = '0 4px 20px rgba(0, 0, 0, 0.5)';
  const activeGlowShadow = `0 0 15px 8px rgba(255, 100, 50, ${glowOpacity})`;

  const boxShadow = isActive
    ? `${activeGlowShadow}, ${baseShadow}`
    : baseShadow;

  return (
    <>
      {/* Timeline dot - Positioned by parent container */}
      <div
        style={{
          position: 'absolute', // Relative to parent container
          top: 0, // Positioned at the top of the parent div
          left: '50%',
          width: dotSize,
          height: dotSize,
          borderRadius: '50%',
          backgroundColor: dotColor,
          transform: `translate(-50%, -50%) scale(${dotScale})`, // Translate relative to its own size
          zIndex: 10,
          boxShadow: isActive ? '0 0 15px rgba(255, 82, 82, 0.8)' : 'none',
          transition: 'box-shadow 0.3s ease', // Keep transition for non-audio states
        }}
      />
      {/* Event card - Positioned by parent container */}
      <div
        style={{
          position: 'absolute', // Relative to parent container
          top: 0, // Positioned at the top of the parent div
          [isLeft ? 'right' : 'left']: '50%',
          [isLeft ? 'marginRight' : 'marginLeft']: 40,
          width: 500,
          opacity: cardOpacity,
          transform: `translateX(${isLeft ? -cardTranslate : cardTranslate}px) translateY(-50%)`, // Translate relative to its own size
          backgroundColor: 'rgba(30, 30, 30, 0.9)',
          padding: 20,
          borderRadius: 8,
          borderLeft: isLeft ? 'none' : isActive ? '4px solid #ff5252' : '4px solid #c0392b',
          borderRight: isLeft ? isActive ? '4px solid #ff5252' : '4px solid #c0392b' : 'none',
          boxShadow: boxShadow,
        }}
      >
        {/* Card Content */}
        <div style={{ fontFamily: 'Roboto Mono, monospace', color: '#aaa', fontSize: 14, marginBottom: 8 }}>
          {event.date}
        </div>
        <h3 style={{ fontFamily: 'Special Elite, cursive', fontSize: 28, margin: '0 0 16px 0', color: isActive ? '#ff5252' : 'white' }}>
          {title.slice(0, titleCharacters).join("")}
          {titleCharacters < title.length && <span style={{ opacity: sinceVisible % 20 < 10 ? 1 : 0 }}>|</span>}
        </h3>
        <div style={{ fontSize: 16, lineHeight: 1.5, marginBottom: 12, opacity: descriptionOpacity }}>
          {event.description}
        </div>
        <div style={{ fontSize: 14, color: isActive ? '#ff5252' : '#c0392b', fontWeight: 'bold', opacity: evidenceOpacity }}>
          EVIDENCE: {event.evidence}
        </div>
      </div>
    </>
  );
};