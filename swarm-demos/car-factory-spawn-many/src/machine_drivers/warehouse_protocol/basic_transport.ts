import { Actyx } from '@actyx/sdk'
import { createMachineRunnerBT } from '@actyx/machine-runner'
import { Composition, carFactoryProtocol, subsCarFactory, WarehouseProtocol, getRandomInt, getArgs, manifestFromArgs } from '../../protocol.js'
import { randomUUID } from 'crypto';
import { s0, s1, s2, s4, s5, transport, type Score } from '../../machines/warehouse_protocol/transport.js';

// Adapted machine. Adapting here has no effect. Except that we can make a verbose machine.
const [transportAdapted, s0Adapted] = Composition.adaptMachine(WarehouseProtocol.transportRole, carFactoryProtocol, 3, subsCarFactory, [transport, s0]).data!

// Run the adapted machine
export async function main() {
  const argv = getArgs()
  const app = await Actyx.of(manifestFromArgs(argv))
  const tags = Composition.tagWithEntityId(argv.displayName)
  const initialPayload = { id: randomUUID().slice(0, 8) }
  const bestTransport = (scores: Score[]) => scores.reduce((best, current) => current.delay <= best.delay ? current : best).transportId
  const machine = createMachineRunnerBT(app, tags, s0Adapted, initialPayload, transportAdapted)

  for await (const state of machine) {
    if (state.isLike(s1)) {
      const auctionState = state.cast()
      if (!auctionState.payload.scores.find((score) => score.transportId === auctionState.payload.id)) {
        auctionState.commands()?.bid(getRandomInt(1, 200))
      } else {
        setTimeout(() => {
          const stateAfterTimeOut = machine.get()
          if (stateAfterTimeOut?.isLike(s1)) {
            stateAfterTimeOut?.cast().commands()?.select(bestTransport(stateAfterTimeOut.payload.scores))
          }
        }, 1000)
      }
    } else if (state.isLike(s2)) {
      // Break out of loop if this transport did not win the auction
      const IamWinner = state.payload.id === state.payload.winner
      if (!IamWinner) { break }
      state.cast().commands()?.needGuidance()
    } else if (state.isLike(s4)) {
      state.cast().commands()?.basicPickup()
    } else if (state.isLike(s5)) {
      state.cast().commands()?.handover()
    }
    if (state.isFinal()) {
      break
    }
  }

  app.dispose()
}

//main()