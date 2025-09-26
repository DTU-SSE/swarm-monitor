import { Actyx } from '@actyx/sdk'
import { createMachineRunnerBT } from '@actyx/machine-runner'
import { manifest, Composition, carFactoryProtocol, subsCarFactory, printState, getRandomInt, SteelPressProtocol } from '../../protocol.js'
import { bodyAssembler, s0, s1, s2 } from '../../machines/steel_press_protocol/body_assembler.js';

// Adapted machine. Adapting here has no effect. Except that we can make a verbose machine.
const [bodyAssemblerAdapted, s0Adapted] = Composition.adaptMachine(SteelPressProtocol.bodyAssemblerRole, carFactoryProtocol, 0, subsCarFactory, [bodyAssembler, s0], true).data!

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
        if (stateAfterTimeOut?.isLike(s2)) {
          console.log()
          stateAfterTimeOut?.cast().commands()?.assembleBody()
        }
      }, getRandomInt(1000, 5000))
    }
  }
  app.dispose()
}

main()