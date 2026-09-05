import { NextRequest } from "next/server";
import { withRoute } from "@/server/http/withRoute";
import { parseParams } from "@/server/http/validate";
import { ok } from "@/server/http/responses";
import { scoreIdParamsSchema } from "@/server/scores/scores.schemas";
import * as scoresService from "@/server/scores/scores.service";

export const GET = withRoute(async (
  _req: NextRequest,
  context: { params: Promise<Record<string, string | string[]>> },
) => {
  const { id } = parseParams(await context.params, scoreIdParamsSchema);
  const score = await scoresService.getById(id);
  return ok({ score });
});
