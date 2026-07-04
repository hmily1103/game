// ========== 测试 idea 毒舌吐槽系统 ==========
// 在玩家各种行为时弹出像素风格吐槽气泡，模拟测试同学的内心 OS

const Roast = {
  // 吐槽气泡 DOM 元素
  bubble: null,
  // 当前是否正在显示
  showing: false,
  // 当前定时器
  timer: null,
  // 打字机定时器
  typeTimer: null,
  // 上次吐槽时间（防刷屏）
  lastRoastTime: 0,
  // 最小间隔（帧）
  minInterval: 80, // 约1.3秒
  // 吐槽历史（避免重复）
  recentRoasts: [],

  // 吐槽文案库 — 按触发场景分类
  lines: {
    // 放炸弹时
    placeBomb: [
      '又放炸弹？你搁这排雷呢？',
      '炸炸炸，就知道炸，能不能温柔点？',
      '这颗炸弹的测试用例你写了吗？',
      '放炸弹不写文档，回头谁维护？',
      '你这炸弹覆盖率够吗？边界测了吗？',
      '一个炸弹就想解决所有问题？太天真了',
      '我有一个idea：能不能不炸？',
      '炸弹的回归测试做了吗就放？',
      '你这炸弹在我电脑上应该不会炸',
      '放炸弹之前做过风险评估吗？',
    ],
    // 炸屎山时
    destroyShishan: [
      '屎山炸了，但味道还在',
      '清理屎山？你想多了，产品马上加新的',
      '炸掉一座屎山，长出两座新的',
      '这屎山的注释比代码还少',
      '屎山：我裂开了',
      '你炸的不是屎山，是前同事的心血',
      '终于清了！等等，那后面还有一堆...',
      '我有个idea：别炸了，直接重写',
      '屎山的质量比你的代码好多了',
      '炸屎山的时候注意别溅一身',
      '加速炸屎山？屎都飞到隔壁工位了！',
      '屎山飞出屏幕了！保洁阿姨追出去了！',
      '这速度，屎山直接起飞申请航线了',
      '加速炸屎，物理意义上的屎上加速',
    ],
    // 杀普通 Bug 时
    killBug: [
      '杀得好！下一个！',
      '这个Bug我找了三天，你一秒就炸了？',
      'Bug：我申请劳动仲裁',
      '杀Bug容易，写报告难',
      '这个Bug的死法需要记录到测试报告',
      'Bug Hunter，不过如此',
      '杀了一个Bug，来了两个新的，值不值？',
      '这个Bug的复现步骤你记了吗？',
      'Bug：我只是个特性，为什么杀我',
      '杀Bug一时爽，写Bug单火葬场',
    ],
    // 被炸/被Bug碰时
    takeDamage: [
      '测试同学，你也被炸了？',
      '你这走位是测试过的吗？',
      '伤害也是测试的一部分',
      '记一下：玩家会被自己的炸弹炸死',
      '这个Bug...直接把测试干掉了',
      '测试工程师倒下了，Bug还在笑',
      '你死了我谁来测？起来！',
      '被Bug碰了就倒？抗压能力不行',
      '这也算一次测试：测试人员死亡率',
      '我有个idea：下次别往炸弹上走',
    ],
    // 发呆太久
    idle: [
      '站着干嘛？Bug不会自己死',
      '发呆也是一种测试策略？',
      '你是不是在等Bug自己消失？',
      '站着不动，是在做压力测试吗？',
      '测试同学，KPI不等人',
      '再不动弹产品又要催了',
      '你在冥想Bug的位置吗？',
      '发呆扣工资，产品说的不是我',
      '站着不动是最佳测试策略——出自产品经理',
      '我有个idea：你动一下试试？',
    ],
    // 拾取道具时
    pickup: [
      '吃鸡腿不写测试报告，扣钱',
      '天降大饼？测试一下有没有毒',
      '喝奶茶不给我带一杯？',
      '你倒是吃啊，Bug等着呢',
      '加血道具的边界值你测了吗？',
      '这个鸡腿是哪位前同事留下的？',
      '吃完了？吃完了继续干活',
      '测试部规定：吃东西不能超过5秒',
      '鸡腿的保质期测过没？',
      '我有个idea：鸡腿能不能批量采购',
      '加速了？能不能顺便加速一下提测流程？',
      '喝了加速器，测速倒是快了，测质量呢？',
      '跑这么快，Bug复现步骤记了吗？',
      '加速10秒，产品说需求也要加速10倍',
      '你加速了，Bug怎么不加速？不公平',
    ],
    // 特殊 Bug 出现时
    specialBug: [
      '来了来了，大BOSS来了！',
      '这个Bug我复现不了...等等，它自己出来了',
      '测试同学的血压又上来了',
      '这种Bug得加鸡腿才能杀',
      '我已经在写事故报告了',
      '产品经理看了直呼内行',
      '这个Bug的优先级...等等它自己就是P0',
      '测试idea：能不能让它自己走？',
      '我有一个idea：跑',
      '别慌，先截个图发群里',
      '一大波Bug？我选择原地辞职',
      '这波Bug来得比我工资还快',
      '研发你是不是把main分支直接合了？',
      '这么多Bug，测试报告得写到明年',
      'Bug浪潮来了，我需要一个鸡腿护体',
    ],
    // 通关/胜利时
    victory: [
      '通关了？产品说还有300个需求等着',
      '你赢了游戏，但赢不了加班',
      'Bug清零了，但你的工时还没清零',
      '恭喜！你的奖励是：明天继续',
      '测试通过，但产品说不对，要重测',
      '版本发布了，然后呢？然后是下一个版本',
      '你赢了！HR说：太好了，不用招人了',
      '通关感言：感谢Bug的不杀之恩',
      '我有个idea：别通关，继续测',
      'Bug：我们会回来的',
    ],
  },

  init() {
    this.bubble = document.getElementById('roast-bubble');
    this.showing = false;
    this.recentRoasts = [];
  },

  // 触发吐槽
  trigger(type) {
    if (!this.bubble) this.init();
    if (!this.bubble) return;

    // 防刷屏
    const now = Game.frameCount;
    if (this.showing && now - this.lastRoastTime < this.minInterval) return;
    this.lastRoastTime = now;

    const lines = this.lines[type];
    if (!lines || lines.length === 0) return;

    // 避免最近重复
    let msg;
    let attempts = 0;
    do {
      msg = lines[Math.floor(Math.random() * lines.length)];
      attempts++;
    } while (this.recentRoasts.includes(msg) && attempts < 5);

    this.recentRoasts.push(msg);
    if (this.recentRoasts.length > 8) this.recentRoasts.shift();

    this.show(msg);
  },

  // 显示吐槽气泡 — 打字机效果
  show(text) {
    if (this.timer) clearTimeout(this.timer);
    if (this.typeTimer) clearInterval(this.typeTimer);

    this.bubble.classList.remove('show');
    this.bubble.innerHTML = '';

    // 强制重排
    void this.bubble.offsetWidth;

    this.bubble.classList.add('show');
    this.showing = true;

    // 打字机效果
    let i = 0;
    const speed = 35; // 每字35ms
    this.typeTimer = setInterval(() => {
      if (i < text.length) {
        this.bubble.textContent = text.substring(0, i + 1);
        i++;
      } else {
        clearInterval(this.typeTimer);
        this.typeTimer = null;
      }
    }, speed);

    // 3秒后隐藏
    this.timer = setTimeout(() => {
      this.hide();
    }, 3500);
  },

  hide() {
    if (this.bubble) {
      this.bubble.classList.remove('show');
    }
    this.showing = false;
    if (this.typeTimer) {
      clearInterval(this.typeTimer);
      this.typeTimer = null;
    }
  },
};
