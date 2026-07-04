// ========== 产品捣乱系统 ==========

const ProductSystem = {
  timer: 0,
  interval: 12,
  active: true,

  init() {
    this.interval = RuleEngine.config.productInterval;
    // 第一次触发提前到 1/3 时间，让前30秒有节奏感
    this.timer = Math.min(this.interval * 20, this.interval * 60);
    this.active = true;
  },

  update() {
    if (!this.active) return;

    this.timer--;
    if (this.timer <= 0) {
      this.trigger();
      this.timer = this.interval * 60;
    }
  },

  trigger() {
    Game.productTriggers++;
    const respawnCount = RuleEngine.config.shishanRespawn;
    let actualRespawn = 0;

    for (let i = 0; i < respawnCount; i++) {
      // 屎山已达上限则不再添加
      if (GameMap.countShishan() >= GameMap.maxShishan) break;
      const pos = GameMap.getRandomShishanAdjacent();
      if (pos && GameMap.respawnShishan(pos.x, pos.y)) {
        actualRespawn++;
        Effects.particle(pos.x * CELL_SIZE + CELL_SIZE / 2, pos.y * CELL_SIZE + CELL_SIZE / 2, '#92400e');
      }
    }

    // 随机搞笑横幅
    Effects.randomProductBanner();
    Effects.flashBorder();
    Danmaku.show('product');
    if (actualRespawn > 0) {
      Danmaku.show('shishan');
    }
    Sound.play('productChaos');

    // 产品经理角色吐槽 — 高亮规则面板
    Panel.flashRole('product');
    const productQuotes = [
      '产品：我觉得这只是小改',
      '产品：这个需求很简单的',
      '产品：就改一行代码的事',
      '产品：用户说要加个功能',
      '产品：明天能上线吗？',
    ];
    Effects.banner('💼 ' + productQuotes[Math.floor(Math.random() * productQuotes.length)]);
  },
};
