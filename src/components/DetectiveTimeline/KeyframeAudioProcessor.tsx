// KeyframeAudioProcessor.tsx (or inline in TimelineEvent.tsx if preferred)
import React, { useEffect } from 'react';
import { useAudioData, visualizeAudio, AudioData } from '@remotion/media-utils';
import { interpolate } from 'remotion'; // If interpolate is used for glow

type KeyframeAudioProcessorProps = {
  audioPath: string; // Note: strictly string
  isActive: boolean;
  // Pass all other necessary props for visualization:
  fps: number;
  frameInActiveKeyframeAudio: number; // Calculated by parent
  activeKeyframeDurationFrames: number; // Calculated by parent
  onGlowCalculated: (glow: number) => void;
};

const KeyframeAudioProcessor: React.FC<KeyframeAudioProcessorProps> = ({
  audioPath,
  isActive,
  fps,
  frameInActiveKeyframeAudio,
  activeKeyframeDurationFrames,
  onGlowCalculated,
}) => {
  // useAudioData is now called with a guaranteed string
  console.log({audioPath})
  const audioData = useAudioData(audioPath);

  useEffect(() => {
    let newGlow = 0;
    if (isActive && audioData) { // audioData can be null if loading or error
      if (frameInActiveKeyframeAudio >= 0 && frameInActiveKeyframeAudio < activeKeyframeDurationFrames) {
        const visualization = visualizeAudio({
          fps,
          frame: frameInActiveKeyframeAudio,
          audioData: audioData, // audioData is AudioData | null
          numberOfSamples: 1,
        });
        const currentAmplitude = visualization[0] || 0;
        newGlow = Math.max(0, Math.min( currentAmplitude * 2)); // Clamp to desired max
      }
    }
    onGlowCalculated(newGlow);
  }, [
    isActive,
    audioData,
    fps,
    frameInActiveKeyframeAudio,
    activeKeyframeDurationFrames,
    onGlowCalculated,
  ]);

  return null; // This component only processes data, doesn't render UI
};

export default KeyframeAudioProcessor;