// ========== 8-bit 音效合成 (Web Audio API) ==========

const Sound = {
  ctx: null,
  enabled: true,

  init() {
    // 避免重复创建 AudioContext（浏览器有数量限制）
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      console.warn('Web Audio API 不可用');
      this.enabled = false;
    }
  },

  play(type) {
    if (!this.enabled || !this.ctx) return;

    // 浏览器需要用户交互后才能播放音频
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    switch (type) {
      case 'place':       this.beep(200, 0.08, 'square'); break;
      case 'explode':     this.explosion(); break;
      case 'kill':        this.arpeggio([523, 659, 784], 0.06); break;
      case 'death':       this.arpeggio([784, 659, 523, 392], 0.1); break;
      case 'alert':       this.beep(440, 0.1, 'sawtooth'); setTimeout(() => this.beep(440, 0.1, 'sawtooth'), 150); break;
      case 'productChaos':this.productChaos(); break;
      case 'devSpawn':    this.devSpawn(); break;
      case 'compileDone': this.compileDone(); break;
      case 'victory':     this.arpeggio([523, 659, 784, 1047], 0.12); break;
      case 'heal':        this.arpeggio([523, 659, 784, 1047, 1319], 0.05); break;
      case 'specialKill': this.specialKill(); break;
      case 'speed':       this.speedBoost(); break;
      case 'bugWave':     this.bugWaveSiren(); break;
      case 'bossSpawn':   this.bossSpawn(); break;
    }
  },

  beep(freq, duration, wave) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = wave || 'square';
    osc.frequency.value = freq;

    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(this.ctx.currentTime);
    osc.stop(this.ctx.currentTime + duration);
  },

  arpeggio(freqs, noteDuration) {
    if (!this.ctx) return;
    for (let i = 0; i < freqs.length; i++) {
      setTimeout(() => this.beep(freqs[i], noteDuration, 'square'), i * noteDuration * 1000);
    }
  },

  explosion() {
    if (!this.ctx) return;

    // 低频轰鸣
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(80, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(20, this.ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(this.ctx.currentTime);
    osc.stop(this.ctx.currentTime + 0.3);

    // 噪音
    const bufferSize = this.ctx.sampleRate * 0.2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.value = 0.2;
    noise.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);
    noise.start(this.ctx.currentTime);
  },

  // 加速音效 — 快速上扬的"嗖"声
  speedBoost() {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, this.ctx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.25);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(this.ctx.currentTime);
    osc.stop(this.ctx.currentTime + 0.25);
    // 跟一声高频叮
    setTimeout(() => this.beep(1568, 0.1, 'square'), 80);
  },

  // 特殊 Bug 击杀音效 — 上扬胜利曲
  specialKill() {
    if (!this.ctx) return;
    // 上升音阶 + 颤音
    const notes = [523, 659, 784, 1047, 1319];
    for (let i = 0; i < notes.length; i++) {
      setTimeout(() => this.beep(notes[i], 0.08, 'square'), i * 60);
    }
    // 结尾高音叮
    setTimeout(() => {
      this.beep(1568, 0.15, 'sine');
      this.beep(2093, 0.1, 'sine');
    }, notes.length * 60 + 50);
  },

  // "一大波Bug" 警报音 — 紧急下蹲再上扬的锯齿波警报
  bugWaveSiren() {
    if (!this.ctx) return;
    // 第一声 — 从高到低（警報感）
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(880, this.ctx.currentTime);
    osc1.frequency.exponentialRampToValueAtTime(220, this.ctx.currentTime + 0.4);
    gain1.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.4);
    osc1.connect(gain1);
    gain1.connect(this.ctx.destination);
    osc1.start(this.ctx.currentTime);
    osc1.stop(this.ctx.currentTime + 0.4);

    // 第二声 — 从低到高（紧迫感）
    setTimeout(() => {
      if (!this.ctx) return;
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = 'sawtooth';
      osc2.frequency.setValueAtTime(220, this.ctx.currentTime);
      osc2.frequency.exponentialRampToValueAtTime(1100, this.ctx.currentTime + 0.3);
      gain2.gain.setValueAtTime(0.2, this.ctx.currentTime);
      gain2.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);
      osc2.connect(gain2);
      gain2.connect(this.ctx.destination);
      osc2.start(this.ctx.currentTime);
      osc2.stop(this.ctx.currentTime + 0.3);
    }, 450);

    // 第三声 — 连续短促警报
    setTimeout(() => {
      this.beep(660, 0.1, 'square');
    }, 850);
    setTimeout(() => {
      this.beep(660, 0.1, 'square');
    }, 1000);
  },

  // 产品捣乱专属音效 — 搞怪下降音 + 不和谐音
  productChaos() {
    if (!this.ctx) return;
    // 下降音 — 模拟"需求又变了"的无奈感
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(600, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(150, this.ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(this.ctx.currentTime);
    osc.stop(this.ctx.currentTime + 0.3);
    // 跟一声低频"咚" — 强调捣乱感
    setTimeout(() => this.beep(80, 0.15, 'sine'), 200);
  },

  // 研发写Bug专属音效 — 快速按键声 + 出Bug的"啵"
  devSpawn() {
    if (!this.ctx) return;
    // 快速三声按键
    for (let i = 0; i < 3; i++) {
      setTimeout(() => this.beep(300 + i * 50, 0.03, 'square'), i * 40);
    }
    // 出Bug的"啵"声
    setTimeout(() => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(200, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(500, this.ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(this.ctx.currentTime);
      osc.stop(this.ctx.currentTime + 0.1);
    }, 160);
  },

  // 规则编译完成专属音效 — 电子合成和弦 + 上扬确认
  compileDone() {
    if (!this.ctx) return;
    // 三和弦叠加 — C-E-G 大三和弦
    const chord = [523, 659, 784];
    for (const freq of chord) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.08, this.ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(this.ctx.currentTime);
      osc.stop(this.ctx.currentTime + 0.4);
    }
    // 上扬确认音 — 高音叮
    setTimeout(() => this.beep(1320, 0.15, 'sine'), 200);
  },

  // Boss Bug 出场音效 — 深沉 ominous 低音 + 不和谐高频
  bossSpawn() {
    if (!this.ctx) return;
    // 第一层 — 极低频轰鸣（地震感）
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(55, this.ctx.currentTime);
    osc1.frequency.linearRampToValueAtTime(40, this.ctx.currentTime + 1.2);
    gain1.gain.setValueAtTime(0, this.ctx.currentTime);
    gain1.gain.linearRampToValueAtTime(0.25, this.ctx.currentTime + 0.1);
    gain1.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 1.2);
    osc1.connect(gain1);
    gain1.connect(this.ctx.destination);
    osc1.start(this.ctx.currentTime);
    osc1.stop(this.ctx.currentTime + 1.2);

    // 第二层 — 不和谐三全音（魔鬼音程）
    setTimeout(() => {
      if (!this.ctx) return;
      // C 和 #F (三全音 = 魔鬼音程)
      [261, 370].forEach(freq => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.6);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(this.ctx.currentTime);
        osc.stop(this.ctx.currentTime + 0.6);
      });
    }, 200);

    // 第三层 — 邪恶笑声效果（高频快速颤音下降）
    setTimeout(() => {
      if (!this.ctx) return;
      for (let i = 0; i < 5; i++) {
        setTimeout(() => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(800 - i * 80, this.ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(400 - i * 40, this.ctx.currentTime + 0.1);
          gain.gain.setValueAtTime(0.06, this.ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(this.ctx.currentTime);
          osc.stop(this.ctx.currentTime + 0.1);
        }, i * 120);
      }
    }, 600);
  },
};
