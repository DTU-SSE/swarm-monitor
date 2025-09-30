import { Events, Composition, WindowInstalationProtocol, type WindowInstallationPayload } from '../../protocol.js'
import { checkComposedProjection } from '@actyx/machine-check';

export const windowChecker = Composition.makeMachine(WindowInstalationProtocol.windowCheckerRole)
export const s0 = windowChecker.designEmpty('s0').finish()
export const s1 = windowChecker.designState('s1')
    .withPayload<WindowInstallationPayload>()
    .command(WindowInstalationProtocol.cmdCheckWindows, [Events.windowsChecked], (ctx) => {
            return [Events.windowsChecked.make(ctx.self)]
        })
    .finish()
export const s2 = windowChecker.designState('s2')
    .withPayload<WindowInstallationPayload>()
    .finish()

s0.react([Events.windowPickup], s0, () => { return s0.make()})
s0.react([Events.windowsDone], s1, (_, event) => {
    const {shape, color, engine, numWindows} = event.payload;
    return s1.make({shape, color, engine, numWindows})})
s1.react([Events.windowsChecked], s2, (ctx) => { return s2.make(ctx.self)})

// Check that the original machine is a correct implementation. A prerequisite for reusing it.
const checkProjResult = checkComposedProjection([WindowInstalationProtocol.protocol], WindowInstalationProtocol.subscriptions, WindowInstalationProtocol.windowCheckerRole, windowChecker.createJSONForAnalysis(s0))
if (checkProjResult.type == 'ERROR') throw new Error(checkProjResult.errors.join(", \n"))