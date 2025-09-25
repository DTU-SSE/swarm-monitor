import { Actyx } from '@actyx/sdk'
import { createMachineRunnerBT } from '@actyx/machine-runner'
import { Events, manifest, Composition, carFactoryProtocol, subsCarFactory, printState, getRandomInt, PaintShopProtocol } from './protocol.js'
import { checkComposedProjection } from '@actyx/machine-check';

// Using the machine runner DSL an implmentation of body assembler in the steel press protocol:
const painter = Composition.makeMachine(PaintShopProtocol.painterRole)
export const s0 = painter.designEmpty('s0').finish()
export const s1 = painter.designState('s1')
    .withPayload<{shape: string}>()
    .command(PaintShopProtocol.cmdPaintBody, [Events.paintedBody], (ctx) => {
        return [Events.paintedBody.make({ shape: ctx.self.shape, color: "red" })]
    })
    .finish()
export const s2 = painter.designEmpty('s2')
    .finish()

s0.react([Events.carBody], s1, (_, event) => { return s1.make({ shape: event.payload.shape }) })
s1.react([Events.paintedBody], s2, (_) => { return s2.make() })

// Check that the original machine is a correct implementation. A prerequisite for reusing it.
const checkProjResult = checkComposedProjection([PaintShopProtocol.protocol], PaintShopProtocol.subscriptions, PaintShopProtocol.painterRole, painter.createJSONForAnalysis(s0))
if (checkProjResult.type == 'ERROR') throw new Error(checkProjResult.errors.join(", \n"))

// Adapted machine. Adapting here has no effect. Except that we can make a verbose machine.
const [bodyAssemblerAdapted, s0Adapted] = Composition.adaptMachine(PaintShopProtocol.painterRole, carFactoryProtocol, 1, subsCarFactory, [painter, s0], true).data!

// Run the adapted machine
async function main() {
  const app = await Actyx.of(manifest)
  const tags = Composition.tagWithEntityId('car-factory')
  const machine = createMachineRunnerBT(app, tags, s0Adapted, undefined, bodyAssemblerAdapted)
  printState(bodyAssemblerAdapted.machineName, s0Adapted.mechanism.name, undefined)

  for await (const state of machine) {
    if (state.isLike(s1)) {
      setTimeout(() => {
        const stateAfterTimeOut = machine.get()
        if (stateAfterTimeOut?.isLike(s1)) {
          console.log()
          stateAfterTimeOut?.cast().commands()?.paintBody()
        }
      }, getRandomInt(1000, 5000))
    }
  }
  app.dispose()
}

main()