import { injectable, inject } from "inversify"
import { TYPES } from "../../config/types"
import { Glacier, AWSError } from "aws-sdk"
import { AppConfig } from "../../app/config/Config"
import { ILogger } from "../../helpers/logger/Logger"

export interface IVaultCreator {
  createVault(): Promise<void>
}

interface VaultParams {
  accountId: string
  vaultName: string
}

@injectable()
export class VaultCreator implements IVaultCreator{
  private static defaultParams = { accountId: "-" }
  private readonly config: AppConfig
  private readonly glacier: Glacier
  private readonly logger: ILogger
  constructor(
    @inject(TYPES.AppConfig) config: AppConfig,
    @inject(TYPES.Glacier) glacier: Glacier,
    @inject(TYPES.Logger) logger: ILogger
  ) {
    this.config = config
    this.glacier = glacier
    this.logger = logger
  }

  public async createVault(): Promise<void> {
    const { vaultName } = this.config
    const params = { ...VaultCreator.defaultParams, vaultName }
    await this.createVaultIfNotExists(params)
  }

  private async createVaultIfNotExists(params: VaultParams): Promise<void> {
    if (!await this.vaultExists(params)) {
      this.logger.debug(`Create vault ${params.vaultName}`)

      return await this.doCreateVault(params)
    }

    this.logger.debug(`Found vault ${params.vaultName}`)
  }

  private async vaultExists(params: VaultParams): Promise<boolean> {
    return await this.glacier.describeVault(params).promise()
      .then(() => {
        return true
      })
      .catch((err: AWSError) => {
        if (err.statusCode === 404) {
          return false
        }
        this.logger.error(`Failed to get info for ${params.vaultName}`)

        throw new VaultCreatorDescribeError(err.message)
      })
  }

  private async doCreateVault(params: VaultParams): Promise<void> {
    await this.glacier.createVault(params).promise()
      .catch(err => {
        this.logger.error(`Failed to create vault ${params.vaultName}`)

        throw new VaultCreatorCreationError(err.message)
      })
  }
}

class VaultCreatorError extends Error {}
export class VaultCreatorDescribeError extends VaultCreatorError {}
export class VaultCreatorCreationError extends VaultCreatorError {}
