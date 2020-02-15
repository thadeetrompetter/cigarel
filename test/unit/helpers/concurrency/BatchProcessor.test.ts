import batchProcess from "../../../../src/helpers/concurrency/BatchProcessor"

interface ItemInput {
  foo: number
}

interface ItemOutput {
  bar: number
}

describe("BatchProcessor", () => {
  const items: ItemInput[] = [
    { foo: 1 },
    { foo: 2 },
    { foo: 3 }
  ]

  it("will process a list of tasks in batches", async () => {
    const mockFunc = jest.fn()
      .mockResolvedValueOnce({ bar: 1 })
      .mockResolvedValueOnce({ bar: 2 })
      .mockResolvedValueOnce({ bar: 3 })

    const processFn = async (item: ItemInput): Promise<ItemOutput> => mockFunc(item)

    await expect(batchProcess<ItemInput, ItemOutput>(items, 1, processFn))
      .resolves
      .not
      .toThrow()

    expect(mockFunc.mock.calls.length).toBe(3)
  })

  it("will throw an error if any task did not complete within n retries", async () => {
    const mockFunc = jest.fn()
      .mockRejectedValue(new Error("no success"))

    const processFn = async (item: ItemInput): Promise<ItemOutput> => mockFunc(item)

    await expect(batchProcess<ItemInput, ItemOutput>(items, 1, processFn))
      .rejects
      .toThrow()

    expect(mockFunc.mock.calls.length).toBe(15)
  })
})
