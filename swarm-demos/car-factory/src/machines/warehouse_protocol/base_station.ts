import { Events, Composition, WarehouseProtocol } from '../../protocol.js'
import { checkComposedProjection } from '@actyx/machine-check';

type GiveGuidancePayload = { item: string, to: string}

// Using the machine runner DSL an implmentation of body assembler in the steel press protocol:
export const baseStation = Composition.makeMachine(WarehouseProtocol.baseStationRole)
export const s0 = baseStation.designEmpty('s0').finish()
export const s1 = baseStation.designEmpty('s1').finish()
export const s2 = baseStation.designEmpty('s2').finish()


// Check that the original machine is a correct implementation. A prerequisite for reusing it.
const checkProjResult = checkComposedProjection([WarehouseProtocol.protocol], WarehouseProtocol.subscriptions, WarehouseProtocol.transportRole, baseStation.createJSONForAnalysis(s0))
if (checkProjResult.type == 'ERROR') throw new Error(checkProjResult.errors.join(", \n"))