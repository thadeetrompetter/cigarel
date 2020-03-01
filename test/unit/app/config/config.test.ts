import "reflect-metadata"
import { Config, ConfigError, ConfigInput } from "../../../../src/app/config/Config"
import { LogLevel } from "../../../../src/helpers/logger/Logger"
import { ValidationResult } from "../../../../src/app/config/validator"

const mb = 1024 * 1024

describe("Config", () => {
  const validationFn = jest.fn<ValidationResult, [ConfigInput]>()
  validationFn.mockReturnValue({ valid: true, errors: [] })
  const validator = {
    validate: validationFn
  }

  afterEach(() => validationFn.mockClear())

  it("Will set the chunk size for upload parts in MB", () => {
    const config1 = new Config(validator, { size: 1 })
    expect(config1.chunkSize).toBe(1 * mb)

    const config2 = new Config(validator, { size: 8 })
    expect(config2.chunkSize).toBe(8 * mb)
  })

  it("Will set chunk size to default if given chunkSize is less than default chunk size", () => {
    const config = new Config(validator, { size: 1 / 2 })
    expect(config.chunkSize).toBe(1 * mb)
  })

  it("Will round down to 1MB times 2 to the nearest power n", () => {
    const config = new Config(validator, { size: 18 })
    expect(config.chunkSize).toBe(16 * mb)
  })

  it("will throw a ConfigError when chunk size exceeds the maximum", () => {
    // more than 4GB
    expect(() => new Config(validator, { size: 8192 }))
      .toThrowError(new ConfigError("chunk size exceeds maximum of 4GB"))
  })

  it("Will set upload/download concurrency", () => {
    // default value
    const config1 = new Config(validator)
    expect(config1.concurrency).toBe(5)
    // user determined value
    const config2 = new Config(validator, { concurrency: 7 })
    expect(config2.concurrency).toBe(7)
  })

  it("will set a description for the archive if one is provided", () => {
    const description = "archive description"
    const config = new Config(validator, { description })

    expect(config.description).toBe(description)
  })

  it("will not set description for the archive if an empty string is provided", () => {
    const description = ""
    const config = new Config(validator, { description })

    expect(config.description).toBeUndefined()
  })

  it("will set a logLevel", () => {
    const logLevel: LogLevel = "info"
    const config = new Config(validator, { logLevel })

    expect(config.logLevel).toBe(logLevel)
  })

  it("will set dry run mode", () => {
    const dryRun = true
    const config = new Config(validator, { dryRun })

    expect(config.dryRun).toBe(true)
  })

  it("dry run will default to false if not configured", () => {
    const config = new Config(validator)

    expect(config.dryRun).toBe(false)
  })

  it("will set a vault name", () => {
    const vaultName = "my-custom-vault"
    const config = new Config(validator, { vaultName })

    expect(config.vaultName).toBe(vaultName)
  })

  it("will throw if input schema validation fails", () => {
    validationFn.mockReturnValueOnce({
      valid: false,
      errors: [
        "this is not ok",
        "this is also not ok, but not shown"
      ]
    })

    expect(() => {
      new Config(validator, {})
    }).toThrowError(new ConfigError("this is not ok"))
  })
})
