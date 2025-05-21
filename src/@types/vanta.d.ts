// vanta.d.ts
declare module 'vanta' {
  export interface VantaBaseOptions {
    el: HTMLElement | string | null;
    mouseControls?: boolean;
    touchControls?: boolean;
    gyroControls?: boolean;
    minHeight?: number;
    minWidth?: number;
    scale?: number;
    scaleMobile?: number;
    THREE?: any; // THREE.js instance
    points?: number;
    maxDistance?: number;
    spacing?: number;
    showDots?: boolean;
    backgroundAlpha?: number;
  }

  export interface VantaEffect {
    setOptions: (options: VantaBaseOptions) => void;
    resize: () => void;
    destroy: () => void;
    renderer?: any;
    scene?: any;
    camera?: any;
    material?: any;
    geometry?: any;
    conf?: any;
    uniforms?: any;
    options: VantaBaseOptions & Record<string, any>;
    update: () => void;
  }

  // BIRDS effect
  export interface VantaBirdsOptions extends VantaBaseOptions {
    backgroundColor?: string | number;
    color1?: string | number;
    color2?: string | number;
    colorMode?: string;
    birdSize?: number;
    wingSpan?: number;
    speedLimit?: number;
    separation?: number;
    alignment?: number;
    cohesion?: number;
    quantity?: number;
  }

  // CELLS effect
  export interface VantaCellsOptions extends VantaBaseOptions {
    color1?: string | number;
    color2?: string | number;
    size?: number;
    speed?: number;
    minWidth?: number;
    minHeight?: number;

  }

  // CLOUDS effect
  export interface VantaCloudsOptions extends VantaBaseOptions {
    backgroundColor?: string | number;
    skyColor?: string | number;
    cloudColor?: string | number;
    cloudShadowColor?: string | number;
    sunColor?: string | number;
    sunGlareColor?: string | number;
    sunlightColor?: string | number;
    speed?: number;
  }

  // CLOUDS2 effect
  export interface VantaClouds2Options extends VantaBaseOptions {
    backgroundColor?: string | number;
    skyColor?: string | number;
    cloudColor?: string | number;
    lightColor?: string | number;
    speed?: number;
    texturePath?: string;
  }

  // FOG effect
  export interface VantaFogOptions extends VantaBaseOptions {
    highlightColor?: string | number;
    midtoneColor?: string | number;
    lowlightColor?: string | number;
    baseColor?: string | number;
    blurFactor?: number;
    speed?: number;
    zoom?: number;
  }

  // GLOBE effect
  export interface VantaGlobeOptions extends VantaBaseOptions {
    color?: string | number;
    color2?: string | number;
    backgroundColor?: string | number;
    size?: number;
    speed?: number;
  }

  // HALO effect
  export interface VantaHaloOptions extends VantaBaseOptions {
    backgroundColor?: string | number;
    size?: number;
    amplitudeFactor?: number;
    xOffset?: number;
    yOffset?: number;
    baseColor?: string | number;
    amplitudeColor?: string | number;
    size?: number;
  }

  // NET effect
  export interface VantaNetOptions extends VantaBaseOptions {
    color?: string | number;
    backgroundColor?: string | number;
    points?: number;
    maxDistance?: number;
    spacing?: number;
    showDots?: boolean;
    backgroundAlpha?: number;
  }

  // RINGS effect
  export interface VantaRingsOptions extends VantaBaseOptions {
    backgroundColor?: string | number;
    color?: string | number;
  }

  // TOPOLOGY effect
  export interface VantaTopologyOptions extends VantaBaseOptions {
    color?: string | number;
    backgroundColor?: string | number;
  }

  // TRUNK effect
  export interface VantaTrunkOptions extends VantaBaseOptions {
    color?: string | number;
    backgroundColor?: string | number;
    spacing?: number;
    chaos?: number;
  }

  // WAVES effect
  export interface VantaWavesOptions extends VantaBaseOptions {
    color?: string | number;
    shininess?: number;
    waveHeight?: number;
    waveSpeed?: number;
    zoom?: number;
    backgroundColor?: string | number;
  }

  // DOTS effect
  export interface VantaDotsOptions extends VantaBaseOptions {
    color?: string | number;
    color2?: string | number;
    backgroundColor?: string | number;
    size?: number;
    spacing?: number;
    showLines?: boolean;
  }
}

// Individual effect module declarations - including both regular and minimized versions

// BIRDS
declare module 'vanta/dist/vanta.birds' {
  import { VantaBirdsOptions, VantaEffect } from 'vanta';
  export default function BIRDS(options: VantaBirdsOptions): VantaEffect;
}
declare module 'vanta/dist/vanta.birds.min' {
  import { VantaBirdsOptions, VantaEffect } from 'vanta';
  export default function BIRDS(options: VantaBirdsOptions): VantaEffect;
}

// CELLS
declare module 'vanta/dist/vanta.cells' {
  import { VantaCellsOptions, VantaEffect } from 'vanta';
  export default function CELLS(options: VantaCellsOptions): VantaEffect;
}
declare module 'vanta/dist/vanta.cells.min' {
  import { VantaCellsOptions, VantaEffect } from 'vanta';
  export default function CELLS(options: VantaCellsOptions): VantaEffect;
}

// CLOUDS
declare module 'vanta/dist/vanta.clouds' {
  import { VantaCloudsOptions, VantaEffect } from 'vanta';
  export default function CLOUDS(options: VantaCloudsOptions): VantaEffect;
}
declare module 'vanta/dist/vanta.clouds.min' {
  import { VantaCloudsOptions, VantaEffect } from 'vanta';
  export default function CLOUDS(options: VantaCloudsOptions): VantaEffect;
}

// CLOUDS2
declare module 'vanta/dist/vanta.clouds2' {
  import { VantaClouds2Options, VantaEffect } from 'vanta';
  export default function CLOUDS2(options: VantaClouds2Options): VantaEffect;
}
declare module 'vanta/dist/vanta.clouds2.min' {
  import { VantaClouds2Options, VantaEffect } from 'vanta';
  export default function CLOUDS2(options: VantaClouds2Options): VantaEffect;
}

// FOG
declare module 'vanta/dist/vanta.fog' {
  import { VantaFogOptions, VantaEffect } from 'vanta';
  export default function FOG(options: VantaFogOptions): VantaEffect;
}
declare module 'vanta/dist/vanta.fog.min' {
  import { VantaFogOptions, VantaEffect } from 'vanta';
  export default function FOG(options: VantaFogOptions): VantaEffect;
}

// GLOBE
declare module 'vanta/dist/vanta.globe' {
  import { VantaGlobeOptions, VantaEffect } from 'vanta';
  export default function GLOBE(options: VantaGlobeOptions): VantaEffect;
}
declare module 'vanta/dist/vanta.globe.min' {
  import { VantaGlobeOptions, VantaEffect } from 'vanta';
  export default function GLOBE(options: VantaGlobeOptions): VantaEffect;
}

// HALO
declare module 'vanta/dist/vanta.halo' {
  import { VantaHaloOptions, VantaEffect } from 'vanta';
  export default function HALO(options: VantaHaloOptions): VantaEffect;
}
declare module 'vanta/dist/vanta.halo.min' {
  import { VantaHaloOptions, VantaEffect } from 'vanta';
  export default function HALO(options: VantaHaloOptions): VantaEffect;
}

// NET
declare module 'vanta/dist/vanta.net' {
  import { VantaNetOptions, VantaEffect } from 'vanta';
  export default function NET(options: VantaNetOptions): VantaEffect;
}
declare module 'vanta/dist/vanta.net.min' {
  import { VantaNetOptions, VantaEffect } from 'vanta';
  export default function NET(options: VantaNetOptions): VantaEffect;
}

// RINGS
declare module 'vanta/dist/vanta.rings' {
  import { VantaRingsOptions, VantaEffect } from 'vanta';
  export default function RINGS(options: VantaRingsOptions): VantaEffect;
}
declare module 'vanta/dist/vanta.rings.min' {
  import { VantaRingsOptions, VantaEffect } from 'vanta';
  export default function RINGS(options: VantaRingsOptions): VantaEffect;
}

// TOPOLOGY
declare module 'vanta/dist/vanta.topology' {
  import { VantaTopologyOptions, VantaEffect } from 'vanta';
  export default function TOPOLOGY(options: VantaTopologyOptions): VantaEffect;
}
declare module 'vanta/dist/vanta.topology.min' {
  import { VantaTopologyOptions, VantaEffect } from 'vanta';
  export default function TOPOLOGY(options: VantaTopologyOptions): VantaEffect;
}

// TRUNK
declare module 'vanta/dist/vanta.trunk' {
  import { VantaTrunkOptions, VantaEffect } from 'vanta';
  export default function TRUNK(options: VantaTrunkOptions): VantaEffect;
}
declare module 'vanta/dist/vanta.trunk.min' {
  import { VantaTrunkOptions, VantaEffect } from 'vanta';
  export default function TRUNK(options: VantaTrunkOptions): VantaEffect;
}

// WAVES
declare module 'vanta/dist/vanta.waves' {
  import { VantaWavesOptions, VantaEffect } from 'vanta';
  export default function WAVES(options: VantaWavesOptions): VantaEffect;
}
declare module 'vanta/dist/vanta.waves.min' {
  import { VantaWavesOptions, VantaEffect } from 'vanta';
  export default function WAVES(options: VantaWavesOptions): VantaEffect;
}

// DOTS
declare module 'vanta/dist/vanta.dots' {
  import { VantaDotsOptions, VantaEffect } from 'vanta';
  export default function DOTS(options: VantaDotsOptions): VantaEffect;
}
declare module 'vanta/dist/vanta.dots.min' {
  import { VantaDotsOptions, VantaEffect } from 'vanta';
  export default function DOTS(options: VantaDotsOptions): VantaEffect;
}

// Support for the full bundle
declare module 'vanta/dist/vanta.min' {
  import { 
    VantaBaseOptions, 
    VantaBirdsOptions,
    VantaCellsOptions,
    VantaCloudsOptions,
    VantaClouds2Options,
    VantaDotsOptions,
    VantaFogOptions,
    VantaGlobeOptions,
    VantaHaloOptions,
    VantaNetOptions, 
    VantaRingsOptions,
    VantaTopologyOptions,
    VantaTrunkOptions,
    VantaWavesOptions,
    VantaEffect 
  } from 'vanta';

  export const BIRDS: (options: VantaBirdsOptions) => VantaEffect;
  export const CELLS: (options: VantaCellsOptions) => VantaEffect;
  export const CLOUDS: (options: VantaCloudsOptions) => VantaEffect;
  export const CLOUDS2: (options: VantaClouds2Options) => VantaEffect;
  export const DOTS: (options: VantaDotsOptions) => VantaEffect;
  export const FOG: (options: VantaFogOptions) => VantaEffect;
  export const GLOBE: (options: VantaGlobeOptions) => VantaEffect;
  export const HALO: (options: VantaHaloOptions) => VantaEffect;
  export const NET: (options: VantaNetOptions) => VantaEffect;
  export const RINGS: (options: VantaRingsOptions) => VantaEffect;
  export const TOPOLOGY: (options: VantaTopologyOptions) => VantaEffect;
  export const TRUNK: (options: VantaTrunkOptions) => VantaEffect;
  export const WAVES: (options: VantaWavesOptions) => VantaEffect;
}

// Support for the full bundle without .min
declare module 'vanta/dist/vanta' {
  import { 
    VantaBaseOptions, 
    VantaBirdsOptions,
    VantaCellsOptions,
    VantaCloudsOptions,
    VantaClouds2Options,
    VantaDotsOptions,
    VantaFogOptions,
    VantaGlobeOptions,
    VantaHaloOptions,
    VantaNetOptions, 
    VantaRingsOptions,
    VantaTopologyOptions,
    VantaTrunkOptions,
    VantaWavesOptions,
    VantaEffect 
  } from 'vanta';

  export const BIRDS: (options: VantaBirdsOptions) => VantaEffect;
  export const CELLS: (options: VantaCellsOptions) => VantaEffect;
  export const CLOUDS: (options: VantaCloudsOptions) => VantaEffect;
  export const CLOUDS2: (options: VantaClouds2Options) => VantaEffect;
  export const DOTS: (options: VantaDotsOptions) => VantaEffect;
  export const FOG: (options: VantaFogOptions) => VantaEffect;
  export const GLOBE: (options: VantaGlobeOptions) => VantaEffect;
  export const HALO: (options: VantaHaloOptions) => VantaEffect;
  export const NET: (options: VantaNetOptions) => VantaEffect;
  export const RINGS: (options: VantaRingsOptions) => VantaEffect;
  export const TOPOLOGY: (options: VantaTopologyOptions) => VantaEffect;
  export const TRUNK: (options: VantaTrunkOptions) => VantaEffect;
  export const WAVES: (options: VantaWavesOptions) => VantaEffect;
}

// Fallback declaration to handle any other potential paths
declare module 'vanta/dist/*' {
  import { VantaBaseOptions, VantaEffect } from 'vanta';
  export default function VantaEffect(options: VantaBaseOptions): VantaEffect;
}