import { UploadPart } from "../../app/upload-job-creator/UploadJobCreator"
import { GlacierUploadResult, IGlacierUploadStrategy } from "./GlacierUploader"
import { Glacier } from "aws-sdk/clients/all"
import { AppConfig } from "../../app/config/Config"
import { injectable, inject } from "inversify"
import { TYPES } from "../../config/types"
import { StreamToBuffer } from "../../helpers/file/StreamToBuffer"

@injectable()
export class GlacierMultipartUpload implements IGlacierUploadStrategy {
  private config: AppConfig
  private glacier: Glacier
  private streamToBuffer: StreamToBuffer

  public constructor(
    @inject(TYPES.AppConfig) config: AppConfig,
    @inject(TYPES.Glacier) glacier: Glacier,
    @inject(TYPES.StreamToBuffer) streamToBuffer: StreamToBuffer,
  ) {
    this.config = config
    this.glacier = glacier
    this.streamToBuffer = streamToBuffer
  }

  public async upload(parts: UploadPart[], treeHash: string): Promise<GlacierUploadResult> {
    const { vaultName, chunkSize } = this.config
    const uploadId = await this.initiateUpload(chunkSize, vaultName)
    await this.doUpload(parts, uploadId, vaultName)
    const totalSize = this.getTotalSize(parts)
    const archiveId = await this.completeUpload(uploadId, vaultName, treeHash, totalSize)

    return { archiveId }
  }

  private async initiateUpload(chunkSize: number, vaultName: string): Promise<string> {
    let uploadId

    try {
      ({ uploadId } = await this.glacier.initiateMultipartUpload({
        accountId: "-",
        partSize: String(chunkSize),
        vaultName,
      }).promise())
    } catch(err) {
      throw new GlacierInitiateUploadFailed(err.message)
    }

    if (!uploadId) {
      throw new GlacierMultipartUploadIdMissing()
    }

    return uploadId
  }

  private async doUpload(parts: UploadPart[], uploadId: string, vaultName: string): Promise<void> {
    try {
      await Promise.all(parts.map(async part => {
        const buffer = await this.streamToBuffer(part.stream)
        return this.glacier.uploadMultipartPart({
          accountId: "-",
          uploadId,
          vaultName,
          body: buffer,
          range: `bytes ${part.start}-${part.end}/*`,
        }).promise()
      }))
    } catch (err) {
      throw new GlacierPartsUploadFailed(err.message)
    }
  }

  private async completeUpload(uploadId: string, vaultName: string, checksum: string, archiveSize: number): Promise<string> {
    let archiveId

    try {
      ({ archiveId } = await this.glacier.completeMultipartUpload({
        accountId: "-",
        uploadId,
        vaultName,
        checksum,
        archiveSize: String(archiveSize),
      }).promise())
    } catch (err) {
      throw new GlacierCompleteUploadFailed(err.message)
    }

    if (!archiveId) {
      throw new GlacierMultipartArchiveIdMissing()
    }

    return archiveId
  }

  private getTotalSize(parts: UploadPart[]): number {
    const [{ end:size }] = parts.slice(parts.length - 1)
    return size + 1
  }
}

export class GlacierMultipartUploadError extends Error {}
export class GlacierInitiateUploadFailed extends GlacierMultipartUploadError {}
export class GlacierPartsUploadFailed extends GlacierMultipartUploadError {}
export class GlacierCompleteUploadFailed extends GlacierMultipartUploadError {}
export class GlacierMultipartUploadIdMissing extends GlacierMultipartUploadError {}
export class GlacierMultipartArchiveIdMissing extends GlacierMultipartUploadError {}
