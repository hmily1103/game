// ========== 研发写 Bug 系统 ==========

const DeveloperSystem = {
  timer: 0,
  interval: 8,
  spawnPerCycle: 1,
  active: true,

  init() {
    this.interval = RuleEngine.config.devSpawnDelay;
    this.spawnPerCycle = RuleEngine.config.devSpawnCount;
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
    Game.devTriggers++;
    for (let i = 0; i < this.spawnPerCycle; i++) {
      Enemy.spawn();
    }

    // 随机搞笑横幅
    Effects.randomDevBanner();
    Effects.flashBorder('dev');
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

    // 角色动画 — DEV 举手 + 气泡
    const devLines = [
      '又写了新Bug~', '在我这能跑啊', '别怕加了try-catch',
      '这是特性不是Bug', '上线再说！', '新功能写好了~',
    ];
    Characters.devAction(devLines[Math.floor(Math.random() * devLines.length)]);

    // 下次触发加随机抖动 — 更像"系统失控"而非定时器
    this.timer = (this.interval + (Math.random() - 0.5) * 4) * 60;
  },
};
