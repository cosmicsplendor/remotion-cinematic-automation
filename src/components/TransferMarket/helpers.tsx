import { useEffect, useRef, useState } from "react"
import { BarChart } from "../../../lib/d3/generators/BarChart"
import { Hash } from "../../../lib/d3/utils/types"
import TMOdometerModule from 'tm-odometer'
// import "./odometer-themes/slot-machine.css";
import "./odometer-themes/slot-machine.css";

export type StrHash = Hash<string>
export type Datum = {
  club: string
  spent: number
}
export type Frame = {
  season: number,
  window: string,
  frames: Datum[][]
}
export type Chart = BarChart<Datum>
export type SafeChart = {
  [K in keyof Required<Chart>]: Exclude<Required<Chart>[K], undefined> extends (...args: any[]) => any
  ? (...args: Parameters<Required<Chart>[K]>) => SafeChart
  : never
}

const BILLION = 1_000_000_000
const MILLION = 1_000_000

export const formatX = (num: number | string) => {
  if (num === 0) return "0"
  const n = Number(num)

  const divisor = n >= BILLION ? BILLION : MILLION
  const suffix = divisor === BILLION ? "B" : "M"

  let decimals
  if (n >= BILLION) decimals = 3
  else if (n >= 100_000_000) decimals = 1
  else decimals = 2

  return `€${(n / divisor).toFixed(decimals)}${suffix}`
}

export const reverseFormatX = (str: string) => {
  const suffix = str.slice(-1)
  const num = Number(str.slice(1, -1))
  return num * (suffix === "B" ? BILLION : MILLION)
}

// Create a custom Season Odometer Component
export const SeasonOdometer = ({ value, amplitude }: { value: number, amplitude: number }) => {
  const odometerRef = useRef<HTMLDivElement>(null);
  const odometerInstanceRef = useRef<any>(null);
  const [smoothedAmp, setSmoothedAmp] = useState(amplitude)
  const smoothedAmpRef = useRef(amplitude)

  // Inertia / smoothing effect
  useEffect(() => {
    let frameId: number

    const smoothStep = () => {
      const alpha = 0.15// inertia factor (lower = smoother)
      const current = smoothedAmpRef.current
      const next = current + (amplitude - current) * alpha
      smoothedAmpRef.current = next
      setSmoothedAmp(next)
      frameId = requestAnimationFrame(smoothStep)
    }

    frameId = requestAnimationFrame(smoothStep)
    return () => cancelAnimationFrame(frameId)
  }, [amplitude])
  useEffect(() => {
    // Need to dynamically import TM-Odometer since it's a browser library
    const loadTMOdometer = async () => {
      if (typeof window !== 'undefined' && odometerRef.current) {
        try {
          // Dynamic import of TM-Odometer
          const TMOdometer = TMOdometerModule;

          // If we haven't created the odometer yet, create it
          if (!odometerInstanceRef.current && odometerRef.current) {
            odometerInstanceRef.current = new TMOdometer({
              el: odometerRef.current,
              value: value,
              animation: "slide",
              theme: 'slot-machine',
              digits: 0,
              format: '(ddd)',
              duration: 300
            });
          } else if (odometerInstanceRef.current) {
            // Update the value if odometer already exists
            odometerInstanceRef.current.update(value);
          }
        } catch (error) {
          console.error('Failed to load TM-Odometer:', error);
        }
      }
    };

    loadTMOdometer();

    // Cleanup function
    return () => {
      if (odometerInstanceRef.current && odometerInstanceRef.current.destroy) {
        odometerInstanceRef.current.destroy();
        odometerInstanceRef.current = null;
      }
    };
  }, [value]);

  return (
    <div
      ref={odometerRef}
      style={{
        fontSize: '48px',
        fontWeight: 500,
        // top: "55vh", right: "25vh",
        filter: "grayscale(1)",
        opacity: 0.9, color: "#222222",
        boxShadow: `0 14px 20px 5px rgba(50, 150, 250, ${smoothedAmp.toFixed(3)})`
      }}
    ></div>
  );
};