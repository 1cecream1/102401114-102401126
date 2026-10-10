/**
 * js/validate.js —— 表单校验
 *
 * 【实现】逐字段给出中文错误文案，页面层按 errors 的键逐项标红。
 *   覆盖：类型枚举 / 名称必填与长度 / 分类枚举 / 地点枚举 / 描述长度 /
 *        丢失时间必填与长度 / 联系方式必填与长度 / 悬赏金额（选填，1~200 整数）。
 *   长度上限一律从 Constant.LIMITS 取，与 index.html 上 input 的 maxlength 一致
 *   —— 正常手输到不了上限，这两条是防「程序化写入 / 粘贴绕过」的兜底。
 *
 * 【导出】Validate.validateItem(data) → { valid: boolean, errors: { 字段名: 提示文案 } }
 *   errors 按字段归类，页面层逐项读它标红；全部合法时 errors 为 {}。
 *   非法输入（null / 字符串 / undefined）兜底成 { valid:false, errors:{type:'…'} }，不抛异常。
 *
 * 【依赖】constant.js（必须先加载）
 */
(function (root) {
  'use strict';

  const isNode = (typeof module !== 'undefined' && module.exports);
  const C = isNode ? require('./constant.js') : root.Constant;
  if (!C) throw new Error('[validate.js] constant.js 未加载：请把 constant.js 放在本文件之前引入');

  function text(v) {
    return typeof v === 'string' ? v.trim() : '';
  }

  // 「xxx 不超过 N 字，现在 M 字」——统一措辞，避免各处文案不一致
  function tooLong(label, value, limit) {
    return label + '不超过 ' + limit + ' 字，现在 ' + value.length + ' 字';
  }

  function validateItem(data) {
    const errors = {};
    const d = (data && typeof data === 'object') ? data : {};

    // 类型：必须是 lost / found（表单 tab 决定，正常不会错，防手改）
    if (!C.isValidType(d.type)) {
      errors.type = '请选择「我丢了东西」或「我捡到东西」';
    }

    // 物品名称：必填 ≤30 字
    const name = text(d.name);
    if (!name) {
      errors.name = '请填写物品名称';
    } else if (name.length > C.LIMITS.name) {
      errors.name = tooLong('物品名称', name, C.LIMITS.name);
    }

    // 分类：必须是 8 类之一
    if (!C.isValidCategory(d.category)) {
      errors.category = '请选择物品分类';
    }

    // 地点：必须是 8 处之一；提示文案随类型切换（丢失地点 / 拾获地点）
    if (!C.isValidPlace(d.place)) {
      errors.place = '请选择' + C.getPostTab(d.type).placeLabel;
    }

    // 联系方式：必填 ≥3 字（只在详情页展示，不校验格式）
    const contact = text(d.contact);
    if (!contact) {
      errors.contact = '请填写联系方式，方便失主或拾获者联系你';
    } else if (contact.length < C.LIMITS.contactMin) {
      errors.contact = '联系方式至少 ' + C.LIMITS.contactMin + ' 字，现在 ' + contact.length + ' 字';
    } else if (contact.length > C.LIMITS.contactMax) {
      errors.contact = '联系方式不超过 ' + C.LIMITS.contactMax + ' 字';
    }

    // 丢失 / 拾获时间：必填 ≤20 字（自由文本，只限长度、不解析格式）
    const lostTime = text(d.lostTime);
    if (!lostTime) {
      errors.lostTime = '请填写' + C.getPostTab(d.type).timeLabel;
    } else if (lostTime.length > C.LIMITS.lostTime) {
      errors.lostTime = tooLong(C.getPostTab(d.type).timeLabel, lostTime, C.LIMITS.lostTime);
    }

    // 物品描述：选填，但不超过 200 字
    const description = text(d.description);
    if (description.length > C.LIMITS.description) {
      errors.description = tooLong('物品描述', description, C.LIMITS.description);
    }

    // 悬赏金额：选填。空串 / null / 0 都视为「不设悬赏」；填了就必须是 1~200 的整数。
    // 表单传进来的是字符串，这里先 Number() 再走统一判据；非法字符串会得到 NaN，同样被判 false。
    const raw = d.rewardAmount;
    if (raw !== undefined && raw !== null && raw !== '' && raw !== 0) {
      const n = (typeof raw === 'number') ? raw : Number(String(raw).trim());
      if (!C.isValidAmount(n)) {
        errors.rewardAmount = C.TEXT.errReward
          .replace('{min}', C.AMOUNT_LIMIT.min)
          .replace('{max}', C.AMOUNT_LIMIT.max);
      }
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors: errors
    };
  }

  const Validate = Object.freeze({
    validateItem: validateItem
  });

  if (isNode) {
    module.exports = Validate;      // Node / Mocha
  } else {
    root.Validate = Validate;       // 浏览器 window.Validate
  }
})(typeof window !== 'undefined' ? window : globalThis);
