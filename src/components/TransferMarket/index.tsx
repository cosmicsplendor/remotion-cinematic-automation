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
import { Chart, Datum, SafeChart, Frame, SeasonOdometer, quarters, sanitizeName } from "./helpers"
import { easeLinear } from "d3"
import { formatX, reverseFormatX } from "./helpers"
import { BarChartGenerator } from '../../../lib/d3/generators/BarChart';
import teamNameMap from "./assets/teamNameMap.json"
import colorsMap from "./assets/colorsMap.json"
import logosMap from "./assets/logosMap.json"
import data from "./assets/data.json"
import { AudioVisualizer } from '../AudioVisualizer';
import React from 'react'; // Import React for Fragment
import RotatingGear from './Gear';
import OdometerDisplay from './OdometerDisplay';
import { easingFns } from '../../../lib/d3/utils/math';
import EffectsManager from './EffectsManager';

const PLOT_ID = "PLOTX"
const CONT_ID = "CONTAINERX"
const DURATION = 1000; // Equivalent to 1 second at 60fps
const SF = data.map(d => (d.slowDown as number) ?? 1)
export const TRANSFER_LIFESPAN = SF.reduce((s, x) => x + s) * DURATION / 1000; // Restored original export

export const TransferMarket: React.FC = () => {
  const { fps, width, height } = useVideoConfig();
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);

  const [currentAmplitude, setCurrentAmplitude] = useState(0);
  const FRAMES_PER_UNIT_POINT = useMemo(() => {
    if (!fps || fps <= 0) return 0;
    return (fps * DURATION) / 1000;
  }, [fps]);
  const frame = useCurrentFrame() + FRAMES_PER_UNIT_POINT; // just to give a headstart

  const flattenedData = useMemo(() => {
    const result = [];
    const originalDataTyped = data as Frame[];
    for (const index in originalDataTyped) {
      const { data, ...rest } = originalDataTyped[index];
      result.push({ ...rest, data: data.slice(0, 15) });
    }
    return result;
  }, [data]);

  const seasonAudioMetadata = useMemo(() => {
    const metadata = [];
    let currentFrameCounter = 0;
    const originalDataTyped = data as Frame[];
    for (const seasonEntry of originalDataTyped) {
      const seasonNumber = new Date(seasonEntry.weekStart).getFullYear();
      if (!isNaN(seasonNumber) && seasonEntry.data && seasonEntry.data.length > 0) {
        metadata.push({
          season: seasonNumber,
          startFrame: currentFrameCounter,
        });
      }
      if (seasonEntry.data && seasonEntry.data.length > 0) {
        currentFrameCounter += seasonEntry.data.length * FRAMES_PER_UNIT_POINT;
      }
    }
    return metadata;
  }, [data, FRAMES_PER_UNIT_POINT]);

  const { currentDataIndex, progress } = useMemo(() => {
    if (flattenedData.length === 0) return { currentDataIndex: 0, progress: 0 };
    let frameStart = 0, currentDataIndex = 0, currentSF = 1
    for (const index in SF) {
      const sf = SF[index] as number;
      frameStart += sf * FRAMES_PER_UNIT_POINT
      if (frameStart > frame) {
        frameStart -= sf * FRAMES_PER_UNIT_POINT
        currentDataIndex = parseInt(index);
        currentSF = sf;
        break;
      }
    }
    const progress = (frame - frameStart) / (currentSF * FRAMES_PER_UNIT_POINT);
    return { currentDataIndex, progress };
  }, [frame, FRAMES_PER_UNIT_POINT, flattenedData.length]);

  const currentData = flattenedData[currentDataIndex];
  const quarter = Math.floor(new Date(flattenedData[currentDataIndex]?.weekStart).getMonth() / 3);
  const currentYear = currentData ? new Date(currentData.weekStart).getFullYear() : "2000";
  useEffect(() => {
    console.log(flattenedData[currentDataIndex]?.weekStart)
  }, [flattenedData[currentDataIndex]?.weekStart]);
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
        .bar({ gap: 24, minLength: 10 })
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
    const barChartRaw = BarChartGenerator<Datum>(dims)
      .accessors({
        x: d => d.marketCap,
        y: d => d.name,
        id: d => sanitizeName(d.name),
        // color: d => (colorsMap as any)[sanitizeName(d.name)] ?? "#000",
        color: d => "#000",
        name: d => (teamNameMap as any)[d.name] ?? d.name,
        logoSrc: d => {
          const sanitizedName = sanitizeName(d.name);
          return staticFile(`race-images/${sanitizedName}.png`);
        }
      });

    const barChart = modifier(barChartRaw);
    chartRef.current = barChart;
  }, [svgRef, containerRef, flattenedData, width, height]); 

  useEffect(() => {
    if (!chartRef.current || !currentData) {
      return;
    }
    const chart = chartRef.current;
    const { data } = currentData;
    const easingFn = easingFns[currentData.easing || "linear"] || easingFns.linear;
    const prevData = flattenedData[Math.max(0, currentDataIndex - 1)].data
    chart(prevData, data, easingFn(progress));
  }, [frame]);

  return (
    <AbsoluteFill
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
        background: "white"
      }}
      id={CONT_ID} // CONT_ID used here
      ref={containerRef}
    >
      <svg
        id={PLOT_ID} // PLOT_ID used here
        ref={svgRef}
      ></svg>
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
          <OdometerDisplay currentIndex={quarter} values={quarters} top="8px" right="190px" />
          <RotatingGear top="-64px" right="300px" t={frame * 1/fps}/>
          <SeasonOdometer value={currentYear ?? 0} amplitude={currentAmplitude} top="-12px" right="10px" /> {/* Pass 0 if season is null to avoid error */}
        </div>
      )}
      <EffectsManager svgRef={svgRef} frame={frame} progress={progress} data={currentData}/>
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