// ========== 产品捣乱系统 ==========

const ProductSystem = {
  timer: 0,
  interval: 12,
  active: true,

  init() {
    this.interval = RuleEngine.config.productInterval;
    // 第一次触发为完整间隔，给玩家适应时间
    this.timer = this.interval * 60;
    this.active = true;
  },

  update() {
    if (Game.state !== 'playing') return;
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
    Effects.flashBorder('product');
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

    // 角色动画 — PM 举手 + 气泡
    const productLines = [
      '新需求提了！', '就改一行代码', '这个很简单啦~',
      '用户想要个功能', '加个按钮就行', '紧急需求！',
    ];
    Characters.productAction(productLines[Math.floor(Math.random() * productLines.length)]);

    // 下次触发加随机抖动 — 更像"系统失控"而非定时器
    this.timer = (this.interval + (Math.random() - 0.5) * 4) * 60;
  },
};
