import QuizRunner from './components/QuizRunner';

interface QuizPageProps {
  searchParams: Promise<{
    type?: string;
    study_area?: string;
  }>;
}

export default async function QuizPage({ searchParams }: QuizPageProps) {
  const params = await searchParams;
  const quizType = (params.type as 'pop' | 'sip') || 'pop';
  const studyArea = (params.study_area as any) || 'Grapes';

  return (
    <main className="container py-8">
      <QuizRunner quizType={quizType} studyArea={studyArea} />
    </main>
  );
}
