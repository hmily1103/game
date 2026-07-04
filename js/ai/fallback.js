// ========== 离线兜底规则包 ==========

const FallbackRules = {
  // 隐藏规则组合 — 输入包含多个关键词时触发特殊世界
  comboRules: {
    '996+乱': {
      worldName: '紧急插队',
      rules: [
        { name: '紧急插队', type: 'product_chaos', effect: 'product_interval 3s', impact: '产品每3秒改一次需求，疯狂插队' },
        { name: '过劳模式', type: 'one_life', effect: '生命值锁定为 1', impact: '只有一次机会' },
        { name: '野蛮编码', type: 'dev_rush', effect: 'dev_spawn_delay 3s, 每次3个', impact: '研发在996压力下疯狂写Bug' },
      ],
      worldVibe: '996 + 项目太乱 = 产品疯狂插队 + 研发疯狂写Bug + 你只有一条命。祝你好运',
      isHidden: true,
    },
    '996+重构': {
      worldName: '燃尽重构',
      rules: [
        { name: '过劳模式', type: 'one_life', effect: '生命值锁定为 1', impact: '只有一次机会' },
        { name: '技术债爆炸', type: 'chain_explosion_boost', effect: '爆炸范围+1', impact: '连锁爆炸范围大幅增加' },
        { name: '黑盒测试', type: 'dark_map', effect: '视野缩小', impact: '看不清全局还要重构' },
      ],
      worldVibe: '996还要重构？你看不清代码在哪，炸弹却炸得更猛了。这就是燃尽',
      isHidden: true,
    },
    '重构+需求': {
      worldName: '需求重构地狱',
      rules: [
        { name: '技术债爆炸', type: 'chain_explosion_boost', effect: '爆炸范围+1', impact: '重构引发连锁爆炸' },
        { name: '需求轰炸', type: 'product_chaos', effect: 'product_interval 4s', impact: '产品每4秒改需求' },
        { name: 'Bug 蔓延', type: 'bug_split', effect: 'Bug 被炸后分裂', impact: '重构+需求变更=Bug越炸越多' },
      ],
      worldVibe: '一边重构一边改需求，Bug越炸越多，这不是地狱这是什么？',
      isHidden: true,
    },
    '敏捷+996': {
      worldName: '极速燃烧',
      rules: [
        { name: '快速迭代', type: 'dev_rush', effect: 'dev_spawn_delay 3s, 每次2个', impact: '敏捷+996=Bug生成速度拉满' },
        { name: '过劳模式', type: 'one_life', effect: '生命值锁定为 1', impact: '只有一次机会' },
        { name: '高速开发', type: 'player_speed', effect: 'x2', impact: '移动速度翻倍，但只有一条命' },
      ],
      worldVibe: '敏捷迭代 × 996 = 用一条命换最快的开发速度。冲就完了',
      isHidden: true,
    },
  },

  rules: {
    '乱': {
      worldName: '混沌纪元',
      rules: [
        { name: '需求风暴', type: 'product_chaos', effect: 'product_interval 降至 6s', impact: '产品捣乱频率翻倍' },
        { name: '野蛮编码', type: 'dev_rush', effect: 'dev_spawn_delay 4s, 每次2个', impact: '研发疯狂写 Bug' },
        { name: '屎山自愈', type: 'shishan_regen', effect: '10s 复活 30%', impact: '屎山清不完' },
      ],
      worldVibe: '产品疯提需求、研发狂写 Bug、屎山还会自己长回来的地狱模式',
    },
    '敏捷': {
      worldName: '敏捷纪元',
      rules: [
        { name: '快速迭代', type: 'dev_rush', effect: 'dev_spawn_delay 4s', impact: 'Bug 生成速度翻倍' },
        { name: '高速开发', type: 'player_speed', effect: 'x1.5', impact: '玩家移动速度提升' },
        { name: '持续集成', type: 'shishan_regen', effect: '12s 复活 20%', impact: '屎山缓慢自愈' },
      ],
      worldVibe: '一切都在加速，包括 Bug 的生成速度',
    },
    '996': {
      worldName: '燃烧纪元',
      rules: [
        { name: '过劳模式', type: 'one_life', effect: '生命值锁定为 1', impact: '只有一次机会' },
        { name: '肾上腺素', type: 'player_speed', effect: 'x1.5', impact: '移动速度提升' },
        { name: '黑盒测试', type: 'dark_map', effect: '视野缩小', impact: '只能看到周围区域' },
      ],
      worldVibe: '用生命在赶进度，一个 Bug 就能让你倒下，而且你还看不清全局',
    },
    '重构': {
      worldName: '重构纪元',
      rules: [
        { name: '技术债爆炸', type: 'chain_explosion_boost', effect: '爆炸范围+1', impact: '连锁爆炸范围大幅增加' },
        { name: 'Bug 爆发', type: 'dev_rush', effect: '每次3个 Bug', impact: '重构引发大量 Bug' },
        { name: '屎山自愈', type: 'shishan_regen', effect: '10s 复活 30%', impact: '旧屎山清不完新屎山又来' },
      ],
      worldVibe: '重构一时爽，Bug 火葬场，但炸起来是真爽',
    },
    '需求': {
      worldName: '需求纪元',
      rules: [
        { name: '需求轰炸', type: 'product_chaos', effect: 'product_interval 4s', impact: '产品每 4 秒改一次需求' },
        { name: '屎山疯长', type: 'shishan_respawn', effect: '每次复活 2 块', impact: '屎山复活数量翻倍' },
        { name: 'Bug 蔓延', type: 'bug_split', effect: 'Bug 被炸后分裂', impact: 'Bug 越炸越多' },
      ],
      worldVibe: '需求天天变，屎山天天长，Bug 越炸越多',
    },
    '隔离': {
      worldName: '隔离纪元',
      rules: [
        { name: '测试环境隔离', type: 'test_isolation', effect: '炸弹只炸屎山', impact: '必须先清地形再绕杀Bug' },
        { name: 'Bug 蔓延', type: 'dev_rush', effect: 'dev_spawn_delay 5s', impact: 'Bug 持续生成' },
        { name: '屎山自愈', type: 'shishan_regen', effect: '12s 复活 20%', impact: '屎山缓慢自愈' },
      ],
      worldVibe: '炸弹对 Bug 无效，你必须用智商而不是蛮力',
    },
  },

  // 关键词匹配
  match(input) {
    if (!input) return null;

    const text = input.toLowerCase();

    // 1. 先检查隐藏规则组合（需要同时包含多个关键词）
    const comboChecks = [
      { combo: '996+乱',     keys: [['996','加班','肝','过劳','burn'], ['乱','混乱','失控','chaos','mess']] },
      { combo: '996+重构',   keys: [['996','加班','肝','过劳','burn'], ['重构','技术债','refactor','debt']] },
      { combo: '重构+需求',  keys: [['重构','技术债','refactor','debt'], ['需求','产品','变更','requirement','product']] },
      { combo: '敏捷+996',   keys: [['敏捷','迭代','agile','sprint'], ['996','加班','肝','过劳','burn']] },
    ];

    for (const { combo, keys } of comboChecks) {
      const groupA = keys[0];
      const groupB = keys[1];
      const hasA = groupA.some(k => text.includes(k));
      const hasB = groupB.some(k => text.includes(k));
      if (hasA && hasB) {
        const rule = this.comboRules[combo];
        return { ...rule, source: '隐藏规则 ✨' };
      }
    }

    // 2. 单关键词匹配
    const keywords = [
      { keys: ['乱', '混乱', '失控', 'chaos', 'mess'], rule: this.rules['乱'] },
      { keys: ['敏捷', '迭代', '快', 'agile', 'sprint'], rule: this.rules['敏捷'] },
      { keys: ['996', '加班', '肝', '过劳', 'burn'], rule: this.rules['996'] },
      { keys: ['重构', '技术债', 'refactor', 'debt'], rule: this.rules['重构'] },
      { keys: ['需求', '产品', '变更', 'requirement', 'product'], rule: this.rules['需求'] },
      { keys: ['隔离', '环境', 'isolation', 'isolate'], rule: this.rules['隔离'] },
    ];

    for (const { keys, rule } of keywords) {
      for (const key of keys) {
        if (text.includes(key)) {
          return { ...rule, source: '应急规则包' };
        }
      }
    }

    // 3. 不匹配则随机返回一组
    const allRules = Object.values(this.rules);
    const random = allRules[Math.floor(Math.random() * allRules.length)];
    return { ...random, source: '应急规则包（随机）' };
  },
};
