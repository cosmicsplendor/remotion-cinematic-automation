import { Easing } from "remotion";

// Enhanced Ken Burns effect type
type KenBurnsEffect = {
  type: string;
  duration: number;  // in seconds
  easing: string;
  speed: number;     // normalized 0-1 value for effect intensity
};

// Parse ken burns effect string with new speed parameter
export function parseKenBurnsEffect(effectStr?: string): KenBurnsEffect {
  if (!effectStr || effectStr === "static") {
    return { type: "static", duration: 0, easing: "linear", speed: 0.5 };
  }
  
  const parts = effectStr.split(';');
  return {
    type: parts[0] || "static",
    duration: parts[1] ? parseFloat(parts[1].replace('s', '')) : 2,  // Convert "2s" to 2
    easing: parts[2] || "ease-out",
    speed: parts[3] ? parseFloat(parts[3]) : 0.5  // Default speed 0.5 (medium)
  };
}

// Map easing name to function
export function getEasingFunction(easingName: string) {
  switch (easingName.toLowerCase()) {
    case 'linear': return (t: number) => t;
    case 'ease': return Easing.bezier(0.25, 0.1, 0.25, 1);
    case 'ease-in': return Easing.in(Easing.ease);
    case 'ease-out': return Easing.out(Easing.ease);
    case 'ease-in-out': return Easing.inOut(Easing.ease);
    default: return Easing.out(Easing.ease); // Default to ease-out
  }
}

// Calculate transform values for effect with improved calculations to avoid dead space
export function getKenBurnsTransforms(
  effectType: string, 
  progress: number, 
  speed: number, 
  imageAspectRatio: number = 16/9, // Default to standard video aspect
  containerAspectRatio: number = 16/9 // Default to matching container
) {
  // Normalize speed between 0.2 (subtle) and 1.5 (dramatic)
  const normalizedSpeed = 0.2 + (speed * 1.3);
  
  // Constrain progress between 0 and 1
  const p = Math.max(0, Math.min(1, progress));
  
  // Calculate safe zoom boundaries based on aspect ratios to prevent dead space
  // const maxZoomOut = Math.max(1, containerAspectRatio / imageAspectRatio); // Not directly used in current cases, but good for future
  const maxPanX = (normalizedSpeed * 25) * (imageAspectRatio > containerAspectRatio ? imageAspectRatio / containerAspectRatio : 1);
  const maxPanY = (normalizedSpeed * 25) * (imageAspectRatio < containerAspectRatio ? containerAspectRatio / imageAspectRatio: 1);

  // Base scale to ensure image covers container, especially if aspect ratios differ
  let baseScale = 1;
  if (imageAspectRatio > containerAspectRatio) { // Image is wider than container
    baseScale = imageAspectRatio / containerAspectRatio;
  } else if (imageAspectRatio < containerAspectRatio) { // Image is taller than container
     baseScale = containerAspectRatio / imageAspectRatio;
  }
  // A general slight overscale to help with pan edges, adjusted by effect
  const panEffectBaseScale = baseScale * (1 + (normalizedSpeed * 0.05));


  switch(effectType) {
    case "static":
      return { scale: baseScale, x: 0, y: 0 };
    
    case "zoom-in":
      const zoomInScale = baseScale * (1 + (normalizedSpeed * p));
      return { scale: zoomInScale, x: 0, y: 0 };
    
    case "zoom-out":
      const initialZoom = baseScale * (1 + normalizedSpeed);
      const zoomOutScale = initialZoom - (baseScale * normalizedSpeed * p);
      return { scale: Math.max(baseScale, zoomOutScale), x: 0, y: 0 };
    
    case "pan-left":
      return { 
        scale: panEffectBaseScale,
        x: (maxPanX * (1-p) * (containerAspectRatio / imageAspectRatio)), 
        y: 0 
      };
    
    case "pan-right":
      return { 
        scale: panEffectBaseScale,
        x: -(maxPanX * (1-p) * (containerAspectRatio / imageAspectRatio)),
        y: 0 
      };
    
    case "pan-up":
      return { 
        scale: panEffectBaseScale,
        x: 0, 
        y: (maxPanY * (1-p) * (imageAspectRatio / containerAspectRatio))
      };
    
    case "pan-down":
      return { 
        scale: panEffectBaseScale,
        x: 0, 
        y: -(maxPanY * (1-p) * (imageAspectRatio / containerAspectRatio))
      };
    
    case "zoom-in-pan-left":
      const zipScale = baseScale * (1 + (normalizedSpeed * 0.5 * p));
      return { 
        scale: zipScale, 
        x: (maxPanX * (1-p) * (containerAspectRatio / imageAspectRatio)) / (1 + (normalizedSpeed * 0.5 * p)), 
        y: 0 
      };
    
    case "zoom-in-pan-right":
      const ziprScale = baseScale * (1 + (normalizedSpeed * 0.5 * p));
      return { 
        scale: ziprScale, 
        x: -(maxPanX * (1-p) * (containerAspectRatio / imageAspectRatio)) / (1 + (normalizedSpeed * 0.5 * p)),
        y: 0 
      };
    
    case "zoom-out-hold-left":
      const zoomOutHoldScale = baseScale * (1 + normalizedSpeed) - (baseScale * normalizedSpeed * p);
      return { 
        scale: Math.max(baseScale, zoomOutHoldScale), 
        x: -(maxPanX * 0.2 * (containerAspectRatio / imageAspectRatio)), 
        y: 0 
      };
    
    case "zoom-out-hold-right":
      const zoomOutHoldRightScale = baseScale * (1 + normalizedSpeed) - (baseScale * normalizedSpeed * p);
      return { 
        scale: Math.max(baseScale, zoomOutHoldRightScale), 
        x: (maxPanX * 0.2 * (containerAspectRatio / imageAspectRatio)), 
        y: 0 
      };
    
    default:
      return { scale: baseScale, x: 0, y: 0 };
  }
}

// Duration manager for your Timeline keyframes
export function calculateEffectProgress(
  frame: number,
  keyframeStartFrame: number,
  fps: number,
  durationInSeconds: number,
  easingName: string
): number {
  // Convert duration to frames
  const durationInFrames = Math.max(1, Math.round(durationInSeconds * fps));
  
  // Calculate raw progress (0 to 1)
  const rawProgress = Math.min(1, Math.max(0, (frame - keyframeStartFrame) / durationInFrames));
  
  // Apply easing
  const easingFn = getEasingFunction(easingName);
  return easingFn(rawProgress);
}
