import { useEffect, useRef, useMemo } from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
} from 'remotion';
import { Chart, Datum, StrHash, initPlot, SafeChart, Frame } from "./helpers"
import { easeLinear } from "d3"
import { formatX, reverseFormatX } from "./helpers"
import { BarChartGenerator } from '../../../lib/d3/generators/BarChart';
import teamNameMap from "./assets/teamNameMap.json"
import colorsMap from "./assets/colorsMap.json"
import logosMap from "./assets/logosMap.json"
import data from "./assets/data.json"

const SVG_ID = "SVGX"
const CONT_ID = "CONTAINERX"
const DURATION = 1500; // Equivalent to 1 second at 60fps
export const TRANSFER_LIFESPAN = data.length * DURATION / 150
export const TransferMarket = () => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps, width, height } = useVideoConfig();
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const chartRef = useRef<any>(null);
  const FRAMES_PER_DATA_POINT = fps * DURATION / 1000
  // Prepare flattened data array for frame-based animation
  const flattenedData = useMemo(() => {
    const result = [];
    const originalData = data as Frame[];
    
    for (const index in originalData) {
      const { frames, season } = originalData[index];
      for (const dataFrame of frames) {
        result.push({ data: dataFrame, season });
      }
    }
    return result;
  }, []);
  
  // Calculate which data point to show based on current frame
  const currentDataIndex = Math.min(
    Math.floor(frame / FRAMES_PER_DATA_POINT),
    flattenedData.length - 1
  );
  
  // Get current data to display
  const currentData = flattenedData[currentDataIndex];
  
  // Initial chart setup
  useEffect(() => {
    if (containerRef.current === null || svgRef.current === null) {
      return;
    }
    
    const w = width * 0.7, h = height;
    const margins = { mt: 140, mr: 250, mb: 75, ml: 250 };
    const dims = Object.freeze({ w, h, ...margins });
    
    const modifier = (chart: Chart) => {
      const safeChart = chart as SafeChart;
      safeChart
        .animation({ easingFn: easeLinear, duration: DURATION, offset: 0 })
        .bar({ gap: 22, minLength: 10 })
        .barCount({ dir: 1, active: 10, max: 20 })
        .label({ fill: "#707070", rightOffset: 200, size: 24 })
        .position({ fill: "#666", size: 32, xOffset: -250 })
        .points({ size: 20, xOffset: 150, fill: "#555" })
        .logoXOffset(50)
        .xAxis({
          size: 18, offset: -20,
          format: formatX,
          reverseFormat: reverseFormatX
        })
        .dom({ svg: `#${SVG_ID}`, container: `#${CONT_ID}` });
      
      return safeChart as Chart;
    };
    
    const barChartRaw = BarChartGenerator<Datum>(dims)
      .accessors({
        x: d => d.spent,
        y: d => d.club,
        id: d => d.club,
        color: d => (colorsMap as any)[d.club],
        name: d => (teamNameMap as any)[d.club] ?? d.club,
        logoSrc: d => (logosMap as any)[d.club]
      });
    
    const barChart = modifier(barChartRaw);
    
    // Initialize with first frame data
    if (flattenedData.length > 0) {
      barChart(flattenedData[0].data.map(d => ({ ...d, points: 0 })), true);
    }
    
    // Store the chart reference for updates
    chartRef.current = barChart;
    
  }, [svgRef, containerRef, flattenedData]);
  
  // Update chart when frame changes
  useEffect(() => {
    if (!chartRef.current || !currentData) return;
    
    const chart = chartRef.current;
    const { data } = currentData;
    
    chart(data);
    
  }, [currentDataIndex, currentData]);
  
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
        opacity,
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
        background: "white"
      }}
      id={CONT_ID}
      ref={containerRef}
    >
      <svg id={SVG_ID} ref={svgRef}></svg>
      {/* Optional season display */}
      {currentData && (
        <div style={{ 
          position: 'absolute', 
          top: '10px', 
          right: '10px', 
          fontSize: '24px',
          fontWeight: 'bold'
        }}>
          Season: {currentData.season}
        </div>
      )}
    </AbsoluteFill>
  );
};