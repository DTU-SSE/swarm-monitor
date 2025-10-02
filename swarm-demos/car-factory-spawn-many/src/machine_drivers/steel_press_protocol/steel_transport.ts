import { Actyx } from '@actyx/sdk'
import { createMachineRunnerBT } from '@actyx/machine-runner'
import { Composition, carFactoryProtocol, subsCarFactory, SteelPressProtocol, NUMBER_OF_CAR_PARTS, getArgs, manifestFromArgs } from '../../protocol.js'
import { s0, steelTransport } from '../../machines/steel_press_protocol/steel_transport.js';

// Adapted machine. Adapting here has no effect. Except that we can make a verbose machine.
const [steelTransportAdapted, s0Adapted] = Composition.adaptMachine(SteelPressProtocol.steelTransportRole, carFactoryProtocol, 0, subsCarFactory, [steelTransport, s0]).data!

// Run the adapted machine
async function main() {
  const argv = getArgs()
  const app = await Actyx.of(manifestFromArgs(argv))
  const tags = Composition.tagWithEntityId(argv.displayName)
  const initialPayload = { steelRollsDelivered: 0 }
  const machine = createMachineRunnerBT(app, tags, s0Adapted, initialPayload, steelTransportAdapted)

  for await (const state of machine) {
    if (state.isLike(s0)) {
      setTimeout(() => {
        const stateAfterTimeOut = machine.get()
        if (stateAfterTimeOut?.isLike(s0) && state.cast().payload.steelRollsDelivered < NUMBER_OF_CAR_PARTS) {
          stateAfterTimeOut?.cast().commands()?.pickUpSteelRoll()
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