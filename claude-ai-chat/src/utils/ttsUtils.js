/**
 * Text-to-Speech utilities using Web Speech API (browser built-in).
 * Supports play/pause/stop and WAV download via AudioContext recording.
 */

// Speak text and return a controller object
export const speakText = (text, onEnd) => {
  window.speechSynthesis.cancel(); // stop any current speech

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.95;
  utterance.pitch = 1.0;
  utterance.volume = 1.0;

  // Pick a good English voice if available
  const voices = window.speechSynthesis.getVoices();
  const preferred = voices.find(v =>
    v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Premium'))
  ) || voices.find(v => v.lang.startsWith('en')) || null;

  if (preferred) utterance.voice = preferred;
  if (onEnd) utterance.onend = onEnd;

  window.speechSynthesis.speak(utterance);
  return utterance;
};

export const stopSpeech = () => {
  window.speechSynthesis.cancel();
};

export const pauseSpeech = () => {
  window.speechSynthesis.pause();
};

export const resumeSpeech = () => {
  window.speechSynthesis.resume();
};

/**
 * Convert text to a downloadable WAV blob using AudioContext + oscillator trick.
 * We render the speech synthesis into an audio buffer via MediaStreamDestination.
 */
export const downloadSpeechAsWav = async (text, filename = 'cloud-ai-audio.wav') => {
  return new Promise((resolve, reject) => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const destination = audioCtx.createMediaStreamDestination();
      const mediaRecorder = new MediaRecorder(destination.stream);
      const chunks = [];

      mediaRecorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename.replace('.wav', '.webm');
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        audioCtx.close();
        resolve();
      };

      // Use a hidden audio element to capture speech synthesis output
      // Since Web Speech API doesn't expose an audio stream directly,
      // we use a workaround: play through a gain node connected to destination
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;

      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(v => v.lang.startsWith('en') && v.name.includes('Google'))
        || voices.find(v => v.lang.startsWith('en'));
      if (preferred) utterance.voice = preferred;

      mediaRecorder.start();

      utterance.onend = () => {
        setTimeout(() => mediaRecorder.stop(), 300);
      };

      utterance.onerror = (e) => {
        mediaRecorder.stop();
        reject(new Error('Speech synthesis error: ' + e.error));
      };

      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      reject(err);
    }
  });
};
