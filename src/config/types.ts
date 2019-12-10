export const TYPES = {
  Glacier: Symbol.for("Glacier"),
  GlacierSingleStrategy: Symbol.for("GlacierSingleStrategy"),
  GlacierMultipartStrategy: Symbol.for("GlacierMultipartStrategy"),
  AppConfig: Symbol.for("AppConfig"),
  WorkDir: Symbol.for("WorkDir"),
  FileHelper: Symbol.for("FileHelper"),
  StreamToBuffer: Symbol.for("StreamToBuffer"),
  FileReader: Symbol.for("FileReader"),
  ReadStreamCreator: Symbol.for("ReadStreamCreator"),
  BatchProcessor: Symbol.for("BatchProcessor"),
  IGlacierUploader: Symbol.for("IUploadService"),
  IUploadJobCreator: Symbol.for("IUploadJobCreator"),
  Uploader: Symbol.for("Uploader")
}
