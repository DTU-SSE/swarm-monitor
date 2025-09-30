import { Actyx } from '@actyx/sdk'
import { createMachineRunnerBT } from '@actyx/machine-runner'
import { manifest, Composition, carFactoryProtocol, subsCarFactory, printState, WheelInstalationProtocol } from '../../protocol.js'
import { s0, s1, wheelChecker } from '../../machines/wheel_installation_protocol/wheel_checker.js'

// Adapted machine. Adapting here has no effect. Except that we can make a verbose machine.
const [wheelCheckerAdapted, s0Adapted] = Composition.adaptMachine(WheelInstalationProtocol.wheelCheckerRole, carFactoryProtocol, 4, subsCarFactory, [wheelChecker, s0], true).data!

// Run the adapted machine
async function main() {
  const app = await Actyx.of(manifest)
  const tags = Composition.tagWithEntityId('car-factory')
  const machine = createMachineRunnerBT(app, tags, s0Adapted, undefined, wheelCheckerAdapted)
  printState(wheelCheckerAdapted.machineName, s0Adapted.mechanism.name, undefined)

  for await (const state of machine) {
    if (state.isLike(s1)) {
        setTimeout(() => {
            const stateAfterTimeOut = machine.get()
            if (stateAfterTimeOut?.isLike(s1)) {
                stateAfterTimeOut?.cast().commands()?.checkWheels()
            }
        }, 1000)
    }
  }
  app.dispose()
}

main()