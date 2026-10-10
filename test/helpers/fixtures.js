/**
 * test/helpers/fixtures.js —— 单测公用夹具
 *
 * 只被 test/*.test.js require；文件名不是 *.test.js，因此不会被 mocha 当成用例文件加载。
 *
 * 逻辑层七个模块都是「双导出」写法（浏览器挂 window / Node 用 module.exports），
 * 所以这里直接 require 即可，不需要 eval，也不需要 mock DOM。
 * store.js 在 Node 下会自动把 localStorage 降级成进程内内存 shim，
 * 因此 ItemStore 开箱即可测；要验真实 localStorage 路径时，
 * 由 test/store.test.js 自己往 globalThis 上挂一个假的。
 */
'use strict';

const path = require('path');

const JS_DIR = path.join(__dirname, '..', '..', 'js');

const Constant = require(path.join(JS_DIR, 'constant.js'));
const Seed = require(path.join(JS_DIR, 'seed.js'));
const ItemStore = require(path.join(JS_DIR, 'store.js'));
const Validate = require(path.join(JS_DIR, 'validate.js'));
const Search = require(path.join(JS_DIR, 'search.js'));
const Status = require(path.join(JS_DIR, 'status.js'));
const Reward = require(path.join(JS_DIR, 'reward.js'));

/**
 * seed.js 的示例数据规模。**改动示例数据后必须同步改这里**，
 * 否则 test/seed.test.js 与 test/search.test.js 里的期望条数会失效。
 */
const SEED = Object.freeze({
  TOTAL: 24,   // 总条数
  MINE: 6,     // 本人发布
  OTHER: 18,   // 他人发布
  LOST: 14,    // 寻物
  FOUND: 10,   // 招领
  DONE: 8      // 已完结
});

/** 一条完全合法的发布表单，用于「通过校验」的基线；传 overrides 覆盖单个字段 */
function validForm(overrides) {
  return Object.assign({
    type: Constant.TYPE.LOST,
    name: '学生证',
    category: '证件卡类',
    place: '食堂',
    lostTime: '10月9日 中午',
    description: '蓝色卡套，照片页有折痕',
    contact: '微信 stutest'
  }, overrides || {});
}

/** 统计数组中满足条件的条数 */
function countBy(list, predicate) {
  return list.filter(predicate).length;
}

/** 生成 n 个重复字符，用于测长度边界 */
function repeat(ch, n) {
  return new Array(n + 1).join(ch);
}

module.exports = {
  JS_DIR, Constant, Seed, ItemStore, Validate, Search, Status, Reward,
  SEED, validForm, countBy, repeat
};
