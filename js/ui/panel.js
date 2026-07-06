// ========== 右侧规则面板 ==========

// 转义 HTML，防止 XSS
function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

const Panel = {
  update(ruleData) {
    const content = document.getElementById('rule-content');
    if (!ruleData) {
      content.innerHTML = '<p class="rule-placeholder">等待世界编译...</p>';
      return;
    }

    let html = `<div class="rule-world-name">🌍 ${escapeHtml(ruleData.worldName || '未知世界')}</div>`;

    if (ruleData.rules && ruleData.rules.length > 0) {
      for (const rule of ruleData.rules) {
        const label = rule.parsedLabel || escapeHtml(rule.name || '未知规则');
        html += `
          <div class="rule-item">
            <div class="rule-item-name">${escapeHtml(rule.name || '未知规则')}</div>
            <div class="rule-item-parsed">${label}</div>
            ${rule.impact ? `<div class="rule-item-impact">${escapeHtml(rule.impact)}</div>` : ''}
          </div>
        `;
      }
    }

    const source = ruleData.source || '未知';
    const isAI = source.includes('AI');
    const sourceIcon = isAI ? '✅' : '📦';
    const sourceColor = isAI ? '#10B981' : '#fbbf24';
    html += `<div class="rule-source" style="color:${sourceColor}">${escapeHtml(source)} ${sourceIcon}</div>`;

    if (ruleData.worldVibe) {
      html += `<div style="margin-top: 12px; padding: 8px; background: #0f172a; border-radius: 6px; font-size: 12px; color: #94a3b8; line-height: 1.5;">${escapeHtml(ruleData.worldVibe)}</div>`;
    }

    if (ruleData.rawJson) {
      html += `
        <div class="rule-debug-block">
          <div class="rule-debug-title">AI 原始 JSON</div>
          <pre class="rule-raw-json">${escapeHtml(ruleData.rawJson)}</pre>
        </div>
      `;
    }

    content.innerHTML = html;
  },

  // 角色高亮 — 产品/研发触发时面板边框闪烁
  flashRole(role) {
    const panel = document.getElementById('rule-panel');
    if (!panel) return;
    const color = role === 'product' ? '#fbbf24' : '#10B981';
    panel.style.borderColor = color;
    panel.style.boxShadow = `0 0 16px ${color}66`;
    setTimeout(() => {
      panel.style.borderColor = '';
      panel.style.boxShadow = '';
    }, 1500);
  },
};
