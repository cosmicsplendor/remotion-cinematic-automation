// <link rel="stylesheet" href="odometer-theme-car.css" />
// <script src="odometer.js"></script>

import { select } from "d3"
import { Dims } from "../../../utils/types"
import { Bounds } from "../../../utils/stackCalcs"
type Offsets = Record<"bottom" | "right", number>

type Timestamp = {
    (value: string | number): void
    offsets: (offsets: Offsets) => Timestamp,
    fontSize?: (fontSize: string) => Timestamp,
    bounds: () => Bounds
}
declare global {
    interface Window { odometerOptions: object }
}
const addScript = (src: string) => {
    const script = document.createElement("script")
    script.src = src
    document.head.appendChild(script)
}
const TimestampGenerator = (dims: Dims, theme = "train-station", val="1992", fontSize="4em") => {
    const tsContainer = select("body").append("div")
    tsContainer.append("div")
        .attr("class", "odometer").text(val)
        .attr("style", `font-size: ${fontSize}; letter-spacing: 0.125em; font-weight: bold;`)
    window.odometerOptions = {
        format: ''
    }
    const link = document.createElement("link")
    link.setAttribute("rel", "stylesheet")
    link.setAttribute("href", `/odometer-themes/odometer-theme-${theme}.css`)
    addScript("http://ajax.googleapis.com/ajax/libs/jquery/1.10.2/jquery.min.js")
    addScript("./odometer.js")
    document.head.appendChild(link)

    let offsets: Offsets
    const timestamp: Timestamp = (value = "0") => {
        tsContainer.attr("style", `left: ${dims.w - dims.mr - offsets.right}px; top: ${dims.h - dims.mb - offsets.bottom}px; position: absolute;`)
        const dom = document.querySelector(".odometer")
        if (!dom) return
        dom.textContent = (`${String(value).padStart(2, "0")}`)
    }
    timestamp.offsets = val => (offsets = val, timestamp)
    timestamp.bounds = () => tsContainer.node()?.getBoundingClientRect()
    return timestamp
}

export default TimestampGenerator