'use client';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

export default function QuizTypeSelector() {
  const router = useRouter();

  const quizTypes = [
    {
      id: 'pop',
      title: 'Pop Quiz',
      description: '5 questions, 1-minute timer',
      icon: '⚡',
      color: 'from-red-500 to-orange-500',
      hoverColor: 'hover:from-red-600 hover:to-orange-600'
    },
    {
      id: 'sip',
      title: 'Sip & Learn',
      description: '10 questions, untimed',
      icon: '🍷',
      color: 'from-amber-500 to-yellow-500',
      hoverColor: 'hover:from-amber-600 hover:to-yellow-600'
    }
  ];

  return (
    <div className="flex gap-6 justify-center flex-wrap">
      {quizTypes.map((quiz, index) => (
        <motion.button
          key={quiz.id}
          className={`
            relative p-6 rounded-2xl shadow-lg text-white font-semibold
            bg-gradient-to-br ${quiz.color} ${quiz.hoverColor}
            transition-all duration-300 transform hover:scale-105
            min-w-[200px] text-center
          `}
          onClick={() => router.push(`/learn/quiz?type=${quiz.id}`)}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <div className="text-3xl mb-2">{quiz.icon}</div>
          <h3 className="text-xl font-bold mb-1">{quiz.title}</h3>
          <p className="text-sm opacity-90">{quiz.description}</p>
        </motion.button>
      ))}
    </div>
  );
}
