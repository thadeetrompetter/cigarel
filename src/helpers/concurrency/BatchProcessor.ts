import { queue, retry } from "async"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ProcessFunc = () => Promise<any>
export type BatchProcessor = typeof batchProcess
export interface RetryConfig {
  times?: number
  interval?: number
}

export interface Task {
  id: string
  work: ProcessFunc
}

export default async function batchProcess(
  items: Task[],
  concurrency: number,
  retryConfig: RetryConfig = {},
): Promise<void> {
  let errorCount = 0
  const worker = async (task: Task): Promise<void> =>
    retry(retryConfig,  async () => task.work())

  const q = queue<Task>(worker, concurrency)

  q.error(({ message }, task) => {
    console.log(`task ${task.id} had error: ${message}`)
    errorCount++
  })

  q.push(items)

  await q.drain()

  console.log("queue is done")

  if (errorCount > 0) {
    throw new Error(`${errorCount} queue item(s) gave an error`)
  }
}
