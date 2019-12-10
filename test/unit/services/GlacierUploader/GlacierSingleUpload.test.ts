import "reflect-metadata"
import { IMock, Mock, Times } from "typemoq"
import AWS from "aws-sdk"
import AWSMock from "aws-sdk-mock"
import { AppConfig } from "../../../../src/app/config/Config"
import { GlacierSingleUpload, GlacierUploadArchiveFailed, GlacierArchiveIdMissing } from "../../../../src/services/GlacierUploader/GlacierSingleUpload"
import { UploadPart } from "../../../../src/app/upload-job-creator/UploadJobCreator"
import { ReadStream } from "fs"
import { StreamToBuffer, streamToBuffer as streamToBufferHelper } from "../../../../src/helpers/file/StreamToBuffer"

describe("GlacierSingleUpload", () => {
  AWSMock.setSDKInstance(AWS)

  const config = Mock.ofType<AppConfig>()
  const stream = Mock.ofType<ReadStream>()
  const uploadPart = Mock.ofType<UploadPart>()
  const streamToBuffer: IMock<StreamToBuffer> = Mock.ofInstance<StreamToBuffer>(streamToBufferHelper)

  beforeEach(() => {
    config.reset()
    uploadPart.reset()
    stream.reset()
    streamToBuffer.reset()
  })

  afterEach(() => {
    config.verifyAll()
    uploadPart.verifyAll()
    stream.verifyAll()
    streamToBuffer.verifyAll()

    AWSMock.restore("Glacier", "uploadArchive")
  })

  it("will upload an archive to AWS Glacier", async () => {
    const archiveId = "archive id"
    const vaultName = "vault name"
    const treeHash = "tree hash"
    const buffer = Buffer.alloc(123, "binary")

    AWSMock.mock("Glacier", "uploadArchive", Promise.resolve({
      location: "the location",
      checksum: "the checksum",
      archiveId,
    }))

    const glacier = new AWS.Glacier()

    const singleUpload = new GlacierSingleUpload(config.object, glacier, streamToBuffer.object)

    setUpMocks(vaultName, stream, buffer)

    await expect(singleUpload.upload([ uploadPart.object ], treeHash))
      .resolves
      .toEqual({
        archiveId
      })
  })

  it("will throw a GlacierSingleUploadError if file cannot be uploaded", async () => {
    const vaultName = "vault name"
    const treeHash = "tree hash"
    const errorMessage = "A Glacier upload error occurred"
    const buffer = Buffer.alloc(123, "binary")

    AWSMock.mock("Glacier", "uploadArchive", (_params: any, cb: Function) => cb(new Error(errorMessage)))

    const glacier = new AWS.Glacier()

    const singleUpload = new GlacierSingleUpload(config.object, glacier, streamToBuffer.object)

    setUpMocks(vaultName, stream, buffer)

    await expect(singleUpload.upload([ uploadPart.object ], treeHash))
      .rejects
      .toThrowError(new GlacierUploadArchiveFailed(errorMessage))
  })

  it("will throw a GlacierArchiveIdMissing if archive upload result does not contain an archive ID", async () => {
    const vaultName = "vault name"
    const treeHash = "tree hash"
    const buffer = Buffer.alloc(123, "binary")

    AWSMock.mock("Glacier", "uploadArchive", Promise.resolve({}))

    const glacier = new AWS.Glacier()

    const singleUpload = new GlacierSingleUpload(config.object, glacier, streamToBuffer.object)

    setUpMocks(vaultName, stream, buffer)

    await expect(singleUpload.upload([ uploadPart.object ], treeHash))
      .rejects
      .toThrowError(new GlacierArchiveIdMissing())
  })

  function setUpMocks (vaultName: string, stream: IMock<ReadStream>, buffer: Buffer): void {
    config.setup(c => c.vaultName)
      .returns(() => vaultName)
      .verifiable(Times.once())

    uploadPart.setup(u => u.stream)
      .returns(() => stream.object)
      .verifiable(Times.once())

    streamToBuffer.setup((s: StreamToBuffer) => s(stream.object))
      .returns(() => Promise.resolve(buffer))
      .verifiable(Times.once())
  }
})
