import yargs from "yargs"
import { App } from "../src/app/App"
import { green, red } from "chalk"

yargs
  .scriptName("cigarel")
  .usage("Usage: $0 <cmd> [options]")
  .command("upload <path>", "Upload a file to Glacier", yargs => {
    return yargs.option("description", {
      alias: "d",
      describe: "optional archive description",
      type: "string"
    })
  }, async config => {
    try {
      const app = new App(config)
      const result = await app.upload(String(config.path))
      console.info(green(JSON.stringify(result, null, 2)))
    } catch (err) {
      console.error(red(err.message))
      process.exit(1)
    }
  })
  .option("access-key-id", {
    alias: "a",
    describe: "AWS access key ID",
    type: "string"
  })
  .option("secret-access-key", {
    alias: "k",
    describe: "AWS secret access key",
    type: "string"
  })
  .option("session-token", {
    alias: "t",
    describe: "AWS session token",
    type: "string"
  })
  .option("size", {
    alias: "s",
    describe: "Size of upload parts in MB",
    type: "number"
  })
  .option("concurrency", {
    alias: "c",
    describe: "Number of parts to upload simultaneously",
    type: "number"
  })
  .option("vault-name", {
    alias: "n",
    describe: "AWS Glacier vault name to upload archive to",
    type: "string"
  })
  .option("log-level", {
    alias: "l",
    describe: "Application log level",
    choices: ["error", "warn", "info", "verbose", "debug", "silly"],
    type: "string"
  })
  .option("region", {
    alias: "r",
    describe: "AWS region to interact with, default: eu-central-1",
    type: "string"
  })
  .option("dry-run", {
    describe: "Skip the actual file upload.",
    type: "boolean"
  })
  .help("help")
  .showHelpOnFail(true)
  .demandCommand(1, "Please specify a command.")
  .argv
