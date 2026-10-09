/**
 * js/store.js —— ItemStore：信息存取 + 发布者标识
 *
 * 【当前状态】MOCK（逻辑层 mock 阶段）
 *   内存版实现：数据存在模块内的数组里，刷新页面就回到 6 条示例数据。
 *   语义（含兜底、字段补全、完结时间维护）**已是最终版**，只是持久化介质还没换成 localStorage。
 *   TODO(甲): 把内存数组换成 localStorage（键用 Constant.STORAGE_KEY），
 *            getOwnerId() 换成「localStorage 里没有就生成 UUID 再存回去」，
 *            reset() 顺便清掉 Constant.SEED_FLAG_KEY。
 *
 * 【为什么内存版也要能增删改】乙要验「发布 → 首页多一条 → 我的发布多一条」的完整闭环，
 *   只返回固定假数据的 mock 会让这条流程走不通。
 *
 * 【命名避坑】模块叫 ItemStore，不叫 Storage
 *   —— window.Storage 是浏览器内置构造函数，重名会让「模块是否就绪」的判断永远为真。
 *
 * 【导出】ItemStore.getOwnerId / getAll / save / getById / update / remove / isOwner / reset
 *   空数据返回 []，查不到返回 null，非法输入一律兜底、不抛异常（这些兜底就是单测用例）。
 *
 * 【依赖】constant.js、seed.js（都必须先加载）
 */
(function (root) {
  'use strict';

  const isNode = (typeof module !== 'undefined' && module.exports);
  const C = isNode ? require('./constant.js') : root.Constant;
  if (!C) throw new Error('[store.js] constant.js 未加载：请把 constant.js 放在本文件之前引入');
  const Seed = isNode ? require('./seed.js') : root.Seed;
  if (!Seed) throw new Error('[store.js] seed.js 未加载：请把 seed.js 放在本文件之前引入');

  // MOCK：真实实现会换成 localStorage 里的 UUID，这样不同浏览器数据不互通（刻意的简化）
  const MOCK_OWNER_ID = 'mock-owner-0001';

  let _items = null;   // 内存表；首次访问时灌入示例数据
  let _seq = 0;        // 同一毫秒内连续保存时保证 id 不重复

  function clone(x) {
    return x === null || x === undefined ? x : JSON.parse(JSON.stringify(x));
  }

  function indexOfId(list, id) {
    for (let i = 0; i < list.length; i++) {
      if (list[i].id === id) return i;
    }
    return -1;
  }

  function ensure() {
    if (!_items) _items = Seed.samples(getOwnerId());
    return _items;
  }

  function getOwnerId() {
    return MOCK_OWNER_ID;
  }

  // 返回深拷贝：页面层拿到的对象改不动内部数据，行为和「每次从 localStorage 重新读」一致
  function getAll() {
    return ensure().map(clone);
  }

  function getById(id) {
    const list = ensure();
    const idx = indexOfId(list, id);
    return idx === -1 ? null : clone(list[idx]);
  }

  function save(item) {
    if (!item || typeof item !== 'object') return null;

    const now = Date.now();
    _seq += 1;

    const rec = Object.assign({}, item);
    if (!rec.id) rec.id = String(now) + '-' + _seq + '-' + Math.random().toString(36).slice(2, 7);
    if (!rec.ownerId) rec.ownerId = getOwnerId();
    if (!rec.status) rec.status = C.STATUS.OPEN;
    if (typeof rec.views !== 'number') rec.views = 0;
    rec.createdAt = rec.createdAt || now;
    rec.updatedAt = now;
    if (rec.status === C.STATUS.DONE) {
      rec.closedAt = rec.closedAt || now;
    } else {
      rec.closedAt = null;
    }

    ensure().unshift(rec);   // 新发布的排最前，首页立刻能看到
    return clone(rec);
  }

  function update(id, changes) {
    const list = ensure();
    const idx = indexOfId(list, id);
    if (idx === -1) return null;

    const rec = list[idx];
    Object.assign(rec, changes && typeof changes === 'object' ? changes : {});
    rec.updatedAt = Date.now();

    // 完结时间随状态自动维护：标记完结时补上，撤销完结时清掉
    if (rec.status === C.STATUS.DONE) {
      rec.closedAt = rec.closedAt || rec.updatedAt;
    } else {
      rec.closedAt = null;
    }
    return clone(rec);
  }

  function remove(id) {
    const list = ensure();
    const idx = indexOfId(list, id);
    if (idx === -1) return false;
    list.splice(idx, 1);
    return true;
  }

  function isOwner(item) {
    return !!item && item.ownerId === getOwnerId();
  }

  // 「一键重置」：清空后重新灌入示例数据（附加特点 E7，答辩可反复演示）
  function reset() {
    _items = Seed.samples(getOwnerId());
    return getAll();
  }

  const ItemStore = Object.freeze({
    getOwnerId: getOwnerId,
    getAll: getAll,
    save: save,
    getById: getById,
    update: update,
    remove: remove,
    isOwner: isOwner,
    reset: reset
  });

  if (isNode) {
    module.exports = ItemStore;     // Node / Mocha
  } else {
    root.ItemStore = ItemStore;     // 浏览器 window.ItemStore
  }
})(typeof window !== 'undefined' ? window : globalThis);
