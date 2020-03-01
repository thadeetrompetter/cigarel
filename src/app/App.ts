import "reflect-metadata"
import { Bootstrap } from "../config/Bootstrap"
import { ConfigInput } from "./config/Config"
import { Container } from "inversify"
import { IUploader } from "./uploader/Uploader"
import { TYPES } from "../config/types"

export class App {
  private container: Container

  constructor(config: ConfigInput) {
    this.container = new Bootstrap().setup(config)
  }

  public async upload(filepath: string): Promise<void> {
    const result = await this.container.get<IUploader>(TYPES.Uploader).upload(filepath)
    console.info(JSON.stringify(result, null, 2))
  }
}
