import { useEffect, useRef, useMemo } from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Audio, // Import Audio
  staticFile, // Import staticFile
  Sequence, // Import Sequence
} from 'remotion';
import { Chart, Datum, SafeChart, Frame, SeasonOdometer } from "./helpers"
import { easeLinear } from "d3"
import { formatX, reverseFormatX } from "./helpers"
import { BarChartGenerator } from '../../../lib/d3/generators/BarChart';
import teamNameMap from "./assets/teamNameMap.json"
import colorsMap from "./assets/colorsMap.json"
import logosMap from "./assets/logosMap.json"
import data from "./assets/data.json"
import "tm-odometer/themes/odometer-theme-plaza.css";

const SVG_ID = "SVGX"
const CONT_ID = "CONTAINERX"
const DURATION = 1500; // Equivalent to 1 second at 60fps
export const TRANSFER_LIFESPAN = data.length * DURATION / 150 // This seems off, should be based on flattened data length? Let's recalculate total frames

// Calculate total frames based on the number of data points and frames per point
const originalData = data as Frame[];
const totalDataPoints = originalData.reduce((sum, seasonEntry) => sum + seasonEntry.frames.length, 0);
// We'll calculate the total duration in frames dynamically based on this
// const TOTAL_FRAMES_DYNAMIC = totalDataPoints * (fps * DURATION / 1000); // Cannot use fps here as it's not available at top level

// Let's calculate FRAMES_PER_DATA_POINT inside the component using fps
// And then calculate total frames needed.


export const TransferMarket: React.FC = () => { // Added React.FC type
  const frame = useCurrentFrame();
  const { durationInFrames, fps, width, height } = useVideoConfig();
  const svgRef = useRef<SVGSVGElement>(null); // Added type
  const containerRef = useRef<HTMLDivElement>(null); // Added type
  const chartRef = useRef<any>(null);

  // Calculate frames per data point based on video config
  const FRAMES_PER_DATA_POINT = useMemo(() => fps * DURATION / 1000, [fps, DURATION]);

  // Prepare flattened data array for frame-based animation
  const flattenedData = useMemo(() => {
    const result = [];
    const originalDataTyped = data as Frame[];

    for (const index in originalDataTyped) {
      const { frames, season } = originalDataTyped[index];
      const seasonNumber = parseInt(season as any, 10);
      if (isNaN(seasonNumber)) {
          console.warn(`Skipping entry with invalid season: ${season}`, originalDataTyped[index]);
          continue; // Skip if season is not a valid number
      }

      for (const dataFrame of frames) {
        result.push({ data: dataFrame, season: seasonNumber });
      }
    }
    return result;
  }, [data]); // Depend on data itself

  // Calculate metadata for audio sequences (start frame for each season)
  const seasonAudioMetadata = useMemo(() => {
    const metadata = [];
    let currentFrameCounter = 0;
    const originalDataTyped = data as Frame[];

    for (const seasonEntry of originalDataTyped) {
      const seasonNumber = parseInt(seasonEntry.season as any, 10);
       if (isNaN(seasonNumber)) {
          console.warn(`Skipping audio metadata for invalid season: ${seasonEntry.season}`);
          // Still increment frame counter based on the frames *in this invalid entry*
          // so subsequent valid entries start at the correct time.
          currentFrameCounter += seasonEntry.frames.length * FRAMES_PER_DATA_POINT;
          continue;
       }

      if (seasonEntry.frames.length > 0) {
          // This is the start frame for the current season
          metadata.push({
              season: seasonNumber,
              startFrame: currentFrameCounter,
          });

          // Increment the frame counter by the duration of this season's data points
          currentFrameCounter += seasonEntry.frames.length * FRAMES_PER_DATA_POINT;
      }
      // If seasonEntry.frames is empty, currentFrameCounter doesn't change,
      // which correctly means the next season starts immediately after the previous one ended.
    }
     console.log("Season Audio Metadata:", metadata); // Log the calculated metadata
    return metadata;
  }, [data, FRAMES_PER_DATA_POINT]); // Depend on data and FRAMES_PER_DATA_POINT

  // Calculate which data point to show based on current frame
  const currentDataIndex = Math.min(
    Math.floor(frame / FRAMES_PER_DATA_POINT),
    flattenedData.length - 1
  );

  // Get current data to display
  const currentData = flattenedData[currentDataIndex];

  // Get current season as number
  const currentSeason = currentData ? currentData.season : 0;


  // Initial chart setup (runs once on mount)
  useEffect(() => {
    if (containerRef.current === null || svgRef.current === null) {
      return;
    }

    const w = width * 0.9, h = height;
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

    // Initialize with first frame data if available
    if (flattenedData.length > 0) {
      barChart(flattenedData[0].data.map(d => ({ ...d, points: 0 })), true);
    } else {
        console.warn("flattenedData is empty, chart not initialized with data.");
    }

    // Store the chart reference for updates
    chartRef.current = barChart;

  }, [svgRef, containerRef, flattenedData, width, height, DURATION]); // Added dependencies

  // Update chart when data index changes
  useEffect(() => {
    if (!chartRef.current || !currentData) {
        // console.log("Skipping chart update: chartRef or currentData missing");
        return;
    }

    const chart = chartRef.current;
    const { data } = currentData;

    // Update the chart with the data for the current frame
    // console.log(`Updating chart for frame ${frame}, data index ${currentDataIndex}, season ${currentSeason}`);
    chart(data);

  }, [currentData]); // Depend only on currentData


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

      {/* Season Display */}
      {currentData && (
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
            Season:
          </span>
          <SeasonOdometer value={currentSeason} />
        </div>
      )}

      {/* Audio Sequences for Each Season */}
      {seasonAudioMetadata.map(({ season, startFrame }) => (
          // Use a unique key for each Sequence
          <Sequence key={`audio-${season}`} from={startFrame}>
              {/* Audio plays automatically when this Sequence becomes active */}
              <Audio src={staticFile(`/assets/transferAudio/${season}.wav`)} />
          </Sequence>
      ))}

    </AbsoluteFill>
  );
};