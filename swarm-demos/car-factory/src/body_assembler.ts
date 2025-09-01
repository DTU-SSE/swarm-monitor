import { Actyx } from '@actyx/sdk'
import { createMachineRunnerBT } from '@actyx/machine-runner'
import { Events, manifest, Composition, carFactoryProtocol, subsCarFactory, printState, getRandomInt, steelPressProtocol, subsSteelPress } from './protocol.js'
import chalk from "chalk";
import { checkComposedProjection } from '@actyx/machine-check';

// Using the machine runner DSL an implmentation of body assembler in the steel press protocol:
const bodyAssembler = Composition.makeMachine('BodyAssembler')
export const s0 = bodyAssembler.designEmpty('s0').finish()
export const s1 = bodyAssembler.designEmpty('s1')
  .command('assembleBody', [Events.carBody], () => {
    return [Events.carBody.make({ shape: "truck" })]
  }).finish()
export const s2 = bodyAssembler.designEmpty('s2').finish()

s0.react([Events.steelParts], s1, (_) => { return s1.make() })
s1.react([Events.carBody], s2, (_) => { return s2.make() })

// Check that the original machine is a correct implementation. A prerequisite for reusing it.
const checkProjResult = checkComposedProjection([steelPressProtocol], subsSteelPress, "BodyAssembler", bodyAssembler.createJSONForAnalysis(s0))
if (checkProjResult.type == 'ERROR') throw new Error(checkProjResult.errors.join(", \n"))

// Adapted machine. Adapting here has no effect. Except that we can make a verbose machine.
const [bodyAssemblerAdapted, s0Adapted] = Composition.adaptMachine('BodyAssembler', carFactoryProtocol, 0, subsCarFactory, [bodyAssembler, s0], true).data!

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
          stateAfterTimeOut?.cast().commands()?.assembleBody()
        }
      }, getRandomInt(1000, 5000))
    }
  }
  app.dispose()
}

main()