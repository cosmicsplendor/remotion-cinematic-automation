// KeyframeAudioProcessor.tsx (or inline in TimelineEvent.tsx if preferred)
import React, { useEffect, useState } from 'react';
import { useAudioData, visualizeAudio } from '@remotion/media-utils';
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
    const audioData = useAudioData(audioPath);
    const [ prevAmp, setPrevAmp ] = useState(0);
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
                const curAmp = prevAmp + (currentAmplitude - prevAmp); // Average current and previous amplitude
                setPrevAmp(curAmp);
                newGlow = interpolate(curAmp, [0, 1], [0, 1], {
                    extrapolateLeft: 'clamp',
                    extrapolateRight: 'clamp',
                });
                newGlow = Math.max(0, Math.min(0.4, newGlow)); // Clamp to desired max
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