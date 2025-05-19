import { useEffect, useRef } from "react";
import ClockGenerator from "../../../lib/d3/generators/BarChart/clock/variant1";
const CLOCK_ID = "SVGX"
const Clock: React.FC<{ x: number, y: number, lifespan: number, cycleDuration: number }> = ({ x, y, lifespan, cycleDuration }) => {
    // Initial chart setup (runs once on mount or dependencies change)
    const clockRef = useRef<any>(null);

    useEffect(() => {
        if (clockRef.current === null) {
            return;
        }
        const clock: any = ClockGenerator(`#${CLOCK_ID}`)
        clock.pos({ x, y })
            .background("#aaa")
        clock()
        setTimeout(() => {
            clock.duration(`${lifespan}s`)
            clock(lifespan/cycleDuration * 360 * 0.4, (lifespan/cycleDuration) * 1440 * 0.4)
        }, 0)
    }, [clockRef])
    return <div id={CLOCK_ID} ref={clockRef} />
}

export default Clock