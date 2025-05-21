// Base types for local Vanta modules
interface VantaBaseOptions {
  el: HTMLElement | string | null;
  THREE?: any;
  mouseControls?: boolean;
  touchControls?: boolean;
  gyroControls?: boolean;
  minHeight?: number;
  minWidth?: number;
  scale?: number;
  scaleMobile?: number;
}

interface VantaEffect {
  setOptions: (options: any) => void;
  resize: () => void;
  destroy: () => void;
  renderer?: any;
  scene?: any;
  camera?: any;
}

// Type declarations for local Vanta modules
declare module 'lib/backgrounds/vanta.birds.min.js' {
  interface BirdsOptions extends VantaBaseOptions {
    backgroundColor?: number;
    color1?: number;
    color2?: number;
    colorMode?: string;
    birdSize?: number;
    wingSpan?: number;
    speedLimit?: number;
    separation?: number;
    alignment?: number;
    cohesion?: number;
    quantity?: number;
  }
  const VANTA: (options: BirdsOptions) => VantaEffect;
  export default VANTA;
}

declare module 'lib/backgrounds/vanta.cells.min.js' {
  interface CellsOptions extends VantaBaseOptions {
    color1?: number;
    color2?: number;
    size?: number;
    speed?: number;
  }
  const VANTA: (options: CellsOptions) => VantaEffect;
  export default VANTA;
}

declare module 'lib/backgrounds/vanta.dots.min.js' {
  interface DotsOptions extends VantaBaseOptions {
    color?: number;
    color2?: number;
    backgroundColor?: number;
    size?: number;
    spacing?: number;
  }
  const VANTA: (options: DotsOptions) => VantaEffect;
  export default VANTA;
}

declare module 'lib/backgrounds/vanta.globe.min.js' {
  interface GlobeOptions extends VantaBaseOptions {
    backgroundColor?: number;
    color?: number;
    color2?: number;
    size?: number;
    zoom?: number;
    xOffset?: number;
    yOffset?: number;
  }
  const VANTA: (options: GlobeOptions) => VantaEffect;
  export default VANTA;
}

declare module 'lib/backgrounds/vanta.ripple.min.js' {
  interface RippleOptions extends VantaBaseOptions {
    color?: number;
    backgroundColor?: number;
    waveHeight?: number;
    waveSpeed?: number;
    zoom?: number;
  }
  const VANTA: (options: RippleOptions) => VantaEffect;
  export default VANTA;
}

declare module 'lib/backgrounds/vanta.trunk.min.js' {
  interface TrunkOptions extends VantaBaseOptions {
    color?: number;
    backgroundColor?: number;
    spacing?: number;
    chaos?: number;
  }
  const VANTA: (options: TrunkOptions) => VantaEffect;
  export default VANTA;
}