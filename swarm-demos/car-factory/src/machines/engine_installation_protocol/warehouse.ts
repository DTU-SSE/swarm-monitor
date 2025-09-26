import { Events, Composition, EngineInstallationProtocol } from './../../protocol.js'
import { checkComposedProjection } from '@actyx/machine-check';

type RequestEnginePayload = { shape: string }

// Using the machine runner DSL an implmentation of body assembler in the steel press protocol:
export const warehouse = Composition.makeMachine(EngineInstallationProtocol.warehouseRole)
/* export const s0 = warehouse.designEmpty('s0').finish()
export const s1 = warehouse.designState('s1')
    .withPayload<RequestEnginePayload>()
    .command(EngineInstallationProtocol.cmdInstallEngine, [Events.requestEngine], (ctx) => {
        const engine = ctx.self.shape === "truck" ? "truckEngine" : "basicEngine"
        return [Events.requestEngine.make({ item: engine, to: "myPosition" })]
    })
    .finish()
export const s2 = warehouse.designEmpty('s2').finish()
export const s3 = warehouse.designEmpty('s3')
    .command(EngineInstallationProtocol.cmdInstallEngine, [Events.engineInstalled], (ctx) => [Events.engineInstalled.make({})])
    .finish()
export const s4 = warehouse.designEmpty('s4').finish()


s0.react([Events.paintedCarBody], s1, (_, event) => { return s1.make({ shape: event.payload.shape }) })
s1.react([Events.requestEngine], s2, (_) => { return s2.make() })
s2.react([Events.itemDelivery], s2, (_) => { return s3.make() })
s3.react([Events.engineInstalled], s2, (_) => { return s4.make() })

// Check that the original machine is a correct implementation. A prerequisite for reusing it.
const checkProjResult = checkComposedProjection([EngineInstallationProtocol.protocol], EngineInstallationProtocol.subscriptions, EngineInstallationProtocol.warehouseRole, warehouse.createJSONForAnalysis(s0))
if (checkProjResult.type == 'ERROR') throw new Error(checkProjResult.errors.join(", \n")) */