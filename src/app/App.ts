import "reflect-metadata"
import bootstrap from "../config/Bootstrap"

async function main(): Promise<void> {
  const uploader = bootstrap()
  const result = await uploader.upload(`${process.cwd()}/single.zip`)
  console.log(result)
}

main()
