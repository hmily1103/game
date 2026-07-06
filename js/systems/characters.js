// ========== 产品/研发 角色动画控制器 ==========

const Characters = {
  pmTimer: 0,
  devTimer: 0,

  init() {
    // 初始化时隐藏气泡
    const pmSpeech = document.getElementById('pm-speech');
    const devSpeech = document.getElementById('dev-speech');
    if (pmSpeech) pmSpeech.classList.remove('show');
    if (devSpeech) devSpeech.classList.remove('show');
  },

  update() {
    if (Game.state !== 'playing') return;

    // PM 气泡自动消失
    if (this.pmTimer > 0) {
      this.pmTimer--;
      if (this.pmTimer <= 0) {
        const el = document.getElementById('pm-speech');
        if (el) el.classList.remove('show');
      }
    }

    // DEV 气泡自动消失
    if (this.devTimer > 0) {
      this.devTimer--;
      if (this.devTimer <= 0) {
        const el = document.getElementById('dev-speech');
        if (el) el.classList.remove('show');
      }
    }
  },

  // 产品提了新需求 — 举手 + 气泡
  productAction(msg) {
    const pm = document.getElementById('char-pm');
    const speech = document.getElementById('pm-speech');
    if (!pm || !speech) return;

    // 举手动画
    pm.classList.add('waving');
    setTimeout(() => pm.classList.remove('waving'), 600);

    // 气泡
    speech.textContent = msg;
    speech.classList.add('show');
    this.pmTimer = 3 * 60; // 3秒后消失
  },

  // 研发写新 Bug — 举手 + 气泡
  devAction(msg) {
    const dev = document.getElementById('char-dev');
    const speech = document.getElementById('dev-speech');
    if (!dev || !speech) return;

    // 举手动画
    dev.classList.add('waving');
    setTimeout(() => dev.classList.remove('waving'), 600);

    // 气泡
    speech.textContent = msg;
    speech.classList.add('show');
    this.devTimer = 3 * 60; // 3秒后消失
  },
};
