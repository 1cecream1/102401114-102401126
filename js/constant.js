/**
 * js/constant.js —— 全局枚举与文案字典（结对作业二 · 两人共用契约文件）
 *
 * 职责：只放常量 + 纯函数查询/校验助手，不放 DOM、不放 localStorage，
 *      也不放依赖数据对象的方法——如 getStatusText(item) 属于 status.js，别往这里搬，
 *      否则本文件会膨胀成第二个 app.js。
 * 引用：HTML 里 constant.js 必须最先加载；Node 用 require('../js/constant.js')。
 * 约定：CATEGORY / PLACE 元素即中文标签，直接作为数据值存储，便于子串搜索。
 * 所有集合已 Object.freeze，页面层不要原地修改，需要派生数组请先 .slice()。
 *
 * 维护人：颜俊宇（102401114）
 */
(function (root) {
  'use strict';

  /* ---------- 一、基础常量 ---------- */
  const STORAGE_KEY = 'campus-lost-found:items';
  const OWNER_KEY = 'campus-lost-found:ownerId';
  const SEED_FLAG_KEY = 'campus-lost-found:seeded';
  const SCHEMA_VERSION = 1;
  const FILTER_ALL = 'all'; // 「不筛选」统一哨兵值，禁止再写裸 'all'

  /* ---------- 二、类型 type ---------- */
  const TYPE = Object.freeze({ LOST: 'lost', FOUND: 'found' });
  const TYPE_LABEL = Object.freeze({ lost: '寻物', found: '招领' });
  const TYPE_TAG_CLASS = Object.freeze({ lost: 'tag-lost', found: 'tag-found' });

  const TYPE_TABS = Object.freeze([
    Object.freeze({ value: FILTER_ALL,  label: '全部' }),
    Object.freeze({ value: TYPE.LOST,   label: TYPE_LABEL.lost }),
    Object.freeze({ value: TYPE.FOUND,  label: TYPE_LABEL.found })
  ]);

  // 发布页两个 tab：地点/时间等文案随类型切换（F2 / F3）
  const POST_TABS = Object.freeze([
    Object.freeze({
      value: TYPE.LOST,
      title: '我丢了东西', sub: '发布寻物信息',
      placeLabel: '丢失地点', timeLabel: '丢失时间',
      timePlaceholder: '如：9月25日 下午',
      namePlaceholder: '如：校园卡、黑色雨伞',
      descPlaceholder: '补充特征方便辨认，如：黑色雨伞，伞柄挂了只小黄鸭'
    }),
    Object.freeze({
      value: TYPE.FOUND,
      title: '我捡到东西', sub: '发布招领信息',
      placeLabel: '拾获地点', timeLabel: '拾获时间',
      timePlaceholder: '如：9月26日 上午',
      namePlaceholder: '如：校园卡、黑色雨伞',
      descPlaceholder: '补充特征便于失主确认，如：拾到一张校园卡，姓名首字为「李」'
    })
  ]);

  /* ---------- 三、状态 status ---------- */
  const STATUS = Object.freeze({ OPEN: 'open', DONE: 'done' });
  const STATUS_LABEL = Object.freeze({ open: '进行中', done: '已完结' });
  // 完结文案随类型走，status.js 的 getStatusText(item) 就是读这张表 + DONE_LABEL
  const DONE_LABEL = Object.freeze({ lost: '已找到', found: '已归还' });

  const STATUS_FILTER_OPTIONS = Object.freeze([
    Object.freeze({ value: FILTER_ALL,   label: '全部状态' }),
    Object.freeze({ value: STATUS.OPEN,  label: STATUS_LABEL.open }),
    Object.freeze({ value: STATUS.DONE,  label: STATUS_LABEL.done })
  ]);

  const ACTION_LABEL = Object.freeze({ lost: '标记为已找到', found: '标记为已归还' });
  const REVOKE_LABEL = '撤销完结';
  const DELETE_LABEL = '删除';

  /* ---------- 三·补、打赏与悬赏 ----------
   * 悬赏 = 失主发布寻物帖时承诺的奖励（纯展示）；打赏 = 访客在招领帖详情页的记录。
   * 两者共用同一套金额判据 isValidAmount，避免页面层各处各写一份。
   */
  const TIP_AMOUNTS = Object.freeze([2, 5, 10, 20]);            // 打赏弹层固定档位（元）
  const AMOUNT_LIMIT = Object.freeze({ min: 1, max: 200 });     // 悬赏 / 打赏共用区间：整数元

  /* ---------- 四、分类 category（8 类） ---------- */
  const CATEGORY = Object.freeze([
    '证件卡类', '钥匙门禁', '电子产品', '日用品',
    '书籍资料', '运动器材', '服饰饰品', '其他'
  ]);

  const CATEGORY_ICON = Object.freeze({
    '证件卡类': '💳', '钥匙门禁': '🔑', '电子产品': '🎧', '日用品': '☂️',
    '书籍资料': '📚', '运动器材': '🏀', '服饰饰品': '🧣', '其他': '📦'
  });

  /* ---------- 五、地点 place（8 处） ---------- */
  const PLACE = Object.freeze([
    '教学楼', '图书馆', '食堂', '宿舍楼',
    '体育场', '校道', '校车站', '快递点'
  ]);

  /* ---------- 六、排序 sort ----------
   * ⚠️ lostTime 是自由文本，无法可靠排序；「最近丢失」读的是时间戳字段 lostAt，
   *    缺失时回落到 createdAt。发布表单需同时写入 text 与 lostAt。
   */
  const SORT = Object.freeze({
    LATEST: 'latest', LOST_TIME: 'lostTime', HOT: 'hot'
  });

  const SORT_OPTIONS = Object.freeze([
    Object.freeze({ value: SORT.LATEST,    label: '最新发布', field: 'createdAt', fallbackField: 'createdAt' }),
    Object.freeze({ value: SORT.LOST_TIME, label: '最近丢失', field: 'lostAt',    fallbackField: 'createdAt' }),
    Object.freeze({ value: SORT.HOT,       label: '最多浏览', field: 'views',     fallbackField: 'views' })
  ]);

  const DEFAULT_SORT = SORT.LATEST;

  /* ---------- 七、字段长度限制 ---------- */
  const LIMITS = Object.freeze({
    name: 30,       // 物品名称 ≤30 字
    lostTime: 20,   // 丢失/拾获时间 ≤20 字
    description: 200,
    contactMin: 3,
    contactMax: 60,
    tipNote: 20     // 打赏留言 ≤20 字
  });

  /* ---------- 八、文案字典 ---------- */
  const TEXT = Object.freeze({
    appName: '校园失物招领',
    slogan: '丢了东西别着急，捡到东西别闲着',

    searchPlaceholder: '搜索物品名称，如：校园卡、钥匙…',
    searchEmptyTitle: '没有找到相关物品',
    searchEmptySub: '换个关键词试试，或去发布一条求助信息',
    homeEmptyTitle: '暂时还没有信息',
    homeEmptySub: '点「发布」按钮，把第一条信息贴上来',
    mineEmptyTitle: '你还没有发布过信息',
    mineEmptySub: '发布后可以在这里标记「已找到 / 已归还」',
    searchResultTip: '共找到 {n} 条结果',

    statLabel: Object.freeze({
      total: '累计信息', lost: '寻物', found: '招领', doneRate: '已完结比例'
    }),

    contactMasked: '●●●●●●●●',
    contactReveal: '查看联系方式',
    contactCopy: '复制联系方式',
    copySuccess: '联系方式已复制，去联系 TA 吧',
    copyFail: '复制失败，请手动选中后复制',

    postSuccessTitle: '发布成功',
    postSuccessSub: '信息已公开，好心人看到会联系你',
    postAgain: '再发一条',
    viewDetail: '查看详情',

    similarTip: '库里有 {n} 条同类的招领信息，可能已被捡到，先去看看？',

    // —— 悬赏（寻物帖发布时填写，纯展示）——
    rewardBadge: '🎁 悬赏 ¥{amount}',
    rewardFieldLabel: '悬赏金额（选填）',
    rewardFieldHint: '物品找回后自愿兑现，仅作展示，不涉及线上支付',
    rewardPlaceholder: '如 20（单位：元，1~200 整数）',
    rewardDetail: '🎁 悬赏 ¥{amount}，找回后自愿兑现',
    errReward: '悬赏金额需为 {min}~{max} 的整数',

    // —— 打赏（招领帖详情页，落本地记录）——
    tipButton: '🎁 打赏拾金不昧者',
    tipPanelTitle: '打赏拾金不昧者',
    tipPanelSub: '心意随喜，不与物品价值挂钩',
    tipCustomPlaceholder: '自定义金额',
    tipNotePlaceholder: '留句话（选填，≤20 字）',
    tipConfirm: '确认打赏',
    tipSuccess: '打赏成功，谢谢你的善意',
    tipWallTitle: '收到的打赏',
    tipWallEmpty: '还没有人打赏',
    tipWallEmptySub: '把这条转发给失主，让 TA 看到',
    tipSummary: '共 {n} 次 · ¥{amount}',
    tipRecordNote: '未留言',
    tipDemoNote: '演示：打赏仅在本机记录，不涉及真实支付',
    errTipAmount: '请选择或输入 {min}~{max} 之间的整数金额',

    confirmClose: '确定标记为「{label}」吗？标记后列表和详情都会同步更新。',
    confirmDelete: '删除后无法恢复，确定删除这条信息吗？',
    confirmReset: '将清空本机全部数据并恢复 24 条示例信息，确定继续吗？',
    toastSaved: '已保存',
    toastUpdated: '已更新',
    toastDeleted: '已删除',
    toastNotFound: '这条信息不存在或已被删除',

    timeJustNow: '刚刚发布',
    timeMinutesAgo: '{n} 分钟前发布',
    timeHoursAgo: '{n} 小时前发布',
    timeDaysAgo: '{n} 天前发布',
    timeStale: '发布时间已超过 30 天，信息可能已过时'
  });

  const HOT_WORDS = Object.freeze(['校园卡', '钥匙', '水杯', '耳机', '雨伞', '书']);

  /* ---------- 九、查询与校验助手（纯函数） ---------- */
  const findByValue = (list, value) => {
    for (let i = 0; i < list.length; i++) {
      if (list[i].value === value) return list[i];
    }
    return null;
  };

  const isValidType     = v => v === TYPE.LOST || v === TYPE.FOUND;
  const isValidStatus   = v => v === STATUS.OPEN || v === STATUS.DONE;
  const isValidCategory = v => CATEGORY.indexOf(v) !== -1;
  const isValidPlace    = v => PLACE.indexOf(v) !== -1;
  const isValidSort     = v => SORT_OPTIONS.some(o => o.value === v);
  // 金额：必须是非 NaN 的整数，且落在 AMOUNT_LIMIT 区间内。
  // 字符串 '20' / 小数 1.5 / 越界 201 / 空值 一律 false —— 页面层、validate.js、reward.js 共用这一个判据。
  const isValidAmount   = v => typeof v === 'number' && isFinite(v)
    && Math.floor(v) === v && v >= AMOUNT_LIMIT.min && v <= AMOUNT_LIMIT.max;
  // 只校验首页 tab（all/lost/found）。状态筛选那组请用 FILTER_ALL + isValidStatus()，
  // 用本函数会把 'open' 误判成非法。
  const isValidTabValue = v => v === FILTER_ALL || isValidType(v);

  // 未知分类回落到「其他」图标；非法 type/status 返回空串（不抛异常）
  const getCategoryIcon = c => CATEGORY_ICON[c] || CATEGORY_ICON['其他'];
  const getTypeLabel    = t => TYPE_LABEL[t] || '';
  const getStatusLabel  = s => STATUS_LABEL[s] || '';
  const getDoneLabel    = t => DONE_LABEL[t] || '';

  // 非法值回落默认 tab，始终返回对象、不返回 null
  const getPostTab = t => findByValue(POST_TABS, t) || POST_TABS[0];
  const getTypeTab = v => findByValue(TYPE_TABS, v) || TYPE_TABS[0];

  /* ---------- 十、导出 ---------- */
  const Constant = Object.freeze({
    STORAGE_KEY, OWNER_KEY, SEED_FLAG_KEY, SCHEMA_VERSION, FILTER_ALL,

    TYPE, TYPE_LABEL, TYPE_TAG_CLASS, TYPE_TABS, POST_TABS,

    STATUS, STATUS_LABEL, DONE_LABEL, STATUS_FILTER_OPTIONS,
    ACTION_LABEL, REVOKE_LABEL, DELETE_LABEL,

    CATEGORY, CATEGORY_ICON, PLACE,

    SORT, SORT_OPTIONS, DEFAULT_SORT,

    TIP_AMOUNTS, AMOUNT_LIMIT,

    LIMITS, TEXT, HOT_WORDS,

    isValidType, isValidStatus, isValidCategory, isValidPlace, isValidSort,
    isValidTabValue, getCategoryIcon, getTypeLabel, getStatusLabel, getDoneLabel,
    getPostTab, getTypeTab, findByValue,
    isValidAmount
  });

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Constant;   // Node / Mocha
  } else {
    root.Constant = Constant;    // 浏览器 window.Constant
  }
})(typeof window !== 'undefined' ? window : globalThis);
