import { MachineEvent } from "@actyx/machine-runner"

type ClosingTypeNested = { strings: string[], booleanField: boolean }
export type ClosingTimePayload = { timeOfDay: string | number, nested: ClosingTypeNested}
type PartReqPayload = {partName: string, aNestedField: { a: string, b: string, c: { number: boolean[], other: number}}}
type PosPayload = {position: string, partName: string}
type PartOKPayload = {partName: string}
type CarPayload = {partName: string, modelName: string}
const var1 = 'pos'
const posName = var1
const partReqName = 'partReq'
export namespace Events {
  export const partReq = MachineEvent.design(partReqName).withPayload<PartReqPayload>()
  export const partOK = MachineEvent.design('partOK').withPayload<PartOKPayload>()
  export const pos = MachineEvent.design(posName).withPayload<PosPayload>()
  export const closingTime = MachineEvent.design('closingTime').withPayload<ClosingTimePayload>()
  export const car = MachineEvent.design('car').withPayload<CarPayload>()
  export const thing = MachineEvent.design('thing').withPayload<{name: string}>()
  export const noPayload = MachineEvent.design('noPayload')
  export const noPayload1 = MachineEvent.design('noPayload1').withoutPayload()

  export const allEvents = [partReq, partOK, pos, closingTime, car] as const
}