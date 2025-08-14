
import { MachineEvent } from "./dummy_interface.js"

type ClosingTimePayload = { timeOfDay: string }
type PartIDPayload = {partName: string}
type PosPayload = {position: string, partName: string}
type PartPayload = {partName: string}
type CarPayload = {partName: string, modelName: string}

export namespace Events {
  export const partID = MachineEvent.design('PartID').withPayload<PartIDPayload>()
  export const part = MachineEvent.design('Part').withPayload<PartPayload>()
  export const pos = MachineEvent.design('Pos').withPayload<PosPayload>()
  export const time = MachineEvent.design('Time').withPayload<ClosingTimePayload>()
  export const car = MachineEvent.design('Car').withPayload<CarPayload>()

  export const allEvents = [partID, part, pos, time, car] as const
}