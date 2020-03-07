import "reflect-metadata"
import { Mock, MockBehavior } from "typemoq"
import { AppConfig } from "../../../../src/app/config/Config"
import { Glacier, AWSError, Request, Response } from "aws-sdk"
import { VaultCreator, VaultCreatorDescribeError, VaultCreatorCreationError } from "../../../../src/services/VaultCreator/VaultCreator"
import { ILogger } from "../../../../src/helpers/logger/Logger"
import { DescribeVaultOutput, CreateVaultOutput } from "aws-sdk/clients/glacier"
import { PromiseResult } from "aws-sdk/lib/request"

describe("VaultCreator", () => {
  const vaultName = "vault name"
  const accountId = "-"
  const vaultParams = { accountId, vaultName }
  const config = Mock.ofType<AppConfig>(undefined, MockBehavior.Strict)
  const glacier = Mock.ofType<Glacier>(Glacier, MockBehavior.Strict)
  const describeVaultRequest = Mock.ofType<Request<DescribeVaultOutput, AWSError>>(undefined, MockBehavior.Strict)
  const describeVaultResponse = Mock.ofType<Response<DescribeVaultOutput, AWSError>>(undefined, MockBehavior.Strict)
  const createVaultRequest = Mock.ofType<Request<CreateVaultOutput, AWSError>>(undefined, MockBehavior.Strict)
  const createVaultResponse = Mock.ofType<Response<CreateVaultOutput, AWSError>>(undefined, MockBehavior.Strict)
  const logger = Mock.ofType<ILogger>(undefined, MockBehavior.Strict)
  const awsError = Mock.ofType<AWSError>(undefined, MockBehavior.Strict)

  beforeEach(() => {
    config.reset()
    glacier.reset()
    logger.reset()
    describeVaultRequest.reset()
    createVaultRequest.reset()
    createVaultResponse.reset()
    awsError.reset()
  })

  afterEach(() => {
    config.verifyAll()
    glacier.verifyAll()
    logger.verifyAll()
    describeVaultRequest.verifyAll()
    createVaultRequest.verifyAll()
    createVaultResponse.verifyAll()
    awsError.verifyAll()
  })

  it("will create a vault by the specified name if it doesn't exist", async () => {
    const createResponse: PromiseResult<CreateVaultOutput, AWSError> = {
      $response: createVaultResponse.object
    }

    awsError.setup(a => a.statusCode)
      .returns(() => 404)

    config.setup(c => c.vaultName)
      .returns(() => vaultName)

    logger.setup(l => l.debug(`Create vault ${vaultName}`))

    describeVaultRequest.setup(d => d.promise())
      .returns(() => Promise.reject(awsError.object))

    glacier.setup(g => g.describeVault(vaultParams))
      .returns(() => describeVaultRequest.object)

    createVaultRequest.setup(c => c.promise())
      .returns(() => Promise.resolve(createResponse))

    glacier.setup(g => g.createVault(vaultParams))
      .returns(() => createVaultRequest.object)

    const vaultCreator = new VaultCreator(config.object, glacier.object, logger.object)

    await expect(vaultCreator.createVault())
      .resolves
      .toBeUndefined()
  })

  it("will not create a vault if one already exists with the given name", async () => {
    const describeResponse: PromiseResult<DescribeVaultOutput, AWSError> = {
      $response: describeVaultResponse.object
    }

    config.setup(c => c.vaultName)
      .returns(() => vaultName)

    logger.setup(l => l.debug(`Found vault ${vaultName}`))

    describeVaultRequest.setup(d => d.promise())
      .returns(() => Promise.resolve(describeResponse))

    glacier.setup(g => g.describeVault(vaultParams))
      .returns(() => describeVaultRequest.object)

    const vaultCreator = new VaultCreator(config.object, glacier.object, logger.object)

    await expect(vaultCreator.createVault())
      .resolves
      .toBeUndefined()
  })

  it("will throw a VaultCreatorDescribeError if describing the vault fails", async () => {
    const errorMessage = "vault describe error"

    config.setup(c => c.vaultName)
      .returns(() => vaultName)

    awsError.setup(a => a.statusCode)
      .returns(() => 400)

    awsError.setup(a => a.message)
      .returns(() => errorMessage)

    describeVaultRequest.setup(d => d.promise())
      .returns(() => Promise.reject(awsError.object))

    glacier.setup(g => g.describeVault(vaultParams))
      .returns(() => describeVaultRequest.object)

    logger.setup(l => l.error(`Failed to get info for ${vaultName}`))

    const vaultCreator = new VaultCreator(config.object, glacier.object, logger.object)

    await expect(vaultCreator.createVault())
      .rejects
      .toThrowError(VaultCreatorDescribeError)
  })

  it("will throw a VaultCreatorCreationError if creating a new vault fails", async () => {
    const errorMessage = "vault error"
    const vaultCreateError = Mock.ofType<AWSError>(undefined, MockBehavior.Strict)

    config.setup(c => c.vaultName)
      .returns(() => vaultName)

    awsError.setup(a => a.statusCode)
      .returns(() => 404)

    describeVaultRequest.setup(d => d.promise())
      .returns(() => Promise.reject(awsError.object))

    createVaultRequest.setup(c => c.promise())
      .returns(() => Promise.reject(vaultCreateError.object))

    glacier.setup(g => g.describeVault(vaultParams))
      .returns(() => describeVaultRequest.object)

    glacier.setup(g => g.createVault(vaultParams))
      .returns(() => createVaultRequest.object)

    vaultCreateError.setup(v => v.message)
      .returns(() => errorMessage)

    logger.setup(l => l.debug(`Create vault ${vaultName}`))

    logger.setup(l => l.error(`Failed to create vault ${vaultName}`))

    const vaultCreator = new VaultCreator(config.object, glacier.object, logger.object)

    await expect(vaultCreator.createVault())
      .rejects
      .toThrowError(VaultCreatorCreationError)

  })
})
