import "reflect-metadata"
import { promises } from "fs"
import { FileHelper, FileReader } from "../../../../src/helpers/file/FileHelper"
import { Mock, Times } from "typemoq"

describe("fileHelper", () => {
  const readFileMock = Mock.ofInstance<FileReader>(promises.readFile)
  const workDir = "/some-dir"
  const fileHelper = new FileHelper(readFileMock.object, workDir)
  
  beforeEach(() => {
    readFileMock.reset()
  })
  
  afterEach(() => {
    readFileMock.verifyAll()
  })
  
  it("will read a file and return its contents and size", async () => {
    const path = "./some-path"
    const value = "some value"

    readFileMock.setup(r => r(path))
      .returns(() => Promise.resolve(Buffer.from(value)))
      .verifiable(Times.once())

    const { contents, size } = await fileHelper.read(path)
    
    expect(contents.toString()).toBe(value)
    expect(size).toBe(value.length)
  })

  it("will generate an error if the file cannot be read", async () => {
    const path = "./some-path"
    const error = new Error("file error")

    readFileMock.setup(r => r(path))
      .throws(error)
      .verifiable(Times.once())

    await expect(fileHelper.read(path))
      .rejects
      .toThrowError(error)
  })

  test.each`
pathType | path | result
${"absolute"} | ${"/some/absolute/path"} | ${"/some/absolute/path"}
${"relative"} | ${"./relative/path/parts"} | ${"/some-dir/relative/path/parts"}
`("will return the path for path type $pathType", async ({ path, result }) => {
  const value = "some value"
  readFileMock.setup(r => r(path))
    .returns(() => Promise.resolve(Buffer.from(value)))
    .verifiable(Times.once())

  const val = await fileHelper.read(path)
  expect(val.path).toBe(result)
})
})
