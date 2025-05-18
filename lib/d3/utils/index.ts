import { GoogleTableData, GoogleTableDataPoint } from "./types"
const wait = (ms: number) =>  {
    return new Promise(resolve => setTimeout(resolve, ms))
}
const flatten = <T>(arr: Array<T>) => {
    return arr.reduce((acc, x: any) => acc.concat(x), [])
}
const checkObjEquality = <T extends object=any>(d1: T, d2: T): boolean => {
    return JSON.stringify(d1) === JSON.stringify(d2)
}
const shiftTableStart = (tables: GoogleTableData, shiftIndex: number, sortBy: "goals" | "points" = "points") => {
    if (shiftIndex >= tables.length) {
        throw new Error(`shift index (${shiftIndex}) cannot be greater than tables length ${tables.length} `)
    }
    const newTables = tables.slice(Math.max(shiftIndex, 0))
    const firstTableHash = newTables[0].results.reduce((hash, data) => {
        hash[data.team] = data
        return hash
    }, {} as Record<string, GoogleTableDataPoint>)

    return newTables.map(table => {
        return {
            matchDay: table.matchDay,
            results: table.results
                .map(data => {
                    const firstData = firstTableHash[data.team]
                    return {
                        team: data.team,
                        points: data.points - (shiftIndex < 0 ? 0: firstData.points),
                        goals: data.goals - (shiftIndex < 0 ? 0: firstData.goals)
                    }
                })
                .sort((a, b) => {
                    return b[sortBy] - a[sortBy]
                })
        }
    })
}
export {
    wait,
    flatten,
    checkObjEquality,
    shiftTableStart
}