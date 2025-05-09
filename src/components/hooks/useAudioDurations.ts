import { getAudioDurationInSeconds } from '@remotion/media-utils';
import { TimelineEventData } from '../DetectiveTimeline/TimelineEvent';
import { useEffect, useState } from 'react';
import { staticFile } from 'remotion';
export default (events: TimelineEventData[], fps: number) => {
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