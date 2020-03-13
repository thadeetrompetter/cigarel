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
import { Validator, IValidator } from "../app/config/Validator"
import { GlacierStubUpload } from "../services/GlacierUploader/GlacierStubUpload"
import { VaultCreator, IVaultCreator } from "../services/VaultCreator/VaultCreator"
import {Credentials} from "aws-sdk"
import {ClientConfiguration} from "aws-sdk/clients/glacier"

export class Bootstrap {
  private readonly container: Container

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
    this.container.bind<Glacier>(TYPES.Glacier).toDynamicValue(({ container }) => {
      const region = container.get<Config>(TYPES.AppConfig).region
      const logger = container.get<ILogger>(TYPES.Logger)

      logger.debug(`set up AWS Glacier for region ${region}`)

      const params: ClientConfiguration = { apiVersion: "2012-06-01", region }
      const creds = this.getAWSCredentials()
      if (creds) {
        logger.debug("Using user-provided AWS credentials")
        params.credentials = creds
      }

      return new Glacier(params)
    }).inSingletonScope()

    // Glacier upload service
    this.container.bind<IGlacierUploader>(TYPES.IGlacierUploader).to(GlacierUploader)

    // Upload strategies
    this.container.bind<GlacierSingleUpload>(TYPES.GlacierSingleStrategy).to(GlacierSingleUpload)
    this.container.bind<GlacierMultipartUpload>(TYPES.GlacierMultipartStrategy).to(GlacierMultipartUpload)
    this.container.bind<GlacierStubUpload>(TYPES.GlacierStubStrategy).to(GlacierStubUpload)

    // Upload job creator
    this.container.bind<IUploadJobCreator>(TYPES.IUploadJobCreator).to(UploadJobCreator)

    // Vault creator
    this.container.bind<IVaultCreator>(TYPES.VaultCreator).to(VaultCreator)

    // Uploader
    this.container.bind<Uploader>(TYPES.Uploader).to(Uploader)

    return this.container
  }

  private getAWSCredentials(): Credentials | null {
    const { accessKeyId, secretAccessKey, sessionToken } = this.container.get<Config>(TYPES.AppConfig)
    if (accessKeyId && secretAccessKey) {
      const creds = new Credentials(accessKeyId, secretAccessKey)
      if (sessionToken) {
        creds.sessionToken = sessionToken
      }

      return creds
    }

    return null
  }
}
