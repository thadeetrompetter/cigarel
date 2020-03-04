import {IGlacierUploadStrategy, GlacierUploadResult} from "./GlacierUploader"
import { injectable, inject } from "inversify"
import { ILogger } from "../../helpers/logger/Logger"
import { UploadPart } from "../../app/upload-job-creator/UploadJobCreator"
import { TYPES } from "../../config/types"

@injectable()
export class GlacierStubUpload implements IGlacierUploadStrategy{
  private logger: ILogger

  constructor(@inject(TYPES.Logger) logger: ILogger) {
    this.logger = logger
  }

  public async upload(parts: UploadPart[], treeHash: string): Promise<GlacierUploadResult> {
    this.logger.debug(`stub upload ${parts.length} with hash ${treeHash}`)

    return { archiveId: "stub" }
  }
}
