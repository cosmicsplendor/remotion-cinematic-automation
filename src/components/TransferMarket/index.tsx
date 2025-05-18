import { useEffect } from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
} from 'remotion';
import { Chart, initPlot, SafeChart } from "./helpers"
import { easeLinear, reverse } from "d3"
import { formatX, reverseFormatX } from "./helpers"

export const TransferMarket = () => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();
  useEffect(() => {
    const w = window.innerWidth, h = window.innerHeight
    const margins = { mt: 140, mr: 580, mb: 75, ml: 350 }
    const dims = Object.freeze({ w, h, ...margins })
    // const timestamp = timestampGenerator(dims, "train-station", "1992")
    //   .offsets({ bottom: h * 0.35, right: 0 })
    const modifier = (chart: Chart) => {
      const safeChart = chart as SafeChart
      safeChart
        .animation({ easingFn: easeLinear, duration: 1000, offset: 0 })!
        .bar({ gap: 22, minLength: 10 })!
        .barCount({ dir: 1, active: 10, max: 20 })!
        .label({ fill: "#707070", rightOffset: 30, size: 24 })!
        .position({ fill: "#666", size: 18, xOffset: -250 })!
        .points({ size: 20, xOffset: 150, fill: "#555" })!
        .logoXOffset(50)!
        .xAxis({
          size: 18, offset: -20,
          format: formatX,
          reverseFormat: reverseFormatX
        })
        return safeChart as Chart
    }
    initPlot({ dims, modifier, timestamp: () => null })
    // timestamp(2008)
  })
  const opacity = interpolate(
    frame,
    [0, 30, durationInFrames - 30, durationInFrames],
    [0, 1, 1, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );
  return (
    <AbsoluteFill
      style={{
        backgroundColor: 'black',
        opacity,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >

    </AbsoluteFill>
  )
};