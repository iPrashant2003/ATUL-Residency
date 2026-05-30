const fs = require("fs");
const path = require("path");

function generateChimeWav() {
  const sampleRate = 22050;
  const duration = 1.2; // seconds
  const numSamples = Math.floor(sampleRate * duration);
  const buffer = Buffer.alloc(44 + numSamples * 2); // 16-bit PCM (2 bytes per sample)

  // 1. Write WAV Header
  // "RIFF"
  buffer.write("RIFF", 0);
  // File size - 8 bytes
  buffer.writeUInt32LE(36 + numSamples * 2, 4);
  // "WAVE"
  buffer.write("WAVE", 8);
  // "fmt "
  buffer.write("fmt ", 12);
  // Subchunk1 size (16 for PCM)
  buffer.writeUInt32LE(16, 16);
  // Audio format (1 for PCM)
  buffer.writeUInt16LE(1, 20);
  // Number of channels (1 for Mono)
  buffer.writeUInt16LE(1, 22);
  // Sample rate
  buffer.writeUInt32LE(sampleRate, 24);
  // Byte rate (sampleRate * 1 channel * 2 bytes/sample)
  buffer.writeUInt32LE(sampleRate * 2, 28);
  // Block align (1 channel * 2 bytes/sample)
  buffer.writeUInt16LE(2, 32);
  // Bits per sample (16 bits)
  buffer.writeUInt16LE(16, 34);
  // "data"
  buffer.write("data", 36);
  // Subchunk2 size
  buffer.writeUInt32LE(numSamples * 2, 40);

  // 2. Generate Audio Chime Data (Double frequency chime with exponential decay)
  const f1 = 880; // A5 note
  const f2 = 1318.51; // E6 note
  let offset = 44;

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    // Exponential decay envelope
    const envelope = Math.exp(-3 * t); // Decays quickly
    
    // Mix two sine waves for a rich metallic bell chime
    const signal = 0.5 * Math.sin(2 * Math.PI * f1 * t) + 0.5 * Math.sin(2 * Math.PI * f2 * t);
    const sampleVal = Math.floor(signal * envelope * 32767);

    // Write 16-bit signed integer
    buffer.writeInt16LE(sampleVal, offset);
    offset += 2;
  }

  return buffer;
}

const outputPath = path.join(__dirname, "public", "notification.wav");
fs.writeFileSync(outputPath, generateChimeWav());
console.log(`Successfully generated chime sound at: ${outputPath}`);
