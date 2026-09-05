import { z } from "zod";
import { AppError } from "./appError";

export async function parseBody<T extends z.ZodType>(
  request: Request,
  schema: T,
): Promise<z.infer<T>> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw new AppError(400, "Invalid JSON body");
  }
  return parseValue(raw, schema);
}

export function parseQuery<T extends z.ZodType>(
  request: Request,
  schema: T,
): z.infer<T> {
  const url = new URL(request.url);
  const obj: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    obj[key] = value;
  });
  return parseValue(obj, schema);
}

export function parseParams<T extends z.ZodType>(
  params: Record<string, string | string[] | undefined>,
  schema: T,
): z.infer<T> {
  return parseValue(params, schema);
}

export function parseValue<T extends z.ZodType>(
  value: unknown,
  schema: T,
): z.infer<T> {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new AppError(400, "Invalid body", {
      code: "VALIDATION_ERROR",
      details: result.error.errors,
    });
  }
  return result.data;
}
