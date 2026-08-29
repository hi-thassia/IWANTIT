import { LoaderCircle } from 'lucide-react';
export function Loading({ label = 'Carregando' }: { label?: string }) { return <div className="loading" role="status"><LoaderCircle className="spinner" aria-hidden="true" /><span>{label}</span></div>; }
