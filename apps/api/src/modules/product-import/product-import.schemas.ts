import { z } from 'zod';

export const productImportInputSchema = z.object({
  url: z.string().trim().min(1, 'Informe uma URL.').max(2048, 'A URL é muito longa.'),
}).strict();

export type ProductImportInput = z.infer<typeof productImportInputSchema>;
