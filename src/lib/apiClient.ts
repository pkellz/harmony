export type ApiFetchOptions = {
  method?: string;
  token?: string | null;
  body?: unknown;
  headers?: HeadersInit;
  credentials?: RequestCredentials;
  signal?: AbortSignal;
  rawBody?: BodyInit | null;
  parseAs?: "json" | "text" | "arrayBuffer" | "none";
};

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly details?: unknown;
  readonly data: Record<string, unknown>;

  constructor(
    status: number,
    message: string,
    extras: {
      code?: string;
      details?: unknown;
      data?: Record<string, unknown>;
    } = {},
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = extras.code;
    this.details = extras.details;
    this.data = extras.data ?? {};
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function parseJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

export async function apiFetch<T = unknown>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const {
    method = "GET",
    token,
    body,
    rawBody,
    headers: extraHeaders,
    credentials = "include",
    signal,
    parseAs = "json",
  } = options;

  const headers = new Headers(extraHeaders);
  const hasRaw = rawBody !== undefined;
  if (!hasRaw && body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(path, {
    method,
    headers,
    credentials,
    signal,
    body: hasRaw
      ? rawBody
      : body === undefined
        ? undefined
        : JSON.stringify(body),
  });

  if (parseAs === "none") {
    if (!response.ok) {
      throw new ApiError(response.status, `Request failed (${response.status})`);
    }
    return undefined as T;
  }

  if (parseAs === "arrayBuffer") {
    if (!response.ok) {
      throw new ApiError(response.status, `Request failed (${response.status})`);
    }
    return (await response.arrayBuffer()) as T;
  }

  if (parseAs === "text") {
    if (!response.ok) {
      throw new ApiError(response.status, `Request failed (${response.status})`);
    }
    return (await response.text()) as T;
  }

  const data = await parseJson(response);
  if (!response.ok) {
    const record = isRecord(data) ? data : {};
    const message =
      typeof record.error === "string"
        ? record.error
        : `Request failed (${response.status})`;
    throw new ApiError(response.status, message, {
      code: typeof record.code === "string" ? record.code : undefined,
      details: record.details,
      data: record,
    });
  }

  return data as T;
}
