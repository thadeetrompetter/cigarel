import batchProcessor, { BatchProcessTask } from "../../../../src/helpers/concurrency/BatchProcessor"
import { MockBehavior, Mock, Times } from "typemoq"
import { ILogger } from "../../../../src/helpers/logger/Logger"

describe("BatchProcessor", () => {
  const logger = Mock.ofType<ILogger>(undefined, MockBehavior.Strict)
  const task1 = jest.fn()
  const task2 = jest.fn()
  const task3 = jest.fn()

  const tasks: BatchProcessTask[] = [
    { id: "1", work: task1 },
    { id: "2", work: task2 },
    { id: "3", work: task3 }
  ]

  beforeEach(() => {
    logger.reset()
    task1.mockReset()
    task2.mockReset()
    task3.mockReset()
  })

  afterEach(() => {
    logger.verifyAll()
  })

  it("will process a list of tasks in batches", async () => {
    task1.mockResolvedValue("success")
    task2.mockResolvedValue("success")
    task3.mockResolvedValue("success")

    await expect(batchProcessor(tasks, 1, logger.object))
      .resolves
      .not
      .toThrow()

    expect(task1.mock.calls.length).toBe(1)
    expect(task2.mock.calls.length).toBe(1)
    expect(task3.mock.calls.length).toBe(1)
  })

  it("will throw an error if any task failed after retries", async () => {
    task1.mockResolvedValue("success")
    task2.mockResolvedValue("success")
    task3.mockRejectedValue(new Error("failure"))

    logger.setup(l => l.error("Task 3 failed: failure"))
      .verifiable(Times.once())

    await expect(batchProcessor(tasks, 1, logger.object))
      .rejects
      .toThrowError("1 queue item(s) gave an error")

    // 5 retries is default
    expect(task1.mock.calls.length).toBe(1)
    expect(task2.mock.calls.length).toBe(1)
    expect(task3.mock.calls.length).toBe(5)
  })

  it("will allow the amount of retries to be customized", async () => {
    task1.mockRejectedValue(new Error("failure"))
    task2.mockRejectedValue(new Error("failure"))
    task3.mockRejectedValue(new Error("failure"))

    logger.setup(l => l.error("Task 1 failed: failure"))
      .verifiable(Times.once())
    logger.setup(l => l.error("Task 2 failed: failure"))
      .verifiable(Times.once())
    logger.setup(l => l.error("Task 3 failed: failure"))
      .verifiable(Times.once())

    await expect(batchProcessor(tasks, 1, logger.object, { times: 3 } ))
      .rejects
      .toThrowError("3 queue item(s) gave an error")

    expect(task1.mock.calls.length).toBe(3)
    expect(task2.mock.calls.length).toBe(3)
    expect(task3.mock.calls.length).toBe(3)
  })

  it("will resolve if tasks complete within the alotted amount of retries", async () => {
    task1.mockRejectedValueOnce(new Error("failure"))
    task1.mockRejectedValueOnce(new Error("failure"))
    task1.mockResolvedValueOnce("success")

    task2.mockRejectedValueOnce(new Error("failure"))
    task2.mockResolvedValueOnce("success")

    task3.mockResolvedValueOnce("success")

    await expect(batchProcessor(tasks, 1, logger.object, { times: 3 } ))
      .resolves
      .not
      .toThrow()

    expect(task1.mock.calls.length).toBe(3)
    expect(task2.mock.calls.length).toBe(2)
    expect(task3.mock.calls.length).toBe(1)
  })
})
