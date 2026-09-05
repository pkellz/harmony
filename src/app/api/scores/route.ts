import { NextRequest } from "next/server";
import { withRoute } from "@/server/http/withRoute";
import { created, ok } from "@/server/http/responses";
import { AppError } from "@/server/http/appError";
import * as scoresService from "@/server/scores/scores.service";

export const GET = withRoute(async () => {
  const result = await scoresService.list();
  return ok(result);
});

export const POST = withRoute(async (request: NextRequest) => {
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    throw new AppError(400, "Missing file field");
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  const score = await scoresService.createFromUpload({
    filename: file.name,
    buffer,
  });
  return created({ score });
});
