import { createLogger, transports, format, Logger } from "winston"

export type ILogger = Logger
export type LogLevel = "error"
  | "warn"
  | "info"
  | "verbose"
  | "debug"
  | "silly"

const { combine, timestamp, printf } = format

export const getLogger = (level: LogLevel): ILogger => createLogger({
  format: combine(
    timestamp({
      format: "YYYY-MM-DD HH:mm:ss"
    }),
    printf(({ timestamp, message, level }) => `${timestamp} | ${level}: ${message}`)
  ),
  transports: [
    new transports.Console({ level })
  ]
})
