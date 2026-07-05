// ========== AI 规则编译器 ==========

const Compiler = {
  // 从 localStorage 加载配置
  apiUrl: localStorage.getItem('bugboomer_api_url') || '',
  apiKey: localStorage.getItem('bugboomer_api_key') || '',
  model: localStorage.getItem('bugboomer_api_model') || '',

  // 动态更新配置（由界面调用）
  setConfig(url, key, model) {
    this.apiUrl = url;
    this.apiKey = key;
    this.model = model;
  },

  isConfigured() {
    return !!(this.apiUrl && this.apiKey && this.model);
  },

  async compile(input) {
    // 如果没有配置 API，直接走离线兜底
    if (!this.apiUrl || !this.apiKey) {
      console.log('[Compiler] 未配置 API，使用离线兜底');
      const fallback = FallbackRules.match(input);
      fallback.rawJson = '';
      return fallback;
    }

    try {
      const prompt = PromptTemplate.build(input);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000); // 3秒超时

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: '你是一个游戏世界规则编译器，只输出JSON。' },
            { role: 'user', content: prompt },
          ],
          temperature: 0.8,
          max_tokens: 500,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`API 返回 ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices[0].message.content;

      // 尝试提取 JSON
      const jsonStr = this.extractJson(content);
      const ruleData = JSON.parse(jsonStr);

      // 验证格式
      if (!ruleData.worldName || !ruleData.rules || !Array.isArray(ruleData.rules)) {
        throw new Error('规则格式不正确');
      }

      ruleData.source = 'AI 生成';
      ruleData.rawJson = jsonStr;
      console.log('[Compiler] AI 生成成功', ruleData);
      return ruleData;

    } catch (err) {
      console.warn('[Compiler] AI 调用失败，降级到离线兜底:', err.message);
      const fallback = FallbackRules.match(input);
      // 保留 fallback 原始 source（如"隐藏规则 ✨"），仅在无 source 时才标记降级
      if (!fallback.source) {
        fallback.source = '本地兜底（AI 降级）';
      }
      fallback.rawJson = '';
      return fallback;
    }
  },

  extractJson(text) {
    // 尝试从 markdown 代码块中提取
    const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) return codeBlockMatch[1].trim();

    // 尝试直接找 JSON 对象
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) return jsonMatch[0];

    return text;
  },
};
