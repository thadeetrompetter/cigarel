import "reflect-metadata"
import {Validator} from "../../../../src/app/config/validator"
import { LogLevel } from "../../../../src/helpers/logger/Logger"

describe("Validator", () => {
  it("will validate an object of app command line pamaters", () => {
    const result = new Validator().validate({
      concurrency: 2,
      vaultName: "test vault name",
      logLevel: "debug",
      description: "test description",
      size: 4
    })
    expect(result).toEqual({ valid: true, errors: [] })
  })

  it("will report errors if params with a bad value are provided", () => {
    const validator = new Validator()

    expect(validator.validate({
      logLevel: "ponies" as LogLevel,
    })).toEqual({ valid: false, errors: [
      "logLevel: should be equal to one of the allowed values"
    ]})

    expect(validator.validate({
      concurrency: "bork" as unknown as number
    })).toEqual({
      valid: false,
      errors: ["concurrency: should be number"]
    })

    expect(validator.validate({
      vaultName: ""
    })).toEqual({
      valid: false,
      errors: [
        "vaultName: should NOT be shorter than 1 characters"
      ]
    })

    expect(validator.validate({
      size: -1
    })).toEqual({
      valid: false,
      errors: [
        "size: should be >= 1"
      ]
    })

    expect(validator.validate({
      size: 4097
    })).toEqual({
      valid: false,
      errors: [
        "size: should be <= 4096"
      ]
    })
  })
})
