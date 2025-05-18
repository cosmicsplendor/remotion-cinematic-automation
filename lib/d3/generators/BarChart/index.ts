import { wait } from "../../utils/index"
import { Dims } from "../../utils/types"
import {
    scaleLinear,
    select,
    scaleBand,
    max,
    transition,
    Selection,
    Transition,
    BaseType,
    axisTop,
    axisLeft,
    interpolate,
} from "d3"

type Hash = Record<string, any>

type BarCount = Record<"max" | "active", number> & Record<"dir", 1 | -1>
type Bar = Record<"gap" | "minLength", number>
type Animation = Record<"easingFn", (norm: number) => number> & Record<"duration" | "offset", number>
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
// const pointsToStr = (val: number) => `${val}${val === 0 ? "" : " pts"}`
type DOM = Record<"container" | "svg", string>
export type BarChart<Datum> = {
    (data?: Datum[], noTransition?: boolean): Promise<void>
    animation?: (val: Animation) => BarChart<Datum>,
    barCount?: (val: BarCount) => BarChart<Datum>,
    bar?: (val: Bar) => BarChart<Datum>,
    label?: (val: Label) => BarChart<Datum>,
    points?: (val: Points) => BarChart<Datum>,
    accessors: (val: Accessors<Datum>) => BarChart<Datum>,
    data?: (val: Datum[]) => BarChart<Datum>,
    logoXOffset?: (val: number) => BarChart<Datum>,
    position?: (val: Position) => BarChart<Datum>,
    xAxis?: (val: XAxis) => BarChart<Datum>,
    tween?: (val: boolean) => BarChart<Datum>,
    horizontal?: (val: boolean) => BarChart<Datum>,
    background?: (val: string) => BarChart<Datum>,
    dom?: ({ container, svg }: DOM) => BarChart<Datum>
}
const applyAttribs = <T extends { attr: (attrib: string, val: any) => T }>(sel: T, attribs: Hash) => {
    return Object
        .entries(attribs)
        .reduce((sel, entry: [string, any]) => {
            const [attrib, val] = entry
            return sel.attr(attrib, val)
        }, sel)
}
function BarChartGenerator<Datum extends object>(dims: Dims) {
    type Data = Datum[]
    type TransitionResult = Selection<BaseType, Datum, BaseType, Datum> | Transition<BaseType, Datum, BaseType, Datum>

    let animation: Animation, barCount: BarCount, bar: Bar, label: Label, points: Points, xAxis: XAxis = { offset: -10, size: 18 }
    let accessors: Accessors<Datum>, allData: Data, logoXOffset: number, position: Position, tween = true, horizontal = false, background = "whitesmoke", dom: DOM

    const transitionTo = (
        sel: Selection<BaseType, Datum, BaseType, Datum> | Transition<BaseType, Datum, BaseType, Datum>,
        attribs: Hash,
        transitionState: Transition<BaseType, unknown, null, undefined>,
        noTransition = false
    ): TransitionResult => {
        const initialSel = noTransition ? sel : sel.transition(transitionState)
        return applyAttribs(initialSel, attribs)
    }

    const barGraph: BarChart<Datum> = async (newData, noTransition = false) => {
        const svg = select(dom.svg)
            .attr("width", dims.w)
            .attr("height", dims.h)
        allData = newData ?? allData
        const BAR_THICKNESS = Math.round((horizontal ? dims.w - dims.ml - dims.mt : dims.h - dims.mt - dims.mb) / barCount.active) - bar.gap
        const EXIT_DEST = horizontal ?
            barCount.dir === -1 ? -BAR_THICKNESS : dims.w :
            barCount.dir === -1 ? -BAR_THICKNESS : dims.h
        const sliceArgs = barCount.dir === 1 ? [0, barCount.active] : [-barCount.active]
        const data = allData.slice(...sliceArgs)
        const maxPoints = max(data, accessors.x)
        const transitionState = transition()
            .duration(animation.duration)
            .ease(animation.easingFn)
        const pointsScale = scaleLinear()
            .domain([0, Math.max(maxPoints as number, 10)])
            .range(horizontal ? [dims.h - dims.mb, dims.mt] : [dims.ml, dims.w - dims.mr])
            .nice()
        const teamNameScale = scaleBand()
            .domain(data.map(accessors.y))
            .range(horizontal ? [dims.ml, dims.w - dims.mr] : [dims.mt, dims.h - dims.mb])
        const pointsAxisGen = horizontal ? axisLeft(pointsScale) : axisTop(pointsScale)
        const ptsRange = pointsScale.range()
        const ptsRangeDir = Math.sign(ptsRange[1] - ptsRange[0])

        const barLenAccessor = (d: Datum) => {
            return bar.minLength + (pointsScale(accessors.x(d)) - ptsRange[0]) * ptsRangeDir
        }
        const barTopAccessor = (d: Datum) => ptsRange[0] + ptsRangeDir * barLenAccessor(d)
        const barBaseAccessor = () => ptsRange[0]

        const transitionBars = <T extends BaseType>(
            sel: Selection<T, Datum, BaseType, Datum>,
            to: number | Function = (d: Datum) => teamNameScale(accessors.y(d)),
            opacity = 1
        ) => {
            const attribs: Hash = horizontal ? {
                x: to,
                y: (d: Datum) => {
                    const height = barLenAccessor(d)
                    return dims.h - dims.mb - height
                },
                height: barLenAccessor,
                opacity
            } : {
                width: barLenAccessor,
                y: to, opacity
            }
            return transitionTo(sel as any, attribs, transitionState, noTransition)
        }
        const transitionImages = <T extends BaseType>(sel: Selection<T, Datum, BaseType, Datum>, dest?: number) => {
            const attribs: Hash = {
                style: (d: Datum) => {
                    const alongPtsAxis: number = barTopAccessor(d) + ptsRangeDir * logoXOffset
                    const alongLabelAxis = dest ?? teamNameScale(accessors.y(d))
                    if (horizontal) {
                        return `position: absolute; left: ${alongLabelAxis}px; top: ${alongPtsAxis}px;`
                    }
                    return `position: absolute; left: ${alongPtsAxis}px; top: ${alongLabelAxis}px;`
                }
            }
            return transitionTo(sel as any, attribs, transitionState, noTransition)
        }
        // select("body")
        //     .selectAll("img")
        //     .data(data, accessors.id)
        //     .join(
        //         enter => {
        //             const sel = enter
        //                 .append("img")
        //                 .attr("style", (d: Datum) => {
        //                     const alongPtsAxis = barTopAccessor(d) + ptsRangeDir * logoXOffset
        //                     if (horizontal) return `position: absolute; top: ${alongPtsAxis}px; left: ${EXIT_DEST}px;`
        //                     return `position: absolute; left: ${alongPtsAxis}px; top: ${EXIT_DEST}px;`
        //                 })
        //             return transitionImages(sel)
        //         },
        //         update => transitionImages(update),
        //         exit => {
        //             transitionImages(exit, EXIT_DEST).remove()
        //         }
        //     )
        //     .attr("src", accessors.logoSrc)
        //     .attr("height", BAR_THICKNESS)
        //     .attr("width", "auto")
        const transitionPoints = <T extends BaseType>(sel: Selection<T, Datum, BaseType, Datum>, dest?: number) => {
            const attribs: Hash = {
                transform: (d: Datum) => {
                    const alongPtsAxis = pointsScale(accessors.x(d)) + ptsRangeDir * points.xOffset
                    const alongLabelAxis = dest ?? (teamNameScale(accessors.y(d)) || 0) + BAR_THICKNESS * 0.5
                    if (horizontal) return `translate(${alongLabelAxis}, ${alongPtsAxis}), rotate(-${points.rotation})`
                    return `translate(${alongPtsAxis}, ${alongLabelAxis})`
                }
            }
            return transitionTo(sel as any, attribs, transitionState, noTransition)
        }
        const transitionLabels = <T extends BaseType>(sel: Selection<T, Datum, BaseType, Datum>, dest?: number) => {
            const attribs: Hash = {
                transform: (d: Datum) => {
                    const alongLabelAxis = dest ?? teamNameScale(accessors.y(d))
                    if (horizontal) {
                        return `translate(${(alongLabelAxis || 0) + BAR_THICKNESS / 2}, ${barBaseAccessor() + (label.topOffset || 0)}), rotate(${label.rotation})`
                    }
                    return `translate(${dims.ml - (label.rightOffset || 0)}, ${(alongLabelAxis || 0) + BAR_THICKNESS / 2})`
                }
            }
            return transitionTo(sel as any, attribs, transitionState, noTransition)
        }
        svg.selectAll("rect")
            .data<Datum>(data, accessors.id as any)
            .join(
                enter => {
                    const sel = enter
                        .append("rect")
                    if (horizontal) {
                        sel.attr("x", EXIT_DEST)
                            .attr("y", barTopAccessor)
                            .attr("height", barLenAccessor)
                        return transitionBars(sel)
                    }
                    sel.attr("y", EXIT_DEST)
                        .attr("width", d => {
                            const len = barLenAccessor(d)
                            return len
                        })
                    return transitionBars(sel)
                },
                update => transitionBars(update),
                exit => transitionBars(exit, EXIT_DEST, 0)
                    .remove()
            )
            .attr("fill", accessors.color)
            .call(sel => {
                if (horizontal) {
                    return sel.attr("width", BAR_THICKNESS)
                }
                sel.attr("height", BAR_THICKNESS)
                    .attr("x", barBaseAccessor())
            })


            .attr("src", accessors.logoSrc)
            .attr("height", BAR_THICKNESS)
            // .attr("width", "auto")

        const totalPointsSel = svg
            .selectAll<BaseType, Datum>(".total-points")
            .data<Datum>(data)
            .join(
                enter => {
                    const sel = enter
                        .append("text")
                        .call(sel => {
                            if (horizontal) {
                                return sel
                                    .attr("transform", `translateX(${EXIT_DEST})`)
                            }
                            sel.attr("transform", `translate(0, ${EXIT_DEST})`)
                        })
                    return transitionPoints(sel)
                },
                update => transitionPoints(update),
                exit => {
                    return transitionPoints(exit, EXIT_DEST)
                        .remove()
                }
            )
            .attr("class", "total-points")
            .attr("font-size", points.size)
            .attr("font-family", "helvetica")
            .attr("fill", points.fill)
            .attr("style", "letter-spacing: 2px;")
            .attr("font-family", "helvetica")
            .attr("alignment-baseline", "central")

        svg
            .selectAll<BaseType, Datum>(".label-axis")
            .data<Datum>(data, accessors.id)
            .join(
                enter => {
                    const sel = enter
                        .append("text")
                        .call(sel => {
                            if (horizontal) {
                                return sel.attr("transform", `translate(${EXIT_DEST}, ${barBaseAccessor() + (label.topOffset || 0)}), rotate(${label.rotation})`)
                            }
                            sel.attr("transform", `translate(${dims.ml - (label.rightOffset || 0)}, ${EXIT_DEST})`)
                        })

                    return transitionLabels(sel)
                },
                update => {
                    return transitionLabels(update)
                },
                exit => {
                    transitionLabels(exit, EXIT_DEST).remove()
                }
            )
            .attr("class", "label-axis")
            .text(accessors.name)
            .attr("font-size", label.size)
            .attr("fill", label.fill)
            .attr("font-family", "Helvetica")
            .attr("alignment-baseline", "central")
            .attr("text-anchor", label.textAnchor ?? "")

        svg
            .selectAll<BaseType, Datum>(".position")
            .data<Datum>(data)
            .join<SVGTextElement>("text")
            .attr("class", "position")
            .attr("x", dims.ml + position.xOffset)
            .attr("y", d => (teamNameScale(accessors.y(d)) ?? 0) + BAR_THICKNESS / 2)
            .attr("alignment-baseline", "central")
            .attr("fill", position.fill)
            .attr("style", "font-weight: 600;")
            .attr("font-size", position.size)
            .attr("font-family", "helvetica")
            .text((_: any, i: number) => `${(barCount.dir === -1 ? barCount.max - barCount.active : 0) + i + 1}`)
            .call(sel => {
                if (horizontal) {
                    return sel.attr("text-anchor", "start")
                }
                sel.attr("text-anchor", "start")
            })
        if (!horizontal) {
            const ptsAxis = svg
                .selectAll("g.x-axis")
                .data([null])
                .join("g")
                .attr("class", "x-axis")
                .call(sel => {
                    sel.attr("transform", horizontal ? `translate(${dims.ml + xAxis.offset}, 0)` : `translate(0, ${dims.mt + xAxis.offset})`)
                })
            ptsAxis.transition()
                .attr("font-size", xAxis.size)
                .duration(() => noTransition ? 0 : transitionState.duration())
                .call(g => {
                    pointsAxisGen
                        .tickSizeInner(0)
                        .tickSizeOuter(0)
                        .ticks(2)
                        .tickFormat(xAxis.format === undefined ? (val: any) => val : val => {
                            if (!maxPoints || !xAxis.format) return ""
                            return Number(val) <= maxPoints ? xAxis.format(val as number) : ""
                        })(g as any)
                    ptsAxis.select('.domain')
                        .attr('stroke-width', 0)
                })
        }

        const totlaPointsSelTrans = totalPointsSel
            .transition(transitionState)
        if (noTransition || !tween) {
            totalPointsSel.text(d => xAxis.format ? xAxis.format(accessors.x(d)) : accessors.x(d))
        } else {
            totlaPointsSelTrans.tween("text", function (d) {
                var i = interpolate(xAxis.reverseFormat ? xAxis.reverseFormat(select(this).text()) : 0, accessors.x(d))
                return t => {
                    select(this).text(xAxis.format ? xAxis.format(i(t)) : i(t))
                }
            })
        }
        await wait(animation.duration + animation.offset)
    }
    barGraph.animation = val => (animation = val, barGraph)
    barGraph.barCount = val => (barCount = val, barGraph)
    barGraph.bar = val => (bar = val, barGraph)
    barGraph.label = ({ topOffset = 25, rotation = -75, textAnchor = "start", ...rest }) => (label = { topOffset, rotation, textAnchor, ...rest }, barGraph)
    barGraph.points = val => (points = val, barGraph)
    barGraph.accessors = val => (accessors = val, barGraph)
    barGraph.data = val => (allData = val, barGraph)
    barGraph.logoXOffset = val => (logoXOffset = val, barGraph)
    barGraph.position = val => (position = val, barGraph)
    barGraph.xAxis = val => (xAxis = val, barGraph)
    barGraph.tween = val => (tween = val, barGraph)
    barGraph.horizontal = val => (horizontal = val, barGraph)
    barGraph.background = val => (background = val, barGraph)
    barGraph.dom = val => (dom = val, barGraph)
    return barGraph
}

export { BarChartGenerator }