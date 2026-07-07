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
  bossInterval: 3600,   // 60秒
  // 发呆检测
  idleTimer: 0,
  idleThreshold: 360,   // 6秒不动触发吐槽
  // Bug 浪潮计时器
  bugWaveTimer: 0,
  bugWaveInterval: 2700, // 约45秒触发一次"一大波Bug"
  bugWaveTriggered: false,
  lastBugTriggered: false, // 最后一只Bug横幅是否已触发
  // 战场引导提示
  hintQueue: [],
  hintTimer: 0,
  // 连击系统
  combo: 0,            // 当前连击数
  comboTimer: 0,        // 连击倒计时（帧）
  comboWindow: 180,     // 连击窗口 = 3秒（60fps）
  maxCombo: 0,          // 本局最高连击
  // 局内成长
  xp: 0,                // 测试点数
  level: 1,             // 当前等级
  xpPerLevel: 24,       // 每级所需 XP 基数（Lv1→2需24≈24个普通Bug → 约2-3分钟一升）
  levelUpReady: false,  // 是否有升级待选择
  levelUpCooldown: 0,   // 升级冷却（帧），防止连升
  upgradeOptions: null, // 当前升级选项
  totalBombsPlaced: 0,
  totalShishanCleared: 0,
  // 暂停状态
  isPaused: false,
  previousState: null,  // 暂停前的状态
  // 定时器与运行态收口
  compileAnimationTimers: [],
  compileRunId: 0,
  pendingBossSpawnTimer: null,
  judgeBugSpeedMultiplier: 1,
  timeLimitFrames: 0,
  endlessMode: false,
  endlessStartTime: 0,
};

// 搞笑死因列表
const deathCauses = [
  '死因：被需求变更淹没，测试用例全部重写',
  '死因：回归Bug太多，选择躺平',
  '死因：被产品经理的嘴遁击杀',
  '死因：技术债塌方，系统崩了',
  '死因：加班到猝死，还没发版本',
  '死因：试图一个人测完所有Bug',
  '死因：研发说"在我电脑上不会死啊"',
  '死因：被Bug围殴，测试环境炸了',
  '死因：误删测试数据库',
  '死因：版本发布前夜，P0故障亮了',
];

// 毒舌总结 — 胜利时，基于数据生成适合截图传播的文案
function getVictoryRoast(stats) {
  const roasts = [];
  if (stats.bugsKilled >= 15) {
    roasts.push('🏆 Bug修复高手：今天修的Bug比产品改的需求还多');
  }
  if (stats.productTriggers >= 8) {
    roasts.push('🛡️ 需求变更抵抗者：扛住了' + stats.productTriggers + '次需求变更，测试用例全部重写');
  }
  if (stats.elapsed < 60) {
    roasts.push('⚡ 闪电发布：' + Math.floor(stats.elapsed) + '秒通关，产品还没来得及写新需求');
  }
  if (stats.clearRate === 100) {
    roasts.push('🧹 技术债清理专家：100%清除率，连前同事的祖传代码都没放过');
  }
  if (stats.ghostKills > 0 && stats.p0Kills > 0) {
    roasts.push('👻 P0终结者：回归Bug和P0故障都倒在了你的测试探针下');
  }
  if (stats.bossKills > 0) {
    roasts.push('😈 线上事故终结者：连Boss Bug都被你修复了，产品看了都害怕');
  }
  if (roasts.length === 0) {
    roasts.push('📝 测试通过，但产品已经开始写下一轮需求了');
  }
  return roasts[Math.floor(Math.random() * roasts.length)];
}

// 毒舌总结 — 失败时
function getDeathRoast(stats) {
  const roasts = [];
  if (stats.remainingBugs > 10) {
    roasts.push('💀 未修复Bug太多，测试工程师选择了物理退出');
  }
  if (stats.productTriggers > 6) {
    roasts.push('💼 被产品经理的' + stats.productTriggers + '次需求变更活活坑死，测试用例全部白写');
  }
  if (stats.clearRate < 20) {
    roasts.push('💩 技术债太多，测试用例覆盖不了');
  }
  if (stats.elapsed < 30) {
    roasts.push('⏱️ 存活' + Math.floor(stats.elapsed) + '秒就没了，比需求变更还快');
  }
  if (roasts.length === 0) {
    roasts.push('💀 别灰心，Bug还在那里不悲不喜，下次继续修');
  }
  return roasts[Math.floor(Math.random() * roasts.length)];
}

function getRemainingTimeSeconds() {
  return Math.max(0, Math.ceil((Game.timeLimitFrames || 0) / 60));
}

function clearDirectionalInput() {
  Input.left = false;
  Input.right = false;
  Input.up = false;
  Input.down = false;
}

function setDirectionalInput(direction, active) {
  if (Game.state !== 'playing') {
    clearDirectionalInput();
    return;
  }

  if (active) {
    clearDirectionalInput();
    if (direction in Input) Input[direction] = true;
    return;
  }

  if (direction in Input) Input[direction] = false;
}

function setupTouchControls() {
  const controls = document.getElementById('mobile-controls');
  if (!controls) return;

  const bindPressState = (element, onPress, onRelease) => {
    if (!element) return;
    const press = (e) => {
      e.preventDefault();
      element.classList.add('is-active');
      onPress();
    };
    const release = (e) => {
      e.preventDefault();
      element.classList.remove('is-active');
      onRelease();
    };

    element.addEventListener('pointerdown', press);
    element.addEventListener('pointerup', release);
    element.addEventListener('pointercancel', release);
    element.addEventListener('pointerleave', release);
  };

  controls.querySelectorAll('[data-touch-dir]').forEach((button) => {
    const direction = button.getAttribute('data-touch-dir');
    bindPressState(
      button,
      () => setDirectionalInput(direction, true),
      () => setDirectionalInput(direction, false)
    );
  });

  bindPressState(
    document.getElementById('touch-bomb-btn'),
    () => {
      if (Game.state === 'playing') Player.placeBomb();
    },
    () => {}
  );
}

// ========== 输入处理 ==========

// ========== 暂停系统 ==========
function togglePause() {
  // 只在 playing 或 paused 状态下切换
  if (Game.state !== 'playing' && Game.state !== 'paused') return;

  if (Game.isPaused) {
    // 恢复游戏
    Game.isPaused = false;
    Game.state = Game.previousState || 'playing';
    Game.previousState = null;
    const overlay = document.getElementById('pause-overlay');
    if (overlay) overlay.remove();
    Effects.unpauseBanner();
    Sound.startBgm();
    Game.lastTime = performance.now();
    requestAnimationFrame(gameLoop);
  } else {
    // 暂停游戏
    Game.isPaused = true;
    Game.previousState = Game.state;
    Game.state = 'paused';
    clearDirectionalInput();
    Sound.stopBgm();
    renderPauseOverlay();
  }
}

function renderPauseOverlay() {
  const overlay = document.createElement('div');
  overlay.id = 'pause-overlay';
  overlay.style.cssText = `
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.85);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    font-family: 'Courier New', monospace;
  `;
  overlay.innerHTML = `
    <div style="font-size: 48px; font-weight: 900; color: #f59e0b; margin-bottom: 16px; text-shadow: 0 0 20px rgba(245, 158, 11, 0.6);">⏸️ 暂停</div>
    <div style="font-size: 14px; color: #94a3b8; margin-bottom: 32px;">按 ESC 继续，或点击下方按钮</div>
    <button id="resume-btn" style="
      padding: 12px 48px;
      font-size: 16px;
      font-weight: 700;
      color: #1e293b;
      background: linear-gradient(135deg, #f59e0b, #d97706);
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-family: 'Courier New', monospace;
      transition: transform 0.2s;
    ">继续游戏</button>
    <div style="margin-top: 16px; font-size: 12px; color: #64748b;">ESC = 继续</div>
  `;
  document.body.appendChild(overlay);

  document.getElementById('resume-btn').addEventListener('click', togglePause);
}

function setupInput() {
  document.addEventListener('keydown', (e) => {
    // ESC 暂停/继续
    if (e.key === 'Escape') {
      togglePause();
      e.preventDefault();
      return;
    }

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

  // ? 键帮助浮层
  document.addEventListener('keydown', function(e) {
    if (e.key === '?' || (e.shiftKey && e.key === '/')) {
      // 游戏中和输入页都可以触发
      if (Game.state === 'playing' || Game.state === 'input') {
        toggleHelpOverlay();
        e.preventDefault();
      }
    }
  });

  // 帮助浮层内按 ? 关闭
  document.getElementById('help-overlay').addEventListener('click', function(e) {
    if (e.target === this) toggleHelpOverlay();
  });

  // 帮助 badge 点击
  var helpBadge = document.querySelector('.help-badge');
  if (helpBadge) {
    helpBadge.addEventListener('click', function(e) {
      toggleHelpOverlay();
      e.stopPropagation();
    });
  }
}

function toggleHelpOverlay() {
  var overlay = document.getElementById('help-overlay');
  if (!overlay) return;
  if (overlay.style.display === 'none' || !overlay.style.display) {
    overlay.style.display = 'flex';
  } else {
    overlay.style.display = 'none';
  }
}

function clearCompileAnimationTimers() {
  for (const timerId of Game.compileAnimationTimers) {
    clearTimeout(timerId);
  }
  Game.compileAnimationTimers = [];
}

function scheduleCompileAnimation(runId, callback, delay) {
  const timerId = setTimeout(async () => {
    Game.compileAnimationTimers = Game.compileAnimationTimers.filter(id => id !== timerId);
    if (Game.compileRunId !== runId) return;
    await callback();
  }, delay);
  Game.compileAnimationTimers.push(timerId);
  return timerId;
}

function clearBossSpawnTimer() {
  if (Game.pendingBossSpawnTimer !== null) {
    clearTimeout(Game.pendingBossSpawnTimer);
    Game.pendingBossSpawnTimer = null;
  }
}

function updateSoundToggleUI() {
  const btn = document.getElementById('sound-toggle-btn');
  if (!btn) return;
  btn.textContent = Sound.enabled ? '🔊 音频：开' : '🔇 音频：关';
}

function applySavedSettings() {
  const settings = Storage.settings.get();
  Sound.setEnabled(settings.soundEnabled !== false);
  updateSoundToggleUI();
}

function toggleSoundSetting() {
  const nextEnabled = !Sound.enabled;
  Sound.setEnabled(nextEnabled);
  Storage.settings.update('soundEnabled', nextEnabled);
  updateSoundToggleUI();
}

function renderPromptPreview(input) {
  const box = document.getElementById('prompt-preview-box');
  const content = document.getElementById('prompt-preview-content');
  const toggleBtn = document.getElementById('prompt-toggle-btn');
  if (!box || !content || !toggleBtn) return;

  content.textContent = PromptTemplate.build(input);
  box.style.display = 'none';
  toggleBtn.textContent = '查看 Prompt';
}

function togglePromptPreview() {
  const box = document.getElementById('prompt-preview-box');
  const toggleBtn = document.getElementById('prompt-toggle-btn');
  if (!box || !toggleBtn) return;

  const shouldShow = box.style.display === 'none' || !box.style.display;
  box.style.display = shouldShow ? 'block' : 'none';
  toggleBtn.textContent = shouldShow ? '隐藏 Prompt' : '查看 Prompt';
}

// ========== 快捷输入 ==========

function quickInput(text) {
  const input = document.getElementById('world-input');
  const dimmedInput = document.getElementById('world-input-dimmed');
  if (input) input.value = text;
  if (dimmedInput) dimmedInput.value = text;
}

// ========== 编译世界 ==========

// API 配置面板展开/收起
function toggleApiConfig() {
  const body = document.getElementById('api-config-body');
  const toggle = document.getElementById('api-config-toggle');
  if (body.style.display === 'none') {
    body.style.display = 'block';
    if (toggle) toggle.classList.add('open');
  } else {
    body.style.display = 'none';
    if (toggle) toggle.classList.remove('open');
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
  updateApiStatusLabel('AI 接口：已配置 ✓（' + model + '）', '#10B981');
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
  updateApiStatusLabel('AI 接口：未配置（当前使用离线规则包）', '#94a3b8');
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
    updateApiStatusLabel('AI 接口：已配置 ✓（' + Compiler.model + '）', '#10B981');
    document.getElementById('api-url').value = Compiler.apiUrl;
    document.getElementById('api-model').value = Compiler.model;
  }
}

function setCompileControlsBusy(isBusy, buttonText) {
  const compileBtn = document.getElementById('compile-btn');
  const recompileInline = document.getElementById('recompile-inline-btn');
  const recompileBtn = document.getElementById('recompile-btn');
  const startBtn = document.getElementById('start-btn');

  if (compileBtn) {
    compileBtn.disabled = isBusy;
    compileBtn.textContent = isBusy ? buttonText : '编译世界';
  }
  if (recompileInline) recompileInline.disabled = isBusy;
  if (recompileBtn) recompileBtn.disabled = isBusy;
  if (startBtn) startBtn.disabled = isBusy || !Game.pendingRuleData;
}

function showCompileResultZone(show) {
  const resultZone = document.getElementById('compile-result-zone');
  if (resultZone) {
    resultZone.style.display = show ? 'block' : 'none';
  }
}

function showInputDimmedZone(show) {
  const pureZone = document.getElementById('input-pure-zone');
  const dimmedZone = document.getElementById('input-dimmed-zone');
  if (!pureZone || !dimmedZone) return;

  if (show) {
    pureZone.style.display = 'none';
    dimmedZone.style.display = 'block';
    // 同步输入值
    const input = document.getElementById('world-input');
    const dimmedInput = document.getElementById('world-input-dimmed');
    if (input && dimmedInput) dimmedInput.value = input.value;
  } else {
    pureZone.style.display = '';
    dimmedZone.style.display = 'none';
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
    tip.textContent = '你可以点击"重新编译"对比同一句输入在 AI 模型下生成的不同规则。';
    tip.style.color = '#64748B';
    return;
  }

  tip.textContent = '当前使用离线规则包：同一句输入会命中固定规则，配置 API 后可看到真正的 AI 重编译差异。';
  tip.style.color = '#fbbf24';
}

function renderCompileResult(ruleData) {
  const preview = document.getElementById('compile-rule-preview');
  if (!preview) return;
  preview.innerHTML = '';

  if (!ruleData || !ruleData.rules || ruleData.rules.length === 0) return;

  ruleData.rules.forEach(function(rule) {
    var item = document.createElement('div');
    item.className = 'rule-item';

    var nameDiv = document.createElement('div');
    nameDiv.className = 'rule-item-name';
    nameDiv.textContent = rule.name || rule.label || '';
    item.appendChild(nameDiv);

    if (rule.parsedLabel) {
      var parsedDiv = document.createElement('div');
      parsedDiv.className = 'rule-item-parsed';
      parsedDiv.textContent = rule.parsedLabel;
      item.appendChild(parsedDiv);
    } else if (rule.effect) {
      var effectDiv = document.createElement('div');
      effectDiv.className = 'rule-item-effect';
      effectDiv.textContent = rule.effect;
      item.appendChild(effectDiv);
    }

    if (rule.impact) {
      var impactDiv = document.createElement('div');
      impactDiv.className = 'rule-item-impact';
      impactDiv.textContent = rule.impact;
      item.appendChild(impactDiv);
    }

    preview.appendChild(item);
  });
}

function applyCompiledWorld(input, ruleData) {
  Game.lastInput = input;
  Game.pendingRuleData = ruleData;

  // 更新状态文字
  var statusText = document.getElementById('compile-status-text');
  if (statusText) {
    if (ruleData && ruleData.isHidden) {
      statusText.textContent = '✨ 触发隐藏规则：' + (ruleData.worldName || '未知世界') + ' ✨';
      statusText.style.color = '#a78bfa';
    } else {
      statusText.textContent = '世界编译完成';
      statusText.style.color = '#10B981';
    }
  }

  // 切换到编译完成状态：灰化输入区 + 展开结果
  showInputDimmedZone(true);
  showCompileResultZone(true);
  renderPromptPreview(input);
  renderCompileResult(ruleData);

  // 同步规则到引擎和右侧面板
  RuleEngine.applyRules(ruleData);
  Panel.update(ruleData);

  updateCompileExtraTip(ruleData);
  setCompileControlsBusy(false, '编译世界');
}

async function compileWorld(options = {}) {
  const input = (options.inputOverride || document.getElementById('world-input').value).trim();
  const statusText = document.getElementById('compile-status-text');

  if (!input) {
    showCompileResultZone(true);
    var preview = document.getElementById('compile-rule-preview');
    if (preview) preview.innerHTML = '';
    if (statusText) {
      statusText.textContent = '请输入一句话描述你的项目状态';
      statusText.style.color = '#f87171';
    }
    return;
  }

  setCompileControlsBusy(true, options.fastMode ? '重编译中...' : '编译中...');

  // 启动世界编译动画
  showCompileAnimation(input, (ruleData) => {
    if (ruleData) {
      applyCompiledWorld(input, ruleData);
    } else {
      showCompileResultZone(true);
      var preview = document.getElementById('compile-rule-preview');
      if (preview) preview.innerHTML = '';
      if (statusText) {
        statusText.textContent = '编译失败，请重试';
        statusText.style.color = '#f87171';
      }
      setCompileControlsBusy(false, '编译世界');
    }
  }, options);
}

function recompileWorld() {
  if (!Game.lastInput) return;
  compileWorld({ fastMode: true, inputOverride: Game.lastInput });
}

function beginBattle() {
  if (!Game.pendingRuleData) {
    const statusText = document.getElementById('compile-status-text');
    if (statusText) {
      statusText.textContent = '请先编译一个世界规则包';
      statusText.style.color = '#f87171';
    }
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
  const runId = ++Game.compileRunId;

  clearCompileAnimationTimers();

  overlay.style.display = 'flex';
  linesDiv.innerHTML = '';
  bar.style.width = '0%';
  percentDiv.textContent = '0%';

  // 编译步骤文案 — 测试部扫描发现仪式感
  const steps = [
    { text: '> \u{1F50D} \u626B\u63CF\u6D4B\u8BD5\u533A\u57DF...', delay: 0 },
    { text: '> \u8BC6\u522B\u9879\u76EE\u7279\u5F81\uFF1A"' + input + '"', delay: Math.round(300 * speedMultiplier) },
    { text: '> \u{1F41B} \u53D1\u73B0 Bug \u6D3B\u52A8\u8FF9\u8C61\uFF01', delay: Math.round(600 * speedMultiplier) },
    { text: '> \u{1F4A9} \u5C4E\u5C71\u533A\u57DF\u5DF2\u6807\u8BB0\uFF01', delay: Math.round(900 * speedMultiplier) },
    { text: '> \u2699\uFE0F \u6B63\u5728\u7F16\u8BD1\u4E16\u754C\u89C4\u5219...', delay: Math.round(1200 * speedMultiplier) },
    { text: '> \u26A1 \u4E16\u754C\u7F16\u8BD1\u5B8C\u6210 \u2713', delay: Math.round(1500 * speedMultiplier) },
  ];

  // 逐行显示
  steps.forEach((step, i) => {
    scheduleCompileAnimation(runId, () => {
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
  scheduleCompileAnimation(runId, async () => {
    const ruleData = await aiPromise;
    if (Game.compileRunId !== runId) return;

    // 最后一步：世界编译完成
    const lastLine = linesDiv.children[steps.length - 1];
    if (lastLine) {
      lastLine.classList.remove('active');
      lastLine.classList.add('done');
    }

    const doneLine = document.createElement('div');
    doneLine.className = 'compile-line active';
    doneLine.style.color = '#10B981';
    doneLine.style.fontWeight = '700';
    doneLine.textContent = '> \u26A1 \u4E16\u754C\u7F16\u8BD1\u5B8C\u6210 \u2713';
    linesDiv.appendChild(doneLine);

    bar.style.width = '100%';
    percentDiv.textContent = '100%';

    if (Sound.ctx) {
      Sound.play('compileDone');
    }

    // 0.8秒后关闭动画，进入游戏
    scheduleCompileAnimation(runId, () => {
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
  clearCompileAnimationTimers();
  clearBossSpawnTimer();
  Effects.clearTransientTimers();

  document.getElementById('input-screen').classList.remove('active');
  document.getElementById('game-screen').classList.add('active');
  document.getElementById('end-screen').classList.remove('active');

  // 每局恢复基础节奏，再按试玩模式做局部修正
  Game.judgeBugSpeedMultiplier = 1;
  Game.ghostInterval = 1800;
  Game.crashInterval = 2400;
  Game.p0Interval = 3600;
  Game.bossInterval = 3600;

  // 评委试玩模式 — 首局降低难度
  const isFirstGame = !localStorage.getItem('bugboomer_played');
  if (isFirstGame) {
    Game.judgeBugSpeedMultiplier = 0.8;
    Game.ghostInterval = 2400;  // 40秒（原30秒）
    Game.crashInterval = 3000;  // 50秒（原40秒）
    Game.p0Interval = 4800;     // 80秒（原60秒）
    Game.bossInterval = 4800;   // 80秒（首局降低难度）
  }

  GameMap.init();
  Player.init();
  Enemy.init();
  Bomb.init();
  Pickup.init();
  RuleEngine.refreshSystems();
  Characters.init();

  if (isFirstGame) {
    // 首局：仅通过试玩倍率降低 Bug 速度，不改写规则本身
    Pickup.dropChance = 0.28;   // 28%（原18%）
    localStorage.setItem('bugboomer_played', '1');
    console.log('[评委试玩模式] 首局难度已降低');
  }

  if (RuleEngine.config.oneLife) {
    Player.lives = 1;
  }
  // 默认1个炸弹，命中双炸弹规则才提升到2
  Player.maxBombs = RuleEngine.config.doubleBomb ? 2 : 1;
  Game.timeLimitFrames = RuleEngine.config.timePressure > 0
    ? Math.round(RuleEngine.config.timePressure * 60)
    : 0;
  Player.setSpeed(RuleEngine.config.playerSpeed);

  if (!Sound.ctx) {
    Sound.init();
  }
  applySavedSettings();

  Renderer.init();

  Game.totalKills = 0;
  Game.productTriggers = 0;
  Game.devTriggers = 0;
  Game.combo = 0;
  Game.comboTimer = 0;
  Game.maxCombo = 0;
  Game.xp = 0;
  Game.level = 1;
  Game.levelUpReady = false;
  Game.levelUpCooldown = 0;
  Game.upgradeOptions = null;
  Game.totalBombsPlaced = 0;
  Game.totalShishanCleared = 0;
  Game.endlessMode = false;
  Game.endlessStartTime = 0;
  Game.timeLimitFrames = RuleEngine.config.timePressure > 0
    ? Math.round(RuleEngine.config.timePressure * 60)
    : 0;
  Game.startTime = performance.now();
  Game.ghostSpawnTimer = 0;
  Game.crashSpawnTimer = 0;
  Game.p0SpawnTimer = 0;
  Game.bossSpawnTimer = 0;
  Game.idleTimer = 0;
  Game.bugWaveTimer = 0;
  Game.bugWaveTriggered = false;
  Game.lastBugTriggered = false;

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
  Sound.startBgm();

  // 开局规则警告 — 检测到危险规则时全屏提示
  Effects.showRuleWarning();

  requestAnimationFrame(gameLoop);
}

// ========== 游戏主循环 ==========

function gameLoop(timestamp) {
  if (Game.state !== 'playing') {
    // levelup 状态时继续渲染但不更新逻辑
    if (Game.state === 'levelup') {
      Renderer.render();
      requestAnimationFrame(gameLoop);
    }
    return;
  }

  Game.frameCount++;

  if (Game.timeLimitFrames > 0) {
    Game.timeLimitFrames--;
    if (Game.timeLimitFrames <= 0) {
      Game.timeLimitFrames = 0;
      Game.state = 'lost';
      showEndScreen(false);
      return;
    }
  }

  Player.update();
  Enemy.update();
  // 更新动态难度
  const deltaTime = 1000 / 60; // 每帧约16ms
  Enemy.updateDifficulty(deltaTime);
  Bomb.update();
  Pickup.update();
  ProductSystem.update();
  DeveloperSystem.update();
  ShishanSystem.update();
  Effects.update();
  Characters.update();
  spawnSpecialBugs();

  // Bug 浪潮 — 每 45 秒触发一次"一大波Bug正在奔来"
  // Bug 浪潮冷却 — 升级后 10 秒内不触发
  Game.bugWaveTimer++;
  const difficultySpawnMultiplier = Enemy.getDifficultySpawnMultiplier();
  if (Game.bugWaveTimer >= Math.floor(Game.bugWaveInterval * difficultySpawnMultiplier) && Enemy.count() < 10 && Game.levelUpCooldown <= 0) {
    Game.bugWaveTimer = 0;
    Effects.bugWave();
  }

  // 升级冷却递减
  if (Game.levelUpCooldown > 0) {
    Game.levelUpCooldown--;
  }

  // 最后一只Bug — 首次触发时弹出横幅
  if (!Game.lastBugTriggered && Enemy.count() === 1 && Enemy.list.filter(e => e.alive && e.type !== 'boss').length === 1) {
    Game.lastBugTriggered = true;
    Effects.banner('🎯 最后一个Bug！炸掉它就赢了！');
    Sound.play('alert');
  }
  // Bug数恢复到>1时重置标记
  if (Enemy.count() > 1) {
    Game.lastBugTriggered = false;
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

  // 连击计时器衰减
  if (Game.comboTimer > 0) {
    Game.comboTimer--;
    if (Game.comboTimer === 0 && Game.combo > 0) {
      // 连击断了
      if (Game.combo >= 3) {
        Effects.floatText('💔 Combo 断了！产品松了口气', 273, 200, '#94a3b8');
      }
      Game.combo = 0;
    }
  }

  Renderer.render();

  if (Game.frameCount % 10 === 0) {
    HUD.update();
  }

  checkWinCondition();

  requestAnimationFrame(gameLoop);
}

// ========== 系统稳定度计算 ==========

function getSystemStability() {
  const destroyed = GameMap.destroyedShishan;
  // 基础50 + 每杀1只Bug+2 + 每炸1座屎山+2 - 每次需求变更-4
  // 比原公式更公平：不再惩罚"场上还有屎山"（那是游戏内容），而是奖励"已炸掉的屎山"
  const stability = 50 + Game.totalKills * 2 + destroyed * 2 - Game.productTriggers * 4;
  return Math.max(0, Math.min(100, stability));
}

// ========== 局内成长 — 升级选择 UI ==========

function showLevelUpUI() {
  Game.state = 'levelup';
  Game.levelUpReady = false;

  // 随机3选2的升级选项
  const allOptions = [
    { id: 'range', icon: '💥', name: '爆炸范围 +1', desc: '测试覆盖更广', apply() { if (Player.bombRange < 6) Player.bombRange++; } },
    { id: 'speed', icon: '⚡', name: '移动速度 +10%', desc: '在Bug中穿梭自如', apply() { if (Player.baseSpeed < 6) Player.baseSpeed += 0.4; Player.speed = Player.baseSpeed * Player.speedMultiplier; } },
    { id: 'bombs', icon: '💣', name: '可放置炸弹 +1', desc: '同时扔更多测试用例', apply() { Player.maxBombs = Math.min(5, Player.maxBombs + 1); } },
    { id: 'lives', icon: '❤️', name: '生命 +1', desc: 'HR说给你多买一份社保', apply() { Player.lives = Math.min(5, Player.lives + 1); } },
  ];

  // 随机抽取2个
  const shuffled = [...allOptions].sort(() => Math.random() - 0.5);
  const options = shuffled.slice(0, 2);

  // 创建升级弹窗
  const overlay = document.createElement('div');
  overlay.id = 'levelup-overlay';
  overlay.style.cssText = `
    position:fixed;top:0;left:0;width:100%;height:100%;
    background:rgba(0,0,0,0.75);z-index:100;
    display:flex;flex-direction:column;align-items:center;justify-content:center;
    font-family:'Courier New',monospace;
  `;

  overlay.innerHTML = `
    <div style="font-size:28px;color:#f59e0b;font-weight:bold;margin-bottom:8px;text-shadow:0 0 20px rgba(245,158,11,0.5);">
      ⭐ Lv.${Game.level} → Lv.${Game.level + 1} 晋级！
    </div>
    <div style="font-size:14px;color:#94a3b8;margin-bottom:24px;">
      选择一个升级方向
    </div>
    <div style="display:flex;gap:16px;">
      ${options.map((opt, i) => `
        <button class="levelup-opt" data-id="${opt.id}" style="
          background:#1E293B;border:2px solid #334155;border-radius:12px;
          padding:20px 24px;cursor:pointer;text-align:center;
          color:#e2e8f0;font-family:'Courier New',monospace;
          transition:all 0.2s;min-width:160px;
        ">
          <div style="font-size:36px;margin-bottom:8px;">${opt.icon}</div>
          <div style="font-size:16px;font-weight:bold;margin-bottom:4px;">${opt.name}</div>
          <div style="font-size:12px;color:#64748b;">${opt.desc}</div>
        </button>
      `).join('')}
    </div>
  `;

  document.body.appendChild(overlay);

  // 点击处理
  overlay.querySelectorAll('.levelup-opt').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const chosen = options.find(o => o.id === id);
      if (chosen) {
        chosen.apply();
        Game.xp -= Game.level * Game.xpPerLevel;
        Game.level++;
        Game.levelUpCooldown = 600;  // 10秒冷却，防连升

        // 升级飘字
        Effects.floatText('\u2B50 Lv.' + Game.level + ' \u664B\u7EA7\uFF01' + chosen.name,
          273, 273, '#f59e0b');
        Effects.flashBorder();
        Sound.play('victory');

        overlay.remove();
        Game.state = 'playing';
        // 不需要 requestAnimationFrame — gameLoop 在 levelup 期间持续运行，会自动恢复
      }
    });

    // hover 效果
    btn.addEventListener('mouseenter', () => { btn.style.borderColor = '#f59e0b'; btn.style.transform = 'translateY(-2px)'; btn.style.boxShadow = '0 4px 16px rgba(245,158,11,0.3)'; });
    btn.addEventListener('mouseleave', () => { btn.style.borderColor = '#334155'; btn.style.transform = ''; btn.style.boxShadow = ''; });
  });

  // 8秒超时自动随机选择，防止卡死
  let timedOut = false;
  const autoPick = setTimeout(() => {
    if (timedOut || Game.state !== 'levelup') return;
    timedOut = true;
    const random = options[Math.floor(Math.random() * options.length)];
    random.apply();
    Game.xp -= Game.level * Game.xpPerLevel;
    Game.level++;
    Game.levelUpCooldown = 600;  // 10秒冷却，防连升
    Effects.floatText('\u2B50 Lv.' + Game.level + ' \u664B\u7EA7\uFF01' + random.name,
      273, 273, '#f59e0b');
    Effects.flashBorder();
    Sound.play('victory');
    overlay.remove();
    Game.state = 'playing';
    // 不需要 requestAnimationFrame — gameLoop 在 levelup 期间持续运行，会自动恢复
  }, 8000);

  // 点击选择时取消超时
  const origClick = overlay.querySelector('.levelup-opt');
  if (origClick) {
    const cancelTimer = () => { timedOut = true; clearTimeout(autoPick); };
    overlay.querySelectorAll('.levelup-opt').forEach(b => {
      b.addEventListener('click', cancelTimer, { once: true });
    });
  }
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
  const stability = getSystemStability();

  // 达成发布目标后转入无尽模式，直到阵亡再结算
  if (!Game.endlessMode && (stability >= 95 || (bugCount === 0 && clearRate >= GameConfig.victory.clearRateRequirement))) {
    Game.endlessMode = true;
    Game.endlessStartTime = performance.now();
    Game.timeLimitFrames = 0;
    Effects.banner('♾️ 发布目标已达成！进入无尽模式，尽可能多刷分！');
    showBattleHint('♾️ 无尽模式开启：继续清场、刷分、撑到最后');
    Danmaku.showBatch('victory', 2);
    Sound.play('victory');
    return;
  }

  if (stability >= 100) {
    Game.state = 'won';
    showEndScreen(true);
  }
}

// ========== 特殊 Bug 定时生成 ==========
function spawnSpecialBugs() {
  const spawnMultiplier = Enemy.getDifficultySpawnMultiplier();

  // 幽灵 Bug — 每 30 秒生成一个
  Game.ghostSpawnTimer++;
  if (Game.ghostSpawnTimer >= Math.floor(Game.ghostInterval * spawnMultiplier)) {
    Game.ghostSpawnTimer = 0;
    if (Enemy.countByType('ghost') < 2 && Enemy.count() < Enemy.maxAlive - 1) {
      Enemy.spawn('ghost');
      Effects.banner('👻 幽灵Bug现身了！它能穿墙！');
      Danmaku.show('product');
      Roast.trigger('specialBug');
    }
  }

  // 死机 Bug — 每 40 秒生成一个
  Game.crashSpawnTimer++;
  if (Game.crashSpawnTimer >= Math.floor(Game.crashInterval * spawnMultiplier)) {
    Game.crashSpawnTimer = 0;
    if (Enemy.countByType('crash') < 2 && Enemy.count() < Enemy.maxAlive - 1) {
      Enemy.spawn('crash');
      Effects.banner('💥 死机Bug出现了！快去炸掉它！不然会爆炸！');
      Sound.play('alert');
      Roast.trigger('specialBug');
    }
  }

  // P0 Bug — 每 60 秒生成一个
  Game.p0SpawnTimer++;
  if (Game.p0SpawnTimer >= Math.floor(Game.p0Interval * spawnMultiplier)) {
    Game.p0SpawnTimer = 0;
    if (Enemy.countByType('p0') < 1 && Enemy.count() < Enemy.maxAlive - 1) {
      Enemy.spawn('p0');
      Effects.banner('🔥 P0 Bug来了！需要炸两次才能杀掉！');
      Sound.play('alert');
      Roast.trigger('specialBug');
    }
  }

  // Boss Bug — 默认每 60 秒尝试生成，条件不满足时 30 秒后重试
  Game.bossSpawnTimer++;
  if (Game.bossSpawnTimer >= Math.floor(Game.bossInterval * spawnMultiplier)) {
    if (Enemy.countByType('boss') < 1 && Enemy.count() < Enemy.maxAlive - 2) {
      // 条件满足 — 生成 Boss
      Game.bossSpawnTimer = 0;
      Effects.bossSpawn();
      Sound.play('bossSpawn');

      clearBossSpawnTimer();
      Game.pendingBossSpawnTimer = setTimeout(() => {
        Game.pendingBossSpawnTimer = null;
        if (Game.state !== 'playing') return;
        Enemy.spawn('boss');
        Effects.banner('😈 Boss Bug 降临了！需要炸三次！小心它的邪笑！');
        Danmaku.show('dev');
        Danmaku.show('dev');
        Roast.trigger('specialBug');
      }, 1500);
    } else {
      // 条件不满足 — 保留一半进度，30 秒后重试
      Game.bossSpawnTimer = Math.floor(Game.bossInterval * spawnMultiplier / 2);
    }
  }
}

// ========== 结束界面 ==========

function showEndScreen(won) {
  clearBossSpawnTimer();
  Effects.clearTransientTimers();
  Sound.stopBgm();

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
  const bugsKilled = Math.max(0, Enemy.spawnCount - Enemy.count() - Enemy.selfDestructCount);
  const stability = getSystemStability();
  const endlessSeconds = Game.endlessMode && Game.endlessStartTime
    ? Math.max(0, Math.floor((performance.now() - Game.endlessStartTime) / 1000))
    : 0;
  const worldName = RuleEngine.currentRules ? RuleEngine.currentRules.worldName : '未知';
  // 安全转义 — 防止 AI 返回恶意 HTML
  const esc = (s) => { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; };
  const safeWorldName = esc(worldName);

  // ========== 存档数据 ==========
  // 计算得分
  const score = bugsKilled * 10 + clearRate + (stability / 2) + (won ? 1000 : 0) + (Game.endlessMode ? 500 + endlessSeconds * 5 : 0);
  // 保存记录
  const isNewBestScore = Storage.stats.setBestScore(Math.floor(score));
  const isNewBestCombo = Storage.stats.setBestCombo(Game.maxCombo);
  Storage.stats.incrementTotalGames();
  Storage.stats.addKills(bugsKilled);

  if (won) {
    const victoryMsgs = [
      '所有测试用例通过，技术债已清零。你的奖励是：明天继续上班。',
      '系统稳定度达标，版本发布成功！产品已经开始写下一轮需求了。',
      '你活下来了！HR说：太好了，不用招新人了。',
      '恭喜通关！系统稳定度 ' + stability + '%，所有Bug已修复。',
    ];
    title.textContent = '🎉 测试通过，发布成功！';
    title.style.color = '#10B981';
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
        <div class="end-stat-label">存活时间</div>
      </div>
      <div class="end-stat">
        <div class="end-stat-value">${bugsKilled}</div>
        <div class="end-stat-label">Bug已修复</div>
      </div>
      <div class="end-stat">
        <div class="end-stat-value">${clearRate}%</div>
        <div class="end-stat-label">技术债清除率</div>
      </div>
      <div class="end-stat">
        <div class="end-stat-value" style="color:#10B981">${stability}%</div>
        <div class="end-stat-label">系统稳定度</div>
      </div>
      <div class="end-stat">
        <div class="end-stat-value" style="color:#fbbf24">${Game.productTriggers}</div>
        <div class="end-stat-label">需求变更次数</div>
      </div>
      <div class="end-stat">
        <div class="end-stat-value" style="color:#a78bfa">${Enemy.killStats.ghost}</div>
        <div class="end-stat-label">回归Bug</div>
      </div>
      <div class="end-stat">
        <div class="end-stat-value" style="color:#ef4444">${Enemy.killStats.p0}</div>
        <div class="end-stat-label">P0 故障</div>
      </div>
      <div class="end-stat">
        <div class="end-stat-value" style="color:#DC2626">${Enemy.killStats.boss}</div>
        <div class="end-stat-label">线上事故</div>
      </div>
      <div style="width:100%;margin-top:12px;padding:12px;background:#0f172a;border-radius:8px;font-size:13px;color:#94a3b8;line-height:1.8;text-align:left;">
        <div style="color:#10B981;font-weight:700;margin-bottom:6px;">📋 测试报告</div>
        世界：${safeWorldName}<br>
        研发引入Bug次数：${Game.devTriggers}<br>
        产品需求变更次数：${Game.productTriggers}<br>
        最终稳定度：${stability}%<br>
        评价：${bugsKilled >= 10 ? '测试之神！就是你了' : bugsKilled >= 5 ? '合格的测试工程师' : '勉强发布，下次努力'}
      </div>
      <div style="width:100%;margin-top:8px;padding:10px 14px;background:linear-gradient(135deg,#1a1a2e,#2a1a3e);border:1px solid #a78bfa;border-radius:8px;font-size:14px;color:#a78bfa;font-weight:600;text-align:center;">
        💬 ${roastText}
      </div>
      ${(isNewBestScore || isNewBestCombo) ? `
        <div style="width:100%;margin-top:8px;padding:10px 14px;background:linear-gradient(135deg,#1e293b,#0f172a);border:1px solid #f59e0b;border-radius:8px;">
          <div style="color:#f59e0b;font-weight:700;text-align:center;">🏆 新纪录！</div>
          <div style="color:#94a3b8;font-size:12px;text-align:center;margin-top:4px;">
            ${isNewBestScore ? `最佳得分：${Math.floor(score)}` : ''}
            ${isNewBestScore && isNewBestCombo ? ' • ' : ''}
            ${isNewBestCombo ? `最高连击：${Game.maxCombo}` : ''}
          </div>
        </div>
      ` : ''}
      <div style="width:100%;margin-top:8px;padding:8px 12px;background:#1e293b;border-radius:6px;color:#64748b;font-size:11px;display:flex;justify-content:space-between;">
        <span>历史最佳：${Storage.stats.getBestScore()}分</span>
        <span>总场次：${Storage.stats.getTotalGames()}局</span>
        <span>总击杀：${Storage.stats.getTotalKills()}只</span>
      </div>
    `;
  } else {
    const deathMsg = deathCauses[Math.floor(Math.random() * deathCauses.length)];
    title.textContent = Game.endlessMode ? '♾️ 无尽终局' : '\u{1F480} \u6D4B\u8BD5\u5DE5\u7A0B\u5E08\uFF0C\u5352';
    title.style.color = Game.endlessMode ? '#22d3ee' : '#f87171';

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

    if (Game.endlessMode) {
      message.innerHTML = `发布目标已完成，你在无尽模式又坚持了 ${endlessSeconds} 秒。<br>Bug 还在继续来，但这次你已经刷出了像样的成绩。`;
    } else {
      message.innerHTML = `${deathMsg}<br>Bug 还在笑着。你的遗言是："这个Bug我复现不了..."`;
    }

    // 毒舌总结 — 适合截图传播
    const roastText = getDeathRoast({
      remainingBugs, clearRate, elapsed,
      productTriggers: Game.productTriggers,
    });

    statsDiv.innerHTML = `
      <div class="end-stat">
        <div class="end-stat-value">${minutes}:${seconds.toString().padStart(2, '0')}</div>
        <div class="end-stat-label">存活时间</div>
      </div>
      <div class="end-stat">
        <div class="end-stat-value" style="color:#f87171">${bugsKilled}</div>
        <div class="end-stat-label">Bug已修复</div>
      </div>
      <div class="end-stat">
        <div class="end-stat-value" style="color:#fbbf24">${clearRate}%</div>
        <div class="end-stat-label">技术债清除率</div>
      </div>
      <div class="end-stat">
        <div class="end-stat-value" style="color:#ef4444">${remainingBugs}</div>
        <div class="end-stat-label">未修复Bug</div>
      </div>
      <div class="end-stat">
        <div class="end-stat-value" style="color:#10B981">${stability}%</div>
        <div class="end-stat-label">系统稳定度</div>
      </div>
      ${Game.endlessMode ? `
      <div class="end-stat">
        <div class="end-stat-value" style="color:#22d3ee">${endlessSeconds}s</div>
        <div class="end-stat-label">无尽坚持</div>
      </div>
      ` : ''}
      <div style="width:100%;margin-top:12px;padding:12px;background:#0f172a;border-radius:8px;font-size:13px;color:#94a3b8;line-height:1.8;text-align:left;">
        <div style="color:${Game.endlessMode ? '#22d3ee' : '#f87171'};font-weight:700;margin-bottom:6px;">${Game.endlessMode ? '♾️ 无尽复盘' : '🔍 故障复盘'}</div>
        死因：${deathAnalysis}<br>
        世界：${safeWorldName}<br>
        产品需求变更次数：${Game.productTriggers}<br>
        研发引入Bug次数：${Game.devTriggers}<br>
        剩余技术债：${remainingShishan} 块<br>
        最终稳定度：${stability}%${Game.endlessMode ? `<br>无尽阶段坚持：${endlessSeconds} 秒` : ''}
      </div>
      <div style="width:100%;margin-top:8px;padding:10px 14px;background:linear-gradient(135deg,#1a1a2e,#2a1a1e);border:1px solid #f87171;border-radius:8px;font-size:14px;color:#f87171;font-weight:600;text-align:center;">
        💬 ${roastText}
      </div>
      ${isNewBestScore || isNewBestCombo ? `
        <div style="width:100%;margin-top:8px;padding:10px 14px;background:linear-gradient(135deg,#1e293b,#0f172a);border:1px solid #f59e0b;border-radius:8px;">
          <div style="color:#f59e0b;font-weight:700;text-align:center;">🏆 虽败犹荣！</div>
          <div style="color:#94a3b8;font-size:12px;text-align:center;margin-top:4px;">
            ${isNewBestScore ? `最佳得分：${Math.floor(score)}` : ''}
            ${isNewBestScore && isNewBestCombo ? ' • ' : ''}
            ${isNewBestCombo ? `最高连击：${Game.maxCombo}` : ''}
          </div>
        </div>
      ` : ''}
      <div style="width:100%;margin-top:8px;padding:8px 12px;background:#1e293b;border-radius:6px;color:#64748b;font-size:11px;display:flex;justify-content:space-between;">
        <span>历史最佳：${Storage.stats.getBestScore()}分</span>
        <span>总场次：${Storage.stats.getTotalGames()}局</span>
        <span>总击杀：${Storage.stats.getTotalKills()}只</span>
      </div>
    `;
  }
}

// ========== 重新开始 ==========

function restartGame() {
  Game.compileRunId++;
  clearCompileAnimationTimers();
  clearBossSpawnTimer();
  Effects.clearTransientTimers();
  Sound.stopBgm();

  // 1. 隐藏所有界面，显示输入界面
  document.getElementById('end-screen').classList.remove('active');
  document.getElementById('input-screen').classList.add('active');
  document.getElementById('game-screen').classList.remove('active');

  const pauseOverlay = document.getElementById('pause-overlay');
  if (pauseOverlay) pauseOverlay.remove();
  Game.isPaused = false;
  Game.previousState = null;
  Input.left = false;
  Input.right = false;
  Input.up = false;
  Input.down = false;

  // 2. 重置输入和编译状态（双区设计）
  const input = document.getElementById('world-input');
  const dimmedInput = document.getElementById('world-input-dimmed');
  if (input) input.value = '';
  if (dimmedInput) dimmedInput.value = '';

  const extraTip = document.getElementById('compile-extra-tip');
  if (extraTip) extraTip.textContent = '';

  // 回到未编译状态
  showInputDimmedZone(false);
  showCompileResultZone(false);
  renderPromptPreview('');

  // 3. 重置编译按钮状态
  setCompileControlsBusy(false, '编译世界');

  // 4. 隐藏编译动画 overlay
  const overlay = document.getElementById('compile-overlay');
  if (overlay) {
    overlay.style.display = 'none';
  }

  // 5. 重置游戏状态
  Game.state = 'input';
  Game.lastInput = '';
  Game.pendingRuleData = null;
  Game.timeLimitFrames = 0;
  Game.endlessMode = false;
  Game.endlessStartTime = 0;
  clearDirectionalInput();

  // 6. 重置规则引擎（不清空 currentRules，因为重新编译世界会重新应用）
  RuleEngine.resetConfig();

  // 7. 更新规则面板
  Panel.update(null);
}

// ========== 启动 ==========

window.addEventListener('DOMContentLoaded', () => {
  setupInput();
  setupTouchControls();
  RuleEngine.init();
  restoreApiConfig();
  applySavedSettings();
  renderPromptPreview('');

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

  console.log('BugBomber 已启动');
  console.log('提示：在 js/ai/compiler.js 中配置 API key 以启用 AI 规则生成');
  console.log('未配置 API 时将使用离线兜底规则包');
});
