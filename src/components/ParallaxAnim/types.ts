import { z } from 'zod';

export const CameraConfigSchema = z.object({
  initialX: z.number(),
  initialY: z.number(),
  initialZoom: z.number(),
  finalX: z.number(),
  finalY: z.number(),
  finalZoom: z.number(),
});

export const SVGElementDataSchema = z.object({
  id: z.string(),
  name: z.string(),
  svgString: z.string(),
  x: z.number(),
  y: z.number(),
  scale: z.number(),
  opacity: z.number(),
  width: z.number(),
  height: z.number(),
  initialRotation: z.number(),
  finalRotation: z.number(),
  transformOriginX: z.number(),
  transformOriginY: z.number(),
  rotationAnimationType: z.enum(['easing', 'spring']),
  zIndex: z.number(),
});
export type SVGElementData = z.infer<typeof SVGElementDataSchema>;
export const LayerDataSchema = z.object({
  id: z.string(),
  name: z.string(),
  parallaxFactor: z.object({
    x: z.number(),
    y: z.number(),
  }),
  zIndex: z.number(),
  elements: z.array(SVGElementDataSchema),
  isVisible: z.boolean(),
});
export type LayerData = z.infer<typeof LayerDataSchema>;
export const ParallaxConfigSchema = z.object({
  compositionName: z.string(),
  durationInFrames: z.number(),
  backgroundColor: z.string(),
  camera: CameraConfigSchema,
  layers: z.array(LayerDataSchema),
});

// Use the Zod schema type for ParallaxConfig
export type ParallaxConfig = z.infer<typeof ParallaxConfigSchema>;