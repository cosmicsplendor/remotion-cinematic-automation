import teamNameMap from "./assets/teamNameMap.json"
import colorsMap from "./assets/colorsMap.json"
import logosMap from "./assets/logosMap.json"
import data from "./assets/data.json"

import { BarChart, BarChartGenerator } from "../../../lib/d3/generators/BarChart"
import { AnyFunction, Hash, Dims } from "../../../lib/d3/utils/types"
type StrHash = Hash<string>
type Datum = {
    club: string
    spent: number
}
type Frame = {
    season: number,
    window: string,
    frames: Datum[][]
}
export type Chart = BarChart<Datum>
export type SafeChart = {
  [K in keyof Required<Chart>]: Exclude<Required<Chart>[K], undefined> extends (...args: any[]) => any
    ? (...args: Parameters<Required<Chart>[K]>) => ChartWithAll
    : never
}
type ParamInters = {timestamp: AnyFunction, musicSrc: string}
type StartVizParam = {barChart: BarChart<Datum>} & ParamInters
type InitParam = { modifier: (chart: BarChart<Datum>) => BarChart<Datum>, dims: Dims } & ParamInters

const BILLION = 1000000000, MILLION = 1000000
export function safeCall<T, Args extends any[]>(fn: MaybeFn<T, Args>, ...args: Args): T | undefined {
  return typeof fn === 'function' ? (fn as any)(...args) : undefined
}
const startViz = async (params: StartVizParam) => {
    const { barChart, timestamp } = params
    const originalData = data as Frame[]
    
    const dataToUse = originalData.slice(0)
    barChart(dataToUse[0].frames[0].map(d => ({ ...d, points: 0 })), true)
    for (const index in dataToUse) {
        const { frames, season } = dataToUse[index]
        timestamp(season)
        for (const data of frames) {
            await barChart(data)
        }
    }
}
export const formatX = (num: number) => {
    if (num === 0) return "0"
    const divisor = num >= BILLION ? BILLION : MILLION
    const suffix = divisor === BILLION ? "B" : "M"
    return num === 0 ? "0" : `€${(num / divisor).toFixed(2)}${suffix}`
}
export const reverseFormatX = (str: string) => {
    const suffix = str.slice(-1)
    const num = Number(str.slice(1, -1))
    return num * (suffix === "B" ? BILLION: MILLION)
}
export const initPlot = ({ modifier, timestamp, dims, musicSrc }: InitParam) => {
    const barChart = BarChartGenerator<Datum>(dims)
        .accessors({
            x: d => d.spent,
            y: d => d.club,
            id: d => d.club,
            color: d => (<StrHash>colorsMap)[d.club],
            name: d => (<StrHash>teamNameMap)[d.club] ?? d.club,
            logoSrc: d => (<StrHash>logosMap)[d.club]
        })

    const onClick = () => {
        window.removeEventListener("click", onClick)
        startViz({ barChart: modifier(barChart), timestamp, musicSrc })
    }
    window.addEventListener("click", onClick)
}