import type { NotificationPreferences, ProfileResponse } from '@iwantit/shared';
import { BellRing, Camera, Check, Heart, KeyRound, Laptop, LockKeyhole, Mail, Moon, ShieldCheck, Sun, Trash2, UserRound } from 'lucide-react';
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { AppHeader } from '@/components/layout/AppHeader';
import { Alert, Button, Card, Container, Input, Loading } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { api, ApiRequestError } from '@/lib/api';

export function ProfilePage() {
  const { user, refresh } = useAuth();
  const { theme, setTheme } = useTheme();
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => { api<ProfileResponse>('/api/profile').then(setProfile).catch((cause) => setError(errorMessage(cause))); }, []);
  const notify = profile?.notifications;

  async function submit(path: string, body: unknown, key: string, success: string) {
    setSaving(key); setError(''); setMessage('');
    try { await api(path, { method: path.endsWith('/email') || path.endsWith('/password') ? 'POST' : 'PATCH', body: JSON.stringify(body) }); await refresh(); setMessage(success); }
    catch (cause) { setError(errorMessage(cause)); }
    finally { setSaving(''); }
  }

  function formValue(event: FormEvent<HTMLFormElement>, name: string) { return String(new FormData(event.currentTarget).get(name) ?? ''); }
  async function updateName(event: FormEvent<HTMLFormElement>) { event.preventDefault(); await submit('/api/profile/name', { name: formValue(event, 'name') }, 'name', 'Nome atualizado.'); }
  async function updateEmail(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const data = new FormData(event.currentTarget); await submit('/api/profile/email', { email: data.get('email'), password: data.get('password') }, 'email', 'E-mail alterado e outras sessões encerradas.'); }
  async function updatePassword(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const data = new FormData(event.currentTarget); await submit('/api/profile/password', { currentPassword: data.get('currentPassword'), newPassword: data.get('newPassword') }, 'password', 'Senha alterada e outras sessões encerradas.'); event.currentTarget.reset(); }
  async function updateTheme(next: 'light' | 'dark') { setTheme(next); await submit('/api/profile/theme', { theme: next }, 'theme', 'Tema salvo.'); }
  async function updateNotifications(next: NotificationPreferences) { setProfile((current) => current ? { ...current, notifications: next } : current); await submit('/api/profile/notifications', next, 'notifications', 'Preferências de notificação salvas.'); }
  async function removeAvatar() { await submit('/api/profile/avatar', { avatarUrl: null }, 'avatar', 'Foto removida.'); setProfile((current) => current ? { ...current, user: { ...current.user, avatarUrl: null } } : current); }
  function selectAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 250_000) { setError('Escolha uma imagem JPEG, PNG ou WebP de até 250 KB.'); return; }
    const reader = new FileReader(); reader.onload = async () => { const avatarUrl = String(reader.result); await submit('/api/profile/avatar', { avatarUrl }, 'avatar', 'Foto atualizada.'); setProfile((current) => current ? { ...current, user: { ...current.user, avatarUrl } } : current); }; reader.readAsDataURL(file);
  }

  if (!profile) return <main className="dashboard-page"><AppHeader /><div className="profile-loading"><Loading label="Carregando perfil" />{error && <Alert variant="danger" title="Não foi possível carregar">{error}</Alert>}</div></main>;
  const displayed = user ?? profile.user;

  return <main className="dashboard-page"><AppHeader /><Container className="profile-content">
    <div className="profile-title"><div><span className="section-kicker">Sua conta</span><h1>Perfil e configurações</h1><p>Gerencie seus dados, privacidade e preferências.</p></div></div>
    {message && <Alert variant="success" title="Alteração concluída">{message}</Alert>}{error && <Alert variant="danger" title="Não foi possível concluir">{error}</Alert>}
    <div className="profile-grid">
      <Card className="profile-card profile-identity"><div className="profile-card__heading"><UserRound aria-hidden="true" /><div><h2>Perfil</h2><p>Foto e nome exibidos na sua conta.</p></div></div><div className="avatar-editor"><span className="profile-avatar">{profile.user.avatarUrl ? <img src={profile.user.avatarUrl} alt="Foto do perfil" /> : displayed.name.charAt(0).toUpperCase()}</span><div><input ref={fileInput} className="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp" onChange={selectAvatar} /><Button type="button" variant="secondary" size="sm" loading={saving === 'avatar'} onClick={() => fileInput.current?.click()}><Camera aria-hidden="true" /> Trocar foto</Button>{profile.user.avatarUrl && <Button type="button" variant="ghost" size="sm" onClick={removeAvatar}><Trash2 aria-hidden="true" /> Remover</Button>}<small>JPEG, PNG ou WebP, até 250 KB.</small></div></div><form className="profile-form" onSubmit={updateName}><Input label="Nome" name="name" defaultValue={displayed.name} minLength={2} maxLength={120} required /><Button loading={saving === 'name'}>Salvar nome</Button></form></Card>
      <Card className="profile-card"><div className="profile-card__heading"><Mail aria-hidden="true" /><div><h2>E-mail</h2><p>Confirme sua senha para alterar.</p></div></div>{profile.user.loginMethods.includes('password') ? <form className="profile-form" onSubmit={updateEmail}><Input label="Novo e-mail" name="email" type="email" defaultValue={displayed.email} required /><Input label="Senha atual" name="password" type="password" autoComplete="current-password" required /><Button loading={saving === 'email'}>Alterar e-mail</Button></form> : <p className="profile-note">Sua conta usa somente o Google. Crie uma senha pela recuperação de conta antes de alterar o e-mail.</p>}</Card>
      <Card className="profile-card"><div className="profile-card__heading"><LockKeyhole aria-hidden="true" /><div><h2>Senha</h2><p>Outras sessões serão encerradas após a troca.</p></div></div>{profile.user.loginMethods.includes('password') ? <form className="profile-form" onSubmit={updatePassword}><Input label="Senha atual" name="currentPassword" type="password" autoComplete="current-password" required /><Input label="Nova senha" name="newPassword" type="password" autoComplete="new-password" minLength={8} required /><Button loading={saving === 'password'}>Trocar senha</Button></form> : <p className="profile-note">Nenhuma senha cadastrada. O acesso é feito com Google.</p>}</Card>
      <Card className="profile-card"><div className="profile-card__heading"><KeyRound aria-hidden="true" /><div><h2>Métodos de login</h2><p>Formas vinculadas à sua conta.</p></div></div><div className="login-methods">{profile.user.loginMethods.map((method) => <div key={method}><span>{method === 'google' ? 'Google' : 'E-mail e senha'}</span><strong><Check aria-hidden="true" /> Ativo</strong></div>)}</div></Card>
      <Card className="profile-card"><div className="profile-card__heading"><Moon aria-hidden="true" /><div><h2>Aparência</h2><p>Escolha o tema da interface.</p></div></div><div className="theme-options"><button className={theme === 'light' ? 'is-selected' : ''} type="button" onClick={() => updateTheme('light')}><Sun aria-hidden="true" /> Claro</button><button className={theme === 'dark' ? 'is-selected' : ''} type="button" onClick={() => updateTheme('dark')}><Moon aria-hidden="true" /> Escuro</button></div></Card>
      <Card className="profile-card"><div className="profile-card__heading"><BellRing aria-hidden="true" /><div><h2>Notificações</h2><p>Escolha quais eventos deseja receber no aplicativo.</p></div></div><div className="preference-list">{([['priceTargetAlert','Preço desejado'],['priceDropAlert','Queda de preço'],['newLowAlert','Novo menor preço'],['stockAlert','Produto disponível']] as const).map(([key,label]) => <label key={key}><span>{label}</span><input type="checkbox" checked={notify?.[key] ?? false} onChange={(event) => notify && updateNotifications({ ...notify, [key]: event.target.checked })} /></label>)}</div></Card>
      <Card className="profile-card"><div className="profile-card__heading"><ShieldCheck aria-hidden="true" /><div><h2>Segurança</h2><p>Segundo fator e dispositivos conectados.</p></div></div><div className="security-links"><Link to="/seguranca"><ShieldCheck aria-hidden="true" /> Autenticação em dois fatores <strong>{profile.user.twoFactorEnabled ? 'Ativa' : 'Desativada'}</strong></Link><Link to="/seguranca"><Laptop aria-hidden="true" /> Gerenciar sessões</Link></div></Card>
      <Card className="profile-card profile-wishes"><div className="profile-card__heading"><Heart aria-hidden="true" /><div><h2>Meus desejos</h2><p>Acesse os produtos cadastrados e seus monitoramentos.</p></div></div><Button asChild><Link to="/desejos">Abrir meus desejos</Link></Button></Card>
    </div>
  </Container></main>;
}

function errorMessage(cause: unknown) { return cause instanceof ApiRequestError ? cause.message : 'Tente novamente em alguns instantes.'; }
