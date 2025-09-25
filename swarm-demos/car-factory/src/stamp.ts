import { Actyx } from '@actyx/sdk'
import { createMachineRunnerBT } from '@actyx/machine-runner'
import { Events, manifest, Composition, carFactoryProtocol, subsCarFactory, printState, getRandomInt, SteelPressProtocol } from './protocol.js'
import chalk from "chalk";
import { checkComposedProjection } from '@actyx/machine-check';

// Using the machine runner DSL an implmentation of stamp in the steel press protocol:
const stamp = Composition.makeMachine(SteelPressProtocol.stampRole)
export const s0 = stamp.designEmpty('s0')
  .command(SteelPressProtocol.cmdPickUpSteel, [Events.steelRoll], () => {
    return [Events.steelRoll.make({})]
  }).finish()
export const s1 = stamp.designEmpty('s1')
  .command(SteelPressProtocol.cmdPressSteel, [Events.steelParts], () => {
    return [Events.steelParts.make({})]
  }).finish()
export const s2 = stamp.designEmpty('s2').finish()

s0.react([Events.steelRoll], s1, (_) => { return s1.make() })
s1.react([Events.steelParts], s2, (_) => { return s2.make() })

// Check that the original machine is a correct implementation. A prerequisite for reusing it.
const checkProjResult = checkComposedProjection([SteelPressProtocol.protocol], SteelPressProtocol.subscriptions, SteelPressProtocol.stampRole, stamp.createJSONForAnalysis(s0))
if (checkProjResult.type == 'ERROR') throw new Error(checkProjResult.errors.join(", \n"))

// Adapted machine. Adapting here has no effect. Except that we can make a verbose machine.
const [stampAdapted, s0Adapted] = Composition.adaptMachine(SteelPressProtocol.stampRole, carFactoryProtocol, 0, subsCarFactory, [stamp, s0], true).data!

// Run the adapted machine
async function main() {
  const app = await Actyx.of(manifest)
  const tags = Composition.tagWithEntityId('car-factory')
  const machine = createMachineRunnerBT(app, tags, s0Adapted, undefined, stampAdapted)
  printState(stampAdapted.machineName, s0Adapted.mechanism.name, undefined)
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
    if (state.isLike(s1)) {
      setTimeout(() => {
        const stateAfterTimeOut = machine.get()
        if (stateAfterTimeOut?.isLike(s1)) {
          console.log()
          stateAfterTimeOut?.cast().commands()?.pressSteel()
        }
      }, getRandomInt(1000, 5000))
    }
  }
  app.dispose()
}

main()