'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface QuizPopupProps {
  open: boolean;
  message: string;
  onClose: () => void;
  variant: 'correct' | 'wrong' | 'complete_90' | 'complete_70' | 'fail';
}

export default function QuizPopup({ open, message, onClose, variant }: QuizPopupProps) {
  const getImageSrc = () => {
    switch (variant) {
      case 'correct':
        return '/img/giuseppe-toast.png';
      case 'complete_90':
        return '/img/giuseppe-toast.png';
      case 'complete_70':
        return '/img/giuseppe-avatar.png';
      case 'fail':
        return '/img/giuseppe-avatar.png';
      default:
        return '/img/giuseppe-avatar.png';
    }
  };

  const getBackgroundColor = () => {
    switch (variant) {
      case 'correct':
        return 'bg-green-50 border-green-200';
      case 'complete_90':
        return 'bg-yellow-50 border-yellow-200';
      case 'complete_70':
        return 'bg-blue-50 border-blue-200';
      case 'fail':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div 
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div 
            className={`
              bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-xl border-2
              ${getBackgroundColor()}
            `}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={24} />
            </button>
            
            <motion.img 
              src={getImageSrc()}
              className="h-24 w-auto mx-auto mb-4 rounded-full shadow-lg object-cover"
              alt="Giuseppe"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 300 }}
            />
            
            <motion.div 
              className="text-lg font-medium text-gray-800 leading-relaxed"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              {message.split('\n').map((line, index) => (
                <p key={index} className={index === 0 ? '' : 'mt-2 text-base text-gray-600'}>
                  {line}
                </p>
              ))}
            </motion.div>
            
            <motion.button
              onClick={onClose}
              className="mt-6 px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              Continue
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
