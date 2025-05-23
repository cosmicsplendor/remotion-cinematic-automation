import { useEffect, useRef, useMemo, useState } from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Audio,
  staticFile,
  Sequence,
} from 'remotion';
import { Chart, Datum, SafeChart, Frame, SeasonOdometer, quarters } from "./helpers"
import { easeLinear } from "d3"
import { formatX, reverseFormatX } from "./helpers"
import { BarChartGenerator } from '../../../lib/d3/generators/BarChart';
import teamNameMap from "./assets/teamNameMap.json"
import colorsMap from "./assets/colorsMap.json"
import logosMap from "./assets/logosMap.json"
import data from "./assets/data.json"

// Import the AudioVisualizer component
import { AudioVisualizer } from '../AudioVisualizer';
import React from 'react'; // Import React for Fragment
import Clock from './Clock';
import RotatingGear from './Gear';
import OdometerDisplay from './OdometerDisplay';

// --- Restored Original Constants and Export ---
const PLOT_ID = "PLOTX"
const CONT_ID = "CONTAINERX"
const DURATION = 1000; // Equivalent to 1 second at 60fps
export const TRANSFER_LIFESPAN = data.length * DURATION / 1000; // Restored original export

export const TransferMarket: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps, width, height } = useVideoConfig();
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);

  // State to hold the current amplitude value reported by the active visualizer
  const [currentAmplitude, setCurrentAmplitude] = useState(0);
  // Calculate frames per data point based on video config and DURATION constant
  const FRAMES_PER_DATA_POINT = useMemo(() => {
    // Avoid division by zero or negative fps if config is not ready
    if (!fps || fps <= 0) return 0;
    return (fps * DURATION) / 1000;
  }, [fps]); // DURATION is a constant, no need to list it as a dependency


  // Prepare flattened data array for frame-based animation
  const flattenedData = useMemo(() => {
    const result = [];
    const originalDataTyped = data as Frame[];

    for (const index in originalDataTyped) {
      const { weekStart, coins } = originalDataTyped[index];
      result.push({ weekStart, data: coins.slice(0, 15) });
    }
    return result;
  }, [data]);


  // Calculate metadata for audio sequences (start frame for each season)
  // This only includes entries with a valid season number and frames
  const seasonAudioMetadata = useMemo(() => {
    const metadata = [];
    let currentFrameCounter = 0;
    const originalDataTyped = data as Frame[];

    for (const seasonEntry of originalDataTyped) {
      const seasonNumber = new Date(seasonEntry.weekStart).getFullYear();

      // Only add metadata if season is a valid number AND there are frames for this entry
      if (!isNaN(seasonNumber) && seasonEntry.coins && seasonEntry.coins.length > 0) {
        metadata.push({
          season: seasonNumber,
          startFrame: currentFrameCounter,
        });
      }

      // ALWAYS increment the frame counter based on the number of coins in the entry,
      // regardless of whether the season was valid or if audio metadata was added for it.
      if (seasonEntry.coins && seasonEntry.coins.length > 0) {
        currentFrameCounter += seasonEntry.coins.length * FRAMES_PER_DATA_POINT;
      }
    }
    // console.log("Season Audio Metadata:", metadata);
    return metadata;
  }, [data, FRAMES_PER_DATA_POINT]);


  // Calculate which data point to show based on current frame
  const currentDataIndex = useMemo(() => {
    if (flattenedData.length === 0) return 0;
    return Math.min(
      Math.floor(frame / FRAMES_PER_DATA_POINT) + 1,
      flattenedData.length - 1
    );
  }, [frame, FRAMES_PER_DATA_POINT, flattenedData.length]);


  // Get current data to display
  const currentData = flattenedData[currentDataIndex];
  const quarter = Math.floor(new Date(flattenedData[currentDataIndex]?.weekStart).getMonth() / 3);
  // Get current season as number (will be null if data was invalid)
  const currentYear = currentData ? new Date(currentData.weekStart).getFullYear() : "2000";

  // Find the metadata for the *current* season
  const currentYearMetadata = useMemo(() => {
    if (currentYear === null) return null; // No valid season to find metadata for
    return seasonAudioMetadata.find(meta => meta.season === currentYear) || null;
  }, [currentYear, seasonAudioMetadata]);



  useEffect(() => {
    if (containerRef.current === null || svgRef.current === null) {
      return;
    }

    const w = width * 0.95, h = height;
    const margins = { mt: 120, mr: 300, mb: 40, ml: 290 };
    const dims = Object.freeze({ w, h, ...margins });
    const modifier = (chart: Chart) => {
      const safeChart = chart as SafeChart;
      safeChart
        .bar({ gap: 18, minLength: 10 })
        .barCount({ dir: 1, active: 10, max: 20 })
        .label({ fill: "#707070", rightOffset: 200, size: 24 })
        .position({ fill: "#666", size: 32, xOffset: -260 })
        .points({ size: 20, xOffset: 150, fill: "#555" })
        .logoXOffset(50)
        .xAxis({
          size: 18, offset: -20,
          format: formatX,
          reverseFormat: reverseFormatX
        })
        .dom({ svg: `#${PLOT_ID}`, container: `#${CONT_ID}` }); // PLOT_ID and CONT_ID used here

      return safeChart as Chart;
    };
    const sanitizeName = (name: string) => name.replace(/[^a-zA-Z0-9\-_]/g, '_').toLowerCase()
    const barChartRaw = BarChartGenerator<Datum>(dims)
      .accessors({
        x: d => d.marketCap,
        y: d => d.name,
        id: d => d.name,
        // color: d => (colorsMap as any)[sanitizeName(d.name)] ?? "#000",
        color: d => "#000",
        name: d => (teamNameMap as any)[d.name] ?? d.name,
        logoSrc: d => {
          const sanitizedName = sanitizeName(d.name);
          return staticFile(`race-images/${sanitizedName}.png`);
        }
      });

    const barChart = modifier(barChartRaw);

    // Initialize with first frame data if available
    if (flattenedData.length > 0) {
      barChart(flattenedData[0].data, flattenedData[1].data, 0.5)
    } else {
      console.warn("flattenedData is empty, chart not initialized with data.");
    }

    // Store the chart reference for updates
    chartRef.current = barChart;

  }, [svgRef, containerRef, flattenedData, width, height]); // DURATION removed as dependency

  // Update chart when data index changes
  useEffect(() => {
    if (!chartRef.current || !currentData) {
      return;
    }
    const chart = chartRef.current;
    const { data } = currentData;
    chart(flattenedData[currentDataIndex - 1].data, data, 0.1);
  }, [currentData]);



  return (
    <AbsoluteFill
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
        background: "white"
        // Use currentAmplitude for styling if needed
        // background: `rgba(255, 255, 255, ${1 - currentAmplitude * 0.2})`
      }}
      id={CONT_ID} // CONT_ID used here
      ref={containerRef}
    >
      <svg
        id={PLOT_ID} // PLOT_ID used here
        ref={svgRef}
      ></svg>
      {/* Season Display */}
      {currentData && (currentYear !== null) && ( // Only show if data and a valid season number exist
        <div style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          display: 'flex',
          alignItems: 'center',
          padding: '20px'
        }}>
          <span style={{
            fontSize: '24px',
            marginRight: '10px',
            fontWeight: 'bold',
            color: '#333'
          }}>
          </span>
          {/* Ensure SeasonOdometer handles null if currentYear is null */}
          <OdometerDisplay currentIndex={quarter} values={quarters} top="8px" right="190px" />
          <RotatingGear top="-64px" right="300px" />
          <SeasonOdometer value={currentYear ?? 0} amplitude={currentAmplitude} top="-12px" right="10px" /> {/* Pass 0 if season is null to avoid error */}
        </div>
      )}

      {/* Audio Sequences for Playback (All seasons with valid audio metadata) */}
      {/* {seasonAudioMetadata.map(({ season, startFrame }) => {
        const audioSrcPath = `/assets/transferAudio/${season}.wav`;
        return (
          <Sequence key={`audio-${season}-playback`} from={startFrame}>
            <Audio src={staticFile(audioSrcPath)} />
          </Sequence>
        );
      })} */}

      {/* Single AudioVisualizer for the CURRENT season only */}
      {/* {currentYearMetadata && (
        <AudioVisualizer
          audioSrc={`/assets/transferAudio/${currentYearMetadata.season}.wav`} // Pass relative path
          audioStartFrame={currentYearMetadata.startFrame} // Pass the absolute start frame
          onAmplitudeChange={setCurrentAmplitude} // Update the state
        />
      )} */}
      {/* <Clock x={900} y={400} lifespan={TRANSFER_LIFESPAN} cycleDuration={DURATION/1000}/> */}
    </AbsoluteFill>
  );
};