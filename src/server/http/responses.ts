import { NextResponse } from "next/server";

export function ok<T extends Record<string, unknown>>(
  body: T,
  status = 200,
): NextResponse {
  return NextResponse.json(body, { status });
}

export function created<T extends Record<string, unknown>>(
  body: T,
): NextResponse {
  return NextResponse.json(body, { status: 201 });
}

export function binary(
  data: BodyInit,
  init: {
    contentType: string;
    filename?: string;
    status?: number;
  },
): NextResponse {
  const headers: Record<string, string> = {
    "Content-Type": init.contentType,
  };
  if (init.filename) {
    headers["Content-Disposition"] = `attachment; filename="${init.filename}"`;
  }
  return new NextResponse(data, {
    status: init.status ?? 200,
    headers,
  });
}

export function errorJson(
  message: string,
  status: number,
  extra?: Record<string, unknown>,
): NextResponse {
  return NextResponse.json({ error: message, ...extra }, { status });
}
