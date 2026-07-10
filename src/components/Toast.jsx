import { useState, useEffect, useCallback } from 'react';

let toastId = 0;
let listeners = [];

export function showToast(message, type = 'success', duration = 3000) {
  const id = ++toastId;
  listeners.forEach(fn => fn({ id, message, type, duration }));
  setTimeout(() => {
    listeners.forEach(fn => fn({ id, remove: true }));
  }, duration);
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const handler = (toast) => {
      if (toast.remove) {
        setToasts(prev => prev.filter(t => t.id !== toast.id));
      } else {
        setToasts(prev => [...prev, toast]);
      }
    };
    listeners.push(handler);
    return () => { listeners = listeners.filter(l => l !== handler); };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2">
      {toasts.map(t => (
        <div key={t.id} className="animate-slide-up flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium"
          style={{ background: t.type === 'error' ? '#E53935' : t.type === 'warning' ? '#FFB300' : '#00C853', color: 'white' }}>
          {t.type === 'error' ? '✕' : t.type === 'warning' ? '⚠' : '✓'} {t.message}
        </div>
      ))}
    </div>
  );
}
