// ========== 主入口 / 游戏循环 ==========

const Input = {
  left: false,
  right: false,
  up: false,
  down: false,
};

const Game = {
  state: 'input',
  lastTime: 0,
  frameCount: 0,
  startTime: 0,
  lastInput: '',
  pendingRuleData: null,
  totalKills: 0,
  productTriggers: 0,  // 需求变更次数
  devTriggers: 0,      // 研发写Bug次数
  // 特殊 Bug 生成计时器
  ghostSpawnTimer: 0,
  crashSpawnTimer: 0,
  p0SpawnTimer: 0,
  bossSpawnTimer: 0,
  // 特殊 Bug 生成间隔（帧）
  ghostInterval: 1800,  // 30秒
  crashInterval: 2400,  // 40秒
  p0Interval: 3600,     // 60秒
  bossInterval: 5400,   // 90秒
  // 发呆检测
  idleTimer: 0,
  idleThreshold: 360,   // 6秒不动触发吐槽
  // Bug 浪潮计时器
  bugWaveTimer: 0,
  bugWaveInterval: 2700, // 约45秒触发一次"一大波Bug"
  bugWaveTriggered: false, // 是否已触发过
  // 战场引导提示
  hintQueue: [],
  hintTimer: 0,
};

// 搞笑死因列表
const deathCauses = [
  '死因：被需求变更淹没',
  '死因：Bug太多，选择躺平',
  '死因：被产品经理的嘴遁击杀',
  '死因：屎山塌方，被埋',
  '死因：加班到猝死',
  '死因：试图一个人测完所有Bug',
  '死因：研发说"在我电脑上不会死啊"',
  '死因：被Bug围殴',
  '死因：用了删库跑路脚本',
  '死因：版本发布前夜，倒下了',
];

// 毒舌总结 — 胜利时，基于数据生成适合截图传播的文案
function getVictoryRoast(stats) {
  const roasts = [];
  if (stats.bugsKilled >= 15) {
    roasts.push('🏆 Bug杀手：今天炸的Bug比产品改的需求还多');
  }
  if (stats.productTriggers >= 8) {
    roasts.push('🛡️ 需求盾牌：扛住了' + stats.productTriggers + '次需求变更还没死');
  }
  if (stats.elapsed < 60) {
    roasts.push('⚡ 闪电通关：' + Math.floor(stats.elapsed) + '秒通关，产品还没来得及写新需求');
  }
  if (stats.clearRate === 100) {
    roasts.push('🧹 屎山清道夫：100%清除率，连前同事的祖传代码都没放过');
  }
  if (stats.ghostKills > 0 && stats.p0Kills > 0) {
    roasts.push('👻 P0终结者：幽灵和P0都倒在了你的炸弹下');
  }
  if (stats.bossKills > 0) {
    roasts.push('😈 屠Boss者：连Boss Bug都被你炸翻了，产品看了都害怕');
  }
  if (roasts.length === 0) {
    roasts.push('📝 虽然赢了，但产品已经开始写下一轮需求了');
  }
  return roasts[Math.floor(Math.random() * roasts.length)];
}

// 毒舌总结 — 失败时
function getDeathRoast(stats) {
  const roasts = [];
  if (stats.remainingBugs > 10) {
    roasts.push('💀 Bug太多，测试工程师选择了物理退出');
  }
  if (stats.productTriggers > 6) {
    roasts.push('💼 被产品经理的' + stats.productTriggers + '次需求变更活活坑死');
  }
  if (stats.clearRate < 20) {
    roasts.push('💩 屎山太厚，连铲子都铲不动');
  }
  if (stats.elapsed < 30) {
    roasts.push('⏱️ 存活' + Math.floor(stats.elapsed) + '秒就没了，比需求变更还快');
  }
  if (roasts.length === 0) {
    roasts.push('💀 别灰心，Bug还在那里不悲不喜');
  }
  return roasts[Math.floor(Math.random() * roasts.length)];
}

// ========== 输入处理 ==========

function setupInput() {
  document.addEventListener('keydown', (e) => {
    if (Game.state !== 'playing') return;
    switch (e.key) {
      case 'ArrowLeft':
      case 'a':
      case 'A':
        Input.left = true;
        e.preventDefault();
        break;
      case 'ArrowRight':
      case 'd':
      case 'D':
        Input.right = true;
        e.preventDefault();
        break;
      case 'ArrowUp':
      case 'w':
      case 'W':
        Input.up = true;
        e.preventDefault();
        break;
      case 'ArrowDown':
      case 's':
      case 'S':
        Input.down = true;
        e.preventDefault();
        break;
      case ' ':
      case 'Spacebar':
        Player.placeBomb();
        e.preventDefault();
        break;
    }
  });

  document.addEventListener('keyup', (e) => {
    switch (e.key) {
      case 'ArrowLeft':
      case 'a':
      case 'A':
        Input.left = false;
        break;
      case 'ArrowRight':
      case 'd':
      case 'D':
        Input.right = false;
        break;
      case 'ArrowUp':
      case 'w':
      case 'W':
        Input.up = false;
        break;
      case 'ArrowDown':
      case 's':
      case 'S':
        Input.down = false;
        break;
    }
  });

  document.addEventListener('keydown', (e) => {
    if (Game.state === 'playing' && (e.key === 'Enter' || e.key === 'f' || e.key === 'F')) {
      Player.placeBomb();
    }
  });

  const input = document.getElementById('world-input');
  if (input) {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        compileWorld();
      }
    });
  }
}

// ========== 快捷输入 ==========

function quickInput(text) {
  document.getElementById('world-input').value = text;
}

// ========== 编译世界 ==========

// API 配置面板展开/收起
function toggleApiConfig() {
  const body = document.getElementById('api-config-body');
  const toggle = document.getElementById('api-config-toggle');
  if (body.style.display === 'none') {
    body.style.display = 'block';
    toggle.textContent = '▾';
  } else {
    body.style.display = 'none';
    toggle.textContent = '▸';
  }
}

// 保存 API 配置到 localStorage
function saveApiConfig() {
  const url = document.getElementById('api-url').value.trim();
  const key = document.getElementById('api-key').value.trim();
  const model = document.getElementById('api-model').value.trim();

  if (!url || !key || !model) {
    updateApiStatusLabel('请填写完整配置', '#f87171');
    return;
  }

  localStorage.setItem('bugboomer_api_url', url);
  localStorage.setItem('bugboomer_api_key', key);
  localStorage.setItem('bugboomer_api_model', model);

  Compiler.setConfig(url, key, model);
  updateApiStatusLabel('AI 接口：已配置 ✓（' + model + '）', '#4ade80');
}

// 清除 API 配置
function clearApiConfig() {
  localStorage.removeItem('bugboomer_api_url');
  localStorage.removeItem('bugboomer_api_key');
  localStorage.removeItem('bugboomer_api_model');

  document.getElementById('api-url').value = '';
  document.getElementById('api-key').value = '';
  document.getElementById('api-model').value = '';

  Compiler.setConfig('', '', '');
  updateApiStatusLabel('AI 接口：未配置（使用离线规则）', '#94a3b8');
}

// 更新状态标签
function updateApiStatusLabel(text, color) {
  const label = document.getElementById('api-status-label');
  label.textContent = text;
  label.style.color = color;
}

// 页面加载时恢复 API 配置显示
function restoreApiConfig() {
  if (Compiler.isConfigured()) {
    updateApiStatusLabel('AI 接口：已配置 ✓（' + Compiler.model + '）', '#4ade80');
    document.getElementById('api-url').value = Compiler.apiUrl;
    document.getElementById('api-model').value = Compiler.model;
  }
}

function setCompileControlsBusy(isBusy, buttonText) {
  const compileBtn = document.getElementById('compile-btn');
  const recompileBtn = document.getElementById('recompile-btn');
  const startBtn = document.getElementById('start-btn');

  compileBtn.disabled = isBusy;
  compileBtn.textContent = isBusy ? buttonText : '编译世界';

  if (recompileBtn) recompileBtn.disabled = isBusy;
  if (startBtn) startBtn.disabled = isBusy || !Game.pendingRuleData;
}

function togglePostCompileActions(show) {
  const actions = document.getElementById('post-compile-actions');
  if (actions) {
    actions.style.display = show ? 'flex' : 'none';
  }
}

function updateCompileExtraTip(ruleData) {
  const tip = document.getElementById('compile-extra-tip');
  if (!tip) return;

  if (!ruleData) {
    tip.textContent = '';
    return;
  }

  if (ruleData.rawJson) {
    tip.textContent = '你可以点击“重新编译”对比同一句输入在 AI 模型下生成的不同规则。';
    tip.style.color = '#64748b';
    return;
  }

  tip.textContent = '当前使用离线规则包：同一句输入会命中固定规则，配置 API 后可看到真正的 AI 重编译差异。';
  tip.style.color = '#fbbf24';
}

function renderCompileStatus(ruleData) {
  const status = document.getElementById('compile-status');
  status.textContent = '';
  status.style.color = '#4ade80';

  if (!ruleData || !ruleData.isHidden) {
    status.textContent = '世界编译完成！可以先看规则，再决定是否开打。';
    return;
  }

  status.appendChild(document.createTextNode('✨ 触发隐藏规则：'));
  const worldName = document.createElement('b');
  worldName.style.color = '#a78bfa';
  worldName.textContent = ruleData.worldName || '未知世界';
  status.appendChild(worldName);
  status.appendChild(document.createTextNode(' ✨'));
}

function applyCompiledWorld(input, ruleData) {
  Game.lastInput = input;
  Game.pendingRuleData = ruleData;

  renderCompileStatus(ruleData);
  RuleEngine.applyRules(ruleData);
  Panel.update(ruleData);
  togglePostCompileActions(true);
  updateCompileExtraTip(ruleData);
  setCompileControlsBusy(false, '编译世界');
}

async function compileWorld(options = {}) {
  const input = (options.inputOverride || document.getElementById('world-input').value).trim();
  const status = document.getElementById('compile-status');

  if (!input) {
    status.textContent = '请输入一句话描述你的项目状态';
    status.style.color = '#f87171';
    return;
  }

  status.textContent = '';
  setCompileControlsBusy(true, options.fastMode ? '重编译中...' : '编译中...');

  // 启动世界编译动画
  showCompileAnimation(input, (ruleData) => {
    if (ruleData) {
      applyCompiledWorld(input, ruleData);
    } else {
      status.textContent = '编译失败，请重试';
      status.style.color = '#f87171';
      setCompileControlsBusy(false, '编译世界');
    }
  }, options);
}

function recompileWorld() {
  if (!Game.lastInput) return;
  compileWorld({ fastMode: true, inputOverride: Game.lastInput });
}

function beginBattle() {
  const status = document.getElementById('compile-status');
  if (!Game.pendingRuleData) {
    status.textContent = '请先编译一个世界规则包';
    status.style.color = '#f87171';
    return;
  }

  startGame();
}

// ========== 世界编译动画 ==========

function showCompileAnimation(input, callback, options = {}) {
  const overlay = document.getElementById('compile-overlay');
  const linesDiv = document.getElementById('compile-lines');
  const bar = document.getElementById('compile-bar');
  const percentDiv = document.getElementById('compile-percent');
  const speedMultiplier = options.fastMode ? 0.35 : 1;
  const finalWait = Math.round(1800 * speedMultiplier);
  const closeDelay = options.fastMode ? 300 : 800;

  overlay.style.display = 'flex';
  linesDiv.innerHTML = '';
  bar.style.width = '0%';
  percentDiv.textContent = '0%';

  // 编译步骤文案 — 仪式感
  const steps = [
    { text: '> 解析项目黑话...', delay: 0 },
    { text: '> 识别关键词："' + input + '"', delay: Math.round(300 * speedMultiplier) },
    { text: '> 召唤产品行为模型...', delay: Math.round(600 * speedMultiplier) },
    { text: '> 注入研发失控模块...', delay: Math.round(900 * speedMultiplier) },
    { text: '> 计算屎山增长曲线...', delay: Math.round(1200 * speedMultiplier) },
    { text: '> 生成世界规则...', delay: Math.round(1500 * speedMultiplier) },
  ];

  // 逐行显示
  steps.forEach((step, i) => {
    setTimeout(() => {
      const line = document.createElement('div');
      line.className = 'compile-line active';
      line.textContent = step.text;
      linesDiv.appendChild(line);

      // 上一行标记为完成
      const prev = linesDiv.children[i - 1];
      if (prev) {
        prev.classList.remove('active');
        prev.classList.add('done');
      }

      // 更新进度条
      const pct = Math.round(((i + 1) / steps.length) * 80);
      bar.style.width = pct + '%';
      percentDiv.textContent = pct + '%';

      // 播放打字音效
      if (Sound.ctx) {
        Sound.beep(400 + i * 80, 0.05, 'square');
      }
    }, step.delay);
  });

  // 在步骤展示的同时并行调用 AI
  const aiPromise = Compiler.compile(input);

  // 步骤展示完后等 AI 结果
  setTimeout(async () => {
    const ruleData = await aiPromise;

    // 最后一步：世界编译完成
    const lastStep = steps[steps.length - 1];
    const lastLine = linesDiv.children[steps.length - 1];
    if (lastLine) {
      lastLine.classList.remove('active');
      lastLine.classList.add('done');
    }

    const doneLine = document.createElement('div');
    doneLine.className = 'compile-line active';
    doneLine.style.color = '#4ade80';
    doneLine.style.fontWeight = '700';
    doneLine.textContent = '> 世界编译完成 ✓';
    linesDiv.appendChild(doneLine);

    bar.style.width = '100%';
    percentDiv.textContent = '100%';

    if (Sound.ctx) {
      Sound.play('compileDone');
    }

    // 0.8秒后关闭动画，进入游戏
    setTimeout(() => {
      overlay.style.display = 'none';
      callback(ruleData);
    }, closeDelay);
  }, finalWait);
}

// ========== 战场引导提示 ==========

function showBattleHint(text) {
  const hint = document.getElementById('battle-hint');
  if (!hint) return;
  hint.textContent = text;
  hint.classList.add('show');
  setTimeout(() => hint.classList.remove('show'), 3000);
}

// ========== 开始游戏 ==========

function startGame() {
  document.getElementById('input-screen').classList.remove('active');
  document.getElementById('game-screen').classList.add('active');
  document.getElementById('end-screen').classList.remove('active');

  GameMap.init();
  Player.init();
  Enemy.init();
  Bomb.init();
  Pickup.init();
  RuleEngine.refreshSystems();

  // 评委试玩模式 — 首局降低难度
  const isFirstGame = !localStorage.getItem('bugboomer_played');
  if (isFirstGame) {
    // 首局：Bug速度降低20%、特殊Bug间隔加长、道具掉落率提升
    RuleEngine.config.bugSpeed *= 0.8;
    Game.ghostInterval = 2400;  // 40秒（原30秒）
    Game.crashInterval = 3000;  // 50秒（原40秒）
    Game.p0Interval = 4800;     // 80秒（原60秒）
    Game.bossInterval = 7200;   // 120秒（原90秒）
    Pickup.dropChance = 0.28;   // 28%（原18%）
    localStorage.setItem('bugboomer_played', '1');
    console.log('[评委试玩模式] 首局难度已降低');
  }

  if (RuleEngine.config.oneLife) {
    Player.lives = 1;
  }
  if (RuleEngine.config.doubleBomb) {
    Player.maxBombs = 2;
  }
  Player.setSpeed(RuleEngine.config.playerSpeed);

  if (!Sound.ctx) {
    Sound.init();
  }

  Renderer.init();

  Game.totalKills = 0;
  Game.productTriggers = 0;
  Game.devTriggers = 0;
  Game.startTime = performance.now();
  Game.ghostSpawnTimer = 0;
  Game.crashSpawnTimer = 0;
  Game.p0SpawnTimer = 0;
  Game.bossSpawnTimer = 0;
  Game.idleTimer = 0;
  Game.bugWaveTimer = 0;
  Game.bugWaveTriggered = false;

  // 战场引导提示 — 前30秒逐步出现
  Game.hintQueue = [
    { text: '💣 先炸屎山开路！', delay: 120 },    // 2秒
    { text: '🟢 杀光Bug需要引它们到炸弹范围！', delay: 360 }, // 6秒 — 关键提示
    { text: '🟢 杀光Bug + 清除70%屎山 = 通关', delay: 480 }, // 8秒
    { text: '📢 小心产品会复活屎山！', delay: 960 },  // 16秒
    { text: '💣 一大波Bug来了时优先保命！', delay: 1440 }, // 24秒
  ];
  Game.hintTimer = 0;

  Roast.init();
  HUD.update();

  Game.state = 'playing';
  Game.lastTime = performance.now();

  requestAnimationFrame(gameLoop);
}

// ========== 游戏主循环 ==========

function gameLoop(timestamp) {
  if (Game.state !== 'playing') {
    checkEndState();
    return;
  }

  Game.frameCount++;

  Player.update();
  Enemy.update();
  Bomb.update();
  Pickup.update();
  ProductSystem.update();
  DeveloperSystem.update();
  ShishanSystem.update();
  Effects.update();
  spawnSpecialBugs();

  // Bug 浪潮 — 每 45 秒触发一次"一大波Bug正在奔来"
  Game.bugWaveTimer++;
  if (Game.bugWaveTimer >= Game.bugWaveInterval && Enemy.count() < 10) {
    Game.bugWaveTimer = 0;
    Effects.bugWave();
  }

  // 战场引导提示
  Game.hintTimer++;
  if (Game.hintQueue.length > 0 && Game.hintTimer >= Game.hintQueue[0].delay) {
    const hint = Game.hintQueue.shift();
    showBattleHint(hint.text);
  }

  // 发呆检测
  if (!Player.moving && !Input.left && !Input.right && !Input.up && !Input.down) {
    Game.idleTimer++;
    if (Game.idleTimer === Game.idleThreshold) {
      Roast.trigger('idle');
    }
  } else {
    Game.idleTimer = 0;
  }

  Renderer.render();

  if (Game.frameCount % 10 === 0) {
    HUD.update();
  }

  checkWinCondition();

  requestAnimationFrame(gameLoop);
}

// ========== 胜负检查 ==========

function checkWinCondition() {
  if (Game.state !== 'playing') return;

  if (Player.dead) {
    Game.state = 'lost';
    showEndScreen(false);
    return;
  }

  const bugCount = Enemy.count();
  const clearRate = GameMap.getClearRate();

  if (bugCount === 0 && clearRate >= 0.7) {
    Game.state = 'won';
    showEndScreen(true);
  }
}

function checkEndState() {
}

// ========== 特殊 Bug 定时生成 ==========
function spawnSpecialBugs() {
  // 幽灵 Bug — 每 30 秒生成一个
  Game.ghostSpawnTimer++;
  if (Game.ghostSpawnTimer >= Game.ghostInterval) {
    Game.ghostSpawnTimer = 0;
    if (Enemy.countByType('ghost') < 2 && Enemy.count() < 12) {
      Enemy.spawn('ghost');
      Effects.banner('\u{1F47B} \u5E7D\u7075Bug\u73B0\u8EAB\u4E86\uFF01\u5B83\u80FD\u7A7F\u5899\uFF01');
      Danmaku.show('product');
      Roast.trigger('specialBug');
    }
  }

  // 死机 Bug — 每 40 秒生成一个
  Game.crashSpawnTimer++;
  if (Game.crashSpawnTimer >= Game.crashInterval) {
    Game.crashSpawnTimer = 0;
    if (Enemy.countByType('crash') < 2 && Enemy.count() < 12) {
      Enemy.spawn('crash');
      Effects.banner('\u{1F4A5} \u6B7B\u673ABug\u51FA\u73B0\u4E86\uFF01\u5FEB\u53BB\u70B8\u6389\u5B83\uFF01\u4E0D\u7136\u4F1A\u7206\u70B8\uFF01');
      Sound.play('alert');
      Roast.trigger('specialBug');
    }
  }

  // P0 Bug — 每 60 秒生成一个
  Game.p0SpawnTimer++;
  if (Game.p0SpawnTimer >= Game.p0Interval) {
    Game.p0SpawnTimer = 0;
    if (Enemy.countByType('p0') < 1 && Enemy.count() < 12) {
      Enemy.spawn('p0');
      Effects.banner('\u{1F525} P0 Bug\u6765\u4E86\uFF01\u9700\u8981\u70B8\u4E24\u6B21\u624D\u80FD\u6740\u6389\uFF01');
      Sound.play('alert');
      Roast.trigger('specialBug');
    }
  }

  // Boss Bug — 每 90 秒生成一个，带出场动画
  Game.bossSpawnTimer++;
  if (Game.bossSpawnTimer >= Game.bossInterval) {
    Game.bossSpawnTimer = 0;
    if (Enemy.countByType('boss') < 1 && Enemy.count() < 10) {
      // Boss 出场动画 — 屏幕变暗 + 邪恶红光 + 震动
      Effects.bossSpawn();
      Sound.play('bossSpawn');

      // 延迟1.5秒后生成Boss（让动画播完）
      setTimeout(() => {
        if (Game.state !== 'playing') return;
        Enemy.spawn('boss');
        Effects.banner('\u{1F608} Boss Bug \u964D\u4E34\u4E86\uFF01\u9700\u8981\u70B8\u4E09\u6B21\uFF01\u5C0F\u5FC3\u5B83\u7684\u90AA\u7B11\uFF01');
        Danmaku.show('dev');
        Danmaku.show('dev');
        Roast.trigger('specialBug');
      }, 1500);
    }
  }
}

// ========== 结束界面 ==========

function showEndScreen(won) {
  const screen = document.getElementById('end-screen');
  const title = document.getElementById('end-title');
  const message = document.getElementById('end-message');
  const statsDiv = document.getElementById('end-stats');

  document.getElementById('game-screen').classList.remove('active');
  screen.classList.add('active');

  // 统计数据
  const elapsed = Math.floor((performance.now() - Game.startTime) / 1000);
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  const clearRate = Math.floor(GameMap.getClearRate() * 100);
  const bugsKilled = Enemy.spawnCount - Enemy.count();
  const worldName = RuleEngine.currentRules ? RuleEngine.currentRules.worldName : '未知';

  if (won) {
    const victoryMsgs = [
      'Bug 全部清零，屎山清除率达标。你的奖励是：明天继续上班。',
      '版本发布成功！产品已经开始写下一轮需求了。',
      '你活下来了！HR说：太好了，不用招新人了。',
      '恭喜通关！你的奖励是：更多的Bug等着你。',
    ];
    title.textContent = '\u{1F389} \u7248\u672C\u53D1\u5E03\u6210\u529F\uFF01';
    title.style.color = '#4ade80';
    message.textContent = victoryMsgs[Math.floor(Math.random() * victoryMsgs.length)];
    Danmaku.showBatch('victory', 3);
    Sound.play('victory');
    Effects.victoryFlash();
    Roast.trigger('victory');

    // 毒舌总结 — 适合截图传播
    const roastText = getVictoryRoast({
      bugsKilled, elapsed, clearRate,
      productTriggers: Game.productTriggers,
      ghostKills: Enemy.killStats.ghost,
      p0Kills: Enemy.killStats.p0,
      bossKills: Enemy.killStats.boss,
    });

    statsDiv.innerHTML = `
      <div class="end-stat">
        <div class="end-stat-value">${minutes}:${seconds.toString().padStart(2, '0')}</div>
        <div class="end-stat-label">\u5B58\u6D3B\u65F6\u95F4</div>
      </div>
      <div class="end-stat">
        <div class="end-stat-value">${bugsKilled}</div>
        <div class="end-stat-label">Bug\u5DF2\u6D88\u706D</div>
      </div>
      <div class="end-stat">
        <div class="end-stat-value">${clearRate}%</div>
        <div class="end-stat-label">\u5C4E\u5C71\u6E05\u9664\u7387</div>
      </div>
      <div class="end-stat">
        <div class="end-stat-value" style="color:#fbbf24">${Game.productTriggers}</div>
        <div class="end-stat-label">\u8EB2\u8FC7\u9700\u6C42\u53D8\u66F4</div>
      </div>
      <div class="end-stat">
        <div class="end-stat-value" style="color:#a78bfa">${Enemy.killStats.ghost}</div>
        <div class="end-stat-label">\u5E7D\u7075Bug</div>
      </div>
      <div class="end-stat">
        <div class="end-stat-value" style="color:#ef4444">${Enemy.killStats.p0}</div>
        <div class="end-stat-label">P0 Bug</div>
      </div>
      <div class="end-stat">
        <div class="end-stat-value" style="color:#DC2626">${Enemy.killStats.boss}</div>
        <div class="end-stat-label">Boss Bug</div>
      </div>
      <div style="width:100%;margin-top:12px;padding:12px;background:#0f172a;border-radius:8px;font-size:13px;color:#94a3b8;line-height:1.8;text-align:left;">
        <div style="color:#4ade80;font-weight:700;margin-bottom:6px;">📋 \u6218\u62A5</div>
        \u4E16\u754C\uFF1A${worldName}<br>
        \u7814\u53D1\u5199Bug\u6B21\u6570\uFF1A${Game.devTriggers}<br>
        \u4EA7\u54C1\u6539\u9700\u6C42\u6B21\u6570\uFF1A${Game.productTriggers}<br>
        \u8BC4\u4EF7\uFF1A${bugsKilled >= 10 ? '\u6D4B\u8BD5\u4E4B\u795E\uFF01\u5C31\u662F\u4F60\u4E86' : bugsKilled >= 5 ? '\u5408\u683C\u7684\u6D4B\u8BD5\u5DE5\u7A0B\u5E08' : '\u52C9\u5F3A\u53D1\u5E03\uFF0C\u4E0B\u6B21\u52AA\u529B'}
      </div>
      <div style="width:100%;margin-top:8px;padding:10px 14px;background:linear-gradient(135deg,#1a1a2e,#2a1a3e);border:1px solid #a78bfa;border-radius:8px;font-size:14px;color:#a78bfa;font-weight:600;text-align:center;">
        💬 ${roastText}
      </div>
    `;
  } else {
    const deathMsg = deathCauses[Math.floor(Math.random() * deathCauses.length)];
    title.textContent = '\u{1F480} \u6D4B\u8BD5\u5DE5\u7A0B\u5E08\uFF0C\u5352';
    title.style.color = '#f87171';

    // 失败复盘 — 分析死因
    const remainingBugs = Enemy.count();
    const remainingShishan = GameMap.countShishan();
    let deathAnalysis = '';
    if (remainingBugs > 8) {
      deathAnalysis = 'Bug \u592A\u591A\uFF0C\u88AB\u56F4\u6BB4\u81F4\u6B7B';
    } else if (clearRate < 30) {
      deathAnalysis = '\u5C4E\u5C71\u592A\u539A\uFF0C\u65E0\u5904\u8EB2\u907F';
    } else if (Game.productTriggers > 5) {
      deathAnalysis = '\u88AB\u4EA7\u54C1\u7684\u9700\u6C42\u53D8\u66F4\u6D3B\u6D3B\u5751\u6B7B';
    } else {
      deathAnalysis = '\u8D70\u4F4D\u5931\u8BEF\uFF0C\u88AB\u81EA\u5DF1\u7684\u70B8\u5F39\u56F0\u4F4F\u4E86';
    }

    message.innerHTML = `${deathMsg}<br>Bug 还在笑着。你的遗言是："这个Bug我复现不了..."`;

    // 毒舌总结 — 适合截图传播
    const roastText = getDeathRoast({
      remainingBugs, clearRate, elapsed,
      productTriggers: Game.productTriggers,
    });

    statsDiv.innerHTML = `
      <div class="end-stat">
        <div class="end-stat-value">${minutes}:${seconds.toString().padStart(2, '0')}</div>
        <div class="end-stat-label">\u5B58\u6D3B\u65F6\u95F4</div>
      </div>
      <div class="end-stat">
        <div class="end-stat-value" style="color:#f87171">${bugsKilled}</div>
        <div class="end-stat-label">Bug\u5DF2\u6D88\u706D</div>
      </div>
      <div class="end-stat">
        <div class="end-stat-value" style="color:#fbbf24">${clearRate}%</div>
        <div class="end-stat-label">\u5C4E\u5C71\u6E05\u9664\u7387</div>
      </div>
      <div class="end-stat">
        <div class="end-stat-value" style="color:#ef4444">${remainingBugs}</div>
        <div class="end-stat-label">\u6B8B\u4F59Bug</div>
      </div>
      <div style="width:100%;margin-top:12px;padding:12px;background:#0f172a;border-radius:8px;font-size:13px;color:#94a3b8;line-height:1.8;text-align:left;">
        <div style="color:#f87171;font-weight:700;margin-bottom:6px;">\u{1F50D} \u590D\u76D8\u5206\u6790</div>
        \u6B7B\u56E0\uFF1A${deathAnalysis}<br>
        \u4E16\u754C\uFF1A${worldName}<br>
        \u4EA7\u54C1\u6539\u9700\u6C42\u6B21\u6570\uFF1A${Game.productTriggers}<br>
        \u7814\u53D1\u5199Bug\u6B21\u6570\uFF1A${Game.devTriggers}<br>
        \u6B8B\u4F59\u5C4E\u5C71\uFF1A${remainingShishan} \u5757
      </div>
      <div style="width:100%;margin-top:8px;padding:10px 14px;background:linear-gradient(135deg,#1a1a2e,#2a1a1e);border:1px solid #f87171;border-radius:8px;font-size:14px;color:#f87171;font-weight:600;text-align:center;">
        💬 ${roastText}
      </div>
    `;
  }
}

// ========== 重新开始 ==========

function restartGame() {
  // 1. 隐藏所有界面，显示输入界面
  document.getElementById('end-screen').classList.remove('active');
  document.getElementById('input-screen').classList.add('active');
  document.getElementById('game-screen').classList.remove('active');

  // 2. 重置输入和编译状态
  document.getElementById('world-input').value = '';
  document.getElementById('compile-status').textContent = '';
  document.getElementById('compile-status').style.color = '';
  document.getElementById('compile-extra-tip').textContent = '';
  togglePostCompileActions(false);

  // 3. 重置编译按钮状态（关键！防止卡在"编译中"）
  setCompileControlsBusy(false, '编译世界');

  // 4. 隐藏编译动画 overlay（防止动画卡住）
  const overlay = document.getElementById('compile-overlay');
  if (overlay) {
    overlay.style.display = 'none';
  }

  // 5. 重置游戏状态
  Game.state = 'input';
  Game.victory = false;
  Game.lastInput = '';
  Game.pendingRuleData = null;

  // 6. 重置规则引擎
  RuleEngine.init();
  RuleEngine.currentRules = null;  // 确保清空当前规则

  // 7. 更新规则面板
  Panel.update(null);

  console.log('[restartGame] 游戏已重置，可以重新编译');
}

// ========== 启动 ==========

window.addEventListener('DOMContentLoaded', () => {
  setupInput();
  RuleEngine.init();
  restoreApiConfig();

  // 用户必须点击才能激活音频（浏览器限制）
  const startHint = document.getElementById('intro-start-hint');
  const canvas = document.getElementById('intro-canvas');

  const startIntro = () => {
    // 激活音频上下文
    Sound.init();
    if (Sound.ctx && Sound.ctx.state === 'suspended') {
      Sound.ctx.resume();
    }
    // 隐藏提示
    if (startHint) startHint.style.display = 'none';
    // 启动开场动画
    Intro.start();
  };

  if (startHint) {
    startHint.addEventListener('click', startIntro);
  }
  // 也允许直接点击 canvas
  canvas.addEventListener('click', () => {
    if (!Intro.canvas) startIntro();
  });

  console.log('BugBoomer 已启动');
  console.log('提示：在 js/ai/compiler.js 中配置 API key 以启用 AI 规则生成');
  console.log('未配置 API 时将使用离线兜底规则包');
});
