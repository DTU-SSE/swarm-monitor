import { Events, Composition, SteelPressProtocol } from './../../protocol.js'
import { checkComposedProjection } from '@actyx/machine-check';

// Using the machine runner DSL an implmentation of steel transport in the steel press protocol:
export const steelTransport = Composition.makeMachine(SteelPressProtocol.steelTransportRole)
export const s0 = steelTransport.designEmpty('s0')
    .command(SteelPressProtocol.cmdPickUpSteel, [Events.steelRoll], () => {
    return [Events.steelRoll.make({})]
  })
  .finish()
export const s1 = steelTransport.designEmpty('s1').finish()
export const s2 = steelTransport.designEmpty('s2').finish()

s0.react([Events.steelRoll], s1, (_) => { return s1.make() })
s1.react([Events.partialCarBody], s0, (_) => { return s0.make() })
s0.react([Events.carBody], s2, (_) => { return s2.make() })

// Check that the original machine is a correct implementation. A prerequisite for reusing it.
const checkProjResult = checkComposedProjection([SteelPressProtocol.protocol], SteelPressProtocol.subscriptions, SteelPressProtocol.steelTransportRole, steelTransport.createJSONForAnalysis(s0))
if (checkProjResult.type == 'ERROR') throw new Error(checkProjResult.errors.join(", \n"))