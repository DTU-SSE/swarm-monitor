import { Actyx } from '@actyx/sdk'
import { createMachineRunnerBT } from '@actyx/machine-runner'
import { Composition, carFactoryProtocol, subsCarFactory, QualityControlProtocol, getArgs, manifestFromArgs } from '../../protocol.js'
import { qualityControl, s0, s1 } from '../../machines/quality_control_protocol/quality_control.js'

// Adapted machine. Adapting here has no effect. Except that we can make a verbose machine.
const [qualityControlAdapted, s0Adapted] = Composition.adaptMachine(QualityControlProtocol.qualityControlRole, carFactoryProtocol, 6, subsCarFactory, [qualityControl, s0]).data!

// Run the adapted machine
export async function main() {
  const argv = getArgs()
  const app = await Actyx.of(manifestFromArgs(argv))
  const tags = Composition.tagWithEntityId(argv.displayName)
  const machine = createMachineRunnerBT(app, tags, s0Adapted, undefined, qualityControlAdapted)

  for await (const state of machine) {
    if (state.isLike(s1)) {
      if (state.payload.wheelsChecked
        && state.payload.windowsChecked) {
        state.cast().commands()?.checkCar()
      }
    }
    if (state.isFinal()) {
      break
    }
  }
  app.dispose()
}

//main()