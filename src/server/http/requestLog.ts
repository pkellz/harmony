import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";
import { logger } from "@/services/Logger";

export type RequestContext = {
  requestId: string;
  method: string;
  path: string;
};

export type RequestLog = {
  requestId: string;
  triggered(): void;
  rejected(reason: string, status: number): void;
};

const requestStore = new AsyncLocalStorage<RequestContext>();

export function getRequestContext(): RequestContext | undefined {
  return requestStore.getStore();
}

function levelForStatus(status: number): "error" | "warn" | "info" {
  if (status >= 500) return "error";
  if (status >= 400) return "warn";
  return "info";
}

export async function runWithRequestLog(
  req: NextRequest,
  params: Promise<Record<string, string | string[]>> | undefined,
  run: (log: RequestLog) => Promise<NextResponse>,
): Promise<NextResponse> {
  const requestId = req.headers.get("x-request-id") ?? randomUUID();
  const startedAt = Date.now();
  const url = new URL(req.url);
  const context: RequestContext = {
    requestId,
    method: req.method,
    path: url.pathname,
  };

  const log: RequestLog = {
    requestId,
    triggered() {
      logger.info("api.request", { ...context });
    },
    rejected(reason, status) {
      logger.warn("api.rejected", {
        ...context,
        status,
        reason,
        durationMs: Date.now() - startedAt,
      });
    },
  };

  return requestStore.run(context, async () => {
    let response: NextResponse;
    try {
      response = await run(log);
    } catch (err) {
      logger.error("api.failed", {
        ...context,
        err,
        durationMs: Date.now() - startedAt,
      });
      throw err;
    }

    try {
      response.headers.set("x-request-id", requestId);
    } catch {
      // immutable headers
    }

    logger[levelForStatus(response.status)]("api.response", {
      ...context,
      status: response.status,
      durationMs: Date.now() - startedAt,
    });
    return response;
  });
}
