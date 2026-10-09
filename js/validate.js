/**
 * js/validate.js —— 表单校验
 *
 * 【当前状态】MOCK（逻辑层 mock 阶段）
 *   已实现：必填项 + 名称/联系方式长度下限 + 分类/地点/类型合法性。
 *   —— 这几条必须真校验，否则乙没法验「发布页逐项标红」（页面层任务 5）。
 *   TODO(甲): 补 description ≤200、lostTime ≤20 的字数校验，
 *            并把每条规则补上「通过 / 不通过」两个分支的单测。
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
      errors.name = '物品名称不超过 ' + C.LIMITS.name + ' 字，现在 ' + name.length + ' 字';
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

    // TODO(甲): 描述 ≤ LIMITS.description、丢失时间 ≤ LIMITS.lostTime 的字数校验

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
