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

enum TransitionState {
    EXISTING = 'existing',
    ENTERING = 'entering',
    EXITING = 'exiting'
}

type InterpolatedDatum<Datum> = Datum & {
    _interpolatedX: number,
    _interpolatedPosition: number,
    _transitionState: TransitionState,
    _originalPosition?: number,
    _targetPosition?: number
}

const applyAttribs = <T extends { attr: (attrib: string, val: any) => T }>(sel: T, attribs: Hash) => {
    return Object
        .entries(attribs)
        .reduce((sel, entry: [string, any]) => {
            const [attrib, val] = entry
            return sel.attr(attrib, val)
        }, sel)
}

// Helper function to create interpolated dataset with smooth enter/exit transitions
const createInterpolatedData = <Datum>(
    prevData: Datum[],
    newData: Datum[],
    progress: number,
    accessors: Accessors<Datum>,
    barCount: BarCount
): InterpolatedDatum<Datum>[] => {
    const sliceArgs = barCount.dir === 1 ? [0, barCount.active] : [-barCount.active]
    const prevSliced = prevData.slice(...sliceArgs)
    const newSliced = newData.slice(...sliceArgs)
    
    // Create maps for easy lookup
    const prevMap = new Map(prevSliced.map((d, index) => [accessors.id(d), { data: d, index }]))
    const newMap = new Map(newSliced.map((d, index) => [accessors.id(d), { data: d, index }]))
    
    const interpolatedData: InterpolatedDatum<Datum>[] = []
    
    // Handle existing and entering items
    newSliced.forEach((newItem, newIndex) => {
        const id = accessors.id(newItem)
        const prevInfo = prevMap.get(id)
        
        if (prevInfo) {
            // EXISTING ITEM - smooth transition between positions
            const prevX = accessors.x(prevInfo.data)
            const newX = accessors.x(newItem)
            const interpolatedX = prevX + (newX - prevX) * progress
            
            const prevPosition = prevInfo.index
            const newPosition = newIndex
            const interpolatedPosition = prevPosition + (newPosition - prevPosition) * progress
            
            interpolatedData.push({
                ...newItem,
                _interpolatedX: interpolatedX,
                _interpolatedPosition: interpolatedPosition,
                _transitionState: TransitionState.EXISTING,
                _originalPosition: prevPosition,
                _targetPosition: newPosition
            })
        } else {
            // ENTERING ITEM - start from off-screen and slide into position
            const newX = accessors.x(newItem)
            const interpolatedX = newX * progress // Grow from 0 to full value
            
            // Start position is off-screen (below/right of visible area)
            const startPosition = barCount.active + 0.5 // Just outside visible range
            const targetPosition = newIndex
            const interpolatedPosition = startPosition + (targetPosition - startPosition) * progress
            
            interpolatedData.push({
                ...newItem,
                _interpolatedX: interpolatedX,
                _interpolatedPosition: interpolatedPosition,
                _transitionState: TransitionState.ENTERING,
                _originalPosition: startPosition,
                _targetPosition: targetPosition
            })
        }
    })
    
    // Handle exiting items
    prevSliced.forEach((prevItem, prevIndex) => {
        const id = accessors.id(prevItem)
        const stillExists = newMap.has(id)
        
        if (!stillExists) {
            // EXITING ITEM - slide out of view
            const prevX = accessors.x(prevItem)
            const interpolatedX = prevX * (1 - progress) // Shrink towards 0
            
            // End position is off-screen (below/right of visible area)
            const startPosition = prevIndex
            const endPosition = barCount.active + 0.5 // Just outside visible range
            const interpolatedPosition = startPosition + (endPosition - startPosition) * progress
            
            interpolatedData.push({
                ...prevItem,
                _interpolatedX: interpolatedX,
                _interpolatedPosition: interpolatedPosition,
                _transitionState: TransitionState.EXITING,
                _originalPosition: startPosition,
                _targetPosition: endPosition
            })
        }
    })
    
    return interpolatedData
}

function BarChartGenerator<Datum extends object>(dims: Dims) {
    type Data = Datum[]

    let barCount: BarCount, bar: Bar, label: Label, points: Points, xAxis: XAxis = { offset: -10, size: 18 }
    let accessors: Accessors<Datum>, logoXOffset: number, position: Position, horizontal = false, background = "whitesmoke", dom: DOM

    const barGraph: RemotionBarChart<Datum> = (prevData: Data, newData: Data, progress: number) => {
        const svg = select(dom.svg)
            .attr("width", dims.w)
            .attr("height", dims.h)
            
        const interpolatedData = createInterpolatedData(prevData, newData, progress, accessors, barCount)
        const BAR_THICKNESS = Math.round((horizontal ? dims.w - dims.ml - dims.mt : dims.h - dims.mt - dims.mb) / barCount.active) - bar.gap
        
        // Calculate max points for consistent scaling
        const allCurrentValues = interpolatedData
            .filter(d => d._transitionState !== TransitionState.EXITING)
            .map(d => accessors.x(d)) // Use original values for scale calculation
        const maxPoints = Math.max(...allCurrentValues, 20)
        
        const pointsScale = scalePow().exponent(0.33)
            .domain([0, maxPoints])
            .range(horizontal ? [dims.h - dims.mb, dims.mt] : [dims.ml, dims.w - dims.mr])
            .nice()
            
        // Create position scale for smooth transitions
        const positionScale = scaleLinear()
            .domain([0, barCount.active - 1])
            .range(horizontal ? [dims.ml, dims.w - dims.mr - BAR_THICKNESS] : [dims.mt, dims.h - dims.mb - BAR_THICKNESS])
            
        const pointsAxisGen = horizontal ? axisLeft(pointsScale) : axisTop(pointsScale)
        const ptsRange = pointsScale.range()
        const ptsRangeDir = Math.sign(ptsRange[1] - ptsRange[0])

        const barLenAccessor = (d: InterpolatedDatum<Datum>) => {
            return bar.minLength + (pointsScale(d._interpolatedX) - ptsRange[0]) * ptsRangeDir
        }
        const barTopAccessor = (d: InterpolatedDatum<Datum>) => ptsRange[0] + ptsRangeDir * barLenAccessor(d)
        const barBaseAccessor = () => ptsRange[0]

        // Calculate opacity based on transition state and position
        const getOpacity = (d: InterpolatedDatum<Datum>) => {
            if (d._transitionState === TransitionState.EXITING) {
                return 1 - progress // Fade out
            }
            if (d._transitionState === TransitionState.ENTERING) {
                return progress // Fade in
            }
            // Check if item is outside visible range
            if (d._interpolatedPosition < -0.5 || d._interpolatedPosition > barCount.active - 0.5) {
                return 0 // Hide items outside visible range
            }
            return 1
        }

        // Render bars
        svg.selectAll("rect.bar")
            .data<InterpolatedDatum<Datum>>(interpolatedData, d => accessors.id(d) as string)
            .join(
                enter => enter.append("rect").attr("class", "bar"),
                update => update,
                exit => exit.remove()
            )
            .attr("fill", d => accessors.color(d))
            .attr("opacity", getOpacity)
            .call(sel => {
                if (horizontal) {
                    return sel
                        .attr("x", d => positionScale(Math.max(0, Math.min(barCount.active - 1, d._interpolatedPosition))))
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
                        .attr("y", d => positionScale(Math.max(0, Math.min(barCount.active - 1, d._interpolatedPosition))))
                        .attr("width", barLenAccessor)
                        .attr("height", BAR_THICKNESS)
                        .attr("rx", 2)
                        .attr("ry", 4)
                }
            })

        // Render images/logos
        svg.selectAll("image.logo")
            .data<InterpolatedDatum<Datum>>(interpolatedData, d => accessors.id(d) as string)
            .join(
                enter => enter.append("image").attr("class", "logo"),
                update => update,
                exit => exit.remove()
            )
            .attr("href", d => accessors.logoSrc(d))
            .attr("height", BAR_THICKNESS)
            .attr("width", BAR_THICKNESS)
            .attr("preserveAspectRatio", "xMidYMid meet")
            .attr("opacity", getOpacity)
            .call(sel => {
                if (horizontal) {
                    return sel
                        .attr("x", d => positionScale(Math.max(0, Math.min(barCount.active - 1, d._interpolatedPosition))))
                        .attr("y", d => barTopAccessor(d) + ptsRangeDir * logoXOffset)
                } else {
                    return sel
                        .attr("x", d => barTopAccessor(d) + ptsRangeDir * logoXOffset)
                        .attr("y", d => positionScale(Math.max(0, Math.min(barCount.active - 1, d._interpolatedPosition))))
                }
            })

        // Render points text
        svg.selectAll("text.total-points")
            .data<InterpolatedDatum<Datum>>(interpolatedData, d => accessors.id(d) as string)
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
            .attr("opacity", getOpacity)
            .text(d => {
                const value = d._transitionState === TransitionState.ENTERING 
                    ? d._interpolatedX // Show interpolated value for entering items
                    : accessors.x(d) // Show actual value for existing items during transition
                return xAxis.format ? xAxis.format(value) : Math.round(value).toString()
            })
            .attr("transform", d => {
                const clampedPosition = Math.max(0, Math.min(barCount.active - 1, d._interpolatedPosition))
                const alongPtsAxis = pointsScale(d._interpolatedX) + ptsRangeDir * points.xOffset
                const alongLabelAxis = positionScale(clampedPosition) + BAR_THICKNESS * 0.5
                if (horizontal) return `translate(${alongLabelAxis}, ${alongPtsAxis}), rotate(-${points.rotation})`
                return `translate(${alongPtsAxis}, ${alongLabelAxis})`
            })

        // Render labels
        svg.selectAll("text.label-axis")
            .data<InterpolatedDatum<Datum>>(interpolatedData, d => accessors.id(d) as string)
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
            .attr("opacity", getOpacity)
            .attr("transform", d => {
                const clampedPosition = Math.max(0, Math.min(barCount.active - 1, d._interpolatedPosition))
                const alongLabelAxis = positionScale(clampedPosition)
                if (horizontal) {
                    return `translate(${alongLabelAxis + BAR_THICKNESS / 2}, ${barBaseAccessor() + (label.topOffset || 0)}), rotate(${label.rotation})`
                }
                return `translate(${dims.ml - (label.rightOffset || 0)}, ${alongLabelAxis + BAR_THICKNESS / 2})`
            })

        // Render position/rank numbers (only for visible items)
        const visibleItems = interpolatedData.filter(d => 
            d._transitionState !== TransitionState.EXITING && 
            d._interpolatedPosition >= -0.5 && 
            d._interpolatedPosition <= barCount.active - 0.5
        )
        
        svg.selectAll("text.position")
            .data<InterpolatedDatum<Datum>>(visibleItems, d => accessors.id(d) as string)
            .join<SVGTextElement>("text")
            .attr("class", "position")
            .attr("x", dims.ml + position.xOffset)
            .attr("y", d => {
                const clampedPosition = Math.max(0, Math.min(barCount.active - 1, d._interpolatedPosition))
                return positionScale(clampedPosition) + BAR_THICKNESS / 2
            })
            .attr("alignment-baseline", "central")
            .attr("fill", position.fill)
            .attr("style", "font-weight: 700;")
            .attr("font-size", position.size)
            .attr("font-family", "helvetica")
            .attr("text-anchor", "start")
            .attr("opacity", getOpacity)
            .text((d: InterpolatedDatum<Datum>) => {
                const rank = Math.round(d._interpolatedPosition) + 1
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

    // Configuration methods
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