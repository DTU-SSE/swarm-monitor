import { Actyx } from '@actyx/sdk'
import { createMachineRunnerBT } from '@actyx/machine-runner'
import { Composition, carFactoryProtocol, subsCarFactory, printState, EngineInstallationProtocol, manifestFromArgs, getArgs } from '../../protocol.js'
import { s0, s1, s2, warehouse } from '../../machines/engine_installation_protocol/warehouse.js'

// Adapted machine. Adapting here has no effect. Except that we can make a verbose machine.
const [warehouseAdapted, s0Adapted] = Composition.adaptMachine(EngineInstallationProtocol.warehouseRole, carFactoryProtocol, 2, subsCarFactory, [warehouse, s0]).data!

// Run the adapted machine
export async function main() {
  const argv = getArgs()
  const app = await Actyx.of(manifestFromArgs(argv))
  const tags = Composition.tagWithEntityId(argv.displayName)
  const machine = createMachineRunnerBT(app, tags, s0Adapted, undefined, warehouseAdapted)

  for await (const state of machine) {
    if (state.isLike(s1)) {
      state.cast().commands()?.request()
    } else if (state.isLike(s2)) {
      state.cast().commands()?.deliver()
    }
    if (state.isFinal()) {
      break
    }
  }
  app.dispose()
}

//main()