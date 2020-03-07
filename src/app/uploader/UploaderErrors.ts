export enum ErrorMessages {
  unknownUploadStrategy = "An unknown upload strategy was selected",
  maxUploadParts = "Maximum number of 10000 upload parts exceeded",
  emptyFile = "Selected file is empty",
  fileHelper = "Failed to read a file",
  noUploadStrategy = "No upload strategy was selected",
  initiateUpload = "Failed to initiate multipart upload",
  partUpload = "Failed to upload multipart part(s)",
  completeUpload = "Failed to complete multipart upload",
  uploadId = "Multipart upload ID is missing",
  archiveUpload = "Failed to upload an archive",
  archiveId = "Archive ID is missing",
  jobCreation = "Failed to create upload job",
  vaultCreation = "Failed to create new vault",
  vaultDescribe = "Failed to get info for vault",
  unknown = "Uploader unknown error"
}

export class UploaderError extends Error {}
export class UploaderUnknownStrategyError extends UploaderError {}
export class UploaderMaxPartsError extends UploaderError {}
export class UploaderEmptyFileError extends UploaderError {}
