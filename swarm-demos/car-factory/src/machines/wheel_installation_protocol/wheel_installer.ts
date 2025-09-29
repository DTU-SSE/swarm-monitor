import { Events, Composition, WheelInstalationProtocol, type FinishedCarPayload } from './../../protocol.js'
import { checkComposedProjection } from '@actyx/machine-check';

export const wheelInstaller = Composition.makeMachine(WheelInstalationProtocol.wheelInstallerRole)
export const s0 = wheelInstaller.designEmpty('s0').finish()
export const s1 = wheelInstaller.designState('s1')
    .withPayload<FinishedCarPayload>()
    .command(WheelInstalationProtocol.cmdPickUpWheel, [Events.wheelPickup], (ctx) => {
            return [Events.wheelPickup.make(ctx.self)]
        })
    .command(WheelInstalationProtocol.cmdWheelsDone, [Events.wheelsDone], (ctx) => {
        return [Events.wheelsDone.make(ctx.self)]
    })
    .finish()
export const s2 = wheelInstaller.designState('s2')
    .withPayload<FinishedCarPayload>()
    .command(WheelInstalationProtocol.cmdInstallWheel, [Events.wheelInstalled], (ctx) => {
            return [Events.wheelInstalled.make({...ctx.self, numWheels: ctx.self.numWheels + 1})]
        })
    .finish()
export const s3 = wheelInstaller.designEmpty('s3').finish()

s0.react([Events.engineChecked], s1, (_, event) => { return s1.make(
    { shape: event.payload.shape, color: event.payload.color, engine: event.payload.engine, numWheels: 0, numWindows: 0}
)})
s1.react([Events.wheelPickup], s2, (_, event) => { 
    const {shape, color, engine, numWheels, numWindows} = event.payload;
    return s2.make({shape, color, engine, numWheels, numWindows})})
s2.react([Events.wheelInstalled], s1, (_, event) => { 
    const {shape, color, engine, numWheels, numWindows} = event.payload;
    return s1.make({shape, color, engine, numWheels, numWindows})})
s1.react([Events.wheelsDone], s3, () => { return s3.make()})

// Check that the original machine is a correct implementation. A prerequisite for reusing it.
const checkProjResult = checkComposedProjection([WheelInstalationProtocol.protocol], WheelInstalationProtocol.subscriptions, WheelInstalationProtocol.wheelInstallerRole, wheelInstaller.createJSONForAnalysis(s0))
if (checkProjResult.type == 'ERROR') throw new Error(checkProjResult.errors.join(", \n"))