//import { MachineEvent } from "./dummy_interface.js"
import { MachineEvent } from "@actyx/machine-runner"
import { PartReqPayload, type ClosingTimePayload, foo, PosPayload as MyPosPayload } from "./payload_types"
import { type ClosingTimePayload as ClosingTimePayload1 } from "./protocol_7"
import * as pTypes1 from "./payload_types1"

type LarsElem = number
type Lars = LarsElem[]
type Laquo = Lars
type Boing = Laquo
type PosPayload = {position: string, partName: string}
type PartOKPayload = {partName: string}
type CarPayload = {partName: string, modelName: string}
type SomeUnionType = string[] | boolean
type ShouldNotBeIncluded1 = string[] | boolean
type ShouldNotBeIncluded2 = number | ShouldNotBeIncluded1
type ShouldNotBeIncluded3 = { a: string, b: string, c: number | string }
type ShouldNotBeIncluded4 = {field1: number, field2: ShouldNotBeIncluded2}
type MyPartReqPayload = {field1: PartReqPayload, field2: number, field3: SomeUnionType }
type NestedClosingTime1 = { field1 :number, field2: ClosingTimePayload1}
const var1 = 'pos'
const posName = var1
const partReqName = 'partReq'
type ABC = ABC[] // what

export namespace Events {
  export const partReq = MachineEvent.design(partReqName).withPayload<MyPartReqPayload>()
  export const partOK = MachineEvent.design('partOK').withPayload<ClosingTimePayload>()
  export const pos = MachineEvent.design(posName).withPayload<PosPayload>()
  export const closingTime = MachineEvent.design('closingTime').withPayload<ClosingTimePayload>()
  export const car = MachineEvent.design('car').withPayload<CarPayload>()
  export const thing = MachineEvent.design('thing').withPayload<{name: string}>()
  export const partReq2 = MachineEvent.design('thing2').withPayload<MyPartReqPayload>()
  export const otherClosingTime = MachineEvent.design('otherClosingTime').withPayload<ClosingTimePayload1>()
  export const nestedClosing1 = MachineEvent.design('nestedClosing1').withPayload<NestedClosingTime1>()
  export const anotherEventType = MachineEvent.design('anotherEventType').withPayload<pTypes1.MyObject>()

  export namespace Events1 {
    type PosPayload = {position: string, partName: string, theOtherPosPayloadDoesNotHaveThisField: string}
    export const nestedPos = MachineEvent.design('Events1Pos').withPayload<PosPayload>()
    export namespace Events2 {
      type PosPayload = {position: string, partName: string, myFieeeeld: string[]}
      export const nestedPos = MachineEvent.design('Events2Pos').withPayload<PosPayload>()
      export namespace Events3 {
        export const nestedPos = MachineEvent.design('Events3Pos').withPayload<MyPosPayload>()
        export const nestedPos1 = MachineEvent.design('Events3Pos1').withPayload<MyPosPayload | CarPayload>()
      }
    }
  }

  export const noPayload = MachineEvent.design('noPayload')
  export const noPayload1 = MachineEvent.design('noPayload1').withoutPayload()

  export namespace EventsNested {
      export const noPayload11 = MachineEvent.design('noPayload11').withoutPayload()
  }

  export const allEvents = [partReq, partOK, pos, closingTime, car, Events1.nestedPos, Events1.Events2.nestedPos, Events1.Events2.Events3.nestedPos] as const
}