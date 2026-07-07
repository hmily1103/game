// ========== 道具掉落系统 ==========
// 炸毁屎山时有概率掉落：🍗大鸡腿 / 🫓大饼 / 🧋奶茶 / ⚡加速器

const Pickup = {
  list: [],       // { id, gridX, gridY, pixelX, pixelY, type, bobOffset, life }
  nextId: 0,
  dropChance: 0.18,   // 炸毁屎山时 18% 概率掉落

  // 道具类型
  TYPES: {
    DRUMSTICK: { icon: '\u{1F357}', label: '大鸡腿', color: '#f59e0b', heal: 1, effect: 'heal' },
    FLATBREAD: { icon: '\u{1F95D}', label: '大饼',   color: '#fbbf24', heal: 1, effect: 'heal' },
    MILKTEA:   { icon: '\u{1F9CB}', label: '奶茶',   color: '#a78bfa', heal: 0, effect: 'shield' },
    ENERGY:    { icon: '\u26A1',     label: '加速器', color: '#22d3ee', heal: 0, effect: 'speed' },
  },

  init() {
    this.list = [];
    this.nextId = 0;
    this.dropChance = 0.18;  // 重置掉落率（评委模式可能改过）
  },

  // 尝试从屎山掉落
  tryDrop(gridX, gridY) {
    if (Math.random() > this.dropChance) return;
    // 确保位置是空地
    if (!GameMap.isWalkable(gridX, gridY)) return;
    // 不要和已有道具重叠
    if (this.list.some(p => p.gridX === gridX && p.gridY === gridY)) return;

    const types = Object.keys(this.TYPES);
    const typeKey = types[Math.floor(Math.random() * types.length)];
    const type = this.TYPES[typeKey];

    this.list.push({
      id: this.nextId++,
      gridX,
      gridY,
      pixelX: gridX * CELL_SIZE,
      pixelY: gridY * CELL_SIZE,
      typeKey,
      type,
      bobOffset: 0,
      life: 600, // 10秒后消失
      spawning: 20, // 掉落动画 20 帧
    });

    // 掉落特效 — 金色光柱
    Effects.pickupDrop(gridX * CELL_SIZE + CELL_SIZE / 2, gridY * CELL_SIZE + CELL_SIZE / 2);

    // 搞笑横幅
    const banners = [
      `\u{1F4B0} 天降${type.label}！`,
      `\u{1F381} 意外掉落：${type.label}`,
      `\u{1F4B0} 屎山里居然有${type.label}！`,
    ];
    if (type.effect === 'speed') {
      banners.push(`\u26A1 \u52A0\u901F\u5668\u6765\u4E86\uFF01\u8DD1\u5F97\u5FEB\u624D\u80FD\u8DD1\u5F97\u8FC7Bug\uFF01`);
    }
    Effects.banner(banners[Math.floor(Math.random() * banners.length)]);
    Sound.play('alert');
  },

  // 玩家拾取检测
  checkPickup() {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      if (p.gridX === Player.gridX && p.gridY === Player.gridY) {
        this.collect(p);
        this.list.splice(i, 1);
      }
    }
  },

  // 拾取效果
  collect(pickup) {
    const type = pickup.type;

    if (type.effect === 'heal') {
      Player.lives = Math.min(5, Player.lives + type.heal);
      Effects.floatText(`\u{2764}\u{FE0F} +${type.heal}  \u{1F357}`, 
        pickup.gridX * CELL_SIZE + CELL_SIZE / 2, 
        pickup.gridY * CELL_SIZE, '#10B981');
      Danmaku.show('pickup');
      Sound.play('heal');
    } else if (type.effect === 'shield') {
      Player.invincible = Math.max(Player.invincible, 300); // 5秒无敌
      Effects.floatText(`\u{1F6E1}\u{FE0F} \u5976\u8336\u62A4\u76FE 5\u79D2`,
        pickup.gridX * CELL_SIZE + CELL_SIZE / 2,
        pickup.gridY * CELL_SIZE, '#a78bfa');
      Danmaku.show('pickup');
      Sound.play('heal');
    } else if (type.effect === 'speed') {
      Player.speedBoost = 600; // 10秒加速 (60fps × 10)
      Effects.floatText(`\u26A1 \u52A0\u901F 10\u79D2`,
        pickup.gridX * CELL_SIZE + CELL_SIZE / 2,
        pickup.gridY * CELL_SIZE, '#22d3ee');
      Danmaku.show('pickup');
      Sound.play('speed');
    }

    // 拾取特效 — 金色粒子环
    Effects.pickupCollect(
      pickup.gridX * CELL_SIZE + CELL_SIZE / 2,
      pickup.gridY * CELL_SIZE + CELL_SIZE / 2,
      type.color
    );

    Roast.trigger('pickup');
    HUD.update();
  },

  update() {
    if (Game.state !== 'playing') return;
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      p.bobOffset = Math.sin((Game.frameCount + p.id * 10) * 0.1) * 3;

      if (p.spawning > 0) {
        p.spawning--;
      }

      p.life--;
      if (p.life <= 0) {
        // 消失特效
        Effects.particle(
          p.pixelX + CELL_SIZE / 2,
          p.pixelY + CELL_SIZE / 2,
          p.type.color
        );
        this.list.splice(i, 1);
      }
    }

    // 检测拾取
    this.checkPickup();
  },

  // 在渲染层调用的绘制函数
  // Renderer 会调用这个
  draw(ctx) {
    const S = Renderer.SCALE || 2;
    const cs = CELL_SIZE * S;
    for (const p of this.list) {
      const px = p.pixelX * S;
      const py = (p.pixelY + p.bobOffset) * S;
      const t = Game.frameCount + p.id * 7;

      // 掉落动画 — 从上方落下
      let dropOffset = 0;
      if (p.spawning > 0) {
        dropOffset = -p.spawning * 3 * S;
      }

      // 闪烁警告（快消失时）
      if (p.life < 120 && Math.floor(p.life / 8) % 2 === 0) {
        continue;
      }

      const cx = px + cs / 2;
      const cy = py + cs / 2 + dropOffset;

      // 光环底座
      ctx.fillStyle = `${p.type.color}33`;
      ctx.beginPath();
      ctx.arc(cx, cy, 18 * S + Math.sin(t * 0.1) * 2 * S, 0, Math.PI * 2);
      ctx.fill();

      // 旋转光环
      ctx.strokeStyle = p.type.color;
      ctx.lineWidth = 2 * S;
      ctx.globalAlpha = 0.6;
      for (let i = 0; i < 3; i++) {
        const angle = t * 0.05 + (i * Math.PI * 2) / 3;
        ctx.beginPath();
        ctx.arc(cx, cy, 15 * S, angle, angle + 0.8);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // 道具 emoji — 大号
      ctx.font = `${22 * S}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.type.icon, cx, cy);

      // 标签文字
      ctx.fillStyle = p.type.color;
      ctx.font = `bold ${8 * S}px "Microsoft YaHei", sans-serif`;
      ctx.fillText(p.type.label, cx, py + cs - 6 * S + dropOffset);
    }
  },
};
