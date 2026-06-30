// ============================================
// HOTSHOT FABRICS - TOAST NOTIFICATIONS
// ============================================
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import type { Toast, ToastType } from '../types';

const toastConfig: Record<ToastType, { icon: typeof CheckCircle; bg: string; border: string; text: string }> = {
  success: { icon: CheckCircle, bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400' },
  error: { icon: AlertCircle, bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-400' },
  info: { icon: Info, bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-400' },
  warning: { icon: AlertTriangle, bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', text: 'text-yellow-400' },
};

export function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  return (
    <div className="fixed top-24 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => {
          const config = toastConfig[toast.type];
          const Icon = config.icon;
          
          return (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, x: 100, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border ${config.bg} ${config.border} backdrop-blur-sm shadow-xl`}
            >
              <Icon className={`w-5 h-5 ${config.text} flex-shrink-0 mt-0.5`} />
              <p className={`text-sm font-medium flex-1 ${config.text}`}>{toast.message}</p>
              <button
                onClick={() => onDismiss(toast.id)}
                className="flex-shrink-0 text-zinc-500 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}