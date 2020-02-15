import { queue, retry } from "async"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ProcessFunc<T> = (task: T) => Promise<any>
export type BatchProcessor = typeof batchProcess
export interface RetryConfig {
  times?: number
  interval?: number
}

export default async function batchProcess<T, R>(
  items: T[],
  concurrency: number,
  processFn: ProcessFunc<T>,
  retryConfig: RetryConfig = {},
): Promise<void> {
  let errorCount = 0
  const worker = async (task: T): Promise<void> =>
    retry<T>(retryConfig,  async () => processFn(task))

  const q = queue<T, R>(worker, concurrency)

  q.error((_err, task) => {
    console.log(`task ${task} had error`)
    errorCount++
  })

  q.push<R>(items)

  await q.drain()

  console.log("queue is done")

  if (errorCount > 0) {
    throw new Error("one or more queue items gave an error")
  }
}
