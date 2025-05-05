// EvidenceCard.tsx
import React from 'react';
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Audio,
  Sequence,
  staticFile,
} from 'remotion';
import { segmentDevanagariText } from '../../utils';

interface EvidenceCardProps {
  name: string;
  subtitle: string;
  relativeFrame: number;
  sfxTypewriterUrl?: string;
}

export const EvidenceCard: React.FC<EvidenceCardProps> = ({
  name: _name,
  subtitle: _subtitle,
  relativeFrame,
}) => {
  const { fps, width } = useVideoConfig();
  
  // Define animation timing constants
  const TITLE_START_FRAME = 0;
  const TITLE_CHARS_PER_FRAME = 0.25; // Characters per frame for name
  const SUBTITLE_START_DELAY = 3; // Frames to wait after title finishes
  const SUBTITLE_CHARS_PER_FRAME = 0.25; // Characters per frame for subtitle
  const name = segmentDevanagariText(_name); // Segment the name for better typing effect
  const subtitle = segmentDevanagariText(_subtitle); // Segment the subtitle for better typing effect
  // Calculate how many characters to show for the title
  const titleCharsToShow = Math.floor(
    Math.min(name.length, relativeFrame * TITLE_CHARS_PER_FRAME)
  );
  
  // Calculate when the title finishes typing
  const titleFinishFrame = Math.ceil(name.length / TITLE_CHARS_PER_FRAME);
  
  // Calculate how many characters to show for the subtitle
  const subtitleCharsToShow = relativeFrame > titleFinishFrame + SUBTITLE_START_DELAY
    ? Math.floor(
        Math.min(
          subtitle.length,
          (relativeFrame - titleFinishFrame - SUBTITLE_START_DELAY) * SUBTITLE_CHARS_PER_FRAME
        )
      )
    : 0;
  
  // Calculate if we're currently typing
  const isTypingTitle = titleCharsToShow > 0 && titleCharsToShow < name.length;
  const isTypingSubtitle = subtitleCharsToShow > 0 && subtitleCharsToShow < subtitle.length;
  const isTyping = isTypingTitle || isTypingSubtitle;
  
  // Calculate fade-in for the card
  const cardOpacity = interpolate(
    Math.min(relativeFrame, 15),
    [0, 15],
    [0, 1],
    {
      extrapolateRight: 'clamp',
    }
  );

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 80,
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
          borderBottom: '2px solid #333',
          paddingBottom: 5,
          width: '100%',
          textAlign: 'center',
        }}
      >
        {name.slice(0, titleCharsToShow)}
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
        }}
      >
        {subtitle.slice(0, subtitleCharsToShow)}
        {isTypingSubtitle && (
          <span
            style={{
              opacity: relativeFrame % 10 < 5 ? 1 : 0, // Blinking cursor
            }}
          >
            |
          </span>
        )}
      </p>
    </div>
  );
};