// useAudioAmplitude.ts
import { useEffect, useState, useRef, useMemo } from 'react';
import {
    staticFile,
    useCurrentFrame,
    useVideoConfig,
} from 'remotion';
import { useAudioData, visualizeAudio } from '@remotion/media-utils';

// Helper: Attack/Release envelope for more natural audio response
const applyEnvelopeSmoothing = (
    current: number,
    previous: number,
    attackRate: number,
    releaseRate: number
): number => {
    // If amplitude is increasing (attack), respond based on attackRate
    if (current > previous) {
        return previous * attackRate + current * (1 - attackRate);
    }
    // If amplitude is decreasing (release), respond based on releaseRate
    return previous * releaseRate + current * (1 - releaseRate);
};

// Helper: Simple exponential moving average
const applySimpleSmoothing = (
    current: number,
    previous: number,
    factor: number
): number => {
    return previous * factor + current * (1 - factor);
};

interface UseAudioAmplitudeParams {
    audioSrc: string; // Allow null if no audio should be processed
    audioStartFrame: number;
    smoothingType?: 'envelope' | 'simple';
    attackRate?: number;
    releaseRate?: number;
    smoothingFactor?: number;
    normalizationFactor?: number; // Optional: to scale raw amplitude
}

export const useAudioAmplitude = ({
    audioSrc,
    audioStartFrame,
    smoothingType = 'envelope',
    attackRate = 0.3,   // Fast attack
    releaseRate = 0.70,  // Slower release for smoother decay
    smoothingFactor = 0.60,
    normalizationFactor = 2, // Default normalization from your component
}: UseAudioAmplitudeParams): number => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const [amplitude, setAmplitude] = useState<number>(0);
    const prevAmplitudeRef = useRef<number>(0);

    // Memoize the staticFile object to ensure a stable reference for useAudioData
    const memoizedStaticAudioFile = useMemo(() => {
        // console.log(`useAudioAmplitude: staticFile called for ${audioSrc}`);
        return staticFile(audioSrc);
    }, [audioSrc]);

    const audioData = useAudioData(memoizedStaticAudioFile);

    // useEffect(() => {
    //     let smoothedValue: number;

    //     if (!audioData || !audioSrc) { // No data or no source specified
    //         // Smooth towards 0
    //         if (smoothingType === 'envelope') {
    //             smoothedValue = applyEnvelopeSmoothing(0, prevAmplitudeRef.current, attackRate, releaseRate);
    //         } else {
    //             smoothedValue = applySimpleSmoothing(0, prevAmplitudeRef.current, smoothingFactor);
    //         }
    //         prevAmplitudeRef.current = smoothedValue;
    //         setAmplitude(smoothedValue);
    //         return;
    //     }

    //     const frameInAudio = frame - audioStartFrame;

    //     if (frameInAudio < 0) { // Current frame is before the audio is supposed to start
    //         // Smooth towards 0
    //         if (smoothingType === 'envelope') {
    //             smoothedValue = applyEnvelopeSmoothing(0, prevAmplitudeRef.current, attackRate, releaseRate);
    //         } else {
    //             smoothedValue = applySimpleSmoothing(0, prevAmplitudeRef.current, smoothingFactor);
    //         }
    //         prevAmplitudeRef.current = smoothedValue;
    //         setAmplitude(smoothedValue);
    //         return;
    //     }

    //     const visualization = visualizeAudio({
    //         fps,
    //         frame: frameInAudio,
    //         audioData,
    //         numberOfSamples: 1, // We only need one value for the overall amplitude
    //     });

    //     const rawAmplitude = visualization[0] || 0;

    //     // Normalize the raw amplitude (ensure it's within 0-1 range after normalization)
    //     const normalizedAmplitude = Math.min(1, Math.max(0, rawAmplitude * normalizationFactor));

    //     // Apply chosen smoothing method
    //     if (smoothingType === 'envelope') {
    //         smoothedValue = applyEnvelopeSmoothing(normalizedAmplitude, prevAmplitudeRef.current, attackRate, releaseRate);
    //     } else { // 'simple'
    //         smoothedValue = applySimpleSmoothing(normalizedAmplitude, prevAmplitudeRef.current, smoothingFactor);
    //     }

    //     // Store for next frame's smoothing calculation
    //     prevAmplitudeRef.current = smoothedValue;
    //     // Update the state that will be returned by the hook
    //     setAmplitude(smoothedValue);

    // }, [
    //     audioData,
    //     audioSrc, // To re-evaluate if the source path itself changes to null/valid
    //     frame,
    //     fps,
    //     audioStartFrame,
    //     smoothingType,
    //     attackRate,
    //     releaseRate,
    //     smoothingFactor,
    //     normalizationFactor,
    //     // setAmplitude is stable, prevAmplitudeRef.current changes do not trigger effects
    // ]);

    return amplitude;
};