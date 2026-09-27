import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Settings, Package, Inbox, LogOut, FileText } from 'lucide-react';
import { useAuth } from './AuthContext.tsx';

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!isOpen) return null;

  const commands = [
    { name: 'Marketplace (Browse Products)', icon: <Search className="w-4 h-4" />, action: () => navigate('/marketplace') },
    { name: 'My RFQs / Messages', icon: <Inbox className="w-4 h-4" />, action: () => navigate('/rfq') },
    { name: 'My Orders', icon: <Package className="w-4 h-4" />, action: () => navigate('/orders') },
    { name: 'Account Settings', icon: <Settings className="w-4 h-4" />, action: () => navigate('/settings') },
    { name: 'Seller Dashboard', icon: <FileText className="w-4 h-4" />, action: () => navigate('/seller') },
    { name: 'Log Out', icon: <LogOut className="w-4 h-4" />, action: () => { logout(); navigate('/'); } },
  ];

  const filteredCommands = commands.filter(cmd => cmd.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden shadow-cyan-900/20">
        <div className="flex items-center px-4 py-3 border-b border-slate-700">
          <Search className="w-5 h-5 text-slate-400 mr-3 shrink-0" />
          <input
            autoFocus
            className="w-full bg-transparent text-white outline-none placeholder:text-slate-500 text-lg"
            placeholder="Type a command or search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="text-[10px] text-slate-500 bg-slate-800 px-2 py-1 rounded ml-3">ESC</div>
        </div>
        <div className="max-h-80 overflow-y-auto custom-scrollbar p-2">
          {filteredCommands.length === 0 ? (
            <div className="p-4 text-center text-slate-500 text-sm">No commands found.</div>
          ) : (
            filteredCommands.map((cmd, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setIsOpen(false);
                  cmd.action();
                }}
                className="w-full flex items-center px-4 py-3 text-sm text-slate-300 hover:bg-slate-800 hover:text-cyan-400 rounded-lg transition-colors text-left"
              >
                <div className="mr-3 text-slate-400">{cmd.icon}</div>
                {cmd.name}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
