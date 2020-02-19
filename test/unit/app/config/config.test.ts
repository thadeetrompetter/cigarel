import { Config, ConfigError } from "../../../../src/app/config/Config"

const mb = 1024 * 1024

describe("Config", () => {
  it("Will set the chunk size for upload parts in MB", () => {
    const config1 = new Config({ fileSizeInMB: 1 })
    expect(config1.chunkSize).toBe(1 * mb)

    const config2 = new Config({ fileSizeInMB: 8 })
    expect(config2.chunkSize).toBe(8 * mb)
  })

  it("Will set chunk size to default if given chunkSize is less than default chunk size", () => {
    const config = new Config({ fileSizeInMB: 1 / 2 })
    expect(config.chunkSize).toBe(1 * mb)
  })

  it("Will round down to 1MB times 2 to the nearest power n", () => {
    const config = new Config({ fileSizeInMB: 18 })
    expect(config.chunkSize).toBe(16 * mb)
  })

  it("will throw a ConfigError when chunk size exceeds the maximum", () => {
    // more than 4GB
    expect(() => new Config({ fileSizeInMB: 8192 }))
      .toThrowError(new ConfigError("chunk size exceeds maximum of 4GB"))
  })

  it("Will set upload/download concurrency", () => {
    // default value
    const config1 = new Config()
    expect(config1.concurrency).toBe(5)
    // user determined value
    const config2 = new Config({ concurrency: 7 })
    expect(config2.concurrency).toBe(7)
  })

  it("will set a description for the archive if one is provided", () => {
    const description = "archive description"
    const config = new Config({ description })

    expect(config.description).toBe(description)
  })

  it("will not set description for the archive if an empty string is provided", () => {
    const description = ""
    const config = new Config({ description })

    expect(config.description).toBeUndefined()
  })
})
