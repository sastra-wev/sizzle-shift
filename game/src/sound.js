// Tiny synthesized sound effects (WebAudio, no audio files): a pop when a layer lands, a
// ding when a dish is served, a low buzz for a refused layer. The context is created lazily
// on the first user gesture, as browsers require, and every call is safe before that.

export function createSound() {
  let context = null;
  let muted = false;

  function ensureContext() {
    if (context) return context;
    const AudioCtor = window.AudioContext ?? window.webkitAudioContext;
    if (!AudioCtor) return null;
    context = new AudioCtor();
    return context;
  }

  function tone(frequency, seconds, type, volume, slideTo) {
    if (muted) return;
    const ctx = ensureContext();
    if (!ctx) return;
    const start = ctx.currentTime;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    if (slideTo) oscillator.frequency.exponentialRampToValueAtTime(slideTo, start + seconds);
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
    oscillator.connect(gain).connect(ctx.destination);
    oscillator.start(start);
    oscillator.stop(start + seconds);
  }

  return {
    /** Call from any click or keypress so the browser unlocks audio. */
    unlock() {
      ensureContext();
      if (context && context.state === 'suspended') void context.resume();
    },
    pop() {
      tone(340, 0.09, 'triangle', 0.16, 520);
    },
    ding() {
      tone(880, 0.16, 'sine', 0.2);
      setTimeout(() => tone(1318, 0.22, 'sine', 0.18), 70);
    },
    buzz() {
      tone(140, 0.18, 'sawtooth', 0.12, 90);
    },
    thud() {
      tone(110, 0.12, 'sine', 0.2, 60);
    },
    jingle() {
      [523, 659, 784, 1046].forEach((note, i) => setTimeout(() => tone(note, 0.24, 'triangle', 0.16), i * 110));
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    isMuted() {
      return muted;
    },
  };
}
