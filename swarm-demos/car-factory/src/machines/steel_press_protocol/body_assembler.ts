import { Events, Composition, SteelPressProtocol } from './../../protocol.js'
import { checkComposedProjection } from '@actyx/machine-check';

// Using the machine runner DSL an implmentation of body assembler in the steel press protocol:
export const bodyAssembler = Composition.makeMachine(SteelPressProtocol.bodyAssemblerRole)
export const s0 = bodyAssembler.designEmpty('s0').finish()
export const s1 = bodyAssembler.designEmpty('s1').finish()
export const s2 = bodyAssembler.designEmpty('s2')
  .command(SteelPressProtocol.cmdAssembleBody, [Events.partialCarBody], () => {
    return [Events.partialCarBody.make({ shape: "truck" })]
  }).finish()
export const s3 = bodyAssembler.designEmpty('s3').finish()

s0.react([Events.steelRoll], s1, (_) => { return s1.make() })
s1.react([Events.steelParts], s2, (_) => { return s2.make() })
s2.react([Events.partialCarBody], s0, (_) => { return s0.make() })
s0.react([Events.carBody], s3, (_) => { return s3.make() })

// Check that the original machine is a correct implementation. A prerequisite for reusing it.
const checkProjResult = checkComposedProjection([SteelPressProtocol.protocol], SteelPressProtocol.subscriptions, SteelPressProtocol.bodyAssemblerRole, bodyAssembler.createJSONForAnalysis(s0))
if (checkProjResult.type == 'ERROR') throw new Error(checkProjResult.errors.join(", \n"))