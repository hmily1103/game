// ========== 炸弹/爆炸系统 ==========

const Bomb = {
  list: [],
  fireList: [],

  init() {
    this.list = [];
    this.fireList = [];
  },

  isAt(x, y) {
    return this.list.some(b => b.gridX === x && b.gridY === y && !b.exploded);
  },

  place(x, y) {
    this.list.push({
      gridX: x,
      gridY: y,
      timer: RuleEngine.config.bombTimer * 60,
      exploded: false,
    });
  },

  update() {
    if (Game.state !== 'playing') return;
    for (const bomb of this.list) {
      if (bomb.exploded) continue;
      bomb.timer--;

      if (bomb.timer <= 0) {
        this.explode(bomb);
      }
    }

    for (let i = this.fireList.length - 1; i >= 0; i--) {
      this.fireList[i].timer--;
      if (this.fireList[i].timer <= 0) {
        this.fireList.splice(i, 1);
      }
    }

    this.list = this.list.filter(b => !b.exploded);
  },

  explode(bomb) {
    bomb.exploded = true;
    Sound.play('explode');
    Effects.shake();
    Effects.explosion(bomb.gridX, bomb.gridY);
    Effects.floatText('\u{1F4A5}', bomb.gridX * CELL_SIZE + CELL_SIZE / 2, bomb.gridY * CELL_SIZE, '#F59E0B');

    // 炸弹范围 — 基于玩家 bombRange，技术债爆炸时+1
    const range = (Player.bombRange || 3) + (RuleEngine.config.chainExplosionBoost ? 1 : 0);
    const fireDuration = 30;

    // 测试环境隔离 — 炸弹只炸屎山不炸Bug
    const testIsolation = RuleEngine.config.testIsolation;

    this.addFire(bomb.gridX, bomb.gridY, fireDuration);

    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (const [dx, dy] of dirs) {
      for (let i = 1; i <= range; i++) {
        const fx = bomb.gridX + dx * i;
        const fy = bomb.gridY + dy * i;
        const tile = GameMap.get(fx, fy);

        if (tile === TILE.WALL) break;
        // 屎山分层 — 普通1血/硬2血/祖传3血
        if (tile === TILE.SHISHAN || tile === TILE.SHISHAN_HARD || tile === TILE.SHISHAN_LEGACY) {
          const key = fx + ',' + fy;
          const maxHp = tile === TILE.SHISHAN_LEGACY ? 3 : tile === TILE.SHISHAN_HARD ? 2 : 1;
          const currentHp = (GameMap.shishanHealth[key] !== undefined) ? GameMap.shishanHealth[key] : maxHp;
          const newHp = currentHp - 1;

          if (newHp <= 0) {
            // 彻底炸掉
            GameMap.destroyShishan(fx, fy);
            this.addFire(fx, fy, fireDuration);
            Effects.floatText(
              tile === TILE.SHISHAN_LEGACY ? '\u{1F4A3} \u7956\u4F20\u4EE3\u7801\u5D29\u6E83\uFF01' : '\u{1F4A9} \u6280\u672F\u503A\u6E05\u9664\uFF01',
              fx * CELL_SIZE + CELL_SIZE / 2, fy * CELL_SIZE, tile === TILE.SHISHAN_LEGACY ? '#f59e0b' : '#84cc16');
            if (tile === TILE.SHISHAN_LEGACY) {
              Pickup.tryDrop(fx, fy);
              Pickup.tryDrop(fx, fy);
              Effects.bigShake();
            }
            if (tile !== TILE.SHISHAN_LEGACY) Pickup.tryDrop(fx, fy);
          } else {
            // 还没炸掉 — 扣血警告
            GameMap.shishanHealth[key] = newHp;
            this.addFire(fx, fy, fireDuration);
            Effects.floatText('\u{1F4A9} \u8FD8\u5DEE ' + newHp + ' \u6B21\uFF01',
              fx * CELL_SIZE + CELL_SIZE / 2, fy * CELL_SIZE, '#fbbf24');
            Effects.shake();
          }
          Sound.play('kill');
          Roast.trigger('destroyShishan');
          break;
        }

        this.addFire(fx, fy, fireDuration);

        // 测试环境隔离模式下炸弹不伤害Bug
        if (!testIsolation) {
          const killed = Enemy.killAt(fx, fy);
          if (killed) {
            Effects.explosion(fx, fy);
            Effects.floatText(Danmaku.getKillFloat(), fx * CELL_SIZE + CELL_SIZE / 2, fy * CELL_SIZE, '#4ade80');
            Danmaku.show('kill');
            Sound.play('kill');
            Roast.trigger('killBug');
          }
        }

        if (Player.gridX === fx && Player.gridY === fy) {
          Player.hit();
        }

        const otherBomb = this.list.find(b => b.gridX === fx && b.gridY === fy && !b.exploded);
        if (otherBomb) {
          otherBomb.timer = 1;
        }
      }
    }

    Player.activeBombs = Math.max(0, Player.activeBombs - 1);
  },

  addFire(x, y, duration) {
    this.fireList.push({ gridX: x, gridY: y, timer: duration });
  },

  isFireAt(x, y) {
    return this.fireList.some(f => f.gridX === x && f.gridY === y);
  },
};
