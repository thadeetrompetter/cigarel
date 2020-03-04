import ajv, { ValidateFunction } from "ajv"
import { ConfigInput } from "./Config"
import { injectable } from "inversify"

export interface ValidationResult {
  valid: boolean
  errors: string[] | null
}

export interface IValidator {
  validate(input: ConfigInput): ValidationResult
}

@injectable()
export class Validator implements IValidator {
  private validator: ValidateFunction
  constructor () {
    this.validator = new ajv().compile(Validator.schema)
  }

  public validate(input: ConfigInput): ValidationResult {
    const result = this.validator(input)
    return {
      valid: result as boolean,
      errors: this.getErrorsFromValidator()
    }
  }

  private getErrorsFromValidator(): string[] {
    const { errors } = this.validator
    if (!errors) {
      return []
    }
    return errors.map<string>(error =>
      `${error.dataPath.slice(1)}: ${error.message}`
    )
  }

  public static readonly regions = [
    "us-east-2",
    "us-east-1",
    "us-west-1",
    "us-west-2",
    "ap-east-1",
    "ap-south-1",
    "ap-northeast-3",
    "ap-northeast-2",
    "ap-southeast-1",
    "ap-southeast-2",
    "ap-northeast-1",
    "ca-central-1",
    "eu-central-1",
    "eu-west-1",
    "eu-west-2",
    "eu-west-3",
    "eu-north-1",
    "me-south-1",
    "sa-east-1",
  ]

  private static readonly schema = {
    type: "object",
    properties: {
      size: { type: "number", minimum: 1, maximum: 4096 },
      concurrency: { type: "number", minimum: 1 },
      logLevel: { enum: ["error", "warn", "info", "verbose", "debug", "silly"] },
      vaultName: { type: "string", minLength: 1 },
      dryRun: { type: "boolean" },
      region: { enum: Validator.regions }
    }
  }
}
