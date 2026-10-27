import { createContext, useCallback, useContext, useState } from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

const ToastContext = createContext(() => {});

const STYLES = {
  success: ['bg-accent-600', CheckCircle2],
  error: ['bg-red-600', AlertTriangle],
  info: ['bg-brand-900', Info],
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const toast = useCallback((message, type = 'info', ms = 4500) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), ms);
  }, []);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4">
        {toasts.map((t) => {
          const [bg, Icon] = STYLES[t.type] || STYLES.info;
          return (
            <div
              key={t.id}
              role="status"
              className={`pointer-events-auto flex max-w-md items-start gap-3 rounded-xl px-4 py-3 text-sm text-white shadow-lg ${bg}`}
            >
              <Icon className="mt-0.5 size-4 shrink-0" />
              <span className="flex-1">{t.message}</span>
              <button onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))} aria-label="Dismiss">
                <X className="size-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
