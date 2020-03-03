import { injectable } from "inversify"
import { UploadJob, UploadPart } from "../../app/upload-job-creator/UploadJobCreator"

export interface IGlacierUploader {
  upload(uploadJob: UploadJob): Promise<GlacierUploadResult>
  setStrategy(strategy: IGlacierUploadStrategy): void
}

export interface IGlacierUploadStrategy {
  upload(parts: UploadPart[], treeHash: string): Promise<GlacierUploadResult>
}

export interface GlacierUploadResult {
  archiveId: string
}

@injectable()
export class GlacierUploader implements IGlacierUploader {
  private uploadStrategy?: IGlacierUploadStrategy

  public async upload(uploadJob: UploadJob): Promise<GlacierUploadResult> {
    if (!this.uploadStrategy) {
      throw new GlacierUploaderStrategyMissing()
    }
    const { treeHash, parts } = uploadJob

    return this.uploadStrategy.upload(parts, treeHash)
  }

  public setStrategy(strategy: IGlacierUploadStrategy): void {
    this.uploadStrategy = strategy
  }
}

class GlacierUploaderError extends Error {}
export class GlacierUploaderStrategyMissing extends GlacierUploaderError {}
export class GlacierInitiateUploadFailed extends GlacierUploaderError {}
export class GlacierPartsUploadFailed extends GlacierUploaderError {}
export class GlacierCompleteUploadFailed extends GlacierUploaderError {}
export class GlacierMultipartUploadIdMissing extends GlacierUploaderError {}
export class GlacierUploadArchiveFailed extends GlacierUploaderError {}
export class GlacierArchiveIdMissing extends GlacierUploaderError {}
