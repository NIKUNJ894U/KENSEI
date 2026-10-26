export const ALERT_TONES = [
  { id: 'radar', name: '📡 Radar Sweep', description: 'Tactical retro pitch sweep' },
  { id: 'double_beep', name: '🚨 Digital Double Beep', description: 'Sharp double alarm beeps' },
  { id: 'cyber_synth', name: '✨ Cyber Synth Swell', description: 'Futuristic warm chord swell' },
  { id: 'retro_alarm', name: '👾 Arcade Retro Laser', description: 'Square wave alternating laser' },
  { id: 'calm_chime', name: '🔔 Zen Temple Chime', description: 'Elegant harmonic decay chime' },
];

export function playAlertTone(toneId: string) {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    switch (toneId) {
      case 'radar': {
        // Radar sweep pulse
        const playSweep = (delay: number) => {
          const osc = ctx.createOscillator();
          const gainNode = ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(900, now + delay);
          osc.frequency.exponentialRampToValueAtTime(150, now + delay + 0.35);

          gainNode.gain.setValueAtTime(0, now + delay);
          gainNode.gain.linearRampToValueAtTime(0.3, now + delay + 0.05);
          gainNode.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.35);

          osc.connect(gainNode);
          gainNode.connect(ctx.destination);

          osc.start(now + delay);
          osc.stop(now + delay + 0.35);
        };

        playSweep(0);
        playSweep(0.4);
        break;
      }

      case 'double_beep': {
        // Two high-pitched digital beeps
        const playBeep = (delay: number) => {
          const osc = ctx.createOscillator();
          const gainNode = ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(1100, now + delay);

          gainNode.gain.setValueAtTime(0, now + delay);
          gainNode.gain.linearRampToValueAtTime(0.25, now + delay + 0.02);
          gainNode.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.12);

          osc.connect(gainNode);
          gainNode.connect(ctx.destination);

          osc.start(now + delay);
          osc.stop(now + delay + 0.13);
        };

        playBeep(0);
        playBeep(0.18);
        break;
      }

      case 'cyber_synth': {
        // Synth chord with dual oscillators and lowpass filter
        const frequencies = [329.63, 392.00, 493.88]; // Em chord (E4, G4, B4)
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.Q.setValueAtTime(4, now);
        filter.frequency.setValueAtTime(200, now);
        filter.frequency.exponentialRampToValueAtTime(1800, now + 0.25);
        filter.frequency.exponentialRampToValueAtTime(300, now + 0.95);
        filter.connect(ctx.destination);

        frequencies.forEach((freq) => {
          const osc = ctx.createOscillator();
          const gainNode = ctx.createGain();

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now);

          gainNode.gain.setValueAtTime(0, now);
          gainNode.gain.linearRampToValueAtTime(0.15, now + 0.15);
          gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.95);

          osc.connect(gainNode);
          gainNode.connect(filter);

          osc.start(now);
          osc.stop(now + 0.95);
        });
        break;
      }

      case 'retro_alarm': {
        // Rapid square wave pitch alternating laser
        const duration = 0.6;
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();

        osc.type = 'square';
        
        for (let t = 0; t < duration; t += 0.08) {
          osc.frequency.setValueAtTime(600, now + t);
          osc.frequency.setValueAtTime(880, now + t + 0.04);
        }

        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.15, now + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

        osc.connect(gainNode);
        gainNode.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + duration);
        break;
      }

      case 'calm_chime': {
        // Zen bell harmonic decay
        const rootFreq = 523.25; // C5
        const harmonics = [1, 1.5, 2, 3];
        const weights = [0.2, 0.1, 0.08, 0.04];

        harmonics.forEach((mult, idx) => {
          const osc = ctx.createOscillator();
          const gainNode = ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(rootFreq * mult, now);

          gainNode.gain.setValueAtTime(0, now);
          gainNode.gain.linearRampToValueAtTime(weights[idx], now + 0.05);
          gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 1.4);

          osc.connect(gainNode);
          gainNode.connect(ctx.destination);

          osc.start(now);
          osc.stop(now + 1.4);
        });
        break;
      }

      default: {
        // Standard beep
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        gainNode.gain.setValueAtTime(0.1, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.3);
        break;
      }
    }
  } catch (e) {
    console.warn('Web Audio synthesis is blocked or unsupported in current window context:', e);
  }
}
