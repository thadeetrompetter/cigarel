import "reflect-metadata"
import { Mock, Times, MockBehavior } from "typemoq"
import { AppConfig } from "../../../../src/app/config/Config"
import { IGlacierUploader, GlacierUploadResult, IGlacierUploadStrategy } from "../../../../src/services/GlacierUploader/GlacierUploader"
import { IFileHelper, FileInfo } from "../../../../src/helpers/file/FileHelper"
import { IUploadJobCreator, UploadJob, UploadType } from "../../../../src/app/upload-job-creator/UploadJobCreator"
import { GlacierSingleUpload } from "../../../../src/services/GlacierUploader/GlacierSingleUpload"
import { GlacierMultipartUpload } from "../../../../src/services/GlacierUploader/GlacierMultipartUpload"
import { GlacierStubUpload } from "../../../../src/services/GlacierUploader/GlacierStubUpload"
import { Uploader, UploaderError, UploaderMaxPartsError, UploaderEmptyFileError } from "../../../../src/app/uploader/Uploader"
import { ILogger } from "../../../../src/helpers/logger/Logger"

describe("Uploader", () => {
  const config = Mock.ofType<AppConfig>(undefined, MockBehavior.Strict)
  const uploadService = Mock.ofType<IGlacierUploader>()
  const fileHelper = Mock.ofType<IFileHelper>()
  const uploadJobCreator = Mock.ofType<IUploadJobCreator>()
  const glacierSingleStrategy = Mock.ofType<GlacierSingleUpload>()
  const glacierMultipartStrategy = Mock.ofType<GlacierMultipartUpload>()
  const glacierStubStrategy = Mock.ofType<GlacierStubUpload>()
  const fileInfo = Mock.ofType<FileInfo>()
  const uploadJob = Mock.ofType<UploadJob>()
  const uploadResult = Mock.ofType<GlacierUploadResult>()
  const logger = Mock.ofType<ILogger>(undefined, MockBehavior.Strict)

  const filePath = "/file/path"

  const uploader = new Uploader(
    config.object,
    uploadService.object,
    fileHelper.object,
    uploadJobCreator.object,
    glacierSingleStrategy.object,
    glacierMultipartStrategy.object,
    glacierStubStrategy.object,
    logger.object
  )

  beforeEach(() => {
    config.reset()
    uploadService.reset()
    fileHelper.reset()
    uploadJobCreator.reset()
    fileInfo.reset()
    uploadJob.reset()
    uploadResult.reset()
    logger.reset()
  })

  afterEach(() => {
    config.verifyAll()
    uploadService.verifyAll()
    fileHelper.verifyAll()
    uploadJobCreator.verifyAll()
    fileInfo.verifyAll()
    uploadJob.verifyAll()
    uploadResult.verifyAll()
    logger.verifyAll()
  })

  it.each`uploadType | uploadStrategy
${"single"} | ${glacierSingleStrategy.object}
${"multipart"} | ${glacierMultipartStrategy.object}
`("will upload a file with $uploadType strategy", async ({ uploadType, uploadStrategy }) => {
  const chunkSize = 5
  const fileSize = 15
  const archiveId = "archive id"

  setUpUploadMocks(uploadType, chunkSize, fileSize, archiveId, uploadStrategy)

  logger.setup(l => l.debug(`Using ${uploadType} file upload strategy`))
    .verifiable(Times.once())

  logger.setup(l => l.info(`Successfully uploaded ${filePath} of ${fileSize} Bytes to Glacier.`))
    .verifiable(Times.once())

  await expect(uploader.upload(filePath))
    .resolves
    .toEqual({ archiveId })
})

  it("will throw an error if an unknown upload strategy is provided", async () => {
    const chunkSize = 5
    const fileSize = 15
    const archiveId = "archive id"
    const error = new UploaderError("unknown upload strategy selected")

    setUpUploadMocks(
      "foo bar" as UploadType,
      chunkSize,
      fileSize,
      archiveId,
      glacierSingleStrategy.object
    )

    uploadService.reset()
    uploadResult.reset()

    await expect(uploader.upload(filePath))
      .rejects
      .toThrowError(error)
  })

  it("will throw a UploaderMaxPartsError error if upload size exceeds max upload parts", async () => {
    const chunkSize = 2
    // more than 10.000 chunks to upload
    const fileSize = 1e4 * 2 + 1
    const error = new UploaderMaxPartsError()

    config.setup(c => c.chunkSize)
      .returns(() => chunkSize)
      .verifiable(Times.once())

    fileInfo.setup(f => f.size)
      .returns(() => fileSize)
      .verifiable(Times.once())

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fileInfo.setup((f: any) => f.then).returns(() => undefined)

    fileHelper.setup(f => f.read(filePath))
      .returns(() => Promise.resolve(fileInfo.object))
      .verifiable(Times.once())

    await expect(uploader.upload(filePath))
      .rejects
      .toThrowError(error)
  })

  it("will throw a UploaderEmptyFileError error if file to upload is empty", async () => {
    // empty file
    const fileSize = 0
    const error = new UploaderEmptyFileError()

    fileInfo.setup(f => f.size)
      .returns(() => fileSize)
      .verifiable(Times.once())

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fileInfo.setup((f: any) => f.then).returns(() => undefined)

    fileHelper.setup(f => f.read(filePath))
      .returns(() => Promise.resolve(fileInfo.object))
      .verifiable(Times.once())

    await expect(uploader.upload(filePath))
      .rejects
      .toThrowError(error)
  })

  function setUpUploadMocks(
    uploadType: UploadType,
    chunkSize: number,
    fileSize: number,
    archiveId: string,
    uploadStrategy: IGlacierUploadStrategy,
  ): void {
    config.setup(c => c.chunkSize)
      .returns(() => chunkSize)
      .verifiable(Times.once())

    config.setup(c => c.dryRun)
      .returns(() => false)
      .verifiable(Times.once())

    fileInfo.setup(f => f.size)
      .returns(() => fileSize)
      .verifiable(Times.once())

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fileInfo.setup((f: any) => f.then).returns(() => undefined)

    fileHelper.setup(f => f.read(filePath))
      .returns(() => Promise.resolve(fileInfo.object))
      .verifiable(Times.once())

    uploadJobCreator.setup(u => u.getUploadJob(fileInfo.object))
      .returns(() => uploadJob.object)
      .verifiable(Times.once())

    uploadJob.setup(u => u.kind)
      .returns(() => uploadType)
      .verifiable(Times.once())

    uploadResult.setup(u => u.archiveId)
      .returns(() => archiveId)
      .verifiable(Times.once())

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    uploadResult.setup((f: any) => f.then).returns(() => undefined)

    uploadService.setup(u => u.setStrategy(uploadStrategy))
      .verifiable(Times.once())

    uploadService.setup(u => u.upload(uploadJob.object))
      .returns(() => Promise.resolve(uploadResult.object))
      .verifiable(Times.once())
  }
})
