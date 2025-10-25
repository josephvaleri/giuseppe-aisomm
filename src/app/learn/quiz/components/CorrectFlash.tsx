'use client';
import { motion, AnimatePresence } from 'framer-motion';

interface CorrectFlashProps {
  show: boolean;
}

export default function CorrectFlash({ show }: CorrectFlashProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="text-12xl font-bold text-green-600 transform rotate-45"
            initial={{ scale: 0, rotate: 45 }}
            animate={{ scale: 1, rotate: 45 }}
            exit={{ scale: 0, rotate: 45 }}
            transition={{ 
              type: "spring", 
              stiffness: 300, 
              damping: 20,
              duration: 0.3
            }}
          >
            Correct!
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
