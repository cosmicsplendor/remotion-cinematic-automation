// AudioVisualizer.tsx
import { useEffect } from 'react';
import {
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { useAudioData, visualizeAudio } from '@remotion/media-utils';

interface AudioVisualizerProps {
  audioSrc: string;
  onAmplitudeChange: (amplitude: number) => void;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  audioSrc,
  onAmplitudeChange,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  // Get audio data
  const audioData = useAudioData(audioSrc);
  
  // Calculate the current amplitude and call the callback
  useEffect(() => {
    if (!audioData) {
      onAmplitudeChange(0);
      return;
    }
    
    // Calculate the visualization for the current frame
    const visualization = visualizeAudio({
      fps,
      frame,
      audioData,
      numberOfSamples: 1, // Just get one sample for simplicity
    });
    
    // Get the average amplitude from the visualization
    const amplitude = visualization[0] || 0;
    
    // Normalize to a value between 0 and 1
    // and smooth it a bit to avoid harsh changes
    const normalizedAmplitude = Math.min(1, Math.max(0, amplitude * 2));
    
    // Call the callback with the amplitude
    onAmplitudeChange(normalizedAmplitude);
  }, [audioData, frame, fps, onAmplitudeChange]);
  
  // This component doesn't render anything visible
  return null;
};