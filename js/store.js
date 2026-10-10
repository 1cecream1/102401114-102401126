/**
 * js/store.js —— ItemStore：信息存取 + 发布者标识
 *
 * 【实现】浏览器用 localStorage 持久化，页面刷新、关掉再打开数据都还在。
 *   · 数据键   Constant.STORAGE_KEY（'campus-lost-found:items'）
 *   · 标识键   Constant.OWNER_KEY，首次访问生成 UUID 并落盘，之后一直复用
 *   · 灌入标记 Constant.SEED_FLAG_KEY，用来区分「首次访问该灌示例数据」和
 *             「用户自己把信息全删光了」——后者不该被重新灌数据
 *
 * 【Node 环境怎么办】单元测试跑在 Node 里，没有 localStorage。
 *   此时自动降级成进程内的内存 shim（见 pickStorage），
 *   行为与浏览器一致，只是不跨进程持久化 —— 所以 Mocha 能直接 require 本文件。
 *   隐私模式 / 禁用本地存储时也是这条降级路径，不会抛异常。
 *
 * 【命名避坑】模块叫 ItemStore，不叫 Storage
 *   —— window.Storage 是浏览器内置构造函数，重名会让「模块是否就绪」的判断永远为真。
 *
 * 【导出】ItemStore.getOwnerId / getAll / save / getById / update / addTip / remove / isOwner / reset
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

  /* ==================== 一、存储介质 ==================== */

  // Node 单测 / 隐私模式下的替身：接口与 localStorage 一致，只是活在内存里
  function createMemoryStorage() {
    const map = Object.create(null);
    return {
      getItem: function (k) {
        return Object.prototype.hasOwnProperty.call(map, k) ? map[k] : null;
      },
      setItem: function (k, v) { map[k] = String(v); },
      removeItem: function (k) { delete map[k]; }
    };
  }

  // 真正可用的 localStorage 才用它：隐私模式、file:// 被禁用等情况会抛异常，一律降级
  function pickStorage() {
    try {
      const ls = root.localStorage;
      if (!ls) return createMemoryStorage();
      const probe = '__campus_lf_probe__';
      ls.setItem(probe, '1');
      if (ls.getItem(probe) !== '1') return createMemoryStorage();
      ls.removeItem(probe);
      return ls;
    } catch (e) {
      return createMemoryStorage();
    }
  }

  const storage = pickStorage();

  // 存储坏了也不该让整个页面白屏：读失败当成读不到，写失败只影响持久化
  function readKey(key) {
    try { return storage.getItem(key); } catch (e) { return null; }
  }
  function writeKey(key, value) {
    try { storage.setItem(key, String(value)); } catch (e) { /* 降级：本次会话内存里仍然正确 */ }
  }

  /* ==================== 二、发布者标识 ==================== */

  function genOwnerId() {
    const c = root.crypto;
    try {
      if (c && typeof c.randomUUID === 'function') return c.randomUUID();
      if (c && typeof c.getRandomValues === 'function') {
        const bytes = new Uint8Array(16);
        c.getRandomValues(bytes);
        return Array.prototype.map.call(bytes, function (b) {
          return ('0' + b.toString(16)).slice(-2);
        }).join('');
      }
    } catch (e) { /* 下面兜底 */ }
    return 'owner-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 11);
  }

  let _ownerId = null;

  function getOwnerId() {
    if (_ownerId) return _ownerId;
    const saved = readKey(C.OWNER_KEY);
    if (typeof saved === 'string' && saved) {
      _ownerId = saved;
    } else {
      _ownerId = genOwnerId();
      writeKey(C.OWNER_KEY, _ownerId);
    }
    return _ownerId;
  }

  /* ==================== 三、读写列表 ==================== */

  // 返回内部数组（已落盘的那份），调用方拿到后不要直接外传
  function ensure() {
    const raw = readKey(C.STORAGE_KEY);
    if (raw !== null && raw !== undefined && raw !== '') {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) { /* JSON 损坏 → 落到下面重新灌示例数据，自愈 */ }
    }
    // 首次访问，或者数据已经损坏：灌入示例数据并落盘
    return writeSeed();
  }

  function writeSeed() {
    const list = Seed.samples(getOwnerId());
    persist(list);
    return list;
  }

  // 写回 localStorage，并打上「已灌过示例数据」的标记
  function persist(list) {
    writeKey(C.STORAGE_KEY, JSON.stringify(list));
    writeKey(C.SEED_FLAG_KEY, String(C.SCHEMA_VERSION));
  }

  function clone(x) {
    return x === null || x === undefined ? x : JSON.parse(JSON.stringify(x));
  }

  function indexOfId(list, id) {
    for (let i = 0; i < list.length; i++) {
      if (list[i] && list[i].id === id) return i;
    }
    return -1;
  }

  // 同一毫秒内连续保存时保证 id 不重复
  let _seq = 0;
  function makeId(now) {
    _seq += 1;
    return String(now) + '-' + _seq + '-' + Math.random().toString(36).slice(2, 7);
  }

  /* ==================== 四、对外 8 个方法 ==================== */

  // 返回深拷贝：页面层拿到的对象改不动已落盘的数据
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

    const list = ensure();
    const now = Date.now();

    const rec = Object.assign({}, item);
    if (!rec.id) rec.id = makeId(now);
    if (!rec.ownerId) rec.ownerId = getOwnerId();
    if (!rec.status) rec.status = C.STATUS.OPEN;
    if (typeof rec.views !== 'number') rec.views = 0;
    if (!Array.isArray(rec.tips)) rec.tips = [];                                   // 打赏记录，默认空
    rec.rewardAmount = C.isValidAmount(rec.rewardAmount) ? rec.rewardAmount : 0;   // 悬赏金额，非法一律归 0
    rec.createdAt = rec.createdAt || now;
    rec.updatedAt = now;
    if (rec.status === C.STATUS.DONE) {
      rec.closedAt = rec.closedAt || now;
    } else {
      rec.closedAt = null;
    }

    list.unshift(rec);   // 新发布的排最前，首页立刻能看到
    persist(list);
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

    persist(list);
    return clone(rec);
  }

  // 追加一条打赏记录。tip 由调用方（页面层经 reward.js）构造好，本方法只管
  // 「读 → 追加 → 落盘」。独立成方法是为了避免页面层用 update() 覆盖整个 tips 数组时，
  // 因为手里拿的是旧副本而把中间发生的记录冲掉。
  function addTip(id, tip) {
    if (!tip || typeof tip !== 'object') return null;

    const list = ensure();
    const idx = indexOfId(list, id);
    if (idx === -1) return null;

    const rec = list[idx];
    if (!Array.isArray(rec.tips)) rec.tips = [];
    rec.tips.push(tip);
    rec.updatedAt = Date.now();

    persist(list);
    return clone(rec);
  }

  function remove(id) {
    const list = ensure();
    const idx = indexOfId(list, id);
    if (idx === -1) return false;
    list.splice(idx, 1);
    persist(list);
    return true;
  }

  function isOwner(item) {
    return !!item && item.ownerId === getOwnerId();
  }

  // 「一键重置」：清空后重新灌入示例数据（附加特点 E7，答辩可反复演示）
  function reset() {
    return writeSeed().map(clone);
  }

  const ItemStore = Object.freeze({
    getOwnerId: getOwnerId,
    getAll: getAll,
    save: save,
    getById: getById,
    update: update,
    addTip: addTip,
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
