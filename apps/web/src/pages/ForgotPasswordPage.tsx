import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Button, Input } from '@/components/ui';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { api } from '@/lib/api';
import type { ApiMessage } from '@iwantit/shared';

export function ForgotPasswordPage() {
  const [message, setMessage] = useState(''); const [error, setError] = useState(''); const [loading, setLoading] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setError(''); setLoading(true); try { const data = new FormData(event.currentTarget); const result = await api<ApiMessage>('/api/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email: data.get('email') }) }); setMessage(result.message); } catch { setError('Não foi possível enviar as instruções agora. Tente novamente.'); } finally { setLoading(false); } }
  return <AuthLayout title="Vamos recuperar seu acesso." subtitle="Informe seu e-mail para receber um link seguro e temporário." footer={<p><Link to="/entrar">Voltar para o login</Link></p>}>{message ? <Alert variant="success" title="Confira seu e-mail">{message}</Alert> : <form className="auth-form" onSubmit={submit}>{error && <Alert variant="danger" title="Algo deu errado">{error}</Alert>}<Input label="E-mail" name="email" type="email" autoComplete="email" required placeholder="voce@exemplo.com" /><Button type="submit" size="lg" loading={loading}>Enviar instruções</Button></form>}</AuthLayout>;
}
