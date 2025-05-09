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
import { useAudioData, getAudioDurationInSeconds } from '@remotion/media-utils';

import { CARD_SIZE, OFFSET, TimelineEvent, TimelineEventData } from './TimelineEvent';

import data from "../../../data/timeline.ts";
const { events: rawEvents } = data;

type CalculatedTimelineEvent = TimelineEventData & {
  calculatedStartFrame: number;
  audioDurationInFrames: number;
  isLeft: boolean; // Add isLeft property to fix the type error
  id?: string;
  audio?: string;
  fallbackAudio?: string;
};

// Custom hook to handle audio duration calculation
const useAudioDurations = (events: TimelineEventData[], fps: number) => {
  const [durations, setDurations] = useState<Record<number, number>>({});

  useEffect(() => {
    const loadDurations = async () => {
      const newDurations: Record<number, number> = {};
      
      await Promise.all(
        events.map(async (event, index) => {
          if (event.audio) {
            try {
              const durationInSeconds = await getAudioDurationInSeconds(staticFile(event.audio));
              newDurations[index] = Math.ceil(durationInSeconds * fps);
            } catch (error) {
              console.warn(`Failed to load audio duration for event ${index}:`, error);
              newDurations[index] = fps * 3; // Fallback to 3 seconds
            }
          } else {
            newDurations[index] = fps * 3; // Default duration for events without audio
          }
        })
      );
      
      setDurations(newDurations);
    };

    loadDurations();
  }, [events, fps]);

  return durations;
};

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
        isLeft: index % 2 === 0, // Add isLeft property based on the index
      };
    });
  }, [events, audioDurations, fps]);

  const lastCalculatedEvent = calculatedEvents[calculatedEvents.length - 1];
  const endMarginFrames = fps * 2;
  const effectiveEndFrame = lastCalculatedEvent.calculatedStartFrame + lastCalculatedEvent.audioDurationInFrames + endMarginFrames;
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

  let activeIndex = -1;
  for (let i = calculatedEvents.length - 1; i >= 0; i--) {
    const event = calculatedEvents[i];
    const eventEndFrame = event.calculatedStartFrame + event.audioDurationInFrames;

    if (frame >= event.calculatedStartFrame && frame < eventEndFrame) {
      activeIndex = i;
      break;
    }
  }

  activeIndex = -1;
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

  const eventSpacing = CARD_SIZE;
  const initialOffset = OFFSET;
  const timelineScrollTargetY = height * 0.6;

  const targetEventIndexForScroll = Math.max(0, activeIndex);
  const targetEventContainerY = initialOffset + targetEventIndexForScroll * eventSpacing;
  const targetScrollY = targetEventContainerY - timelineScrollTargetY;

  const totalScrollableContentHeight = initialOffset + (calculatedEvents.length - 1) * eventSpacing + (height - timelineScrollTargetY);
  const maxScrollY = Math.max(0, totalScrollableContentHeight - height);
  const clampedTargetScrollY = Math.max(0, Math.min(maxScrollY, targetScrollY));

  const cameraScrollY = spring({
    frame: frame,
    fps: fps,
    from: 0,
    to: clampedTargetScrollY,
    config: {
      damping: 15,
      mass: 0.4,
      stiffness: 180,
    },
  });

  const totalTimelineLineHeight = (calculatedEvents.length - 1) * eventSpacing;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#121212',
        color: 'white',
        opacity,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: '50%',
          width: '100%',
          height: `${totalScrollableContentHeight}px`,
          transform: `translate(-50%, -${cameraScrollY}px)`,
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: initialOffset,
            left: '0',
            transform: 'translateX(-50%)',
            width: 8,
            backgroundColor: '#c0392b',
            height: `${Math.max(0, totalTimelineLineHeight)}px`,
          }}
        />

        {calculatedEvents.map((calculatedEvent, index) => (
          <div
            key={calculatedEvent.title + index}
            style={{
              position: 'absolute',
              top: initialOffset + index * eventSpacing,
              left: calculatedEvent.isLeft ? 'auto' : '0',
              right: calculatedEvent.isLeft ? '0' : 'auto',
              transform: 'translateY(-50%)',
              width: calculatedEvent.isLeft ? 'auto' : '100%',
              marginLeft: calculatedEvent.isLeft ? 'auto' : '0',
              marginRight: calculatedEvent.isLeft ? '0' : 'auto',
            }}
          >
            <>
            <TimelineEvent
              event={calculatedEvent}
              index={index}
              isLeft={calculatedEvent.isLeft}
              isActive={index === activeIndex}
              calculatedStartFrame={calculatedEvent.calculatedStartFrame}
              initialOffset={initialOffset}
              eventSpacing={eventSpacing}
            />
            
            {calculatedEvent.audio && (
              <Sequence
                from={calculatedEvent.calculatedStartFrame}
                durationInFrames={calculatedEvent.audioDurationInFrames}
                name={`AudioSequence_${calculatedEvent.title}`}
              >
                {!audioErrors[calculatedEvent.id || index.toString()] && (
                  <Audio
                    src={staticFile(calculatedEvent.audio)}
                    volume={1}
                    onError={(e) => handleAudioError(calculatedEvent.id || index.toString(), calculatedEvent.audio!, e)}
                  />
                )}

                {audioErrors[calculatedEvent.id || index.toString()] && calculatedEvent.fallbackAudio && (
                  <Audio
                    src={staticFile(calculatedEvent.fallbackAudio)}
                    volume={1}
                    onError={(e) => console.error(`Fallback audio error for ${calculatedEvent.title} (${calculatedEvent.fallbackAudio}):`, e)}
                  />
                )}
              </Sequence>
            )}
          </>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};