import { Container } from "inversify"
import { TYPES } from "./types"
import { createReadStream } from "fs"
import getFileSize, { FileSizeHelper } from "../helpers/file/get-file-size"
import {ReadStreamCreator} from "../services/file-splitter/FileSplitter"

const container = new Container()
container.bind<FileSizeHelper>(TYPES.FileSizeHelper).toFunction(getFileSize)
container.bind<ReadStreamCreator>(TYPES.ReadStreamCreator).toFunction(createReadStream)
