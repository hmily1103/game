// ========== 研发写 Bug 系统 ==========

const DeveloperSystem = {
  timer: 0,
  interval: 8,
  spawnPerCycle: 1,
  active: true,

  init() {
    this.interval = RuleEngine.config.devSpawnDelay;
    this.spawnPerCycle = RuleEngine.config.devSpawnCount;
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
    Game.devTriggers++;
    for (let i = 0; i < this.spawnPerCycle; i++) {
      Enemy.spawn();
    }

    // 随机搞笑横幅
    Effects.randomDevBanner();
    Danmaku.show('dev');
    Sound.play('devSpawn');

    // 研发角色吐槽 — 高亮规则面板
    Panel.flashRole('dev');
    const devQuotes = [
      '研发：在我电脑上没问题啊',
      '研发：这不是Bug，这是特性',
      '研发：我加了try-catch，应该没问题',
      '研发：这行代码我昨天写的...今天就看不懂了',
      '研发：先上线再说，Bug后面再修',
    ];
    Effects.banner('👨\u200d💻 ' + devQuotes[Math.floor(Math.random() * devQuotes.length)]);
  },
};
