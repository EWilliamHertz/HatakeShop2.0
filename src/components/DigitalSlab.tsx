import React from 'react';
import { cn } from './Layout.tsx';

interface DigitalSlabProps {
  image?: string;
  company: string;
  grade: string;
  certNumber: string;
  cardName: string;
  cardSet: string;
  cardNumber: string;
  year: string;
  variant: string;
  className?: string;
}

export function DigitalSlab({ company, grade, certNumber, cardName, cardSet, cardNumber, year, variant, className, image }: DigitalSlabProps) {
  // Determine border/theme based on company
  let theme = {
    border: 'border-slate-700',
    headerBg: 'bg-slate-700',
    text: 'text-slate-100',
    gradeBg: 'bg-slate-800',
    gradeText: 'text-slate-100',
    accent: 'bg-slate-200'
  };

  const comp = company?.toUpperCase();
  if (comp === 'PSA') {
    theme = { border: 'border-red-600 border-4 rounded-xl', headerBg: 'bg-red-600', text: 'text-white', gradeBg: 'bg-slate-800', gradeText: 'text-red-700 font-serif', accent: 'bg-slate-800/20' };
  } else if (comp === 'CGC') {
    theme = { border: 'border-sky-500 border-4 rounded-xl', headerBg: 'bg-sky-500', text: 'text-white', gradeBg: 'bg-slate-800', gradeText: 'text-sky-700', accent: 'bg-slate-800/20' };
  } else if (comp === 'BGS') {
    const numGrade = parseFloat(grade);
    let metal = 'bg-slate-300'; // silver by default
    if (numGrade === 10) metal = 'bg-yellow-500'; // gold
    if (grade === '10 Black Label') metal = 'bg-slate-900 text-white'; // black
    theme = { border: 'border-slate-800 border-4 rounded-xl', headerBg: metal, text: (numGrade === 10 && grade !== '10 Black Label') ? 'text-slate-100' : (grade === '10 Black Label' ? 'text-yellow-500' : 'text-slate-100'), gradeBg: 'bg-slate-800', gradeText: 'text-slate-100', accent: 'bg-black/10' };
  } else {
    theme = { border: 'border-slate-800 border-4 rounded-xl', headerBg: 'bg-slate-800', text: 'text-white', gradeBg: 'bg-slate-800', gradeText: 'text-slate-100', accent: 'bg-slate-800/20' };
  }

  return (
    <div className={cn("w-full h-full flex flex-col bg-slate-700 relative shadow-inner overflow-hidden", theme.border, className)}>
      {/* Slab Header (Label) */}
      <div className={cn("p-2 sm:p-3 flex justify-between items-start border-b-2 border-white", theme.headerBg)}>
        <div className="flex flex-col gap-0.5 flex-1 pr-2">
          <div className={cn("text-[10px] sm:text-xs font-semibold tracking-tight uppercase tracking-wider line-clamp-1", theme.text)}>
            {year} {cardSet}
          </div>
          <div className={cn("text-xs sm:text-sm font-semibold tracking-tight font-display line-clamp-1 leading-tight", theme.text)}>
            {cardName} {variant ? `- ${variant}` : ''}
          </div>
          <div className={cn("text-[9px] sm:text-[10px] font-mono mt-1 opacity-90", theme.text)}>
            #{cardNumber} • Cert: {certNumber || 'N/A'}
          </div>
        </div>
        <div className={cn("shrink-0 flex flex-col items-center justify-center p-1 sm:p-2 rounded shadow-none min-w-[36px] sm:min-w-[48px]", theme.gradeBg)}>
          <span className={cn("text-xs font-semibold tracking-tight uppercase text-slate-400 mb-0.5")}>{comp}</span>
          <span className={cn("text-sm sm:text-xl font-black", theme.gradeText)}>{grade}</span>
        </div>
      </div>
      
      {/* The "Card" inside the slab */}
      <div className="flex-1 p-2 sm:p-4 flex items-center justify-center">
        <div className="w-full h-full max-h-[85%] max-w-[85%] bg-slate-300 rounded-lg border-2 border-slate-400/50 shadow-none flex items-center justify-center relative overflow-hidden">
            {image ? (
              <img src={image} alt={cardName} className="w-full h-full object-cover" />
            ) : (
              <>
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent"></div>
                <div className="flex flex-col items-center opacity-40">
                  <span className="text-[10px] font-semibold tracking-tight uppercase tracking-widest text-slate-400 mb-1">Authentic</span>
                  <span className="text-xl font-serif text-slate-400">{comp}</span>
                </div>
              </>
            )}
        </div>
      </div>
    </div>
  );
}
