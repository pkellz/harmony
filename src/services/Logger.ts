import * as winston from "winston";

const MESSAGE = Symbol.for("message");

export const logger = winston.createLogger({
  transports: [new winston.transports.Console()],
  format: winston.format.combine(
    winston.format((info) => (info.ignoreLogs ? false : info))(),
    winston.format((info) => {
      const record = info as unknown as Record<string | symbol, unknown>;
      record[MESSAGE] = JSON.stringify({ timestamp: new Date(), ...info });
      return info;
    })(),
    winston.format.prettyPrint(),
  ),
});
