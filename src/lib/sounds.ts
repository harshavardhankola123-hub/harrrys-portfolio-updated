/* Synthesized sound effects (Web Audio) — no audio files to load.
   Must be called from a user gesture so the browser lets the context start. */

let audioCtx: AudioContext | null = null;
let noiseBuffer: AudioBuffer | null = null;

function getContext() {
  if (!audioCtx) {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new AudioCtx();
  }
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

function getNoise(ctx: AudioContext) {
  if (!noiseBuffer) {
    noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  return noiseBuffer;
}

/* A pitched note with a soft attack and exponential decay */
function tone(
  ctx: AudioContext,
  out: AudioNode,
  { at, freq, to, duration, gain, type = "sine" }: { at: number; freq: number; to?: number; duration: number; gain: number; type?: OscillatorType }
) {
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, at);
  if (to) osc.frequency.exponentialRampToValueAtTime(to, at + duration);
  amp.gain.setValueAtTime(0.0001, at);
  amp.gain.exponentialRampToValueAtTime(gain, at + 0.012);
  amp.gain.exponentialRampToValueAtTime(0.0001, at + duration);
  osc.connect(amp).connect(out);
  osc.start(at);
  osc.stop(at + duration + 0.05);
}

/* Filtered noise sweeping between two frequencies — paper, air, friction */
function swish(
  ctx: AudioContext,
  out: AudioNode,
  { at, from, to, duration, gain, q = 0.9, type = "bandpass" }: { at: number; from: number; to: number; duration: number; gain: number; q?: number; type?: BiquadFilterType }
) {
  const src = ctx.createBufferSource();
  src.buffer = getNoise(ctx);
  // Start at a random point so repeated swishes don't sound identical
  const offset = Math.random() * (src.buffer.duration - duration - 0.1);
  const filter = ctx.createBiquadFilter();
  filter.type = type;
  filter.Q.value = q;
  filter.frequency.setValueAtTime(from, at);
  filter.frequency.exponentialRampToValueAtTime(to, at + duration);
  const amp = ctx.createGain();
  amp.gain.setValueAtTime(0.0001, at);
  amp.gain.exponentialRampToValueAtTime(gain, at + duration * 0.3);
  amp.gain.exponentialRampToValueAtTime(0.0001, at + duration);
  src.connect(filter).connect(amp).connect(out);
  src.start(at, offset, duration + 0.05);
}

/* The whole envelope-opening sequence, scheduled on the audio clock so it
   stays locked to the animation. Offsets are seconds from the click. */
export function playEnvelopeOpen(timeline: { flap: number; letter: number; reveal: number }) {
  try {
    const ctx = getContext();
    const master = ctx.createGain();
    master.gain.value = 0.55;
    master.connect(ctx.destination);
    const t0 = ctx.currentTime + 0.02;

    // Wax seal: a low thump with a brittle crack on top
    tone(ctx, master, { at: t0, freq: 170, to: 48, duration: 0.16, gain: 0.7 });
    swish(ctx, master, { at: t0, from: 5200, to: 2600, duration: 0.07, gain: 0.3, q: 0.6, type: "highpass" });
    swish(ctx, master, { at: t0 + 0.06, from: 4200, to: 3000, duration: 0.05, gain: 0.16, q: 0.6, type: "highpass" });

    // Flap lifting: a rising paper sweep plus a few dry crinkles
    const flap = t0 + timeline.flap;
    swish(ctx, master, { at: flap, from: 500, to: 2600, duration: 0.6, gain: 0.26 });
    for (let i = 0; i < 5; i++) {
      swish(ctx, master, {
        at: flap + 0.08 + i * 0.09 + Math.random() * 0.04,
        from: 3800 + Math.random() * 1500,
        to: 3000,
        duration: 0.03,
        gain: 0.09,
        q: 0.5,
        type: "highpass",
      });
    }

    // Letter sliding out: a lighter, higher friction hiss
    swish(ctx, master, { at: t0 + timeline.letter, from: 1700, to: 4200, duration: 0.65, gain: 0.15, q: 1.2 });

    // Reveal: an airy whoosh under a rising D-major chime
    const reveal = t0 + timeline.reveal;
    swish(ctx, master, { at: reveal, from: 260, to: 2200, duration: 0.95, gain: 0.22, q: 0.7, type: "lowpass" });
    [587.33, 880, 1174.66, 1479.98].forEach((freq, i) => {
      tone(ctx, master, { at: reveal + 0.28 + i * 0.075, freq, duration: 1.5, gain: 0.085, type: i % 2 ? "sine" : "triangle" });
    });
  } catch {
    // AudioContext not supported or restricted by browser
  }
}
