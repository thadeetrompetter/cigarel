import "reflect-metadata"
import { Mock, Times } from "typemoq"
import { FileSplitter, ReadStreamCreator, FileSplitterConfig } from "../../../../src/services/file-splitter/FileSplitter"
import { FileSizeHelper } from "../../../../src/helpers/file/get-file-size"
import { ReadStream } from "fs"

describe("FileSplitter", () => {
  const fileSizeHelper = Mock.ofType<FileSizeHelper>()
  const readStreamCreator = Mock.ofType<ReadStreamCreator>()
  const config = Mock.ofType<FileSplitterConfig>()
  const stream = Mock.ofType<ReadStream>()
  
  const filename = "/some/file"
  const mb = 1024 * 1024
  
  beforeEach(() =>  {
    fileSizeHelper.reset()
    readStreamCreator.reset()
    config.reset()
  })
  
  afterEach(() => {
    fileSizeHelper.verifyAll()
    readStreamCreator.verifyAll()
    config.verifyAll()
  })

  it("Will spit a file", async () => {
    
    config.setup(c => c.bytesPerChunk)
      .returns(() => mb)
      .verifiable(Times.once())
    
    fileSizeHelper.setup(f => f(filename))
      .returns(() => Promise.resolve(mb * 2))
      .verifiable(Times.once())
    
    readStreamCreator.setup(r => r(filename, {
      start: 0,
      end: mb
    }))
    .returns(() => stream.object)
    .verifiable(Times.once())

    readStreamCreator.setup(r => r(filename, {
      start: mb + 1,
      end: Infinity
    }))
    .returns(() => stream.object)
    .verifiable(Times.once())

    const fileSplitter = new FileSplitter(fileSizeHelper.object, readStreamCreator.object, config.object)  
    
    await expect(fileSplitter.split(filename))
      .resolves
      .toEqual([
        {
          start: 0,
          end: mb,
          stream: stream.object
        }, {
          start: mb + 1,
          end: Infinity,
          stream: stream.object
        }
      ])
  })
})
