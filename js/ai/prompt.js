// ========== LLM Prompt 模板 ==========

const PromptTemplate = {
  build(input) {
    return `你是一个游戏世界规则编译器。玩家输入一句话描述项目状态，你需要将其编译为3条游戏规则。

游戏背景：测试工程师在炸弹人地图里炸Bug怪、清屎山，同时产品经理会捣乱（复活屎山），研发会写Bug（生成新Bug怪）。

规则类型分为两类：
1. 数值规则：调整以下参数
   - product_interval: 产品捣乱间隔（秒，范围4-20）
   - dev_spawn_delay: Bug生成间隔（秒，范围3-15）
   - dev_spawn_count: 每次生成Bug数（1-3）
   - shishan_respawn: 屎山复活数量（0-3）
   - bug_speed: Bug速度倍率（0.5-2）
   - bomb_timer: 炸弹延迟（秒，1-4）
   - player_speed: 玩家速度倍率（0.8-2）

2. 机制规则（3条规则中至少1条必须是机制规则）：
   - chain_explosion: 炸弹连锁引爆
   - shishan_regen: 屎山被炸后自动复活（需指定 interval秒数 和 percent比例）
   - bug_split: Bug被炸后分裂成2个
   - dark_map: 地图变暗只有玩家周围可见（黑盒测试）
   - one_life: 生命值锁定为1（过劳模式）
   - double_bomb: 每次放2个炸弹（火力覆盖）
   - time_pressure: 限时通关（需指定秒数）
   - chain_explosion_boost: 技术债爆炸 — 爆炸范围+1且连锁增强
   - test_isolation: 测试环境隔离 — 炸弹只能炸屎山不能炸Bug，必须先清地形再绕杀Bug

玩家输入: "${input}"

输出严格的JSON格式（不要包含其他文字）：
{
  "worldName": "世界名（2-4字）",
  "rules": [
    { "name": "规则名", "type": "类型", "effect": "具体效果描述", "impact": "对玩家的影响" }
  ],
  "worldVibe": "一句话描述这个世界的感觉"
}

要求：
- 3条规则中至少1条是机制级规则
- 规则之间要有逻辑关联，共同体现输入描述的氛围
- worldVibe 要幽默，有职场梗
- effect 字段中数值必须明确，如 "6s"、"x2"、"50%"`;
  },
};
