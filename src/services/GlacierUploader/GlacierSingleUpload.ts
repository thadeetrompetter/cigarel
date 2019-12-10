import { UploadPart } from "../../app/upload-job-creator/UploadJobCreator"
import { GlacierUploadResult, IGlacierUploadStrategy } from "./GlacierUploader"
import { Glacier } from "aws-sdk/clients/all"
import { AppConfig } from "../../app/config/Config"
import { injectable, inject } from "inversify"
import { TYPES } from "../../config/types"
import { StreamToBuffer } from "../../helpers/file/StreamToBuffer"

@injectable()
export class GlacierSingleUpload implements IGlacierUploadStrategy {
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

  /**
   * Upload a single archive. The stream taken from the first (and only) upload part
   * has to be converted to a Buffer because despite what is written in the glacier docs,
   * uploadArchive does not accept streams for body.
   *
   * @param parts to upload, take stream from the first element
   * @param treeHash treehash of entire file
   */
  public async upload([{ stream }]: UploadPart[], _treeHash: string): Promise<GlacierUploadResult> {
    let result
    const buffer = await this.streamToBuffer(stream)
    try {
      result = await this.glacier.uploadArchive({
        accountId: "-",
        body: buffer,
        vaultName: this.config.vaultName
      }).promise()
    } catch (err) {
      throw new GlacierUploadArchiveFailed(err.message)
    }

    if (!result.archiveId) {
      throw new GlacierArchiveIdMissing()
    }

    return { archiveId: result.archiveId }
  }
}


export class GlacierSingleUploadError extends Error {}
export class GlacierUploadArchiveFailed extends GlacierSingleUploadError {}
export class GlacierArchiveIdMissing extends GlacierSingleUploadError {}
