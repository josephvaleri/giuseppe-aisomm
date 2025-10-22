'use client';
import { motion } from 'framer-motion';

interface Props {
  question: string;
  answers: { A: string; B: string; C: string; D: string };
  onAnswer: (choice: 'A'|'B'|'C'|'D') => void;
}

export default function QuestionCard({ question, answers, onAnswer }: Props) {
  const answerOptions = [
    { key: 'A' as const, text: answers.A, color: 'from-red-500 to-red-600', hoverColor: 'hover:from-red-600 hover:to-red-700' },
    { key: 'B' as const, text: answers.B, color: 'from-blue-500 to-blue-600', hoverColor: 'hover:from-blue-600 hover:to-blue-700' },
    { key: 'C' as const, text: answers.C, color: 'from-green-500 to-green-600', hoverColor: 'hover:from-green-600 hover:to-green-700' },
    { key: 'D' as const, text: answers.D, color: 'from-purple-500 to-purple-600', hoverColor: 'hover:from-purple-600 hover:to-purple-700' }
  ];

  return (
    <div className="space-y-6">
      <motion.h3 
        className="text-2xl font-semibold text-center text-amber-900 leading-relaxed"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {question}
      </motion.h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {answerOptions.map((option, index) => (
          <motion.button
            key={option.key}
            className={`
              w-full p-6 rounded-2xl shadow-lg text-white font-semibold text-left
              bg-gradient-to-br ${option.color} ${option.hoverColor}
              transition-all duration-300 transform hover:scale-105
              min-h-[80px] flex items-center
            `}
            onClick={() => onAnswer(option.key)}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <span className="font-bold text-2xl mr-4">{option.key})</span>
            <span className="text-lg">{option.text}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
