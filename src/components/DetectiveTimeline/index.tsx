import React, { useMemo, useState, useEffect } from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  Sequence,
  spring,
  interpolate,
  Easing,
  staticFile,
  Audio,
} from 'remotion';

import { CARD_SIZE, OFFSET, TimelineEvent, TimelineEventData } from './TimelineEvent';

import data from "../../../data/timeline.json";
import useAudioDurations from '../hooks/useAudioDurations.ts';
const { events: rawEvents } = data;

type CalculatedTimelineEvent = TimelineEventData & {
  calculatedStartFrame: number;
  audioDurationInFrames: number;
  isLeft?: boolean;
  id?: string;
  audio?: string;
  fallbackAudio?: string;
};
// Custom hook to handle audio duration calculation


export const DetectiveTimeline: React.FC<{}> = () => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps, width, height } = useVideoConfig();
  const [audioErrors, setAudioErrors] = useState<Record<string, boolean>>({});

  const events = rawEvents || [];
  if (events.length === 0) {
    console.warn("No events data provided to DetectiveTimeline.");
    return null;
  }

  const audioDurations = useAudioDurations(events, fps);

  // Handle audio errors
  const handleAudioError = (eventId: string, audioUrl: string, error: Error) => {
    console.error(`Audio error for event ${eventId} (${audioUrl}):`, error);
    setAudioErrors(prev => ({
      ...prev,
      [eventId]: true
    }));
  };

  const calculatedEvents: CalculatedTimelineEvent[] = useMemo(() => {
    let currentFrame = 0;
    const gapFrames = fps * 0.5;

    return events.map((event, index) => {
      const audioDurationInFrames = audioDurations[index] ?? fps * 3;

      const calculatedStartFrame = currentFrame;
      const calculatedEndFrame = calculatedStartFrame + audioDurationInFrames;

      currentFrame = calculatedEndFrame + (index < events.length - 1 ? gapFrames : 0);

      return {
        ...event,
        calculatedStartFrame,
        audioDurationInFrames,
        isLeft: index % 2 === 0,
      };
    });
  }, [events, audioDurations, fps]);

  const lastCalculatedEvent = calculatedEvents[calculatedEvents.length - 1];
  const endMarginFrames = fps * 2;
  const effectiveEndFrame = lastCalculatedEvent 
    ? lastCalculatedEvent.calculatedStartFrame + lastCalculatedEvent.audioDurationInFrames + endMarginFrames
    : durationInFrames;
  const finalCutoffFrame = Math.min(durationInFrames, effectiveEndFrame);

  const opacity = interpolate(
    frame,
    [0, 30, finalCutoffFrame - 30, finalCutoffFrame],
    [0, 1, 1, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );

  // Find active event based on frame
  let activeIndex = -1;
  for (let i = calculatedEvents.length - 1; i >= 0; i--) {
    const event = calculatedEvents[i];
    const activePeriodEndFrame = (i === calculatedEvents.length - 1)
      ? finalCutoffFrame
      : calculatedEvents[i + 1].calculatedStartFrame;

    if (frame >= event.calculatedStartFrame && frame < activePeriodEndFrame) {
      activeIndex = i;
      break;
    }
  }

  if (activeIndex === -1 && calculatedEvents.length > 0) {
    if (frame >= calculatedEvents[0].calculatedStartFrame) {
      activeIndex = 0;
    }
  }

  // Timeline calculations
  const eventSpacing = CARD_SIZE;
  const initialOffset = OFFSET;
  const viewportCenter = height * 0.75; // Match original vertical center point

  // Calculate scroll position
  const targetEventIndexForScroll = Math.max(0, activeIndex);
  const targetEventY = initialOffset + targetEventIndexForScroll * eventSpacing;
  const targetScrollY = targetEventY - viewportCenter;

  const totalTimelineHeight = initialOffset + (calculatedEvents.length * eventSpacing);
  const clampedTargetScrollY = Math.max(0, targetScrollY);

  // Spring animation for smooth scrolling
  const cameraScrollY = spring({
    frame: frame,
    fps: fps,
    from: 0,
    to: clampedTargetScrollY,
    config: {
      damping: 25,
      mass: 1,
      stiffness: 180,
    },
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#121212',
        color: 'white',
        opacity,
        overflow: 'hidden',
      }}
    >
      {/* Camera container with proper styling from original */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: `${totalTimelineHeight + 200}px`, // Add buffer like in original
          transform: `translateY(-${cameraScrollY}px)`,
        }}
      >
        {/* The timeline line - centered like in original */}
        <div
          style={{
            position: 'absolute',
            top: initialOffset,
            left: '50%', // Center alignment
            width: 8,
            backgroundColor: '#c0392b',
            transform: 'translateX(-50%)', // Center the line
            height: `${Math.max(0, (calculatedEvents.length - 1) * eventSpacing + 20)}px`,
          }}
        />

        {/* Map through events with proper positioning containers */}
        {calculatedEvents.map((event, index) => (
          <div
            key={event.title + index}
            style={{
              position: 'absolute',
              top: initialOffset + index * eventSpacing, // Position vertically on the timeline
              left: '50%', // Center the container
              width: '100%',
              transform: 'translateX(-50%)', // Center align
              height: 0, // No height to avoid affecting layout
            }}
          >
            <TimelineEvent
              event={event}
              index={index}
              isLeft={event.isLeft || false}
              isActive={index === activeIndex}
              calculatedStartFrame={event.calculatedStartFrame}
              initialOffset={initialOffset}
              eventSpacing={eventSpacing}
            />
            
            {/* Audio component for this event */}
            {event.audio && (
              <Sequence
                from={event.calculatedStartFrame}
                durationInFrames={event.audioDurationInFrames}
                name={`AudioSequence_${event.title}`}
              >
                {!audioErrors[event.id || index.toString()] && (
                  <Audio
                    src={staticFile(event.audio)}
                    volume={1}
                    onError={(e) => handleAudioError(event.id || index.toString(), event.audio!, e)}
                  />
                )}

                {audioErrors[event.id || index.toString()] && event.fallbackAudio && (
                  <Audio
                    src={staticFile(event.fallbackAudio)}
                    volume={1}
                    onError={(e) => console.error(`Fallback audio error for ${event.title} (${event.fallbackAudio}):`, e)}
                  />
                )}
              </Sequence>
            )}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};