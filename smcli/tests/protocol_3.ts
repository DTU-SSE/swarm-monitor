import { MachineEvent } from "@actyx/machine-runner"

const a = "a"
type ClosingTimePayload = { timeOfDay: "typeof a" }
type PartIDPayload = {partName: "b"}
type PosPayload = {position: string, partName: string}
type PartPayload = {partName: string}
type CarPayload = {partName: string, modelName: string}

export namespace Events {
  export const partID = MachineEvent.design('partID').withPayload<PartIDPayload>()
  export const part = MachineEvent.design('part').withPayload<PartPayload>()
  export const pos = MachineEvent.design('pos').withPayload<PosPayload>()
  export const time = MachineEvent.design('time').withPayload<ClosingTimePayload>()
  export const car = MachineEvent.design('car').withPayload<CarPayload>()

  export const allEvents = [partID, part, pos, time, car] as const
}