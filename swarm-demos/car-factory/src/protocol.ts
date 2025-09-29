/* eslint-disable @typescript-eslint/no-namespace */
import { MachineEvent, SwarmProtocol } from '@actyx/machine-runner'
import { type SwarmProtocolType, type Subscriptions, type Result, type DataResult, overapproxWFSubscriptions, checkComposedSwarmProtocol, type InterfacingProtocols} from '@actyx/machine-check'
import chalk from "chalk";

export const manifest = {
  appId: 'com.example.car-factory',
  displayName: 'Car Factory',
  version: '1.0.0',
}

export type SteelPartsPayload = { part: string }
export type PartialCarBodyPayload = { parts: string[] }
export type CarBodyPayload = { shape: string }
export type PaintedBodyPayload = { shape: string, color: string }
export type ItemDeliveryPayload = { item: string, to: string }
export type BidPayload = { transportId: string, delay: number }
export type SelectedPayload = { winnerTransport: string }
export type GuidanceRequestPayload = { item: string, to: string }
export type RoutePayload = { directions: string[] }
export type EngineInstallationPayload = { shape: string, color: string, engine: string }

export const NUMBER_OF_CAR_PARTS = 3

export namespace Events {
  export const steelRoll = MachineEvent.design('SteelRoll').withoutPayload()
  export const steelParts = MachineEvent.design('SteelParts').withPayload<SteelPartsPayload>()
  export const partialCarBody = MachineEvent.design('PartialCarBody').withPayload<PartialCarBodyPayload>()
  export const carBody = MachineEvent.design('CarBody').withPayload<CarBodyPayload>()
  export const paintedCarBody = MachineEvent.design('PaintedCarBody').withPayload<PaintedBodyPayload>()
  export const itemRequest = MachineEvent.design('ItemRequest').withPayload<ItemDeliveryPayload>()
  export const bid = MachineEvent.design('Bid').withPayload<BidPayload>()
  export const selected = MachineEvent.design('Selected').withPayload<SelectedPayload>()
  export const requestGuidance = MachineEvent.design('ReqGuidance').withPayload<GuidanceRequestPayload>()
  export const giveGuidance = MachineEvent.design('GiveGuidance').withPayload<RoutePayload>()
  export const itemPickupBasic = MachineEvent.design('ItemPickupBasic').withPayload<ItemDeliveryPayload>()
  export const itemPickupSmart = MachineEvent.design('ItemPickupSmart').withPayload<ItemDeliveryPayload>()
  export const handover = MachineEvent.design('Handover').withPayload<ItemDeliveryPayload>()
  export const itemDelivery = MachineEvent.design("ItemDeliver").withPayload<ItemDeliveryPayload>()
  export const requestEngine = MachineEvent.design("RequestEngine").withPayload<ItemDeliveryPayload>()
  export const engineInstalled = MachineEvent.design("EngineInstalled").withPayload<EngineInstallationPayload>()

  export const allEvents =
    [
      steelRoll, steelParts, partialCarBody, carBody,
      paintedCarBody,
      itemRequest, bid, selected, requestGuidance, giveGuidance, itemPickupBasic, itemPickupSmart, handover, itemDelivery,
      requestEngine, engineInstalled
    ] as const
}

export const Composition = SwarmProtocol.make('Composition', Events.allEvents)

export namespace SteelPressProtocol {
  const initial = "0"
  const steelPickedUp = "1"
  const steelPressed = "2"
  const bodyAssembled = "3"
  export const stampRole = "Stamp"
  export const bodyAssemblerRole = "BodyAssembler"
  export const steelTransportRole = "SteelTransport"
  export const carBodyCheckerRole = "CarBodyChecker"
  export const cmdPickUpSteel = "pickUpSteelRoll"
  export const cmdPressSteel = "pressSteel"
  export const cmdAssembleBody = "assembleBody"
  export const cmdCarBodyDone = "carBodyDone"

  export const protocol: SwarmProtocolType = {
    initial: initial,
    transitions: [
      {source: initial, target: steelPickedUp, label: {cmd: cmdPickUpSteel, role: steelTransportRole, logType: [Events.steelRoll.type]}},
      {source: steelPickedUp, target: steelPressed, label: {cmd: cmdPressSteel, role: stampRole, logType: [Events.steelParts.type]}},
      {source: steelPressed, target: initial, label: {cmd: cmdAssembleBody, role: bodyAssemblerRole, logType: [Events.partialCarBody.type]}},
      {source: initial, target: bodyAssembled, label: {cmd: cmdCarBodyDone, role: carBodyCheckerRole, logType: [Events.carBody.type]}}
    ]
  }

  const subscriptionsResult: DataResult<Subscriptions>
    = overapproxWFSubscriptions([protocol], {}, 'TwoStep')
  if (subscriptionsResult.type === 'ERROR') throw new Error(subscriptionsResult.errors.join(', '))
  export const subscriptions: Subscriptions = subscriptionsResult.data
}

export namespace PaintShopProtocol {
  const initial = "0"
  const bodyAssembled = "1"
  const bodyPainted = "2"
  export const carBodyCheckerRole = "CarBodyChecker"
  export const painterRole = "Painter"
  export const cmdCarBodyDone = "carBodyDone"
  export const cmdPaintBody = "applyPaint"

  export const protocol: SwarmProtocolType = {
    initial: initial,
    transitions: [
      {source: initial, target: bodyAssembled, label: {cmd: cmdCarBodyDone, role: carBodyCheckerRole, logType: [Events.carBody.type]}},
      {source: bodyAssembled, target: bodyPainted, label: {cmd: cmdPaintBody, role: painterRole, logType: [Events.paintedCarBody.type]}},
    ]
  }

  const subscriptionsResult: DataResult<Subscriptions>
    = overapproxWFSubscriptions([protocol], {}, 'TwoStep')
  if (subscriptionsResult.type === 'ERROR') throw new Error(subscriptionsResult.errors.join(', '))
  export const subscriptions: Subscriptions = subscriptionsResult.data
}

export namespace WarehouseProtocol {
  const initial = "0"
  const itemRequested = "1"
  const transporterSelected = "2"
  const guidanceRequested = "3"
  const guidanceGiven = "4"
  const itemPickedUp = "5"
  const itemHandedOver = "6"
  export const warehouseRole = "Warehouse"
  export const transportRole = "Transport"
  export const baseStationRole = "BaseStation"
  export const cmdRequest = "request"
  export const cmdBid = "bid"
  export const cmdSelect = "select"
  export const cmdNeedGuidance = "needGuidance"
  export const cmdGiveGuidance = "giveGuidance"
  export const cmdBasicPickup = "basicPickup"
  export const cmdSmartPickup = "smartPickup"
  export const cmdHandover = "handover"
  export const cmdDeliver = "deliver"

  export const protocol: SwarmProtocolType = {
    initial: initial,
    transitions: [
      {source: initial, target: itemRequested, label: {cmd: cmdRequest, role: warehouseRole, logType: [Events.itemRequest.type]}},
      {source: itemRequested, target: itemRequested, label: {cmd: cmdBid, role: transportRole, logType: [Events.bid.type]}},
      {source: itemRequested, target: transporterSelected, label: {cmd: cmdSelect, role: transportRole, logType: [Events.selected.type]}},
      {source: transporterSelected, target: guidanceRequested, label: {cmd: cmdNeedGuidance, role: transportRole, logType: [Events.requestGuidance.type]}},
      {source: guidanceRequested, target: guidanceGiven, label: {cmd: cmdGiveGuidance, role: baseStationRole, logType: [Events.giveGuidance.type]}},
      {source: guidanceGiven, target: itemPickedUp, label: {cmd: cmdBasicPickup, role: transportRole, logType: [Events.itemPickupBasic.type]}},
      {source: transporterSelected, target: itemPickedUp, label: {cmd: cmdSmartPickup, role: transportRole, logType: [Events.itemPickupSmart.type]}},
      {source: itemPickedUp, target: itemHandedOver, label: {cmd: cmdHandover, role: transportRole, logType: [Events.handover.type]}},
      {source: itemHandedOver, target: initial, label: {cmd: cmdDeliver, role: warehouseRole, logType: [Events.itemDelivery.type]}}
    ]
  }

  const subscriptionsResult: DataResult<Subscriptions>
    = overapproxWFSubscriptions([protocol], {}, 'TwoStep')
  if (subscriptionsResult.type === 'ERROR') throw new Error(subscriptionsResult.errors.join(', '))
  export const subscriptions: Subscriptions = subscriptionsResult.data
}

export namespace EngineInstallationProtocol {
  const initial = "0"
  const bodyPainted = "1"
  const engineRequested = "2"
  const warehouseEngaged = "3"
  const delivered = "4"
  const engineInstalled = "5"
  export const painterRole = "Painter"
  export const engineInstallerRole = "EngineInstaller"
  export const warehouseRole = "Warehouse"
  export const cmdPaintBody = "applyPaint"
  export const cmdRequestEngine = "requestEngine"
  export const cmdRequest = "request"
  export const cmdDeliver = "deliver"
  export const cmdInstallEngine = "installEngine"

  export const protocol: SwarmProtocolType = {
    initial: initial,
    transitions: [
      {source: initial, target: bodyPainted, label: {cmd: cmdPaintBody, role: painterRole, logType: [Events.paintedCarBody.type]}},
      {source: bodyPainted, target: engineRequested, label: {cmd: cmdRequestEngine, role: engineInstallerRole, logType: [Events.requestEngine.type]}},
      {source: engineRequested, target: warehouseEngaged, label: {cmd: cmdRequest, role: warehouseRole, logType: [Events.itemRequest.type]}},
      {source: warehouseEngaged, target: delivered, label: {cmd: cmdDeliver, role: warehouseRole, logType: [Events.itemDelivery.type]}},
      {source: delivered, target: engineInstalled, label: {cmd: cmdInstallEngine, role: engineInstallerRole, logType: [Events.engineInstalled.type]}},
    ]
  }

  const subscriptionsResult: DataResult<Subscriptions>
    = overapproxWFSubscriptions([protocol], {}, 'TwoStep')
  if (subscriptionsResult.type === 'ERROR') throw new Error(subscriptionsResult.errors.join(', '))
  export const subscriptions: Subscriptions = subscriptionsResult.data
}

//console.log(JSON.stringify(EngineInstallationProtocol.protocol, null, 2))
// Machine adaptation did not go well when switching the order of warehouse and engine installer. Why?
// Not minimized?
// throw new Error(`${firstTrigger.type} has been registered as a reaction guard for this state.`);
export const carFactoryProtocol: InterfacingProtocols = [
  SteelPressProtocol.protocol,
  PaintShopProtocol.protocol,
  EngineInstallationProtocol.protocol,
  WarehouseProtocol.protocol
]
// Well-formed subscription for the composition protocol
const resultSubsCarFactory: DataResult<Subscriptions>
  = overapproxWFSubscriptions(carFactoryProtocol, {}, 'TwoStep')
if (resultSubsCarFactory.type === 'ERROR') throw new Error(resultSubsCarFactory.errors.join(', '))
export var subsCarFactory: Subscriptions = resultSubsCarFactory.data

// check that the subscription generated for the composition is indeed well-formed
const resultCheckWf: Result = checkComposedSwarmProtocol(carFactoryProtocol, subsCarFactory)
if (resultCheckWf.type === 'ERROR') throw new Error(resultCheckWf.errors.join(', \n'))

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random
export function getRandomInt(min: number, max: number) {
  const minCeiled = Math.ceil(min);
  const maxFloored = Math.floor(max);
  return Math.floor(Math.random() * (maxFloored - minCeiled) + minCeiled); // The maximum is exclusive and the minimum is inclusive
}

export const printState = (machineName: string, stateName: string, statePayload: any) => {
  console.log(chalk.bgBlack.white.bold(`${machineName} - State: ${stateName}. Payload: ${statePayload ? JSON.stringify(statePayload, null, 0) : "{}"}`))
}