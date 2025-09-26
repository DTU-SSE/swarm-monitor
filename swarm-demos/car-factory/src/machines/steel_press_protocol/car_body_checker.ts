import { Events, Composition, SteelPressProtocol } from './../../protocol.js'
import { checkComposedProjection } from '@actyx/machine-check';

// Using the machine runner DSL an implmentation of car body checker in the steel press protocol:
export const carBodyChecker = Composition.makeMachine(SteelPressProtocol.carBodyCheckerRole)
export const s0 = carBodyChecker.designEmpty('s0')
    .command(SteelPressProtocol.cmdCarBodyDone, [Events.carBody], () => {
    return [Events.carBody.make({ shape: "truck"})]
    })
    .finish()
export const s1 = carBodyChecker.designEmpty('s1').finish()
export const s2 = carBodyChecker.designEmpty('s2').finish()

s0.react([Events.steelRoll], s1, (_) => { return s1.make() })
s1.react([Events.partialCarBody], s0, (_) => { return s0.make() })
s0.react([Events.carBody], s2, (_) => { return s2.make() })

// Check that the original machine is a correct implementation. A prerequisite for reusing it.
const checkProjResult = checkComposedProjection([SteelPressProtocol.protocol], SteelPressProtocol.subscriptions, SteelPressProtocol.carBodyCheckerRole, carBodyChecker.createJSONForAnalysis(s0))
if (checkProjResult.type == 'ERROR') throw new Error(checkProjResult.errors.join(", \n"))