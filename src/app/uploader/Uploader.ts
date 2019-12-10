import { AppConfig } from "../config/Config"
import { inject, injectable } from "inversify"
import { TYPES } from "../../config/types"
import { IGlacierUploader, IGlacierUploadStrategy } from "../../services/GlacierUploader/GlacierUploader"
import { IUploadJobCreator, UploadType } from "../upload-job-creator/UploadJobCreator"
import { IFileHelper } from "../../helpers/file/FileHelper"

export interface IUploader {
  upload(filepath: string): Promise<UploadResult>
}

export interface UploadResult {
  archiveId: string
}

@injectable()
export class Uploader implements IUploader {
  private config: AppConfig
  private uploadService: IGlacierUploader
  private fileHelper: IFileHelper
  private uploadJobCreator: IUploadJobCreator
  private singleUploadStrategy: IGlacierUploadStrategy
  private multipartUploadStrategy: IGlacierUploadStrategy

  public constructor(
    @inject(TYPES.AppConfig) config: AppConfig,
    @inject(TYPES.IGlacierUploader) uploadService: IGlacierUploader,
    @inject(TYPES.FileHelper) fileHelper: IFileHelper,
    @inject(TYPES.IUploadJobCreator) uploadJobCreator: IUploadJobCreator,
    @inject(TYPES.GlacierSingleStrategy) singleUploadStrategy: IGlacierUploadStrategy,
    @inject(TYPES.GlacierMultipartStrategy) multipartUploadStrategy: IGlacierUploadStrategy
  ) {
    this.config = config
    this.uploadService = uploadService
    this.fileHelper = fileHelper
    this.uploadJobCreator = uploadJobCreator
    this.singleUploadStrategy = singleUploadStrategy
    this.multipartUploadStrategy = multipartUploadStrategy
  }

  public async upload(filepath: string): Promise<UploadResult> {
    const fileInfo = await this.fileHelper.read(filepath)

    this.checkFileSize(fileInfo.size)

    const uploadJob = this.uploadJobCreator.getUploadJob(fileInfo)

    this.setUploadStrategy(uploadJob.kind)

    const result = await this.uploadService.upload(uploadJob)

    return {
      archiveId: result.archiveId
    }
  }

  private setUploadStrategy(uploadType: UploadType): void {
    switch (uploadType) {
    case "single":
      this.uploadService.setStrategy(this.singleUploadStrategy)
      break
    case "multipart":
      this.uploadService.setStrategy(this.multipartUploadStrategy)
      break
    default:
      throw new UploaderError("unknown upload strategy selected")
    }
  }
  /**
   * Determines if the given file size is elegible for multipart upload.
   * A multipart upload makes sense if the file to upload is larger than the
   * configured chunk size, so it can be split.
   * Also, you're not allowed to upload more than 10000 file parts to Glacier
   * in a single multipart upload.
   * @param size File size in bytes
   */

  private satisfiesMaxPartsRestriction (size: number): boolean {
    return size / this.config.chunkSize <= 1e4
  }

  private checkFileSize(size: number): void | never {
    if (size < 1) {
      throw new UploaderEmptyFileError()
    }
    if (!this.satisfiesMaxPartsRestriction(size)) {
      throw new UploaderMaxPartsError()
    }
  }
}

export class UploaderError extends Error {}
export class UploaderMaxPartsError extends UploaderError {}
export class UploaderEmptyFileError extends UploaderError {}
