//import { MachineEvent } from "./dummy_interface.js"
import { MachineEvent } from "@actyx/machine-runner"
import { type ClosingTimePayload } from "./closing_time_payload"

type LarsElem = number
type Lars = LarsElem[]
type Laquo = Lars
type Boing = Laquo
type Haha = string
type PartReqPayload = {partName: Haha}
type PosPayload = {position: string, partName: string}
type PartOKPayload = {partName: string}
type CarPayload = {partName: string, modelName: string}
type ShouldNotBeIncluded1 = string[] | boolean
type ShouldNotBeIncluded2 = number | ShouldNotBeIncluded1
type ShouldNotBeIncluded3 = { a: string, b: string, c: number | string }
type ShouldNotBeIncluded4 = {field1: number, field2: ShouldNotBeIncluded2}

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

  export namespace EventsNested {
      export const noPayload11 = MachineEvent.design('noPayload11').withoutPayload()
  }

  export const allEvents = [partReq, partOK, pos, closingTime, car] as const
}