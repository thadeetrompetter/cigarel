import { isAbsolute, resolve } from "path"
import { createReadStream, ReadStream } from "fs"
import { FileSplitterError } from "./FileSplitterError"
import { inject, injectable } from "inversify"
import { TYPES } from "../../config/types"
import { FileSizeHelper } from "../../helpers/file/get-file-size"

export type FileSplitResult = FilePart[]

export interface IFileSplitter {
  split(filepath: string): Promise<FileSplitResult>
}

export type ReadStreamCreator = typeof createReadStream

export interface FileSplitterConfig {
  bytesPerChunk?: number
}

export interface FilePart {
  start: number,
  end: number,
  stream: ReadStream
}

export const defaultChunkSize = 1024 * 1024 // 1 MB

@injectable()
export class FileSplitter implements IFileSplitter {
  private bytesPerChunk: number
  private fileSizeHelper: FileSizeHelper
  private readStreamCreator: ReadStreamCreator
  
  public constructor(
    @inject(TYPES.FileSizeHelper) fileSizeHelper: FileSizeHelper,
    @inject(TYPES.ReadStreamCreator) createReadStream: ReadStreamCreator,
    config: FileSplitterConfig
  ) {
    this.fileSizeHelper = fileSizeHelper
    this.readStreamCreator = createReadStream
    this.bytesPerChunk = config.bytesPerChunk || defaultChunkSize
  }
  
  public async split (filepath: string): Promise<FileSplitResult> {
    const p = this.getFilePath(filepath)
    try {
      const fileSize = await this.fileSizeHelper(p)
      return this.getFileStreams(p, fileSize)
    } catch (err) {
      throw new FileSplitterError(err.message)
    }
  }
  
  private getFilePath (path: string): string {
    return isAbsolute(path) ? path : resolve(process.cwd(), path)
  }

  private getFileStreams (path: string, size: number): FilePart[] {
    const bytesPerChunk = this.bytesPerChunk
    const parts: FilePart[] = []
    let cursor = 0
    
    while (true) {
      if ((size - cursor) - bytesPerChunk > 0) {
        const end = cursor + bytesPerChunk
        parts.push(this.createFilePart(path, cursor, end))
        cursor = end + 1
        continue
      }
      parts.push(this.createFilePart(path, cursor, Infinity))
      break
    }

    return parts
  }

  private createFilePart (path: string, start: number, end: number): FilePart {
    const range = { start, end }

    return {
      ...range,
      stream: this.readStreamCreator(path, { ...range })
    }
  }
}
