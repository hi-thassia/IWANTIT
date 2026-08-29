export class AuthError extends Error {
  constructor(public readonly statusCode: number, message: string, public readonly retryAfter?: number) { super(message); }
}
