'use client';
import { motion } from 'framer-motion';

interface WineGlassProgressProps {
  total: number;
  correct: number;
  current: number;
}

export default function WineGlassProgress({ total, correct, current }: WineGlassProgressProps) {
  // Calculate progress as percentage of questions completed
  // current is the current question index (0-based)
  // Progress should be: 0% at start, 20% after Q1, 40% after Q2, etc.
  // For the final question (current = total - 1), show 100% progress
  const isFinalQuestion = current === total - 1;
  const questionsCompleted = isFinalQuestion ? total : current + 1;
  const percentage = Math.min(100, (questionsCompleted / total) * 100);
  
  return (
    <div className="w-full max-w-md mx-auto">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-amber-700">Progress</span>
        <span className="text-sm font-medium text-amber-700">{correct}/{total}</span>
      </div>
      
      <div className="relative h-6 w-full bg-amber-100 rounded-full overflow-hidden shadow-inner">
        <motion.div 
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
        
        {/* Wine glass effect - subtle overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/20 to-transparent rounded-full" />
        
        {/* Progress text overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-bold text-amber-800 drop-shadow-sm">
            {Math.round(percentage)}%
          </span>
        </div>
      </div>
      
      {/* Wine glass visual indicator */}
      <div className="flex justify-center mt-2">
        <div className="flex space-x-1">
          {Array.from({ length: total }, (_, i) => (
            <motion.div
              key={i}
              className={`w-3 h-3 rounded-full ${
                i < correct 
                  ? 'bg-amber-500' 
                  : 'bg-amber-200'
              }`}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: i * 0.1 }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
