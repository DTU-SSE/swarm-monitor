import { Actyx } from '@actyx/sdk'
import { createMachineRunnerBT } from '@actyx/machine-runner'
import { Composition, carFactoryProtocol, subsCarFactory, WindowInstallationProtocol, getArgs, manifestFromArgs } from '../../protocol.js'
import { s0, s1, windowChecker } from '../../machines/window_installation_protocol/window_checker.js'

// Adapted machine. Adapting here has no effect. Except that we can make a verbose machine.
const [windowCheckerAdapted, s0Adapted] = Composition.adaptMachine(WindowInstallationProtocol.windowCheckerRole, carFactoryProtocol, 5, subsCarFactory, [windowChecker, s0]).data!

// Run the adapted machine
export async function main() {
  const argv = getArgs()
  const app = await Actyx.of(manifestFromArgs(argv))
  const tags = Composition.tagWithEntityId(argv.displayName)
  const machine = createMachineRunnerBT(app, tags, s0Adapted, undefined, windowCheckerAdapted)

  for await (const state of machine) {
    if (state.isLike(s1)) {
      const currentState = state.cast()
      const shape = currentState.payload.shape
      const numWindows = currentState.payload.numWindows
      if (shape === "truck" && numWindows == 3 ||
          shape === "sedan" && numWindows == 4) {
        currentState.commands()?.windowsDone()
      }
    }
    if (state.isFinal()) {
      break
    }
  }
  app.dispose()
}

//main()