/**
 * test/reward.test.js —— reward.js（悬赏 / 打赏）测试
 *
 * reward.js 是纯函数模块：不读 DOM、不碰 localStorage，所有输入都从参数进来。
 * 所以这里可以把它当数学函数测 —— 重点在三件事：
 *   1. 脏数据兜底（tips 不是数组、元素不是对象、amount 不是数字）；
 *   2. 「只增不改」的约定（addTip 必须返回新对象，不能污染传入的 item）；
 *   3. 金额判据只有一处（跟 Constant.isValidAmount 完全同一份）。
 *
 * 维护人：颜俊宇（102401114）
 */
'use strict';

const { expect } = require('chai');
const { Constant: C, Reward } = require('./helpers/fixtures');

/** 造一条带打赏记录的招领帖 */
function foundItem(overrides) {
  return Object.assign({
    type: C.TYPE.FOUND,
    name: '黑色雨伞',
    rewardAmount: 0,
    tips: []
  }, overrides || {});
}

describe('Reward 打赏记录读取', function () {

  it('getTipList：无 tips / tips 不是数组 → []', function () {
    expect(Reward.getTipList({})).to.deep.equal([]);
    expect(Reward.getTipList({ tips: null })).to.deep.equal([]);
    expect(Reward.getTipList({ tips: '坏数据' })).to.deep.equal([]);
    expect(Reward.getTipList({ tips: 123 })).to.deep.equal([]);
  });

  it('getTipList：null / undefined / 非对象 → []，不抛异常', function () {
    [null, undefined, 'x', 42, true].forEach(function (bad) {
      expect(Reward.getTipList(bad)).to.deep.equal([]);
    });
  });

  it('getTipList：数组里的 null 与非对象元素被过滤掉', function () {
    const item = foundItem({ tips: [null, { id: 'a', amount: 5 }, 'x', 42] });
    const list = Reward.getTipList(item);
    expect(list).to.have.lengthOf(1);
    expect(list[0].id).to.equal('a');
  });

  it('getTipTotal：正常累加，条数与总额都对', function () {
    const item = foundItem({
      tips: [
        { id: 'a', amount: 10, note: '谢谢', at: 1 },
        { id: 'b', amount: 5, note: '', at: 2 }
      ]
    });
    expect(Reward.getTipTotal(item)).to.deep.equal({ count: 2, total: 15 });
  });

  it('getTipTotal：空数据 → { count: 0, total: 0 }', function () {
    expect(Reward.getTipTotal({})).to.deep.equal({ count: 0, total: 0 });
    expect(Reward.getTipTotal(null)).to.deep.equal({ count: 0, total: 0 });
  });

  it('getTipTotal：amount 非数字的记录计入条数但不计入金额（不产生 NaN）', function () {
    const item = foundItem({
      tips: [
        { id: 'a', amount: 10 },
        { id: 'b', amount: '5' },
        { id: 'c', amount: NaN },
        { id: 'd', amount: null }
      ]
    });
    expect(Reward.getTipTotal(item)).to.deep.equal({ count: 4, total: 10 });
  });

  it('summarizeReward：悬赏缺失 / 负数 / 非数字 → hasReward=false、rewardAmount=0', function () {
    expect(Reward.summarizeReward({}).hasReward).to.equal(false);
    expect(Reward.summarizeReward({ rewardAmount: 0 }).hasReward).to.equal(false);
    expect(Reward.summarizeReward({ rewardAmount: -20 }).rewardAmount).to.equal(0);
    expect(Reward.summarizeReward({ rewardAmount: '20' }).hasReward).to.equal(false);
    expect(Reward.summarizeReward(null).hasReward).to.equal(false);
  });

  it('summarizeReward：悬赏 + 打赏一次取齐，与 getTipTotal 口径一致', function () {
    const item = foundItem({ rewardAmount: 20, tips: [{ id: 'a', amount: 10 }, { id: 'b', amount: 5 }] });
    const s = Reward.summarizeReward(item);
    expect(s).to.deep.equal({
      hasReward: true, rewardAmount: 20, tipCount: 2, tipTotal: 15
    });
    expect(s.tipTotal).to.equal(Reward.getTipTotal(item).total);
  });

});

describe('Reward.makeTip()', function () {

  it('合法金额生成完整记录：id / amount / note / at 四字段齐', function () {
    const tip = Reward.makeTip(10, '太感谢了', 1700000000000);
    expect(tip).to.have.all.keys('id', 'amount', 'note', 'at');
    expect(tip.amount).to.equal(10);
    expect(tip.note).to.equal('太感谢了');
    expect(tip.at).to.equal(1700000000000);
    expect(tip.id).to.be.a('string').and.not.to.equal('');
  });

  it('不传 note 时是空串（不是 undefined），页面层不用判空', function () {
    expect(Reward.makeTip(5).note).to.equal('');
    expect(Reward.makeTip(5, null).note).to.equal('');
    expect(Reward.makeTip(5, 12345).note).to.equal('');
  });

  it('留言自动 trim，且截到 LIMITS.tipNote 上限', function () {
    expect(Reward.makeTip(5, '  谢谢  ').note).to.equal('谢谢');
    const long = new Array(C.LIMITS.tipNote + 11).join('字');
    expect(Reward.makeTip(5, long).note).to.have.lengthOf(C.LIMITS.tipNote);
  });

  it('不传 now 时用当前时间戳', function () {
    const before = Date.now();
    const tip = Reward.makeTip(5);
    expect(tip.at).to.be.at.least(before);
    expect(tip.at).to.be.at.most(Date.now());
  });

  it('金额非法（0 / 越界 / 小数 / 负数 / 字符串 / 空）一律返回 null', function () {
    [0, -1, C.AMOUNT_LIMIT.max + 1, 1.5, '10', NaN, Infinity, null, undefined].forEach(function (bad) {
      expect(Reward.makeTip(bad), '金额 ' + JSON.stringify(bad)).to.equal(null);
    });
  });

  it('连续生成 200 条，id 不重复', function () {
    const ids = [];
    for (let i = 0; i < 200; i++) ids.push(Reward.makeTip(2).id);
    expect(new Set(ids).size).to.equal(200);
  });

});

describe('Reward.addTip()', function () {

  it('返回新对象并追加一条，原 item 一个字节都没动', function () {
    const item = foundItem({ tips: [{ id: 'old', amount: 2, note: '', at: 1 }] });
    const before = JSON.stringify(item);

    const next = Reward.addTip(item, 10, '谢谢', 1700000000000);

    expect(next).to.not.equal(item);                     // 不是同一个引用
    expect(next.tips).to.have.lengthOf(2);
    expect(next.tips[1].amount).to.equal(10);
    expect(JSON.stringify(item)).to.equal(before);        // 原对象没被改
  });

  it('没有 tips 字段的记录也能正确初始化', function () {
    const next = Reward.addTip({ type: C.TYPE.FOUND }, 5, '', 1);
    expect(next.tips).to.have.lengthOf(1);
    expect(next.tips[0].amount).to.equal(5);
  });

  it('tips 是脏数据（非数组）时被重置成数组再追加', function () {
    const next = Reward.addTip({ type: C.TYPE.FOUND, tips: '坏数据' }, 5, '', 1);
    expect(Array.isArray(next.tips)).to.equal(true);
    expect(next.tips).to.have.lengthOf(1);
  });

  it('连续追加 3 次，累计 3 条且金额累加正确', function () {
    let item = foundItem();
    [2, 5, 10].forEach(function (n) { item = Reward.addTip(item, n, '', Date.now()); });

    expect(item.tips).to.have.lengthOf(3);
    expect(Reward.getTipTotal(item)).to.deep.equal({ count: 3, total: 17 });
  });

  it('金额非法返回 null（调用方据此提示用户，且不落记录）', function () {
    expect(Reward.addTip(foundItem(), 0)).to.equal(null);
    expect(Reward.addTip(foundItem(), 201)).to.equal(null);
    expect(Reward.addTip(foundItem(), '10')).to.equal(null);
  });

  it('addTip 的结果可以直接存回 store（可 JSON 序列化）', function () {
    const next = Reward.addTip(foundItem(), 5, '谢谢', 1700000000000);
    expect(JSON.parse(JSON.stringify(next)).tips).to.have.lengthOf(1);
  });

});

describe('Reward.canTip() 打赏入口判定', function () {

  it('招领帖 + 非本人 → true', function () {
    expect(Reward.canTip(foundItem(), false)).to.equal(true);
  });

  it('招领帖 + 本人 → false（自己给自己打赏没有意义）', function () {
    expect(Reward.canTip(foundItem(), true)).to.equal(false);
  });

  it('寻物帖 → false（寻物帖走「悬赏」那条线）', function () {
    expect(Reward.canTip({ type: C.TYPE.LOST }, false)).to.equal(false);
  });

  it('空值 / 非法 type → false，不抛异常', function () {
    expect(Reward.canTip(null, false)).to.equal(false);
    expect(Reward.canTip(undefined, false)).to.equal(false);
    expect(Reward.canTip({}, false)).to.equal(false);
    expect(Reward.canTip({ type: 'unknown' }, false)).to.equal(false);
  });

});

describe('Reward 契约', function () {

  it('导出对象被冻结（页面层改不动）', function () {
    expect(Object.isFrozen(Reward)).to.equal(true);
  });

  it('isValidAmount 与 Constant.isValidAmount 是同一份判据（不各写一套）', function () {
    expect(Reward.isValidAmount).to.equal(C.isValidAmount);
    [1, 200, 0, 201, 1.5, '10'].forEach(function (v) {
      expect(Reward.isValidAmount(v)).to.equal(C.isValidAmount(v));
    });
  });

  it('七个导出方法齐全且都是函数', function () {
    ['getTipList', 'getTipTotal', 'summarizeReward', 'makeTip', 'addTip', 'canTip', 'isValidAmount']
      .forEach(function (k) {
        expect(typeof Reward[k], k).to.equal('function');
      });
  });

});
