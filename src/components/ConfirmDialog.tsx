// ============================================
// HOTSHOT FABRICS - CONFIRMATION MODAL
// ============================================
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'danger' | 'primary';
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmVariant = 'danger',
  onConfirm,
  onCancel
}: ConfirmModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={onCancel}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-md w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                confirmVariant === 'danger' ? 'bg-red-500/10' : 'bg-orange-500/10'
              }`}>
                <AlertTriangle className={`w-5 h-5 ${
                  confirmVariant === 'danger' ? 'text-red-400' : 'text-orange-400'
                }`} />
              </div>
              <h3 className="text-lg font-bold">{title}</h3>
            </div>
            
            <p className="text-zinc-400 mb-6 leading-relaxed">{message}</p>
            
            <div className="flex gap-3">
              <button
                onClick={onCancel}
                className="flex-1 px-4 py-2.5 border border-zinc-700 rounded-xl font-medium hover:border-zinc-500 transition-colors"
              >
                {cancelText}
              </button>
              <button
                onClick={() => { onConfirm(); onCancel(); }}
                className={`flex-1 px-4 py-2.5 rounded-xl font-bold transition-colors ${
                  confirmVariant === 'danger'
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-orange-500 hover:bg-orange-600 text-white'
                }`}
              >
                {confirmText}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}