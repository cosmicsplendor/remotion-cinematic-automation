// types.ts
export interface PersonData {
    id: string;
    name: string;
    subtitle: string;
    photoUrl: string;
    audioUrl: string;
    audioDuration: number; // in frames
  }
  
  // Optional additional data structure for the red string connections
  export interface ConnectionData {
    fromId: string;
    toId: string;
    label?: string;
  }
  
  export interface DetectiveBoardConfig {
    persons: PersonData[];
    connections?: ConnectionData[];
    backgroundUrl?: string;
    sfxTypewriterUrl?: string;
    sfxPinUrl?: string;
    transitionDuration?: number; // in frames
    holdDuration?: number; // in frames
  }