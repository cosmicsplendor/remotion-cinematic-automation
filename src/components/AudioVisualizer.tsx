// AudioVisualizer.tsx - With Amplitude Smoothing
import { useEffect, useRef } from 'react';
import {
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { useAudioData, visualizeAudio } from '@remotion/media-utils';

interface AudioVisualizerProps {
  audioSrc: string;
  audioStartFrame: number;
  onAmplitudeChange: (amplitude: number) => void;
  smoothingType?: 'envelope' | 'simple'; // Choose smoothing method
  attackRate?: number; // How fast to respond to increases (0-1, lower = faster)
  releaseRate?: number; // How fast to respond to decreases (0-1, higher = slower)
  smoothingFactor?: number; // For simple smoothing (0-1, higher = more smoothing)
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  audioSrc,
  audioStartFrame,
  onAmplitudeChange,
  smoothingType = 'envelope',
  attackRate = 0.3, // Fast attack
  releaseRate = 0.70, // Slow release
  smoothingFactor = 0.60,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  // Store the previous amplitude for smoothing
  const prevAmplitudeRef = useRef<number>(0);

  // Attack/Release envelope for more natural audio response
  const applyEnvelope = (current: number, previous: number, attackRate: number = 0.3, releaseRate: number = 0.85): number => {
    // If amplitude is increasing (attack), respond faster
    if (current > previous) {
      return previous * attackRate + current * (1 - attackRate);
    }
    // If amplitude is decreasing (release), respond slower for smoother decay
    return previous * releaseRate + current * (1 - releaseRate);
  };

  // Simple exponential moving average (backup/alternative method)
  const smoothAmplitude = (current: number, previous: number, factor: number): number => {
    return previous * factor + current * (1 - factor);
  };

  const audioData = useAudioData(staticFile(audioSrc));

  useEffect(() => {
    if (!audioData) {
      const smoothedZero = smoothingType === 'envelope'
        ? applyEnvelope(0, prevAmplitudeRef.current, attackRate, releaseRate)
        : smoothAmplitude(0, prevAmplitudeRef.current, smoothingFactor);
      prevAmplitudeRef.current = smoothedZero;
      onAmplitudeChange(smoothedZero);
      return;
    }

    const frameInAudio = frame - audioStartFrame;

    if (frameInAudio < 0) {
      const smoothedZero = smoothingType === 'envelope' 
        ? applyEnvelope(0, prevAmplitudeRef.current, attackRate, releaseRate)
        : smoothAmplitude(0, prevAmplitudeRef.current, smoothingFactor);
      prevAmplitudeRef.current = smoothedZero;
      onAmplitudeChange(smoothedZero);
      return;
    }

    const visualization = visualizeAudio({
      fps,
      frame: frameInAudio,
      audioData,
      numberOfSamples: 1,
    });

    const rawAmplitude = visualization[0] || 0;
    
    // Normalize the raw amplitude
    const normalizedAmplitude = Math.min(1, Math.max(0, rawAmplitude * 2));
    
    // Apply chosen smoothing method
    let smoothedAmplitude: number;
    
    if (smoothingType === 'envelope') {
      // Attack/Release envelope - mimics how audio equipment works
      smoothedAmplitude = applyEnvelope(normalizedAmplitude, prevAmplitudeRef.current, attackRate, releaseRate);
    } else {
      // Simple exponential moving average
      smoothedAmplitude = smoothAmplitude(normalizedAmplitude, prevAmplitudeRef.current, smoothingFactor);
    }
    
    // Store for next frame
    prevAmplitudeRef.current = smoothedAmplitude;
    
    onAmplitudeChange(smoothedAmplitude);

  }, [audioData, frame, fps, onAmplitudeChange, audioStartFrame, smoothingType, attackRate, releaseRate, smoothingFactor]);

  return null;
};