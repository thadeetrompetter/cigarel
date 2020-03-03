import "reflect-metadata"
import { Mock, Times } from "typemoq"
import { UploadJobCreator, ReadStreamCreator, UploadJobCreatorError } from "../../../../src/app/upload-job-creator/UploadJobCreator"
import { FileInfo } from "../../../../src/helpers/file/FileHelper"
import { ReadStream } from "fs"
import { Glacier } from "aws-sdk/clients/all"
import { GlacierComputeChecksumsOutput } from "aws-sdk/lib/services/glacier"
import { AppConfig } from "../../../../src/app/config/Config"
import { ILogger } from "../../../../src/helpers/logger/Logger"

describe("UploadJobCreator", () => {
  const fileInfo = Mock.ofType<FileInfo>()
  const readStreamCreator = Mock.ofType<ReadStreamCreator>()
  const config = Mock.ofType<AppConfig>()
  const stream = Mock.ofType<ReadStream>()
  const glacier = Mock.ofType<Glacier>()
  const checksumOutput = Mock.ofType<GlacierComputeChecksumsOutput>()
  const logger = Mock.ofType<ILogger>()

  const fileContents = Buffer.from("12345678")
  const treeHash = "a tree hash"
  const filepath = "/some/file"

  beforeEach(() =>  {
    fileInfo.reset()
    readStreamCreator.reset()
    config.reset()
    stream.reset()
    glacier.reset()
    checksumOutput.reset()
    logger.reset()
  })

  afterEach(() => {
    fileInfo.verifyAll()
    readStreamCreator.verifyAll()
    config.verifyAll()
    stream.verifyAll()
    glacier.verifyAll()
    checksumOutput.verifyAll()
    logger.verifyAll()
  })

  function setUpReadStreamCreatorMock (parts: Record<string, number>[] = []): void {
    parts.forEach(part => {
      readStreamCreator.setup(r => r(filepath, part))
        .returns(() => stream.object)
        .verifiable(Times.once())
    })
  }

  it("will create a single file upload job", () => {
    const streamParts = [{ start: 0, end: 7 }]
    const chunkSize = 10

    setUpReadStreamCreatorMock(streamParts)

    config.setup(c => c.chunkSize)
      .returns(() => chunkSize)
      .verifiable(Times.once())

    // File size is smaller than default chunk size
    fileInfo.setup(f => f.size)
      .returns(() => chunkSize - 2)
      .verifiable(Times.once())

    fileInfo.setup(f => f.contents)
      .returns(() => fileContents)
      .verifiable(Times.exactly(1))

    fileInfo.setup(f => f.path)
      .returns(() => filepath)
      .verifiable(Times.exactly(2))

    glacier.setup(g => g.computeChecksums(fileContents))
      .returns(() => checksumOutput.object)
      .verifiable(Times.exactly(1))

    checksumOutput.setup(c => c.treeHash)
      .returns(() => treeHash)
      .verifiable(Times.once())

    logger.setup(l => l.debug("Created single upload job"))
      .verifiable(Times.once())

    logger.setup(l => l.debug(`Calculated treehash ${treeHash} for file ${filepath}`))
      .verifiable(Times.once())

    const fileSplitter = new UploadJobCreator(
      config.object,
      readStreamCreator.object,
      glacier.object,
      logger.object
    )

    expect(fileSplitter.getUploadJob(fileInfo.object))
      .toEqual({
        kind: "single",
        treeHash,
        parts: [
          {
            ...streamParts[0],
            stream: stream.object
          }
        ]
      })
  })

  it("Will create a multipart upload job", () => {
    const streamParts = [
      { start: 0, end: 1},
      { start: 2, end: 3},
      { start: 4, end: 5},
      { start: 6, end: 7},
    ]
    const chunkSize = 2

    setUpReadStreamCreatorMock(streamParts)

    config.setup(c => c.chunkSize)
      .returns(() => chunkSize)
      .verifiable(Times.once())

    // File size is larger than default chunk size
    fileInfo.setup(f => f.size)
      .returns(() => chunkSize * 4)
      .verifiable(Times.once())

    fileInfo.setup(f => f.contents)
      .returns(() => fileContents)
      .verifiable(Times.exactly(1))

    fileInfo.setup(f => f.path)
      .returns(() => filepath)
      .verifiable(Times.exactly(2))

    glacier.setup(g => g.computeChecksums(fileContents))
      .returns(() => checksumOutput.object)
      .verifiable(Times.once())

    checksumOutput.setup(c => c.treeHash)
      .returns(() => treeHash)
      .verifiable(Times.once())

    logger.setup(l => l.debug("Created multipart upload job of 4 upload parts"))
      .verifiable(Times.once())

    const fileSplitter = new UploadJobCreator(
      config.object,
      readStreamCreator.object,
      glacier.object,
      logger.object
    )

    expect(fileSplitter.getUploadJob(fileInfo.object))
      .toEqual({
        kind: "multipart",
        treeHash,
        parts: streamParts.map(part => ({
          ...part,
          stream: stream.object
        }))
      })
  })

  it("will throw an UploadJobCreatorError if any error occurred while creating the upload job", () => {
    const errorMessage = "some error occurred"
    const error = new Error(errorMessage)
    glacier.setup(g => g.computeChecksums(fileContents))
      .throws(error)
      .verifiable(Times.once())

    const chunkSize = 2

    config.setup(c => c.chunkSize)
      .returns(() => chunkSize)
      .verifiable(Times.once())

    // File size is larger than default chunk size
    fileInfo.setup(f => f.size)
      .returns(() => chunkSize * 4)
      .verifiable(Times.once())

    fileInfo.setup(f => f.contents)
      .returns(() => fileContents)
      .verifiable(Times.once())

    fileInfo.setup(f => f.path)
      .returns(() => filepath)
      .verifiable(Times.once())

    const fileSplitter = new UploadJobCreator(
      config.object,
      readStreamCreator.object,
      glacier.object,
      logger.object
    )
    expect(() => fileSplitter.getUploadJob(fileInfo.object))
      .toThrowError(new UploadJobCreatorError(errorMessage))
  })
})
