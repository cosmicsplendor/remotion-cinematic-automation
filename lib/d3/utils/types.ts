export type DeepFrozenObject<Obj=object> = {
    readonly [Key in keyof Obj]: DeepFrozenObject<Obj[Key]>
}
export type Constructor<T={}> = new (...args: any[]) => T
export type Nullable<T, NT extends undefined | null> = T | NT
export type NullableArg<T> = Nullable<T, undefined>
export type NullableProp<T> = Nullable<T, null>
export type Hash<T=any> = Record<string, T>
export type AnyFunction = (...args: any[]) => void
export type Dims = Record<"w" | "h" | "ml" | "mr" | "mt" | "mb", number>
export type GoogleTableDataPoint = { points: number, team: string, goals: number }
export type GoogleTableData = {
    matchDay: number,
    results: GoogleTableDataPoint[]
}[]