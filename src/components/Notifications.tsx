import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './AuthContext.tsx';
import { Bell, Check, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export function Notifications() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await fetch('/api-v2/notifications', {
        headers: { 'Authorization': `Bearer ${await user?.getIdToken()}` }
      });
      if (!res.ok) throw new Error(`Failed to load notifications (${res.status})`);
      const body = await res.json();
      return Array.isArray(body) ? body : [];
    },
    enabled: !!user,
    refetchInterval: 30000 // poll every 30s as fallback to sockets
  });

  const markRead = useMutation({
    mutationFn: async (id: number) => {
      await fetch(`/api-v2/notifications/${id}/read`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${await user?.getIdToken()}` }
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] })
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      await fetch('/api-v2/notifications/read-all', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${await user?.getIdToken()}` }
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] })
  });

  const unreadCount = Array.isArray(notifications) ? notifications.filter((n: any) => !n.read).length : 0;

  if (!user) return null;

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="relative p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full animate-pulse"></span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>
          <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-700 shadow-2xl shadow-black/50 rounded-xl overflow-hidden z-50">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900">
              <h3 className="font-semibold text-white">{t('Notifications')}</h3>
              {unreadCount > 0 && (
                <button onClick={() => markAllRead.mutate()} className="text-xs text-cyan-400 hover:text-cyan-300 font-medium">
                  {t('Mark all as read')}
                </button>
              )}
            </div>
            <div className="max-h-[400px] overflow-y-auto custom-scrollbar divide-y divide-slate-800/50">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-sm">
                  {t("You don't have any notifications yet.")}
                </div>
              ) : (
                notifications.map((n: any) => (
                  <div key={n.id} className={`p-4 hover:bg-slate-800/50 transition-colors ${!n.read ? 'bg-slate-800/20' : ''}`}>
                    <div className="flex gap-3">
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${!n.read ? 'font-semibold text-white' : 'text-slate-300'}`}>
                          {n.title}
                        </p>
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2">{n.message}</p>
                        <div className="flex items-center gap-4 mt-2">
                          <span className="text-[10px] text-slate-500 font-mono">
                            {new Date(n.createdAt).toLocaleDateString()}
                          </span>
                          {n.link && (
                            <Link to={n.link} onClick={() => setIsOpen(false)} className="text-[10px] text-cyan-400 hover:text-cyan-300 font-medium flex items-center">
                              {t('View details')} <ExternalLink className="w-3 h-3 ml-1" />
                            </Link>
                          )}
                        </div>
                      </div>
                      {!n.read && (
                        <button 
                          onClick={() => markRead.mutate(n.id)}
                          className="shrink-0 p-1.5 h-fit text-slate-500 hover:text-emerald-400 hover:bg-emerald-400/10 rounded-lg transition-colors"
                          title="Mark as read"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}