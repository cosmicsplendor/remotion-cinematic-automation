import { select } from "d3"
import { Dims } from "../../../utils/types"
type Offsets = Record<"bottom" | "right", number>

type Timestamp = {
    (value: string | number): void
    offsets?: (offsets: Offsets) => Timestamp,
    background?: (background: string) => Timestamp,
    color?: (color: string) => Timestamp,
    fontSize?: (fontSize: string) => Timestamp,
    border?: (border: string) => Timestamp,
}
const TimestampGenerator =  (dims: Dims, text="match day") => {
    const tsContainer = select("body").append("div")
    
    let offsets: Offsets, color: string = "wheat", background: string = "#444", fontSize: string, border = "#333"
    const timestamp: Timestamp = (value = "0") => {
        tsContainer.attr("style", `left: ${dims.w - dims.mr - offsets.right}px; top: ${dims.h - dims.mb - offsets.bottom}px; display: flex; flex-direction: column; align-items: center; justify-content: center; font-family: helvetica; background: ${background}; border: 0.25em solid ${border}; color: ${color}; padding: 1.25em 1em; border-radius: 2px; border-top-left-radius: 1.25em; border-top-right-radius: 1.25em; font-size: ${fontSize}; position: absolute;`)
        tsContainer.selectAll(".label")
            .data([null])
            .join("div")
            .attr("class", "label")
            .attr("style", "font-size: 0.6em; font-weight: bold; text-transform: uppercase; margin-bottom: 0.5em;")
            .text(text)
        tsContainer.selectAll(".value")
            .data([null])
            .join("div")
            .attr("class", "value")
            .attr("style", "font-size: 2em; letter-spacing: 0.125em; font-weight: bold;")
            .text(`${String(value).padStart(2, "0")}`)
    }
    timestamp.fontSize = val => (fontSize = val, timestamp)
    timestamp.offsets = val => (offsets = val, timestamp)
    timestamp.color = val => (color = val, timestamp)
    timestamp.background = val => (background = val, timestamp)
    timestamp.border = val => (border = val, timestamp)
    return timestamp
}

export default TimestampGenerator