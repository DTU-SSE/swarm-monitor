import { MachineEvent } from '@actyx/machine-runner'

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
export type WheelInstallationPayload = { shape: string, color: string, engine: string, numWheels: number }
export type WindowInstallationPayload = { shape: string, color: string, engine: string, numWindows: number }
export type FinishedCarPayload = { shape: string, color: string, engine: string, numWheels: number, numWindows: number, isOk: boolean }

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
  export const engineChecked = MachineEvent.design("EngineChecked").withPayload<EngineInstallationPayload>()
  export const wheelPickup = MachineEvent.design("WheelPickup").withPayload<WheelInstallationPayload>()
  export const wheelInstalled = MachineEvent.design("WheelInstalled").withPayload<WheelInstallationPayload>()
  export const wheelsDone = MachineEvent.design("AllWheelsInstalled").withPayload<WheelInstallationPayload>()
  export const windowPickup = MachineEvent.design("WindowPickup").withPayload<WindowInstallationPayload>()
  export const windowInstalled = MachineEvent.design("WindowInstalled").withPayload<WindowInstallationPayload>()
  export const windowsDone = MachineEvent.design("AllWindowsInstalled").withPayload<WindowInstallationPayload>()
  export const finishedCar = MachineEvent.design("FinishedCar").withPayload<FinishedCarPayload>()

  export const allEvents =
    [
      steelRoll, steelParts, partialCarBody, carBody,
      paintedCarBody,
      itemRequest, bid, selected, requestGuidance, giveGuidance, itemPickupBasic, itemPickupSmart, handover, itemDelivery,
      requestEngine, engineInstalled, engineChecked,
      wheelPickup, wheelInstalled, wheelsDone,
      windowPickup, windowInstalled, windowsDone,
      finishedCar
    ] as const
}
