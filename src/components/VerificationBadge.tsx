import React from 'react';
import { ShieldCheck, Shield, Award, Gem, CheckCircle2 } from 'lucide-react';

interface VerificationBadgeProps {
  status?: string;
  className?: string;
  showText?: boolean;
}

export function VerificationBadge({ status, className = '', showText = true }: VerificationBadgeProps) {
  if (!status || status === 'pending' || status === 'rejected') return null;

  switch (status.toLowerCase()) {
    case 'listed':
      return (
        <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-400 ${className}`}>
          <CheckCircle2 className="w-3.5 h-3.5" />
          {showText && <span className="text-[10px] font-bold uppercase tracking-wider">Listed</span>}
        </div>
      );
    case 'verified':
      return (
        <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 ${className}`}>
          <ShieldCheck className="w-3.5 h-3.5" />
          {showText && <span className="text-[10px] font-bold uppercase tracking-wider">Verified</span>}
        </div>
      );
    case 'certified':
      return (
        <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 ${className}`}>
          <Award className="w-3.5 h-3.5" />
          {showText && <span className="text-[10px] font-bold uppercase tracking-wider">Certified</span>}
        </div>
      );
    case 'elite':
      return (
        <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.2)] ${className}`}>
          <Gem className="w-3.5 h-3.5" />
          {showText && <span className="text-[10px] font-bold uppercase tracking-wider">Elite</span>}
        </div>
      );
    default:
      return null;
  }
}
