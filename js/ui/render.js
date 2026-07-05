// ========== Canvas 渲染层（精致版） ==========

const Renderer = {
  canvas: null,
  ctx: null,
  animFrame: 0,   // 全局动画帧计数
  SCALE: 2,       // 高分辨率缩放倍数
  // 世界氛围主题 — 根据当前规则动态切换色调
  worldTheme: {
    name: 'default',
    floor1: '#1c1c3a',
    floor2: '#222248',
    floorGrid: 'rgba(80, 80, 130, 0.15)',
    floorAccent: 'rgba(60, 60, 100, 0.2)',
    wallBase: '#52528a',
    wallTop: '#6a6aa0',
    wallShadow: '#2a2a50',
    vignette: null,         // null = 无暗角, 颜色字符串 = 有暗角
  },

  init() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    // 高分辨率模式：canvas 实际像素 2x，CSS 缩放回原始尺寸
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';
    // 根据当前规则设置世界色调
    this.updateWorldTheme();
  },

  // 根据当前世界规则动态切换色调
  updateWorldTheme() {
    const cfg = RuleEngine.config;
    const worldName = RuleEngine.currentRules ? RuleEngine.currentRules.worldName : '';

    if (cfg.oneLife && cfg.darkMap) {
      // 燃烧纪元 — 暗红压抑
      this.worldTheme = {
        name: 'burnout',
        floor1: '#2a1a1a', floor2: '#3a2222',
        floorGrid: 'rgba(120, 40, 40, 0.15)',
        floorAccent: 'rgba(100, 30, 30, 0.2)',
        wallBase: '#5a3a3a', wallTop: '#7a4a4a', wallShadow: '#3a1a1a',
        vignette: 'rgba(80, 0, 0, 0.3)',
      };
    } else if (cfg.chainExplosionBoost) {
      // 重构纪元 — 冷蓝科技感
      this.worldTheme = {
        name: 'refactor',
        floor1: '#1a1a3a', floor2: '#1a2a4a',
        floorGrid: 'rgba(60, 100, 180, 0.15)',
        floorAccent: 'rgba(40, 80, 160, 0.2)',
        wallBase: '#3a4a7a', wallTop: '#4a5a8a', wallShadow: '#1a2a4a',
        vignette: 'rgba(0, 20, 80, 0.25)',
      };
    } else if (cfg.testIsolation) {
      // 隔离纪元 — 绿色隔离区
      this.worldTheme = {
        name: 'isolation',
        floor1: '#1a2a1a', floor2: '#1a3a22',
        floorGrid: 'rgba(40, 120, 60, 0.15)',
        floorAccent: 'rgba(30, 100, 40, 0.2)',
        wallBase: '#3a5a3a', wallTop: '#4a6a4a', wallShadow: '#1a3a1a',
        vignette: 'rgba(0, 60, 20, 0.25)',
      };
    } else if (RuleEngine.currentRules && RuleEngine.currentRules.isHidden) {
      // 隐藏规则 — 紫色异变
      this.worldTheme = {
        name: 'hidden',
        floor1: '#2a1a2a', floor2: '#3a223a',
        floorGrid: 'rgba(120, 40, 120, 0.15)',
        floorAccent: 'rgba(100, 30, 100, 0.2)',
        wallBase: '#5a3a5a', wallTop: '#6a4a6a', wallShadow: '#3a1a3a',
        vignette: 'rgba(60, 0, 60, 0.3)',
      };
    } else if (cfg.shishanRegenInterval > 0 && cfg.productInterval <= 8) {
      // 混沌纪元 — 暖橙混乱
      this.worldTheme = {
        name: 'chaos',
        floor1: '#2a2018', floor2: '#3a2a1e',
        floorGrid: 'rgba(120, 80, 30, 0.15)',
        floorAccent: 'rgba(100, 60, 20, 0.2)',
        wallBase: '#5a4a3a', wallTop: '#6a5a4a', wallShadow: '#3a2a1a',
        vignette: 'rgba(60, 30, 0, 0.25)',
      };
    } else {
      // 默认 — 深蓝紫
      this.worldTheme = {
        name: 'default',
        floor1: '#1c1c3a', floor2: '#222248',
        floorGrid: 'rgba(80, 80, 130, 0.15)',
        floorAccent: 'rgba(60, 60, 100, 0.2)',
        wallBase: '#52528a', wallTop: '#6a6aa0', wallShadow: '#2a2a50',
        vignette: null,
      };
    }
  },

  render() {
    const ctx = this.ctx;
    this.animFrame++;
    const S = this.SCALE;

    // 清屏 — 深色地板
    ctx.fillStyle = '#141428';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // 每帧重置 Canvas 状态，防止上一帧泄漏
    ctx.globalAlpha = 1;
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'miter';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';

    // 绘制地板棋盘
    this.drawFloor();

    // 绘制地图（硬墙 + 屎山）
    this.drawMap();

    // 绘制炸弹
    this.drawBombs();

    // 绘制火焰
    this.drawFire();

    // 绘制道具
    this.drawPickups();

    // 绘制 Bug 怪
    this.drawEnemies();

    // 绘制玩家
    this.drawPlayer();

    // 绘制粒子
    this.drawParticles();

    // 绘制鸡腿雨
    Effects.drawDrumsticks(ctx);

    // 绘制屎山飞射碎片
    Effects.drawFlyingPoops(ctx);

    // 黑暗地图效果 — 放在最后，遮住视野外的粒子/特效
    if (RuleEngine.config.darkMap) {
      this.drawDarkness();
    }

    // 世界氛围暗角 — 不同世界不同色调
    if (this.worldTheme.vignette) {
      const vw = this.canvas.width;
      const vh = this.canvas.height;
      const vgrad = ctx.createRadialGradient(vw / 2, vh / 2, vw * 0.3, vw / 2, vh / 2, vw * 0.7);
      vgrad.addColorStop(0, 'rgba(0,0,0,0)');
      vgrad.addColorStop(1, this.worldTheme.vignette);
      ctx.fillStyle = vgrad;
      ctx.fillRect(0, 0, vw, vh);
    }
  },

  // 地板 — 精致棋盘格 + 网格线 + 微妙渐变（世界主题色）
  drawFloor() {
    const ctx = this.ctx;
    const S = this.SCALE;
    const theme = this.worldTheme;
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const tile = GameMap.get(x, y);
        if (tile === TILE.EMPTY || tile === TILE.SHISHAN) {
          const px = x * CELL_SIZE * S;
          const py = y * CELL_SIZE * S;
          const cs = CELL_SIZE * S;

          // 棋盘渐变底色 — 每格有微妙渐变，使用世界主题色
          const grad = ctx.createLinearGradient(px, py, px + cs, py + cs);
          if ((x + y) % 2 === 0) {
            grad.addColorStop(0, theme.floor1);
            grad.addColorStop(1, theme.floor2);
          } else {
            grad.addColorStop(0, theme.floor2);
            grad.addColorStop(1, theme.floor1);
          }
          ctx.fillStyle = grad;
          ctx.fillRect(px, py, cs, cs);

          // 细网格线 — 半透明
          ctx.strokeStyle = theme.floorGrid;
          ctx.lineWidth = 1;
          ctx.strokeRect(px + 0.5, py + 0.5, cs - 1, cs - 1);

          // 偶尔的地板装饰点 — 暗色小方块
          const seed = (x * 37 + y * 73) % 100;
          if (seed < 15) {
            ctx.fillStyle = theme.floorAccent;
            ctx.fillRect(px + cs * 0.3, py + cs * 0.6, S * 2, S * 2);
          }
        }
      }
    }
  },

  drawMap() {
    const ctx = this.ctx;
    const S = this.SCALE;
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const tile = GameMap.get(x, y);
        const px = x * CELL_SIZE * S;
        const py = y * CELL_SIZE * S;

        if (tile === TILE.WALL) {
          this.drawWall(px, py, x, y);
        } else if (tile === TILE.SHISHAN) {
          this.drawShishan(px, py, x, y);
        }
      }
    }
  },

  // 硬墙 — 精致3D金属/砖石效果（世界主题色）
  drawWall(px, py, gx, gy) {
    const ctx = this.ctx;
    const S = this.SCALE;
    const cs = CELL_SIZE * S;
    const seed = (gx * 37 + gy * 73) % 100;
    const theme = this.worldTheme;

    // 主体渐变 — 使用世界主题色
    const grad = ctx.createLinearGradient(px, py, px, py + cs);
    grad.addColorStop(0, theme.wallTop);
    grad.addColorStop(0.3, theme.wallBase);
    grad.addColorStop(0.7, theme.wallShadow);
    grad.addColorStop(1, theme.wallShadow);
    ctx.fillStyle = grad;
    ctx.fillRect(px, py, cs, cs);

    // 顶面高光 — 亮色斜面
    const topGrad = ctx.createLinearGradient(px, py, px, py + cs * 0.15);
    topGrad.addColorStop(0, 'rgba(160, 160, 210, 0.6)');
    topGrad.addColorStop(1, 'rgba(120, 120, 180, 0)');
    ctx.fillStyle = topGrad;
    ctx.fillRect(px, py, cs, cs * 0.15);

    // 左侧高光
    const leftGrad = ctx.createLinearGradient(px, py, px + cs * 0.1, py);
    leftGrad.addColorStop(0, 'rgba(140, 140, 190, 0.4)');
    leftGrad.addColorStop(1, 'rgba(120, 120, 180, 0)');
    ctx.fillStyle = leftGrad;
    ctx.fillRect(px, py, cs * 0.1, cs);

    // 底面阴影
    const botGrad = ctx.createLinearGradient(px, py + cs * 0.85, px, py + cs);
    botGrad.addColorStop(0, 'rgba(20, 20, 40, 0)');
    botGrad.addColorStop(1, 'rgba(15, 15, 30, 0.7)');
    ctx.fillStyle = botGrad;
    ctx.fillRect(px, py + cs * 0.85, cs, cs * 0.15);

    // 右侧阴影
    const rightGrad = ctx.createLinearGradient(px + cs * 0.9, py, px + cs, py);
    rightGrad.addColorStop(0, 'rgba(20, 20, 40, 0)');
    rightGrad.addColorStop(1, 'rgba(15, 15, 30, 0.5)');
    ctx.fillStyle = rightGrad;
    ctx.fillRect(px + cs * 0.9, py, cs * 0.1, cs);

    // 砖块纹理 — 不规则砖缝（根据 seed 变化）
    ctx.strokeStyle = 'rgba(20, 20, 45, 0.6)';
    ctx.lineWidth = S;
    // 水平砖缝
    ctx.beginPath();
    ctx.moveTo(px + S * 2, py + cs * 0.5);
    ctx.lineTo(px + cs - S * 2, py + cs * 0.5);
    ctx.stroke();
    // 竖直砖缝 — 位置根据 seed 错开
    const splitX = seed < 50 ? cs * 0.35 : cs * 0.6;
    ctx.beginPath();
    ctx.moveTo(px + splitX, py + S * 2);
    ctx.lineTo(px + splitX, py + cs * 0.5 - S);
    ctx.stroke();
    const splitX2 = seed < 50 ? cs * 0.65 : cs * 0.4;
    ctx.beginPath();
    ctx.moveTo(px + splitX2, py + cs * 0.5 + S);
    ctx.lineTo(px + splitX2, py + cs - S * 2);
    ctx.stroke();

    // 随机砖块高光点
    ctx.fillStyle = 'rgba(180, 180, 230, 0.25)';
    if (seed < 30) {
      ctx.fillRect(px + S * 4, py + S * 4, S * 3, S);
    } else if (seed < 60) {
      ctx.fillRect(px + cs - S * 8, py + cs * 0.5 + S * 3, S * 3, S);
    } else {
      ctx.fillRect(px + S * 5, py + cs * 0.5 - S * 3, S * 2, S);
    }

    // 外边框 — 深色描边
    ctx.strokeStyle = 'rgba(10, 10, 25, 0.8)';
    ctx.lineWidth = S;
    ctx.strokeRect(px + S * 0.5, py + S * 0.5, cs - S, cs - S);
  },

  // 屎山 — 便便堆造型，绿色恶臭气波 + 大号 emoji（高分辨率版）
  drawShishan(px, py, gx, gy) {
    const ctx = this.ctx;
    const S = this.SCALE;
    const cs = CELL_SIZE * S;
    const seed = (gx * 37 + gy * 73) % 100;
    const t = this.animFrame + seed * 5;
    const cx = px + cs / 2;
    const cy = py + cs / 2;

    // 地面绿渍 — 暗绿色底，表示被污染
    ctx.fillStyle = '#3d2f1a';
    ctx.beginPath();
    ctx.ellipse(cx, py + cs - 6 * S, cs / 2 - 2 * S, 5 * S, 0, 0, Math.PI * 2);
    ctx.fill();

    // 恶臭气波 — 周期性扩散的绿色半透明圆环
    const stinkPhase = (t * 0.5) % 80;
    if (stinkPhase < 60) {
      const stinkR = stinkPhase * 0.4 * S;
      const stinkAlpha = (1 - stinkPhase / 60) * 0.25;
      ctx.strokeStyle = `rgba(132, 204, 22, ${stinkAlpha})`;
      ctx.lineWidth = 2 * S;
      ctx.beginPath();
      ctx.arc(cx, cy - 2 * S, stinkR + 10 * S, 0, Math.PI * 2);
      ctx.stroke();
      // 第二圈
      const stinkPhase2 = (stinkPhase + 30) % 80;
      if (stinkPhase2 < 60) {
        const stinkR2 = stinkPhase2 * 0.4 * S;
        const stinkAlpha2 = (1 - stinkPhase2 / 60) * 0.2;
        ctx.strokeStyle = `rgba(132, 204, 22, ${stinkAlpha2})`;
        ctx.beginPath();
        ctx.arc(cx, cy - 2 * S, stinkR2 + 10 * S, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // 便便底部圆盘 — 深棕色渐变
    const baseGrad = ctx.createRadialGradient(
      cx, cy, 2 * S,
      cx, cy, cs / 2 - 2 * S
    );
    baseGrad.addColorStop(0, '#6B4423');
    baseGrad.addColorStop(1, '#4A2C0F');
    ctx.fillStyle = baseGrad;
    ctx.beginPath();
    ctx.ellipse(cx, cy + 4 * S, cs / 2 - 4 * S, cs / 2 - 6 * S, 0, 0, Math.PI * 2);
    ctx.fill();

    // 便便螺旋纹理 — 三层从大到小堆叠
    for (let layer = 0; layer < 3; layer++) {
      const ly = cy + 6 * S - layer * 7 * S;
      const lr = (cs / 2 - 6 * S) - layer * 4 * S;
      const lh = (5 - layer) * S;
      ctx.fillStyle = layer === 0 ? '#5A3818' : layer === 1 ? '#6B4423' : '#7B5530';
      ctx.beginPath();
      ctx.ellipse(cx, ly, lr, lh, 0, 0, Math.PI * 2);
      ctx.fill();
      // 顶部高光
      ctx.fillStyle = `rgba(200, 160, 80, ${0.3 - layer * 0.08})`;
      ctx.beginPath();
      ctx.ellipse(cx - 2 * S, ly - S, lr - 2 * S, 1.5 * S, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // 便便顶部尖尖 — 小三角
    ctx.fillStyle = '#8B6035';
    ctx.beginPath();
    ctx.moveTo(cx, cy - 14 * S);
    ctx.lineTo(cx - 3 * S, cy - 8 * S);
    ctx.lineTo(cx + 3 * S, cy - 8 * S);
    ctx.closePath();
    ctx.fill();

    // 中心大号 💩 emoji — 带浮动+抖动
    const wobble = Math.sin(t * 0.08) * 1.5 * S;
    const float = Math.sin(t * 0.05) * S;
    ctx.font = `${20 * S}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('\u{1F4A9}', cx + wobble, cy - 4 * S + float);

    // 偶尔的绿头苍蝇 — 绕着便便飞
    const flyPhase = (t * 0.03) % (Math.PI * 2);
    const flyX = cx + Math.cos(flyPhase) * 16 * S;
    const flyY = cy - 8 * S + Math.sin(flyPhase * 2) * 6 * S;
    if (Math.floor(t / 20) % 3 !== 2) {
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(flyX - 1.5 * S, flyY - S, 3 * S, 2 * S);
    }
  },

  drawBombs() {
    const ctx = this.ctx;
    const S = this.SCALE;
    for (const bomb of Bomb.list) {
      if (bomb.exploded) continue;
      const px = bomb.gridX * CELL_SIZE * S;
      const py = bomb.gridY * CELL_SIZE * S;
      const cx = px + CELL_SIZE * S / 2;
      const cy = py + CELL_SIZE * S / 2;

      // 脉动缩放
      const pulse = Math.sin(bomb.timer * 0.3) * 0.15 + 1;
      const r = 14 * pulse * S;

      // 阴影
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.ellipse(cx, py + CELL_SIZE * S - 4 * S, r * 0.8, 3 * S, 0, 0, Math.PI * 2);
      ctx.fill();

      // 炸弹身体 — 球形渐变
      const grad = ctx.createRadialGradient(
        cx - 4 * S, cy - 4 * S, 2 * S,
        cx, cy, r
      );
      grad.addColorStop(0, '#4a4a6a');
      grad.addColorStop(0.5, '#2a2a3a');
      grad.addColorStop(1, '#0a0a1a');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();

      // 高光
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.beginPath();
      ctx.arc(cx - 5 * S, cy - 5 * S, 4 * S, 0, Math.PI * 2);
      ctx.fill();

      // 引信
      ctx.strokeStyle = '#8B4513';
      ctx.lineWidth = 3 * S;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(cx + 2 * S, cy - r + 2 * S);
      const fuseWobble = Math.sin(this.animFrame * 0.2) * 3 * S;
      ctx.quadraticCurveTo(
        cx + 8 * S + fuseWobble, cy - r - 6 * S,
        cx + 6 * S, cy - r - 12 * S
      );
      ctx.stroke();

      // 引信火花 — 闪烁+粒子
      if (Math.floor(bomb.timer / 8) % 2 === 0) {
        // 火花核心
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(cx + 6 * S, cy - r - 12 * S, 4 * S, 0, Math.PI * 2);
        ctx.fill();
        // 外层光晕
        ctx.fillStyle = 'rgba(255, 165, 0, 0.5)';
        ctx.beginPath();
        ctx.arc(cx + 6 * S, cy - r - 12 * S, 7 * S, 0, Math.PI * 2);
        ctx.fill();
        // 飞溅粒子
        for (let i = 0; i < 3; i++) {
          const angle = Math.random() * Math.PI * 2;
          const dist = Math.random() * 6 * S + 3 * S;
          ctx.fillStyle = `rgba(255, ${100 + Math.random() * 155}, 0, ${Math.random() * 0.8})`;
          ctx.fillRect(
            cx + 6 * S + Math.cos(angle) * dist - S,
            cy - r - 12 * S + Math.sin(angle) * dist - S,
            2 * S, 2 * S
          );
        }
      }

      // 快爆炸时红色警告闪烁
      if (bomb.timer < 30 && Math.floor(bomb.timer / 5) % 2 === 0) {
        ctx.fillStyle = 'rgba(239, 68, 68, 0.3)';
        ctx.beginPath();
        ctx.arc(cx, cy, r + 4 * S, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  },

  drawFire() {
    const ctx = this.ctx;
    const S = this.SCALE;
    const cs = CELL_SIZE * S;
    for (const fire of Bomb.fireList) {
      const px = fire.gridX * cs;
      const py = fire.gridY * cs;
      const alpha = fire.timer / 30;
      const flicker = Math.sin(this.animFrame * 0.5 + fire.gridX * 3) * 0.2 + 0.8;

      // 外层火焰
      ctx.fillStyle = `rgba(239, 68, 68, ${alpha * 0.5 * flicker})`;
      ctx.fillRect(px + 2 * S, py + 2 * S, cs - 4 * S, cs - 4 * S);

      // 中层火焰
      ctx.fillStyle = `rgba(245, 158, 11, ${alpha * 0.7 * flicker})`;
      ctx.fillRect(px + 6 * S, py + 6 * S, cs - 12 * S, cs - 12 * S);

      // 内核
      ctx.fillStyle = `rgba(251, 191, 36, ${alpha * 0.9})`;
      ctx.fillRect(px + 10 * S, py + 10 * S, cs - 20 * S, cs - 20 * S);

      // 白热中心
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.6})`;
      ctx.fillRect(px + 14 * S, py + 14 * S, cs - 28 * S, cs - 28 * S);

      // 飘溅粒子
      if (Math.random() < 0.3) {
        ctx.fillStyle = `rgba(255, ${100 + Math.random() * 155}, 0, ${alpha * 0.6})`;
        const sx = px + Math.random() * cs;
        const sy = py + Math.random() * cs;
        ctx.fillRect(sx, sy, 2 * S, 2 * S);
      }
    }
  },

  // ====== 道具绘制 ======
  drawPickups() {
    if (typeof Pickup !== 'undefined') {
      Pickup.draw(this.ctx);
    }
  },

  drawEnemies() {
    const ctx = this.ctx;
    for (const e of Enemy.list) {
      if (!e.alive) continue;

      // 幽灵虫 — 不可见时跳过
      if (e.type === 'ghost' && !e.visible) continue;

      // 按类型渲染
      switch (e.type) {
        case 'ghost':
          this.drawGhostBug(e);
          break;
        case 'crash':
          this.drawCrashBug(e);
          break;
        case 'p0':
          this.drawP0Bug(e);
          break;
        case 'boss':
          this.drawBossBug(e);
          break;
        default:
          this.drawNormalBug(e);
      }
    }
  },

  // ====== 普通绿虫 ======
  drawNormalBug(e) {
    const ctx = this.ctx;
    const S = this.SCALE;
    const cs = CELL_SIZE * S;
    const px = e.pixelX * S;
    const py = e.pixelY * S;
    const cx = px + cs / 2;
    const cy = py + cs / 2;
    const wobble = Math.sin(this.animFrame * 0.3 + e.id * 2) * 1.5 * S;
    const t = this.animFrame + e.id * 7;

    // 出生动画 — 放大渐入
    if (e.spawnAnim > 0) {
      ctx.globalAlpha = 1 - e.spawnAnim / 15;
    }

    // 阴影
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(cx, py + cs - 3 * S, 12 * S, 3 * S, 0, 0, Math.PI * 2);
    ctx.fill();

    // Bug 身体底光
    ctx.fillStyle = 'rgba(74, 222, 128, 0.12)';
    ctx.beginPath();
    ctx.arc(cx, cy, 18 * S, 0, Math.PI * 2);
    ctx.fill();

    // 6 条腿
    ctx.strokeStyle = '#166534';
    ctx.lineWidth = 1.5 * S;
    ctx.lineCap = 'round';
    const legSwing = Math.sin(this.animFrame * 0.5 + e.id) * 3 * S;
    const legSwing2 = Math.sin(this.animFrame * 0.5 + e.id + Math.PI) * 3 * S;
    for (const side of [-1, 1]) {
      const baseX = cx + side * 8 * S;
      ctx.beginPath();
      ctx.moveTo(baseX, cy - 4 * S);
      ctx.lineTo(baseX + side * 7 * S, cy - 8 * S + legSwing);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(baseX, cy);
      ctx.lineTo(baseX + side * 8 * S, cy + legSwing2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(baseX, cy + 4 * S);
      ctx.lineTo(baseX + side * 7 * S, cy + 10 * S + legSwing);
      ctx.stroke();
    }

    // 身体 — 绿色渐变
    const grad = ctx.createRadialGradient(
      cx - 3 * S, cy - 4 * S, 2 * S,
      cx, cy, 14 * S
    );
    grad.addColorStop(0, '#86efac');
    grad.addColorStop(0.4, '#4ade80');
    grad.addColorStop(0.8, '#16a34a');
    grad.addColorStop(1, '#14532d');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(cx, cy + S, 12 * S, 10 * S, 0, 0, Math.PI * 2);
    ctx.fill();

    // 背纹
    ctx.strokeStyle = '#14532d';
    ctx.lineWidth = S;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 8 * S);
    ctx.lineTo(cx, cy + 10 * S);
    ctx.stroke();

    // 触角
    ctx.strokeStyle = '#166534';
    ctx.lineWidth = 1.5 * S;
    ctx.beginPath();
    ctx.moveTo(px + 14 * S, py + 8 * S);
    ctx.quadraticCurveTo(px + 12 * S + wobble, py + S, px + 9 * S, py - 3 * S + wobble);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(px + cs - 14 * S, py + 8 * S);
    ctx.quadraticCurveTo(px + cs - 12 * S - wobble, py + S, px + cs - 9 * S, py - 3 * S - wobble);
    ctx.stroke();
    ctx.fillStyle = '#4ade80';
    ctx.beginPath();
    ctx.arc(px + 9 * S, py - 3 * S + wobble, 2 * S, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(px + cs - 9 * S, py - 3 * S - wobble, 2 * S, 0, Math.PI * 2);
    ctx.fill();

    // 红色 X 眼
    ctx.strokeStyle = '#DC2626';
    ctx.lineWidth = 2 * S;
    const eyeLX = px + 15 * S, eyeLY = py + 12 * S;
    ctx.beginPath();
    ctx.moveTo(eyeLX - 2.5 * S, eyeLY - 2.5 * S);
    ctx.lineTo(eyeLX + 2.5 * S, eyeLY + 2.5 * S);
    ctx.moveTo(eyeLX + 2.5 * S, eyeLY - 2.5 * S);
    ctx.lineTo(eyeLX - 2.5 * S, eyeLY + 2.5 * S);
    ctx.stroke();
    const eyeRX = px + cs - 15 * S, eyeRY = py + 12 * S;
    ctx.beginPath();
    ctx.moveTo(eyeRX - 2.5 * S, eyeRY - 2.5 * S);
    ctx.lineTo(eyeRX + 2.5 * S, eyeRY + 2.5 * S);
    ctx.moveTo(eyeRX + 2.5 * S, eyeRY - 2.5 * S);
    ctx.lineTo(eyeRX - 2.5 * S, eyeRY + 2.5 * S);
    ctx.stroke();

    // 代码乱码粒子
    if (t % 40 < 8) {
      const glitchChars = ['0x', 'null', 'err', 'NaN', '{}', '=>'];
      const ch = glitchChars[Math.floor((t / 40) % glitchChars.length)];
      ctx.fillStyle = `rgba(239, 68, 68, ${0.6 - (t % 40) / 16})`;
      ctx.font = `${7 * S}px monospace`;
      ctx.fillText(ch, cx + 14 * S, cy - 8 * S);
    }

    ctx.globalAlpha = 1;
  },

  // ====== 幽灵 Bug — 紫色半透明，能穿墙 ======
  drawGhostBug(e) {
    const ctx = this.ctx;
    const S = this.SCALE;
    const cs = CELL_SIZE * S;
    const px = e.pixelX * S;
    const py = e.pixelY * S;
    const cx = px + cs / 2;
    const cy = py + cs / 2;
    const wobble = Math.sin(this.animFrame * 0.3 + e.id * 2) * 2 * S;
    const t = this.animFrame + e.id * 7;

    // 出生动画
    if (e.spawnAnim > 0) {
      ctx.globalAlpha = (1 - e.spawnAnim / 15) * 0.7;
    } else {
      ctx.globalAlpha = 0.7;
    }

    // 紫色幽灵光晕
    ctx.fillStyle = 'rgba(167, 139, 250, 0.15)';
    ctx.beginPath();
    ctx.arc(cx, cy, 20 * S + Math.sin(t * 0.1) * 3 * S, 0, Math.PI * 2);
    ctx.fill();

    // 幽灵身体 — 紫色渐变，底部波浪
    const grad = ctx.createRadialGradient(
      cx, cy - 3 * S, 2 * S,
      cx, cy, 15 * S
    );
    grad.addColorStop(0, '#ddd6fe');
    grad.addColorStop(0.4, '#a78bfa');
    grad.addColorStop(0.8, '#7c3aed');
    grad.addColorStop(1, '#4c1d95');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, 13 * S, Math.PI, 0);
    const waveY = cy + 13 * S;
    const waveAmp = 3 * S;
    for (let i = 0; i <= 6; i++) {
      const wx = cx + 13 * S - (i * 26 * S / 6);
      const wy = waveY + (i % 2 === 0 ? 0 : waveAmp) + wobble;
      ctx.lineTo(wx, wy);
    }
    ctx.closePath();
    ctx.fill();

    // 幽灵两只手 — 飘动
    ctx.save();
    ctx.fillStyle = '#a78bfa';
    ctx.globalAlpha *= 0.8;
    ctx.beginPath();
    ctx.arc(cx - 14 * S, cy + 2 * S + wobble, 4 * S, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + 14 * S, cy + 2 * S - wobble, 4 * S, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 眼睛 — 白色空洞
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(cx - 5 * S, cy - 2 * S, 3.5 * S, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + 5 * S, cy - 2 * S, 3.5 * S, 0, Math.PI * 2);
    ctx.fill();
    // 黑色瞳孔
    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath();
    ctx.arc(cx - 5 * S, cy - 2 * S, 2 * S, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + 5 * S, cy - 2 * S, 2 * S, 0, Math.PI * 2);
    ctx.fill();

    // 嘴 — 惊恐 O 型
    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath();
    ctx.arc(cx, cy + 5 * S, 2.5 * S, 0, Math.PI * 2);
    ctx.fill();

    // 偶尔的 ghost 文字闪烁
    if (t % 60 < 10) {
      ctx.fillStyle = `rgba(167, 139, 250, ${0.7 - (t % 60) / 15})`;
      ctx.font = `bold ${7 * S}px monospace`;
      ctx.fillText('ghost', cx + 16 * S, cy - 6 * S);
    }

    ctx.globalAlpha = 1;
  },

  // ====== 死机 Bug — 蓝屏风格，定时爆炸 ======
  drawCrashBug(e) {
    const ctx = this.ctx;
    const S = this.SCALE;
    const cs = CELL_SIZE * S;
    const px = e.pixelX * S;
    const py = e.pixelY * S;
    const cx = px + cs / 2;
    const cy = py + cs / 2;
    const t = this.animFrame + e.id * 7;

    if (e.spawnAnim > 0) {
      ctx.globalAlpha = 1 - e.spawnAnim / 15;
    }

    // 倒计时颜色 — 越接近爆炸越红
    const flashRed = e.explodeCountdown < 120 && Math.floor(e.explodeCountdown / 10) % 2 === 0;

    // 底部光圈 — 倒计时危险圈
    ctx.fillStyle = flashRed ? 'rgba(239, 68, 68, 0.4)' : 'rgba(59, 130, 246, 0.2)';
    ctx.beginPath();
    ctx.arc(cx, cy, 18 * S + Math.sin(t * 0.2) * 2 * S, 0, Math.PI * 2);
    ctx.fill();

    // 蓝屏死机方框 — 蓝色渐变
    const grad = ctx.createLinearGradient(px, py, px, py + cs);
    if (flashRed) {
      grad.addColorStop(0, '#f87171');
      grad.addColorStop(0.5, '#ef4444');
      grad.addColorStop(1, '#991B1B');
    } else {
      grad.addColorStop(0, '#60a5fa');
      grad.addColorStop(0.5, '#3b82f6');
      grad.addColorStop(1, '#1e40af');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(px + 6 * S, py + 6 * S, cs - 12 * S, cs - 12 * S);

    // 蓝屏内框
    ctx.strokeStyle = flashRed ? '#fca5a5' : '#93c5fd';
    ctx.lineWidth = S;
    ctx.strokeRect(px + 8 * S, py + 8 * S, cs - 16 * S, cs - 16 * S);

    // "BSOD" 文字
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${7 * S}px "Courier New", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('BSOD', cx, cy - 4 * S);

    // 倒计时数字
    const countdownSec = Math.ceil(e.explodeCountdown / 60);
    ctx.fillStyle = flashRed ? '#fff' : '#fbbf24';
    ctx.font = `bold ${10 * S}px "Courier New", monospace`;
    ctx.fillText(`${countdownSec}`, cx, cy + 6 * S);

    // 顶部警告标
    ctx.font = `${10 * S}px serif`;
    ctx.fillText(flashRed ? '\u{1F6A8}' : '\u{1F4E2}', cx, py + 4 * S);

    // 周围电火花
    if (t % 15 < 5) {
      ctx.strokeStyle = flashRed ? '#fbbf24' : '#93c5fd';
      ctx.lineWidth = S;
      for (let i = 0; i < 3; i++) {
        const angle = Math.random() * Math.PI * 2;
        const r1 = 16 * S + Math.random() * 4 * S;
        const r2 = r1 + 3 * S + Math.random() * 3 * S;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(angle) * r1, cy + Math.sin(angle) * r1);
        ctx.lineTo(cx + Math.cos(angle) * r2, cy + Math.sin(angle) * r2);
        ctx.stroke();
      }
    }

    ctx.globalAlpha = 1;
  },

  // ====== P0 Bug — 红色大虫，需要炸两次 ======
  drawP0Bug(e) {
    const ctx = this.ctx;
    const S = this.SCALE;
    const cs = CELL_SIZE * S;
    const px = e.pixelX * S;
    const py = e.pixelY * S;
    const cx = px + cs / 2;
    const cy = py + cs / 2;
    const wobble = Math.sin(this.animFrame * 0.25 + e.id * 2) * 2 * S;
    const t = this.animFrame + e.id * 7;

    if (e.spawnAnim > 0) {
      ctx.globalAlpha = 1 - e.spawnAnim / 15;
    }

    // 红色危险光晕
    ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
    ctx.beginPath();
    ctx.arc(cx, cy, 22 * S + Math.sin(t * 0.15) * 3 * S, 0, Math.PI * 2);
    ctx.fill();

    // 阴影
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(cx, py + cs - 3 * S, 14 * S, 3 * S, 0, 0, Math.PI * 2);
    ctx.fill();

    // 8 条腿 — 比普通虫更多更大
    ctx.strokeStyle = '#7F1D1D';
    ctx.lineWidth = 2 * S;
    ctx.lineCap = 'round';
    const legSwing = Math.sin(this.animFrame * 0.4 + e.id) * 4 * S;
    const legSwing2 = Math.sin(this.animFrame * 0.4 + e.id + Math.PI) * 4 * S;
    for (const side of [-1, 1]) {
      for (const ly of [-6, -2, 2, 6]) {
        const baseX = cx + side * 10 * S;
        const baseY = cy + ly * S;
        ctx.beginPath();
        ctx.moveTo(baseX, baseY);
        ctx.lineTo(baseX + side * 9 * S, baseY + 3 * S + (ly < 0 ? legSwing : legSwing2));
        ctx.stroke();
      }
    }

    // 身体 — 红色渐变，比普通虫大
    const grad = ctx.createRadialGradient(
      cx - 4 * S, cy - 5 * S, 2 * S,
      cx, cy, 16 * S
    );
    grad.addColorStop(0, '#fca5a5');
    grad.addColorStop(0.3, '#f87171');
    grad.addColorStop(0.7, '#ef4444');
    grad.addColorStop(1, '#7f1D1D');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(cx, cy + S, 14 * S, 12 * S, 0, 0, Math.PI * 2);
    ctx.fill();

    // 背纹 — 粗中线
    ctx.strokeStyle = '#7F1D1D';
    ctx.lineWidth = 2 * S;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 10 * S);
    ctx.lineTo(cx, cy + 12 * S);
    ctx.stroke();

    // 触角 — 粗大
    ctx.strokeStyle = '#991B1B';
    ctx.lineWidth = 2 * S;
    ctx.beginPath();
    ctx.moveTo(px + 14 * S, py + 6 * S);
    ctx.quadraticCurveTo(px + 12 * S + wobble, py - S, px + 8 * S, py - 5 * S + wobble);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(px + cs - 14 * S, py + 6 * S);
    ctx.quadraticCurveTo(px + cs - 12 * S - wobble, py - S, px + cs - 8 * S, py - 5 * S - wobble);
    ctx.stroke();
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(px + 8 * S, py - 5 * S + wobble, 3 * S, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(px + cs - 8 * S, py - 5 * S - wobble, 3 * S, 0, Math.PI * 2);
    ctx.fill();

    // 眼睛 — 大号愤怒眼
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(px + 14 * S, py + 11 * S, 5 * S, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(px + cs - 14 * S, py + 11 * S, 5 * S, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#DC2626';
    ctx.beginPath();
    ctx.arc(px + 14 * S, py + 11 * S, 3 * S, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(px + cs - 14 * S, py + 11 * S, 3 * S, 0, Math.PI * 2);
    ctx.fill();

    // 头顶 "P0" 标签
    ctx.fillStyle = '#fbbf24';
    ctx.font = `bold ${9 * S}px "Courier New", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('P0', cx, py + 3 * S);

    // 血量指示 — 如果只剩1血显示裂痕
    if (e.health === 1) {
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 1.5 * S;
      ctx.beginPath();
      ctx.moveTo(px + 10 * S, py + 8 * S);
      ctx.lineTo(px + 14 * S, py + 14 * S);
      ctx.lineTo(px + 12 * S, py + 20 * S);
      ctx.lineTo(px + 16 * S, py + 26 * S);
      ctx.stroke();
    }

    // 代码乱码
    if (t % 35 < 8) {
      const glitchChars = ['FATAL', 'core', 'segv', 'PANIC', 'abort', 'oom'];
      const ch = glitchChars[Math.floor((t / 35) % glitchChars.length)];
      ctx.fillStyle = `rgba(239, 68, 68, ${0.7 - (t % 35) / 14})`;
      ctx.font = `bold ${7 * S}px monospace`;
      ctx.fillText(ch, cx + 16 * S, cy - 8 * S);
    }

    ctx.globalAlpha = 1;
  },

  // ====== Boss Bug — 邪恶小人，红色犄角 + 邪笑 ======
  drawBossBug(e) {
    const ctx = this.ctx;
    const S = this.SCALE;
    const cs = CELL_SIZE * S;
    const px = e.pixelX * S;
    const py = e.pixelY * S;
    const cx = px + cs / 2;
    const cy = py + cs / 2;
    const wobble = Math.sin(this.animFrame * 0.2 + e.id * 2) * 2 * S;
    const t = this.animFrame + e.id * 7;

    if (e.spawnAnim > 0) {
      ctx.globalAlpha = 1 - e.spawnAnim / 30;
    }

    // 暗黑光环 — 红黑脉动
    const auraR = 26 * S + Math.sin(t * 0.12) * 4 * S;
    ctx.fillStyle = `rgba(220, 38, 38, ${0.12 + Math.sin(t * 0.15) * 0.06})`;
    ctx.beginPath();
    ctx.arc(cx, cy, auraR, 0, Math.PI * 2);
    ctx.fill();
    // 内层暗黑光环
    ctx.fillStyle = 'rgba(20, 0, 0, 0.15)';
    ctx.beginPath();
    ctx.arc(cx, cy, 20 * S, 0, Math.PI * 2);
    ctx.fill();

    // 阴影
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    ctx.ellipse(cx, py + cs - 3 * S, 16 * S, 3 * S, 0, 0, Math.PI * 2);
    ctx.fill();

    // === 红色犄角 ===
    ctx.fillStyle = '#DC2626';
    ctx.strokeStyle = '#7F1D1D';
    ctx.lineWidth = S;
    // 左犄角
    ctx.beginPath();
    ctx.moveTo(cx - 8 * S, py + 4 * S + wobble);
    ctx.quadraticCurveTo(cx - 14 * S, py - 4 * S + wobble, cx - 10 * S, py - 12 * S + wobble);
    ctx.quadraticCurveTo(cx - 8 * S, py - 6 * S + wobble, cx - 5 * S, py + 2 * S + wobble);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // 右犄角
    ctx.beginPath();
    ctx.moveTo(cx + 8 * S, py + 4 * S + wobble);
    ctx.quadraticCurveTo(cx + 14 * S, py - 4 * S + wobble, cx + 10 * S, py - 12 * S + wobble);
    ctx.quadraticCurveTo(cx + 8 * S, py - 6 * S + wobble, cx + 5 * S, py + 2 * S + wobble);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // 犄角高光
    ctx.fillStyle = 'rgba(255, 100, 100, 0.4)';
    ctx.beginPath();
    ctx.ellipse(cx - 9 * S, py - 6 * S + wobble, 2 * S, 3 * S, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + 9 * S, py - 6 * S + wobble, 2 * S, 3 * S, -0.3, 0, Math.PI * 2);
    ctx.fill();

    // === 身体 — 暗黑渐变 ===
    const bodyGrad = ctx.createRadialGradient(
      cx - 4 * S, cy - 6 * S, 2 * S,
      cx, cy + 4 * S, 18 * S
    );
    bodyGrad.addColorStop(0, '#4a2020');
    bodyGrad.addColorStop(0.4, '#2a1010');
    bodyGrad.addColorStop(0.8, '#1a0808');
    bodyGrad.addColorStop(1, '#0a0202');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.ellipse(cx, cy + 4 * S + wobble, 16 * S, 14 * S, 0, 0, Math.PI * 2);
    ctx.fill();

    // 身体边缘红色描边
    ctx.strokeStyle = 'rgba(220, 38, 38, 0.6)';
    ctx.lineWidth = 1.5 * S;
    ctx.beginPath();
    ctx.ellipse(cx, cy + 4 * S + wobble, 16 * S, 14 * S, 0, 0, Math.PI * 2);
    ctx.stroke();

    // === 邪恶眼睛 — 倾斜发光红眼 ===
    // 眼眶 — 深红
    ctx.fillStyle = '#1a0000';
    ctx.beginPath();
    ctx.ellipse(cx - 7 * S, cy - 2 * S + wobble, 5 * S, 4 * S, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + 7 * S, cy - 2 * S + wobble, 5 * S, 4 * S, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // 眼球 — 发光红
    const eyeGlow = 0.7 + Math.sin(t * 0.3) * 0.3;
    ctx.fillStyle = `rgba(255, 50, 50, ${eyeGlow})`;
    ctx.beginPath();
    ctx.arc(cx - 7 * S, cy - 2 * S + wobble, 3 * S, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + 7 * S, cy - 2 * S + wobble, 3 * S, 0, Math.PI * 2);
    ctx.fill();
    // 眼睛高光
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(cx - 6 * S, cy - 3 * S + wobble, 1 * S, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + 8 * S, cy - 3 * S + wobble, 1 * S, 0, Math.PI * 2);
    ctx.fill();

    // === 邪笑 — 锯齿牙齿 ===
    const grinY = cy + 6 * S + wobble;
    // 嘴巴背景 — 黑色
    ctx.fillStyle = '#0a0000';
    ctx.beginPath();
    ctx.moveTo(cx - 10 * S, grinY - 2 * S);
    ctx.quadraticCurveTo(cx, grinY + 6 * S, cx + 10 * S, grinY - 2 * S);
    ctx.lineTo(cx + 10 * S, grinY - 1 * S);
    ctx.quadraticCurveTo(cx, grinY + 2 * S, cx - 10 * S, grinY - 1 * S);
    ctx.closePath();
    ctx.fill();

    // 牙齿 — 白色三角锯齿
    ctx.fillStyle = '#f5f5f5';
    const teethCount = 5;
    const teethW = 20 * S / teethCount;
    for (let i = 0; i < teethCount; i++) {
      const tx = cx - 10 * S + i * teethW;
      ctx.beginPath();
      ctx.moveTo(tx, grinY - 1 * S);
      ctx.lineTo(tx + teethW / 2, grinY + 3 * S);
      ctx.lineTo(tx + teethW, grinY - 1 * S);
      ctx.closePath();
      ctx.fill();
    }

    // === 头顶 "BOSS" 标签 ===
    ctx.fillStyle = `rgba(251, 191, 36, ${0.8 + Math.sin(t * 0.2) * 0.2})`;
    ctx.font = `bold ${8 * S}px "Courier New", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('BOSS', cx, py - 2 * S + wobble);

    // === 血量指示 — 3颗心 ===
    const heartY = py + 2 * S + wobble;
    for (let i = 0; i < 3; i++) {
      const hx = cx - 8 * S + i * 8 * S;
      if (i < e.health) {
        ctx.fillStyle = '#ef4444';
        ctx.font = `${7 * S}px serif`;
        ctx.fillText('\u{1F494}', hx, heartY);
      } else {
        ctx.fillStyle = '#444';
        ctx.font = `${7 * S}px serif`;
        ctx.fillText('\u{1F494}', hx, heartY);
      }
    }

    // === 周围暗黑粒子 ===
    if (t % 20 < 4) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 18 * S + Math.random() * 8 * S;
      ctx.fillStyle = `rgba(220, 38, 38, ${0.5 + Math.random() * 0.3})`;
      ctx.fillRect(
        cx + Math.cos(angle) * dist - S,
        cy + Math.sin(angle) * dist - S,
        2 * S, 2 * S
      );
    }

    // === 故障文字 ===
    if (t % 50 < 10) {
      const glitchChars = ['FATAL', 'core', 'segv', 'PANIC', 'abort', 'oom', 'kill', 'die'];
      const ch = glitchChars[Math.floor((t / 50) % glitchChars.length)];
      ctx.fillStyle = `rgba(239, 68, 68, ${0.8 - (t % 50) / 14})`;
      ctx.font = `bold ${8 * S}px monospace`;
      ctx.fillText(ch, cx + 18 * S, cy - 10 * S);
    }

    ctx.globalAlpha = 1;
  },

  drawPlayer() {
    const ctx = this.ctx;
    const S = this.SCALE;
    const cs = CELL_SIZE * S;
    if (Player.dead) return;

    const px = Player.pixelX * S;
    const py = Player.pixelY * S;
    const cx = px + cs / 2;
    const cy = py + cs / 2;
    const t = this.animFrame;

    // 无敌闪烁
    if (Player.invincible > 0 && Math.floor(Player.invincible / 5) % 2 === 0) {
      return;
    }

    const wobble = Player.moving ? Math.sin(t * 0.5) * S : 0;

    // ── 加速残影 ──
    if (Player.speedBoost > 0 && Player.moving) {
      for (let i = 1; i <= 3; i++) {
        ctx.globalAlpha = 0.12 * (4 - i) / 3;
        const dx = Math.sign(Player.targetX - Player.pixelX) * i * 6 * S;
        const dy = Math.sign(Player.targetY - Player.pixelY) * i * 6 * S;
        ctx.fillStyle = '#4ade80';
        this.roundRect(ctx, px + 10 * S - dx, py + 15 * S + wobble - dy, cs - 20 * S, cs - 21 * S, 4 * S);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.strokeStyle = `rgba(74,222,128,${0.3 + Math.sin(t * 0.3) * 0.2})`;
      ctx.lineWidth = 1.5 * S;
      ctx.beginPath();
      ctx.arc(cx, cy, 17 * S + Math.sin(t * 0.2) * 2 * S, 0, Math.PI * 2);
      ctx.stroke();
    }

    // ── 阴影 ──
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(cx, py + cs - 2 * S, 11 * S, 3 * S, 0, 0, Math.PI * 2);
    ctx.fill();

    // ════════ 身体 — 绿色测试服 ════════
    const bodyGrad = ctx.createLinearGradient(px, py + 18 * S, px, py + cs);
    bodyGrad.addColorStop(0, '#22c55e');
    bodyGrad.addColorStop(0.7, '#16a34a');
    bodyGrad.addColorStop(1, '#15803d');
    ctx.fillStyle = bodyGrad;
    this.roundRect(ctx, px + 9 * S, py + 18 * S + wobble, cs - 18 * S, cs - 24 * S, 5 * S);
    ctx.fill();
    // 左侧高光
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    this.roundRect(ctx, px + 10 * S, py + 19 * S + wobble, 3 * S, cs - 26 * S, 2 * S);
    ctx.fill();

    // ════════ 胸口 — 白色 + 绿勾 ════════
    const chestY = py + 22 * S + wobble;
    ctx.fillStyle = '#f0fdf4';
    this.roundRect(ctx, cx - 7 * S, chestY, 14 * S, 10 * S, 3 * S);
    ctx.fill();
    // 绿勾 — 验证概念
    ctx.strokeStyle = '#16a34a';
    ctx.lineWidth = 2 * S;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - 4 * S, chestY + 5 * S);
    ctx.lineTo(cx - 1 * S, chestY + 8 * S);
    ctx.lineTo(cx + 5 * S, chestY + 3 * S);
    ctx.stroke();

    // ════════ 脖子 ════════
    ctx.fillStyle = '#d1d5db';
    this.roundRect(ctx, cx - 3 * S, py + 14 * S + wobble, 6 * S, 5 * S, 1 * S);
    ctx.fill();

    // ════════ 头部 ════════
    const headY = py + 4 * S + wobble;

    // 头发 — 深绿
    const hairGrad = ctx.createLinearGradient(px, headY, px, headY + 8 * S);
    hairGrad.addColorStop(0, '#166534');
    hairGrad.addColorStop(1, '#14532d');
    ctx.fillStyle = hairGrad;
    this.roundRect(ctx, px + 12 * S, headY, cs - 24 * S, 8 * S, 4 * S);
    ctx.fill();

    // 脸部 — 奶油色
    const faceGrad = ctx.createRadialGradient(cx, headY + 8 * S, 2 * S, cx, headY + 10 * S, 9 * S);
    faceGrad.addColorStop(0, '#fef9c3');
    faceGrad.addColorStop(1, '#fef9c3');
    ctx.fillStyle = faceGrad;
    this.roundRect(ctx, px + 12 * S, headY + 6 * S, cs - 24 * S, 14 * S, 5 * S);
    ctx.fill();

    // ════════ 眼镜 — 核心识别特征 ════════
    const gY = headY + 13 * S;   // 眼镜中心Y
    const gLX = cx - 5 * S;      // 左镜片中心X
    const gRX = cx + 5 * S;      // 右镜片中心X
    const gR = 5.5 * S;          // 镜片半径

    // 镜片 — 淡绿AR镀膜效果
    const mkLens = (x, y) => {
      const g2 = ctx.createRadialGradient(x - S, y - S, 0, x, y, gR);
      g2.addColorStop(0, 'rgba(134,239,172,0.35)');
      g2.addColorStop(0.6, 'rgba(34,197,94,0.12)');
      g2.addColorStop(1, 'rgba(34,197,94,0.03)');
      ctx.fillStyle = g2;
      ctx.beginPath();
      ctx.arc(x, y, gR, 0, Math.PI * 2);
      ctx.fill();
    };
    mkLens(gLX, gY);
    mkLens(gRX, gY);

    // 镜框 — 深绿
    ctx.strokeStyle = '#14532d';
    ctx.lineWidth = 1.2 * S;
    ctx.beginPath(); ctx.arc(gLX, gY, gR, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(gRX, gY, gR, 0, Math.PI * 2); ctx.stroke();

    // 鼻梁桥
    ctx.beginPath();
    ctx.moveTo(gLX + gR * 0.5, gY - 0.5 * S);
    ctx.lineTo(gRX - gR * 0.5, gY - 0.5 * S);
    ctx.stroke();

    // 眼镜腿
    ctx.lineWidth = S;
    ctx.beginPath();
    ctx.moveTo(gLX - gR, gY - 0.5 * S);
    ctx.lineTo(px + 12 * S, gY);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(gRX + gR, gY - 0.5 * S);
    ctx.lineTo(px + cs - 12 * S, gY);
    ctx.stroke();

    // 镜片高光（AR反光）
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 0.6 * S;
    ctx.beginPath();
    ctx.arc(gLX - 1.5 * S, gY - 1.5 * S, gR * 0.5, -0.8, 0.5);
    ctx.stroke();

    // 眼睛 — 镜片后的瞳孔
    let lx = 0, ly = 0;
    if (Player.moving) {
      lx = Math.sign(Player.targetX - Player.pixelX) * 1.2 * S;
      ly = Math.sign(Player.targetY - Player.pixelY) * 1.2 * S;
    }
    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath(); ctx.arc(gLX + lx, gY + ly, 1.8 * S, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(gRX + lx, gY + ly, 1.8 * S, 0, Math.PI * 2); ctx.fill();
    // 高光
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(gLX + lx + 0.5 * S, gY + ly - 0.5 * S, 0.7 * S, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(gRX + lx + 0.5 * S, gY + ly - 0.5 * S, 0.7 * S, 0, Math.PI * 2); ctx.fill();

    // ════════ 嘴巴 ════════
    ctx.strokeStyle = '#1a1a2e';
    ctx.lineWidth = 1.2 * S;
    ctx.lineCap = 'round';
    const mY = headY + 19 * S;
    if (Player.invincible > 0) {
      ctx.beginPath(); ctx.arc(cx, mY, 1.5 * S, 0, Math.PI * 2); ctx.stroke();
    } else if (Player.moving) {
      ctx.beginPath(); ctx.arc(cx, mY - S, 2.5 * S, 0.15, Math.PI - 0.15); ctx.stroke();
    } else {
      ctx.beginPath(); ctx.arc(cx, mY - 0.5 * S, 2 * S, 0.2, Math.PI - 0.2); ctx.stroke();
    }

    // ════════ 手持炸弹 ════════
    if (Player.activeBombs < Player.maxBombs) {
      ctx.fillStyle = '#4b5563';
      ctx.beginPath();
      ctx.arc(px + cs - 7 * S, cy + wobble, 2.5 * S, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = S;
      ctx.beginPath();
      ctx.moveTo(px + cs - 7 * S, cy - 2.5 * S + wobble);
      ctx.lineTo(px + cs - 5 * S, cy - 5 * S + wobble);
      ctx.stroke();
    }
  },

  drawDarkness() {
    const ctx = this.ctx;
    const S = this.SCALE;
    const cs = CELL_SIZE * S;
    const px = Player.pixelX * S + cs / 2;
    const py = Player.pixelY * S + cs / 2;
    const radius = cs * 3.5;  // 视野半径（2.5→3.5格，更舒适）

    ctx.save();
    // 径向渐变遮罩：中心透明（看得到游戏），边缘深黑（看不到远处）
    const gradient = ctx.createRadialGradient(px, py, radius * 0.3, px, py, radius);
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(0.6, 'rgba(0, 0, 0, 0.15)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.88)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.restore();
  },

  drawParticles() {
    const ctx = this.ctx;
    const S = this.SCALE;
    for (const p of Effects.particles) {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.life / p.maxLife;
      const size = (3 + (1 - p.life / p.maxLife) * 2) * S;
      ctx.fillRect(p.x * S - size / 2, p.y * S - size / 2, size, size);
    }
    ctx.globalAlpha = 1;
  },

  // 圆角矩形辅助
  roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  },
};
