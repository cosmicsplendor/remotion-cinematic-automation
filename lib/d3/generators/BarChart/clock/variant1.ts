import { select } from "d3"
type Pos = Record<"x" | "y", number>

export type Clock = {
    (hr?: number, min?: number): Clock
    pos?: (pos: Pos) => Clock,
    background?: (background: string) => Clock,
    duration?: (duration: string) => Clock,
    fontSize?: (fontSize: string) => Clock,
    scale?: (scale: number) => Clock,
    bounds?: () => DOMRect
}

const ClockGenerator = (query: string) => {
    const container = select(query)
    const face = container.append("div")
    const hour = face.append("div")
    const minute = face.append("div")
    const hinge = face.append("div")

    let pos: Pos = { x: 0, y: 0 }, duration = "0s", background = "#444", fontSize: string, rimColor = "whitesmoke", scale=0.2
    const clock: Clock = (hr = 0, min = 0) => {
        container.attr("style", `transform: scale(${scale});position: absolute; left: ${pos.x}px; top: ${pos.y}px; font-size: ${fontSize}; width: 40em; height: 40em; border-radius: 50%; background: ${rimColor}; box-shadow: 0 0 8px 2px #aaa; display: flex; align-items: center; justify-content: center;`)
        face.attr("style", `width: 85%; height: 85%; box-shadow: inset 0 0 20px #aaa; border-radius: 50%; background: white`)
        hour.attr("style", `width: 10em; height: 2em; background: ${background}; border-radius: 1em; position: absolute; top: calc(50% - 1em); left: 50%; transform-origin: 0 1em; transform: rotate(${hr}deg); transition: transform ${duration} linear;`)
        minute.attr("style", `width: 14em; height: 2em; background: ${background}; border-radius: 1em; position: absolute; top: calc(50% - 1em); left: 50%; transform-origin: 0 1em; transform: rotate(${min}deg); transition: transform ${duration} linear;`)
        hinge.attr("style", `width: 4em; height: 4em; border-radius: 50%; background: ${background}; position: absolute; top: calc(50% - 2em); left: calc(50% - 2em);`)
        return clock
    }

    clock.fontSize = val => (fontSize = val, clock)
    clock.pos = val => (pos = val, clock)
    clock.duration = val => (duration = val, clock)
    clock.background = val => (background = val, clock)
    clock.scale = val => (scale=val, clock)
    return clock
}


export default ClockGenerator