import { MachineEvent } from "@actyx/machine-runner"

/*
    Three types with the same name. Test that they are treated as different types.
    They have fields with types that have the same name but are different.
    These should be treated as different types as well.

 */
import { type ClosingTimePayload } from "./payload_types"
import { type ClosingTimePayload as ClosingTimePayload1 } from "./subfolder/protocol_7"
import { type ClosingTimePayload as ClosingTimePayload2 } from "./protocol_7"

const closingTimeName = "ClosingTime"
const closingTimeName1 = "ClosingTime1"
const closingTimeName2 = "ClosingTime2"

export namespace Events {
    export const closingTime = MachineEvent.design(closingTimeName).withPayload<ClosingTimePayload>()
    export const closingTime1 = MachineEvent.design(closingTimeName1).withPayload<ClosingTimePayload1>()
    export const closingTime2 = MachineEvent.design(closingTimeName2).withPayload<ClosingTimePayload2>()
}