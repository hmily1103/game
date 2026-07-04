// ========== 特效系统（豪华版 + 道具/特殊Bug特效） ==========

const Effects = {
  particles: [],
  MAX_PARTICLES: 200,  // 粒子上限，防止大波次卡顿
  // 鸡腿雨特效队列
  drumsticks: [],
  // 屎山飞射碎片队列 — 加速时炸屎山，碎片飞出屏幕
  flyingPoops: [],

  // 随机搞笑横幅文案
  productBanners: [
    '\u{1F4E2} \u9700\u6C42\u53D8\u66F4\uFF01',
    '\u{1F4E2} \u4EA7\u54C1\u8BF4\uFF1A\u6211\u6709\u4E2A\u60F3\u6CD5\uFF01',
    '\u{1F4E2} \u7D27\u6025\u9700\u6C42\u63D2\u961F\uFF01',
    '\u{1F4E2} \u4EA7\u54C1\uFF1A\u8FD9\u4E2A\u5F88\u7B80\u5355\uFF01',
    '\u{1F4E2} \u9700\u6C42\u6587\u6863\u53C8\u6539\u4E86\uFF08\u7B2C847\u6B21\uFF09',
    '\u{1F4E2} \u4EA7\u54C1\uFF1A\u5C31\u6539\u4E00\u4E2A\u5C0F\u5730\u65B9\uFF01',
    '\u{1F4E2} \u7532\u65B9\u8BF4\uFF1A\u6211\u8981\u4E94\u5F69\u65B2\u659C\u7684\u9ED1',
    '\u{1F4E2} \u4EA7\u54C1\uFF1A\u660E\u5929\u5C31\u8981\u4E0A\u7EBF\uFF01',
    '\u{1F4E2} \u9700\u6C42\u4ECEP3\u53D8P0\u4E86\uFF01',
    '\u{1F4E2} \u4EA7\u54C1\uFF1A\u7528\u6237\u8BF4\u8981\u52A0\u4E2A\u529F\u80FD',
  ],

  devBanners: [
    '\u{1F7E2} \u65B0Bug\u4E0A\u7EBF\uFF01',
    '\u{1F7E2} \u7814\u53D1\uFF1A\u6211\u6539\u4E86\u4E00\u884C\u4EE3\u7801',
    '\u{1F7E2} \u7814\u53D1\uFF1A\u5728\u6211\u7535\u8111\u4E0A\u597D\u7684\u554A',
    '\u{1F7E2} \u65B0Bug\u5DF2\u90E8\u7F72\u5230\u751F\u4EA7\uFF01',
    '\u{1F7E2} \u7814\u53D1\u63D0\u4EA4\u4E86\u4EE3\u7801\uFF0C\u5FEB\u8DD1\uFF01',
    '\u{1F7E2} \u8FD9\u4E0D\u662FBug\uFF0C\u8FD9\u662F\u7279\u6027',
    '\u{1F7E2} \u7814\u53D1\uFF1Atry-catch\u5305\u4E86\u4E09\u5C42\uFF0C\u5E94\u8BE5\u6CA1\u95EE\u9898',
    '\u{1F7E2} \u65B0Bug\u5DF2\u4E0A\u7EBF\uFF0C\u8BF7\u6D4B\u8BD5\u9A8C\u6536',
    '\u{1F7E2} \u7814\u53D1\uFF1A\u8FD9\u4E2A\u6539\u52A8\u5E94\u8BE5\u6CA1\u5F71\u54CD... \u5427\uFF1F',
    '\u{1F7E2} \u4E00\u884C\u4EE3\u7801\uFF0C\u4E09\u4E2ABug',
  ],

  shake() {
    const container = document.querySelector('.canvas-container');
    if (container) {
      container.classList.add('shake');
      setTimeout(() => container.classList.remove('shake'), 300);
    }
  },

  bigShake() {
    const container = document.querySelector('.canvas-container');
    if (container) {
      container.classList.add('big-shake');
      setTimeout(() => container.classList.remove('big-shake'), 500);
    }
  },

  flashBorder() {
    const container = document.querySelector('.canvas-container');
    if (container) {
      container.classList.add('flash-border');
      setTimeout(() => container.classList.remove('flash-border'), 1000);
    }
  },

  banner(text) {
    const area = document.getElementById('banner-area');
    const div = document.createElement('div');
    div.className = 'banner';
    div.textContent = text;
    area.appendChild(div);
    setTimeout(() => div.remove(), 2500);
  },

  randomProductBanner() {
    const text = this.productBanners[Math.floor(Math.random() * this.productBanners.length)];
    this.banner(text);
  },

  randomDevBanner() {
    const text = this.devBanners[Math.floor(Math.random() * this.devBanners.length)];
    this.banner(text);
  },

  floatText(text, x, y, color) {
    const container = document.querySelector('.canvas-container');
    if (!container) return;
    const div = document.createElement('div');
    div.className = 'float-text';
    div.textContent = text;
    div.style.left = (x - 40) + 'px';
    div.style.top = (y - 10) + 'px';
    div.style.color = color || '#4ade80';
    container.appendChild(div);
    setTimeout(() => div.remove(), 1200);
  },

  // 屎山被炸飞时的特效 — 便便飞溅 + 绿色恶臭
  shishanDestroy(x, y) {
    const cx = x * CELL_SIZE + CELL_SIZE / 2;
    const cy = y * CELL_SIZE + CELL_SIZE / 2;
    for (let i = 0; i < 14; i++) {
      const angle = (Math.PI * 2 * i) / 14 + Math.random() * 0.3;
      const speed = 2 + Math.random() * 3.5;
      this.particles.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.5,
        life: 40, maxLife: 40,
        color: ['#92400E', '#A16207', '#78350F', '#B45309', '#6B4423'][Math.floor(Math.random() * 5)],
      });
    }
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8 + Math.random() * 0.2;
      const speed = 1 + Math.random() * 1.5;
      this.particles.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        life: 50, maxLife: 50,
        color: ['#84CC16', '#A3E635', '#65A30D'][Math.floor(Math.random() * 3)],
      });
    }
  },

  // ====== 加速时炸屎山 — 屎山飞出屏幕 ======
  // 生成大型💩碎片 + 绿色恶臭气波，以高速向屏幕外飞射
  shishanLaunch(x, y) {
    const cx = x * CELL_SIZE + CELL_SIZE / 2;
    const cy = y * CELL_SIZE + CELL_SIZE / 2;

    // 1. 生成 6~8 个大型💩碎片，向四面八方高速飞出屏幕
    const count = 6 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
      const speed = 8 + Math.random() * 6; // 高速
      this.flyingPoops.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 3, // 略微上抛
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.3,
        life: 80, maxLife: 80,
        size: 18 + Math.random() * 10,
        type: Math.random() < 0.7 ? 'poop' : 'chunk', // 70%是💩emoji，30%是棕色碎块
      });
    }

    // 2. 生成绿色恶臭冲击波 — 向外扩散
    for (let i = 0; i < 20; i++) {
      const angle = (Math.PI * 2 * i) / 20;
      const speed = 5 + Math.random() * 4;
      this.particles.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1,
        life: 45, maxLife: 45,
        color: ['#84CC16', '#A3E635', '#65A30D', '#4ade80'][Math.floor(Math.random() * 4)],
      });
    }

    // 3. 棕色碎屑 — 中等速度四散
    for (let i = 0; i < 16; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 4 + Math.random() * 5;
      this.particles.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        life: 50, maxLife: 50,
        color: ['#92400E', '#A16207', '#78350F', '#B45309', '#6B4423'][Math.floor(Math.random() * 5)],
      });
    }

    // 4. 飘字 — 加速炸屎山专属
    this.floatText('\u{1F4A9}\u26A1 \u98DE\u51FA\u5C4F\u5E55\uFF01', cx, cy - 10, '#22d3ee');
  },

  particle(x, y, color) {
    for (let i = 0; i < 10; i++) {
      const angle = (Math.PI * 2 * i) / 10 + Math.random() * 0.3;
      const speed = 1.5 + Math.random() * 2;
      this.particles.push({
        x: x, y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 30, maxLife: 30,
        color: color || '#92400e',
      });
    }
  },

  // 爆炸粒子 — 多色火花
  explosion(x, y) {
    const cx = x * CELL_SIZE + CELL_SIZE / 2;
    const cy = y * CELL_SIZE + CELL_SIZE / 2;
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 4;
      this.particles.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 40, maxLife: 40,
        color: ['#F59E0B', '#FBBF24', '#EF4444', '#FDE68A'][Math.floor(Math.random() * 4)],
      });
    }
  },

  // 传送门特效 — 可指定颜色
  portal(x, y, color) {
    const c = color || '#ef4444';
    for (let i = 0; i < 16; i++) {
      const angle = (Math.PI * 2 * i) / 16;
      this.particles.push({
        x: x, y: y,
        vx: Math.cos(angle) * 2,
        vy: Math.sin(angle) * 2,
        life: 30, maxLife: 30,
        color: c,
      });
    }
  },

  victoryFlash() {
    const canvas = document.getElementById('game-canvas');
    if (canvas) {
      canvas.classList.add('victory-flash');
      setTimeout(() => canvas.classList.remove('victory-flash'), 800);
    }
  },

  deathSmoke(x, y) {
    const cx = x * CELL_SIZE + CELL_SIZE / 2;
    const cy = y * CELL_SIZE + CELL_SIZE / 2;
    for (let i = 0; i < 15; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 2;
      this.particles.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        life: 50, maxLife: 50,
        color: ['#6B7280', '#9CA3AF', '#4B5563'][Math.floor(Math.random() * 3)],
      });
    }
  },

  // ====== 道具掉落特效 ======
  pickupDrop(x, y) {
    // 金色光柱 — 从下往上
    for (let i = 0; i < 12; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 20,
        y: y + 20,
        vx: 0,
        vy: -2 - Math.random() * 2,
        life: 35, maxLife: 35,
        color: ['#FBBF24', '#F59E0B', '#FDE68A'][Math.floor(Math.random() * 3)],
      });
    }
  },

  // 道具拾取特效 — 金色粒子环
  pickupCollect(x, y, color) {
    for (let i = 0; i < 20; i++) {
      const angle = (Math.PI * 2 * i) / 20;
      const speed = 2 + Math.random() * 2;
      this.particles.push({
        x: x, y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1,
        life: 35, maxLife: 35,
        color: color || '#FBBF24',
      });
    }
    // 中心金色闪光
    for (let i = 0; i < 8; i++) {
      this.particles.push({
        x: x, y: y,
        vx: 0,
        vy: -1 - Math.random(),
        life: 25, maxLife: 25,
        color: '#FDE68A',
      });
    }
  },

  // ====== 特殊 Bug 击杀特效 ======
  bugKillSpecial(x, y, bugType) {
    const cx = x * CELL_SIZE + CELL_SIZE / 2;
    const cy = y * CELL_SIZE + CELL_SIZE / 2;

    const colorMap = {
      ghost: ['#a78bfa', '#c4b5fd', '#7c3aed', '#ddd6fe'],
      crash: ['#3b82f6', '#60a5fa', '#2563eb', '#93c5fd'],
      p0: ['#ef4444', '#f87171', '#dc2626', '#fca5a5'],
    };
    const colors = colorMap[bugType] || ['#F59E0B', '#FBBF24'];

    // 金光爆炸 — 大量粒子
    for (let i = 0; i < 40; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 5;
      this.particles.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 50, maxLife: 50,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }

    // 金色光环扩散
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        for (let j = 0; j < 16; j++) {
          const angle = (Math.PI * 2 * j) / 16;
          this.particles.push({
            x: cx, y: cy,
            vx: Math.cos(angle) * (3 + i),
            vy: Math.sin(angle) * (3 + i),
            life: 30, maxLife: 30,
            color: '#FBBF24',
          });
        }
      }, i * 100);
    }
  },

  // 鸡腿雨 — 从天而降
  drumstickRain(gridX, gridY) {
    const cx = gridX * CELL_SIZE + CELL_SIZE / 2;
    const cy = gridY * CELL_SIZE + CELL_SIZE / 2;

    // 生成 8 个鸡腿粒子
    for (let i = 0; i < 8; i++) {
      this.drumsticks.push({
        x: cx + (Math.random() - 0.5) * 120,
        y: -20 - Math.random() * 60,
        vx: (Math.random() - 0.5) * 1.5,
        vy: 3 + Math.random() * 2,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.2,
        life: 90, maxLife: 90,
        size: 16 + Math.random() * 6,
      });
    }
  },

  // ====== Boss Bug 出场动画 — 屏幕红光 + 震动 + 邪恶粒子 ======
  bossSpawn() {
    // 大震动
    this.bigShake();

    // 红色屏幕闪烁
    const container = document.querySelector('.canvas-container');
    if (container) {
      const flash = document.createElement('div');
      flash.style.cssText = 'position:absolute;inset:0;background:rgba(220,38,38,0.4);pointer-events:none;z-index:100;animation:boss-flash 1.5s ease-out forwards;';
      container.appendChild(flash);
      setTimeout(() => flash.remove(), 1500);
    }

    // 全屏粒子风暴 — 红色 + 黑色
    for (let i = 0; i < 40; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 6;
      this.particles.push({
        x: 273 + (Math.random() - 0.5) * 100,
        y: 273 + (Math.random() - 0.5) * 100,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 60, maxLife: 60,
        color: ['#DC2626', '#991B1B', '#1a0000', '#ef4444', '#7F1D1D'][Math.floor(Math.random() * 5)],
      });
    }

    // Boss 警告横幅
    const warnOverlay = document.createElement('div');
    warnOverlay.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);z-index:101;pointer-events:none;text-align:center;animation:boss-warn 1.5s ease-out forwards;';
    warnOverlay.innerHTML = `
      <div style="font-size:48px;font-weight:900;color:#DC2626;text-shadow:0 0 20px rgba(220,38,38,0.8),0 0 40px rgba(220,38,38,0.5);letter-spacing:4px;">BOSS</div>
      <div style="font-size:18px;color:#fbbf24;margin-top:8px;text-shadow:0 0 10px rgba(251,191,36,0.6);">Bug 降临中...</div>
    `;
    container.appendChild(warnOverlay);
    setTimeout(() => warnOverlay.remove(), 1500);
  },

  // ====== "一大波Bug正在奔来" — PvZ 风格预警横幅 ======
  bugWaveBanner(text) {
    const container = document.querySelector('.canvas-container');
    if (!container) return;

    const overlay = document.createElement('div');
    overlay.className = 'bug-wave-overlay';

    const banner = document.createElement('div');
    banner.className = 'bug-wave-banner';
    banner.textContent = text;
    overlay.appendChild(banner);

    container.appendChild(overlay);
    setTimeout(() => overlay.remove(), 3000);
  },

  // 触发"一大波Bug"事件 — 生成多个Bug + 预警横幅 + 音效 + 屏幕震动
  bugWave() {
    const waveTexts = [
      '\u{1F4A3} \u4E00\u5927\u6CE2Bug\u6B63\u5728\u5954\u6765\uFF01',
      '\u{1F4A3} Bug\u6D6A\u6F6E\u6765\u4E86\uFF01\u6D4B\u8BD5\u540C\u5B66\u6296\u4E00\u4E0B\uFF01',
      '\u{1F4A3} \u7814\u53D1\u4E00\u6B21\u6027\u63D0\u4EA4\u4E86\u5927\u6279Bug\uFF01',
      '\u{1F4A3} \u8B66\u62A5\uFF01Bug\u6F6E\u5DF2\u62B5\u8FBE\u6218\u573A\uFF01',
    ];
    const text = waveTexts[Math.floor(Math.random() * waveTexts.length)];
    this.bugWaveBanner(text);
    this.bigShake();
    Sound.play('bugWave');

    // 延迟生成一波 Bug（4~6个），横幅显示后0.8秒开始
    const waveCount = 4 + Math.floor(Math.random() * 3);
    const bugTypes = ['normal', 'normal', 'normal', 'ghost', 'crash'];

    setTimeout(() => {
      for (let i = 0; i < waveCount; i++) {
        setTimeout(() => {
          if (Game.state !== 'playing') return;
          if (Enemy.count() >= 15) return;
          const type = bugTypes[Math.floor(Math.random() * bugTypes.length)];
          Enemy.spawn(type);
          // 每个Bug出生时来个传送门特效
          const pos = GameMap.getRandomEmptyCell();
          if (pos) {
            Effects.portal(pos.x * CELL_SIZE + CELL_SIZE / 2, pos.y * CELL_SIZE + CELL_SIZE / 2, '#ef4444');
          }
        }, i * 250);
      }
      // 弹幕
      Danmaku.show('dev');
      Danmaku.show('dev');
      Roast.trigger('specialBug');
    }, 800);
  },

  // ====== 粒子更新 ======
  update() {
    // 性能兜底 — 如果粒子超过上限，移除最老的
    if (this.particles.length > this.MAX_PARTICLES) {
      this.particles.splice(0, this.particles.length - this.MAX_PARTICLES);
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.1; // 重力
      p.life--;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // 鸡腿雨更新
    for (let i = this.drumsticks.length - 1; i >= 0; i--) {
      const d = this.drumsticks[i];
      d.x += d.vx;
      d.y += d.vy;
      d.vy += 0.05;
      d.rotation += d.rotSpeed;
      d.life--;
      if (d.life <= 0 || d.y > 600) {
        this.drumsticks.splice(i, 1);
      }
    }

    // 屎山飞射碎片更新 — 高速飞出屏幕
    for (let i = this.flyingPoops.length - 1; i >= 0; i--) {
      const fp = this.flyingPoops[i];
      fp.x += fp.vx;
      fp.y += fp.vy;
      fp.vy += 0.08; // 轻微重力
      fp.rotation += fp.rotSpeed;
      fp.life--;
      // 飞出屏幕或寿命到了就移除
      if (fp.life <= 0 || fp.x < -60 || fp.x > 740 || fp.y < -60 || fp.y > 660) {
        this.flyingPoops.splice(i, 1);
      }
    }
  },

  // 鸡腿雨绘制（由 Renderer 调用）
  drawDrumsticks(ctx) {
    const S = Renderer.SCALE || 2;
    for (const d of this.drumsticks) {
      ctx.save();
      ctx.translate(d.x * S, d.y * S);
      ctx.rotate(d.rotation);
      ctx.globalAlpha = Math.min(1, d.life / 20);
      ctx.font = `${d.size * S}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('\u{1F357}', 0, 0);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  },

  // 屎山飞射碎片绘制（由 Renderer 调用）
  drawFlyingPoops(ctx) {
    const S = Renderer.SCALE || 2;
    for (const fp of this.flyingPoops) {
      ctx.save();
      ctx.translate(fp.x * S, fp.y * S);
      ctx.rotate(fp.rotation);
      const alpha = Math.min(1, fp.life / 20);
      ctx.globalAlpha = alpha;

      if (fp.type === 'poop') {
        ctx.font = `${fp.size * S}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('\u{1F4A9}', 0, 0);
      } else {
        ctx.fillStyle = ['#92400E', '#A16207', '#78350F', '#6B4423'][Math.floor(fp.size) % 4];
        const s = fp.size * 0.6 * S;
        ctx.fillRect(-s / 2, -s / 2, s, s);
        ctx.fillStyle = 'rgba(132, 204, 22, 0.3)';
        ctx.fillRect(-s / 2 - 2 * S, -s / 2 - 2 * S, s + 4 * S, s + 4 * S);
      }
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  },
};
