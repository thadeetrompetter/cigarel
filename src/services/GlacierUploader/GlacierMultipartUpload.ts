import { UploadPart } from "../../app/upload-job-creator/UploadJobCreator"
import {
  GlacierUploadResult,
  IGlacierUploadStrategy,
  GlacierInitiateUploadFailed,
  GlacierMultipartUploadIdMissing,
  GlacierPartsUploadFailed,
  GlacierCompleteUploadFailed,
  GlacierArchiveIdMissing
} from "./GlacierUploader"
import { Glacier } from "aws-sdk/clients/all"
import { AppConfig } from "../../app/config/Config"
import { injectable, inject } from "inversify"
import { TYPES } from "../../config/types"
import { StreamToBuffer } from "../../helpers/file/StreamToBuffer"
import { BatchProcessTask, BatchProcessor } from "../../helpers/concurrency/BatchProcessor"
import { UploadMultipartPartInput, InitiateMultipartUploadInput } from "aws-sdk/clients/glacier"
import { ILogger } from "../../helpers/logger/Logger"

@injectable()
export class GlacierMultipartUpload implements IGlacierUploadStrategy {
  private config: AppConfig
  private glacier: Glacier
  private streamToBuffer: StreamToBuffer
  private batchProcessor: BatchProcessor
  private logger: ILogger

  public constructor(
    @inject(TYPES.AppConfig) config: AppConfig,
    @inject(TYPES.Glacier) glacier: Glacier,
    @inject(TYPES.StreamToBuffer) streamToBuffer: StreamToBuffer,
    @inject(TYPES.BatchProcessor) batchProcessor: BatchProcessor,
    @inject(TYPES.Logger) logger: ILogger
  ) {
    this.config = config
    this.glacier = glacier
    this.streamToBuffer = streamToBuffer
    this.batchProcessor = batchProcessor
    this.logger = logger
  }

  public async upload(parts: UploadPart[], treeHash: string): Promise<GlacierUploadResult> {
    const { vaultName, chunkSize, description } = this.config
    const uploadId = await this.initiateUpload(chunkSize, vaultName, description)
    await this.doUpload(parts, uploadId, vaultName)
    const totalSize = this.getTotalSize(parts)
    const archiveId = await this.completeUpload(uploadId, vaultName, treeHash, totalSize)

    return { archiveId }
  }

  private async initiateUpload(chunkSize: number, vaultName: string, description?: string): Promise<string> {
    const params: InitiateMultipartUploadInput = {
      accountId: "-",
      partSize: String(chunkSize),
      vaultName,
    }

    if (description) {
      params.archiveDescription = description
    }

    let uploadId

    try {
      ({ uploadId } = await this.glacier.initiateMultipartUpload(params).promise())
    } catch(err) {
      throw new GlacierInitiateUploadFailed(err.message)
    }

    if (!uploadId) {
      throw new GlacierMultipartUploadIdMissing()
    }

    return uploadId
  }

  private async doUpload(parts: UploadPart[], uploadId: string, vaultName: string): Promise<void> {
    const uploadTasks = this.createUploadTasks(parts, {
      accountId: "-",
      uploadId,
      vaultName
    })

    try {
      await this.batchProcessor(uploadTasks, this.config.concurrency, this.logger)
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
      throw new GlacierArchiveIdMissing()
    }

    return archiveId
  }

  private getTotalSize(parts: UploadPart[]): number {
    const [{ end:size }] = parts.slice(parts.length - 1)
    return size + 1
  }

  private createUploadTasks(parts: UploadPart[], taskParams: UploadMultipartPartInput): BatchProcessTask[] {
    return parts.map((part, i) => {
      return this.createUploadTask(part, i, taskParams)
    })
  }

  private createUploadTask(part: UploadPart, index: number, taskParams: UploadMultipartPartInput): BatchProcessTask {
    const { stream, start, end } = part
    return {
      id: `${index + 1}: ${start}-${end}`,
      work: async (): Promise<void> => {
        const buffer = await this.streamToBuffer(stream)
        await this.glacier.uploadMultipartPart({
          ...taskParams,
          range: `bytes ${part.start}-${part.end}/*`,
          body: buffer
        }).promise()
      }
    }
  }
}
