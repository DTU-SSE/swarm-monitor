type LarsElem1 = number
type Lars1 = LarsElem1[]
type Laquo1 = Lars1
type Boing1 = Laquo1

type Haha = string
export type PartReqPayload = {partName: Haha}
type ClosingTypeNested = { number: number[], other: Boing1}
export type ClosingTimePayload = { timeOfDay: string, nested: ClosingTypeNested; closing: ClosingTimePayload }

export const foo = (): number => 1

export type PosPayload = { position: string, partName: string, fromPayloadTypesTS: boolean }