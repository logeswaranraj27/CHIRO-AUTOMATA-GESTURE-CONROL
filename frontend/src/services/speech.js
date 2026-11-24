class SpeechManager {
  constructor() {
    this.synth = typeof window !== "undefined" && "speechSynthesis" in window ? window.speechSynthesis : null;
    this.enabled = true;
    this.rate = 1.0;
    this.volume = 1.0;
    this.queue = [];
    this.isSpeaking = false;
  }

  configure({ enabled, rate, volume }) {
    if (enabled !== undefined) this.enabled = enabled;
    if (rate !== undefined) this.rate = rate;
    if (volume !== undefined) this.volume = volume;
  }

  speak(text, priority = "normal") {
    if (!this.synth || !this.enabled || !text) return;

    if (priority === "high") {
      // Cancel pending and play immediately
      this.stop();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = Math.max(0.6, Math.min(2.0, this.rate));
    utterance.volume = Math.max(0.0, Math.min(1.0, this.volume));
    utterance.pitch = 1.0;

    utterance.onend = () => {
      this.isSpeaking = false;
      this._processQueue();
    };

    utterance.onerror = (e) => {
      this.isSpeaking = false;
      this._processQueue();
    };

    if (this.isSpeaking && priority !== "high") {
      // Limit queue size to avoid long speech lag
      if (this.queue.length < 3) {
        this.queue.push(utterance);
      }
    } else {
      this.isSpeaking = true;
      this.synth.speak(utterance);
    }
  }

  _processQueue() {
    if (this.queue.length > 0 && this.synth) {
      const nextUtterance = this.queue.shift();
      this.isSpeaking = true;
      this.synth.speak(nextUtterance);
    }
  }

  stop() {
    this.queue = [];
    this.isSpeaking = false;
    if (this.synth) {
      this.synth.cancel();
    }
  }
}

export const speechManager = new SpeechManager();

