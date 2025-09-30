import { Events, Composition, QualityControlProtocol } from '../../protocol.js'
import { checkComposedProjection } from '@actyx/machine-check';

type CheckCarPayload = { shape: string, color: string, engine: string, numWheels: number, numWindows: number,  wheelsChecked: boolean, windowsChecked: boolean}

export const qualityControl = Composition.makeMachine(QualityControlProtocol.qualityControlRole)
export const s0 = qualityControl.designEmpty('s0').finish()
export const s1 = qualityControl.designState('s1')
    .withPayload<CheckCarPayload>()
    .command(QualityControlProtocol.cmdCheckCar, [Events.finishedCar], (ctx) => {
        const okTruck = ctx.self.shape === "truck"
            && ctx.self.engine === "truckEngine"
        const okSedan = ctx.self.shape === "sedan"
            && ctx.self.engine === "basicEngine"
        const okColor = ctx.self.color != "" && ctx.self.color != undefined
        const isOk = (okTruck || okSedan)
            && okColor
            && ctx.self.wheelsChecked
            && ctx.self.windowsChecked
        return [Events.finishedCar.make({...ctx.self, isOk})]
    })
    .finish()
export const s2 = qualityControl.designEmpty('s2').finish()

s0.react([Events.engineChecked], s1, (_, event) => {
    const { shape, color, engine } = event.payload;
    return s1.make({
        shape, color, engine,
        numWheels: 0,
        numWindows: 0,
        wheelsChecked: false,
        windowsChecked: false
    }
    )
})
s1.react([Events.wheelsDone], s1, (ctx, event) => {
    const okWheels =ctx.self.shape === "sedan" && event.payload.numWheels == 4
        || ctx.self.shape === "truck" && event.payload.numWheels == 6
    return s1.make({ ...ctx.self, numWheels: event.payload.numWheels, wheelsChecked: okWheels })
})
s1.react([Events.windowsDone], s1, (ctx, event) => {
    const okWindows = ctx.self.shape === "sedan" && ctx.self.numWindows == 4
        || ctx.self.shape === "truck" && ctx.self.numWindows == 3
    return s1.make({ ...ctx.self, numWheels: event.payload.numWindows, windowsChecked: okWindows })
})
s1.react([Events.finishedCar], s2, () => s2.make())
/* export const s0 = qualityControl.designState('s0')
    .withPayload<CheckCarPayload>()
    .command(QualityControlProtocol.cmdCheckCar, [Events.finishedCar], (ctx) => {
        const okTruck = ctx.self.shape === "truck"
            && ctx.self.engine === "truckEngine"
            && ctx.self.color != "" && ctx.self.color != undefined

        const okSedan = ctx.self.shape === "sedan"
            && ctx.self.engine === "basicEngine"

        const okCar = (okTruck || okSedan)
            && ctx.self.color != "" && ctx.self.color != undefined
            && ctx.self.wheelsChecked
            && ctx.self.windowsChecked

        return [Events.finishedCar.make({... ctx.self, isOk: okCar})]
        })
    .finish()
export const s1 = qualityControl.designState('s1')
    .withPayload<CheckCarPayload>()
    .command(QualityControlProtocol.cmdCheckWheels, [Events.wheelsChecked], (ctx) => {
            const okWheels = ctx.self.shape === "sedan" && ctx.self.numWheels == 4
                || ctx.self.shape === "truck" && ctx.self.numWheels == 6
            return [Events.wheelsChecked.make({...ctx.self, wheelsChecked: okWheels })]
        })
    .finish()
export const s2 = qualityControl.designState('s2')
    .withPayload<CheckCarPayload>()
    .command(QualityControlProtocol.cmdCheckWindows, [Events.windowsChecked], (ctx) => {
            const okWindows = ctx.self.shape === "sedan" && ctx.self.numWindows == 4
                || ctx.self.shape === "truck" && ctx.self.numWindows == 3
            return [Events.windowsChecked.make({...ctx.self, windowsChecked: okWindows })]
        })
    .finish()
export const s3 = qualityControl.designEmpty('s3').finish()

s0.react([Events.wheelsDone], s1, (ctx, event) => {
    const {shape, color, engine, numWheels} = event.payload;
    return s1.make(
        { shape, color, engine, numWheels,
            numWindows: ctx.self.numWindows,
            wheelsChecked: ctx.self.wheelsChecked,
            windowsChecked: ctx.self.windowsChecked
        }
    )
})
s0.react([Events.windowsDone], s2, (ctx, event) => {
    const {shape, color, engine, numWindows} = event.payload;
    return s1.make(
        { shape, color, engine, numWindows,
            numWheels: ctx.self.numWheels,
            wheelsChecked: ctx.self.wheelsChecked,
            windowsChecked: ctx.self.windowsChecked
        }
    )
})

s1.react([Events.wheelsChecked], s0, (ctx, event) => {
    return s0.make({... ctx.self, wheelsChecked: event.payload.wheelsChecked})
})
s1.react([Events.windowsChecked], s0, (ctx, event) => {
    return s0.make({... ctx.self, windowsChecked: event.payload.windowsChecked})
})
s0.react([Events.finishedCar], s3, () => { return s3.make() }) */
// Check that the original machine is a correct implementation. A prerequisite for reusing it.
const checkProjResult = checkComposedProjection([QualityControlProtocol.protocol], QualityControlProtocol.subscriptions, QualityControlProtocol.qualityControlRole, qualityControl.createJSONForAnalysis(s0))
if (checkProjResult.type == 'ERROR') throw new Error(checkProjResult.errors.join(", \n"))