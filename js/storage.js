// ========== 游戏存档/数据持久化系统 ==========
const Storage = {
  // 获取数据
  get(key, defaultValue = null) {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : defaultValue;
    } catch (e) {
      console.warn('读取本地存储失败:', e);
      return defaultValue;
    }
  },

  // 保存数据
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.warn('保存本地存储失败:', e);
      return false;
    }
  },

  // 删除数据
  remove(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (e) {
      console.warn('删除本地存储失败:', e);
      return false;
    }
  },

  // ========== 游戏数据统计 ==========
  stats: {
    getBestScore() {
      return Storage.get(GameConfig.storageKeys.BEST_SCORE, 0);
    },
    
    setBestScore(score) {
      const currentBest = this.getBestScore();
      if (score > currentBest) {
        Storage.set(GameConfig.storageKeys.BEST_SCORE, score);
        return true;
      }
      return false;
    },

    getBestCombo() {
      return Storage.get(GameConfig.storageKeys.BEST_COMBO, 0);
    },
    
    setBestCombo(combo) {
      const currentBest = this.getBestCombo();
      if (combo > currentBest) {
        Storage.set(GameConfig.storageKeys.BEST_COMBO, combo);
        return true;
      }
      return false;
    },

    getTotalGames() {
      return Storage.get(GameConfig.storageKeys.TOTAL_GAMES, 0);
    },
    
    incrementTotalGames() {
      const total = this.getTotalGames();
      Storage.set(GameConfig.storageKeys.TOTAL_GAMES, total + 1);
    },

    getTotalKills() {
      return Storage.get(GameConfig.storageKeys.TOTAL_KILLS, 0);
    },
    
    addKills(kills) {
      const total = this.getTotalKills();
      Storage.set(GameConfig.storageKeys.TOTAL_KILLS, total + kills);
    }
  },

  // ========== 设置 ==========
  settings: {
    get() {
      return Storage.get(GameConfig.storageKeys.SETTINGS, {
        soundEnabled: true,
        crtEnabled: true
      });
    },
    
    set(settings) {
      return Storage.set(GameConfig.storageKeys.SETTINGS, settings);
    },
    
    update(key, value) {
      const settings = this.get();
      settings[key] = value;
      return this.set(settings);
    }
  }
};
