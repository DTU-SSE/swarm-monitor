/* eslint-disable @typescript-eslint/no-namespace */
import { MachineEvent, SwarmProtocol } from '@actyx/machine-runner'
import { SwarmProtocolType, Subscriptions, Result, DataResult, overapproxWWFSubscriptions, checkWWFSwarmProtocol, InterfacingProtocols} from '@actyx/machine-check'
import chalk from "chalk";

export const manifest = {
  appId: 'com.example.car-factory',
  displayName: 'Car Factory',
  version: '1.0.0',
}
type Lars = number[]
type Laquo = boolean | string
type Boing = Laquo
type Haha = string
type ClosingTypeNested = { number: number[], other: Laquo}
type ClosingTimePayload = { timeOfDay: string, nested: ClosingTypeNested, closing: ClosingTimePayload }
type PartReqPayload = {partName: string}
type PosPayload = {position: string, partName: string}
type PartOKPayload = {partName: string}
type CarPayload = {partName: string, modelName: string}
const var1 = 'pos'
const posName = var1
const partReqName = 'partReq'
export namespace Events {
  export const partReq = MachineEvent.design(partReqName).withPayload<PartReqPayload>()
  export const partOK = MachineEvent.design('partOK').withPayload<PartOKPayload>()
  export const pos = MachineEvent.design(posName).withPayload<PosPayload>()
  export const closingTime = MachineEvent.design('closingTime').withPayload<ClosingTimePayload>()
  export const car = MachineEvent.design('car').withPayload<CarPayload>()
  export const thing = MachineEvent.design('thing').withPayload<{name: string}>()
  export const noPayload = MachineEvent.design('noPayload')
  export const noPayload1 = MachineEvent.design('noPayload1').withoutPayload()

  export const allEvents = [partReq, partOK, pos, closingTime, car] as const
}

export const Composition = SwarmProtocol.make('Composition', Events.allEvents)

export const Gwarehouse: SwarmProtocolType = {
  initial: '0',
  transitions: [
    {source: '0', target: '1', label: {cmd: 'request', role: 'T', logType: [Events.partReq.type]}},
    {source: '1', target: '2', label: {cmd: 'get', role: 'FL', logType: [Events.pos.type]}},
    {source: '2', target: '0', label: {cmd: 'deliver', role: 'T', logType: [Events.partOK.type]}},
    {source: '0', target: '3', label: {cmd: 'close', role: 'D', logType: [Events.closingTime.type]}},
  ]}

export const Gfactory: SwarmProtocolType = {
  initial: '0',
  transitions: [
    {source: '0', target: '1', label: { cmd: 'request', role: 'T', logType: [Events.partReq.type]}},
    {source: '1', target: '2', label: { cmd: 'deliver', role: 'T', logType: [Events.partOK.type]}},
    {source: '2', target: '3', label: { cmd: 'build', role: 'R', logType: [Events.car.type] }},
  ]}

export const warehouse_protocol: InterfacingProtocols = [Gwarehouse]

// Well-formed subscription for the warehouse protocol
const result_subs_warehouse: DataResult<Subscriptions>
  = overapproxWWFSubscriptions(warehouse_protocol, {}, 'TwoStep')
if (result_subs_warehouse.type === 'ERROR') throw new Error(result_subs_warehouse.errors.join(', '))
export var subs_warehouse: Subscriptions = result_subs_warehouse.data

// check that the subscription generated for the composition is indeed well-formed
const result_check_wf: Result = checkWWFSwarmProtocol(warehouse_protocol, subs_warehouse)
if (result_check_wf.type === 'ERROR') throw new Error(result_check_wf.errors.join(', \n'))

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random
export function getRandomInt(min: number, max: number) {
  const minCeiled = Math.ceil(min);
  const maxFloored = Math.floor(max);
  return Math.floor(Math.random() * (maxFloored - minCeiled) + minCeiled); // The maximum is exclusive and the minimum is inclusive
}

export const printState = (machineName: string, stateName: string, statePayload: any) => {
  console.log(chalk.bgBlack.white.bold`${machineName} - State: ${stateName}. Payload: ${statePayload ? JSON.stringify(statePayload, null, 0) : "{}"}`)
}