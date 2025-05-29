import { useEffect, useRef, useMemo, useLayoutEffect } from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  Audio,
  staticFile,
  Sequence,
} from 'remotion';
import { Chart, Datum, SafeChart, Frame, SeasonOdometer, quarters, sanitizeName } from "./helpers"
import { formatX, reverseFormatX } from "./helpers"
import { BarChartGenerator } from '../../../lib/d3/generators/BarChart';
import teamNameMap from "./assets/teamNameMap.json"
import data from "./assets/data.json"
import React from 'react'; // Import React for Fragment
import RotatingGear from './Gear';
import OdometerDisplay from './OdometerDisplay';
import { easingFns } from '../../../lib/d3/utils/math';
import EffectsManager from './EffectsManager';
import {periodsToExclude, music, offsetts} from './audioSettings';

const PLOT_ID = "PLOTX"
const CONT_ID = "CONTAINERX"
const DURATION = 1250; // Equivalent to 1 second at 60fps
const SF = data.map(d => (d.slowDown as number) ?? 1)
export const TRANSFER_LIFESPAN = SF.reduce((s, x) => x + s) * DURATION / 1000; // Restored original export

export const TransferMarket: React.FC = () => {
  const { fps, width, height } = useVideoConfig();
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
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
  const periodAudioMetaData = useMemo(() => {
    const metadata = [];
    let currentFrameCounter = 0;
    const originalDataTyped = data as Frame[];
    let lastQuarter: string = ""
    for (const periodEntry of originalDataTyped) {
      const year = new Date(periodEntry.weekStart).getFullYear();
      const quarter = Math.floor(new Date(periodEntry.weekStart).getMonth() / 3) + 1; // <-- FIXED
      const period = `q${quarter} ${year}`;
      if (lastQuarter === period) {
        currentFrameCounter += FRAMES_PER_UNIT_POINT * (periodEntry.slowDown || 1);
        continue; // Skip if the period is the same as the last one
      }
      metadata.push({
        period,
        startFrame: currentFrameCounter
      });
      lastQuarter = period;
      currentFrameCounter += FRAMES_PER_UNIT_POINT * (periodEntry.slowDown || 1);
    }
    return metadata;
  }, [data, FRAMES_PER_UNIT_POINT]);
  const currentData = flattenedData[currentDataIndex];
  const quarter = Math.floor(new Date(flattenedData[currentDataIndex]?.weekStart).getMonth() / 3);
  const currentYear = currentData ? new Date(currentData.weekStart).getFullYear() : "2000";

  useEffect(() => {
    if (containerRef.current === null || svgRef.current === null) {
      return;
    }
    const w = width * 0.95, h = height;
    const margins = { mt: 120, mr: 300, mb: 0, ml: 290 };
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
  const prevData = flattenedData[Math.max(0, currentDataIndex - 1)].data
  useEffect(() => {
    console.log(currentData.weekStart)
  }, [ currentData.weekStart ]);
  useLayoutEffect(() => {
    if (!chartRef.current || !currentData) {
      return;
    }
    const chart = chartRef.current;
    const { data } = currentData;
    const easingFn = easingFns[currentData.easing || "linear"] || easingFns.linear;
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
        width={width}
        height={height}
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
          <RotatingGear top="-64px" right="300px" />
          <SeasonOdometer value={currentYear ?? 0} amplitude={0} top="-12px" right="10px" /> {/* Pass 0 if season is null to avoid error */}
        </div>
      )}
      <EffectsManager svgRef={svgRef} frame={frame} progress={progress} data={currentData} prevData={prevData} allData={flattenedData} currentDataIndex={currentDataIndex}/>
      {/* Audio Sequences for Playback (All seasons with valid audio metadata) */}
      {periodAudioMetaData.map(({ period, startFrame }) => {
        const offset = offsetts[period] ?? 0
        const audioSrcPath = `/assets/transferAudio/${period}.mp3`;
        if (periodsToExclude.includes(period)) return null
        return (
          <Sequence key={`audio-${period}-playback`} from={startFrame + offset * fps}>
            <Audio src={staticFile(audioSrcPath)} />
          </Sequence>
        );
      })}
      {music.map(({ start, file }, index) => {
        const audioSrcPath = `/assets/transferAudio/${file}`;
        return (
          <Sequence key={`audio-${index}-playback`} from={start}>
            <Audio src={staticFile(audioSrcPath)} />
          </Sequence>
        );
      })}

    </AbsoluteFill>
  );
};