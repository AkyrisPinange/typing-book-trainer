export function calculateWPM(charsTyped: number, timeSeconds: number): number {
  if (timeSeconds === 0) return 0;
  const words = charsTyped / 5; // Standard: 5 chars per word
  const minutes = timeSeconds / 60;
  return Math.round(words / minutes);
}

export function calculateAccuracy(correct: number, total: number): number {
  if (total === 0) return 100;
  return Math.round((correct / total) * 100);
}

