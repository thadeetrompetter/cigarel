import * as inversify from "inversify"
import { TYPES } from "./types"
import { createReadStream, promises } from "fs"
import {ReadStreamCreator, IUploadJobCreator, UploadJobCreator} from "../app/upload-job-creator/UploadJobCreator"
import { IGlacierUploader, GlacierUploader } from "../services/GlacierUploader/GlacierUploader"
import { Glacier } from "aws-sdk/clients/all"
import { FileHelper, FileReader, IFileHelper } from "../helpers/file/FileHelper"
import { streamToBuffer, StreamToBuffer } from "../helpers/file/StreamToBuffer"
import { GlacierSingleUpload } from "../services/GlacierUploader/GlacierSingleUpload"
import { GlacierMultipartUpload } from "../services/GlacierUploader/GlacierMultipartUpload"
import batchProcess, { BatchProcessor } from "../helpers/concurrency/BatchProcessor"
import { Uploader } from "../app/uploader/Uploader"
import { Config } from "../app/config/Config"

export default function bootstrap(): void {
  const container = new inversify.Container()

  // App Config
  container.bind<Config>(TYPES.AppConfig).toDynamicValue(() => {
    return new Config({
      fileSizeInMB: 8
    })
  })
  container.bind<string>(TYPES.WorkDir).toConstantValue(process.cwd())

  // File system
  container.bind<BatchProcessor>(TYPES.BatchProcessor).toFunction(batchProcess)
  container.bind<FileReader>(TYPES.FileReader).toFunction(promises.readFile)
  container.bind<IFileHelper>(TYPES.FileHelper).to(FileHelper)
  container.bind<ReadStreamCreator>(TYPES.ReadStreamCreator).toFunction(createReadStream)
  container.bind<StreamToBuffer>(TYPES.StreamToBuffer).toFunction(streamToBuffer)

  // Glacier AWS service
  container.bind<Glacier>(TYPES.Glacier).toDynamicValue(() => {
    return new Glacier({ apiVersion: "2012-06-01", region: "eu-central-1" })
  })

  // Glacier upload service
  container.bind<IGlacierUploader>(TYPES.IGlacierUploader).to(GlacierUploader)

  // Upload strategies
  container.bind<GlacierSingleUpload>(TYPES.GlacierSingleStrategy).to(GlacierSingleUpload)
  container.bind<GlacierMultipartUpload>(TYPES.GlacierMultipartStrategy).to(GlacierMultipartUpload)

  // Upload job creator
  container.bind<IUploadJobCreator>(TYPES.IUploadJobCreator).to(UploadJobCreator)

  // Uploader
  container.bind<Uploader>(TYPES.Uploader).to(Uploader)

  return container.get<Uploader>(TYPES.Uploader)
}
