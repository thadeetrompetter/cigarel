import { createLogger, transports, Logger } from "winston"

export type ILogger = Logger
export type LogLevel = "error"
  | "warn"
  | "info"
  | "verbose"
  | "debug"
  | "silly"

export const getLogger = (level: LogLevel): ILogger => createLogger({
  transports: [
    new transports.Console({ level })
  ]
})
