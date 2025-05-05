import React from 'react';
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Easing,
} from 'remotion';
import { segmentDevanagariText } from '../../utils';
type TimelineEventProps = {
  event: any;
  index: number;
  isLeft: boolean;
  isActive: boolean;
  initialOffset: number;   // <-- Add this
  eventSpacing: number;    // <-- Add this
};
export type TimelineEventData = {
  date: string;
  title: string;
  description: string;
  evidence: string;
  startFrame: number;
}
export const OFFSET = 160
export const CARD_SIZE = 200; // Height of each card
export const TimelineEvent: React.FC<TimelineEventProps> = ({ event, index, isLeft, isActive }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  const isVisible = frame >= event.startFrame;
  
  if (!isVisible) {
    return null;
  }
  
  const sinceVisible = frame - event.startFrame;
  
  // Timeline dot animation - faster spring
  const dotScale = spring({
    frame: sinceVisible,
    fps,
    config: {
      damping: 12,
      mass: 0.3,    // Lower mass for snappier animation
      stiffness: 200, // Higher stiffness for faster movement
    },
  });
  
  // Card animation - faster fade in
  const cardOpacity = interpolate(
    sinceVisible,
    [0, 5],  // Reduced from [0, 15]
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );
  
  const cardTranslate = interpolate(
    sinceVisible,
    [0, 8],  // Reduced from [0, 20]
    [isLeft ? -50 : 50, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.out(Easing.ease),
    }
  );
  
  // Active event highlight
  const dotSize = isActive ? 30 : 24;
  const dotColor = isActive ? '#ff5252' : '#c0392b';
  const boxShadow = isActive 
    ? '0 0 20px rgba(255, 82, 82, 0.6), 0 4px 20px rgba(0, 0, 0, 0.5)'
    : '0 4px 20px rgba(0, 0, 0, 0.5)';
  
  // Text reveal animation - faster text appearance
  const title = segmentDevanagariText(event.title);
  const titleCharacters = Math.floor(
    interpolate(sinceVisible, [5, 12], [0, event.title.length], {  // Reduced from [15, 30]
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    })
  );
  
  const descriptionOpacity = interpolate(
    sinceVisible,
    [8, 12],  // Reduced from [30, 40]
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );
  
  const evidenceOpacity = interpolate(
    sinceVisible,
    [10, 15],  // Reduced from [40, 50]
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );
  
  return (
    <>
      {/* Timeline dot */}
      <div
        style={{
          position: 'absolute',
          top: OFFSET + index * CARD_SIZE,
          left: '50%',
          width: dotSize,
          height: dotSize,
          borderRadius: '50%',
          backgroundColor: dotColor,
          transform: `translate(-50%, -50%) scale(${dotScale})`,
          zIndex: 10,
          boxShadow: isActive ? '0 0 15px rgba(255, 82, 82, 0.8)' : 'none',
          transition: 'box-shadow 0.3s ease',
        }}
      />
      {/* Event card */}
      <div
        style={{
          position: 'absolute',
          top: OFFSET + index * CARD_SIZE,
          [isLeft ? 'right' : 'left']: '50%',
          [isLeft ? 'marginRight' : 'marginLeft']: 40,
          width: 500,
          opacity: cardOpacity,
          transform: `translateX(${isLeft ? -cardTranslate : cardTranslate}px) translateY(-50%)`,
          backgroundColor: 'rgba(30, 30, 30, 0.9)',
          padding: 20,
          borderRadius: 8,
          borderLeft: isLeft ? 'none' : isActive ? '4px solid #ff5252' : '4px solid #c0392b',
          borderRight: isLeft ? isActive ? '4px solid #ff5252' : '4px solid #c0392b' : 'none',
          boxShadow,
        }}
      >
        <div
          style={{
            fontFamily: 'Roboto Mono, monospace',
            color: '#aaa',
            fontSize: 14,
            marginBottom: 8,
          }}
        >
          {event.date}
        </div>
        
        <h3
          style={{
            fontFamily: 'Special Elite, cursive',
            fontSize: 28,
            margin: '0 0 16px 0',
            color: isActive ? '#ff5252' : 'white',
          }}
        >
          {title.slice(0, titleCharacters).join("")}
          {titleCharacters < title.length && 
            <span style={{ opacity: sinceVisible % 20 < 10 ? 1 : 0 }}>|</span>}
        </h3>
        
        <div
          style={{
            fontSize: 16,
            lineHeight: 1.5,
            marginBottom: 12,
            opacity: descriptionOpacity,
          }}
        >
          {event.description}
        </div>
        
        <div
          style={{
            fontSize: 14,
            color: isActive ? '#ff5252' : '#c0392b',
            fontWeight: 'bold',
            opacity: evidenceOpacity,
          }}
        >
          EVIDENCE: {event.evidence}
        </div>
      </div>
    </>
  );
};