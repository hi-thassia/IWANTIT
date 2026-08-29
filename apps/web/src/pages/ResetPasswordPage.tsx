import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Alert, Button, Input } from '@/components/ui';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { api, ApiRequestError } from '@/lib/api';

export function ResetPasswordPage() {
  const [params] = useSearchParams(); const token = params.get('token') ?? ''; const [done, setDone] = useState(false); const [error, setError] = useState(''); const [loading, setLoading] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setError(''); const data = new FormData(event.currentTarget); const password = String(data.get('password')); if (password !== data.get('confirmPassword')) { setError('As senhas não coincidem.'); return; } setLoading(true); try { await api('/api/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, password }) }); setDone(true); } catch (reason) { setError(reason instanceof ApiRequestError ? reason.message : 'Não foi possível redefinir sua senha.'); } finally { setLoading(false); } }
  return <AuthLayout title="Crie uma nova senha." subtitle="Ao concluir, suas sessões anteriores serão encerradas por segurança." footer={<p><Link to="/entrar">Voltar para o login</Link></p>}>{done ? <Alert variant="success" title="Senha redefinida">Agora você já pode entrar com a nova senha.</Alert> : !token ? <Alert variant="danger" title="Link inválido">Solicite um novo link de recuperação.</Alert> : <form className="auth-form" onSubmit={submit}>{error && <Alert variant="danger" title="Não foi possível redefinir">{error}</Alert>}<Input label="Nova senha" name="password" type="password" autoComplete="new-password" required minLength={8} hint="Use pelo menos 8 caracteres, uma letra e um número." /><Input label="Confirmar nova senha" name="confirmPassword" type="password" autoComplete="new-password" required /><Button type="submit" size="lg" loading={loading}>Redefinir senha</Button></form>}</AuthLayout>;
}
