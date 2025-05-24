// This function segments Devanagari text into proper syllabic units (akshara)
// to ensure conjuncts are never broken apart during rendering
export const segmentDevanagariText = (text: string) => {
  const syllables: string[] = [];
  let currentSyllable: string = '';

  // Unicode ranges
  const CONSONANT_START = 0x0915;
  const CONSONANT_END = 0x0939;
  const VOWEL_SIGN_START = 0x093E; // Includes Nukta, Avagraha which might need specific handling
  const VOWEL_SIGN_END = 0x094C;   // Doesn't include Anusvara, Visarga, Chandrabindu
  const HALANT = 0x094D;
  const VOWEL_START = 0x0904; // Includes Anusvara, Visarga, Chandrabindu
  const VOWEL_END = 0x0914;
  const SPACE = 0x0020;
  // Add other relevant characters if needed (e.g., 0x0901 Chandrabindu, 0x0902 Anusvara, 0x0903 Visarga)

  const isConsonant = (cp) => cp >= CONSONANT_START && cp <= CONSONANT_END;
  const isVowelSign = (cp) => cp >= VOWEL_SIGN_START && cp <= VOWEL_SIGN_END;
  const isHalant = (cp) => cp === HALANT;
  const isIndependentVowel = (cp) => cp >= VOWEL_START && cp <= VOWEL_END;
  const isSpace = (cp) => cp === SPACE;

  for (let i = 0; i < text.length; i++) {
    const char = text.charAt(i);
    const codePoint = text.codePointAt(i);
    let prevCodePoint = i > 0 ? text.codePointAt(i - 1) : null;

    // **NEW RULE: Check if we should start a new syllable**
    // Start new syllable if:
    // 1. Current char is a consonant AND
    // 2. The previous char was NOT a Halant AND
    // 3. We actually have built something in the current syllable
    if (currentSyllable.length > 0 && isConsonant(codePoint) && prevCodePoint !== null && !isHalant(prevCodePoint)) {
       syllables.push(currentSyllable);
       currentSyllable = '';
    }
    // Also start new syllable if current char is an independent vowel
    // (and previous wasn't part of its formation - simpler check here)
     else if (currentSyllable.length > 0 && isIndependentVowel(codePoint)) {
         syllables.push(currentSyllable);
         currentSyllable = '';
     }
     // Handle spaces explicitly to avoid merging them into syllables
     else if (isSpace(codePoint)) {
        if (currentSyllable.length > 0) {
            syllables.push(currentSyllable);
        }
        syllables.push(char); // Push the space itself as a segment
        currentSyllable = '';
        continue; // Skip the rest of the loop for spaces
     }


    // Add current character to the current syllable
    currentSyllable += char;

    // --- Original boundary checks are less critical now, but keep end-of-string ---
    const isLastChar = i === text.length - 1;

    // Push the last syllable if we reach the end
    if (isLastChar && currentSyllable.length > 0) {
      syllables.push(currentSyllable);
    }

    // The halant special case might still be relevant depending on exact logic,
    // but the core split is handled by the rule added above.
    // The original `(isVowelSign && nextCharIsConsonant)` might be redundant or need adjustment
    // based on the new primary rule. For simplicity, we rely on the consonant-start rule.

  }

  // Filter out any potentially empty strings if logic allows them
  return syllables.filter(s => s.length > 0);
};