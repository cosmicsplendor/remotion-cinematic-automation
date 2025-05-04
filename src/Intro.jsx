import React, { useMemo } from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
} from 'remotion';

// This function segments Devanagari text into proper syllabic units (akshara)
// to ensure conjuncts are never broken apart during rendering
const segmentDevanagariText = (text) => {
  const syllables = [];
  let currentSyllable = '';
  
  // We'll analyze each character and build syllables
  for (let i = 0; i < text.length; i++) {
    const char = text.charAt(i);
    const codePoint = text.codePointAt(i);
    
    // Add current character to the current syllable
    currentSyllable += char;
    
    // Check if this could be a syllable boundary
    const isSpace = codePoint === 0x0020;
    const isLastChar = i === text.length - 1;
    
    // Check if next character is a consonant (which would start a new syllable)
    const nextCharIsConsonant = i < text.length - 1 && 
                               (text.codePointAt(i+1) >= 0x0915 && text.codePointAt(i+1) <= 0x0939);
    
    // Check if current character is a vowel sign (matra)
    const isVowelSign = codePoint >= 0x093E && codePoint <= 0x094C;
    
    // End syllable at spaces, after vowel signs before consonants, or at end of string
    if (isSpace || (isVowelSign && nextCharIsConsonant) || isLastChar) {
      if (currentSyllable.trim() || isSpace) {
        syllables.push(currentSyllable);
      }
      if (!isLastChar && !isSpace) {
        currentSyllable = '';
      } else if (isSpace) {
        currentSyllable = '';
      }
    }
    
    // Special case: if we just added a halant (्) and next char is consonant,
    // we need to keep building the current syllable (for conjuncts like ज्ञ)
    const isHalant = codePoint === 0x094D;
    if (isHalant && i < text.length - 1) {
      // Don't end the syllable yet
      continue;
    }
  }
  
  return syllables;
};

const data = {
  title: "भ्यागुता खोज्ने केटाहरु",
  subtitle: "a closer look at the cold case",
};

export const Intro = () => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();
  
  const opacity = interpolate(
    frame,
    [0, 30, durationInFrames - 30, durationInFrames],
    [0, 1, 1, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );
  
  const titleOpacity = interpolate(
    frame,
    [0, 20, 40],
    [0, 0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );
  
  const subtitleOpacity = interpolate(
    frame,
    [40, 60, 80],
    [0, 0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );
  
  // Segment the title into proper syllabic units
  const titleClusters = useMemo(() => {
    return segmentDevanagariText(data.title);
  }, [data.title]);
  
  // Calculate visible clusters for typewriter effect
  const visibleClusters = Math.floor(
    interpolate(frame, [40, 80], [0, titleClusters.length], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    })
  );
  
  // Join the visible clusters to form the displayed title
  const displayedTitle = titleClusters.slice(0, visibleClusters).join('');
  
  return (
    <AbsoluteFill
      style={{
        backgroundColor: 'black',
        color: 'white',
        opacity,
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          width: '100%',
        }}
      >
        <h1
          style={{
            fontFamily: 'Special Elite, cursive',
            fontSize: 80,
            marginBottom: 20,
            opacity: titleOpacity,
          }}
        >
          {displayedTitle}
          {frame % 30 < 15 && <span>|</span>}
        </h1>
        
        <h2
          style={{
            fontSize: 32,
            opacity: subtitleOpacity,
            fontWeight: 400,
          }}
        >
          {data.subtitle}
        </h2>
      </div>
    </AbsoluteFill>
  );
};