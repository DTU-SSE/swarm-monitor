import { Events, Composition, EngineInstallationProtocol } from './../../protocol.js'
import { checkComposedProjection } from '@actyx/machine-check';

type RequestEnginePayload = { shape: string }

// Using the machine runner DSL an implmentation of body assembler in the steel press protocol:
export const engineInstaller = Composition.makeMachine(EngineInstallationProtocol.engineInstallerRole)
export const s0 = engineInstaller.designEmpty('s0').finish()
export const s1 = engineInstaller.designState('s1')
    .withPayload<RequestEnginePayload>()
    .command(EngineInstallationProtocol.cmdRequestEngine, [Events.requestEngine], (ctx) => {
        const engine = ctx.self.shape === "truck" ? "truckEngine" : "basicEngine"
        return [Events.requestEngine.make({ item: engine, to: "myPosition" })]
    })
    .finish()
export const s2 = engineInstaller.designEmpty('s2').finish()
export const s3 = engineInstaller.designEmpty('s3')
    .command(EngineInstallationProtocol.cmdInstallEngine, [Events.engineInstalled], (_) => 
        [Events.engineInstalled.make({})])
    .finish()
export const s4 = engineInstaller.designEmpty('s4').finish()


s0.react([Events.paintedCarBody], s1, (_, event) => { return s1.make({ shape: event.payload.shape }) })
s1.react([Events.requestEngine], s2, (_) => { return s2.make() })
s2.react([Events.itemDelivery], s3, (_) => { return s3.make() })
s3.react([Events.engineInstalled], s4, (_) => { return s4.make() })

// Check that the original machine is a correct implementation. A prerequisite for reusing it.
const checkProjResult = checkComposedProjection([EngineInstallationProtocol.protocol], EngineInstallationProtocol.subscriptions, EngineInstallationProtocol.engineInstallerRole, engineInstaller.createJSONForAnalysis(s0))
if (checkProjResult.type == 'ERROR') throw new Error(checkProjResult.errors.join(", \n"))