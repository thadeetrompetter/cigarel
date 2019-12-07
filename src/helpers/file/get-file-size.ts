import {stat} from "fs"

/**
 * 
 * @param path Returns the file size in bytes for the file at given path
 */
export default function getFileSize (path: string): Promise<number> {
  return new Promise((resolve, reject) => {
    stat(path, (err, stats) => {
      if (err) { return reject(err) }
      if (!stats.isFile()) { return reject(new Error("file is not a regular file"))}
      resolve(stats.size)
    })
  })
}

export type FileSizeHelper = typeof getFileSize
