import "reflect-metadata"
import AWSMock from "aws-sdk-mock"
import AWS from "aws-sdk"
import {
  GlacierMultipartUpload,
} from "../../../../src/services/GlacierUploader/GlacierMultipartUpload"
import { Mock, Times, IMock, MockBehavior } from "typemoq"
import { AppConfig } from "../../../../src/app/config/Config"
import {
  InitiateMultipartUploadInput,
  InitiateMultipartUploadOutput,
  UploadMultipartPartOutput,
  ArchiveCreationOutput,
  UploadMultipartPartInput,
  CompleteMultipartUploadInput
} from "aws-sdk/clients/glacier"
import { UploadPart } from "../../../../src/app/upload-job-creator/UploadJobCreator"
import { ReadStream, createReadStream } from "fs"
import batchProcessor from "../../../../src/helpers/concurrency/BatchProcessor"
import { ILogger } from "../../../../src/helpers/logger/Logger"
import { GlacierInitiateUploadFailed, GlacierMultipartUploadIdMissing, GlacierPartsUploadFailed, GlacierCompleteUploadFailed, GlacierArchiveIdMissing } from "../../../../src/services/GlacierUploader/GlacierUploader"

interface GetUploadPartOutput {
  part: IMock<UploadPart>
  stream: IMock<ReadStream>
}

interface GetUploadPartParams {
  start: number
  end: number
}

describe("GlacierMultipartUpload", () => {
  const MB = 1024 * 1024
  const archiveId = "archive id"
  const vaultName = "vault name"
  const treeHash = "tree hash"
  const checksum = "checksum"

  const parts = getUploadPartMocks([
    { start: 0, end: MB - 1 },
    { start: MB, end: (MB * 2) - 1 },
    { start: MB * 2, end: (MB * 3) - 1 },
  ]).map(({ part }) => part.object)

  const initResult: InitiateMultipartUploadOutput = {
    location: "upload location",
    uploadId: "upload id"
  }

  const uploadMultipartResult: UploadMultipartPartOutput = { checksum }

  const completeMultipartUploadResult: ArchiveCreationOutput = {
    archiveId,
    checksum: treeHash,
    location: "archive location"
  }

  AWSMock.setSDKInstance(AWS)

  const config = Mock.ofType<AppConfig>()
  const logger = Mock.ofType<ILogger>(undefined, MockBehavior.Strict)

  const mockBatchProcessor = jest.fn()
  const mockStreamToBuffer = jest.fn()
  const mockInitiateMultipartUpload = jest.fn()

  beforeEach(() => {
    config.reset()
    logger.reset()
    mockBatchProcessor.mockReset()
    mockStreamToBuffer.mockReset()
    mockInitiateMultipartUpload.mockReset()
  })

  afterEach(() => {
    config.verifyAll()
    logger.verifyAll()
    AWSMock.restore("Glacier")
  })

  it("will multipart-upload an archive", async () => {
    const description = "archive description"
    mockInitiateMultipartUpload.mockResolvedValue(initResult)

    AWSMock.mock("Glacier", "initiateMultipartUpload", mockInitiateMultipartUpload)
    AWSMock.mock("Glacier", "uploadMultipartPart", Promise.resolve(uploadMultipartResult))
    AWSMock.mock("Glacier", "completeMultipartUpload", Promise.resolve(completeMultipartUploadResult))

    config.setup(c => c.concurrency)
      .returns(() => 1)
      .verifiable(Times.once())

    const glacier = new AWS.Glacier()

    const glacierMultipartUpload = new GlacierMultipartUpload(config.object, glacier, mockStreamToBuffer, batchProcessor, logger.object)

    setupConfigMock(config, MB, vaultName, description)

    await expect(glacierMultipartUpload.upload(parts, treeHash))
      .resolves
      .toEqual({ archiveId })

    expect(mockInitiateMultipartUpload.mock.calls[0][0])
      .toEqual({
        accountId: "-",
        vaultName,
        partSize: String(MB),
        archiveDescription: description
      })
  })

  it("will throw a GlacierInitiateUploadFailed error if upload fails to initialize", async () => {
    const error = new GlacierInitiateUploadFailed("failed to initialize")
    AWSMock.mock("Glacier", "initiateMultipartUpload", (_: InitiateMultipartUploadInput, cb: Function) => {
      cb(error, null)
    })

    const glacier = new AWS.Glacier()

    const glacierMultipartUpload = new GlacierMultipartUpload(config.object, glacier, mockStreamToBuffer, mockBatchProcessor, logger.object)

    setupConfigMock(config, MB, vaultName)

    await expect(glacierMultipartUpload.upload(parts, treeHash))
      .rejects
      .toThrowError(error)
  })

  it("will throw a GlacierMultipartUploadIdMissing error if upload init does not return an uploadId", async () => {
    const error = new GlacierMultipartUploadIdMissing()
    const output: InitiateMultipartUploadOutput = {}

    AWSMock.mock("Glacier", "initiateMultipartUpload", Promise.resolve(output))

    const glacier = new AWS.Glacier()

    const glacierMultipartUpload = new GlacierMultipartUpload(config.object, glacier, mockStreamToBuffer, mockBatchProcessor, logger.object)

    setupConfigMock(config, MB, vaultName)

    await expect(glacierMultipartUpload.upload(parts, treeHash))
      .rejects
      .toThrowError(error)
  })

  it("will throw a GlacierPartsUploadFailed error if uploadMultipartPart fails", async () => {
    const error = new GlacierPartsUploadFailed("3 queue item(s) gave an error")

    AWSMock.mock("Glacier", "initiateMultipartUpload", Promise.resolve(initResult))
    AWSMock.mock("Glacier", "uploadMultipartPart", (_: UploadMultipartPartInput, cb: Function) => {
      cb(error, null)
    })

    config.setup(c => c.concurrency)
      .returns(() => 1)
      .verifiable(Times.once())

    const glacier = new AWS.Glacier()

    const glacierMultipartUpload = new GlacierMultipartUpload(config.object, glacier, mockStreamToBuffer, mockBatchProcessor, logger.object)

    mockBatchProcessor.mockRejectedValue(error)

    setupConfigMock(config, MB, vaultName)

    await expect(glacierMultipartUpload.upload(parts, treeHash))
      .rejects
      .toThrowError(error)
  })

  it("will throw a GlacierPartsUploadFailed error if stream to buffer conversion fails", async () => {
    AWSMock.mock("Glacier", "initiateMultipartUpload", Promise.resolve(initResult))

    const streamToBufferError = new Error("error converting stream to buffer")
    const error = new GlacierPartsUploadFailed("3 queue item(s) gave an error")

    config.setup(c => c.concurrency)
      .returns(() => 1)
      .verifiable(Times.once())

    const glacier = new AWS.Glacier()

    mockStreamToBuffer.mockRejectedValue(streamToBufferError)

    logger.setup(l => l.error("Task 1: 0-1048575 failed: error converting stream to buffer"))
      .verifiable(Times.exactly(1))
    logger.setup(l => l.error("Task 2: 1048576-2097151 failed: error converting stream to buffer"))
      .verifiable(Times.exactly(1))
    logger.setup(l => l.error("Task 3: 2097152-3145727 failed: error converting stream to buffer"))
      .verifiable(Times.exactly(1))

    const glacierMultipartUpload = new GlacierMultipartUpload(config.object, glacier, mockStreamToBuffer, batchProcessor, logger.object)

    setupConfigMock(config, MB, vaultName)

    await expect(glacierMultipartUpload.upload(parts, treeHash))
      .rejects
      .toThrowError(error)
  })

  it("will throw a GlacierCompleteUploadFailed if completing the multipart upload failed", async () => {
    const error = new GlacierCompleteUploadFailed("complete upload failed")

    AWSMock.mock("Glacier", "initiateMultipartUpload", Promise.resolve(initResult))
    AWSMock.mock("Glacier", "uploadMultipartPart", Promise.resolve(uploadMultipartResult))
    AWSMock.mock("Glacier", "completeMultipartUpload", (_: CompleteMultipartUploadInput, cb: Function) => {
      cb(error, null)
    })

    config.setup(c => c.concurrency)
      .returns(() => 1)
      .verifiable(Times.once())

    const glacier = new AWS.Glacier()

    const glacierMultipartUpload = new GlacierMultipartUpload(config.object, glacier, mockStreamToBuffer, mockBatchProcessor, logger.object)

    setupConfigMock(config, MB, vaultName)

    await expect(glacierMultipartUpload.upload(parts, treeHash))
      .rejects
      .toThrowError(error)
  })

  it("will throw a GlacierArchiveIdMissing if archive ID is missing in complete upload response", async () => {
    const error = new GlacierArchiveIdMissing()

    AWSMock.mock("Glacier", "initiateMultipartUpload", Promise.resolve(initResult))
    AWSMock.mock("Glacier", "uploadMultipartPart", Promise.resolve(uploadMultipartResult))
    AWSMock.mock("Glacier", "completeMultipartUpload", Promise.resolve<ArchiveCreationOutput>({}))

    config.setup(c => c.concurrency)
      .returns(() => 1)
      .verifiable(Times.once())

    const glacier = new AWS.Glacier()

    const glacierMultipartUpload = new GlacierMultipartUpload(config.object, glacier, mockStreamToBuffer, mockBatchProcessor, logger.object)

    setupConfigMock(config, MB, vaultName)

    mockBatchProcessor.mockResolvedValue(undefined)

    await expect(glacierMultipartUpload.upload(parts, treeHash))
      .rejects
      .toThrowError(error)
  })
})

function getUploadPartMocks(parts: GetUploadPartParams[]): GetUploadPartOutput[] {
  return parts.map(getUploadPart)
}

function getUploadPart({start, end }: GetUploadPartParams): GetUploadPartOutput {
  const part = Mock.ofType<UploadPart>()
  const stream = Mock.ofType<ReadStream>()

  part.setup(p => p.start)
    .returns(() => start)
    .verifiable(Times.once())

  part.setup(p => p.end)
    .returns(() => end)
    .verifiable(Times.once())

  /**
   * This test has a dependency on test/unit/stub, because it's not possible to mock a (fs)
   * readstream with typemoq in a way that aws-sdk-mock, which internally executes an
   * instanceof check on the stream, is able to use it properly.
   */
  part.setup(p => p.stream)
    .returns(() => createReadStream("./test/unit/stub"))
    .verifiable(Times.once())

  return { part, stream }
}

function setupConfigMock(mock: IMock<AppConfig>, chunkSize: number, vaultName: string, description?: string): void {
  mock.setup(c => c.chunkSize)
    .returns(() => chunkSize)
    .verifiable(Times.once())

  mock.setup(c => c.vaultName)
    .returns(() => vaultName)
    .verifiable(Times.once())

  mock.setup(c => c.description)
    .returns(() => description)
    .verifiable(Times.once())
}
