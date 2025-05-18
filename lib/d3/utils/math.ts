type EasingFns = {
    [Key: string]: (x: number) => number
}

export const rand = (to: number, from = 0) => from + Math.floor((to - from + 1) * Math.random())

export const randf = (to: number, from = 0) => from + (to - from) * Math.random()

export const skewedRand = (to: number, from = 0) => from + Math.floor((to - from + 1) * Math.random() * Math.random())

export const pickOne = <EntryType>(array: Array<EntryType>) => array[rand(array.length - 1)]

export const clamp = (from = 0, to = 1, numToClamp: number) => Math.min(to, Math.max(from, numToClamp))

export const sign = (num: number) => num === 0 ? 1 : num / Math.abs(num)

export const lerp = (from: number, to: number, num: number) => (num - from) / (to - from)

export const stripFloat = (num: number, place: number) => Math.floor(num * place) / place

export const roundFloat = (num: number, place: number) => Math.round(num * place) / place

export const len = (x: number, y: number) => Math.sqrt(x * x + y * y)

export const sqLen = (x: number, y: number) => x * x + y * y

export const calcNormal = (x: number, y: number) => { // computes perpendicular components
    const length = len(x, y)
    return { x: y / length, y: -x / length}
}

export const normalize = (x: number, y: number) => { // returns unit vector
    const magnitude = len(x, y)
    return { x: x / magnitude, y: y / magnitude }
}

export const easingFns: EasingFns = {
    linear(x) {
        return x
    },
    quadIn(x) {
        return  x * x
    },
    quadOut(x) {
        return 1 - this.quadIn(x - 1)
    },
    cubicIn(x) {
        return x * x * x
    },
    cubicOut(x) {
        return 1 - this.cubicIn(1 - x)
    },
    smoothStep(x) {
        return x * x * (3 - 2 * x)
    }
}


export const atan = (y: number, x: number) => {
    const abs = Math.abs(Math.atan(y / x))
    if (x > 0 && y < 0) { // fourth quadrant
        return -abs
    }
    if (x < 0 && y < 0) { // third quadrant
        return Math.PI + abs
    }
    if (x < 0 && y > 0) { // second quadrant
        return Math.PI - abs
    }
    if (x > 0 && y > 0) { // first quadrant
        return abs
    }
    if (y === 0 && x > 0) {
        return 0
    }
    if (y === 0 && x < 0) {
        return Math.PI
    }
    if (x === 0 && y > 0) {
        return Math.PI / 2
    }
    if (x === 0 && y < 0) {
        return -Math.PI / 2
    }
}