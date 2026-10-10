/**
 * test/search.test.js —— search.js（搜索 / 筛选 / 排序）测试
 *
 * 分两层：
 *   1. 用一小段**自造夹具**做精确白盒测试 —— 每个字段单独命中一次、
 *      「不搜哪些字段」也各测一条，避免依赖示例数据的内容而「碰巧通过」；
 *   2. 再拿真实 24 条示例数据做集成验证，确认筛选/排序组合起来的结果条数符合预期。
 *
 * 维护人：颜俊宇（102401114）
 */
'use strict';

const { expect } = require('chai');
const { Constant: C, ItemStore, Search, SEED } = require('./helpers/fixtures');

// 夹具：每条只让它「在某一个字段上」有独特的关键词，便于定位命中来源
const ITEMS = [
  {
    id: 'a', type: C.TYPE.LOST, name: '校园卡', category: '证件卡类', place: '图书馆',
    description: '白色卡套', contact: 'wx-secret-a', status: C.STATUS.OPEN,
    ownerId: 'me', views: 5, createdAt: 1000, lostAt: 900
  },
  {
    id: 'b', type: C.TYPE.FOUND, name: 'AirPods Pro', category: '电子产品', place: '食堂',
    description: '白色充电盒', contact: 'wx-secret-b', status: C.STATUS.OPEN,
    ownerId: 'other', views: 50, createdAt: 3000, lostAt: 2900
  },
  {
    id: 'c', type: C.TYPE.FOUND, name: '黑色雨伞', category: '日用品', place: '图书馆',
    description: '伞柄挂着小黄鸭', contact: 'wx-secret-c', status: C.STATUS.DONE,
    ownerId: 'me', views: 9, createdAt: 2000, lostAt: null // 故意缺 lostAt，验回落 createdAt
  }
];

const ids = function (list) {
  return list.map(function (it) { return it.id; });
};

describe('Search.filterItems() 兜底', function () {

  it('items 不是数组（undefined / null / 字符串 / 对象）一律返回空数组', function () {
    expect(Search.filterItems(undefined, {})).to.deep.equal([]);
    expect(Search.filterItems(null, {})).to.deep.equal([]);
    expect(Search.filterItems('x', {})).to.deep.equal([]);
    expect(Search.filterItems({}, {})).to.deep.equal([]);
    expect(Search.filterItems(ITEMS).length).to.equal(3); // 不传 filters 也能用
  });

  it('filters 为 null / undefined / 非对象时当成「不筛选」', function () {
    expect(Search.filterItems(ITEMS, null)).to.have.lengthOf(3);
    expect(Search.filterItems(ITEMS, undefined)).to.have.lengthOf(3);
    expect(Search.filterItems(ITEMS, 'x')).to.have.lengthOf(3);
    expect(Search.filterItems(ITEMS, {})).to.have.lengthOf(3);
  });

  it('筛选值等于 all / 空串 / null 都表示这一项不筛', function () {
    [C.FILTER_ALL, '', null, undefined].forEach(function (v) {
      expect(Search.filterItems(ITEMS, { type: v })).to.have.lengthOf(3);
    });
  });

  it('列表里的脏数据（null / 数字 / 字符串）被跳过，不抛异常', function () {
    expect(Search.filterItems([null, 1, 'x', undefined, ITEMS[0]], {})).to.have.lengthOf(1);
  });

  it('不改动传入的数组（冻结数组也不炸），返回的是新数组', function () {
    const frozen = Object.freeze(ITEMS.slice());
    const out = Search.filterItems(frozen, { sort: C.SORT.HOT });
    expect(frozen).to.have.lengthOf(3);
    expect(out).to.have.lengthOf(3);
    expect(out).to.not.equal(frozen);
  });

});

describe('Search 关键词：只搜名称 / 分类 / 地点 / 描述四个字段', function () {

  it('命中物品名称', function () {
    expect(ids(Search.filterItems(ITEMS, { keyword: '校园卡' }))).to.deep.equal(['a']);
  });

  it('命中分类', function () {
    expect(ids(Search.filterItems(ITEMS, { keyword: '电子产品' }))).to.deep.equal(['b']);
  });

  it('命中地点', function () {
    // 两条都命中，顺序由默认排序（最新发布）决定，这里只关心命中集合
    expect(ids(Search.filterItems(ITEMS, { keyword: '图书馆' }))).to.have.members(['a', 'c']);
  });

  it('命中描述（说明不只搜名称）', function () {
    const hit = Search.filterItems(ITEMS, { keyword: '小黄鸭' });
    expect(ids(hit)).to.deep.equal(['c']);
    expect(hit[0].name).to.not.contain('小黄鸭');
  });

  it('忽略大小写', function () {
    expect(ids(Search.filterItems(ITEMS, { keyword: 'airpods' }))).to.deep.equal(['b']);
    expect(ids(Search.filterItems(ITEMS, { keyword: 'AIRPODS PRO' }))).to.deep.equal(['b']);
  });

  it('关键词首尾空格自动去掉', function () {
    expect(ids(Search.filterItems(ITEMS, { keyword: '  雨伞  ' }))).to.deep.equal(['c']);
  });

  it('关键词是空白串等于不筛（不是「搜不到」）', function () {
    expect(Search.filterItems(ITEMS, { keyword: '   ' })).to.have.lengthOf(3);
  });

  it('搜不到时返回空数组（页面层用它显示空态）', function () {
    expect(Search.filterItems(ITEMS, { keyword: '爱马仕铂金包' })).to.deep.equal([]);
  });

  it('不搜联系方式（隐私字段不参与匹配）', function () {
    expect(Search.filterItems(ITEMS, { keyword: 'wx-secret' })).to.deep.equal([]);
  });

  it('不搜 type / status 这类内部枚举值', function () {
    expect(Search.filterItems(ITEMS, { keyword: 'lost' })).to.deep.equal([]);
  });

});

describe('Search 组合筛选', function () {

  it('单条件：type / category / place / status / ownerId', function () {
    expect(Search.filterItems(ITEMS, { type: C.TYPE.FOUND })).to.have.lengthOf(2);
    expect(Search.filterItems(ITEMS, { category: '日用品' })).to.have.lengthOf(1);
    expect(Search.filterItems(ITEMS, { place: '图书馆' })).to.have.lengthOf(2);
    expect(Search.filterItems(ITEMS, { status: C.STATUS.DONE })).to.have.lengthOf(1);
    expect(Search.filterItems(ITEMS, { ownerId: 'me' })).to.have.lengthOf(2);
  });

  it('多条件是「交集」：招领 + 已完结', function () {
    expect(ids(Search.filterItems(ITEMS, { type: C.TYPE.FOUND, status: C.STATUS.DONE }))).to.deep.equal(['c']);
  });

  it('多条件是「交集」：证件卡类 + 图书馆', function () {
    expect(ids(Search.filterItems(ITEMS, { category: '证件卡类', place: '图书馆' }))).to.deep.equal(['a']);
  });

  it('交集为空时返回空数组', function () {
    expect(Search.filterItems(ITEMS, { type: C.TYPE.FOUND, category: '证件卡类' })).to.deep.equal([]);
  });

  it('筛选结果一定落在「全部」之内', function () {
    const out = Search.filterItems(ITEMS, { type: C.TYPE.LOST, place: '图书馆' });
    expect(out).to.have.lengthOf(1);
    out.forEach(function (it) {
      expect(it.type).to.equal(C.TYPE.LOST);
      expect(it.place).to.equal('图书馆');
    });
  });

  it('关键词 + 筛选值可以叠加', function () {
    expect(ids(Search.filterItems(ITEMS, { keyword: '图书馆', type: C.TYPE.FOUND }))).to.deep.equal(['c']);
  });

});

describe('Search 相似物品：发布寻物时提示「同类的招领」', function () {
  /*
   * 这条路径是「发布寻物 → 顺带提示库里可能已被捡到的招领」用的，
   * app.js 里的调用是 filterItems(all, { type: FOUND, category: data.category })。
   * 两个条件缺一不可：只按分类会混进寻物帖（那是「别人也在找」，不是「已被捡到」），
   * 只按类型会把所有招领都算成相似（噪音太大）。这里把这两条语义锁住。
   */

  it('夹具：只返回「招领 + 同分类」，两条都命中才留下', function () {
    expect(ids(Search.filterItems(ITEMS, { type: C.TYPE.FOUND, category: '日用品' })))
      .to.deep.equal(['c']);
  });

  it('夹具：分类相同但不是招领 → 不返回（证件卡类只有一条寻物帖）', function () {
    expect(Search.filterItems(ITEMS, { category: '证件卡类' })).to.have.lengthOf(1);
    expect(Search.filterItems(ITEMS, { type: C.TYPE.FOUND, category: '证件卡类' }))
      .to.deep.equal([]);
  });

  it('夹具：是招领但分类不同 → 不返回', function () {
    expect(Search.filterItems(ITEMS, { type: C.TYPE.FOUND, category: '运动器材' }))
      .to.deep.equal([]);
  });

  it('缺少 category 时不能当成「全部相似」（页面层漏传就会退化成噪音）', function () {
    // 只给 type 会返回全部招领（夹具里 2 条），这是调用方必须自己保证的
    expect(Search.filterItems(ITEMS, { type: C.TYPE.FOUND })).to.have.lengthOf(2);
    // 而缺 category 时用 FILTER_ALL / 空串，结果同样是「全部招领」而不是「相似」
    expect(Search.filterItems(ITEMS, { type: C.TYPE.FOUND, category: C.FILTER_ALL }))
      .to.have.lengthOf(2);
  });

  describe('真实示例数据', function () {

    let all;
    beforeEach(function () { all = ItemStore.reset(); });

    /** 页面层用的那条查询，原样复刻，避免测试与实现各写一遍导致口径漂移 */
    function similarTo(category) {
      return Search.filterItems(all, { type: C.TYPE.FOUND, category: category });
    }

    it('每一类都只返回该类的招领帖（不变量：类型 + 分类同时成立）', function () {
      C.CATEGORY.forEach(function (cat) {
        similarTo(cat).forEach(function (it) {
          expect(it.type).to.equal(C.TYPE.FOUND);
          expect(it.category).to.equal(cat);
        });
      });
    });

    it('各类相似条数之和 = 库里的招领总数（不重不漏）', function () {
      const sum = C.CATEGORY.reduce(function (n, cat) { return n + similarTo(cat).length; }, 0);
      expect(sum).to.equal(SEED.FOUND);
    });

    it('具体条数：日用品 2 / 运动器材 2 / 服饰饰品 2 / 钥匙门禁 2 / 书籍资料 1 / 证件卡类 1', function () {
      expect(similarTo('日用品')).to.have.lengthOf(2);
      expect(similarTo('运动器材')).to.have.lengthOf(2);
      expect(similarTo('服饰饰品')).to.have.lengthOf(2);
      expect(similarTo('钥匙门禁')).to.have.lengthOf(2);
      expect(similarTo('书籍资料')).to.have.lengthOf(1);
      expect(similarTo('证件卡类')).to.have.lengthOf(1);
    });

    it('电子产品一条招领都没有 → 返回空数组，页面层据此不弹提示', function () {
      expect(similarTo('电子产品')).to.have.lengthOf(0);
      // 但「电子产品」本身是有数据的（4 条寻物帖），说明空结果不是因为库里没这个分类
      expect(Search.filterItems(all, { category: '电子产品' })).to.have.lengthOf(4);
    });

    it('提示文案里的 {n} 就是这条查询的条数（两者口径必须一致）', function () {
      const n = similarTo('日用品').length;
      expect(C.TEXT.similarTip.replace('{n}', n)).to.contain(String(n));
      expect(C.TEXT.similarTip.replace('{n}', n)).to.contain('招领');
    });

    it('刚发布的寻物帖不会把自己算进相似列表', function () {
      const before = similarTo('日用品').length;
      ItemStore.save({
        type: C.TYPE.LOST, name: '相似度自测水杯', category: '日用品', place: '校道',
        lostTime: '刚刚', description: '', contact: '微信 sim'
      });
      all = ItemStore.getAll();
      const after = similarTo('日用品');
      expect(after).to.have.lengthOf(before);          // 新发的是寻物帖，不该混进来
      expect(after.some(function (it) { return it.name === '相似度自测水杯'; })).to.equal(false);
    });

    it('发布招领后再查同类，能被自己新发的那条命中（同一分类下确实会互相「相似」）', function () {
      const before = similarTo('其他').length;
      ItemStore.save({
        type: C.TYPE.FOUND, name: '相似度自测耳机盒', category: '其他', place: '校道',
        lostTime: '刚刚', description: '', contact: '微信 sim2'
      });
      all = ItemStore.getAll();
      const after = similarTo('其他');
      expect(after).to.have.lengthOf(before + 1);
      expect(after.some(function (it) { return it.name === '相似度自测耳机盒'; })).to.equal(true);
    });

  });

});

describe('Search 排序', function () {

  it('latest：按 createdAt 倒序', function () {
    const out = Search.filterItems(ITEMS, { sort: C.SORT.LATEST });
    expect(ids(out)).to.deep.equal(['b', 'c', 'a']);
    out.forEach(function (it, i) {
      if (i > 0) expect(out[i - 1].createdAt).to.be.at.least(it.createdAt);
    });
  });

  it('hot：按 views 倒序', function () {
    const out = Search.filterItems(ITEMS, { sort: C.SORT.HOT });
    expect(ids(out)).to.deep.equal(['b', 'c', 'a']);
  });

  it('lostTime：按 lostAt 倒序，缺 lostAt 时回落到 createdAt', function () {
    const out = Search.filterItems(ITEMS, { sort: C.SORT.LOST_TIME });
    expect(ids(out)).to.deep.equal(['b', 'c', 'a']); // c 用 createdAt=2000 参与比较
    expect(out[0].id).to.equal('b');
  });

  it('非法 / 缺省 sort 回落到默认「最新发布」', function () {
    const fallback = ids(Search.filterItems(ITEMS, { sort: '不存在的排序' }));
    expect(fallback).to.deep.equal(ids(Search.filterItems(ITEMS, { sort: C.DEFAULT_SORT })));
    expect(ids(Search.filterItems(ITEMS, {}))).to.deep.equal(fallback);
  });

  it('排序只换顺序、不改变条数', function () {
    [C.SORT.LATEST, C.SORT.LOST_TIME, C.SORT.HOT, '非法'].forEach(function (s) {
      expect(Search.filterItems(ITEMS, { sort: s })).to.have.lengthOf(3);
    });
  });

});

describe('Search 与真实示例数据（集成）', function () {

  let all;
  beforeEach(function () {
    all = ItemStore.reset();  // 每个用例都从干净 24 条开始
  });

  it('示例数据 ' + SEED.TOTAL + ' 条，全量筛选不丢条', function () {
    expect(all).to.have.lengthOf(SEED.TOTAL);
    expect(Search.filterItems(all, {})).to.have.lengthOf(SEED.TOTAL);
    expect(Search.filterItems(all, { type: C.FILTER_ALL })).to.have.lengthOf(SEED.TOTAL);
  });

  it('按类型筛：寻物 ' + SEED.LOST + ' / 招领 ' + SEED.FOUND, function () {
    expect(Search.filterItems(all, { type: C.TYPE.LOST })).to.have.lengthOf(SEED.LOST);
    expect(Search.filterItems(all, { type: C.TYPE.FOUND })).to.have.lengthOf(SEED.FOUND);
  });

  it('关键词「校园卡」命中 2 条（都在名称里）', function () {
    expect(Search.filterItems(all, { keyword: '校园卡' })).to.have.lengthOf(2);
  });

  it('关键词「图书馆」命中 4 条（多于地点筛选的 3 条，证明描述也参与匹配）', function () {
    expect(Search.filterItems(all, { keyword: '图书馆' })).to.have.lengthOf(4);
    expect(Search.filterItems(all, { place: '图书馆' })).to.have.lengthOf(3);
  });

  it('关键词「日用品」命中 3 条（命中分类）', function () {
    expect(Search.filterItems(all, { keyword: '日用品' })).to.have.lengthOf(3);
  });

  it('关键词「小黄鸭」命中 1 条（只出现在描述里）', function () {
    expect(Search.filterItems(all, { keyword: '小黄鸭' })).to.have.lengthOf(1);
  });

  it('组合筛选：招领 + 已完结 = 6 条；日用品 + 进行中 = 1 条；寻物 + 图书馆 = 3 条', function () {
    expect(Search.filterItems(all, { type: C.TYPE.FOUND, status: C.STATUS.DONE })).to.have.lengthOf(6);
    expect(Search.filterItems(all, { category: '日用品', status: C.STATUS.OPEN })).to.have.lengthOf(1);
    expect(Search.filterItems(all, { type: C.TYPE.LOST, place: '图书馆' })).to.have.lengthOf(3);
  });

  it('「我的发布」筛出 ' + SEED.MINE + ' 条', function () {
    expect(Search.filterItems(all, { ownerId: ItemStore.getOwnerId() })).to.have.lengthOf(SEED.MINE);
  });

  it('最新发布第一条是 30 分钟前那条「保温水杯」；最多浏览第一条是 views=88 的「蓝牙耳机」', function () {
    expect(Search.filterItems(all, { sort: C.SORT.LATEST })[0].name).to.equal('保温水杯');
    expect(Search.filterItems(all, { sort: C.SORT.HOT })[0].name).to.equal('蓝牙耳机');
  });

  it('新发布一条后立刻能在搜索结果里搜到', function () {
    ItemStore.save({
      type: C.TYPE.LOST, name: '独一无二的水杯', category: '日用品', place: '校道',
      lostTime: '刚刚', description: '', contact: '微信 uniq'
    });
    expect(Search.filterItems(ItemStore.getAll(), { keyword: '独一无二' })).to.have.lengthOf(1);
  });

});
