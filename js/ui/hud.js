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
      clearRate.textContent = rate + '%';
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
  },
};
