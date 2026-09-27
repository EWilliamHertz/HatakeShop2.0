import React, { useState, useRef, useEffect } from 'react';
import { useWorkspace } from './WorkspaceContext';
import { ChevronDown, Building2, Plus, LogOut, Check } from 'lucide-react';

export const WorkspaceSwitcher = () => {
  const { activeCompanyId, companies, setActiveCompanyId } = useWorkspace();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeCompany = companies.find(c => c.id === activeCompanyId);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (companies.length === 0) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-slate-900 border border-slate-700 hover:border-slate-500 rounded-xl transition-all shadow-sm group"
      >
        <div className="w-6 h-6 rounded bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-white font-bold text-xs shadow-inner">
          {activeCompany?.logoUrl ? (
            <img src={activeCompany.logoUrl} alt={activeCompany.name} className="w-full h-full object-cover rounded" />
          ) : (
            activeCompany?.name?.charAt(0) || <Building2 size={14} />
          )}
        </div>
        <span className="text-sm font-semibold text-slate-200 group-hover:text-white transition-colors max-w-[120px] truncate">
          {activeCompany?.name || 'Select Workspace'}
        </span>
        <ChevronDown size={14} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="px-3 py-2 border-b border-slate-800 bg-slate-900/50">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Your Workspaces</p>
          </div>
          
          <div className="max-h-[300px] overflow-y-auto py-1">
            {companies.map(company => (
              <button
                key={company.id}
                onClick={() => {
                  setActiveCompanyId(company.id);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-800 transition-colors ${
                  activeCompanyId === company.id ? 'bg-indigo-500/10' : ''
                }`}
              >
                <div className="w-8 h-8 rounded bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden shrink-0">
                  {company.logoUrl ? (
                     <img src={company.logoUrl} alt={company.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-slate-400 text-xs font-bold">{company.name.charAt(0)}</span>
                  )}
                </div>
                <div className="flex flex-col items-start truncate flex-1">
                  <span className={`text-sm font-medium ${activeCompanyId === company.id ? 'text-indigo-400' : 'text-slate-200'}`}>
                    {company.name}
                  </span>
                  {company.role && (
                    <span className="text-xs text-slate-500 capitalize">{company.role}</span>
                  )}
                </div>
                {activeCompanyId === company.id && (
                  <Check size={16} className="text-indigo-500 shrink-0" />
                )}
              </button>
            ))}
          </div>

          <div className="p-2 border-t border-slate-800 bg-slate-900">
            <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
              <Plus size={16} />
              <span>Create New Workspace</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
