/**
 * js/reward.js —— 悬赏与打赏的读写与统计（纯函数，不碰 DOM、不碰 localStorage）
 *
 * 【职责】把「一条信息上的悬赏金额与打赏记录」收敛在这里：
 *   · 打赏记录只增不改：addTip 返回**新对象**，不动传入的 item
 *     —— 与 ItemStore 的深拷贝取向一致，页面层拿到的数据永远是干净的；
 *   · 累计值一律由 tips 数组派生，不落冗余字段，避免「数组与总额漂移」；
 *   · 金额合法性一律走 Constant.isValidAmount，判据只有一处；
 *   · 不引入任何随机之外的副作用；tip 的 id 用「时间戳 + 随机后缀」保证唯一。
 *
 * 【为什么单独一个模块】constant.js 的文件头写明它只放「不依赖数据对象的纯常量与助手」，
 *   而 getTipList(item) 这类要读数据对象的方法按规矩归到独立模块（与 status.js 同理）。
 *
 * 【导出】
 *   Reward.getTipList(item)                 → 打赏记录数组（无记录 / 脏数据一律 []）
 *   Reward.getTipTotal(item)                → { count, total }   派生累计
 *   Reward.summarizeReward(item)            → { hasReward, rewardAmount, tipCount, tipTotal }
 *   Reward.makeTip(amount, note, now)       → 打赏记录对象；金额非法返回 null
 *   Reward.addTip(item, amount, note, now)  → 追加后的**新** item；金额非法返回 null
 *   Reward.canTip(item, isOwner)            → 是否展示打赏入口（招领帖且非本人）
 *   Reward.isValidAmount(v)                 → 透出 Constant.isValidAmount，页面层一个入口
 *
 * 【依赖】constant.js（必须先加载）
 *
 * 维护人：颜俊宇（102401114）
 */
(function (root) {
  'use strict';

  const isNode = (typeof module !== 'undefined' && module.exports);
  const C = isNode ? require('./constant.js') : root.Constant;
  if (!C) throw new Error('[reward.js] constant.js 未加载：请把 constant.js 放在本文件之前引入');

  /* ==================== 一、读取 ==================== */

  // 打赏记录数组：非数组 / 含非对象元素时一律兜底，页面层不用做存在性判断
  function getTipList(item) {
    if (!item || typeof item !== 'object' || !Array.isArray(item.tips)) return [];
    return item.tips.filter(function (t) {
      return t && typeof t === 'object';
    });
  }

  // 累计：条数与总额都由数组现算；amount 不是有限数字的记录计入条数但不计入金额
  function getTipTotal(item) {
    const list = getTipList(item);
    let total = 0;
    for (let i = 0; i < list.length; i++) {
      if (typeof list[i].amount === 'number' && isFinite(list[i].amount)) {
        total += list[i].amount;
      }
    }
    return { count: list.length, total: total };
  }

  // 悬赏 + 打赏合并成一份摘要，页面层一次取齐，不用自己判断字段是否存在
  function summarizeReward(item) {
    const raw = (item && typeof item.rewardAmount === 'number') ? item.rewardAmount : 0;
    const amount = raw > 0 ? raw : 0;
    const t = getTipTotal(item);
    return {
      hasReward: amount > 0,
      rewardAmount: amount,
      tipCount: t.count,
      tipTotal: t.total
    };
  }

  /* ==================== 二、写入 ==================== */

  // 构造一条打赏记录：金额非法返回 null；留言自动 trim 并截到 LIMITS.tipNote
  function makeTip(amount, note, now) {
    if (!C.isValidAmount(amount)) return null;

    const text = typeof note === 'string' ? note.trim().slice(0, C.LIMITS.tipNote) : '';
    const ts = (typeof now === 'number' && isFinite(now)) ? now : Date.now();

    return {
      id: 'tip-' + ts + '-' + Math.random().toString(36).slice(2, 8),
      amount: amount,
      note: text,
      at: ts
    };
  }

  // 追加一条打赏：返回新对象，原 item 一个字节都不动
  function addTip(item, amount, note, now) {
    const tip = makeTip(amount, note, now);
    if (!tip) return null;

    const next = JSON.parse(JSON.stringify(item));
    if (!Array.isArray(next.tips)) next.tips = [];
    next.tips.push(tip);
    return next;
  }

  /* ==================== 三、入口判定 ==================== */

  // 打赏只出现在「招领帖」且「不是自己发的」详情页
  // —— 寻物帖走「悬赏」那条线，自己给自己打赏没有意义
  function canTip(item, isOwner) {
    return !!item && item.type === C.TYPE.FOUND && isOwner !== true;
  }

  /* ==================== 四、导出 ==================== */
  const Reward = Object.freeze({
    getTipList: getTipList,
    getTipTotal: getTipTotal,
    summarizeReward: summarizeReward,
    makeTip: makeTip,
    addTip: addTip,
    canTip: canTip,
    isValidAmount: C.isValidAmount
  });

  if (isNode) {
    module.exports = Reward;        // Node / Mocha
  } else {
    root.Reward = Reward;           // 浏览器 window.Reward
  }
})(typeof window !== 'undefined' ? window : globalThis);
