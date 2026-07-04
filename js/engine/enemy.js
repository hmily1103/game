// ========== Bug 怪系统（多类型版） ==========
// 类型：normal(普通绿虫) / ghost(幽灵虫) / crash(死机虫) / p0(P0大虫)

const Enemy = {
  list: [],
  nextId: 0,
  spawnCount: 0,
  // 各类型击杀统计
  killStats: { normal: 0, ghost: 0, crash: 0, p0: 0, boss: 0 },

  // 类型配置
  TYPE_CONFIG: {
    normal: {
      speed: 1.0,
      health: 1,
      scoreLabel: 'Bug',
      color: '#4ade80',
    },
    ghost: {
      speed: 1.4,
      health: 1,
      scoreLabel: '幽灵Bug',
      color: '#a78bfa',
      phasing: true,    // 穿屎山
      flicker: true,    // 忽隐忽现
    },
    crash: {
      speed: 0,
      health: 1,
      scoreLabel: '死机Bug',
      color: '#3b82f6',
      stationary: true, // 不移动
      explodeTimer: 360, // 6秒后爆炸
      exploding: true,
    },
    p0: {
      speed: 0.7,
      health: 2,       // 需要炸两次
      scoreLabel: 'P0 Bug',
      color: '#ef4444',
      big: true,
    },
    boss: {
      speed: 0.5,
      health: 3,        // 需要炸三次
      scoreLabel: 'Boss Bug',
      color: '#dc2626',
      big: true,
      boss: true,
    },
  },

  init() {
    this.list = [];
    this.nextId = 0;
    this.spawnCount = 0;
    this.killStats = { normal: 0, ghost: 0, crash: 0, p0: 0, boss: 0 };
    // 初始生成 3 个普通 Bug
    for (let i = 0; i < 3; i++) {
      this.spawn('normal');
    }
  },

  spawn(type, x, y) {
    type = type || 'normal';
    const config = this.TYPE_CONFIG[type];

    let pos;
    if (x !== undefined && y !== undefined) {
      pos = { x, y };
    } else {
      pos = GameMap.getRandomEmptyCell();
      if (!pos) return;
      const dist = Math.abs(pos.x - Player.gridX) + Math.abs(pos.y - Player.gridY);
      if (dist < 4) {
        for (let attempt = 0; attempt < 10; attempt++) {
          pos = GameMap.getRandomEmptyCell();
          if (!pos) return;
          if (Math.abs(pos.x - Player.gridX) + Math.abs(pos.y - Player.gridY) >= 4) break;
        }
      }
    }

    const enemy = {
      id: this.nextId++,
      type,
      config,
      gridX: pos.x,
      gridY: pos.y,
      pixelX: pos.x * CELL_SIZE,
      pixelY: pos.y * CELL_SIZE,
      targetX: pos.x * CELL_SIZE,
      targetY: pos.y * CELL_SIZE,
      moving: false,
      dir: Math.floor(Math.random() * 4),
      speed: 1.5 * config.speed * RuleEngine.config.bugSpeed,
      alive: true,
      health: config.health,
      // 幽灵虫
      visible: true,
      flickerTimer: 0,
      // 死机虫
      explodeCountdown: config.explodeTimer || 0,
      exploding: config.exploding || false,
      // 分裂
      splitOnDeath: RuleEngine.config.bugSplit,
      // 出生动画 — Boss 更长
      spawnAnim: type === 'boss' ? 30 : 15,
    };
    this.list.push(enemy);
    this.spawnCount++;

    // 生成传送门特效 — 颜色按类型
    const portalColor = config.color;
    Effects.portal(pos.x * CELL_SIZE + CELL_SIZE/2, pos.y * CELL_SIZE + CELL_SIZE/2, portalColor);
    HUD.update();
  },

  killAt(x, y) {
    for (const e of this.list) {
      if (e.alive && e.gridX === x && e.gridY === y) {
        e.health--;
        if (e.health <= 0) {
          e.alive = false;
          this.killStats[e.type]++;
          this.onKill(e);
        } else {
          // 受伤但没死 — 根据类型显示不同文字
          if (e.type === 'boss') {
            const bossHits = ['\u{1F525} Boss还在笑！', '\u{1F525} Boss怒了！', '\u{1F525} 就差一下！'];
            const idx = 3 - e.health;
            Effects.floatText(bossHits[Math.min(idx, 2)],
              e.gridX * CELL_SIZE + CELL_SIZE/2, e.gridY * CELL_SIZE, '#fbbf24');
          } else {
            Effects.floatText('\u{1F525} 还差一点！',
              e.gridX * CELL_SIZE + CELL_SIZE/2, e.gridY * CELL_SIZE, '#ef4444');
          }
          Sound.play('alert');
        }
        return true;
      }
    }
    return false;
  },

  // 击杀回调 — 触发特效
  onKill(e) {
    const isSpecial = e.type !== 'normal';
    const isBoss = e.type === 'boss';

    // 基础爆炸
    Effects.explosion(e.gridX, e.gridY);

    if (isBoss) {
      // Boss 击杀 — 超大爆炸 + 必掉道具 + 鸡腿雨
      Effects.bigShake();
      Effects.bugKillSpecial(e.gridX, e.gridY, 'p0');
      Effects.drumstickRain(e.gridX, e.gridY);
      Effects.drumstickRain(e.gridX, e.gridY);

      // 多重爆炸
      for (let i = 0; i < 3; i++) {
        setTimeout(() => {
          Effects.explosion(e.gridX, e.gridY);
          Effects.shake();
        }, i * 150);
      }

      Effects.floatText('\u{1F525}\u{1F525}\u{1F525} Boss Bug 已歼灭！',
        e.gridX * CELL_SIZE + CELL_SIZE/2, e.gridY * CELL_SIZE, '#fbbf24');
      Effects.banner('\u{1F389}\u{1F389} Boss Bug 被你炸翻了！全公司欢呼！');

      Danmaku.showBatch('specialKill', 4);
      Sound.play('specialKill');
      Sound.play('victory');

      // Boss 必掉2个道具
      Pickup.tryDrop(e.gridX, e.gridY);
      Pickup.tryDrop(e.gridX, e.gridY);

    } else if (isSpecial) {
      // 特殊 Bug 击杀 — 加鸡腿庆祝！
      Effects.bugKillSpecial(e.gridX, e.gridY, e.type);
      
      // 飘字
      const floatTexts = {
        ghost: '\u{1F47B} \u5E7D\u7075\u8D28\u5210\uFF01',
        crash: '\u{1F4A5} \u907F\u514D\u4E86\u4E00\u6B21\u7EBF\u4E0A\u4E8B\u6545\uFF01',
        p0: '\u{1F525} P0\u5DF2\u6298\u673A\uFF01',
      };
      Effects.floatText(floatTexts[e.type] || '\u2705 \u9A8C\u8BC1\u901A\u8FC7\uFF01',
        e.gridX * CELL_SIZE + CELL_SIZE/2, e.gridY * CELL_SIZE, e.config.color);

      // 弹幕
      Danmaku.show(e.type === 'ghost' ? 'killGhost' : e.type === 'crash' ? 'killCrash' : 'killP0');
      Danmaku.showBatch('specialKill', 2);

      // 特殊击杀音效
      Sound.play('specialKill');

      // 鸡腿雨特效
      Effects.drumstickRain(e.gridX, e.gridY);

      // 横幅
      const banners = {
        ghost: '\u{1F389} \u5FEB\u7ED9\u6D4B\u8BD5\u52A0\u9E21\u817F\uFF01\u5E7D\u7075Bug\u5DF2\u5C01\u5370\uFF01',
        crash: '\u{1F389} \u5FEB\u7ED9\u6D4B\u8BD5\u52A0\u9E21\u817F\uFF01\u907F\u514D\u4E86\u4E00\u6B21\u7EBF\u4E0A\u6B7B\u673A\uFF01',
        p0: '\u{1F389} \u5FEB\u7ED9\u6D4B\u8BD5\u52A0\u9E21\u817F\uFF01P0\u5DF2\u62E6\u622A\uFF01',
      };
      Effects.banner(banners[e.type]);

      // P0 击杀掉落血包概率更高
      if (e.type === 'p0') {
        Pickup.tryDrop(e.gridX, e.gridY);
        Pickup.dropChance = 0.18; // 重置
      }

    } else {
      // 普通 Bug 击杀
      Effects.floatText(Danmaku.getKillFloat(), 
        e.gridX * CELL_SIZE + CELL_SIZE/2, e.gridY * CELL_SIZE, '#4ade80');
      Danmaku.show('kill');
      Sound.play('kill');

      // 杀Bug后有40%概率在Bug位置生成屎山 — "改Bug产生新屎山"
      if (Math.random() < 0.4) {
        if (GameMap.spawnShishanAt(e.gridX, e.gridY)) {
          Effects.particle(
            e.gridX * CELL_SIZE + CELL_SIZE/2,
            e.gridY * CELL_SIZE + CELL_SIZE/2,
            '#92400e'
          );
          Effects.floatText('\u{1F4A9} 又改出新屎山了',
            e.gridX * CELL_SIZE + CELL_SIZE/2, e.gridY * CELL_SIZE - 10, '#84cc16');
        }
      }
    }

    // 分裂
    if (e.splitOnDeath) {
      const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
      let split = 0;
      for (const [dx, dy] of dirs) {
        if (split >= 2) break;
        if (GameMap.isWalkable(e.gridX + dx, e.gridY + dy) && !Bomb.isAt(e.gridX + dx, e.gridY + dy)) {
          this.spawn('normal', e.gridX + dx, e.gridY + dy);
          split++;
        }
      }
    }
  },

  update() {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const e = this.list[i];
      if (!e.alive) {
        this.list.splice(i, 1);
        continue;
      }

      // 出生动画
      if (e.spawnAnim > 0) {
        e.spawnAnim--;
      }

      // 死机虫 — 不移动，倒计时爆炸
      if (e.config.stationary) {
        e.explodeCountdown--;
        
        // 倒计时警告
        if (e.explodeCountdown <= 120 && e.explodeCountdown > 0) {
          // 最后 2 秒闪烁红光
          if (Math.floor(e.explodeCountdown / 10) % 2 === 0) {
            Effects.particle(
              e.pixelX + CELL_SIZE/2,
              e.pixelY + CELL_SIZE/2,
              '#ef4444'
            );
          }
        }

        // 倒计时归零 — 爆炸！
        if (e.explodeCountdown <= 0) {
          // 范围爆炸 — 3x3 范围
          e.alive = false;
          this.killStats.crash++;
          
          Effects.bigShake();
          Effects.explosion(e.gridX, e.gridY);
          Sound.play('explode');

          // 3x3 范围伤害
          for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
              const fx = e.gridX + dx;
              const fy = e.gridY + dy;
              Effects.explosion(fx, fy);
              // 伤害玩家
              if (Player.gridX === fx && Player.gridY === fy) {
                Player.hit();
              }
            }
          }

          Effects.floatText('\u{1F4A5} \u7EBF\u4E0A\u6B7B\u673A\uFF01\u6D4B\u8BD5\u88AB\u70B9\u71C3\u4E86\uFF01',
            e.gridX * CELL_SIZE + CELL_SIZE/2, e.gridY * CELL_SIZE, '#ef4444');
          Effects.banner('\u{1F6A8} \u7EBF\u4E0A\u4E8B\u6545\uFF01\u6B7B\u673A Bug \u7206\u70B8\u4E86\uFF01');
          Danmaku.show('crashExplode');
          continue;
        }
        continue; // 死机虫不移动
      }

      // 幽灵虫 — 忽隐忽现
      if (e.config.flicker) {
        e.flickerTimer++;
        // 3秒周期：2.4秒可见，0.6秒消失
        const cycle = e.flickerTimer % 180;
        e.visible = cycle < 144;
      }

      // 平滑移动
      if (e.moving) {
        const dx = e.targetX - e.pixelX;
        const dy = e.targetY - e.pixelY;

        if (Math.abs(dx) <= e.speed && Math.abs(dy) <= e.speed) {
          e.pixelX = e.targetX;
          e.pixelY = e.targetY;
          e.moving = false;
        } else {
          e.pixelX += Math.sign(dx) * e.speed;
          e.pixelY += Math.sign(dy) * e.speed;
        }
      }

      // 随机游走
      if (!e.moving) {
        const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
        if (Math.random() < 0.3) {
          e.dir = Math.floor(Math.random() * 4);
        }

        const [dx, dy] = dirs[e.dir];
        const nx = e.gridX + dx;
        const ny = e.gridY + dy;

        // 幽灵虫可以穿屎山
        if (e.config.phasing) {
          const tile = GameMap.get(nx, ny);
          if (tile !== TILE.WALL && !Bomb.isAt(nx, ny)) {
            e.gridX = nx;
            e.gridY = ny;
            e.targetX = nx * CELL_SIZE;
            e.targetY = ny * CELL_SIZE;
            e.moving = true;
          } else {
            e.dir = Math.floor(Math.random() * 4);
          }
        } else {
          if (GameMap.isWalkable(nx, ny) && !Bomb.isAt(nx, ny)) {
            e.gridX = nx;
            e.gridY = ny;
            e.targetX = nx * CELL_SIZE;
            e.targetY = ny * CELL_SIZE;
            e.moving = true;
          } else {
            e.dir = Math.floor(Math.random() * 4);
          }
        }
      }

      // 碰到玩家
      if (e.gridX === Player.gridX && e.gridY === Player.gridY) {
        Player.hit();
      }

      // 碰到火焰
      if (Bomb.isFireAt(e.gridX, e.gridY)) {
        e.health--;
        if (e.health <= 0) {
          e.alive = false;
          this.killStats[e.type]++;
          this.onKill(e);
        }
      }
    }

    HUD.update();
  },

  count() {
    return this.list.filter(e => e.alive).length;
  },

  // 按类型计数
  countByType(type) {
    return this.list.filter(e => e.alive && e.type === type).length;
  },
};
