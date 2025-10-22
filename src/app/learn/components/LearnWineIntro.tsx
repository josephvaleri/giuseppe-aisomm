export default function LearnWineIntro() {
  return (
    <section className="flex flex-col items-center text-center gap-6 px-4">
      <img 
        src="/img/giuseppe-avatar.png" 
        alt="Giuseppe" 
        className="h-32 w-auto rounded-full shadow-xl border-4 border-amber-200 object-cover" 
      />
      <h1 className="text-5xl font-bold text-amber-900">Learn Wine!</h1>
      <p className="text-muted-foreground max-w-2xl text-xl leading-relaxed">
        Ciao, amico! Welcome to "Learn Wine!" Choose a quiz, earn badges, and master the wine world one delicious sip at a time.
      </p>
    </section>
  );
}
