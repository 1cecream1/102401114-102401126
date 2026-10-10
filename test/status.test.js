/**
 * test/status.test.js —— status.js（类型 / 状态文案）测试
 *
 * 两个纯查询函数，重点是「非法输入返回约定值而不是抛异常」——
 * 详情页会拿可能已被删除的记录来调它，一旦抛异常整页就白了。
 *
 * 维护人：颜俊宇（102401114）
 */
'use strict';

const { expect } = require('chai');
const { Constant: C, Status } = require('./helpers/fixtures');

describe('Status 文案', function () {

  it('getStatusText：进行中 / 已找到 / 已归还', function () {
    expect(Status.getStatusText({ status: C.STATUS.OPEN, type: C.TYPE.LOST })).to.equal('进行中');
    expect(Status.getStatusText({ status: C.STATUS.OPEN, type: C.TYPE.FOUND })).to.equal('进行中');
    expect(Status.getStatusText({ status: C.STATUS.DONE, type: C.TYPE.LOST })).to.equal('已找到');
    expect(Status.getStatusText({ status: C.STATUS.DONE, type: C.TYPE.FOUND })).to.equal('已归还');
  });

  it('getStatusText：完结但类型非法时回落成通用的「已完结」，而不是空串', function () {
    expect(Status.getStatusText({ status: C.STATUS.DONE, type: '不存在' })).to.equal(C.STATUS_LABEL.done);
    expect(Status.getStatusText({ status: C.STATUS.DONE })).to.equal(C.STATUS_LABEL.done);
  });

  it('getStatusText：空值 / 非对象 / 非法状态一律返回空串，不抛异常', function () {
    expect(Status.getStatusText(null)).to.equal('');
    expect(Status.getStatusText(undefined)).to.equal('');
    expect(Status.getStatusText('x')).to.equal('');
    expect(Status.getStatusText(123)).to.equal('');
    expect(Status.getStatusText({})).to.equal('');
    expect(Status.getStatusText({ status: 'closed', type: C.TYPE.LOST })).to.equal('');
  });

  it('getTypeText：寻物 / 招领，非法值返回空串', function () {
    expect(Status.getTypeText(C.TYPE.LOST)).to.equal('寻物');
    expect(Status.getTypeText(C.TYPE.FOUND)).to.equal('招领');
    expect(Status.getTypeText('随便')).to.equal('');
    expect(Status.getTypeText(undefined)).to.equal('');
    expect(Status.getTypeText(null)).to.equal('');
  });

  it('文案与 constant.js 保持一致（不在本文件硬编码中文）', function () {
    expect(Status.getTypeText(C.TYPE.LOST)).to.equal(C.TYPE_LABEL.lost);
    expect(Status.getStatusText({ status: C.STATUS.OPEN })).to.equal(C.STATUS_LABEL.open);
    expect(Status.getStatusText({ status: C.STATUS.DONE, type: C.TYPE.FOUND })).to.equal(C.DONE_LABEL.found);
  });

});
