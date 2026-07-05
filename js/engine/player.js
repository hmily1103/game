// ========== 玩家系统 ==========

const Player = {
  gridX: 1,
  gridY: 1,
  pixelX: 0,
  pixelY: 0,
  targetX: 0,
  targetY: 0,
  moving: false,
  speed: 4,            // 像素/帧
  baseSpeed: 4,        // 基础速度（提高移动速度）
  speedBoost: 0,       // 加速剩余帧
  lives: 3,
  maxBombs: 1,   // 默认1个炸弹（doubleBomb规则可提升到2）
  activeBombs: 0,
  invincible: 0,       // 无敌帧计数
  dead: false,

  init() {
    this.gridX = 1;
    this.gridY = 1;
    this.pixelX = this.gridX * CELL_SIZE;
    this.pixelY = this.gridY * CELL_SIZE;
    this.targetX = this.pixelX;
    this.targetY = this.pixelY;
    this.moving = false;
    this.lives = 3;
    this.maxBombs = 1;
    this.activeBombs = 0;
    this.invincible = 0;
    this.dead = false;
    this.speedBoost = 0;
    this.speed = this.baseSpeed;  // 确保重置后速度正确
  },

  setSpeed(multiplier) {
    this.baseSpeed = 4 * multiplier;  // 基数从3提高到4
    this.speed = this.baseSpeed;
  },

  tryMove(dx, dy) {
    if (this.moving || this.dead) return;

    const nx = this.gridX + dx;
    const ny = this.gridY + dy;

    if (GameMap.isWalkable(nx, ny) && !Bomb.isAt(nx, ny)) {
      // 检查是否有 Bug 怪（不能穿过）
      this.gridX = nx;
      this.gridY = ny;
      this.targetX = nx * CELL_SIZE;
      this.targetY = ny * CELL_SIZE;
      this.moving = true;
    }
  },

  update() {
    if (this.dead) return;

    // 加速效果递减
    if (this.speedBoost > 0) {
      this.speedBoost--;
      this.speed = this.baseSpeed * 2; // 加速时2倍速
      if (this.speedBoost === 0) {
        this.speed = this.baseSpeed; // 恢复
      }
    }

    // 平滑移动
    if (this.moving) {
      const dx = this.targetX - this.pixelX;
      const dy = this.targetY - this.pixelY;

      if (Math.abs(dx) <= this.speed && Math.abs(dy) <= this.speed) {
        this.pixelX = this.targetX;
        this.pixelY = this.targetY;
        this.moving = false;
      } else {
        this.pixelX += Math.sign(dx) * this.speed;
        this.pixelY += Math.sign(dy) * this.speed;
      }
    }

    // 无敌帧递减
    if (this.invincible > 0) this.invincible--;

    // 持续按键移动（当不移动时检查按键状态）
    if (!this.moving && !this.dead) {
      if (Input.left) this.tryMove(-1, 0);
      else if (Input.right) this.tryMove(1, 0);
      else if (Input.up) this.tryMove(0, -1);
      else if (Input.down) this.tryMove(0, 1);
    }
  },

  placeBomb() {
    if (this.dead) return;
    if (this.activeBombs >= this.maxBombs) return;
    if (Bomb.isAt(this.gridX, this.gridY)) return;

    Bomb.place(this.gridX, this.gridY);
    this.activeBombs++;
    Sound.play('place');
    Roast.trigger('placeBomb');
  },

  hit() {
    if (this.invincible > 0 || this.dead) return;

    this.lives--;
    this.invincible = 90; // 1.5秒无敌（60fps）

    Danmaku.show('death');
    Sound.play('death');
    Effects.deathSmoke(this.gridX, this.gridY);
    Roast.trigger('takeDamage');

    if (this.lives <= 0) {
      this.dead = true;
      Game.state = 'lost';
      Effects.bigShake();
      Danmaku.showBatch('death', 3);
      // 直接触发结算页，不依赖 checkWinCondition
      showEndScreen(false);
    } else {
      Effects.shake();
    }

    HUD.update();
  },
};
