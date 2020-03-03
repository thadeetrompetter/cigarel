import "reflect-metadata"
import { Bootstrap } from "../config/Bootstrap"
import { ConfigInput } from "./config/Config"
import { Container } from "inversify"
import { IUploader, UploadResult } from "./uploader/Uploader"
import { TYPES } from "../config/types"

export class App {
  private container: Container

  constructor(config: ConfigInput) {
    this.container = new Bootstrap().setup(config)
  }

  public upload(filepath: string): Promise<UploadResult> {
    return this.container.get<IUploader>(TYPES.Uploader).upload(filepath)
  }
}
