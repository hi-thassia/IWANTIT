import { z } from 'zod';

const optionalText = (max: number) => z.string().trim().max(max).transform((value) => value || null).nullable().optional();
const money = z.union([z.string(), z.number()]).transform(String).refine((value) => /^\d{1,12}(\.\d{1,2})?$/.test(value) && Number(value) > 0, 'Informe um valor válido.');
const image = z.string().max(700_000).refine(validImage, 'Use uma imagem importada válida ou envie JPEG, PNG ou WebP de até 500 KB.').nullable().optional();

export const wishInputSchema = z.object({
  name: z.string().trim().min(2).max(240), referenceUrl: z.url().refine((value) => ['http:', 'https:'].includes(new URL(value).protocol)).nullable().optional(), referenceImage: image,
  targetPrice: money, initialPrice: money.nullable().optional(), category: z.string().trim().min(2).max(120), brand: optionalText(120), color: optionalText(80), size: optionalText(80), notes: optionalText(2000),
  marketplaceIds: z.array(z.uuid()).min(1, 'Selecione pelo menos um marketplace.').max(10), alertType: z.enum(['price_target', 'price_drop', 'new_low', 'back_in_stock']), exactMatchOnly: z.boolean(),
}).strict();
export const wishIdSchema = z.object({ id: z.uuid() });
export const wishStatusSchema = z.object({ status: z.enum(['active', 'paused']) }).strict();
export type WishInput = z.infer<typeof wishInputSchema>;

function validImage(value: string) {
  try { const url = new URL(value); if (url.protocol === 'https:' && (url.hostname === 'mlstatic.com' || url.hostname.endsWith('.mlstatic.com'))) return true; } catch { /* data URL checked below */ }
  const match = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value); if (!match) return false;
  const bytes = Buffer.from(match[2]!, 'base64'); if (bytes.length > 500_000) return false;
  const type = match[1]; return type === 'png' ? bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) : type === 'jpeg' ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 : bytes.subarray(0,4).toString() === 'RIFF' && bytes.subarray(8,12).toString() === 'WEBP';
}
