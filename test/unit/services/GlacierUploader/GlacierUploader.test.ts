import "reflect-metadata"
import { GlacierUploader, IGlacierUploadStrategy, GlacierUploaderStrategyMissing } from "../../../../src/services/GlacierUploader/GlacierUploader"
import { Mock, Times } from "typemoq"
import { UploadPart, UploadJob } from "../../../../src/app/upload-job-creator/UploadJobCreator"
import { GlacierUploadArchiveFailed } from "../../../../src/services/GlacierUploader/GlacierUploader"

describe("GlacierUploader", () => {
  const treeHash = "tree hash"
  const archiveId = "archive id"
  const strategy = Mock.ofType<IGlacierUploadStrategy>()
  const part = Mock.ofType<UploadPart>()
  const uploadJob = Mock.ofType<UploadJob>()
  const glacierUploader = new GlacierUploader()

  beforeEach(() => {
    strategy.reset()
  })

  afterEach(() => {
    strategy.verifyAll()
  })

  it("will upload a file to glacier", async () => {
    glacierUploader.setStrategy(strategy.object)

    setUpMocks()

    strategy.setup(s => s.upload(uploadJob.object.parts, uploadJob.object.treeHash))
      .returns(() => Promise.resolve({ archiveId }))

    await expect(glacierUploader.upload(uploadJob.object))
      .resolves
      .toEqual({ archiveId })
  })

  it("will throw a GlacierUploaderStrategyMissing error upload is called without a strategy set", async () => {
    const glacierUploader = new GlacierUploader()

    setUpMocks()

    strategy.setup(s => s.upload(uploadJob.object.parts, uploadJob.object.treeHash))
      .returns(() => Promise.resolve({ archiveId }))

    await expect(glacierUploader.upload(uploadJob.object))
      .rejects
      .toThrowError(new GlacierUploaderStrategyMissing())
  })

  it("will throw an error if configured upload strategy fails", async () => {
    const glacierUploader = new GlacierUploader()

    setUpMocks()

    strategy.setup(s => s.upload(uploadJob.object.parts, uploadJob.object.treeHash))
      .returns(() => Promise.reject(new GlacierUploadArchiveFailed()))

    await expect(glacierUploader.upload(uploadJob.object))
      .rejects
      .toThrow(new GlacierUploadArchiveFailed())
  })

  function setUpMocks(): void {
    uploadJob.setup(u => u.parts)
      .returns(() => [ part.object ])
      .verifiable(Times.once())

    uploadJob.setup(u => u.treeHash)
      .returns(() => treeHash)
      .verifiable(Times.once())
  }
})
