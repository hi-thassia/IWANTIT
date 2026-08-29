import { z } from 'zod';

export const marketplaceSearchSchema = z.object({
  query: z.string().trim().min(2, 'Informe ao menos dois caracteres.').max(240),
  marketplaces: z.array(z.enum(['mercado-livre', 'shopee', 'shein'])).min(1).max(3).transform((values) => [...new Set(values)]),
  limit: z.coerce.number().int().min(1).max(50).default(20),
}).strict();
