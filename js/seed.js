/**
 * js/seed.js —— 示例数据（首次访问自动灌入 / 「一键重置」时重新灌入）
 *
 * 【当前状态】MOCK —— 只有 6 条占位数据。
 *   但 6 条已覆盖演示需要的全部组合：
 *   本人发布 / 他人发布、寻物 / 招领、进行中 / 已完结、3 小时内新发布 / 超过 30 天的过时信息。
 *   TODO(甲): 扩到 24 条真实感描述，并保证 8 个分类、8 个地点都出现过。
 *
 * 【导出】Seed.samples(ownerId)
 *   ownerId = 当前浏览器的发布者标识。前 3 条以它作为 ownerId，
 *   这样「我的发布」页一打开就有内容（答辩演示必需，见开发方案 §14 风险表）。
 *   不传时用 'seed-owner' 兜底，方便 Node 单测直接调用。
 *
 * 【依赖】constant.js（必须先加载）
 */
(function (root) {
  'use strict';

  const C = (typeof module !== 'undefined' && module.exports)
    ? require('./constant.js')
    : root.Constant;
  if (!C) throw new Error('[seed.js] constant.js 未加载：请把 constant.js 放在本文件之前引入');

  const MINUTE = 60 * 1000;
  const HOUR = 60 * MINUTE;
  const DAY = 24 * HOUR;

  // 示例数据里「不是自己发的那几条」的固定发布者标识
  const OTHER_OWNER_ID = 'seed-other-owner';

  /**
   * 返回示例数据数组。
   * 时间戳按「相对当前时刻」生成（3 小时前、33 天前…），
   * 这样每次打开页面看到的新鲜度提示都是活的，也方便验附加特点 E6。
   */
  function samples(ownerId) {
    const me = ownerId || 'seed-owner';
    const now = Date.now();

    // agoMs          发布时间距今多久
    // lostBeforeMs   丢失/拾获时间比发布时间早多久（近似）
    // closedAfterMs  已完结的话，完结时间比发布时间晚多久
    const raw = [
      { mine: true,  type: C.TYPE.LOST,  name: '校园卡', category: '证件卡类', place: '图书馆',
        lostTime: '10月9日 下午', agoMs: 3 * HOUR, lostBeforeMs: 2 * HOUR,
        description: '白色卡套，姓名李**，卡号尾号 3721。在三楼自习区靠窗的位置丢的，捡到的同学麻烦联系我。',
        contact: '微信 lixx_2024', status: C.STATUS.OPEN, views: 42 },

      { mine: true,  type: C.TYPE.FOUND, name: '黑色雨伞', category: '日用品', place: '食堂',
        lostTime: '10月8日 中午', agoMs: 1 * DAY, lostBeforeMs: 3 * HOUR,
        description: '伞柄上挂着一只小黄鸭挂件，应该是一楼窗口附近落下的，已交给出餐台阿姨。',
        contact: 'QQ 1234567（备注失物）', status: C.STATUS.DONE, views: 15, closedAfterMs: 5 * HOUR },

      { mine: true,  type: C.TYPE.LOST,  name: '蓝牙耳机', category: '电子产品', place: '体育场',
        lostTime: '10月9日 上午', agoMs: 5 * HOUR, lostBeforeMs: 1 * HOUR,
        description: '白色充电盒，盒盖内侧贴了一张小熊贴纸。跑完步发现不见了，范围应该在看台东侧。',
        contact: '138-0000-1234', status: C.STATUS.OPEN, views: 88 },

      { mine: false, type: C.TYPE.LOST,  name: '宿舍钥匙', category: '钥匙门禁', place: '宿舍楼',
        lostTime: '9月6日 上午', agoMs: 33 * DAY, lostBeforeMs: 2 * HOUR,
        description: '两把钥匙串在一个蓝色挂绳上，挂绳印着校徽，可能落在 3 号楼楼梯口了。',
        contact: '微信 key_finder', status: C.STATUS.OPEN, views: 30 },

      { mine: false, type: C.TYPE.FOUND, name: '高等数学（上册）教材', category: '书籍资料', place: '教学楼',
        lostTime: '10月7日 下午', agoMs: 2 * DAY, lostBeforeMs: 4 * HOUR,
        description: '书页里有不少铅笔笔记，扉页写着班级，已放在四教 208 讲台边的失物架上。',
        contact: 'QQ 8765432', status: C.STATUS.DONE, views: 61, closedAfterMs: 20 * HOUR },

      { mine: false, type: C.TYPE.LOST,  name: '保温水杯', category: '日用品', place: '校车站',
        lostTime: '10月9日 下午', agoMs: 30 * MINUTE, lostBeforeMs: 20 * MINUTE,
        description: '银灰色 500ml 保温杯，杯身上有一道浅浅的划痕，等车的时候放在长椅上忘了拿。',
        contact: '微信 cup_back', status: C.STATUS.OPEN, views: 7 }
    ];

    return raw.map(function (r, index) {
      const createdAt = now - r.agoMs;
      const lostAt = createdAt - (r.lostBeforeMs || 0);
      const isDone = r.status === C.STATUS.DONE;
      const closedAt = isDone ? createdAt + (r.closedAfterMs || HOUR) : null;

      return {
        id: 'seed-' + (index + 1) + '-' + (1000 + index),
        ownerId: r.mine ? me : OTHER_OWNER_ID,
        type: r.type,
        name: r.name,
        category: r.category,
        place: r.place,
        lostTime: r.lostTime,
        lostAt: lostAt,              // 排序用时间戳；lostTime 是对外展示的自由文本
        description: r.description,
        contact: r.contact,
        status: r.status,
        views: r.views,
        createdAt: createdAt,
        updatedAt: closedAt || createdAt,
        closedAt: closedAt
      };
    });
  }

  const Seed = Object.freeze({
    OTHER_OWNER_ID: OTHER_OWNER_ID,
    samples: samples
  });

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Seed;          // Node / Mocha
  } else {
    root.Seed = Seed;               // 浏览器 window.Seed
  }
})(typeof window !== 'undefined' ? window : globalThis);
