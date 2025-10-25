'use client';
import { motion, AnimatePresence } from 'framer-motion';

interface IncorrectFlashProps {
  show: boolean;
}

export default function IncorrectFlash({ show }: IncorrectFlashProps) {
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
            className="text-red-600"
            initial={{ scale: 0, rotate: 0 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 0 }}
            transition={{ 
              type: "spring", 
              stiffness: 300, 
              damping: 20,
              duration: 0.3
            }}
            style={{ fontSize: '100px' }}
          >
            ✗
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
