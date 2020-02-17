#!/usr/bin/env node

const { Glacier } = require("aws-sdk")
const glacier = new Glacier()

let contents = Buffer.alloc(0)

process.stdin.on("data", (data) => {
  contents = Buffer.concat([contents, data])
})

process.stdin.on("end", () => {
  const { treeHash } = glacier.computeChecksums(contents)
  process.stdout.write(treeHash + "\n")
})

process.stdin.on("error", () => process.exit(1))
