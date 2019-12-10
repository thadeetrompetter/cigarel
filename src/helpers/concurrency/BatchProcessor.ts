import { mapLimit } from "async"

export type BatchProcessor = typeof batchProcess

export default function batchProcess<T, P>(
  items: T[],
  concurrency: number,
  processFn: (item: T) => Promise<P>
): Promise<P[]> {
  return mapLimit(items, concurrency, processFn)
}
