/**
 * test/validate.test.js —— validate.js（表单校验）测试
 *
 * 校验是「发布」这条主流程的第一道闸门：任何一条漏判，脏数据就会进 localStorage。
 * 因此这里按四类用例覆盖：正常通过 / 必填缺失 / 长度边界（刚好通过 + 超一个字）/
 * 非法输入兜底，并额外验证「提示文案随类型切换」这一容易漏掉的分支。
 *
 * 维护人：颜俊宇（102401114）
 */
'use strict';

const { expect } = require('chai');
const { Constant: C, Validate, validForm, repeat } = require('./helpers/fixtures');

describe('Validate 表单校验', function () {

  it('合法表单通过：valid=true 且 errors 为空对象', function () {
    const r = Validate.validateItem(validForm());
    expect(r.valid).to.equal(true);
    expect(r.errors).to.deep.equal({});
  });

  it('完全空表单不通过，六个必填字段都有中文提示', function () {
    const r = Validate.validateItem({});
    expect(r.valid).to.equal(false);
    ['type', 'name', 'category', 'place', 'contact', 'lostTime'].forEach(function (f) {
      expect(r.errors, '字段 ' + f + ' 应该报错').to.have.property(f);
      expect(r.errors[f]).to.be.a('string').and.not.to.equal('');
    });
  });

  it('errors 只包含出错的字段（合法字段不出现）', function () {
    const r = Validate.validateItem(validForm({ name: '' }));
    expect(Object.keys(r.errors)).to.deep.equal(['name']);
  });

  it('非对象入参（null / 字符串 / 数字 / undefined / 数组）兜底成不通过，不抛异常', function () {
    [null, undefined, 'x', 123, true].forEach(function (bad) {
      const r = Validate.validateItem(bad);
      expect(r.valid, '入参 ' + JSON.stringify(bad)).to.equal(false);
      expect(r.errors).to.be.an('object');
    });
  });

  it('类型只认 lost / found，非法值报错', function () {
    expect(Validate.validateItem(validForm()).errors).to.not.have.property('type');
    expect(Validate.validateItem(validForm({ type: 'LOST' })).errors).to.have.property('type');
    expect(Validate.validateItem(validForm({ type: '' })).errors).to.have.property('type');
  });

  it('物品名称：必填；' + C.LIMITS.name + ' 字通过，' + (C.LIMITS.name + 1) + ' 字报错', function () {
    expect(Validate.validateItem(validForm({ name: '' })).errors).to.have.property('name');
    expect(Validate.validateItem(validForm({ name: '   ' })).errors).to.have.property('name'); // 全空格算空
    expect(Validate.validateItem(validForm({ name: repeat('字', C.LIMITS.name) })).valid).to.equal(true);

    const tooLong = Validate.validateItem(validForm({ name: repeat('字', C.LIMITS.name + 1) }));
    expect(tooLong.errors).to.have.property('name');
    expect(tooLong.errors.name).to.contain(String(C.LIMITS.name));
    expect(tooLong.errors.name).to.contain(String(C.LIMITS.name + 1)); // 提示里要带实际字数
  });

  it('名称首尾空格不算长度（先 trim 再判）', function () {
    const padded = '  ' + repeat('字', C.LIMITS.name) + '  ';
    expect(Validate.validateItem(validForm({ name: padded })).valid).to.equal(true);
  });

  it('分类必须是 8 类之一', function () {
    C.CATEGORY.forEach(function (cat) {
      expect(Validate.validateItem(validForm({ category: cat })).errors).to.not.have.property('category');
    });
    expect(Validate.validateItem(validForm({ category: '不存在的分类' })).errors).to.have.property('category');
  });

  it('地点必须是 8 处之一', function () {
    C.PLACE.forEach(function (p) {
      expect(Validate.validateItem(validForm({ place: p })).errors).to.not.have.property('place');
    });
    expect(Validate.validateItem(validForm({ place: '月球' })).errors).to.have.property('place');
  });

  it('地点提示文案随类型切换（寻物「丢失地点」/ 招领「拾获地点」）', function () {
    const lost = Validate.validateItem(validForm({ type: C.TYPE.LOST, place: '' }));
    expect(lost.errors.place).to.contain('丢失地点');

    const found = Validate.validateItem(validForm({ type: C.TYPE.FOUND, place: '' }));
    expect(found.errors.place).to.contain('拾获地点');
  });

  it('联系方式：必填，少于 ' + C.LIMITS.contactMin + ' 字报错、恰好通过', function () {
    expect(Validate.validateItem(validForm({ contact: '' })).errors).to.have.property('contact');
    expect(Validate.validateItem(validForm({ contact: 'ab' })).errors).to.have.property('contact');
    expect(Validate.validateItem(validForm({ contact: 'abc' })).valid).to.equal(true);
  });

  it('联系方式超过 ' + C.LIMITS.contactMax + ' 字报错', function () {
    expect(Validate.validateItem(validForm({ contact: repeat('a', C.LIMITS.contactMax) })).valid).to.equal(true);
    expect(Validate.validateItem(validForm({ contact: repeat('a', C.LIMITS.contactMax + 1) })).errors)
      .to.have.property('contact');
  });

  it('丢失/拾获时间：必填；' + C.LIMITS.lostTime + ' 字通过，超一字报错', function () {
    expect(Validate.validateItem(validForm({ lostTime: '' })).errors).to.have.property('lostTime');
    expect(Validate.validateItem(validForm({ lostTime: repeat('时', C.LIMITS.lostTime) })).valid).to.equal(true);
    expect(Validate.validateItem(validForm({ lostTime: repeat('时', C.LIMITS.lostTime + 1) })).errors)
      .to.have.property('lostTime');
  });

  it('时间提示文案随类型切换（寻物「丢失时间」/ 招领「拾获时间」）', function () {
    expect(Validate.validateItem(validForm({ type: C.TYPE.LOST, lostTime: '' })).errors.lostTime)
      .to.contain('丢失时间');
    expect(Validate.validateItem(validForm({ type: C.TYPE.FOUND, lostTime: '' })).errors.lostTime)
      .to.contain('拾获时间');
  });

  it('物品描述是选填：留空通过，' + C.LIMITS.description + ' 字通过，超一字报错', function () {
    expect(Validate.validateItem(validForm({ description: '' })).valid).to.equal(true);
    expect(Validate.validateItem(validForm({ description: repeat('a', C.LIMITS.description) })).valid).to.equal(true);
    expect(Validate.validateItem(validForm({ description: repeat('a', C.LIMITS.description + 1) })).errors)
      .to.have.property('description');
  });

  it('多个字段同时出错时逐项都报（页面层才能逐项标红）', function () {
    const r = Validate.validateItem({ type: 'lost', name: '', category: '不存在', place: '月球', contact: 'a', lostTime: '' });
    expect(r.valid).to.equal(false);
    ['name', 'category', 'place', 'contact', 'lostTime'].forEach(function (f) {
      expect(r.errors, '字段 ' + f + ' 应该报错').to.have.property(f);
    });
    expect(r.errors).to.not.have.property('type');
  });

  it('返回结构固定为 { valid, errors }，调用方可直接解构', function () {
    const r = Validate.validateItem(validForm());
    expect(r).to.have.all.keys('valid', 'errors');
    expect(r.valid).to.be.a('boolean');
    expect(r.errors).to.be.an('object');
  });

  it('悬赏金额是选填：不填 / null / 空串 / 0 都通过，且不产生 rewardAmount 键', function () {
    [undefined, null, '', 0].forEach(function (v) {
      const r = Validate.validateItem(validForm({ rewardAmount: v }));
      expect(r.valid, 'rewardAmount=' + JSON.stringify(v)).to.equal(true);
      expect(r.errors).to.not.have.property('rewardAmount');
    });
  });

  it('悬赏金额边界：' + C.AMOUNT_LIMIT.min + ' / ' + C.AMOUNT_LIMIT.max + ' 通过', function () {
    expect(Validate.validateItem(validForm({ rewardAmount: C.AMOUNT_LIMIT.min })).valid).to.equal(true);
    expect(Validate.validateItem(validForm({ rewardAmount: C.AMOUNT_LIMIT.max })).valid).to.equal(true);
  });

  it('悬赏金额越界 / 小数 / 负数 / 非数字字符串 报 errors.rewardAmount', function () {
    [C.AMOUNT_LIMIT.max + 1, 1.5, -5, 'abc'].forEach(function (v) {
      const r = Validate.validateItem(validForm({ rewardAmount: v }));
      expect(r.errors, 'rewardAmount=' + JSON.stringify(v)).to.have.property('rewardAmount');
      expect(r.errors.rewardAmount).to.contain(String(C.AMOUNT_LIMIT.max));   // 提示里带区间
    });
  });

  it('悬赏金额传数字字符串 "20" 也能通过（表单拿到的就是字符串）', function () {
    expect(Validate.validateItem(validForm({ rewardAmount: '20' })).valid).to.equal(true);
    expect(Validate.validateItem(validForm({ rewardAmount: ' 20 ' })).valid).to.equal(true);
  });

});
