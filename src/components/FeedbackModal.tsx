import React, { useState } from 'react';
import { X, Send } from 'lucide-react';
import { useAuth } from './AuthContext';

export function FeedbackModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [type, setType] = useState('Bug Report');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const { user } = useAuth();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setSubmitting(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (user) {
        let token; try { token = await user.getIdToken(); } catch(e:any) { throw new Error("Firebase Auth Error: " + e.message); }
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const res = await fetch('/api-v2/feedback', {
        method: 'POST',
        headers,
        body: JSON.stringify({ type, message })
      });
      if (res.ok) {
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          setMessage('');
          onClose();
        }, 2000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-slate-800 rounded-xl shadow-none w-full max-w-md overflow-hidden relative animate-in fade-in zoom-in duration-200">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-400">
          <X className="w-5 h-5" />
        </button>
        
        <div className="p-6">
          <h2 className="text-xl font-semibold tracking-tight text-slate-100 mb-1">Submit Feedback</h2>
          <p className="text-slate-400 text-sm mb-6">Help us improve the platform.</p>
          
          {success ? (
            <div className="bg-emerald-50 text-emerald-800 p-4 rounded-xl text-center font-medium">
              Thank you for your feedback!
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Type</label>
                <select 
                  value={type} 
                  onChange={(e) => setType(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-ink"
                >
                  <option value="Bug Report">Bug Report</option>
                  <option value="Feature Request">Feature Request</option>
                  <option value="General Feedback">General Feedback</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Message</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe the issue or feature request..."
                  required
                  rows={4}
                  className="w-full rounded-xl border border-slate-700 px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-ink"
                ></textarea>
              </div>
              
              <button 
                type="submit" 
                disabled={submitting || !message.trim()}
                className="w-full flex justify-center items-center py-2.5 bg-ink text-white rounded-xl font-semibold hover:bg-ink-light disabled:opacity-50 transition-colors"
              >
                {submitting ? 'Sending...' : <><Send className="w-4 h-4 mr-2" /> Submit</>}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
