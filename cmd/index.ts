import yargs from "yargs"
import { App } from "../src/app/App"
import { red } from "chalk"

yargs
  .scriptName("cigarel")
  .usage("Usage: $0 <cmd> [options]")
  .command("upload <path>", "Upload a file to Glacier", yargs => {
    return yargs.option("description", {
      alias: "d",
      describe: "optional archive description",
      type: "string"
    })
  }, config => {
    try {
      new App(config).upload(String(config.path))
    } catch (err) {
      console.error(red(err.message))
      process.exit(1)
    }
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
  .option("dry-run", {
    describe: "Skip the actual file upload.",
    type: "boolean"
  })
  .help()
  .demandCommand(1, "Please specify a command.")
  .argv
