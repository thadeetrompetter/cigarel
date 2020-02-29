import { Container } from "inversify"
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
import { Config, ConfigInput } from "../app/config/Config"
import { getLogger, ILogger } from "../helpers/logger/Logger"
import { Validator, IValidator } from "../app/config/validator"
import { GlacierStubUpload } from "../services/GlacierUploader/GlacierStubUpload"

export class Bootstrap {
  private container: Container

  constructor () {
    this.container = new Container()
  }

  public setup(input: ConfigInput): Container {
    // Validator
    this.container.bind<IValidator>(TYPES.SchemaValidator).to(Validator)
    // App Config
    this.container.bind<Config>(TYPES.AppConfig).toDynamicValue(({ container }) => {
      return new Config(container.get<IValidator>(TYPES.SchemaValidator), input)
    })
    this.container.bind<string>(TYPES.WorkDir).toConstantValue(process.cwd())

    // Logger
    this.container.bind<ILogger>(TYPES.Logger).toDynamicValue(c => {
      return getLogger(c.container.get<Config>(TYPES.AppConfig).logLevel)
    })

    // File system
    this.container.bind<BatchProcessor>(TYPES.BatchProcessor).toFunction(batchProcess)
    this.container.bind<FileReader>(TYPES.FileReader).toFunction(promises.readFile)
    this.container.bind<IFileHelper>(TYPES.FileHelper).to(FileHelper)
    this.container.bind<ReadStreamCreator>(TYPES.ReadStreamCreator).toFunction(createReadStream)
    this.container.bind<StreamToBuffer>(TYPES.StreamToBuffer).toFunction(streamToBuffer)

    // Glacier AWS service
    this.container.bind<Glacier>(TYPES.Glacier).toDynamicValue(() => {
      return new Glacier({ apiVersion: "2012-06-01", region: "eu-central-1" })
    })

    // Glacier upload service
    this.container.bind<IGlacierUploader>(TYPES.IGlacierUploader).to(GlacierUploader)

    // Upload strategies
    this.container.bind<GlacierSingleUpload>(TYPES.GlacierSingleStrategy).to(GlacierSingleUpload)
    this.container.bind<GlacierMultipartUpload>(TYPES.GlacierMultipartStrategy).to(GlacierMultipartUpload)
    this.container.bind<GlacierStubUpload>(TYPES.GlacierStubStrategy).to(GlacierStubUpload)

    // Upload job creator
    this.container.bind<IUploadJobCreator>(TYPES.IUploadJobCreator).to(UploadJobCreator)

    // Uploader
    this.container.bind<Uploader>(TYPES.Uploader).to(Uploader)

    return this.container
  }
}
