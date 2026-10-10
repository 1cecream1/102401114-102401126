/**
 * test/constant.test.js —— constant.js 契约测试
 *
 * constant.js 是两人共用的「契约文件」：8 个分类、8 个地点、三种排序、字段长度上限
 * 都从这里取。这些值一旦悄悄变了，页面层的下拉框、搜索、表单校验会一起出问题，
 * 所以先用测试把它们钉死。
 *
 * 维护人：颜俊宇（102401114）
 */
'use strict';

const { expect } = require('chai');
const fs = require('fs');
const path = require('path');
const { Constant: C, JS_DIR } = require('./helpers/fixtures');

describe('Constant 常量契约', function () {

  it('导出键数量与约定一致（42 个）', function () {
    expect(Object.keys(C)).to.have.lengthOf(42);
  });

  it('枚举值齐全：类型 / 状态 / 排序', function () {
    expect(C.TYPE).to.deep.equal({ LOST: 'lost', FOUND: 'found' });
    expect(C.STATUS).to.deep.equal({ OPEN: 'open', DONE: 'done' });
    expect(C.SORT).to.deep.equal({ LATEST: 'latest', LOST_TIME: 'lostTime', HOT: 'hot' });
    expect(C.DEFAULT_SORT).to.equal(C.SORT.LATEST);
  });

  it('8 个分类、8 个地点，均无重复且非空', function () {
    expect(C.CATEGORY).to.have.lengthOf(8);
    expect(C.PLACE).to.have.lengthOf(8);
    expect(new Set(C.CATEGORY).size).to.equal(8);
    expect(new Set(C.PLACE).size).to.equal(8);
    C.CATEGORY.concat(C.PLACE).forEach(function (v) {
      expect(v).to.be.a('string').and.not.to.equal('');
    });
  });

  it('每个分类都有图标，未知分类回落「其他」', function () {
    C.CATEGORY.forEach(function (cat) {
      expect(C.CATEGORY_ICON[cat]).to.be.a('string').and.not.to.equal('');
    });
    expect(C.getCategoryIcon('不存在的分类')).to.equal(C.CATEGORY_ICON['其他']);
  });

  it('终结文案随类型走：寻物=已找到，招领=已归还', function () {
    expect(C.getDoneLabel(C.TYPE.LOST)).to.equal('已找到');
    expect(C.getDoneLabel(C.TYPE.FOUND)).to.equal('已归还');
    expect(C.ACTION_LABEL[C.TYPE.LOST]).to.equal('标记为已找到');
    expect(C.ACTION_LABEL[C.TYPE.FOUND]).to.equal('标记为已归还');
  });

  it('枚举校验助手：合法为 true、非法为 false', function () {
    expect(C.isValidType('lost')).to.equal(true);
    expect(C.isValidType('LOST')).to.equal(false);
    expect(C.isValidType(undefined)).to.equal(false);

    expect(C.isValidStatus('open')).to.equal(true);
    expect(C.isValidStatus('closed')).to.equal(false);

    expect(C.isValidCategory('电子产品')).to.equal(true);
    expect(C.isValidCategory('电子产品2')).to.equal(false);

    expect(C.isValidPlace('图书馆')).to.equal(true);
    expect(C.isValidPlace('月球')).to.equal(false);

    expect(C.isValidSort('hot')).to.equal(true);
    expect(C.isValidSort('newest')).to.equal(false);
  });

  it('首页 tab 只认 all/lost/found（不能拿它校验状态筛选）', function () {
    expect(C.isValidTabValue(C.FILTER_ALL)).to.equal(true);
    expect(C.isValidTabValue('lost')).to.equal(true);
    expect(C.isValidTabValue('open')).to.equal(false);
  });

  it('查询助手：命中返回对象、未命中返回 null，getPostTab 兜底不返回 null', function () {
    expect(C.getTypeTab('lost').label).to.equal('寻物');
    expect(C.findByValue(C.TYPE_TABS, '根本不存在')).to.equal(null);
    expect(C.getPostTab('非法值')).to.equal(C.POST_TABS[0]);
    expect(C.getTypeLabel('不存在')).to.equal('');
    expect(C.getStatusLabel('不存在')).to.equal('');
  });

  it('发布页两个 tab 的地点/时间文案随类型切换', function () {
    expect(C.getPostTab('lost').placeLabel).to.equal('丢失地点');
    expect(C.getPostTab('lost').timeLabel).to.equal('丢失时间');
    expect(C.getPostTab('found').placeLabel).to.equal('拾获地点');
    expect(C.getPostTab('found').timeLabel).to.equal('拾获时间');
  });

  it('长度上限与 index.html 的 maxlength 一致（防止两处各自漂移）', function () {
    const html = fs.readFileSync(path.join(JS_DIR, '..', 'index.html'), 'utf8');
    const maxlengths = Array.from(html.matchAll(/maxlength="(\d+)"/g)).map(function (m) {
      return Number(m[1]);
    });
    expect(maxlengths).to.include(C.LIMITS.name);
    expect(maxlengths).to.include(C.LIMITS.lostTime);
    expect(maxlengths).to.include(C.LIMITS.description);
    expect(maxlengths).to.include(C.LIMITS.contactMax);
  });

  it('打赏档位与金额区间：档位冻结、区间为 1~200 整数', function () {
    expect(C.TIP_AMOUNTS).to.deep.equal([2, 5, 10, 20]);
    expect(Object.isFrozen(C.TIP_AMOUNTS)).to.equal(true);
    expect(C.AMOUNT_LIMIT).to.deep.equal({ min: 1, max: 200 });
    expect(Object.isFrozen(C.AMOUNT_LIMIT)).to.equal(true);
    // 每一档都必须自己合法，否则弹层会给出一个点下去就报错的选项
    C.TIP_AMOUNTS.forEach(function (n) {
      expect(C.isValidAmount(n), '档位 ¥' + n + ' 应该是合法金额').to.equal(true);
    });
  });

  it('isValidAmount 边界：1 / 200 合法，越界、小数、字符串、空值一律非法', function () {
    expect(C.isValidAmount(C.AMOUNT_LIMIT.min)).to.equal(true);
    expect(C.isValidAmount(C.AMOUNT_LIMIT.max)).to.equal(true);
    expect(C.isValidAmount(20)).to.equal(true);

    expect(C.isValidAmount(0)).to.equal(false);
    expect(C.isValidAmount(-1)).to.equal(false);
    expect(C.isValidAmount(C.AMOUNT_LIMIT.max + 1)).to.equal(false);
    expect(C.isValidAmount(1.5)).to.equal(false);
    expect(C.isValidAmount('10')).to.equal(false);   // 字符串不算，页面层要显式 Number()
    expect(C.isValidAmount(NaN)).to.equal(false);
    expect(C.isValidAmount(Infinity)).to.equal(false);
    expect(C.isValidAmount(null)).to.equal(false);
    expect(C.isValidAmount(undefined)).to.equal(false);
  });

  it('打赏留言上限写进 LIMITS（与 index.html 的 maxlength 对齐）', function () {
    expect(C.LIMITS.tipNote).to.equal(20);
  });

  it('常量集合被冻结，页面层改不动（防原地修改）', function () {
    expect(Object.isFrozen(C)).to.equal(true);
    expect(Object.isFrozen(C.CATEGORY)).to.equal(true);
    expect(Object.isFrozen(C.PLACE)).to.equal(true);
    expect(Object.isFrozen(C.SORT_OPTIONS)).to.equal(true);
  });

  it('存储键三件套互不相同，且带统一前缀', function () {
    const keys = [C.STORAGE_KEY, C.OWNER_KEY, C.SEED_FLAG_KEY];
    expect(new Set(keys).size).to.equal(3);
    keys.forEach(function (k) {
      expect(k).to.match(/^campus-lost-found:/);
    });
  });

});
