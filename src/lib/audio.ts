// Audio hook for Giuseppe's gamification sounds
export function playCorkPop() {
  if (typeof window !== 'undefined') {
    const audio = new Audio('/audio/cork-pop.mp3');
    audio.volume = 0.7; // Set a comfortable volume
    audio.play().catch((error) => {
      console.log('Audio play failed:', error);
      // Silently fail - audio is not critical for functionality
    });
  }
}

export function playSuccessSound() {
  playCorkPop(); // For now, use the same sound for success
}

export function playErrorSound() {
  // Could add a different sound for wrong answers in the future
  // For now, we'll just use silence or the cork pop
}
