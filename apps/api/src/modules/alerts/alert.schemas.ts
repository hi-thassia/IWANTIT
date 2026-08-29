import { z } from 'zod';
export const alertIdSchema = z.object({ id: z.uuid() });
