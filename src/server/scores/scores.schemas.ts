import { z } from "zod";

export const listScoresQuerySchema = z.object({}).optional();

export const scoreIdParamsSchema = z.object({
  id: z.string().min(1),
});
