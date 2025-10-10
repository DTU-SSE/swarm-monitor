import { Actyx } from '@actyx/sdk'
import { createMachineRunnerBT } from '@actyx/machine-runner'
import { Composition, carFactoryProtocol, subsCarFactory, WarehouseProtocol, getArgs, manifestFromArgs } from '../../protocol.js'
import { baseStation, s0, s2 } from '../../machines/warehouse_protocol/base_station.js'

// Adapted machine. Adapting here has no effect. Except that we can make a verbose machine.
const [baseStationAdapted, s0Adapted] = Composition.adaptMachine(WarehouseProtocol.baseStationRole, carFactoryProtocol, 3, subsCarFactory, [baseStation, s0]).data!

// Run the adapted machine
export async function main() {
  const argv = getArgs()
  const app = await Actyx.of(manifestFromArgs(argv))
  const tags = Composition.tagWithEntityId(argv.displayName)
  const machine = createMachineRunnerBT(app, tags, s0Adapted, undefined, baseStationAdapted)

  for await (const state of machine) {
    if (state.isLike(s2)) {
      state.cast().commands()?.giveGuidance()
    }
    if (state.isFinal()) {
      break
    }
  }
  app.dispose()
}

//main()