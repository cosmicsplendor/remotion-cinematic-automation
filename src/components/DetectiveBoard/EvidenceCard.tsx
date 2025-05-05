// EvidenceCard.tsx
import React from 'react';
import {
  useVideoConfig,
  interpolate,
  Easing,
} from 'remotion';
import { segmentDevanagariText } from '../../utils';

interface EvidenceCardProps {
  name: string;
  subtitle: string;
  relativeFrame: number;
  sfxTypewriterUrl?: string;
  duration?: number
}

export const EvidenceCard: React.FC<EvidenceCardProps> = ({
  name,
  subtitle: _subtitle,
  relativeFrame,
  duration=10
}) => {
  const { fps, width } = useVideoConfig();

  // Define animation timing constants
  const SUBTITLE_START_DELAY = 0; // Frames to wait after title finishes
  const SUBTITLE_CHARS_PER_FRAME = 0.5; // Characters per frame for subtitle
  const subtitle = segmentDevanagariText(_subtitle); // Segment the subtitle for better typing effect
  // Calculate how many characters to show for the title

  // Calculate how many characters to show for the subtitle
  const subtitleCharsToShow = Math.max(Math.floor(
    Math.min(
      subtitle.length,
      (relativeFrame - 0 - SUBTITLE_START_DELAY) * SUBTITLE_CHARS_PER_FRAME
    )
  ), 1)
  console.log({ relativeFrame, subtitleCharsToShow, subtitle });
  // Calculate if we're currently typing
  const isTypingSubtitle = subtitleCharsToShow > 0 && subtitleCharsToShow < subtitle.length;
  // Calculate fade in out for the card
  const cardOpacity = interpolate(
    relativeFrame,
    [0, 30, duration - 60, duration - 30],
    [0, 1, 1, 0 ],
    {
      extrapolateRight: 'clamp',
      extrapolateLeft: 'clamp',
      easing: Easing.sin
    }
  );

  return (
    <div
      style={{
        position: 'absolute',
        top: "calc(50% + 175px)",
        left: '50%',
        transform: 'translateX(-50%)',
        width: 500,
        backgroundColor: '#f8f3e3',
        padding: 20,
        borderRadius: 8,
        boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
        opacity: cardOpacity,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: -16,
          left: '10%',
          width: '80%',
          height: 30,
          backgroundColor: '#e74c3c',
          zIndex: -1,
          transform: 'rotate(-2deg)',
        }}
      />

      {/* Title with typewriter effect */}
      <h1
        style={{
          fontFamily: 'Courier New, monospace',
          fontSize: 28,
          marginBottom: 10,
          borderBottom: '1px dotted #642',
          paddingBottom: 5,
          width: '100%',
          textAlign: 'center',
          color: "#421"
        }}
      >
        {name}
      </h1>

      {/* Subtitle with typewriter effect */}
      <p
        style={{
          fontFamily: 'Courier New, monospace',
          fontSize: 18,
          marginTop: 5,
          opacity: 0.8,
          width: '100%',
          textAlign: 'center',
          color: "#100"
        }}
      >
        {subtitle.slice(0, subtitleCharsToShow)}
        {(isTypingSubtitle || subtitleCharsToShow === 0) && (
          <span
            style={{
              opacity: (relativeFrame % 10 < 5 || subtitleCharsToShow === 0)? 1 : 0, // Blinking cursor
            }}
          >
            |
          </span>
        )}
      </p>
    </div>
  );
};