// ========== HUD 更新（精致版） ==========

const HUD = {
  update() {
    const lives = document.getElementById('lives');
    const bugCount = document.getElementById('bug-count');
    const clearRate = document.getElementById('clear-rate');

    if (lives) {
      lives.textContent = Player.lives;
      const livesParent = lives.parentElement;
      // 1条命时心跳警告
      if (Player.lives === 1 && !Player.dead) {
        livesParent.classList.add('heart-critical');
      } else {
        livesParent.classList.remove('heart-critical');
      }
    }

    // 最后一条命 — 全屏红灯警告
    const canvasContainer = document.querySelector('.canvas-container');
    if (canvasContainer) {
      if (Player.lives === 1 && !Player.dead) {
        canvasContainer.classList.add('danger');
      } else {
        canvasContainer.classList.remove('danger');
      }
    }

    if (bugCount) {
      const count = Enemy.count();
      if (parseInt(bugCount.textContent) !== count) {
        bugCount.textContent = count;
        bugCount.classList.add('bug-count-pop');
        setTimeout(() => bugCount.classList.remove('bug-count-pop'), 300);
      }
    }

    if (clearRate) {
      const rate = Math.floor(GameMap.getClearRate() * 100);
      // 清除进度 — 直接对应通关条件「清除率≥70%」
      clearRate.textContent = '清除 ' + rate + '%';
      if (rate >= 70) {
        clearRate.style.color = '#10B981';
      } else if (rate >= 40) {
        clearRate.style.color = '#fbbf24';
      } else {
        clearRate.style.color = '#94a3b8';
      }
    }

    // 系统稳定度 — 达标≥95%即可通关
    const stabilityEl = document.getElementById('stability-hud');
    if (stabilityEl) {
      const stability = typeof getSystemStability === 'function' ? getSystemStability() : 50;
      stabilityEl.textContent = '稳定度 ' + stability + '%';
      if (stability >= 95) {
        stabilityEl.style.color = '#10B981';
        stabilityEl.style.fontWeight = 'bold';
      } else if (stability >= 70) {
        stabilityEl.style.color = '#fbbf24';
        stabilityEl.style.fontWeight = 'normal';
      } else {
        stabilityEl.style.color = '#ef4444';
        stabilityEl.style.fontWeight = 'normal';
      }
    }

    // 加速指示器
    const speedHud = document.getElementById('speed-hud');
    if (speedHud) {
      if (Player.speedBoost > 0) {
        speedHud.style.display = '';
        const seconds = Math.ceil(Player.speedBoost / 60);
        const speedTimer = document.getElementById('speed-timer');
        if (speedTimer) {
          speedTimer.textContent = seconds;
          speedTimer.style.color = '#22d3ee';
        }
        // 最后3秒闪烁
        if (Player.speedBoost < 180) {
          speedHud.classList.add('heart-critical');
        } else {
          speedHud.classList.remove('heart-critical');
        }
      } else {
        speedHud.style.display = 'none';
        speedHud.classList.remove('heart-critical');
      }
    }

    // XP 进度条
    const xpBar = document.getElementById('xp-bar');
    const xpFill = document.getElementById('xp-fill');
    const xpLabel = document.getElementById('xp-label');
    if (xpBar && xpFill && xpLabel) {
      const xpNeeded = Game.level * Game.xpPerLevel;
      const pct = Math.min(100, Math.floor(Game.xp / xpNeeded * 100));
      xpFill.style.width = pct + '%';
      xpLabel.textContent = 'Lv.' + Game.level + ' (' + Game.xp + '/' + xpNeeded + ')';
    }

    // 连击显示
    const comboEl = document.getElementById('combo-hud');
    if (comboEl) {
      if (Game.combo >= 3) {
        comboEl.style.display = '';
        comboEl.textContent = '🔥 x' + Game.combo;
        comboEl.style.color = Game.combo >= 5 ? '#f59e0b' : '#22d3ee';
        comboEl.style.fontWeight = 'bold';
        comboEl.style.animation = Game.combo >= 5 ? 'combo-pulse 0.5s ease infinite' : 'none';
      } else if (Game.combo >= 2) {
        comboEl.style.display = '';
        comboEl.textContent = 'x' + Game.combo;
        comboEl.style.color = '#a78bfa';
        comboEl.style.fontWeight = 'normal';
        comboEl.style.animation = 'none';
      } else {
        comboEl.style.display = 'none';
      }
    }
  },
};
