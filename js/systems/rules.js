// ========== 规则引擎（核心） ==========
// 管理当前世界规则，控制所有系统参数

const RuleEngine = {
  // 默认配置
  config: {
    // 数值规则
    productInterval: 16,      // 产品捣乱间隔（秒）
      devSpawnDelay: 8,         // 研发写Bug间隔（秒）
      devSpawnCount: 1,         // 每次生成Bug数
      shishanRespawn: 1,        // 产品捣乱时屎山复活数量
    bugSpeed: 1.0,            // Bug速度倍率
    bombTimer: 2.0,           // 炸弹延迟（秒）
    playerSpeed: 1.2,         // 玩家速度倍率（提高移动速度）

    // 机制规则（默认关闭）
    chainExplosion: false,    // 连锁爆炸（默认就是连锁的，这里控制范围）
    shishanRegenInterval: 0,  // 屎山自愈间隔（0=不自愈）
    shishanRegenPercent: 0,   // 屎山自愈比例
    bugSplit: false,          // Bug被炸后分裂
    darkMap: false,           // 黑暗地图
    movingShishan: false,     // 移动屎山（暂不实现，预留）
    oneLife: false,           // 单命模式
    doubleBomb: false,        // 双炸弹
    friendlyFire: false,      // 炸弹只炸屎山不炸Bug
    timePressure: 0,          // 限时通关（0=不限时，>0=秒数）
    chainExplosionBoost: false, // 技术债爆炸 — 爆炸范围+1且连锁
    testIsolation: false,     // 测试环境隔离 — 炸弹只炸屎山不炸Bug
  },

  currentRules: null,  // 当前规则数据（来自 AI 或离线包）

  init() {
    this.resetConfig();
    this.currentRules = null;
  },

  resetConfig() {
    this.config = {
      productInterval: 16,
      devSpawnDelay: 8,
      devSpawnCount: 1,
      shishanRespawn: 1,
      bugSpeed: 1.0,
      bombTimer: 2.0,
      playerSpeed: 1.2,         // 与对象字面量一致
      chainExplosion: false,
      shishanRegenInterval: 0,
      shishanRegenPercent: 0,
      bugSplit: false,
      darkMap: false,
      movingShishan: false,
      oneLife: false,
      doubleBomb: false,
      friendlyFire: false,
      timePressure: 0,
      chainExplosionBoost: false,
      testIsolation: false,
    };
  },

  // 应用 AI/离线规则包
  applyRules(ruleData) {
    // 先保存 currentRules（不要被 init() 清掉）
    this.currentRules = ruleData;

    // 重置配置为默认（手动重置，不清空 currentRules）
    this.resetConfig();

    if (!ruleData || !ruleData.rules) return;

    for (const rule of ruleData.rules) {
      this.applyRule(rule);
    }

    // 应用全局效果
    if (this.config.oneLife) {
      Player.lives = 1;
      HUD.update();
    }

    if (this.config.doubleBomb) {
      Player.maxBombs = 2;
    }

    Player.setSpeed(this.config.playerSpeed);
  },

  applyRule(rule) {
    if (!rule || typeof rule !== 'object') return;

    const type = rule.type;
    const effect = rule.effect || '';

    switch (type) {
      // === 数值规则 ===
      case 'product_interval':
        this.config.productInterval = this.extractNumber(effect) || 12;
        rule.parsedLabel = this.config.productInterval + '秒触发一次';
        break;
      case 'dev_spawn_delay':
        this.config.devSpawnDelay = this.extractNumber(effect) || 8;
        rule.parsedLabel = this.config.devSpawnDelay + '秒生成一轮';
        break;
      case 'dev_spawn_count':
        this.config.devSpawnCount = this.extractNumber(effect) || 1;
        rule.parsedLabel = '每轮生成' + this.config.devSpawnCount + '个';
        break;
      case 'shishan_respawn':
        this.config.shishanRespawn = this.extractNumber(effect) || 1;
        rule.parsedLabel = '每次复活' + this.config.shishanRespawn + '块';
        break;
      case 'bug_speed':
        this.config.bugSpeed = this.extractNumber(effect) || 1.0;
        rule.parsedLabel = this.config.bugSpeed + 'x 速度';
        break;
      case 'bomb_timer':
        this.config.bombTimer = this.extractNumber(effect) || 2.0;
        rule.parsedLabel = this.config.bombTimer + '秒后爆炸';
        break;
      case 'player_speed':
        this.config.playerSpeed = this.extractNumber(effect) || 1.0;
        rule.parsedLabel = this.config.playerSpeed + 'x 移动速度';
        break;

      // === 机制规则 ===
      case 'chain_explosion':
        this.config.chainExplosion = true;
        this.config.chainExplosionBoost = true;  // 映射到实际生效的配置
        rule.parsedLabel = '连锁爆炸已启用';
        break;
      case 'shishan_regen':
        this.config.shishanRegenInterval = this.extractNumber(effect, 'interval') || 5;
        this.config.shishanRegenPercent = this.extractNumber(effect, 'percent') || 0.5;
        rule.parsedLabel = this.config.shishanRegenInterval + '秒恢复 ' + Math.round(this.config.shishanRegenPercent * 100) + '%';
        break;
      case 'bug_split':
        this.config.bugSplit = true;
        rule.parsedLabel = '击杀后会分裂';
        break;
      case 'dark_map':
        this.config.darkMap = true;
        rule.parsedLabel = '视野限制已启用';
        break;
      case 'one_life':
        this.config.oneLife = true;
        rule.parsedLabel = '单命模式已启用';
        break;
      case 'double_bomb':
        this.config.doubleBomb = true;
        rule.parsedLabel = '最大炸弹数 = 2';
        break;
      case 'friendly_fire':
        this.config.friendlyFire = true;
        this.config.testIsolation = true;  // friendly_fire 映射到 testIsolation（实际生效的配置）
        rule.parsedLabel = '炸弹只清地形';
        break;
      case 'time_pressure':
        this.config.timePressure = this.extractNumber(effect) || 60;
        rule.parsedLabel = this.config.timePressure + '秒限时';
        break;

      // === 高可见度机制规则 ===
      case 'chain_explosion_boost':
        this.config.chainExplosionBoost = true;
        rule.parsedLabel = '爆炸范围 +1';
        break;
      case 'test_isolation':
        this.config.testIsolation = true;
        rule.parsedLabel = '炸弹不伤 Bug';
        break;

      // 通用类型（AI 可能返回的类型名）
      case 'product_chaos':
        this.config.productInterval = Math.max(4, this.config.productInterval - 6);
        this.config.shishanRespawn += 1;
        rule.parsedLabel = '产品间隔=' + this.config.productInterval + '秒，复活=' + this.config.shishanRespawn + '块';
        break;
      case 'dev_rush':
        this.config.devSpawnDelay = Math.max(3, this.config.devSpawnDelay - 4);
        this.config.devSpawnCount = Math.max(2, this.config.devSpawnCount + 1);
        rule.parsedLabel = '刷 Bug 间隔=' + this.config.devSpawnDelay + '秒，每轮=' + this.config.devSpawnCount + '个';
        break;
      default:
        rule.parsedLabel = '机制规则已记录';
        break;
    }
  },

  // 从效果描述中提取数字
  extractNumber(text, key) {
    if (typeof text !== 'string') return null;

    if (key === 'interval') {
      const intervalMatch = text.match(/(\d+\.?\d*)\s*(?:s|秒)/i);
      if (intervalMatch) return parseFloat(intervalMatch[1]);
    }

    if (key === 'percent') {
      const percentMatch = text.match(/(\d+\.?\d*)\s*%/);
      if (percentMatch) return parseFloat(percentMatch[1]) / 100;
    }

    // 尝试匹配 "interval: 5" 或 "5s" 或 "x2" 等模式
    const patterns = [
      /x\s*(\d+\.?\d*)/i,           // x2
      /(\d+\.?\d*)\s*s/i,          // 5s
      /(\d+\.?\d*)\s*秒/,           // 5秒
      /(\d+\.?\d*)\s*%/,            // 50%
      /(\d+\.?\d*)/,                // 纯数字
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return parseFloat(match[1]);
    }

    return null;
  },

  // 重新初始化所有系统（规则变化后调用）
  refreshSystems() {
    ProductSystem.init();
    DeveloperSystem.init();
    ShishanSystem.init();
  },
};
