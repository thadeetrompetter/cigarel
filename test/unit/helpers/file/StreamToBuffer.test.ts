import { Mock } from "typemoq"
import { ReadStream } from "fs"

jest.mock("stream-to-array", () => {
  return jest.fn().mockResolvedValue([
    Buffer.from("abc"),
    Buffer.from("def"),
    Buffer.from("ghi"),
  ])
})

import { streamToBuffer } from "../../../../src/helpers/file/StreamToBuffer"

describe("streamToBuffer", () => {
  const stream = Mock.ofType<ReadStream>()

  beforeEach(() => {
    stream.reset()
  })

  afterEach(() => {
    stream.verifyAll()
    jest.unmock("stream-to-array")
  })

  it("reads a stream into a buffer", async() => {
    await expect(streamToBuffer(stream.object))
      .resolves
      .toEqual(Buffer.from("abcdefghi"))
  })
})
