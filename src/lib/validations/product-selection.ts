import { z } from "zod";

export const updateProductExclusionsSchema = z.object({
  excludedProductNames: z
    .array(z.string().min(1).max(100))
    .max(200, "Demasiados productos excluidos"),
});

export type UpdateProductExclusionsInput = z.infer<typeof updateProductExclusionsSchema>;
