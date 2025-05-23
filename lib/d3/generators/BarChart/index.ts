import { Dims } from "../../utils/types"
import { scaleLinear, select, scaleBand, max, Selection, BaseType, axisTop, axisLeft, interpolate, scalePow, } from "d3"

type Hash = Record<string, any>

type BarCount = Record<"max" | "active", number> & Record<"dir", 1 | -1>
type Bar = Record<"gap" | "minLength", number>
type Label = {
    fill: string,
    size: number,
    rightOffset?: number,
    topOffset?: number,
    rotation?: number,
    textAnchor?: "start" | "end"
}
type Points = Record<"size" | "xOffset", number> & Record<"fill", string> & { rotation?: number }
type Position = Record<"size" | "xOffset", number> & Record<"fill", string>
type XAxis = Record<"size" | "offset", number> & { format?: (val: string | number) => string, reverseFormat?: (val: string) => number }
type Accessors<Datum> = {
    x: (d: Datum) => number,
    y: (d: Datum) => string,
    id: (d: Datum) => string | number,
    color: (d: Datum) => string,
    name: (d: Datum) => string,
    logoSrc: (d: Datum) => string
}

type DOM = Record<"container" | "svg", string>

export type RemotionBarChart<Datum> = {
    (prevData: Datum[], newData: Datum[], progress: number): void
    barCount?: (val: BarCount) => RemotionBarChart<Datum>,
    bar?: (val: Bar) => RemotionBarChart<Datum>,
    label?: (val: Label) => RemotionBarChart<Datum>,
    points?: (val: Points) => RemotionBarChart<Datum>,
    accessors: (val: Accessors<Datum>) => RemotionBarChart<Datum>,
    logoXOffset?: (val: number) => RemotionBarChart<Datum>,
    position?: (val: Position) => RemotionBarChart<Datum>,
    xAxis?: (val: XAxis) => RemotionBarChart<Datum>,
    horizontal?: (val: boolean) => RemotionBarChart<Datum>,
    background?: (val: string) => RemotionBarChart<Datum>,
    dom?: ({ container, svg }: DOM) => RemotionBarChart<Datum>
}

const applyAttribs = <T extends { attr: (attrib: string, val: any) => T }>(sel: T, attribs: Hash) => {
    return Object
        .entries(attribs)
        .reduce((sel, entry: [string, any]) => {
            const [attrib, val] = entry
            return sel.attr(attrib, val)
        }, sel)
}

// Helper function to interpolate between two data points
const interpolateDataPoint = <Datum>(
    prevItem: Datum | undefined,
    newItem: Datum,
    progress: number,
    accessors: Accessors<Datum>
): Datum & { _interpolatedX: number } => {
    const prevX = prevItem ? accessors.x(prevItem) : 0
    const newX = accessors.x(newItem)
    const interpolatedX = prevX + (newX - prevX) * progress
    
    return {
        ...newItem,
        _interpolatedX: interpolatedX
    }
}

// Helper function to create interpolated dataset
const createInterpolatedData = <Datum>(
    prevData: Datum[],
    newData: Datum[],
    progress: number,
    accessors: Accessors<Datum>,
    barCount: BarCount
): (Datum & { _interpolatedX: number, _opacity: number })[] => {
    const sliceArgs = barCount.dir === 1 ? [0, barCount.active] : [-barCount.active]
    const prevSliced = prevData.slice(...sliceArgs)
    const newSliced = newData.slice(...sliceArgs)
    
    // Create a map of previous data by ID for easy lookup
    const prevMap = new Map(prevSliced.map(d => [accessors.id(d), d]))
    
    // Create interpolated data array
    const interpolatedData = newSliced.map(newItem => {
        const id = accessors.id(newItem)
        const prevItem = prevMap.get(id)
        const interpolated = interpolateDataPoint(prevItem, newItem, progress, accessors)
        
        // Calculate opacity for fade in/out effects
        const opacity = prevItem ? 1 : progress // Fade in new items
        
        return {
            ...interpolated,
            _opacity: opacity
        }
    })
    
    // Add exiting items with fade out effect
    prevSliced.forEach(prevItem => {
        const id = accessors.id(prevItem)
        const stillExists = newSliced.some(newItem => accessors.id(newItem) === id)
        
        if (!stillExists) {
            const interpolated = interpolateDataPoint(prevItem, prevItem, progress, accessors)
            interpolatedData.push({
                ...interpolated,
                _opacity: 1 - progress // Fade out
            })
        }
    })
    
    return interpolatedData
}

function BarChartGenerator<Datum extends object>(dims: Dims) {
    type Data = Datum[]
    type InterpolatedDatum = Datum & { _interpolatedX: number, _opacity: number }

    let barCount: BarCount, bar: Bar, label: Label, points: Points, xAxis: XAxis = { offset: -10, size: 18 }
    let accessors: Accessors<Datum>, logoXOffset: number, position: Position, horizontal = false, background = "whitesmoke", dom: DOM

    const barGraph: RemotionBarChart<Datum> = (prevData: Data, newData: Data, progress: number) => {
        const svg = select(dom.svg)
            .attr("width", dims.w)
            .attr("height", dims.h)
            
        const interpolatedData = createInterpolatedData(prevData, newData, progress, accessors, barCount)
        const BAR_THICKNESS = Math.round((horizontal ? dims.w - dims.ml - dims.mt : dims.h - dims.mt - dims.mb) / barCount.active) - bar.gap
        
        // Use interpolated x values for scaling
        const maxPoints = max(interpolatedData, d => d._interpolatedX)
        
        const pointsScale = scalePow().exponent(0.33)
            .domain([0, Math.max(maxPoints as number, 20)])
            .range(horizontal ? [dims.h - dims.mb, dims.mt] : [dims.ml, dims.w - dims.mr])
            .nice()
            
        // Use newData for consistent positioning scale, not interpolated data
        const sliceArgs = barCount.dir === 1 ? [0, barCount.active] : [-barCount.active]
        const newDataSliced = newData.slice(...sliceArgs)
        const teamNameScale = scaleBand()
            .domain(newDataSliced.map(accessors.y))
            .range(horizontal ? [dims.ml, dims.w - dims.mr] : [dims.mt, dims.h - dims.mb])
            
        const pointsAxisGen = horizontal ? axisLeft(pointsScale) : axisTop(pointsScale)
        const ptsRange = pointsScale.range()
        const ptsRangeDir = Math.sign(ptsRange[1] - ptsRange[0])

        const barLenAccessor = (d: InterpolatedDatum) => {
            return bar.minLength + (pointsScale(d._interpolatedX) - ptsRange[0]) * ptsRangeDir
        }
        const barTopAccessor = (d: InterpolatedDatum) => ptsRange[0] + ptsRangeDir * barLenAccessor(d)
        const barBaseAccessor = () => ptsRange[0]

        // Render bars
        svg.selectAll("rect")
            .data<InterpolatedDatum>(interpolatedData, d => accessors.id(d) as string)
            .join(
                enter => {
                    const sel = enter.append("rect")
                    return sel
                },
                update => update,
                exit => exit.remove()
            )
            .attr("fill", d => accessors.color(d))
            .attr("opacity", d => d._opacity)
            .call(sel => {
                if (horizontal) {
                    return sel
                        .attr("x", d => teamNameScale(accessors.y(d)) || 0)
                        .attr("y", d => {
                            const height = barLenAccessor(d)
                            return dims.h - dims.mb - height
                        })
                        .attr("width", BAR_THICKNESS)
                        .attr("height", barLenAccessor)
                        .attr("rx", 2)
                        .attr("ry", 4)
                } else {
                    return sel
                        .attr("x", barBaseAccessor())
                        .attr("y", d => teamNameScale(accessors.y(d)) || 0)
                        .attr("width", barLenAccessor)
                        .attr("height", BAR_THICKNESS)
                        .attr("rx", 2)
                        .attr("ry", 4)
                }
            })

        // Render images/logos
        svg.selectAll("image")
            .data<InterpolatedDatum>(interpolatedData, d => accessors.id(d) as string)
            .join(
                enter => enter.append("image"),
                update => update,
                exit => exit.remove()
            )
            .attr("href", d => accessors.logoSrc(d))
            .attr("height", BAR_THICKNESS)
            .attr("width", BAR_THICKNESS)
            .attr("preserveAspectRatio", "xMidYMid meet")
            .attr("opacity", d => d._opacity)
            .call(sel => {
                if (horizontal) {
                    return sel
                        .attr("x", d => teamNameScale(accessors.y(d)) || 0)
                        .attr("y", d => barTopAccessor(d) + ptsRangeDir * logoXOffset)
                } else {
                    return sel
                        .attr("x", d => barTopAccessor(d) + ptsRangeDir * logoXOffset)
                        .attr("y", d => teamNameScale(accessors.y(d)) || 0)
                }
            })

        // Render points text
        svg.selectAll(".total-points")
            .data<InterpolatedDatum>(interpolatedData, d => accessors.id(d) as string)
            .join(
                enter => enter.append("text").attr("class", "total-points"),
                update => update,
                exit => exit.remove()
            )
            .attr("font-size", points.size)
            .attr("font-family", "helvetica")
            .attr("fill", points.fill)
            .attr("style", "letter-spacing: 2px;")
            .attr("alignment-baseline", "central")
            .attr("opacity", d => d._opacity)
            .text(d => xAxis.format ? xAxis.format(d._interpolatedX) : d._interpolatedX.toString())
            .attr("transform", d => {
                const alongPtsAxis = pointsScale(d._interpolatedX) + ptsRangeDir * points.xOffset
                const alongLabelAxis = (teamNameScale(accessors.y(d)) || 0) + BAR_THICKNESS * 0.5
                if (horizontal) return `translate(${alongLabelAxis}, ${alongPtsAxis}), rotate(-${points.rotation})`
                return `translate(${alongPtsAxis}, ${alongLabelAxis})`
            })

        // Render labels
        svg.selectAll(".label-axis")
            .data<InterpolatedDatum>(interpolatedData, d => accessors.id(d) as string)
            .join(
                enter => enter.append("text").attr("class", "label-axis"),
                update => update,
                exit => exit.remove()
            )
            .text(d => accessors.name(d))
            .attr("font-size", label.size)
            .attr("fill", label.fill)
            .attr("font-family", "Helvetica")
            .attr("alignment-baseline", "central")
            .attr("text-anchor", label.textAnchor ?? "")
            .attr("opacity", d => d._opacity)
            .attr("transform", d => {
                const alongLabelAxis = teamNameScale(accessors.y(d)) || 0
                if (horizontal) {
                    return `translate(${alongLabelAxis + BAR_THICKNESS / 2}, ${barBaseAccessor() + (label.topOffset || 0)}), rotate(${label.rotation})`
                }
                return `translate(${dims.ml - (label.rightOffset || 0)}, ${alongLabelAxis + BAR_THICKNESS / 2})`
            })

        // Render position/rank numbers
        svg.selectAll(".position")
            .data<InterpolatedDatum>(interpolatedData)
            .join<SVGTextElement>("text")
            .attr("class", "position")
            .attr("x", dims.ml + position.xOffset)
            .attr("y", d => (teamNameScale(accessors.y(d)) ?? 0) + BAR_THICKNESS / 2)
            .attr("alignment-baseline", "central")
            .attr("fill", position.fill)
            .attr("style", "font-weight: 700;")
            .attr("font-size", position.size)
            .attr("font-family", "helvetica")
            .attr("text-anchor", "start")
            .attr("opacity", d => d._opacity)
            .text((_: any, i: number) => {
                const rank = (barCount.dir === -1 ? barCount.max - barCount.active : 0) + i + 1
                const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : ''
                return medal ? medal : ""
            })

        // Render axis (only for non-horizontal)
        if (!horizontal) {
            const ptsAxis = svg
                .selectAll("g.x-axis")
                .data([null])
                .join("g")
                .attr("class", "x-axis")
                .attr("transform", `translate(0, ${dims.mt + xAxis.offset})`)
                .attr("font-size", xAxis.size)
                .call(g => {
                    pointsAxisGen
                        .tickSizeInner(0)
                        .tickSizeOuter(0)
                        .ticks(2)
                        .tickFormat(xAxis.format === undefined ? (val: any) => val : val => {
                            if (!maxPoints || !xAxis.format) return ""
                            return Number(val) <= maxPoints ? xAxis.format(val as number) : ""
                        })(g as any)
                    g.select('.domain')
                        .attr('stroke-width', 0)
                })
        }
    }

    // Configuration methods (removed animation since it's controlled externally)
    barGraph.barCount = val => (barCount = val, barGraph)
    barGraph.bar = val => (bar = val, barGraph)
    barGraph.label = ({ topOffset = 25, rotation = -75, textAnchor = "start", ...rest }) => (label = { topOffset, rotation, textAnchor, ...rest }, barGraph)
    barGraph.points = val => (points = val, barGraph)
    barGraph.accessors = val => (accessors = val, barGraph)
    barGraph.logoXOffset = val => (logoXOffset = val, barGraph)
    barGraph.position = val => (position = val, barGraph)
    barGraph.xAxis = val => (xAxis = val, barGraph)
    barGraph.horizontal = val => (horizontal = val, barGraph)
    barGraph.background = val => (background = val, barGraph)
    barGraph.dom = val => (dom = val, barGraph)
    
    return barGraph
}

export { BarChartGenerator }