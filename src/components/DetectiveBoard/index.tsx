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

export const DetectiveBoardPresentation: React.FC<DetectiveBoardPresentationProps> = ({
  sfxPinUrl = '/assets/sfx/pin.wav',
  transitionDuration = 30, // ~1 second at 30fps
  holdDuration = 60, // Extra time to show the photo after audio ends
}) => {
  const frame = useCurrentFrame();
  const { width, height, fps, durationInFrames } = useVideoConfig();

  // Track which audio files have errors
  const [audioErrors, setAudioErrors] = useState<Record<string, boolean>>({});

  // Debug logging to verify that persons data is correct
  useEffect(() => {
    if (frame === 0) {
      console.log('Persons data:', persons);
      console.log('FPS:', fps);
      console.log('Duration in frames:', durationInFrames);
      // Crucial: Verify audioDuration values
      persons.forEach(p => console.log(`Person ${p.name} audioDuration: ${p.audioDuration}`));
    }
  }, [frame, fps, durationInFrames]);

  // Calculate the total duration per person (audio + transition + hold)
  // Ensure audioDuration corresponds to the VIDEO's FPS
  const timePerPerson = useMemo(() => {
    return persons.map(person => {
      // IMPORTANT: Assume person.audioDuration is in SECONDS unless already converted
      // If audioDuration is already in frames (at video fps), use it directly.
      // If it's in seconds, multiply by fps.
      const audioDurationInVideoFrames = person.audioDuration * fps; // Assuming audioDuration is in seconds
      // const audioDurationInVideoFrames = person.audioDuration; // Use this if audioDuration is already in frames matching video FPS

      if (frame === 0 && isNaN(audioDurationInVideoFrames)) {
        console.warn(`Person ${person.name} has invalid audioDuration: ${person.audioDuration}`);
      }

      return {
        id: person.id,
        duration: (audioDurationInVideoFrames || 0) + transitionDuration * 2 + holdDuration,
      };
    });
  }, [persons, transitionDuration, holdDuration, fps, frame]); // Added frame dependency for initial log


  // Calculate the start frame for each person
  const personStartFrames = useMemo(() => {
    let startFrame = 0;
    return persons.map((person, index) => {
      const start = startFrame;
      const duration = timePerPerson[index]?.duration || transitionDuration * 2 + holdDuration; // Fallback duration if calculation failed
      startFrame += duration;

      // Debug logging to verify timing calculations
      if (frame === 0) {
        console.log(`Person ${person.name}: start=${start}, duration=${duration}, end=${startFrame}`);
        if (duration <= transitionDuration * 2 + holdDuration) {
          console.warn(`Person ${person.name} has zero or invalid audio duration contributing to total time.`);
        }
      }

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

    // Debug logging for current person (less frequent)
    // if (frame % 15 === 0) { // Log more frequently during debugging
    //   console.log(`Frame ${frame}, Current person index: ${index}`);
    // }

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
    // Avoid logging harmless 'DOMException: The play() request was interrupted' which can happen during seeks
    if (error.message && error.message.includes('play() request was interrupted')) {
      // console.log(`Audio interruption ignored for ${personId} (${url})`);
      return;
    }
    console.error(`Audio error for person ${personId} (${url}):`, error);

    // Mark this audio file as having an error only if it's not already marked
    // to prevent potential infinite loops if fallback also fails
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

    // Simple approach: return original only for now. Implement fallback logic if needed.
    // return [originalUrl];

    // Fallback Example: Try mp3, wav, ogg if original fails
    const basePath = originalUrl.replace(/\.[^/.]+$/, ""); // Remove extension
    const originalExt = originalUrl.substring(basePath.length); // Get original extension (e.g., '.wav')

    const potentialUrls = [
      originalUrl, // Try original first
      `${basePath}.mp3`,
      `${basePath}.wav`,
      `${basePath}.ogg`,
      `${basePath}.m4a`,
    ];
    // Return unique URLs, keeping original order preference
    return [...new Set(potentialUrls)].filter(url => url !== originalUrl || url === originalUrl); // Ensure original is included
  };

  // Helper function to normalize audio URL
  const normalizeUrl = (url: string | null | undefined): string | undefined => {
    if (!url) return undefined;
    // Ensure the URL starts with / unless it's an absolute URL (http/https)
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
        if (!timings) return null; // Should not happen, but good practice

        const relativeFrame = isActive ? frame - timings.startFrame : -1; // Use -1 to indicate not active
        const personTotalDuration = timings.calculatedDuration;
        const initialPosition = initialPositions[index];

        // Calculate audio duration in video frames (ensure this matches calculation in timePerPerson)
        const audioDurationInVideoFrames = person.audioDuration * fps; // Assuming audioDuration is in seconds
        // const audioDurationInVideoFrames = person.audioDuration; // Use this if audioDuration is already in frames matching video FPS

        // Audio should start playing 'transitionDuration' frames after the person's segment starts
        const audioStartFrameAbsolute = timings.startFrame + transitionDuration * 0.5;

        // Get all potential audio URLs to try, normalized
        const potentialAudioUrls = getAudioUrls(person.audioUrl)
          .map(url => normalizeUrl(url))
          .filter((url): url is string => Boolean(url)); // Type guard to ensure non-null strings


        return (
          <React.Fragment key={person.id}>
            {/* Photo pin component */}
            <PhotoPin
              person={person}
              isActive={isActive}
              relativeFrame={relativeFrame >= 0 ? relativeFrame : 0}
              transitionDuration={transitionDuration}
              totalDuration={personTotalDuration}
              initialPosition={initialPosition}
              centerPosition={{ x: width / 2, y: height / 2 }}
              // Pass the audio source URL if the person is active
              audioSrc={isActive ? normalizeUrl(person.audioUrl) : undefined}
              // Pass the absolute frame number when this audio should start playing
              audioStartFrame={isActive ? audioStartFrameAbsolute : undefined}
            />

            {/* Evidence card with text (only shown when active) */}
            {isActive  && (() => { // Start of IIFE
              // Calculate the absolute start frame for this specific card sequence
              const cardSequenceStartFrame = timings.startFrame ;
              // Calculate the duration the card should be visible
              // Ensure duration is not negative if timings are short

              // Only render the sequence if it has a positive duration
              // Return the Sequence component from the IIFE
              return (
                <Sequence
                  from={cardSequenceStartFrame} // Correct: Start at the absolute frame for this person's card
                  durationInFrames={personTotalDuration}
                  name={`EvidenceCardSequence_${person.name}`} // Optional: Good for debugging
                >
                  <EvidenceCard
                    name={person.name}
                    subtitle={person.subtitle}
                    // This calculation gives the frame relative to the start of the card sequence
                    relativeFrame={frame - cardSequenceStartFrame}
                  />
                </Sequence>
              );
              // If duration is not positive, the IIFE returns null (effectively rendering nothing)
              return null;
            })() /* End of IIFE, immediately invoked */}
            {/* Audio Playback using Sequence */}
            {isActive && potentialAudioUrls.length > 0 && audioDurationInVideoFrames > 0 && (
              <Sequence
                from={audioStartFrameAbsolute} // Start playing exactly when audio should begin
                durationInFrames={audioDurationInVideoFrames} // Play for the calculated duration
                name={`AudioSequence_${person.name}`}
              >
                {/* Attempt Primary Audio URL */}
                {!audioErrors[person.id] && potentialAudioUrls[0] && (
                  <Audio
                    src={staticFile(potentialAudioUrls[0])}
                    volume={1}
                    onError={(e) => handleAudioError(person.id, potentialAudioUrls[0], e)}
                  // Consider adding startFrom prop if needed, though Sequence 'from' usually handles it
                  // startFrom={0} // Audio starts at the beginning of the Sequence
                  // endAt={audioDurationInVideoFrames} // Audio ends at the end of the Sequence duration
                  />
                )}

                {/* Attempt Fallback Audio URL(s) if Primary had Error */}
                {audioErrors[person.id] && potentialAudioUrls[1] && (
                  <Audio
                    src={staticFile(potentialAudioUrls[1])}
                    volume={1}
                    // Don't set error state again for fallback, just log
                    onError={(e) => console.error(`Fallback audio error for ${person.name} (${potentialAudioUrls[1]}):`, e)}
                  // startFrom={0}
                  // endAt={audioDurationInVideoFrames}
                  />
                )}
                {/* Add more fallbacks if necessary */}
                {/* {audioErrors[person.id] && potentialAudioUrls[2] && ( <Audio ... /> )} */}
              </Sequence>
            )}


            {/* Pin sound effect (Place start SFX within the main person sequence) */}
            <Sequence from={timings.startFrame} durationInFrames={5} name={`PinSoundStart_${person.name}`}>
              {sfxPinUrl && <Audio src={staticFile(normalizeUrl(sfxPinUrl) ?? '')} onError={(e) => console.error('Pin sound start error:', e)} />}
            </Sequence>

            {/* Pin sound effect when returning (Place end SFX within the main person sequence) */}
            {/* Calculate absolute frame for return pin sound */}
            {(() => {
              const returnPinSoundStartFrame = timings.startFrame + transitionDuration + audioDurationInVideoFrames + holdDuration - 5;
              // Ensure this frame is within the component's overall activity
              if (returnPinSoundStartFrame > timings.startFrame && returnPinSoundStartFrame < timings.endFrame) {
                return (
                  <Sequence from={returnPinSoundStartFrame} durationInFrames={5} name={`PinSoundEnd_${person.name}`}>
                    {sfxPinUrl && <Audio src={staticFile(normalizeUrl(sfxPinUrl) ?? '')} onError={(e) => console.error('Pin sound end error:', e)} />}
                  </Sequence>
                );
              }
              return null;
            })()}

          </React.Fragment>
        );
      })}
    </AbsoluteFill>
  );
};