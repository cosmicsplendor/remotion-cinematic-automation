// DetectiveBoardPresentation.tsx
import React, { useMemo } from 'react';
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
  audioDuration: number; // in frames
}

// Props for the main component
interface DetectiveBoardPresentationProps {
  backgroundUrl?: string;
  sfxTypewriterUrl?: string;
  sfxPinUrl?: string;
  transitionDuration?: number; // in frames
  holdDuration?: number; // in frames
}
const BOARD_MARGIN = 100; // Margin from the edge of the board
const INITIAL_POSITION_TOP = 100; // Initial Y position for all photos

export const DetectiveBoardPresentation: React.FC<DetectiveBoardPresentationProps> = ({
  backgroundUrl = '/assets/cork-board.jpg',
  sfxTypewriterUrl = '/assets/sfx/typewriter.wav',
  sfxPinUrl = '/assets/sfx/pin.wav',
  transitionDuration = 30, // ~1 second at 30fps
  holdDuration = 60, // Extra time to show the photo after audio ends
}) => {
  const frame = useCurrentFrame();
  const { width, height, fps, durationInFrames } = useVideoConfig();
  
  // Calculate the total duration per person (audio + transition + hold)
  const timePerPerson = useMemo(() => {
    return persons.map(person => ({
      id: person.id,
      duration: person.audioDuration + transitionDuration * 2 + holdDuration,
    }));
  }, [persons, transitionDuration, holdDuration]);
  
  // Calculate the start frame for each person
  const personStartFrames = useMemo(() => {
    let startFrame = 0;
    return persons.map((person, index) => {
      const start = startFrame;
      startFrame += timePerPerson[index].duration;
      return {
        id: person.id,
        startFrame: start,
        endFrame: startFrame,
      };
    });
  }, [persons, timePerPerson]);
  
  // Determine the current active person
  const currentPersonIndex = useMemo(() => {
    return personStartFrames.findIndex(
      person => frame >= person.startFrame && frame < person.endFrame
    );
  }, [frame, personStartFrames]);
  
  // Calculate initial positions for each photo (random but evenly distributed)
  const initialPositions = useMemo(() => {
    return persons.map((person, index) => {
      // Calculate position along the top with even spacing
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
  
  // Render each person's photo
  return (
    <AbsoluteFill style={{ backgroundColor: '#111' }}>
      {/* Background */}
      {backgroundUrl && (
        <img 
          src={staticFile(backgroundUrl)} 
          style={{ 
            width: '100%', 
            height: '100%', 
            objectFit: 'cover', 
            position: 'absolute' 
          }} 
        />
      )}
      
      {/* Render all photos */}
      {persons.map((person, index) => {
        const isActive = index === currentPersonIndex;
        const relativeFrame = isActive 
          ? frame - personStartFrames[index].startFrame 
          : 0;
        const personTotalDuration = timePerPerson[index].duration;
        const initialPosition = initialPositions[index];
        
        // Calculate if we should play audio for this person
        const shouldPlayAudio = isActive && 
          relativeFrame >= transitionDuration && 
          relativeFrame < transitionDuration + person.audioDuration;
        
        return (
          <React.Fragment key={person.id}>
            {/* Photo pin component */}
            <PhotoPin
              person={person}
              isActive={isActive}
              relativeFrame={relativeFrame}
              transitionDuration={transitionDuration}
              totalDuration={personTotalDuration}
              initialPosition={initialPosition}
              centerPosition={{ x: width / 2, y: height / 2 }}
              audioData={isActive && shouldPlayAudio ? person.audioUrl : undefined}
            />
            
            {/* Evidence card with text (only shown when active) */}
            {isActive && (
              <Sequence from={transitionDuration}>
                <EvidenceCard
                  name={person.name}
                  subtitle={person.subtitle}
                  relativeFrame={relativeFrame - transitionDuration}
                  sfxTypewriterUrl={sfxTypewriterUrl}
                />
              </Sequence>
            )}
            
            {/* Audio playback */}
            {shouldPlayAudio && (
              <Audio src={staticFile(person.audioUrl)} />
            )}
            
            {/* Pin sound effect */}
            {isActive && relativeFrame < 5 && (
              <Audio src={staticFile(sfxPinUrl)} />
            )}
            
            {/* Pin sound effect when returning */}
            {isActive && 
              relativeFrame > transitionDuration + person.audioDuration + holdDuration - 5 && 
              relativeFrame < transitionDuration + person.audioDuration + holdDuration && (
              <Audio src={staticFile(sfxPinUrl)} />
            )}
          </React.Fragment>
        );
      })}
    </AbsoluteFill>
  );
};