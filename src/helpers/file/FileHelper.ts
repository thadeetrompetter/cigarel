import { injectable, inject } from "inversify"
import { isAbsolute, resolve } from "path"
import { promises } from "fs"
import { TYPES } from "../../config/types"
const { readFile } = promises

export type FileReader = typeof readFile

export interface FileInfo {
  contents: Buffer
  path: string
  size: number
}

export interface IFileHelper {
  read(path: string): Promise<FileInfo>
}

@injectable()
export class FileHelper implements IFileHelper {
  private readonly readFile: FileReader
  private readonly workDir: string

  public constructor(
    @inject(TYPES.FileReader) readFile: FileReader,
    @inject(TYPES.WorkDir) workDir: string
  ) {
    this.readFile = readFile
    this.workDir = workDir
  }

  public async read(path: string): Promise<FileInfo> {
    const p = this.getFilePath(path)

    return this.readFile(path)
      .then(contents => ({
        contents,
        path: p,
        size: contents.length
      }))
      .catch(err => {
        throw new FileHelperError(err.message)
      })
  }

  private getFilePath (path: string): string {
    return isAbsolute(path) ? path : resolve(this.workDir, path)
  }
}

export class FileHelperError extends Error {}
