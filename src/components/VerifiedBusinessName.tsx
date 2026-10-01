import { BadgeCheck } from 'lucide-react';

export function VerifiedBusinessName({ name, className = '' }: { name: string; className?: string }) {
  return <span className={`inline-flex min-w-0 items-center gap-1.5 ${className}`}>
    <span className="min-w-0 truncate">{name}</span>
    <BadgeCheck aria-label="Negocio verificado" role="img" className="h-[1em] w-[1em] shrink-0 fill-[#1877f2] text-white" strokeWidth={2.5}/>
  </span>;
}
