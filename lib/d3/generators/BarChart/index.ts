import { Dims } from "../../utils/types"
import { scaleLinear, select, scaleBand, max, Selection, BaseType, axisTop, axisLeft, interpolate, scalePow, ScalePower } from "d3" // Added ScalePower type

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

const smoothstep = (min: number, max: number, value: number): number => {
    const x = Math.max(0, Math.min(1, (value - min) / (max - min)));
    return x * x * (3 - 2 * x);
};
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
    _targetPosition?: number,
    _prevX: number, // Ensure _prevX and _newX are always numbers
    _newX: number  // Ensure _prevX and _newX are always numbers
}

const createInterpolatedScale = (
    prevScale: ScalePower<number, number> | null, // Typed prevScale
    newScale: ScalePower<number, number>,     // Typed newScale
    progress: number
): ScalePower<number, number> => { // Ensure return type matches newScale
    if (!prevScale) return newScale;

    const prevDomain = prevScale.domain();
    const newDomain = newScale.domain();
    const prevRange = prevScale.range();
    const newRange = newScale.range(); // These ranges should be identical in current setup

    const interpolatedDomain = [
        prevDomain[0] + (newDomain[0] - prevDomain[0]) * progress,
        prevDomain[1] + (newDomain[1] - prevDomain[1]) * progress
    ];

    const interpolatedRange = [ // Range interpolation is technically not needed if they are always same
        prevRange[0] + (newRange[0] - prevRange[0]) * progress,
        prevRange[1] + (newRange[1] - prevRange[1]) * progress
    ];

    return newScale.copy().domain(interpolatedDomain).range(interpolatedRange);
}

// Helper function to create interpolated dataset with smooth enter/exit transitions
const createInterpolatedData = <Datum>(
    prevData: Datum[],
    newData: Datum[],
    progress: number,
    accessors: Accessors<Datum>,
    barCount: BarCount
): InterpolatedDatum<Datum>[] => {
    const sliceArgs = barCount.dir === 1 ? [0, barCount.active] : [-barCount.active];
    const prevSliced = prevData.slice(...sliceArgs);
    const newSliced = newData.slice(...sliceArgs);

    const prevMap = new Map(prevSliced.map((d, index) => [accessors.id(d), { data: d, index }]));
    const newMap = new Map(newSliced.map((d, index) => [accessors.id(d), { data: d, index }]));

    const interpolatedData: InterpolatedDatum<Datum>[] = [];

    newSliced.forEach((newItem, newIndex) => {
        const id = accessors.id(newItem);
        const prevInfo = prevMap.get(id);

        if (prevInfo) { // EXISTING ITEM
            const prevX = accessors.x(prevInfo.data);
            const newX = accessors.x(newItem);
            const interpolatedX = prevX + (newX - prevX) * progress;
            const interpolatedPosition = prevInfo.index + (newIndex - prevInfo.index) * progress;

            interpolatedData.push({
                ...newItem,
                _interpolatedX: interpolatedX,
                _interpolatedPosition: interpolatedPosition,
                _transitionState: TransitionState.EXISTING,
                _originalPosition: prevInfo.index,
                _targetPosition: newIndex,
                _prevX: prevX,
                _newX: newX
            });
        } else { // ENTERING ITEM
            const newX = accessors.x(newItem);
            const interpolatedX = newX * progress;
            const startPosition = barCount.active + 1;
            const interpolatedPosition = startPosition + (newIndex - startPosition) * progress;

            interpolatedData.push({
                ...newItem,
                _interpolatedX: interpolatedX,
                _interpolatedPosition: interpolatedPosition,
                _transitionState: TransitionState.ENTERING,
                _originalPosition: startPosition,
                _targetPosition: newIndex,
                _prevX: 0, // Start value for entering items
                _newX: newX
            });
        }
    });

    prevSliced.forEach((prevItem, prevIndex) => {
        const id = accessors.id(prevItem);
        if (!newMap.has(id)) { // EXITING ITEM
            const prevX = accessors.x(prevItem);
            const interpolatedX = prevX * (1 - progress);
            const endPosition = barCount.active + 1;
            const interpolatedPosition = prevIndex + (endPosition - prevIndex) * progress;

            interpolatedData.push({
                ...prevItem,
                _interpolatedX: interpolatedX,
                _interpolatedPosition: interpolatedPosition,
                _transitionState: TransitionState.EXITING,
                _originalPosition: prevIndex,
                _targetPosition: endPosition,
                _prevX: prevX,
                _newX: 0 // End value for exiting items
            });
        }
    });

    return interpolatedData;
}

function BarChartGenerator<Datum extends object>(dims: Dims) {
    type Data = Datum[]

    let barCount: BarCount, bar: Bar, label: Label, points: Points, xAxis: XAxis = { offset: -10, size: 18 }
    let accessors: Accessors<Datum>, logoXOffset: number, position: Position, horizontal = false, background = "whitesmoke", dom: DOM

    let memoizedPrevPointsScale: ScalePower<number, number> | null = null; // Renamed for clarity

    const barGraph: RemotionBarChart<Datum> = (prevData: Data, newData: Data, progress: number) => {
        const svg = select(dom.svg)
            .attr("width", dims.w)
            .attr("height", dims.h);

        const interpolatedData = createInterpolatedData(prevData, newData, progress, accessors, barCount);
        const BAR_THICKNESS = Math.round((horizontal ? dims.w - dims.ml - dims.mt : dims.h - dims.mt - dims.mb) / barCount.active) - bar.gap;

        const sliceArgs = barCount.dir === 1 ? [0, barCount.active] : [-barCount.active];
        const prevSliced = prevData.slice(...sliceArgs);
        const newSliced = newData.slice(...sliceArgs);

        const prevMaxPoints = prevSliced.length > 0 ? Math.max(...prevSliced.map(accessors.x), 20) : 20;
        const newMaxPoints = newSliced.length > 0 ? Math.max(...newSliced.map(accessors.x), 20) : 20; // Ensure newSliced check

        const targetPointsScale = scalePow().exponent(0.33)
            .domain([0, newMaxPoints])
            .range(horizontal ? [dims.h - dims.mb, dims.mt] : [dims.ml, dims.w - dims.mr])
            .nice();

        let initialPointsScale = memoizedPrevPointsScale;
        if (!initialPointsScale) {
            initialPointsScale = scalePow().exponent(0.33)
                .domain([0, prevMaxPoints])
                .range(horizontal ? [dims.h - dims.mb, dims.mt] : [dims.ml, dims.w - dims.mr])
                .nice();
        }

        const axisDisplayScale = createInterpolatedScale(initialPointsScale, targetPointsScale, progress);

        if (progress >= 1) {
            memoizedPrevPointsScale = targetPointsScale.copy();
        }

        const positionScale = scaleLinear()
            .domain([0, barCount.active + 1.25])
            .range(horizontal ?
                [dims.ml, dims.w - dims.mr - BAR_THICKNESS + (BAR_THICKNESS + bar.gap) * 1.25] :
                [dims.mt, dims.h - dims.mb - BAR_THICKNESS + (BAR_THICKNESS + bar.gap) * 1.25]
            );

        const pointsAxisGen = horizontal ? axisLeft(axisDisplayScale) : axisTop(axisDisplayScale); // Axis uses interpolated scale
        const ptsRange = axisDisplayScale.range();
        const ptsRangeDir = Math.sign(ptsRange[1] - ptsRange[0]);

        const barLenAccessor = (d: InterpolatedDatum<Datum>) => {
            const prevLengthCont = (initialPointsScale(d._prevX) - initialPointsScale.range()[0]) * Math.sign(initialPointsScale.range()[1] - initialPointsScale.range()[0]);
            const newLengthCont = (targetPointsScale(d._newX) - targetPointsScale.range()[0]) * Math.sign(targetPointsScale.range()[1] - targetPointsScale.range()[0]);

            const safePrevLengthCont = Math.max(0, prevLengthCont);
            const safeNewLengthCont = Math.max(0, newLengthCont);

            if (d._transitionState === TransitionState.EXITING) {
                // Keep bar at previous length throughout exit
                return bar.minLength + safePrevLengthCont;
            }
            if (d._transitionState === TransitionState.ENTERING) {
                // Start at final length (or a fraction, e.g. 0.8)
                const entryFraction = 1; // set to 0.8 for 80% if you want
                return bar.minLength + safeNewLengthCont * entryFraction;
            }

            // Existing bars interpolate as before
            const interpolatedLengthCont = safePrevLengthCont * (1 - progress) + safeNewLengthCont * progress;
            return bar.minLength + interpolatedLengthCont;
        };

        const barTopAccessor = (d: InterpolatedDatum<Datum>) => ptsRange[0] + ptsRangeDir * barLenAccessor(d);
        const barBaseAccessor = () => ptsRange[0];

        const getOpacity = (d: InterpolatedDatum<Datum>) => {
            if (d._transitionState === TransitionState.EXITING) return Math.max(0, 1 - progress * 1.5);
            if (d._transitionState === TransitionState.ENTERING) return Math.min(1, progress * 1.5);

            let positionOpacity = 1;
            if (d._interpolatedPosition < -0.5 || d._interpolatedPosition > barCount.active - 0.5) {
                const minPos = (barCount.active - 1) / 2 - 3;
                const maxPos = (barCount.active - 1) / 2 + 3;
                positionOpacity = 1 - smoothstep(minPos, maxPos, d._interpolatedPosition);
            }

            return positionOpacity;
        };

        svg.selectAll("rect.bar")
            .data<InterpolatedDatum<Datum>>(interpolatedData, d => accessors.id(d as Datum) as string)
            .join(
                enter => enter.append("rect").attr("class", "bar").attr("id", d => `bar-${accessors.id(d)}`),
                update => update,
                exit => exit.remove()
            )
            .attr("fill", d => accessors.color(d))
            .attr("opacity", getOpacity)
            .call(sel => {
                if (horizontal) {
                    sel.attr("x", d => positionScale(d._interpolatedPosition))
                        .attr("y", d => { // Bar grows downwards from its top edge
                            const height = Math.max(0, barLenAccessor(d)); // Use new accessor
                            return barTopAccessor(d) - (ptsRangeDir === -1 ? 0 : height); // Adjust based on ptsRangeDir
                        })
                        .attr("width", BAR_THICKNESS)
                        .attr("height", d => Math.max(0, barLenAccessor(d))) // Use new accessor
                        .attr("rx", 2).attr("ry", 4);
                } else { // Non-horizontal
                    sel.attr("x", barBaseAccessor()) // Bar grows rightwards from base
                        .attr("y", d => positionScale(d._interpolatedPosition))
                        .attr("width", d => Math.max(0, barLenAccessor(d))) // Use new accessor
                        .attr("height", BAR_THICKNESS)
                        .attr("rx", 2).attr("ry", 4);
                }
            });

        svg.selectAll("rect.bar") // Re-selecting to apply corrected horizontal logic if needed
            // ... (data, join, fill, opacity calls are fine) ...
            .call(sel => {
                if (horizontal) {
                    return sel
                        .attr("x", d => positionScale(d._interpolatedPosition))
                        .attr("y", d => barTopAccessor(d)) // Y-coordinate of the top of the bar
                        .attr("width", BAR_THICKNESS)
                        .attr("height", d => Math.max(0, barLenAccessor(d))) // Actual length of the bar
                        .attr("rx", 2)
                        .attr("ry", 4);
                } else { // Non-horizontal (vertical bars, grow right)
                    return sel
                        .attr("x", barBaseAccessor())
                        .attr("y", d => positionScale(d._interpolatedPosition))
                        .attr("width", d => Math.max(0, barLenAccessor(d)))
                        .attr("height", BAR_THICKNESS)
                        .attr("rx", 2)
                        .attr("ry", 4);
                }
            });


        svg.selectAll("image.logo")
            .data<InterpolatedDatum<Datum>>(interpolatedData, d => accessors.id(d as Datum) as string)
            .join(
                enter => enter.append("image").attr("class", "logo").attr("id", d => `logo-${accessors.id(d)}`),
                update => update,
                exit => exit.remove()
            )
            .attr("href", d => accessors.logoSrc(d))
            .attr("height", BAR_THICKNESS)
            .attr("width", BAR_THICKNESS)
            .attr("preserveAspectRatio", "xMidYMid meet")
            .attr("opacity", getOpacity)
            .call(sel => { // Logo position uses barTopAccessor, which now uses the new barLenAccessor
                if (horizontal) {
                    sel.attr("x", d => positionScale(d._interpolatedPosition))
                        .attr("y", d => barTopAccessor(d) + ptsRangeDir * logoXOffset);
                } else {
                    sel.attr("x", d => barTopAccessor(d) + ptsRangeDir * logoXOffset)
                        .attr("y", d => positionScale(d._interpolatedPosition));
                }
            });

        svg.selectAll("text.total-points")
            .data<InterpolatedDatum<Datum>>(interpolatedData, d => accessors.id(d as Datum) as string)
            .join(
                enter => enter.append("text").attr("class", "total-points").attr("id", d => `points-${accessors.id(d)}`),
                update => update,
                exit => exit.remove()
            )
            .attr("font-size", points.size)
            .attr("font-family", "helvetica")
            .attr("fill", points.fill)
            .attr("style", "letter-spacing: 2px;")
            .attr("alignment-baseline", "central")
            .attr("opacity", getOpacity)
            .text(d => { // Text shows interpolated actual value
                const value = d._interpolatedX;
                return xAxis.format ? xAxis.format(value) : Math.round(value).toString();
            })
            .attr("transform", d => { // *** MODIFIED points text positioning ***
                // Position text relative to the end of the bar, using the new barLenAccessor
                const barActualLength = barLenAccessor(d);
                const valueEndPoint = ptsRange[0] + ptsRangeDir * barActualLength;

                const alongPtsAxis = valueEndPoint + ptsRangeDir * points.xOffset;
                const alongLabelAxis = positionScale(d._interpolatedPosition) + BAR_THICKNESS * 0.5;

                if (horizontal) return `translate(${alongLabelAxis}, ${alongPtsAxis}), rotate(-${points.rotation || 0})`; // Added default for rotation
                return `translate(${alongPtsAxis}, ${alongLabelAxis})`;
            });

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
                const alongLabelAxis = positionScale(d._interpolatedPosition);
                if (horizontal) {
                    return `translate(${alongLabelAxis + BAR_THICKNESS / 2}, ${barBaseAccessor() + (label.topOffset || 0)}), rotate(${label.rotation || 0})`; // Added default
                }
                return `translate(${dims.ml - (label.rightOffset || 0)}, ${alongLabelAxis + BAR_THICKNESS / 2})`;
            });

        const visibleItems = interpolatedData.filter(d =>
            d._interpolatedPosition >= -1 &&
            d._interpolatedPosition <= barCount.active
        );

        svg.selectAll("text.position")
            .data<InterpolatedDatum<Datum>>(visibleItems, d => accessors.id(d) as string)
            .join<SVGTextElement>("text")
            .attr("class", "position")
            .attr("x", dims.ml + position.xOffset)
            .attr("y", d => {
                return positionScale(d._targetPosition || 0) + BAR_THICKNESS / 2;
            })
            .attr("alignment-baseline", "central")
            .attr("fill", position.fill)
            .attr("style", "font-weight: 700;")
            .attr("font-size", position.size)
            .attr("font-family", "helvetica")
            .attr("text-anchor", "start")
            .attr("opacity", getOpacity) // Opacity can still transition based on _interpolatedPosition,
            .text((d: InterpolatedDatum<Datum>) => {
                const rank = (d._targetPosition || 0) + 1;
                if (rank < 1 || rank > Math.min(3, barCount.active)) {
                    return ""; // No medal if target rank is not 1, 2, or 3, or beyond active count
                }
                const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '';
                return medal;
            });

        if (!horizontal) {
            const maxVisiblePoints = Math.max(0, ...interpolatedData // Added 0 for empty array case
                .filter(d => d._interpolatedPosition >= 0 && d._interpolatedPosition < barCount.active)
                .map(d => d._interpolatedX));

            svg.selectAll("g.x-axis")
                .data([null])
                .join("g")
                .attr("class", "x-axis")
                .attr("transform", `translate(0, ${dims.mt + xAxis.offset})`)
                .attr("font-size", xAxis.size)
                .call(g => {
                    pointsAxisGen // This uses axisDisplayScale
                        .tickSizeInner(0)
                        .tickSizeOuter(0)
                        .ticks(2)
                        .tickFormat(xAxis.format === undefined ? (val: any) => val.toString() : (val: any) => { // Added toString for default
                            if (!maxVisiblePoints || !xAxis.format) return "";
                            return Number(val) <= maxVisiblePoints ? xAxis.format(val as number) : "";
                        })(g as any);
                    g.select('.domain').attr('stroke-width', 0);
                });
        }
    }

    barGraph.barCount = val => (barCount = val, barGraph);
    barGraph.bar = val => (bar = val, barGraph);
    barGraph.label = ({ topOffset = 25, rotation = -75, textAnchor = "start", ...rest }) => (label = { topOffset, rotation, textAnchor, ...rest }, barGraph);
    barGraph.points = val => (points = val, barGraph);
    barGraph.accessors = val => (accessors = val, barGraph);
    barGraph.logoXOffset = val => (logoXOffset = val, barGraph);
    barGraph.position = val => (position = val, barGraph);
    barGraph.xAxis = val => (xAxis = val, barGraph);
    barGraph.horizontal = val => (horizontal = val, barGraph);
    barGraph.background = val => (background = val, barGraph);
    barGraph.dom = val => (dom = val, barGraph);

    return barGraph;
}

export { BarChartGenerator };