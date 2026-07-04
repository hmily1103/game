// ========== 屎山复活系统（AI 规则驱动） ==========

const ShishanSystem = {
  regenTimer: 0,
  regenInterval: 0,   // 0 = 不自愈
  regenPercent: 0,    // 复活比例

  init() {
    this.regenInterval = RuleEngine.config.shishanRegenInterval;
    this.regenPercent = RuleEngine.config.shishanRegenPercent;

    if (this.regenInterval > 0) {
      this.regenTimer = this.regenInterval * 60;
    }
  },

  update() {
    if (this.regenInterval <= 0) return;

    this.regenTimer--;
    if (this.regenTimer <= 0) {
      this.regen();
      this.regenTimer = this.regenInterval * 60;
    }
  },

  regen() {
    // 屎山已达上限则不复活
    if (GameMap.countShishan() >= GameMap.maxShishan) return;

    // 复活一定百分比的已摧毁屎山，但不超过上限
    const toRegen = Math.min(
      Math.ceil(GameMap.destroyedShishan * this.regenPercent),
      GameMap.maxShishan - GameMap.countShishan()
    );
    let regenned = 0;

    for (let i = 0; i < toRegen; i++) {
      const pos = GameMap.getRandomEmptyCell();
      if (pos && GameMap.respawnShishan(pos.x, pos.y)) {
        regenned++;
        Effects.particle(pos.x * CELL_SIZE + CELL_SIZE/2, pos.y * CELL_SIZE + CELL_SIZE/2, '#92400e');
      }
    }

    if (regenned > 0) {
      Effects.floatText('💩 屎山又堆起来了！', 273, 273, '#84cc16');
      Effects.shake();
    }
  },
};
