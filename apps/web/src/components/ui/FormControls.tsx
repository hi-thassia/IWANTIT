import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
export function Select({ label, children, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { label: string }) { return <label className="field">{label}<select className="input" {...props}>{children}</select></label>; }
export function Textarea({ label, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) { return <label className="field">{label}<textarea className="input textarea" {...props} /></label>; }
export function Checkbox({ label, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string }) { return <label className="checkbox"><input type="checkbox" {...props} /><span>{label}</span></label>; }
