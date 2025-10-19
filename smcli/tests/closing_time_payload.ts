type LarsElem1 = number
type Lars1 = LarsElem1[]
type Laquo1 = Lars1
type Boing1 = Laquo1


type ClosingTypeNested = { number: number[], other: Boing1}
export type ClosingTimePayload = { timeOfDay: string, nested: ClosingTypeNested, closing: ClosingTimePayload }