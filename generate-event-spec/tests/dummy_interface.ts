export interface MachineEventIF {
  design(name: string): MachineEventIF;
  withPayload<T>(): any;
  withoutPayload(): any;
}
// Mock implementation
export const MachineEvent: MachineEventIF = {
  design(name: string) {
    return this;
  },
  withPayload<T>() {
    return this;
  },
  withoutPayload() {
    return this;
  },
};