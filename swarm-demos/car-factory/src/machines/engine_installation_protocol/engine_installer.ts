import { Events, Composition, EngineInstallationProtocol } from './../../protocol.js'
import { checkComposedProjection } from '@actyx/machine-check';

type RequestEnginePayload = { shape: string }
/*
// Using the machine runner DSL an implmentation of body assembler in the steel press protocol:
export const engineInstaller = Composition.makeMachine(EngineInstallationProtocol.engineInstallerRole)
export const s0 = engineInstaller.designEmpty('s0').finish()
export const s1 = engineInstaller.designState('s1')
    .withPayload<RequestEnginePayload>()
    .command(EngineInstallationProtocol.cmdInstallEngine, [Events.requestEngine], (ctx) => {
        return [Events.requestEngine.make({ item: ctx.self.shape, color: color })]
    })
    .finish()
export const s2 = engineInstaller.designEmpty('s2')
    .finish()

s0.react([Events.carBody], s1, (_, event) => { return s1.make({ shape: event.payload.shape }) })
s1.react([Events.paintedBody], s2, (_) => { return s2.make() })

// Check that the original machine is a correct implementation. A prerequisite for reusing it.
const checkProjResult = checkComposedProjection([PaintShopProtocol.protocol], PaintShopProtocol.subscriptions, PaintShopProtocol.painterRole, engineInstaller.createJSONForAnalysis(s0))
if (checkProjResult.type == 'ERROR') throw new Error(checkProjResult.errors.join(", \n")) */