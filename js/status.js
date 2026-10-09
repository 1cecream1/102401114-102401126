/**
 * js/status.js —— 类型与状态文案
 *
 * 【说明】两个函数都是纯只读查询，只读 constant.js，一开始就是最终实现 ——
 *   它没有「假数据」可言，硬造一个返回错误文案的中间版反而会让页面层照着错文案搭 UI。
 *
 * 【导出】
 *   Status.getStatusText(item) → '进行中' / '已找到' / '已归还' / ''
 *     status=open                      → '进行中'
 *     status=done 且 type=lost         → '已找到'
 *     status=done 且 type=found        → '已归还'
 *     item 为空 / 不是对象 / status 非法 → ''（约定值，不抛异常）
 *   Status.getTypeText(type) → '寻物' / '招领' / ''
 *
 * 【依赖】constant.js（必须先加载）
 */
(function (root) {
  'use strict';

  const isNode = (typeof module !== 'undefined' && module.exports);
  const C = isNode ? require('./constant.js') : root.Constant;
  if (!C) throw new Error('[status.js] constant.js 未加载：请把 constant.js 放在本文件之前引入');

  function getTypeText(type) {
    return C.getTypeLabel(type);
  }

  function getStatusText(item) {
    if (!item || typeof item !== 'object') return '';

    if (item.status === C.STATUS.OPEN) return C.STATUS_LABEL.open;

    if (item.status === C.STATUS.DONE) {
      // 完结文案跟类型挂钩；类型非法时回落成通用的「已完结」
      return C.getDoneLabel(item.type) || C.STATUS_LABEL.done;
    }

    return '';
  }

  const Status = Object.freeze({
    getStatusText: getStatusText,
    getTypeText: getTypeText
  });

  if (isNode) {
    module.exports = Status;        // Node / Mocha
  } else {
    root.Status = Status;           // 浏览器 window.Status
  }
})(typeof window !== 'undefined' ? window : globalThis);
