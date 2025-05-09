// DetectiveBoardPresentation.tsx - Fixed Version with Audio Fallback and Sequence
import React, { useMemo, useEffect, useState } from 'react';
import {
  AbsoluteFill,
  Audio,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  random,
  staticFile,
} from 'remotion';
import { getAudioDurationInSeconds } from '@remotion/media-utils';
import { PhotoPin } from './PhotoPin.tsx';
import { EvidenceCard } from './EvidenceCard.tsx';
import persons from "../../../data/board.ts"

// Define the data structure for each person
export interface PersonData {
  id: string;
  name: string;
  subtitle: string;
  photoUrl: string;
  audioUrl: string;
  audioDuration: number; // in frames at the SOURCE audio file's frame rate (or calculate based on seconds * fps)
}

// Props for the main component
interface DetectiveBoardPresentationProps {
  sfxPinUrl?: string;
  transitionDuration?: number; // in frames
  holdDuration?: number; // in frames
}
const BOARD_MARGIN = 100; // Margin from the edge of the board
const INITIAL_POSITION_TOP = 100; // Initial Y position for all photos

const useAudioDuration = (audioUrl: string | undefined, fps: number) => {
  const [duration, setDuration] = useState<number | null>(null);

  useEffect(() => {
    const loadDuration = async () => {
      if (!audioUrl) {
        setDuration(null);
        return;
      }

      try {
        const durationInSeconds = await getAudioDurationInSeconds(staticFile(audioUrl));
        setDuration(Math.ceil(durationInSeconds * fps));
      } catch (error) {
        console.warn(`Failed to load audio duration for ${audioUrl}:`, error);
        setDuration(null);
      }
    };

    loadDuration();
  }, [audioUrl, fps]);

  return duration;
};

export const DetectiveBoardPresentation: React.FC<DetectiveBoardPresentationProps> = ({
  sfxPinUrl = '/assets/sfx/pin.wav',
  transitionDuration = 30, // ~1 second at 30fps
  holdDuration = 60, // Extra time to show the photo after audio ends
}) => {
  const frame = useCurrentFrame();
  const { width, height, fps, durationInFrames } = useVideoConfig();

  // Track which audio files have errors
  const [audioErrors, setAudioErrors] = useState<Record<string, boolean>>({});

  // Calculate the total duration per person (audio + transition + hold)
  const timePerPerson = useMemo(() => {
    return persons.map(person => {
      const audioDuration = useAudioDuration(person.audioUrl, fps);
      const audioDurationInVideoFrames = audioDuration ?? (person.audioDuration * fps);

      if (frame === 0 && !audioDuration) {
        console.warn(`Person ${person.name} has invalid audioDuration: ${person.audioDuration}`);
      }

      return {
        id: person.id,
        duration: (audioDurationInVideoFrames - transitionDuration * 0.75) + transitionDuration * 2 + holdDuration,
      };
    });
  }, [persons, transitionDuration, holdDuration, fps, frame]);

  // Calculate the start frame for each person
  const personStartFrames = useMemo(() => {
    let startFrame = 0;
    return persons.map((person, index) => {
      const start = startFrame;
      const duration = timePerPerson[index]?.duration || transitionDuration * 2 + holdDuration; // Fallback duration if calculation failed
      startFrame += duration;

      return {
        id: person.id,
        startFrame: start,
        endFrame: startFrame,
        calculatedDuration: duration, // Store calculated duration for clarity
      };
    });
  }, [persons, timePerPerson, frame, transitionDuration, holdDuration]); // Added frame dependency for initial log

  // Determine the current active person
  const currentPersonIndex = useMemo(() => {
    const index = personStartFrames.findIndex(
      person => frame >= person.startFrame && frame < person.endFrame
    );

    return index;
  }, [frame, personStartFrames]);

  // Calculate initial positions for each photo (random but evenly distributed)
  const initialPositions = useMemo(() => {
    return persons.map((person, index) => {
      const x = interpolate(
        index,
        [0, persons.length - 1],
        [BOARD_MARGIN, width - BOARD_MARGIN]
      );
      const y = INITIAL_POSITION_TOP;

      // Add some random variation but keep it within board margin
      const randomX = x + random(person.id) * 60 - 30;
      const finalX = Math.max(BOARD_MARGIN, Math.min(width - BOARD_MARGIN, randomX));

      // Random rotation between -15 and 15 degrees
      const rotation = random(person.id + '1') * 30 - 15;

      return { x: finalX, y, rotation };
    });
  }, [persons, width]);

  // Handle audio error for a person
  const handleAudioError = (personId: string, url: string, error: any) => {
    if (error.message && error.message.includes('play() request was interrupted')) {
      return;
    }
    console.error(`Audio error for person ${personId} (${url}):`, error);

    setAudioErrors(prev => {
      if (!prev[personId]) {
        return { ...prev, [personId]: true };
      }
      return prev;
    });
  };

  // Helper function to generate alternative audio formats
  const getAudioUrls = (originalUrl: string) => {
    if (!originalUrl) return [];

    const basePath = originalUrl.replace(/\.[^/.]+$/, ""); // Remove extension
    const originalExt = originalUrl.substring(basePath.length); // Get original extension (e.g., '.wav')

    const potentialUrls = [
      originalUrl, // Try original first
      `${basePath}.mp3`,
      `${basePath}.wav`,
      `${basePath}.ogg`,
      `${basePath}.m4a`,
    ];
    return [...new Set(potentialUrls)].filter(url => url !== originalUrl || url === originalUrl); // Ensure original is included
  };

  // Helper function to normalize audio URL
  const normalizeUrl = (url: string | null | undefined): string | undefined => {
    if (!url) return undefined;
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    return url.startsWith('/') ? url : `/${url}`;
  };

  // Render each person's photo
  return (
    <AbsoluteFill style={{ backgroundColor: '#111' }}>
      {/* Render all photos */}
      {persons.map((person, index) => {
        const isActive = index === currentPersonIndex;
        const timings = personStartFrames[index];
        if (!timings) return null;

        const relativeFrame = isActive ? frame - timings.startFrame : -1;
        const personTotalDuration = timings.calculatedDuration;
        const initialPosition = initialPositions[index];

        const audioDurationInVideoFrames = useAudioDuration(person.audioUrl, fps) ?? (person.audioDuration * fps);

        const audioStartFrameAbsolute = timings.startFrame + transitionDuration * 0.5;

        const potentialAudioUrls = getAudioUrls(person.audioUrl)
          .map(url => normalizeUrl(url))
          .filter((url): url is string => Boolean(url));

        return (
          <React.Fragment key={person.id}>
            <PhotoPin
              person={person}
              isActive={isActive}
              relativeFrame={relativeFrame >= 0 ? relativeFrame : 0}
              transitionDuration={transitionDuration}
              totalDuration={personTotalDuration}
              initialPosition={initialPosition}
              centerPosition={{ x: width / 2, y: height / 2 }}
              audioSrc={isActive ? normalizeUrl(person.audioUrl) : undefined}
              audioStartFrame={isActive ? audioStartFrameAbsolute : undefined}
            />

            {isActive && (() => {
              const cardSequenceStartFrame = timings.startFrame;
              return (
                <Sequence
                  from={cardSequenceStartFrame}
                  durationInFrames={personTotalDuration}
                  name={`EvidenceCardSequence_${person.name}`}
                >
                  <EvidenceCard
                    name={person.name}
                    subtitle={person.subtitle}
                    relativeFrame={frame - cardSequenceStartFrame}
                    duration={personTotalDuration}
                  />
                </Sequence>
              );
            })()}

            {isActive && potentialAudioUrls.length > 0 && audioDurationInVideoFrames > 0 && (
              <Sequence
                from={audioStartFrameAbsolute}
                durationInFrames={audioDurationInVideoFrames}
                name={`AudioSequence_${person.name}`}
              >
                {!audioErrors[person.id] && potentialAudioUrls[0] && (
                  <Audio
                    src={staticFile(potentialAudioUrls[0])}
                    volume={1}
                    onError={(e) => handleAudioError(person.id, potentialAudioUrls[0], e)}
                  />
                )}

                {audioErrors[person.id] && potentialAudioUrls[1] && (
                  <Audio
                    src={staticFile(potentialAudioUrls[1])}
                    volume={1}
                    onError={(e) => console.error(`Fallback audio error for ${person.name} (${potentialAudioUrls[1]}):`, e)}
                  />
                )}
              </Sequence>
            )}

            <Sequence from={timings.startFrame} durationInFrames={5} name={`PinSoundStart_${person.name}`}>
              {sfxPinUrl && <Audio src={staticFile(normalizeUrl(sfxPinUrl) ?? '')} onError={(e) => console.error('Pin sound start error:', e)} />}
            </Sequence>
          </React.Fragment>
        );
      })}
    </AbsoluteFill>
  );
};