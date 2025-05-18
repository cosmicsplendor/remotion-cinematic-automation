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