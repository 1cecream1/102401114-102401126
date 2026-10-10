/**
 * js/search.js —— 关键词搜索 + 组合筛选 + 排序
 *
 * 【关键词范围】子串匹配以下四个字段：物品名称 / 分类 / 地点 / 描述（F5 要求）。
 *   忽略大小写，前后空格自动去掉；不匹配 type / status / contact
 *   —— 联系方式属于隐私，不该被搜出来。
 *
 * 【导出】Search.filterItems(items, filters) → 新数组（不改动传入的 items）
 *   filters 支持任意组合：
 *     keyword   关键词（子串、忽略大小写、前后空格自动去掉）
 *     type      'lost' / 'found'，或 Constant.FILTER_ALL / 空值 = 不筛
 *     category  / place / status / ownerId  同上，等于该值才留下
 *     sort      'latest' / 'lostTime' / 'hot'，非法值回落到 Constant.DEFAULT_SORT
 *   兜底：items 不是数组 → []；filters 不是对象 → 当成「不筛选」；
 *        列表里不是对象的脏数据直接跳过（不抛异常）。
 *
 * 【依赖】constant.js（必须先加载）
 */
(function (root) {
  'use strict';

  const isNode = (typeof module !== 'undefined' && module.exports);
  const C = isNode ? require('./constant.js') : root.Constant;
  if (!C) throw new Error('[search.js] constant.js 未加载：请把 constant.js 放在本文件之前引入');

  // 关键词参与匹配的字段（顺序无关，只影响可读性）
  const KEYWORD_FIELDS = ['name', 'category', 'place', 'description'];

  // 'all' / '' / null / undefined 都表示「这一项不筛」
  function isAll(v) {
    return v === undefined || v === null || v === '' || v === C.FILTER_ALL;
  }

  function lower(v) {
    return typeof v === 'string' ? v.toLowerCase() : '';
  }

  // 关键词是否命中该条：名称 / 分类 / 地点 / 描述 任一字段包含即算命中
  function matchKeyword(item, keyword) {
    for (let i = 0; i < KEYWORD_FIELDS.length; i++) {
      if (lower(item[KEYWORD_FIELDS[i]]).indexOf(keyword) !== -1) return true;
    }
    return false;
  }

  // 按 SORT_OPTIONS 里声明的 field 取值，缺失时用 fallbackField
  function sortValue(item, field, fallbackField) {
    const v = item[field];
    if (v === undefined || v === null || v === '') return item[fallbackField];
    return v;
  }

  // 一律倒序：时间戳越大越新、views 越多越热
  function sortItems(list, sort) {
    const opt = C.findByValue(C.SORT_OPTIONS, sort) || C.findByValue(C.SORT_OPTIONS, C.DEFAULT_SORT);
    return list.sort(function (a, b) {
      const x = sortValue(a, opt.field, opt.fallbackField);
      const y = sortValue(b, opt.field, opt.fallbackField);
      if (x === y) return 0;
      return x > y ? -1 : 1;
    });
  }

  function filterItems(items, filters) {
    const list = Array.isArray(items) ? items.slice() : [];
    const f = (filters && typeof filters === 'object') ? filters : {};
    const keyword = lower(f.keyword).trim();

    const hit = list.filter(function (item) {
      if (!item || typeof item !== 'object') return false;

      if (!isAll(f.type) && item.type !== f.type) return false;
      if (!isAll(f.category) && item.category !== f.category) return false;
      if (!isAll(f.place) && item.place !== f.place) return false;
      if (!isAll(f.status) && item.status !== f.status) return false;
      if (!isAll(f.ownerId) && item.ownerId !== f.ownerId) return false;

      if (keyword && !matchKeyword(item, keyword)) return false;
      return true;
    });

    return sortItems(hit, f.sort);
  }

  const Search = Object.freeze({
    filterItems: filterItems
  });

  if (isNode) {
    module.exports = Search;        // Node / Mocha
  } else {
    root.Search = Search;           // 浏览器 window.Search
  }
})(typeof window !== 'undefined' ? window : globalThis);
