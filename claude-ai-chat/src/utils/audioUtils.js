/**
 * Converts any audio Blob to WAV format using Web Audio API.
 * Groq Whisper accepts WAV but not webm/opus directly.
 */
export const convertToWav = async (audioBlob) => {
  const arrayBuffer = await audioBlob.arrayBuffer();
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  audioContext.close();

  // Render to WAV
  const numChannels = 1; // mono
  const sampleRate = 16000; // 16kHz — optimal for Whisper
  const numSamples = Math.floor(audioBuffer.duration * sampleRate);

  // Resample to 16kHz mono using OfflineAudioContext
  const offlineCtx = new OfflineAudioContext(numChannels, numSamples, sampleRate);
  const source = offlineCtx.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(offlineCtx.destination);
  source.start(0);
  const rendered = await offlineCtx.startRendering();

  // Get PCM samples
  const pcmData = rendered.getChannelData(0);

  // Encode as 16-bit PCM WAV
  const wavBuffer = encodeWav(pcmData, sampleRate, numChannels);
  return new Blob([wavBuffer], { type: 'audio/wav' });
};

const encodeWav = (samples, sampleRate, numChannels) => {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  const writeString = (offset, str) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  const floatTo16Bit = (sample) => {
    const clamped = Math.max(-1, Math.min(1, sample));
    return clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);           // chunk size
  view.setUint16(20, 1, true);            // PCM format
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * 2, true); // byte rate
  view.setUint16(32, numChannels * 2, true);              // block align
  view.setUint16(34, 16, true);           // bits per sample
  writeString(36, 'data');
  view.setUint32(40, samples.length * 2, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    view.setInt16(offset, floatTo16Bit(samples[i]), true);
    offset += 2;
  }

  return buffer;
};
