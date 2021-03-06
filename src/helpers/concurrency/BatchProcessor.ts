import { queue, retry } from "async"
import { ILogger } from "../logger/Logger"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ProcessFunc = () => Promise<any>
export type BatchProcessor = typeof batchProcessor
export interface RetryConfig {
  times?: number
  interval?: number
}

export interface BatchProcessTask {
  id: string
  work: ProcessFunc
}

export default async function batchProcessor(
  items: BatchProcessTask[],
  concurrency: number,
  logger: ILogger,
  retryConfig: RetryConfig = {}
): Promise<void> {
  let errorCount = 0
  const worker = async (task: BatchProcessTask): Promise<void> =>
    retry(retryConfig,  async () => task.work())

  const q = queue<BatchProcessTask>(worker, concurrency)

  q.error(({ message }, task) => {
    logger.error(`Task ${task.id} failed: ${message}`)
    errorCount++
  })

  q.push(items)

  await q.drain()

  if (errorCount > 0) {
    throw new Error(`${errorCount} queue item(s) gave an error`)
  }
}
