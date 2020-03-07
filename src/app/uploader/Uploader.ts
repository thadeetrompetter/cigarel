import { AppConfig } from "../config/Config"
import { inject, injectable } from "inversify"
import { TYPES } from "../../config/types"
import { IGlacierUploader, IGlacierUploadStrategy, GlacierUploaderStrategyMissing, GlacierInitiateUploadFailed, GlacierPartsUploadFailed, GlacierCompleteUploadFailed, GlacierMultipartUploadIdMissing, GlacierUploadArchiveFailed, GlacierArchiveIdMissing } from "../../services/GlacierUploader/GlacierUploader"
import { IUploadJobCreator, UploadType, UploadJobCreatorError } from "../upload-job-creator/UploadJobCreator"
import { IFileHelper, FileHelperError } from "../../helpers/file/FileHelper"
import { ILogger } from "../../helpers/logger/Logger"
import { ErrorMessages, UploaderUnknownStrategyError, UploaderEmptyFileError, UploaderMaxPartsError, UploaderError } from "./UploaderErrors"
import { IVaultCreator, VaultCreatorCreationError, VaultCreatorDescribeError } from "../../services/VaultCreator/VaultCreator"

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
  private vaultCreator: IVaultCreator
  private singleUploadStrategy: IGlacierUploadStrategy
  private multipartUploadStrategy: IGlacierUploadStrategy
  private stubUploadStrategy: IGlacierUploadStrategy
  private logger: ILogger

  public constructor(
    @inject(TYPES.AppConfig) config: AppConfig,
    @inject(TYPES.IGlacierUploader) uploadService: IGlacierUploader,
    @inject(TYPES.FileHelper) fileHelper: IFileHelper,
    @inject(TYPES.IUploadJobCreator) uploadJobCreator: IUploadJobCreator,
    @inject(TYPES.VaultCreator) vaultCreator: IVaultCreator,
    @inject(TYPES.GlacierSingleStrategy) singleUploadStrategy: IGlacierUploadStrategy,
    @inject(TYPES.GlacierMultipartStrategy) multipartUploadStrategy: IGlacierUploadStrategy,
    @inject(TYPES.GlacierStubStrategy) stubUploadStrategy: IGlacierUploadStrategy,
    @inject(TYPES.Logger) logger: ILogger
  ) {
    this.config = config
    this.uploadService = uploadService
    this.fileHelper = fileHelper
    this.uploadJobCreator = uploadJobCreator
    this.vaultCreator = vaultCreator
    this.singleUploadStrategy = singleUploadStrategy
    this.multipartUploadStrategy = multipartUploadStrategy
    this.stubUploadStrategy = stubUploadStrategy
    this.logger = logger
  }

  public async upload(filepath: string): Promise<UploadResult> {
    try {
      const fileInfo = await this.fileHelper.read(filepath)

      const size = fileInfo.size

      this.checkFileSize(size)

      const uploadJob = this.uploadJobCreator.getUploadJob(fileInfo)

      this.vaultCreator.createVault()

      this.setUploadStrategy(uploadJob.kind)

      const result = await this.uploadService.upload(uploadJob)

      this.logger.info(`Successfully uploaded ${filepath} of ${size} Bytes to Glacier.`)

      return {
        archiveId: result.archiveId
      }
    } catch (err) {
      throw Uploader.fromError(err)
    }
  }

  private setUploadStrategy(uploadType: UploadType): void {
    if (this.config.dryRun) {
      this.uploadService.setStrategy(this.stubUploadStrategy)
      this.logger.debug("Using stub file upload strategy")

      return
    }

    switch (uploadType) {
    case "single":
      this.uploadService.setStrategy(this.singleUploadStrategy)
      break
    case "multipart":
      this.uploadService.setStrategy(this.multipartUploadStrategy)
      break
    default:
      throw new UploaderUnknownStrategyError()
    }
    this.logger.debug(`Using ${uploadType} file upload strategy`)
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

  public static fromError(err: Error): UploaderError {
    switch (true) {
    case err instanceof UploaderUnknownStrategyError:
      return new UploaderError(ErrorMessages.unknownUploadStrategy)
    case err instanceof UploaderMaxPartsError:
      return new UploaderError(ErrorMessages.maxUploadParts)
    case err instanceof UploaderEmptyFileError:
      return new UploaderError(ErrorMessages.emptyFile)
    case err instanceof FileHelperError:
      return new UploaderError(`${ErrorMessages.fileHelper}. ${err.message}`)
    case err instanceof GlacierUploaderStrategyMissing:
      return new UploaderError(ErrorMessages.noUploadStrategy)
    case err instanceof GlacierInitiateUploadFailed:
      return new UploaderError(`${ErrorMessages.initiateUpload}. ${err.message}`)
    case err instanceof GlacierPartsUploadFailed:
      return new UploaderError(`${ErrorMessages.partUpload}. ${err.message}`)
    case err instanceof GlacierCompleteUploadFailed:
      return new UploaderError(`${ErrorMessages.completeUpload}. ${err.message}`)
    case err instanceof GlacierMultipartUploadIdMissing:
      return new UploaderError(ErrorMessages.uploadId)
    case err instanceof GlacierUploadArchiveFailed:
      return new UploaderError(`${ErrorMessages.archiveUpload}. ${err.message}`)
    case err instanceof GlacierArchiveIdMissing:
      return new UploaderError(ErrorMessages.archiveId)
    case err instanceof UploadJobCreatorError:
      return new UploaderError(`${ErrorMessages.jobCreation}. ${err.message}`)
    case err instanceof VaultCreatorCreationError:
      return new UploaderError(`${ErrorMessages.vaultCreation}. ${err.message}`)
    case err instanceof VaultCreatorDescribeError:
      return new UploaderError(`${ErrorMessages.vaultDescribe}. ${err.message}`)
    default:
      return new UploaderError(`${ErrorMessages.unknown}. ${err.message}`)
    }
  }
}
