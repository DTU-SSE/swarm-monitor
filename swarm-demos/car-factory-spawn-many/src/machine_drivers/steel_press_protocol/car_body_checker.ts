import { Actyx } from '@actyx/sdk'
import { createMachineRunnerBT } from '@actyx/machine-runner'
import { Composition, carFactoryProtocol, subsCarFactory, SteelPressProtocol, NUMBER_OF_CAR_PARTS, getArgs, manifestFromArgs } from '../../protocol.js'
import { carBodyChecker, s0 } from '../../machines/steel_press_protocol/car_body_checker.js';

// Adapted machine. Adapting here has no effect. Except that we can make a verbose machine.
const [carBodyCheckerAdapted, s0Adapted] = Composition.adaptMachine(SteelPressProtocol.carBodyCheckerRole, carFactoryProtocol, 0, subsCarFactory, [carBodyChecker, s0]).data!

// Run the adapted machine
export async function main() {
  const argv = getArgs()
  const app = await Actyx.of(manifestFromArgs(argv))
  const tags = Composition.tagWithEntityId(argv.displayName)
  const initialPayload = { parts: [] }
  const machine = createMachineRunnerBT(app, tags, s0Adapted, initialPayload, carBodyCheckerAdapted)

  for await (const state of machine) {
    if (state.isLike(s0)) {
      const currentState = state.cast()
      if (currentState.payload.parts.length == NUMBER_OF_CAR_PARTS) {
        state.cast().commands()?.carBodyDone()
      }
    }
    if (state.isFinal()) {
      break
    }
  }
  app.dispose()
}

//main()