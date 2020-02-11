import { createReadStream, ReadStream } from "fs"
import { inject, injectable } from "inversify"
import { TYPES } from "../../config/types"
import { FileInfo } from "../../helpers/file/FileHelper"
import { Glacier } from "aws-sdk/clients/all"
import { AppConfig } from "../config/Config"

export type UploadJobs = UploadJob[]

export interface IUploadJobCreator {
  getUploadJob(fileInfo: FileInfo): UploadJob
}

export type ReadStreamCreator = typeof createReadStream

export type UploadType = "single" | "multipart"

export interface UploadJob {
  kind: UploadType
  treeHash: string
  parts: UploadPart[]
}

export interface UploadPart {
  start: number
  end: number
  stream: ReadStream
}

@injectable()
export class UploadJobCreator implements IUploadJobCreator {
  private chunkSize: number
  private readStreamCreator: ReadStreamCreator
  private glacier: Glacier

  public constructor(
    @inject(TYPES.AppConfig) config: AppConfig,
    @inject(TYPES.ReadStreamCreator) createReadStream: ReadStreamCreator,
    @inject(TYPES.Glacier) glacier: Glacier,
  ) {
    this.readStreamCreator = createReadStream
    this.chunkSize = config.chunkSize
    this.glacier = glacier
  }

  public getUploadJob (fileInfo: FileInfo): UploadJob {
    const parts = this.createUploadParts(fileInfo)
    return {
      kind: parts.length > 1 ? "multipart" : "single",
      treeHash: this.calculateHashForFile(fileInfo),
      parts
    }
  }

  private createUploadParts ({ path, size }: FileInfo): UploadPart[] {
    const bytesPerChunk = this.chunkSize
    const parts: UploadPart[] = []
    let cursor = 0

    while (true) {
      if ((size - cursor) - bytesPerChunk > 0) {
        const end = cursor + bytesPerChunk - 1
        parts.push(this.createUploadPart(path, cursor, end))
        cursor = end + 1
        continue
      }
      parts.push(this.createUploadPart(path, cursor, size - 1))
      break
    }

    return parts
  }

  private createUploadPart (path: string, start: number, end: number): UploadPart {
    const range = { start, end }

    return {
      ...range,
      stream: this.readStreamCreator(path, { ...range })
    }
  }

  private calculateHashForFile({ contents }: FileInfo): string {
    return this.calculateHash(contents)
  }

  private calculateHash(contents: Buffer): string  {
    return this.glacier.computeChecksums(contents).treeHash
  }
}
