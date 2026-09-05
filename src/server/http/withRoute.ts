import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { logger } from "@/services/Logger";
import { AppError, isAppError } from "./appError";
import { getRequestContext, runWithRequestLog } from "./requestLog";
import { errorJson } from "./responses";

type RouteContext = { params: Promise<Record<string, string | string[]>> };
type HandlerNoContext = (req: NextRequest) => Promise<NextResponse>;
type HandlerWithContext = (
  req: NextRequest,
  context: RouteContext,
) => Promise<NextResponse>;

export function withRoute(fn: HandlerNoContext): HandlerNoContext;
export function withRoute(fn: HandlerWithContext): HandlerWithContext;
export function withRoute(
  fn: HandlerNoContext | HandlerWithContext,
): HandlerNoContext | HandlerWithContext {
  return async (req: NextRequest, context?: RouteContext) =>
    runWithRequestLog(req, context?.params, async (log) => {
      log.triggered();
      try {
        if (context) {
          return await (fn as HandlerWithContext)(req, context);
        }
        return await (fn as HandlerNoContext)(req);
      } catch (err) {
        return mapErrorToResponse(err, req);
      }
    });
}

export function mapErrorToResponse(
  err: unknown,
  req?: NextRequest,
): NextResponse {
  const requestId = getRequestContext()?.requestId;

  if (isAppError(err)) {
    if (!err.isOperational || err.statusCode >= 500) {
      logger.error("Operational AppError", {
        requestId,
        path: req?.nextUrl?.pathname,
        statusCode: err.statusCode,
        message: err.message,
        code: err.code,
        err,
      });
    }
    const extra: Record<string, unknown> = {};
    if (err.code) extra.code = err.code;
    if (err.details !== undefined) extra.details = err.details;
    if (err.metadata) Object.assign(extra, err.metadata);
    return errorJson(err.message, err.statusCode, extra);
  }

  if (err instanceof ZodError) {
    return errorJson("Invalid body", 400, {
      code: "VALIDATION_ERROR",
      details: err.errors,
    });
  }

  logger.error("Unhandled route error", {
    requestId,
    path: req?.nextUrl?.pathname,
    err,
  });
  return errorJson("Internal error", 500);
}

export { AppError };
