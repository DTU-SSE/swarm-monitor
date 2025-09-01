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

export namespace Events {
  export const steelRoll = MachineEvent.design('SteelRoll').withoutPayload()
  export const steelParts = MachineEvent.design('SteelParts').withoutPayload()
  export const carBody = MachineEvent.design('CarBody').withPayload<CarBodyPayload>()

  export const allEvents = [steelRoll, steelParts, carBody] as const
}

export const Composition = SwarmProtocol.make('Composition', Events.allEvents)

export const steelPressProtocol: SwarmProtocolType = {
  initial: '0',
  transitions: [
    {source: '0', target: '1', label: {cmd: 'pickUpSteelRoll', role: 'Stamp', logType: [Events.steelRoll.type]}},
    {source: '1', target: '2', label: {cmd: 'pressSteel', role: 'Stamp', logType: [Events.steelParts.type]}},
    {source: '2', target: '3', label: {cmd: 'assembleBody', role: 'BodyAssembler', logType: [Events.carBody.type]}}
  ]}

const resultSubsSteelPress: DataResult<Subscriptions>
  = overapproxWWFSubscriptions([steelPressProtocol], {}, 'TwoStep')
if (resultSubsSteelPress.type === 'ERROR') throw new Error(resultSubsSteelPress.errors.join(', '))
export var subsSteelPress: Subscriptions = resultSubsSteelPress.data

export const carFactoryProtocol: InterfacingProtocols = [steelPressProtocol]
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