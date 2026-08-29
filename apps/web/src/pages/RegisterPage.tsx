import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Alert, Button, Input } from '@/components/ui';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { useAuth } from '@/contexts/AuthContext';
import { ApiRequestError } from '@/lib/api';
import { GoogleButton } from '@/components/auth/GoogleButton';

export function RegisterPage() {
  const { register } = useAuth(); const navigate = useNavigate(); const [error, setError] = useState(''); const [loading, setLoading] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setError(''); const data = new FormData(event.currentTarget); const password = String(data.get('password')); if (password !== data.get('confirmPassword')) { setError('As senhas não coincidem.'); return; } setLoading(true); try { await register({ name: String(data.get('name')), email: String(data.get('email')), password }); navigate('/app', { replace: true }); } catch (reason) { setError(reason instanceof ApiRequestError ? reason.message : 'Não foi possível criar sua conta.'); } finally { setLoading(false); } }
  return <AuthLayout title="Comece a desejar melhor." subtitle="Crie sua conta e deixe a pesquisa de preços com a gente." footer={<p>Já possui uma conta? <Link to="/entrar">Entrar</Link></p>}><div className="auth-methods"><GoogleButton /><div className="auth-divider"><span>ou cadastre-se com e-mail</span></div><form className="auth-form" onSubmit={submit}>{error && <Alert variant="danger" title="Revise seus dados">{error}</Alert>}<Input label="Nome" name="name" autoComplete="name" required minLength={2} placeholder="Como podemos chamar você?" /><Input label="E-mail" name="email" type="email" autoComplete="email" required placeholder="voce@exemplo.com" /><Input label="Senha" name="password" type="password" autoComplete="new-password" required minLength={8} hint="Use pelo menos 8 caracteres, uma letra e um número." /><Input label="Confirmar senha" name="confirmPassword" type="password" autoComplete="new-password" required /><Button type="submit" size="lg" loading={loading}>Criar minha conta</Button></form></div></AuthLayout>;
}
