import { MachineEvent } from "@actyx/machine-runner"
import { type ClosingTimePayload as ClosingTimePayload1 } from "./subfolder/protocol_7"
import { type ClosingTimePayload as ClosingTimePayload2 } from "./protocol_7"



type PosPayload = {position: string, partName: string}
type CarPayload = {partName: string, modelName: string}
//type SomeUnionType = string[] | boolean
const partReqName = 'partReq'


export namespace Events {
  export const partReq = MachineEvent.design(partReqName).withPayload<ClosingTimePayload1 | PosPayload>()
  export const partOK = MachineEvent.design('partOK').withPayload<ClosingTimePayload2 | CarPayload>()

  export const allEvents = [partReq, partOK] as const
}