import { Actyx } from '@actyx/sdk'
import { createMachineRunnerBT } from '@actyx/machine-runner'
import { manifest, Composition, carFactoryProtocol, subsCarFactory, printState, WheelInstalationProtocol } from '../../protocol.js'
import { s0, s1, s2, wheelInstaller } from '../../machines/wheel_installation_protocol/wheel_installer.js'

// Adapted machine. Adapting here has no effect. Except that we can make a verbose machine.
const [wheelInstallerAdapted, s0Adapted] = Composition.adaptMachine(WheelInstalationProtocol.wheelInstallerRole, carFactoryProtocol, 4, subsCarFactory, [wheelInstaller, s0], true).data!

// Run the adapted machine
async function main() {
  const app = await Actyx.of(manifest)
  const tags = Composition.tagWithEntityId('car-factory')
  const machine = createMachineRunnerBT(app, tags, s0Adapted, undefined, wheelInstallerAdapted)
  printState(wheelInstallerAdapted.machineName, s0Adapted.mechanism.name, undefined)

  for await (const state of machine) {
    if (state.isLike(s1)) {
      setTimeout(() => {
        const stateAfterTimeOut = machine.get()
        if (stateAfterTimeOut?.isLike(s1)) {
          console.log()
          const shape = stateAfterTimeOut.payload.shape
          const numWheels = stateAfterTimeOut.payload.numWheels
          if (  shape === "truck" && numWheels == 6 ||
                shape === "sedan" && numWheels == 4) {
            stateAfterTimeOut?.cast().commands()?.wheelsDone()
          } else {
            stateAfterTimeOut?.cast().commands()?.pickUpWheel()
          }
        }
      }, 1000)
    } else if (state.isLike(s2)) {
        setTimeout(() => {
            const stateAfterTimeOut = machine.get()
            if (stateAfterTimeOut?.isLike(s2)) {
                stateAfterTimeOut?.cast().commands()?.installWheel()
            }
        }, 1000)
    }
  }
  app.dispose()
}

main()