let sharedAudioCtx: AudioContext | null = null;

/**
 * Plays a gentle two-note chime using Web Audio API without requiring external audio assets.
 * Runs safely inside fullscreen and respects browser autoplay restrictions via try/catch.
 */
export function playSoftDepartureChime(): void {
  if (typeof window === 'undefined') return;

  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    if (!sharedAudioCtx) {
      sharedAudioCtx = new AudioCtx();
    }

    if (sharedAudioCtx.state === 'suspended') {
      void sharedAudioCtx.resume();
    }

    const now = sharedAudioCtx.currentTime;
    const notes = [587.33, 880]; // D5 -> A5 soft fifth chime

    notes.forEach((freq, idx) => {
      if (!sharedAudioCtx) return;
      const osc = sharedAudioCtx.createOscillator();
      const gain = sharedAudioCtx.createGain();

      const start = now + idx * 0.14;
      const duration = idx === 0 ? 0.18 : 0.36;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.06, start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

      osc.connect(gain);
      gain.connect(sharedAudioCtx.destination);

      osc.start(start);
      osc.stop(start + duration + 0.02);
    });
  } catch {
    // Silently ignore audio errors caused by autoplay policies
  }
}
