import { Actyx } from '@actyx/sdk'
import { createMachineRunnerBT } from '@actyx/machine-runner'
import { Composition, carFactoryProtocol, subsCarFactory, SteelPressProtocol, getArgs, manifestFromArgs } from '../../protocol.js'
import { bodyAssembler, s0, s1, s2 } from '../../machines/steel_press_protocol/body_assembler.js';

// Adapted machine. Adapting here has no effect. Except that we can make a verbose machine.
const [bodyAssemblerAdapted, s0Adapted] = Composition.adaptMachine(SteelPressProtocol.bodyAssemblerRole, carFactoryProtocol, 0, subsCarFactory, [bodyAssembler, s0]).data!

// Run the adapted machine
async function main() {
  const argv = getArgs()
  const app = await Actyx.of(manifestFromArgs(argv))
  const tags = Composition.tagWithEntityId(argv.displayName)
  const initialPayload = { parts: [] }
  const machine = createMachineRunnerBT(app, tags, s0Adapted, initialPayload, bodyAssemblerAdapted)

  for await (const state of machine) {
    if (state.isLike(s1)) {
      setTimeout(() => {
        const stateAfterTimeOut = machine.get()
        if (stateAfterTimeOut?.isLike(s2)) {
          stateAfterTimeOut?.cast().commands()?.assembleBody()
        }
      }, 1000)
    }
    if (state.isFinal()) {
      break
    }
  }
  app.dispose()
}

main()