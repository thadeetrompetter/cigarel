import { ReadStream } from "fs"
import streamToArray from "stream-to-array"

export type StreamToBuffer = typeof streamToBuffer

export async function streamToBuffer(stream: ReadStream): Promise<Buffer> {
  return streamToArray(stream).then((result) => Buffer.concat(result))
}

