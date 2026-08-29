import { z } from 'zod';

const email = z.email('Informe um e-mail válido.').max(320).transform((value) => value.trim().toLowerCase());
const password = z.string().min(8, 'A senha deve ter pelo menos 8 caracteres.').max(128, 'A senha deve ter no máximo 128 caracteres.')
  .refine((value) => /[a-zA-Z]/.test(value) && /\d/.test(value), 'Use pelo menos uma letra e um número.');

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Informe seu nome.').max(120, 'O nome deve ter no máximo 120 caracteres.').refine((value) => !/[\u0000-\u001F\u007F]/.test(value), 'O nome contém caracteres inválidos.'),
  email,
  password,
}).strict();

export const loginSchema = z.object({ email, password: z.string().min(1, 'Informe sua senha.').max(128) }).strict();
export const forgotPasswordSchema = z.object({ email }).strict();
export const resetPasswordSchema = z.object({ token: z.string().min(32, 'Link de recuperação inválido.').max(128), password }).strict();
export const twoFactorLoginSchema = z.object({ challengeToken: z.string().min(32).max(128), code: z.string().regex(/^\d{6}$/, 'Informe o código de seis dígitos.') }).strict();
export const twoFactorSetupSchema = z.object({ password: z.string().min(1).max(128) }).strict();
export const twoFactorCodeSchema = z.object({ code: z.string().regex(/^\d{6}$/, 'Informe o código de seis dígitos.') }).strict();
export const twoFactorDisableSchema = z.object({ password: z.string().min(1).max(128), code: z.string().regex(/^\d{6}$/) }).strict();
export const sessionIdSchema = z.object({ id: z.uuid() });
export const profileNameSchema = z.object({ name: registerSchema.shape.name }).strict();
export const profileAvatarSchema = z.object({ avatarUrl: z.union([
  z.null(),
  z.string().max(360_000).refine((value) => /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value), 'Envie uma imagem JPEG, PNG ou WebP válida.'),
]) }).strict();
export const profileEmailSchema = z.object({ email, password: z.string().min(1).max(128) }).strict();
export const profilePasswordSchema = z.object({ currentPassword: z.string().min(1).max(128), newPassword: password }).strict();
export const profileThemeSchema = z.object({ theme: z.enum(['light', 'dark', 'system']) }).strict();
export const notificationPreferencesSchema = z.object({ priceTargetAlert: z.boolean(), priceDropAlert: z.boolean(), newLowAlert: z.boolean(), stockAlert: z.boolean() }).strict();

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
