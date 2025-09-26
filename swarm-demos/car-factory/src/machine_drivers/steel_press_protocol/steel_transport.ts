import { Actyx } from '@actyx/sdk'
import { createMachineRunnerBT } from '@actyx/machine-runner'
import { manifest, Composition, carFactoryProtocol, subsCarFactory, printState, getRandomInt, SteelPressProtocol } from '../../protocol.js'
import chalk from 'chalk';
import { s0, steelTransport } from '../../machines/steel_press_protocol/steel_transport.js';

// Adapted machine. Adapting here has no effect. Except that we can make a verbose machine.
const [steelTransportAdapted, s0Adapted] = Composition.adaptMachine(SteelPressProtocol.steelTransportRole, carFactoryProtocol, 0, subsCarFactory, [steelTransport, s0], true).data!

// Run the adapted machine
async function main() {
  const app = await Actyx.of(manifest)
  const tags = Composition.tagWithEntityId('car-factory')
  const machine = createMachineRunnerBT(app, tags, s0Adapted, undefined, steelTransportAdapted)
  printState(steelTransportAdapted.machineName, s0Adapted.mechanism.name, undefined)
  console.log(chalk.bgBlack.red.dim`    SteelRoll!`);

  for await (const state of machine) {
    if (state.isLike(s0)) {
      setTimeout(() => {
        const stateAfterTimeOut = machine.get()
        if (stateAfterTimeOut?.isLike(s0)) {
          console.log()
          stateAfterTimeOut?.cast().commands()?.pickUpSteelRoll()
        }
      }, getRandomInt(1000, 5000))
    }
  }
  app.dispose()
}

main()