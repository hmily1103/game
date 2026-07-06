// ========== 游戏全局配置统一管理 ==========
const GameConfig = {
  // ========== 基础游戏参数 ==========
  GRID_SIZE: 13,
  CELL_SIZE: 42,

  // ========== Bug 系统 ==========
  bugs: {
    maxAlive: 12,           // 最大同时存活 Bug 数
    spawnInterval: {
      normal: 8000,        // 普通 Bug 生成间隔（毫秒
      ghost: 30000,        // 幽灵 Bug 生成间隔
      crash: 40000,        // 死机 Bug 生成间隔
      p0: 60000,           // P0 Bug 生成间隔
      boss: 60000          // Boss 生成间隔
    }
  },

  // ========== 粒子/特效系统 ==========
  particles: {
    maxParticles: 120,     // 最大粒子数（降低从200优化性能
    maxFlyingPoops: 15,    // 最大飞射屎山碎片
    maxDrumsticks: 20      // 最大鸡腿粒子
  },

  // ========== 游戏时长/难度 ==========
  difficulty: {
    startLevel: 1,
    maxLevel: 10,
    // 随时间难度提升
    rampInterval: 60000,  // 每60秒难度提升一次
    bugSpeedMultiplier: 1.05,  // 每次难度提升 Bug 速度增加5%
    spawnRateMultiplier: 0.95,  // 每次难度提升 生成间隔减少5%
  },

  // ========== 胜利条件 ==========
  victory: {
    clearRateRequirement: 0.7,  // 屎山清除率要求
  },

  // ========== UI/显示 ==========
  ui: {
    comboWindow: 3000,    // 连击时间窗口（毫秒
  },

  // ========== 音效 ==========
  sound: {
    enabled: true,
    volume: 0.8
  },

  // ========== 存档键名 ==========
  storageKeys: {
    BEST_SCORE: 'bugboomer_best_score',
    BEST_COMBO: 'bugboomer_best_combo',
    TOTAL_GAMES: 'bugboomer_total_games',
    TOTAL_KILLS: 'bugboomer_total_kills',
    SETTINGS: 'bugboomer_settings',
    PLAYED: 'bugboomer_played'
  }
};
