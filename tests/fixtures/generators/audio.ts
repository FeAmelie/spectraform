import { normalizeSeed } from "./config.ts";

export interface SyntheticAudio {
  readonly sampleRate: 48_000;
  readonly channels: 1;
  readonly samples: Float32Array;
  readonly wav: Uint8Array;
}

function createRandom(seed: number): () => number {
  let state = normalizeSeed(seed) || 0x6d2b79f5;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0x1_0000_0000;
  };
}

function encodeMonoPcm16(samples: Float32Array, sampleRate: number): Uint8Array {
  const bytes = new Uint8Array(44 + samples.length * 2);
  const view = new DataView(bytes.buffer);
  const writeAscii = (offset: number, value: string): void => {
    for (let index = 0; index < value.length; index += 1)
      view.setUint8(offset + index, value.charCodeAt(index));
  };

  writeAscii(0, "RIFF");
  view.setUint32(4, bytes.length - 8, true);
  writeAscii(8, "WAVE");
  writeAscii(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeAscii(36, "data");
  view.setUint32(40, samples.length * 2, true);

  for (let index = 0; index < samples.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, samples[index] ?? 0));
    view.setInt16(44 + index * 2, Math.round(sample * 0x7fff), true);
  }
  return bytes;
}

export function createSyntheticAudio(seed: number, sampleCount = 256): SyntheticAudio {
  if (!Number.isSafeInteger(sampleCount) || sampleCount <= 0) {
    throw new RangeError("Synthetic audio sampleCount must be a positive safe integer");
  }
  const random = createRandom(seed);
  const samples = Float32Array.from({ length: sampleCount }, (_, index) => {
    const phase = (index / sampleCount) * Math.PI * 8;
    const carrier = Math.sin(phase) * 0.6;
    const deterministicNoise = (random() * 2 - 1) * 0.025;
    return carrier + deterministicNoise;
  });
  return { sampleRate: 48_000, channels: 1, samples, wav: encodeMonoPcm16(samples, 48_000) };
}
