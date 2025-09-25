/* eslint-disable @typescript-eslint/no-namespace */
import { MachineEvent, SwarmProtocol } from '@actyx/machine-runner'
import { type SwarmProtocolType, type Subscriptions, type Result, type DataResult, overapproxWWFSubscriptions, checkWWFSwarmProtocol, type InterfacingProtocols} from '@actyx/machine-check'
import chalk from "chalk";

export const manifest = {
  appId: 'com.example.car-factory',
  displayName: 'Car Factory',
  version: '1.0.0',
}
type CarBodyPayload = { shape: string }
type PaintedBodyPayload = { shape: string, color: string }

export namespace Events {
  export const steelRoll = MachineEvent.design('SteelRoll').withoutPayload()
  export const steelParts = MachineEvent.design('SteelParts').withoutPayload()
  export const carBody = MachineEvent.design('CarBody').withPayload<CarBodyPayload>()
  export const paintedBody = MachineEvent.design('PaintedBody').withPayload<PaintedBodyPayload>()

  export const allEvents = [steelRoll, steelParts, carBody, paintedBody] as const
}

export const Composition = SwarmProtocol.make('Composition', Events.allEvents)

export namespace SteelPressProtocol {
  const initial = "0"
  const steelPickedUp = "1"
  const steelPressed = "2"
  const bodyAssembled = "3"
  export const stampRole = "Stamp"
  export const bodyAssemblerRole = "BodyAssembler"
  export const cmdPickUpSteel = "pickUpSteelRoll"
  export const cmdPressSteel = "pressSteel"
  export const cmdAssembleBody = "assembleBody"

  export const protocol: SwarmProtocolType = {
  initial: initial,
  transitions: [
    {source: initial, target: steelPickedUp, label: {cmd: cmdPickUpSteel, role: stampRole, logType: [Events.steelRoll.type]}},
    {source: steelPickedUp, target: steelPressed, label: {cmd: cmdPressSteel, role: stampRole, logType: [Events.steelParts.type]}},
    {source: steelPressed, target: bodyAssembled, label: {cmd: cmdAssembleBody, role: bodyAssemblerRole, logType: [Events.carBody.type]}}
  ]}

  const subscriptionsResult: DataResult<Subscriptions>
    = overapproxWWFSubscriptions([protocol], {}, 'TwoStep')
  if (subscriptionsResult.type === 'ERROR') throw new Error(subscriptionsResult.errors.join(', '))
  export const subscriptions: Subscriptions = subscriptionsResult.data
}

export namespace PaintShopProtocol {
  const initial = "0"
  const bodyAssembled = "1"
  const bodyPainted = "2"
  export const bodyAssemblerRole = "BodyAssembler"
  export const painterRole = "Painter"
  export const cmdAssembleBody = "assembleBody"
  export const cmdPaintBody = "paintBody"

  export const protocol: SwarmProtocolType = {
    initial: initial,
    transitions: [
      {source: initial, target: bodyAssembled, label: {cmd: cmdAssembleBody, role: bodyAssemblerRole, logType: [Events.carBody.type]}},
      {source: bodyAssembled, target: bodyPainted, label: {cmd: cmdPaintBody, role: painterRole, logType: [Events.paintedBody.type]}},
    ]}

  const subscriptionsResult: DataResult<Subscriptions>
    = overapproxWWFSubscriptions([protocol], {}, 'TwoStep')
  if (subscriptionsResult.type === 'ERROR') throw new Error(subscriptionsResult.errors.join(', '))
  export const subscriptions: Subscriptions = subscriptionsResult.data
}

export const carFactoryProtocol: InterfacingProtocols = [SteelPressProtocol.protocol, PaintShopProtocol.protocol]
// Well-formed subscription for the composition protocol
const resultSubsCarFactory: DataResult<Subscriptions>
  = overapproxWWFSubscriptions(carFactoryProtocol, {}, 'TwoStep')
if (resultSubsCarFactory.type === 'ERROR') throw new Error(resultSubsCarFactory.errors.join(', '))
export var subsCarFactory: Subscriptions = resultSubsCarFactory.data

// check that the subscription generated for the composition is indeed well-formed
const resultCheckWf: Result = checkWWFSwarmProtocol(carFactoryProtocol, subsCarFactory)
if (resultCheckWf.type === 'ERROR') throw new Error(resultCheckWf.errors.join(', \n'))

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random
export function getRandomInt(min: number, max: number) {
  const minCeiled = Math.ceil(min);
  const maxFloored = Math.floor(max);
  return Math.floor(Math.random() * (maxFloored - minCeiled) + minCeiled); // The maximum is exclusive and the minimum is inclusive
}

export const printState = (machineName: string, stateName: string, statePayload: any) => {
  console.log(chalk.bgBlack.white.bold`${machineName} - State: ${stateName}. Payload: ${statePayload ? JSON.stringify(statePayload, null, 0) : "{}"}`)
}