// ========== 开场动画系统 ==========
// 像素测试员敲门 → 门里问话 → 喊开工 → 门开 → 走进去 → 工位坐下 → 转场

const Intro = {
  canvas: null,
  ctx: null,
  animId: null,
  phase: 0,        // 0=走过来 1=敲门 2=门里问话 3=喊开工 4=门开 5=走进去 6=工位坐下 7=转场
  phaseTimer: 0,   // 当前阶段计时
  globalFrame: 0,
  skipable: true,
  finished: false,

  // 小人位置
  playerX: 0,
  playerY: 0,
  // 小人缩放比例
  scale: 1.6,
  // 门开度 0~1
  doorOpen: 0,
  // 小人透明度（走进门时渐隐）
  playerAlpha: 1,
  // 工位屏幕亮度
  screenBrightness: 0,
  // 文字气泡
  bubbleText: '',
  bubbleAlpha: 0,
  bubbleTarget: 0,
  // 转场黑屏
  fadeAlpha: 0,

  // 各阶段时长（帧，60fps）— 放慢节奏
  phaseDurations: [90, 70, 80, 90, 45, 60, 100, 45], // 共约 9.7 秒

  start() {
    this.canvas = document.getElementById('intro-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;

    this.phase = 0;
    this.phaseTimer = 0;
    this.globalFrame = 0;
    this.finished = false;
    this.playerX = -50;
    this.playerY = 260;
    this.doorOpen = 0;
    this.playerAlpha = 1;
    this.screenBrightness = 0;
    this.bubbleText = '';
    this.bubbleAlpha = 0;
    this.bubbleTarget = 0;
    this.fadeAlpha = 0;

    // 点击跳过（只在动画启动后生效）
    this.canvas.addEventListener('click', (e) => {
      if (this.globalFrame > 0) this.skip();
    });

    this.loop();
  },

  skip() {
    if (this.finished) return;
    this.finished = true;
    cancelAnimationFrame(this.animId);
    this.end();
  },

  end() {
    const introScreen = document.getElementById('intro-screen');
    if (introScreen) {
      introScreen.style.display = 'none';
    }
    // 显示输入界面
    const inputScreen = document.getElementById('input-screen');
    if (inputScreen) {
      inputScreen.classList.add('active');
    }
  },

  nextPhase() {
    this.phase++;
    this.phaseTimer = 0;

    if (this.phase === 1) {
      // 敲门
      this.bubbleText = '';
      this.bubbleTarget = 0;
    } else if (this.phase === 2) {
      // 门里问话
      this.bubbleText = '谁啊？';
      this.bubbleTarget = 1;
      this.playDoorVoice();
    } else if (this.phase === 3) {
      // 喊开工 — 配语音
      this.bubbleText = '测试部！开工了！';
      this.bubbleTarget = 1;
      this.playShout();
      this.playVoice(); // 浏览器TTS喊话
    } else if (this.phase === 4) {
      // 门开
      this.bubbleText = '';
      this.bubbleTarget = 0;
      this.playDoorOpen();
    } else if (this.phase === 5) {
      // 走进去
      this.playStep();
    } else if (this.phase === 6) {
      // 工位坐下
      this.playScreenOn();
    } else if (this.phase === 7) {
      // 转场
    } else if (this.phase >= this.phaseDurations.length) {
      this.finished = true;
      this.end();
      return;
    }
  },

  loop() {
    if (this.finished) return;

    this.globalFrame++;
    this.phaseTimer++;

    // 气泡渐变
    this.bubbleAlpha += (this.bubbleTarget - this.bubbleAlpha) * 0.12;

    // 阶段逻辑
    const dur = this.phaseDurations[this.phase] || 30;
    if (this.phase === 0) {
      // 小人从左边走过来 — 放慢速度
      this.playerX += 2.8;
      // 走路弹跳
      const bounce = Math.abs(Math.sin(this.globalFrame * 0.25)) * 3;
      this.playerY = 260 - bounce;
      // 走路脚步声
      if (this.globalFrame % 14 === 0) this.playStep();
      if (this.playerX >= 180 || this.phaseTimer >= dur) {
        this.playerX = 180;
        this.playerY = 260;
        this.nextPhase();
      }
    } else if (this.phase === 1) {
      // 敲门 — 周期性前倾
      if (this.phaseTimer >= dur) this.nextPhase();
    } else if (this.phase === 2) {
      if (this.phaseTimer >= dur) this.nextPhase();
    } else if (this.phase === 3) {
      if (this.phaseTimer >= dur) this.nextPhase();
    } else if (this.phase === 4) {
      // 门打开
      this.doorOpen = this.phaseTimer / dur;
      if (this.phaseTimer >= dur) this.nextPhase();
    } else if (this.phase === 5) {
      // 小人走进门 — 放慢
      this.playerX += 2.0;
      this.doorOpen = 1;
      this.playerAlpha = 1 - this.phaseTimer / dur;
      if (this.phaseTimer >= dur) this.nextPhase();
    } else if (this.phase === 6) {
      // 工位坐下 — 屏幕亮起，放慢让用户看清
      this.screenBrightness = Math.min(1, this.phaseTimer / (dur * 0.6));
      if (this.phaseTimer >= dur) this.nextPhase();
    } else if (this.phase === 7) {
      // 转场黑屏渐变
      this.fadeAlpha = this.phaseTimer / dur;
      if (this.phaseTimer >= dur) {
        this.finished = true;
        this.end();
        return;
      }
    }

    this.render();
    this.animId = requestAnimationFrame(() => this.loop());
  },

  render() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // 清空
    ctx.fillStyle = '#0f0f1a';
    ctx.fillRect(0, 0, w, h);

    if (this.phase <= 5) {
      this.drawDoorScene(ctx, w, h);
    } else {
      this.drawDeskScene(ctx, w, h);
    }

    // 转场黑屏
    if (this.fadeAlpha > 0) {
      ctx.fillStyle = `rgba(0, 0, 0, ${this.fadeAlpha})`;
      ctx.fillRect(0, 0, w, h);
    }

    // 跳过提示
    if (!this.finished) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.font = '12px "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('点击跳过 >>', w - 16, h - 16);
    }
  },

  // ========== 场景1：办公室门 ==========
  drawDoorScene(ctx, w, h) {
    // 地板
    ctx.fillStyle = '#2a2a3e';
    ctx.fillRect(0, 340, w, h - 340);
    // 地板纹理线
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    for (let y = 360; y < h; y += 20) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // 墙壁
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, w, 340);
    // 墙壁装饰 — 几个像素画框
    this.drawPixelRect(ctx, 40, 60, 40, 30, '#334155');
    this.drawPixelRect(ctx, 44, 64, 32, 22, '#1e293b');
    ctx.fillStyle = '#475569';
    ctx.fillRect(54, 70, 12, 10); // 画框内容
    ctx.fillStyle = '#64748b';
    ctx.fillRect(56, 74, 8, 4);

    this.drawPixelRect(ctx, 380, 50, 50, 35, '#334155');
    this.drawPixelRect(ctx, 384, 54, 42, 27, '#1e293b');
    // 第二个画框 — "加班守则"
    ctx.fillStyle = '#fbbf24';
    ctx.font = '8px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('加班', 405, 72);
    ctx.fillText('守则', 405, 80);

    // 顶灯
    ctx.fillStyle = '#475569';
    ctx.fillRect(270, 20, 60, 8);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(272, 24, 56, 4);
    // 灯光
    if (this.phase < 6) {
      const lightGrad = ctx.createRadialGradient(300, 30, 5, 300, 200, 180);
      lightGrad.addColorStop(0, 'rgba(251, 191, 36, 0.08)');
      lightGrad.addColorStop(1, 'rgba(251, 191, 36, 0)');
      ctx.fillStyle = lightGrad;
      ctx.fillRect(150, 20, 300, 300);
    }

    // ========== 门 ==========
    const doorX = 210;
    const doorY = 120;
    const doorW = 100;
    const doorH = 220;

    // 门框
    this.drawPixelRect(ctx, doorX - 6, doorY - 6, doorW + 12, doorH + 12, '#4a3220');
    // 门框高光
    ctx.fillStyle = '#6a4830';
    ctx.fillRect(doorX - 6, doorY - 6, doorW + 12, 3);
    ctx.fillRect(doorX - 6, doorY - 6, 3, doorH + 12);

    // 门主体
    ctx.fillStyle = '#5a3a1a';
    ctx.fillRect(doorX, doorY, doorW, doorH);

    // 门纹理 — 竖纹
    ctx.fillStyle = '#4a2a0a';
    for (let i = 1; i < 5; i++) {
      ctx.fillRect(doorX + i * 20, doorY, 2, doorH);
    }
    // 门高光
    ctx.fillStyle = '#7a5a3a';
    ctx.fillRect(doorX, doorY, 3, doorH);

    // 门把手
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(doorX + doorW - 18, doorY + doorH / 2, 8, 8);
    ctx.fillStyle = '#d97706';
    ctx.fillRect(doorX + doorW - 18, doorY + doorH / 2, 8, 3);

    // 门牌 — "测试部"
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(doorX + 15, doorY - 34, 70, 24);
    ctx.fillStyle = '#10B981';
    ctx.font = 'bold 14px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('测试部', doorX + 50, doorY - 17);

    // 门开动画 — 门向右旋转打开
    if (this.doorOpen > 0) {
      // 门缝黑色
      ctx.fillStyle = '#000';
      const gapW = this.doorOpen * 50;
      ctx.fillRect(doorX + doorW - gapW, doorY, gapW, doorH);
      // 门逐渐变窄（透视效果）
      const visW = doorW * (1 - this.doorOpen * 0.85);
      ctx.fillStyle = '#5a3a1a';
      ctx.fillRect(doorX + doorW - gapW - visW, doorY, visW, doorH);
      // 门把手跟着移动
      if (visW > 20) {
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(doorX + doorW - gapW - 18, doorY + doorH / 2, 8, 8);
      }
    }

    // ========== 像素小人 ==========
    if (this.playerAlpha > 0) {
      ctx.globalAlpha = this.playerAlpha;
      this.drawPixelTester(ctx, this.playerX, this.playerY, this.phase);
      ctx.globalAlpha = 1;
    }

    // ========== 敲门特效 ==========
    if (this.phase === 1) {
      // 敲门周期 — 每 18 帧敲一次（放慢）
      const knockCycle = this.phaseTimer % 30;
      if (knockCycle < 8) {
        // 敲击波纹
        const knockAlpha = 1 - knockCycle / 8;
        ctx.strokeStyle = `rgba(251, 191, 36, ${knockAlpha * 0.6})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(doorX + doorW + 12, doorY + 100, 8 + knockCycle * 4, 0, Math.PI * 2);
        ctx.stroke();
        // "咚" 字
        ctx.fillStyle = `rgba(251, 191, 36, ${knockAlpha})`;
        ctx.font = 'bold 16px "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('咚!', doorX + doorW + 30, doorY + 95);
      }
      // 敲门音效 — 敲两轮
      if (this.phaseTimer === 1 || this.phaseTimer === 16 || this.phaseTimer === 35 || this.phaseTimer === 50) {
        this.playKnock();
      }
    }

    // ========== 文字气泡 ==========
    if (this.bubbleAlpha > 0.01) {
      // 气泡来自门里（phase 2）或小人头上（phase 3）
      if (this.phase === 2) {
        // 门里说话 — 气泡在门上方
        this.drawSpeechBubble(ctx, doorX + doorW / 2, doorY - 45, this.bubbleText, this.bubbleAlpha);
      } else if (this.phase === 3) {
        // 小人说话 — 气泡在小人头上（放大后位置调高）
        this.drawSpeechBubble(ctx, this.playerX + 12 * this.scale, this.playerY - 10 * this.scale, this.bubbleText, this.bubbleAlpha);
      }
    }
  },

  // ========== 像素测试员 ==========
  drawPixelTester(ctx, x, y, phase) {
    const s = this.scale; // 缩放比例

    // 颜色定义
    const skin = '#FBBF24';
    const skinDark = '#D97706';
    const shirt = '#3B82F6';
    const shirtDark = '#1D4ED8';
    const pants = '#1E293B';
    const hair = '#1E1E1E';
    const glass = '#FFFFFF';
    const glassFrame = '#334155';

    // 走路弹跳偏移
    let bounce = 0;
    let armRaise = 0;
    let leanForward = 0;

    if (phase === 0) {
      // 走路
      bounce = Math.abs(Math.sin(this.globalFrame * 0.25)) * 2 * s;
    } else if (phase === 1) {
      // 敲门 — 手举起
      const knockCycle = this.phaseTimer % 30;
      armRaise = knockCycle < 8 ? 1 : 0;
      leanForward = knockCycle < 8 ? 2 * s : 0;
    } else if (phase === 3) {
      // 喊话 — 微微晃动
      bounce = Math.sin(this.globalFrame * 0.2) * 1 * s;
    } else if (phase === 5) {
      // 走进门
      bounce = Math.abs(Math.sin(this.globalFrame * 0.25)) * 2 * s;
    }

    const px = x + leanForward;
    const py = y - bounce;

    // 辅助函数：缩放矩形
    const r = (rx, ry, rw, rh, color) => {
      ctx.fillStyle = color;
      ctx.fillRect(Math.round(px + rx * s), Math.round(py + ry * s), Math.ceil(rw * s), Math.ceil(rh * s));
    };

    // 阴影
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(px + 12 * s, py + 52 * s, 12 * s, 3 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    // === 腿 ===
    if (phase === 0 || phase === 5) {
      // 走路腿
      const legSwing = Math.sin(this.globalFrame * 0.25) * 3 * s;
      r(6, 36, 5, 14 + legSwing / s, pants);
      r(13, 36, 5, 14 - legSwing / s, pants);
    } else {
      r(6, 36, 5, 14, pants);
      r(13, 36, 5, 14, pants);
    }
    // 鞋
    r(5, 48, 7, 3, '#000');
    r(13, 48, 7, 3, '#000');

    // === 身体（格子衫）===
    r(4, 18, 16, 20, shirt);
    // 格子衫纹理
    r(4, 22, 16, 2, shirtDark);
    r(4, 28, 16, 2, shirtDark);
    r(4, 34, 16, 2, shirtDark);
    r(8, 18, 2, 20, shirtDark);
    r(14, 18, 2, 20, shirtDark);
    // 格子衫格子
    r(9, 23, 3, 3, '#60A5FA');
    r(15, 23, 3, 3, '#60A5FA');
    r(5, 29, 3, 3, '#60A5FA');
    r(11, 29, 3, 3, '#60A5FA');
    r(15, 35, 3, 3, '#60A5FA');

    // === 手臂 ===
    if (phase === 1 && armRaise) {
      // 敲门 — 右手举起
      r(18, 16, 5, 8, shirt);
      r(18, 12, 5, 5, skin);
      // 左臂放下
      r(0, 20, 4, 12, shirt);
      r(0, 30, 4, 4, skin);
    } else {
      // 双臂自然下垂
      r(0, 20, 4, 12, shirt);
      r(20, 20, 4, 12, shirt);
      r(0, 30, 4, 4, skin);
      r(20, 30, 4, 4, skin);
    }

    // === 脖子 ===
    r(9, 14, 6, 5, skinDark);

    // === 头 ===
    r(6, 2, 12, 13, skin);

    // === 头发 ===
    r(5, 0, 14, 5, hair);
    r(5, 2, 3, 3, hair);
    r(16, 2, 3, 3, hair);
    // 头发高光
    r(8, 1, 4, 1, '#3a3a3a');

    // === 眼镜 ===
    r(7, 6, 4, 3, glassFrame);
    r(13, 6, 4, 3, glassFrame);
    r(11, 7, 2, 1, glassFrame); // 鼻梁
    r(8, 7, 2, 1, glass);
    r(14, 7, 2, 1, glass);

    // === 嘴 ===
    if (phase === 3) {
      // 喊话 — 张嘴
      r(10, 11, 4, 3, '#7F1D1D');
    } else {
      // 正常嘴
      r(10, 12, 4, 1, '#92400E');
    }

    // === 胸牌 ===
    r(10, 22, 6, 5, '#fff');
    ctx.fillStyle = '#10B981';
    ctx.font = `${Math.round(5 * s)}px "Courier New", monospace`;
    ctx.textAlign = 'center';
    ctx.fillText('QA', px + 13 * s, py + 26 * s);
  },

  // ========== 场景2：工位坐下 ==========
  drawDeskScene(ctx, w, h) {
    // 墙壁
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, w, h);

    // 地板
    ctx.fillStyle = '#2a2a3e';
    ctx.fillRect(0, 380, w, h - 380);
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    for (let y = 400; y < h; y += 20) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // 顶灯
    ctx.fillStyle = '#475569';
    ctx.fillRect(270, 20, 60, 8);
    // 灯光随屏幕亮度变化
    const lightGrad = ctx.createRadialGradient(300, 30, 5, 300, 250, 250);
    lightGrad.addColorStop(0, `rgba(251, 191, 36, ${0.08 * this.screenBrightness})`);
    lightGrad.addColorStop(1, 'rgba(251, 191, 36, 0)');
    ctx.fillStyle = lightGrad;
    ctx.fillRect(100, 20, 400, 400);

    // ========== 工位桌 ==========
    const deskY = 340;
    ctx.fillStyle = '#4a3220';
    ctx.fillRect(120, deskY, 360, 12);
    // 桌面高光
    ctx.fillStyle = '#6a4830';
    ctx.fillRect(120, deskY, 360, 3);
    // 桌腿
    ctx.fillStyle = '#3a2210';
    ctx.fillRect(130, deskY + 12, 8, 60);
    ctx.fillRect(462, deskY + 12, 8, 60);

    // ========== 显示器 ==========
    const monX = 200, monY = 180, monW = 200, monH = 140;
    // 显示器底座
    ctx.fillStyle = '#334155';
    ctx.fillRect(monX + 80, deskY - 8, 40, 8);
    ctx.fillRect(monX + 70, deskY - 4, 60, 4);
    // 显示器边框
    this.drawPixelRect(ctx, monX - 8, monY - 8, monW + 16, monH + 16, '#1e293b');
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(monX, monY, monW, monH);

    // 屏幕内容 — 随亮度渐显
    if (this.screenBrightness > 0) {
      ctx.globalAlpha = this.screenBrightness;

      // 屏幕底色
      ctx.fillStyle = '#0f0f1a';
      ctx.fillRect(monX, monY, monW, monH);

      // 终端文字 — 逐行显示
      ctx.font = '10px "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillStyle = '#10B981';
      ctx.fillText('> BugBomber v1.0', monX + 10, monY + 20);

      if (this.screenBrightness > 0.3) {
        const alpha2 = Math.min(1, (this.screenBrightness - 0.3) / 0.3);
        ctx.globalAlpha = alpha2 * this.screenBrightness;
        ctx.fillStyle = '#94a3b8';
        ctx.fillText('> 加载测试部...', monX + 10, monY + 36);
        ctx.globalAlpha = this.screenBrightness;
      }

      // 闪烁光标
      if (this.globalFrame % 30 < 15) {
        ctx.fillStyle = '#10B981';
        ctx.fillRect(monX + 10, monY + 44, 8, 2);
      }

      // 标题（渐显）
      if (this.screenBrightness > 0.5) {
        const titleAlpha = (this.screenBrightness - 0.5) * 2;
        ctx.globalAlpha = titleAlpha;
        ctx.font = 'bold 20px "Microsoft YaHei", sans-serif';
        ctx.fillStyle = '#10B981';
        ctx.textAlign = 'center';
        ctx.fillText('BugBomber', monX + monW / 2, monY + 80);
        ctx.font = '10px "Microsoft YaHei", sans-serif';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText('AI编译你的测试世界', monX + monW / 2, monY + 100);
        ctx.globalAlpha = this.screenBrightness;
      }

      ctx.globalAlpha = 1;
    } else {
      // 屏幕全黑
      ctx.fillStyle = '#000';
      ctx.fillRect(monX, monY, monW, monH);
    }

    // ========== 键盘 ==========
    ctx.fillStyle = '#334155';
    ctx.fillRect(monX + 30, deskY + 2, 140, 8);
    // 键盘按键
    ctx.fillStyle = '#475569';
    for (let i = 0; i < 14; i++) {
      ctx.fillRect(monX + 34 + i * 9, deskY + 3, 7, 5);
    }

    // ========== 咖啡杯 ==========
    const cupX = monX + monW + 10;
    ctx.fillStyle = '#7c3aed';
    ctx.fillRect(cupX, deskY - 20, 20, 24);
    ctx.fillStyle = '#6d28d9';
    ctx.fillRect(cupX, deskY - 20, 20, 3);
    // 杯把
    ctx.strokeStyle = '#7c3aed';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cupX + 22, deskY - 10, 5, -Math.PI / 2, Math.PI / 2);
    ctx.stroke();
    // 咖啡
    ctx.fillStyle = '#451a03';
    ctx.fillRect(cupX + 2, deskY - 18, 16, 3);
    // 热气
    if (this.globalFrame % 60 < 40) {
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 1.5;
      const steamY = deskY - 25 - (this.globalFrame % 40);
      ctx.beginPath();
      ctx.moveTo(cupX + 6, steamY);
      ctx.quadraticCurveTo(cupX + 10, steamY - 5, cupX + 6, steamY - 10);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cupX + 14, steamY + 3);
      ctx.quadraticCurveTo(cupX + 18, steamY - 2, cupX + 14, steamY - 7);
      ctx.stroke();
    }

    // ========== 像素测试员（背面坐姿）==========
    // 小人渐入：屏幕亮起的同时小人出现
    let personAlpha = 1;
    if (this.screenBrightness < 0.3) {
      personAlpha = this.screenBrightness / 0.3;
    }
    ctx.globalAlpha = personAlpha;

    // 椅子
    ctx.fillStyle = '#334155';
    ctx.fillRect(250, deskY - 5, 50, 5);
    ctx.fillRect(250, deskY, 6, 60);
    ctx.fillRect(294, deskY, 6, 60);
    // 椅背
    ctx.fillStyle = '#475569';
    ctx.fillRect(244, deskY - 50, 62, 50);
    ctx.fillRect(244, deskY - 50, 5, 55);
    ctx.fillRect(301, deskY - 50, 5, 55);

    // 人 — 从背面看
    // 头
    ctx.fillStyle = '#FBBF24';
    ctx.fillRect(264, deskY - 68, 26, 22);
    // 头发（背面看到的是后脑勺）
    ctx.fillStyle = '#1E1E1E';
    ctx.fillRect(261, deskY - 72, 32, 12);
    ctx.fillRect(261, deskY - 68, 5, 10);
    ctx.fillRect(288, deskY - 68, 5, 10);
    // 脖子
    ctx.fillStyle = '#D97706';
    ctx.fillRect(272, deskY - 48, 12, 6);
    // 身体（格子衫背面）
    ctx.fillStyle = '#3B82F6';
    ctx.fillRect(250, deskY - 42, 50, 42);
    ctx.fillStyle = '#1D4ED8';
    ctx.fillRect(250, deskY - 36, 50, 2);
    ctx.fillRect(250, deskY - 26, 50, 2);
    ctx.fillRect(250, deskY - 16, 50, 2);
    ctx.fillRect(268, deskY - 42, 2, 42);
    ctx.fillRect(280, deskY - 42, 2, 42);

    // 手放在键盘上
    ctx.fillStyle = '#FBBF24';
    ctx.fillRect(240, deskY + 2, 12, 7);
    ctx.fillRect(278, deskY + 2, 12, 7);

    ctx.globalAlpha = 1;

    // ========== 工位场景文字提示 ==========
    if (this.screenBrightness > 0.6) {
      const tipAlpha = (this.screenBrightness - 0.6) / 0.4;
      ctx.globalAlpha = tipAlpha * 0.7;
      ctx.fillStyle = '#94a3b8';
      ctx.font = '11px "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('测试员已就位，准备编译世界...', w / 2, h - 30);
      ctx.globalAlpha = 1;
    }
  },

  // ========== 工具函数 ==========
  drawPixelRect(ctx, x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
    // 暗边
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(x, y + h - 2, w, 2);
    ctx.fillRect(x + w - 2, y, 2, h);
  },

  drawSpeechBubble(ctx, x, y, text, alpha) {
    ctx.globalAlpha = alpha;

    // 测量文字
    ctx.font = 'bold 14px "Microsoft YaHei", sans-serif';
    const metrics = ctx.measureText(text);
    const tw = metrics.width + 20;
    const th = 28;
    const bx = x - tw / 2;
    const by = y - th;

    // 气泡背景
    ctx.fillStyle = '#fff';
    // 圆角矩形
    ctx.beginPath();
    ctx.moveTo(bx + 4, by);
    ctx.lineTo(bx + tw - 4, by);
    ctx.quadraticCurveTo(bx + tw, by, bx + tw, by + 4);
    ctx.lineTo(bx + tw, by + th - 4);
    ctx.quadraticCurveTo(bx + tw, by + th, bx + tw - 4, by + th);
    ctx.lineTo(bx + 4, by + th);
    ctx.quadraticCurveTo(bx, by + th, bx, by + th - 4);
    ctx.lineTo(bx, by + 4);
    ctx.quadraticCurveTo(bx, by, bx + 4, by);
    ctx.fill();

    // 气泡尾巴
    ctx.beginPath();
    ctx.moveTo(x - 6, by + th);
    ctx.lineTo(x, by + th + 8);
    ctx.lineTo(x + 6, by + th);
    ctx.fill();

    // 文字
    ctx.fillStyle = '#1a1a2e';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, by + th / 2);

    ctx.globalAlpha = 1;
  },

  // ========== 音效 ==========
  ensureAudio() {
    if (!Sound.ctx) {
      Sound.init();
    }
    if (Sound.ctx && Sound.ctx.state === 'suspended') {
      Sound.ctx.resume();
    }
  },

  // 敲门音效 — 低频闷响
  playKnock() {
    this.ensureAudio();
    if (!Sound.ctx) return;
    const t = Sound.ctx.currentTime;
    const osc = Sound.ctx.createOscillator();
    const gain = Sound.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, t);
    osc.frequency.exponentialRampToValueAtTime(60, t + 0.1);
    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    osc.connect(gain);
    gain.connect(Sound.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.15);
  },

  // 走路脚步声 — 短促低频
  playStep() {
    this.ensureAudio();
    if (!Sound.ctx) return;
    const t = Sound.ctx.currentTime;
    const osc = Sound.ctx.createOscillator();
    const gain = Sound.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(80, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.05);
    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    osc.connect(gain);
    gain.connect(Sound.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.06);
  },

  // 门里说话声 — 中频模糊音
  playDoorVoice() {
    this.ensureAudio();
    if (!Sound.ctx) return;
    const t = Sound.ctx.currentTime;
    // 模拟闷在门后的声音 — 低通效果
    for (let i = 0; i < 3; i++) {
      const osc = Sound.ctx.createOscillator();
      const gain = Sound.ctx.createGain();
      const freq = 200 + i * 50;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + i * 0.08);
      gain.gain.setValueAtTime(0.0, t + i * 0.08);
      gain.gain.linearRampToValueAtTime(0.1, t + i * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.08 + 0.15);
      osc.connect(gain);
      gain.connect(Sound.ctx.destination);
      osc.start(t + i * 0.08);
      osc.stop(t + i * 0.08 + 0.15);
    }
  },

  // 喊话声 — 高频响亮
  playShout() {
    this.ensureAudio();
    if (!Sound.ctx) return;
    const t = Sound.ctx.currentTime;
    // 模拟人喊叫 — 频率快速变化
    const osc = Sound.ctx.createOscillator();
    const gain = Sound.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, t);
    osc.frequency.linearRampToValueAtTime(500, t + 0.15);
    osc.frequency.linearRampToValueAtTime(350, t + 0.3);
    gain.gain.setValueAtTime(0.0, t);
    gain.gain.linearRampToValueAtTime(0.15, t + 0.03);
    gain.gain.setValueAtTime(0.15, t + 0.25);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    osc.connect(gain);
    gain.connect(Sound.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.4);
  },

  // 开工喊话 — 浏览器TTS
  playVoice() {
    if (!('speechSynthesis' in window)) return;
    // 清除可能存在的残留语音
    speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance('测试部开工了！Fighting！');
    utter.rate = 1.1;   // 语速稍快，有精神
    utter.pitch = 1.2;  // 音调偏高，像喊话
    utter.volume = 0.9;  // 音量90%
    utter.lang = 'zh-CN';  // 中文
    speechSynthesis.speak(utter);
  },

  // 门开声 — 吱呀
  playDoorOpen() {
    this.ensureAudio();
    if (!Sound.ctx) return;
    const t = Sound.ctx.currentTime;
    const osc = Sound.ctx.createOscillator();
    const gain = Sound.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.linearRampToValueAtTime(300, t + 0.3);
    osc.frequency.linearRampToValueAtTime(200, t + 0.5);
    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    osc.connect(gain);
    gain.connect(Sound.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.5);
  },

  // 屏幕开机声 — 通电滴
  playScreenOn() {
    this.ensureAudio();
    if (!Sound.ctx) return;
    const t = Sound.ctx.currentTime;
    // 通电声
    const osc1 = Sound.ctx.createOscillator();
    const gain1 = Sound.ctx.createGain();
    osc1.type = 'square';
    osc1.frequency.setValueAtTime(800, t);
    gain1.gain.setValueAtTime(0.06, t);
    gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    osc1.connect(gain1);
    gain1.connect(Sound.ctx.destination);
    osc1.start(t);
    osc1.stop(t + 0.1);

    // 跟着两声嘀
    setTimeout(() => {
      if (!Sound.ctx) return;
      const t2 = Sound.ctx.currentTime;
      [600, 900].forEach((freq, i) => {
        const osc = Sound.ctx.createOscillator();
        const gain = Sound.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, t2 + i * 0.1);
        gain.gain.setValueAtTime(0.06, t2 + i * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, t2 + i * 0.1 + 0.08);
        osc.connect(gain);
        gain.connect(Sound.ctx.destination);
        osc.start(t2 + i * 0.1);
        osc.stop(t2 + i * 0.1 + 0.08);
      });
    }, 200);
  },
};
