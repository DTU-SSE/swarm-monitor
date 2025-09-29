import { Events, Composition, WheelInstalationProtocol, type FinishedCarPayload } from './../../protocol.js'
import { checkComposedProjection } from '@actyx/machine-check';

export const qualityTransport = Composition.makeMachine(WheelInstalationProtocol.qualityTransportRole)
export const s0 = qualityTransport.designEmpty('s0').finish()
export const s1 = qualityTransport.designState('s1')
    .withPayload<FinishedCarPayload>()
    .command(WheelInstalationProtocol.cmdCarDone, [Events.finishedCar], (ctx) => {
            return [Events.finishedCar.make(ctx.self)]
        })
    .finish()
export const s2 = qualityTransport.designEmpty('s2').finish()

s0.react([Events.wheelPickup], s0, () => { return s0.make()})
s0.react([Events.wheelsDone], s1, (_, event) => { 
    const {shape, color, engine, numWheels, numWindows} = event.payload;
    return s1.make({shape, color, engine, numWheels, numWindows})})
s1.react([Events.finishedCar], s2, () => { return s2.make()})

// Check that the original machine is a correct implementation. A prerequisite for reusing it.
const checkProjResult = checkComposedProjection([WheelInstalationProtocol.protocol], WheelInstalationProtocol.subscriptions, WheelInstalationProtocol.qualityTransportRole, qualityTransport.createJSONForAnalysis(s0))
if (checkProjResult.type == 'ERROR') throw new Error(checkProjResult.errors.join(", \n"))