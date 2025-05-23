type EasingFns = {
    [Key: string]: (x: number) => number
}
let seed = 0
export const randomSeed = (newSeed: number) => {
    seed = newSeed
}
export const seededRand = (to: number, from = 0) => {
    seed = (seed * 9301 + 49297) % 233280
    const rnd = seed / 233280
    return from + Math.floor((to - from + 1) * rnd)
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
    return { x: y / length, y: -x / length }
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
        return x * x
    },
    quadOut(x) {
        return 1 - this.quadIn(x - 1)
    },
    quadInOut(x) {
        return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
    },
    cubicIn(x) {
        return x * x * x
    },
    cubicOut(x) {
        return 1 - this.cubicIn(1 - x)
    },
    cubicInOut(x) {
        return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
    },
    sineIn(x) {
        return 1 - Math.cos((x * Math.PI) / 2);
    },
    sineOut(x) {
        return Math.sin((x * Math.PI) / 2);
    },
    sineInOut(x) {
        return -(Math.cos(Math.PI * x) - 1) / 2;
    },
    smoothStep(x) {
        return x * x * (3 - 2 * x)
    }
}