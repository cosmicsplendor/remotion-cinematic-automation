// AudioVisualizer.tsx - Changes
import { useEffect } from 'react';
import {
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { useAudioData, visualizeAudio } from '@remotion/media-utils';

interface AudioVisualizerProps {
  audioSrc: string;
  audioStartFrame: number; // Added prop
  onAmplitudeChange: (amplitude: number) => void;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  audioSrc,
  audioStartFrame, // Get the start frame
  onAmplitudeChange,
}) => {
  const frame = useCurrentFrame(); // Absolute frame in the video timeline
  const { fps } = useVideoConfig();

  // Load the specific audio file
  const audioData = useAudioData(staticFile(audioSrc));
  console.log(audioSrc)
  useEffect(() => {
    // Reset if no audio data yet
    if (!audioData) {
      onAmplitudeChange(0);
      return;
    }

    // Calculate the frame number relative to the start of *this* audio clip's playback
    const frameInAudio = frame - audioStartFrame;

    // If the current frame is before the audio is supposed to start,
    // or if calculated frame is negative for any reason, amplitude is 0
    if (frameInAudio < 0) {
       onAmplitudeChange(0);
       return;
    }

    // Calculate visualization using the FRAME WITHIN THE AUDIO FILE
    const visualization = visualizeAudio({
      fps,
      frame: frameInAudio, // Use the relative frame here!
      audioData,
      numberOfSamples: 1, // Get a single amplitude value
    });

    // Extract amplitude (ensure it's not undefined)
    const amplitude = visualization[0] || 0;

    // Normalize amplitude (adjust multiplier as needed for desired effect)
    const normalizedAmplitude = Math.min(1, Math.max(0, amplitude * 2)); // Example normalization

    // Send the amplitude back to the parent
    onAmplitudeChange(normalizedAmplitude);

    // Dependencies: Recalculate if any of these change
  }, [audioData, frame, fps, onAmplitudeChange, audioStartFrame]); // Add audioStartFrame

  // This component renders nothing itself
  return null;
};