/**
 * js/seed.js —— 示例数据（首次访问自动灌入 / 「一键重置」时重新灌入）
 *
 * 共 24 条，覆盖演示需要的全部组合：
 *   · 8 个分类、8 个地点各出现 3 次左右（筛选下拉每一项都有内容）
 *   · 本人发布 6 条 / 他人发布 18 条
 *   · 寻物 14 条 / 招领 10 条
 *   · 进行中 16 条 / 已完结 8 条
 *   · 3 小时内新发布（验「刚刚 / 小时前」）与超过 30 天的过时信息（验 E6 过时提示）
 *   · 浏览量从 7 到 88 不等（验「最多浏览」排序有区分度）
 *
 * 【导出】Seed.samples(ownerId)
 *   ownerId = 当前浏览器的发布者标识。**前 3 条以它作为 ownerId**（契约，勿改），
 *   另外第 9 / 16 / 22 条也是本人发布 —— 这样「我的发布」页一打开就有 6 条，
 *   且同时包含「进行中」与「已完结」，答辩演示时不用现造数据。
 *   不传时用 'seed-owner' 兜底，方便 Node 单测直接调用。
 *
 * 【依赖】constant.js（必须先加载）
 */
(function (root) {
  'use strict';

  const C = (typeof module !== 'undefined' && module.exports)
    ? require('./constant.js')
    : root.Constant;
  if (!C) throw new Error('[seed.js] constant.js 未加载：请把 constant.js 放在本文件之前引入');

  const MINUTE = 60 * 1000;
  const HOUR = 60 * MINUTE;
  const DAY = 24 * HOUR;

  // 示例数据里「不是自己发的那几条」的固定发布者标识
  const OTHER_OWNER_ID = 'seed-other-owner';

  /**
   * 返回示例数据数组。
   * 时间戳按「相对当前时刻」生成（30 分钟前、3 小时前、33 天前…），
   * 这样每次打开页面看到的新鲜度提示都是活的，也方便验附加特点 E6。
   */
  function samples(ownerId) {
    const me = ownerId || 'seed-owner';
    const now = Date.now();

    // mine          是否本人发布（第 1~3 条必须为 true，见文件头契约）
    // agoMs         发布时间距今多久
    // lostBeforeMs  丢失/拾获时间比发布时间早多久（近似）
    // closedAfterMs 已完结的话，完结时间比发布时间晚多久
    const raw = [
      /* ---------- 第 1~6 条：演示主流程用（时间、浏览量刻意拉开差距） ---------- */
      { mine: true,  type: C.TYPE.LOST,  name: '校园卡', category: '证件卡类', place: '图书馆',
        lostTime: '10月9日 下午', agoMs: 3 * HOUR, lostBeforeMs: 2 * HOUR,
        description: '白色卡套，姓名李**，卡号尾号 3721。在三楼自习区靠窗的位置丢的，捡到的同学麻烦联系我。',
        contact: '微信 lixx_2024', status: C.STATUS.OPEN, views: 42 },

      { mine: true,  type: C.TYPE.FOUND, name: '黑色雨伞', category: '日用品', place: '食堂',
        lostTime: '10月8日 中午', agoMs: 1 * DAY, lostBeforeMs: 3 * HOUR,
        description: '伞柄上挂着一只小黄鸭挂件，应该是一楼窗口附近落下的，已交给出餐台阿姨。',
        contact: 'QQ 1234567（备注失物）', status: C.STATUS.DONE, views: 15, closedAfterMs: 5 * HOUR },

      { mine: true,  type: C.TYPE.LOST,  name: '蓝牙耳机', category: '电子产品', place: '体育场',
        lostTime: '10月9日 上午', agoMs: 5 * HOUR, lostBeforeMs: 1 * HOUR,
        description: '白色充电盒，盒盖内侧贴了一张小熊贴纸。跑完步发现不见了，范围应该在看台东侧。',
        contact: '138-0000-1234', status: C.STATUS.OPEN, views: 88 },

      { mine: false, type: C.TYPE.LOST,  name: '宿舍钥匙', category: '钥匙门禁', place: '宿舍楼',
        lostTime: '9月6日 上午', agoMs: 33 * DAY, lostBeforeMs: 2 * HOUR,
        description: '两把钥匙串在一个蓝色挂绳上，挂绳印着校徽，可能落在 3 号楼楼梯口了。已经过去很久，如果没人捡到就当我留个记录。',
        contact: '微信 key_finder', status: C.STATUS.OPEN, views: 30 },

      { mine: false, type: C.TYPE.FOUND, name: '高等数学（上册）教材', category: '书籍资料', place: '教学楼',
        lostTime: '10月7日 下午', agoMs: 2 * DAY, lostBeforeMs: 4 * HOUR,
        description: '书页里有不少铅笔笔记，扉页写着班级，已放在四教 208 讲台边的失物架上。',
        contact: 'QQ 8765432', status: C.STATUS.DONE, views: 61, closedAfterMs: 20 * HOUR },

      { mine: false, type: C.TYPE.LOST,  name: '保温水杯', category: '日用品', place: '校车站',
        lostTime: '10月9日 下午', agoMs: 30 * MINUTE, lostBeforeMs: 20 * MINUTE,
        description: '银灰色 500ml 保温杯，杯身上有一道浅浅的划痕，等车的时候放在长椅上忘了拿。',
        contact: '微信 cup_back', status: C.STATUS.OPEN, views: 7 },

      /* ---------- 第 7~14 条：补齐证件卡类 / 运动器材 / 服饰饰品 / 校道 / 快递点 ---------- */
      { mine: false, type: C.TYPE.LOST,  name: '学生证', category: '证件卡类', place: '教学楼',
        lostTime: '10月6日 上午', agoMs: 3 * DAY, lostBeforeMs: 5 * HOUR,
        description: '红色封皮，里面夹着一张公交卡，最后一次用是在四教的机房。已经有好心同学联系上我了。',
        contact: '手机 139-0000-5678', status: C.STATUS.DONE, views: 54, closedAfterMs: 12 * HOUR },

      { mine: false, type: C.TYPE.FOUND, name: '篮球', category: '运动器材', place: '体育场',
        lostTime: '10月8日 傍晚', agoMs: 20 * HOUR, lostBeforeMs: 6 * HOUR,
        description: '斯伯丁的球，上面用马克笔写了个「3」，应该是打完球忘在篮球架底下的，先放在体育馆器材室。',
        contact: 'QQ 3344556', status: C.STATUS.OPEN, views: 26 },

      { mine: true,  type: C.TYPE.LOST,  name: '平板保护套', category: '电子产品', place: '图书馆',
        lostTime: '10月5日 下午', agoMs: 4 * DAY, lostBeforeMs: 3 * HOUR,
        description: '深蓝色的翻盖保护套，背面贴了一张社团的贴纸。可能夹在还回去的几本书里了。',
        contact: '微信 tang_0721', status: C.STATUS.DONE, views: 39, closedAfterMs: 30 * HOUR },

      { mine: false, type: C.TYPE.FOUND, name: '灰色围巾', category: '服饰饰品', place: '校道',
        lostTime: '10月4日 上午', agoMs: 5 * DAY, lostBeforeMs: 2 * HOUR,
        description: '针织的灰色围巾，搭在图书馆到食堂那条路边花坛上，已经收起来挂在宿管阿姨那儿。',
        contact: '微信 scarf_owner', status: C.STATUS.OPEN, views: 18 },

      { mine: false, type: C.TYPE.LOST,  name: '充电宝', category: '电子产品', place: '快递点',
        lostTime: '10月8日 上午', agoMs: 26 * HOUR, lostBeforeMs: 2 * HOUR,
        description: '一万毫安的白色充电宝，上面缠了一根红色的橡皮筋，取快递的时候放在柜台上了。',
        contact: '手机 137-0000-9012', status: C.STATUS.OPEN, views: 47 },

      { mine: false, type: C.TYPE.FOUND, name: '银色钥匙串', category: '钥匙门禁', place: '校道',
        lostTime: '10月3日 中午', agoMs: 6 * DAY, lostBeforeMs: 4 * HOUR,
        description: '三把钥匙加一个指甲刀，挂绳是黑色的，在通往东门的路上捡到的，先放我这里。',
        contact: 'QQ 6677889', status: C.STATUS.OPEN, views: 22 },

      { mine: false, type: C.TYPE.LOST,  name: '物理实验报告册', category: '书籍资料', place: '教学楼',
        lostTime: '10月7日 上午', agoMs: 44 * HOUR, lostBeforeMs: 3 * HOUR,
        description: '封面是学校统一发的那种蓝皮报告册，里面已经写了四次实验数据，丢了我得重写一遍。',
        contact: '微信 physics_lab', status: C.STATUS.OPEN, views: 35 },

      { mine: false, type: C.TYPE.FOUND, name: '黑色毛线手套', category: '服饰饰品', place: '食堂',
        lostTime: '10月2日 晚上', agoMs: 7 * DAY, lostBeforeMs: 5 * HOUR,
        description: '一双，右手那只的食指有个小破洞，失主已经联系上我了，多谢大家转发。',
        contact: '微信 glove_back', status: C.STATUS.DONE, views: 12, closedAfterMs: 18 * HOUR },

      /* ---------- 第 15~24 条：补足各分类与地点，凑满 24 条 ---------- */
      { mine: false, type: C.TYPE.LOST,  name: '素描本', category: '其他', place: '教学楼',
        lostTime: '10月1日 下午', agoMs: 8 * DAY, lostBeforeMs: 2 * HOUR,
        description: 'A4 大小，牛皮纸封面，里面画了十几张速写，对我挺重要的，翻到的话麻烦联系我。',
        contact: '微信 sketch_book', status: C.STATUS.OPEN, views: 9 },

      { mine: true,  type: C.TYPE.FOUND, name: '羽毛球拍', category: '运动器材', place: '体育场',
        lostTime: '10月9日 傍晚', agoMs: 4 * HOUR, lostBeforeMs: 1 * HOUR,
        description: '一支尤尼克斯的拍子，握把胶是蓝色的，刚从体育馆出来就看见它靠在栏杆上。',
        contact: '微信 badminton_me', status: C.STATUS.OPEN, views: 33 },

      { mine: false, type: C.TYPE.LOST,  name: '快递纸箱里的专业课书', category: '其他', place: '快递点',
        lostTime: '10月6日 下午', agoMs: 70 * HOUR, lostBeforeMs: 4 * HOUR,
        description: '取件时整个人连着箱子落在驿站门口了，箱子上写着我名字的最后一个字，里面是三本专业课教材。',
        contact: '微信 parcel_2024', status: C.STATUS.OPEN, views: 20 },

      { mine: false, type: C.TYPE.FOUND, name: '校园卡（王**）', category: '证件卡类', place: '食堂',
        lostTime: '10月8日 早上', agoMs: 40 * HOUR, lostBeforeMs: 2 * HOUR,
        description: '早餐时在餐盘回收处捡到的，卡面磨损比较明显，已经交到食堂一楼的服务台了。',
        contact: '微信 canteen_help', status: C.STATUS.DONE, views: 58, closedAfterMs: 6 * HOUR },

      { mine: false, type: C.TYPE.LOST,  name: '银色项链', category: '服饰饰品', place: '校车站',
        lostTime: '9月28日 上午', agoMs: 11 * DAY, lostBeforeMs: 3 * HOUR,
        description: '细链子，吊坠是一个很小的月亮，等车的时候可能挂到背包带子上被带掉了。',
        contact: 'QQ 9900112', status: C.STATUS.OPEN, views: 14 },

      { mine: false, type: C.TYPE.FOUND, name: '速溶咖啡罐', category: '日用品', place: '宿舍楼',
        lostTime: '10月9日 上午', agoMs: 8 * HOUR, lostBeforeMs: 2 * HOUR,
        description: '一大罐没开封的速溶咖啡，放在三楼公共饮水机旁边，已经搬到我宿舍了，来认领时说下牌子。',
        contact: '微信 coffee_3f', status: C.STATUS.DONE, views: 11, closedAfterMs: 3 * HOUR },

      { mine: false, type: C.TYPE.LOST,  name: '灰色运动水壶', category: '运动器材', place: '校道',
        lostTime: '10月5日 上午', agoMs: 100 * HOUR, lostBeforeMs: 5 * HOUR,
        description: '磨砂灰的 750ml 运动水壶，瓶身印着学校的标志，跑校园跑的时候放在路边台阶上忘了拿。',
        contact: '手机 136-0000-3456', status: C.STATUS.OPEN, views: 16 },

      { mine: true,  type: C.TYPE.LOST,  name: '牛津高阶词典', category: '书籍资料', place: '图书馆',
        lostTime: '10月4日 下午', agoMs: 5 * DAY, lostBeforeMs: 2 * HOUR,
        description: '很厚的一本，书脊上贴了透明胶带，扉页有我的名字，应该是留在二楼自习桌上了。',
        contact: '微信 dict_mine', status: C.STATUS.OPEN, views: 21 },

      { mine: false, type: C.TYPE.FOUND, name: '宿舍门禁卡', category: '钥匙门禁', place: '宿舍楼',
        lostTime: '9月20日 下午', agoMs: 19 * DAY, lostBeforeMs: 4 * HOUR,
        description: '白色的门禁卡，背面写了个楼号，挂失的同学已经补办新卡了，这张就留在我这儿当纪念。',
        contact: '微信 dorm_card', status: C.STATUS.DONE, views: 44, closedAfterMs: 48 * HOUR },

      { mine: false, type: C.TYPE.LOST,  name: '蓝牙音箱', category: '电子产品', place: '校车站',
        lostTime: '9月15日 晚上', agoMs: 24 * DAY, lostBeforeMs: 6 * HOUR,
        description: '巴掌大的圆柱形小音箱，深灰色，底部有一圈软胶，等末班车时放在候车亭座椅上忘了带走。',
        contact: 'QQ 2233445', status: C.STATUS.OPEN, views: 25 }
    ];

    return raw.map(function (r, index) {
      const createdAt = now - r.agoMs;
      const lostAt = createdAt - (r.lostBeforeMs || 0);
      const isDone = r.status === C.STATUS.DONE;
      const closedAt = isDone ? createdAt + (r.closedAfterMs || HOUR) : null;

      return {
        id: 'seed-' + (index + 1) + '-' + (1000 + index),
        ownerId: r.mine ? me : OTHER_OWNER_ID,
        type: r.type,
        name: r.name,
        category: r.category,
        place: r.place,
        lostTime: r.lostTime,
        lostAt: lostAt,              // 排序用时间戳；lostTime 是对外展示的自由文本
        description: r.description,
        contact: r.contact,
        status: r.status,
        views: r.views,
        createdAt: createdAt,
        updatedAt: closedAt || createdAt,
        closedAt: closedAt
      };
    });
  }

  const Seed = Object.freeze({
    OTHER_OWNER_ID: OTHER_OWNER_ID,
    samples: samples
  });

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Seed;          // Node / Mocha
  } else {
    root.Seed = Seed;               // 浏览器 window.Seed
  }
})(typeof window !== 'undefined' ? window : globalThis);
