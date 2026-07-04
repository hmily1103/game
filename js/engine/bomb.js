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
      fireCells: [],
    });
  },

  update() {
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

    this.list = this.list.filter(b => !b.exploded || b.fireCells.length > 0);
  },

  explode(bomb) {
    bomb.exploded = true;
    Sound.play('explode');
    Effects.shake();
    Effects.explosion(bomb.gridX, bomb.gridY);
    Effects.floatText('\u{1F4A5}', bomb.gridX * CELL_SIZE + CELL_SIZE / 2, bomb.gridY * CELL_SIZE, '#F59E0B');

    // 炸弹范围 — 默认3格（比原来2格大），技术债爆炸时+1
    const range = RuleEngine.config.chainExplosionBoost ? 4 : 3;
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
        if (tile === TILE.SHISHAN) {
          GameMap.destroyShishan(fx, fy);
          this.addFire(fx, fy, fireDuration);
          // 加速状态下炸屎山 → 屎山飞出屏幕特效
          if (Player.speedBoost > 0) {
            Effects.shishanLaunch(fx, fy);
            Effects.bigShake();
            Effects.floatText('\u{1F4A9}\u26A1 \u5C4E\u5C71\u98DE\u51FA\u53BB\u4E86\uFF01', fx * CELL_SIZE + CELL_SIZE / 2, fy * CELL_SIZE, '#22d3ee');
            Sound.play('speed');
          } else {
            Effects.shishanDestroy(fx, fy);
            Effects.floatText('\u{1F4A9} \u5C4E\u5C71\u6E05\u7406\uFF01', fx * CELL_SIZE + CELL_SIZE / 2, fy * CELL_SIZE, '#84cc16');
          }
          Danmaku.show('kill');
          Sound.play('kill');
          Roast.trigger('destroyShishan');
          // 尝试掉落道具
          Pickup.tryDrop(fx, fy);
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

    setTimeout(() => {
      bomb.fireCells = [];
    }, fireDuration * (1000 / 60));
  },

  addFire(x, y, duration) {
    this.fireList.push({ gridX: x, gridY: y, timer: duration });
  },

  isFireAt(x, y) {
    return this.fireList.some(f => f.gridX === x && f.gridY === y);
  },
};
