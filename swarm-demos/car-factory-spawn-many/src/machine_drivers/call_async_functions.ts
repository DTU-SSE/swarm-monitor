import async from "async";

export async function runAsyncFunctionsA(functions: (() => Promise<void>)[], concurrency: number): Promise<void> {
    return new Promise((resolve, reject) => {
        const worker = async (task: () => Promise<void>) => await task();
        const queue = async.queue(worker, concurrency);
        queue.error((error) => reject(error))
        queue.drain(() => resolve())
        queue.push(functions)
    })
}

export async function runAsyncFunctionsB(functions: (() => Promise<void>)[]): Promise<void> {
    return Promise.all(functions.map(fun => fun())).then()
}

/*
export type AORB = "a" | "a"

export async function runAsyncFunctions(functions: (() => Promise<void>)[], aOrB: AORB, concurrency?: number): Promise<void> {
    if (aOrB === "a" && concurrency) {
        runAsyncFunctionsA(functions, concurrency)
    } else if (aOrB === "b") {
        runAsyncFunctionsB(functions)
    } else {
        throw Error
    }
} */