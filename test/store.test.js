/**
 * test/store.test.js —— store.js（ItemStore）测试
 *
 * 覆盖两类东西：
 *   1. 对外 8 个方法的行为与兜底 —— 空数据返回 []、查不到返回 null、
 *      非法输入不抛异常、返回的是深拷贝（页面层改不动已落盘的数据）；
 *   2. 持久化介质 —— 有 localStorage 时真的落三个键、内容损坏时自愈、
 *      localStorage 不可用/写失败时降级到内存 shim 而不白屏。
 *
 * 第 2 类需要「全新实例 + 可控的 localStorage」，所以自己删 require 缓存重装模块，
 * 而不是复用 fixtures 里那份共享实例。
 *
 * 维护人：颜俊宇（102401114）
 */
'use strict';

const { expect } = require('chai');
const { Constant: C, Seed, ItemStore, SEED, validForm, countBy } = require('./helpers/fixtures');

// store.js 直接依赖的两个模块，删缓存时要一起删
const MODULE_FILES = ['constant.js', 'seed.js', 'store.js'];

/** 删掉缓存后重新 require，拿到一份「全新进程状态」的 ItemStore（存储介质也是新的） */
function freshStore() {
  MODULE_FILES.forEach(function (f) {
    delete require.cache[require.resolve('../js/' + f)];
  });
  return require('../js/store.js');
}

/**
 * 往 globalThis 上挂一个可控的假 localStorage，在它生效期间跑 fn。
 * 跑完无论成败都要摘掉，并清掉期间产生的模块缓存。
 */
function withFakeStorage(fakeStorage, fn) {
  globalThis.localStorage = fakeStorage;
  try {
    return fn(freshStore());
  } finally {
    delete globalThis.localStorage;
    MODULE_FILES.forEach(function (f) {
      delete require.cache[require.resolve('../js/' + f)];
    });
  }
}

/** 一个功能正常的假 localStorage，内部就是一个 Map */
function makeFakeStorage(initial) {
  const map = Object.assign(Object.create(null), initial || {});
  return {
    map: map,
    getItem: function (k) {
      return Object.prototype.hasOwnProperty.call(map, k) ? map[k] : null;
    },
    setItem: function (k, v) { map[k] = String(v); },
    removeItem: function (k) { delete map[k]; }
  };
}

describe('ItemStore 发布者标识', function () {

  it('getOwnerId() 返回非空字符串，多次调用稳定不变', function () {
    const id = ItemStore.getOwnerId();
    expect(id).to.be.a('string').and.not.to.equal('');
    expect(ItemStore.getOwnerId()).to.equal(id);
  });

  it('本机标识不会等于示例数据里「他人」的固定标识', function () {
    expect(ItemStore.getOwnerId()).to.not.equal(Seed.OTHER_OWNER_ID);
  });

});

describe('ItemStore 读取', function () {

  beforeEach(function () { ItemStore.reset(); });

  it('首次访问自动灌入 ' + SEED.TOTAL + ' 条示例数据', function () {
    expect(ItemStore.getAll()).to.have.lengthOf(SEED.TOTAL);
  });

  it('getAll() 返回深拷贝：改返回值不会污染已落盘的数据', function () {
    const snapshot = ItemStore.getAll();
    const targetId = snapshot[0].id;
    snapshot[0].name = '被改坏了';
    snapshot[0].views = 99999;
    expect(ItemStore.getById(targetId).name).to.not.equal('被改坏了');
    expect(ItemStore.getById(targetId).views).to.not.equal(99999);
  });

  it('getById() 命中返回记录、未命中返回 null', function () {
    const first = ItemStore.getAll()[0];
    expect(ItemStore.getById(first.id).id).to.equal(first.id);
    expect(ItemStore.getById('根本不存在的 id')).to.equal(null);
  });

  it('getById(undefined / null) 不抛异常，按查不到处理', function () {
    expect(ItemStore.getById(undefined)).to.equal(null);
    expect(ItemStore.getById(null)).to.equal(null);
  });

  it('读写往返无损：save → getAll → getById 三处一致', function () {
    const saved = ItemStore.save(validForm({ name: '往返测试' }));
    const inList = ItemStore.getAll().filter(function (it) { return it.id === saved.id; });
    expect(inList).to.have.lengthOf(1);
    expect(inList[0].name).to.equal('往返测试');
    expect(ItemStore.getById(saved.id).name).to.equal('往返测试');
  });

});

describe('ItemStore.save()', function () {

  beforeEach(function () { ItemStore.reset(); });

  it('自动补全 id / ownerId / status / views / createdAt / closedAt', function () {
    const saved = ItemStore.save(validForm());
    expect(saved.id).to.be.a('string').and.not.to.equal('');
    expect(saved.ownerId).to.equal(ItemStore.getOwnerId());
    expect(saved.status).to.equal(C.STATUS.OPEN);
    expect(saved.views).to.equal(0);
    expect(saved.createdAt).to.be.a('number');
    expect(saved.updatedAt).to.be.a('number');
    expect(saved.closedAt).to.equal(null);
  });

  it('传入 status=done 时自动补 closedAt', function () {
    const saved = ItemStore.save(validForm({ status: C.STATUS.DONE }));
    expect(saved.status).to.equal(C.STATUS.DONE);
    expect(saved.closedAt).to.be.a('number');
  });

  it('新发布的排在最前（首页刷新立刻能看到）', function () {
    const saved = ItemStore.save(validForm({ name: '排在最前测试' }));
    expect(ItemStore.getAll()[0].id).to.equal(saved.id);
  });

  it('保存后总数 +1、「我的发布」也 +1', function () {
    ItemStore.save(validForm());
    expect(ItemStore.getAll()).to.have.lengthOf(SEED.TOTAL + 1);
    const mine = countBy(ItemStore.getAll(), function (it) {
      return it.ownerId === ItemStore.getOwnerId();
    });
    expect(mine).to.equal(SEED.MINE + 1);
  });

  it('返回的是拷贝：改它不影响已落盘的数据', function () {
    const saved = ItemStore.save(validForm());
    saved.name = '被改坏了';
    expect(ItemStore.getById(saved.id).name).to.not.equal('被改坏了');
  });

  it('不覆盖传入对象上已有的 id / createdAt（续写场景）', function () {
    const saved = ItemStore.save(validForm({ id: 'my-fixed-id', createdAt: 1700000000000 }));
    expect(saved.id).to.equal('my-fixed-id');
    expect(saved.createdAt).to.equal(1700000000000);
  });

  it('同一毫秒内连续保存，id 不重复', function () {
    const ids = [];
    for (let i = 0; i < 5; i++) {
      ids.push(ItemStore.save(validForm({ name: '连存' + i })).id);
    }
    expect(new Set(ids).size).to.equal(5);
  });

  it('非法入参（null / 字符串 / 数字 / undefined）兜底返回 null，不抛异常', function () {
    expect(ItemStore.save(null)).to.equal(null);
    expect(ItemStore.save(undefined)).to.equal(null);
    expect(ItemStore.save('x')).to.equal(null);
    expect(ItemStore.save(123)).to.equal(null);
  });

});

describe('ItemStore.update() / remove()', function () {

  let target;
  beforeEach(function () {
    ItemStore.reset();
    target = ItemStore.save(validForm({ name: '待操作用例' }));
  });

  it('update() 部分更新：只改传入的字段，其余不动', function () {
    const updated = ItemStore.update(target.id, { views: 7 });
    expect(updated.views).to.equal(7);
    expect(updated.name).to.equal('待操作用例');
  });

  it('update() 会刷新 updatedAt', function () {
    const before = ItemStore.getById(target.id).updatedAt;
    const updated = ItemStore.update(target.id, { views: 1 });
    expect(updated.updatedAt).to.be.at.least(before);
  });

  it('标记完结自动补 closedAt；撤销完结把 closedAt 清回 null', function () {
    const done = ItemStore.update(target.id, { status: C.STATUS.DONE });
    expect(done.status).to.equal(C.STATUS.DONE);
    expect(done.closedAt).to.be.a('number');

    const reopened = ItemStore.update(target.id, { status: C.STATUS.OPEN });
    expect(reopened.status).to.equal(C.STATUS.OPEN);
    expect(reopened.closedAt).to.equal(null);
  });

  it('update() 的改动会落盘（重新读取也是新值）', function () {
    ItemStore.update(target.id, { views: 42 });
    expect(ItemStore.getById(target.id).views).to.equal(42);
  });

  it('update() 不存在的 id 返回 null；非法 id 不抛异常', function () {
    expect(ItemStore.update('根本不存在的 id', { views: 1 })).to.equal(null);
    expect(ItemStore.update(null, { views: 1 })).to.equal(null);
    expect(ItemStore.update(undefined, { views: 1 })).to.equal(null);
  });

  it('update() 传入非法 changes 时不炸（当成空改动）', function () {
    expect(ItemStore.update(target.id, null).id).to.equal(target.id);
    expect(ItemStore.update(target.id, 'x').id).to.equal(target.id);
  });

  it('remove() 删成功返回 true，重复删 / 删不存在的返回 false', function () {
    expect(ItemStore.remove(target.id)).to.equal(true);
    expect(ItemStore.remove(target.id)).to.equal(false);
    expect(ItemStore.remove('根本不存在的 id')).to.equal(false);
  });

  it('remove() 后总数回落', function () {
    ItemStore.remove(target.id);
    expect(ItemStore.getAll()).to.have.lengthOf(SEED.TOTAL);
  });

});

describe('ItemStore.isOwner() 与 reset()', function () {

  beforeEach(function () { ItemStore.reset(); });

  it('isOwner：自己发的 true / 别人发的 false / 空值 false', function () {
    const mine = ItemStore.getAll().filter(function (it) {
      return it.ownerId === ItemStore.getOwnerId();
    })[0];
    const others = ItemStore.getAll().filter(function (it) {
      return it.ownerId === Seed.OTHER_OWNER_ID;
    })[0];

    expect(ItemStore.isOwner(mine)).to.equal(true);
    expect(ItemStore.isOwner(others)).to.equal(false);
    expect(ItemStore.isOwner(null)).to.equal(false);
    expect(ItemStore.isOwner(undefined)).to.equal(false);
    expect(ItemStore.isOwner({})).to.equal(false);
  });

  it('reset() 恢复到 ' + SEED.TOTAL + ' 条示例数据，且本人标识不变', function () {
    ItemStore.save(validForm());
    ItemStore.save(validForm());
    expect(ItemStore.getAll()).to.have.lengthOf(SEED.TOTAL + 2);

    const ownerBefore = ItemStore.getOwnerId();
    const restored = ItemStore.reset();

    expect(restored).to.have.lengthOf(SEED.TOTAL);
    expect(ItemStore.getAll()).to.have.lengthOf(SEED.TOTAL);
    expect(ItemStore.getOwnerId()).to.equal(ownerBefore);
    expect(countBy(ItemStore.getAll(), function (it) {
      return it.ownerId === ownerBefore;
    })).to.equal(SEED.MINE);
  });

  it('reset() 返回的也是拷贝', function () {
    const restored = ItemStore.reset();
    restored[0].name = '被改坏了';
    expect(ItemStore.getAll()[0].name).to.not.equal('被改坏了');
  });

});

describe('ItemStore 持久化介质', function () {

  it('Node 环境（没有 localStorage）自动降级为内存 shim，读写照常', function () {
    expect(typeof localStorage).to.equal('undefined');
    const store = freshStore();
    expect(store.getAll()).to.have.lengthOf(SEED.TOTAL);
    const saved = store.save(validForm({ name: '内存 shim 测试' }));
    expect(store.getById(saved.id).name).to.equal('内存 shim 测试');
  });

  it('有可用的 localStorage 时，三个键都真的落盘，内容是合法 JSON', function () {
    withFakeStorage(makeFakeStorage(), function (store) {
      store.getAll();                       // 触发首次灌入
      const raw = store.save(validForm({ name: '落盘测试' }));

      const keys = Object.keys(globalThis.localStorage.map);
      expect(keys).to.include(C.STORAGE_KEY);
      expect(keys).to.include(C.OWNER_KEY);
      expect(keys).to.include(C.SEED_FLAG_KEY);

      const parsed = JSON.parse(globalThis.localStorage.getItem(C.STORAGE_KEY));
      expect(parsed).to.be.an('array').with.lengthOf(SEED.TOTAL + 1);
      expect(parsed[0].id).to.equal(raw.id);
    });
  });

  it('localStorage 里的数据损坏（非法 JSON）时自愈：重新灌入示例数据，不白屏', function () {
    const fake = makeFakeStorage();
    fake.map[C.STORAGE_KEY] = '{ 这不是合法 JSON';
    withFakeStorage(fake, function (store) {
      expect(store.getAll()).to.have.lengthOf(SEED.TOTAL);
      expect(JSON.parse(globalThis.localStorage.getItem(C.STORAGE_KEY))).to.have.lengthOf(SEED.TOTAL);
    });
  });

  it('localStorage 里存的是「不是数组」的合法 JSON 时也自愈', function () {
    const fake = makeFakeStorage();
    fake.map[C.STORAGE_KEY] = '{"foo":1}';
    withFakeStorage(fake, function (store) {
      expect(store.getAll()).to.have.lengthOf(SEED.TOTAL);
    });
  });

  it('localStorage 写入抛异常（配额满 / 隐私模式）时降级到内存，不抛异常', function () {
    const throwing = {
      getItem: function () { return null; },
      setItem: function () { throw new Error('QuotaExceededError'); },
      removeItem: function () { throw new Error('QuotaExceededError'); }
    };
    withFakeStorage(throwing, function (store) {
      expect(function () { store.getAll(); }).to.not.throw();
      const saved = store.save(validForm({ name: '写失败也要能用' }));
      expect(saved.name).to.equal('写失败也要能用');
      expect(store.getById(saved.id)).to.not.equal(null);
    });
  });

  it('localStorage 存在但探测不通过（写入读不回）时也用内存 shim', function () {
    const broken = {
      getItem: function () { return null; },     // 永远读不到刚写的值
      setItem: function () { /* 静默丢弃 */ },
      removeItem: function () { }
    };
    withFakeStorage(broken, function (store) {
      expect(store.getAll()).to.have.lengthOf(SEED.TOTAL);
      const saved = store.save(validForm({ name: '探测失败降级' }));
      expect(store.getById(saved.id).name).to.equal('探测失败降级');
    });
  });

  // 把模块缓存恢复成绑定在「无 localStorage」上的正常实例，免得影响后续用例
  after(function () {
    MODULE_FILES.forEach(function (f) {
      delete require.cache[require.resolve('../js/' + f)];
    });
    require('../js/constant.js');
    require('../js/seed.js');
    require('../js/store.js');
  });

});
