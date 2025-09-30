import { Events, Composition, WheelInstalationProtocol, type WheelInstallationPayload } from '../../protocol.js'
import { checkComposedProjection } from '@actyx/machine-check';

export const wheelChecker = Composition.makeMachine(WheelInstalationProtocol.wheelCheckerRole)
export const s0 = wheelChecker.designEmpty('s0').finish()
export const s1 = wheelChecker.designState('s1')
    .withPayload<WheelInstallationPayload>()
    .command(WheelInstalationProtocol.cmdCheckWheels, [Events.wheelsChecked], (ctx) => {
            return [Events.wheelsChecked.make(ctx.self)]
        })
    .finish()
export const s2 = wheelChecker.designState('s2')
    .withPayload<WheelInstallationPayload>()
    .finish()

s0.react([Events.wheelPickup], s0, () => { return s0.make()})
s0.react([Events.wheelsDone], s1, (_, event) => {
    const {shape, color, engine, numWheels} = event.payload;
    return s1.make({shape, color, engine, numWheels})})
s1.react([Events.wheelsChecked], s2, (ctx) => { return s2.make(ctx.self)})

// Check that the original machine is a correct implementation. A prerequisite for reusing it.
const checkProjResult = checkComposedProjection([WheelInstalationProtocol.protocol], WheelInstalationProtocol.subscriptions, WheelInstalationProtocol.wheelCheckerRole, wheelChecker.createJSONForAnalysis(s0))
if (checkProjResult.type == 'ERROR') throw new Error(checkProjResult.errors.join(", \n"))