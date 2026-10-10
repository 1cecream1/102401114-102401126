/**
 * test/seed.test.js —— seed.js 示例数据测试
 *
 * 示例数据不只是「几个样例」：它同时承担演示职责（8 个分类/地点各下拉都有内容、
 * 「我的发布」打开就有 6 条、含过时信息可用于验新鲜度提示），
 * 所以这里按「字段结构 + 覆盖度 + 契约」三个角度把它测死。
 *
 * 维护人：颜俊宇（102401114）
 */
'use strict';

const { expect } = require('chai');
const { Constant: C, Seed, ItemStore, SEED, countBy } = require('./helpers/fixtures');

// seed.js 文件头声明、且页面层依赖的 15 个字段
const FIELDS = [
  'id', 'ownerId', 'type', 'name', 'category', 'place',
  'lostTime', 'lostAt', 'description', 'contact',
  'status', 'views', 'createdAt', 'updatedAt', 'closedAt'
];

describe('Seed 示例数据', function () {

  const samples = Seed.samples(ItemStore.getOwnerId());

  it('共 ' + SEED.TOTAL + ' 条', function () {
    expect(samples).to.be.an('array').with.lengthOf(SEED.TOTAL);
  });

  it('每条都带齐 15 个字段（页面层不用做存在性判断）', function () {
    samples.forEach(function (it) {
      FIELDS.forEach(function (f) {
        expect(it, '缺少字段 ' + f).to.have.property(f);
      });
    });
  });

  it('id 唯一', function () {
    expect(new Set(samples.map(function (it) { return it.id; })).size).to.equal(SEED.TOTAL);
  });

  it('枚举字段全部合法', function () {
    samples.forEach(function (it) {
      expect(C.isValidType(it.type)).to.equal(true);
      expect(C.isValidStatus(it.status)).to.equal(true);
      expect(C.isValidCategory(it.category)).to.equal(true);
      expect(C.isValidPlace(it.place)).to.equal(true);
    });
  });

  it('类型分布：寻物 ' + SEED.LOST + ' / 招领 ' + SEED.FOUND, function () {
    expect(countBy(samples, function (it) { return it.type === C.TYPE.LOST; })).to.equal(SEED.LOST);
    expect(countBy(samples, function (it) { return it.type === C.TYPE.FOUND; })).to.equal(SEED.FOUND);
  });

  it('状态分布：已完结 ' + SEED.DONE + ' / 进行中 ' + (SEED.TOTAL - SEED.DONE), function () {
    expect(countBy(samples, function (it) { return it.status === C.STATUS.DONE; })).to.equal(SEED.DONE);
  });

  it('每个分类至少 2 条（筛选下拉不会点出空列表）', function () {
    C.CATEGORY.forEach(function (cat) {
      expect(countBy(samples, function (it) { return it.category === cat; }))
        .to.be.at.least(2, '分类「' + cat + '」示例数据太少');
    });
  });

  it('每个地点至少 2 条（筛选下拉不会点出空列表）', function () {
    C.PLACE.forEach(function (p) {
      expect(countBy(samples, function (it) { return it.place === p; }))
        .to.be.at.least(2, '地点「' + p + '」示例数据太少');
    });
  });

  it('本人 ' + SEED.MINE + ' 条 / 他人 ' + SEED.OTHER + ' 条', function () {
    const me = ItemStore.getOwnerId();
    expect(countBy(samples, function (it) { return it.ownerId === me; })).to.equal(SEED.MINE);
    expect(countBy(samples, function (it) { return it.ownerId === Seed.OTHER_OWNER_ID; })).to.equal(SEED.OTHER);
  });

  it('契约：samples(ownerId) 前 3 条一定用传入的 ownerId', function () {
    Seed.samples('tmp-oid').slice(0, 3).forEach(function (it) {
      expect(it.ownerId).to.equal('tmp-oid');
    });
    expect(Seed.samples().length).to.equal(SEED.TOTAL); // 不传时用 seed-owner 兜底，不报错
  });

  it('本人发布里同时有「进行中」和「已完结」（详情页两种按钮都能演示）', function () {
    const me = ItemStore.getOwnerId();
    const mine = samples.filter(function (it) { return it.ownerId === me; });
    expect(mine.some(function (it) { return it.status === C.STATUS.OPEN; })).to.equal(true);
    expect(mine.some(function (it) { return it.status === C.STATUS.DONE; })).to.equal(true);
  });

  it('closedAt 与状态自洽：完结的必有时刻、进行中的必须为 null', function () {
    samples.forEach(function (it) {
      if (it.status === C.STATUS.DONE) {
        expect(it.closedAt).to.be.a('number');
      } else {
        expect(it.closedAt).to.equal(null);
      }
    });
  });

  it('lostAt 是时间戳且不晚于发布时间（「最近丢失」排序依赖它）', function () {
    samples.forEach(function (it) {
      expect(it.lostAt).to.be.a('number');
      expect(it.lostAt).to.be.at.most(it.createdAt);
    });
  });

  it('有一条超过 30 天（用来验附加特点 E6「可能已过时」提示）', function () {
    const now = Date.now();
    const THIRTY_DAYS = 30 * 24 * 3600 * 1000;
    expect(samples.some(function (it) { return now - it.createdAt > THIRTY_DAYS; })).to.equal(true);
  });

  it('浏览量有区分度（「最多浏览」排序才排得出差别）', function () {
    const views = samples.map(function (it) { return it.views; });
    expect(new Set(views).size).to.be.at.least(10);
  });

  it('所有文本字段都没超长度上限', function () {
    samples.forEach(function (it) {
      expect(it.name.length).to.be.at.most(C.LIMITS.name);
      expect(it.lostTime.length).to.be.at.most(C.LIMITS.lostTime);
      expect(it.description.length).to.be.at.most(C.LIMITS.description);
      expect(it.contact.length).to.be.at.least(C.LIMITS.contactMin);
      expect(it.contact.length).to.be.at.most(C.LIMITS.contactMax);
    });
  });

  it('时间是「相对当前时刻」生成的，两次调用都拿到 24 条且时间戳是活的', function () {
    const again = Seed.samples(ItemStore.getOwnerId());
    expect(again).to.have.lengthOf(SEED.TOTAL);
    expect(Math.abs(again[0].createdAt - samples[0].createdAt)).to.be.below(5000);
  });

});
