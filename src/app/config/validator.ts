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

  private static schema = {
    type: "object",
    properties: {
      size: { type: "number", minimum: 1, maximum: 4096 },
      concurrency: { type: "number", minimum: 1 },
      logLevel: { enum: ["error", "warn", "info", "verbose", "debug", "silly"] },
      vaultName: { type: "string", minLength: 1 },
      dryRun: { type: "boolean" }
    }
  }
}
