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

    const result = batchProcess<ItemInput, ItemOutput>(items, 1, processFn)

    await expect(result)
      .resolves
      .toEqual([
        { bar: 1 },
        { bar: 2 },
        { bar: 3 }
      ])
  })
})
