import { BarChart } from "../../../lib/d3/generators/BarChart"
import { Hash } from "../../../lib/d3/utils/types"
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
const BILLION = 1000000000, MILLION = 1000000

export const formatX = (num: number | string) => {
    if (num === 0) return "0"
    const divisor = Number(num) >= BILLION ? BILLION : MILLION
    const suffix = divisor === BILLION ? "B" : "M"
    return num === 0 ? "0" : `€${(Number(num) / divisor).toFixed(2)}${suffix}`
}
export const reverseFormatX = (str: string) => {
    const suffix = str.slice(-1)
    const num = Number(str.slice(1, -1))
    return num * (suffix === "B" ? BILLION : MILLION)
}