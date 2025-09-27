import { Actyx } from '@actyx/sdk'
import { createMachineRunnerBT } from '@actyx/machine-runner'
import { manifest, Composition, carFactoryProtocol, subsCarFactory, printState, WarehouseProtocol } from '../../protocol.js'
import { baseStation, s0, s2 } from '../../machines/warehouse_protocol/base_station.js'

// Adapted machine. Adapting here has no effect. Except that we can make a verbose machine.
const [baseStationAdapted, s0Adapted] = Composition.adaptMachine(WarehouseProtocol.baseStationRole, carFactoryProtocol, 3, subsCarFactory, [baseStation, s0], true).data!

// Run the adapted machine
async function main() {
  const app = await Actyx.of(manifest)
  const tags = Composition.tagWithEntityId('car-factory')
  const machine = createMachineRunnerBT(app, tags, s0Adapted, undefined, baseStationAdapted)
  printState(baseStationAdapted.machineName, s0Adapted.mechanism.name, undefined)

  for await (const state of machine) {
    if (state.isLike(s2)) {
      setTimeout(() => {
        const stateAfterTimeOut = machine.get()
        if (stateAfterTimeOut?.isLike(s2)) {
          console.log()
          stateAfterTimeOut?.cast().commands()?.giveGuidance()
        }
      }, 1000)
    }
  }
  app.dispose()
}

main()