/**
 * js/app.js —— 页面层：渲染 + 事件绑定
 * 只调用逻辑层（ItemStore / Validate / Search / Constant / Status / Reward），不直接碰 localStorage
 */
(function () {
  'use strict';

  /* ============ 全局状态 ============ */
  const state = {
    view: 'home',
    homeTab: Constant.FILTER_ALL,        // 全部 / lost / found
    filterCategory: Constant.FILTER_ALL,
    filterPlace: Constant.FILTER_ALL,
    filterStatus: Constant.FILTER_ALL,
    sort: Constant.DEFAULT_SORT,
    postType: Constant.TYPE.LOST,
    keyword: '',
    currentDetailId: null,
    lastPostedId: null,
    contactRevealed: false,
    tipAmount: 0                         // 打赏弹层当前选中的金额（元）
  };

  /* ============ 工具函数 ============ */
  function $(sel) { return document.querySelector(sel); }
  function el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  }
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => t.classList.remove('show'), 1800);
  }
  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
  function fmtTime(ts) {
    if (!ts) return '';
    const diff = Date.now() - ts;
    const m = Math.floor(diff / 60000);
    if (m < 1) return Constant.TEXT.timeJustNow;
    if (m < 60) return Constant.TEXT.timeMinutesAgo.replace('{n}', m);
    const h = Math.floor(m / 60);
    if (h < 24) return Constant.TEXT.timeHoursAgo.replace('{n}', h);
    const d = Math.floor(h / 24);
    if (d < 30) return Constant.TEXT.timeDaysAgo.replace('{n}', d);
    return Constant.TEXT.timeStale;
  }

  /* ============ 视图路由 ============ */
  window.go = function (view) {
    state.view = view;
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    $('#view-' + view).classList.add('active');

    document.querySelectorAll('.tabbar-item').forEach(t => t.classList.remove('on'));
    if (view === 'home') $('.tabbar-item[data-view="home"]').classList.add('on');
    if (view === 'mine') $('.tabbar-item[data-view="mine"]').classList.add('on');

    if (view === 'home') renderHome();
    if (view === 'post') renderPost();
    if (view === 'search') renderSearch();
    if (view === 'detail') renderDetail();
    if (view === 'mine') renderMine();
  };

  /* ============ 首页 ============ */
  function renderHome() {
    // tabs
    const tabsBox = $('#home-tabs');
    tabsBox.innerHTML = '';
    Constant.TYPE_TABS.forEach(t => {
      const d = el('div', 'type-tab' + (state.homeTab === t.value ? ' on' : ''), t.label);
      d.onclick = () => { state.homeTab = t.value; renderHome(); };
      tabsBox.appendChild(d);
    });

    // 筛选下拉
    fillSelect($('#filter-category'), [Constant.FILTER_ALL, ...Constant.CATEGORY], '全部分类');
    fillSelect($('#filter-place'), [Constant.FILTER_ALL, ...Constant.PLACE], '全部地点');
    fillSelect($('#filter-status'), Constant.STATUS_FILTER_OPTIONS.map(o => o.value), '全部状态',
      Constant.STATUS_FILTER_OPTIONS.map(o => o.label));
    $('#filter-category').onchange = e => { state.filterCategory = e.target.value; renderHome(); };
    $('#filter-place').onchange = e => { state.filterPlace = e.target.value; renderHome(); };
    $('#filter-status').onchange = e => { state.filterStatus = e.target.value; renderHome(); };
    $('#filter-category').value = state.filterCategory;
    $('#filter-place').value = state.filterPlace;
    $('#filter-status').value = state.filterStatus;

    // 排序
    const sortBar = $('#sort-bar');
    sortBar.innerHTML = '';
    Constant.SORT_OPTIONS.forEach(o => {
      const s = el('span', 'sort-item' + (state.sort === o.value ? ' on' : ''), o.label);
      s.onclick = () => { state.sort = o.value; renderHome(); };
      sortBar.appendChild(s);
    });

    // 统计
    const all = ItemStore.getAll();
    const lostCount = all.filter(i => i.type === Constant.TYPE.LOST).length;
    const foundCount = all.filter(i => i.type === Constant.TYPE.FOUND).length;
    const doneCount = all.filter(i => i.status === Constant.STATUS.DONE).length;
    const doneRate = all.length ? Math.round(doneCount / all.length * 100) + '%' : '0%';
    $('#stat-strip').innerHTML =
      '<div><b>' + all.length + '</b>' + Constant.TEXT.statLabel.total + '</div>' +
      '<div><b>' + lostCount + '</b>' + Constant.TEXT.statLabel.lost + '</div>' +
      '<div><b>' + foundCount + '</b>' + Constant.TEXT.statLabel.found + '</div>' +
      '<div><b>' + doneRate + '</b>' + Constant.TEXT.statLabel.doneRate + '</div>';

    // 列表
    const items = Search.filterItems(all, {
      type: state.homeTab,
      category: state.filterCategory,
      place: state.filterPlace,
      status: state.filterStatus,
      sort: state.sort
    });
    renderCardList($('#home-list'), items);
    $('#home-empty').classList.toggle('hidden', items.length > 0);
  }

  function fillSelect(sel, values, allLabel, labels) {
    sel.innerHTML = '';
    values.forEach((v, i) => {
      const opt = document.createElement('option');
      opt.value = v;
      opt.textContent = (v === Constant.FILTER_ALL) ? allLabel : (labels ? labels[i] : v);
      sel.appendChild(opt);
    });
  }

  function renderCardList(container, items, isMineList) {
    container.innerHTML = '';
    items.forEach(item => {
      const card = el('div', 'card-wrap');
      const typeCls = item.type === Constant.TYPE.LOST ? 'badge-lost' : 'badge-found';
      const typeLabel = item.type === Constant.TYPE.LOST ? '寻物' : '招领';
      const doneTag = item.status === Constant.STATUS.DONE ? '<span class="card-badge badge-done">已完结</span>' : '';
      // 悬赏徽章：只有寻物帖且金额 > 0 才出现
      const rewardTag = (item.type === Constant.TYPE.LOST && item.rewardAmount > 0)
        ? '<span class="card-badge badge-reward">'
            + Constant.TEXT.rewardBadge.replace('{amount}', item.rewardAmount) + '</span>'
        : '';
      // 打赏次数徽章：招领帖收到过打赏才出现
      const tipCount = Reward.getTipTotal(item).count;
      const tipTag = tipCount > 0
        ? '<span class="card-badge badge-tip">💝 ' + tipCount + ' 次打赏</span>'
        : '';
      card.innerHTML =
        '<div class="card">' +
          '<div class="card-thumb">' + Constant.getCategoryIcon(item.category) + '</div>' +
          '<div class="card-body">' +
            '<div class="card-title">' + escapeHtml(item.name) +
              '<span class="card-badge ' + typeCls + '" style="position:static;margin-left:6px">' + typeLabel + '</span>' +
              doneTag + rewardTag + tipTag +
            '</div>' +
            '<div class="card-meta">📍 ' + escapeHtml(item.place) + ' · ' + escapeHtml(item.lostTime || '') + '<br>🕐 ' + fmtTime(item.createdAt) + ' · 👁 ' + (item.views || 0) + '</div>' +
            (isMineList
              ? '<div class="card-actions">' +
                  (item.status === Constant.STATUS.OPEN
                    ? '<button class="btn-close" data-act="close" data-id="' + item.id + '">' + (item.type === Constant.TYPE.LOST ? Constant.ACTION_LABEL.lost : Constant.ACTION_LABEL.found) + '</button>'
                    : '<button data-act="revoke" data-id="' + item.id + '">' + Constant.REVOKE_LABEL + '</button>') +
                  '<button class="btn-del" data-act="del" data-id="' + item.id + '">' + Constant.DELETE_LABEL + '</button>' +
                '</div>'
              : '') +
          '</div>' +
        '</div>';
      card.onclick = function (e) {
        if (e.target.tagName === 'BUTTON') return;
        openDetail(item.id);
      };
      // 我的发布卡片上的按钮事件
      if (isMineList) {
        const closeBtn = card.querySelector('[data-act="close"]');
        if (closeBtn) closeBtn.onclick = function () {
          ItemStore.update(item.id, { status: Constant.STATUS.DONE });
          toast(Constant.TEXT.toastUpdated);
          renderMine();
        };
        const revokeBtn = card.querySelector('[data-act="revoke"]');
        if (revokeBtn) revokeBtn.onclick = function () {
          ItemStore.update(item.id, { status: Constant.STATUS.OPEN });
          toast(Constant.TEXT.toastUpdated);
          renderMine();
        };
        const delBtn = card.querySelector('[data-act="del"]');
        if (delBtn) delBtn.onclick = function () {
          if (confirm(Constant.TEXT.confirmDelete)) {
            ItemStore.remove(item.id);
            toast(Constant.TEXT.toastDeleted);
            renderMine();
          }
        };
      }
      container.appendChild(card);
    });
  }

  /* ============ 发布页 ============ */
  function renderPost() {
    // 类型切换
    const sw = $('#post-type-switch');
    sw.innerHTML = '';
    Constant.POST_TABS.forEach(t => {
      const d = el('div', 'post-type-opt' + (state.postType === t.value ? ' on' : ''),
        t.title + '<span class="sub">' + t.sub + '</span>');
      d.onclick = () => { state.postType = t.value; renderPost(); };
      sw.appendChild(d);
    });

    // 文案随类型切换
    const tab = Constant.getPostTab(state.postType);
    $('#label-place').innerHTML = tab.placeLabel + ' <span class="req">*</span>';
    $('#label-time').innerHTML = tab.timeLabel + ' <span class="req">*</span>';
    $('#f-name').placeholder = tab.namePlaceholder;
    $('#f-desc').placeholder = tab.descPlaceholder;
    $('#f-time').placeholder = tab.timePlaceholder;

    // 悬赏只对「我丢了东西」有意义；切到招领时整块藏起来
    const isLost = state.postType === Constant.TYPE.LOST;
    $('#field-reward').classList.toggle('hidden', !isLost);
    if (!isLost) $('#err-reward').textContent = '';

    // 分类 chip
    const catBox = $('#f-category');
    catBox.innerHTML = '';
    Constant.CATEGORY.forEach(c => {
      const chip = el('span', 'chip', Constant.getCategoryIcon(c) + ' ' + c);
      chip.onclick = () => {
        catBox.querySelectorAll('.chip').forEach(x => x.classList.remove('on'));
        chip.classList.add('on');
        chip.dataset.val = c;
        $('#err-category').textContent = '';
      };
      catBox.appendChild(chip);
    });

    // 地点 chip
    const placeBox = $('#f-place');
    placeBox.innerHTML = '';
    Constant.PLACE.forEach(p => {
      const chip = el('span', 'chip', p);
      chip.onclick = () => {
        placeBox.querySelectorAll('.chip').forEach(x => x.classList.remove('on'));
        chip.classList.add('on');
        chip.dataset.val = p;
        $('#err-place').textContent = '';
      };
      placeBox.appendChild(chip);
    });

    // 描述字数
    $('#f-desc').oninput = () => { $('#desc-count').textContent = $('#f-desc').value.length; };

    // 重新输入时立刻清掉该项的红色错误态：否则校验失败后改好了还一直红着，要再点一次发布才刷新
    [['#f-name', '#err-name'], ['#f-time', '#err-time'], ['#f-contact', '#err-contact'],
     ['#f-reward', '#err-reward']]
      .forEach(([inputSel, errSel]) => {
        const input = $(inputSel);
        input.oninput = function () {
          if (input.classList.contains('err')) {
            input.classList.remove('err');
            $(errSel).textContent = '';
          }
        };
      });
  }

  function getSelectedChip(boxSel) {
    const on = document.querySelector(boxSel + ' .chip.on');
    return on ? on.dataset.val : '';
  }

  function setChipError(boxSel, errSel, msg) {
    if (msg) {
      $(boxSel).style.borderColor = 'var(--lost)';
      $(errSel).textContent = msg;
    } else {
      $(boxSel).style.borderColor = '';
      $(errSel).textContent = '';
    }
  }

  $('#post-form').addEventListener('submit', function (e) {
    e.preventDefault();
    const rewardRaw = $('#f-reward').value.trim();
    const data = {
      type: state.postType,
      name: $('#f-name').value.trim(),
      category: getSelectedChip('#f-category'),
      place: getSelectedChip('#f-place'),
      lostTime: $('#f-time').value.trim(),
      description: $('#f-desc').value.trim(),
      contact: $('#f-contact').value.trim(),
      // 悬赏只有寻物帖才带；留空 = 不设悬赏
      rewardAmount: (state.postType === Constant.TYPE.LOST && rewardRaw !== '')
        ? Number(rewardRaw) : 0
    };

    const result = Validate.validateItem(data);
    // 标红
    $('#err-name').textContent = result.errors.name || '';
    $('#f-name').classList.toggle('err', !!result.errors.name);
    setChipError('#f-category', '#err-category', result.errors.category);
    setChipError('#f-place', '#err-place', result.errors.place);
    $('#err-time').textContent = result.errors.lostTime || '';
    $('#f-time').classList.toggle('err', !!result.errors.lostTime);
    $('#err-contact').textContent = result.errors.contact || '';
    $('#f-contact').classList.toggle('err', !!result.errors.contact);
    $('#err-reward').textContent = result.errors.rewardAmount || '';
    $('#f-reward').classList.toggle('err', !!result.errors.rewardAmount);

    if (!result.valid) { toast('请检查表单'); return; }

    // lostAt 时间戳（用当前时间近似，因为时间是自由文本）
    data.lostAt = Date.now();
    const saved = ItemStore.save(data);
    state.lastPostedId = saved.id;

    // 相似物品提示：如果是寻物，看看有没有同类招领
    if (data.type === Constant.TYPE.LOST) {
      const similar = Search.filterItems(ItemStore.getAll(), {
        type: Constant.TYPE.FOUND, category: data.category
      });
      if (similar.length > 0) {
        toast(Constant.TEXT.similarTip.replace('{n}', similar.length));
      }
    }

    // 清空表单
    $('#post-form').reset();
    $('#desc-count').textContent = '0';
    document.querySelectorAll('#f-category .chip.on, #f-place .chip.on')
      .forEach(c => c.classList.remove('on'));

    go('success');
  });

  $('#btn-view-detail').onclick = function () {
    if (state.lastPostedId) openDetail(state.lastPostedId);
  };

  /* ============ 搜索页 ============ */
  function renderSearch() {
    // 热门词
    const hotBox = $('#hot-chips');
    hotBox.innerHTML = '';
    Constant.HOT_WORDS.forEach(w => {
      const c = el('span', '', w);
      c.onclick = () => { $('#search-input').value = w; doSearch(); };
      hotBox.appendChild(c);
    });
    $('#search-input').value = state.keyword;
    doSearch();
  }

  function doSearch() {
    state.keyword = $('#search-input').value.trim();
    const items = Search.filterItems(ItemStore.getAll(), { keyword: state.keyword });
    $('#result-tip').textContent = state.keyword
      ? Constant.TEXT.searchResultTip.replace('{n}', items.length) : '';
    renderCardList($('#search-list'), items);
    $('#search-empty').classList.toggle('hidden', items.length > 0 || !state.keyword);
  }

  $('#search-go').onclick = doSearch;
  $('#search-input').addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(); });

  /* ============ 详情页 ============ */
  function openDetail(id) {
    state.currentDetailId = id;
    state.contactRevealed = false;
    // 浏览量只在这里 +1：放进 renderDetail() 的话，任何一次重渲染
    //（查看联系方式、打赏、标记完结）都会再算一次，数字会虚高
    const item = ItemStore.getById(id);
    if (item) ItemStore.update(id, { views: (item.views || 0) + 1 });
    go('detail');
  }

  function renderDetail() {
    const item = ItemStore.getById(state.currentDetailId);
    const body = $('#detail-body');
    if (!item) {
      body.innerHTML = '<div class="empty-state"><div class="empty-icon">😕</div><div class="empty-title">这条信息不存在或已被删除</div></div>';
      return;
    }

    const isMine = ItemStore.isOwner(item);
    const typeLabel = item.type === Constant.TYPE.LOST ? '寻物' : '招领';
    const done = item.status === Constant.STATUS.DONE;
    const doneText = item.type === Constant.TYPE.LOST ? '已找到' : '已归还';

    // 悬赏行：只有寻物帖且金额 > 0 才出现
    const rewardHtml = Reward.summarizeReward(item).hasReward
      ? '<div class="detail-reward">'
          + Constant.TEXT.rewardDetail.replace('{amount}', item.rewardAmount) + '</div>'
      : '';

    let contactHtml;
    if (state.contactRevealed) {
      contactHtml =
        '<div style="text-align:center;font-size:16px;margin:8px 0">' + escapeHtml(item.contact) + '</div>' +
        '<button class="btn-outline" style="width:100%" onclick="copyContact(\'' + escapeHtml(item.contact) + '\')">' + Constant.TEXT.contactCopy + '</button>';
    } else {
      contactHtml =
        '<div class="detail-contact-masked">' + Constant.TEXT.contactMasked + '</div>' +
        '<button class="btn-outline" style="width:100%" onclick="revealContact()">' + Constant.TEXT.contactReveal + '</button>';
    }

    let actionHtml = '';
    if (isMine) {
      if (done) {
        actionHtml = '<button class="btn-outline" onclick="revokeClose()">撤销完结</button>';
      } else {
        const label = item.type === Constant.TYPE.LOST ? Constant.ACTION_LABEL.lost : Constant.ACTION_LABEL.found;
        actionHtml = '<button class="btn-solid" onclick="markClose(\'' + label + '\')">' + label + '</button>';
      }
      actionHtml += '<button class="btn-danger" onclick="removeItem()">删除</button>';
    }

    body.innerHTML =
      '<div class="detail-hero">' + Constant.getCategoryIcon(item.category) +
        '<span class="detail-type-tag">' + typeLabel + (done ? ' · ' + doneText : '') + '</span>' +
      '</div>' +
      '<div class="detail-title">' + escapeHtml(item.name) + '</div>' +
      '<div class="detail-meta">' +
        '📍 ' + escapeHtml(item.place) + '<br>' +
        '⏰ ' + escapeHtml(item.lostTime || '') + '<br>' +
        '🕐 ' + fmtTime(item.createdAt) + '<br>' +
        '👁 浏览 ' + (item.views || 0) +
      '</div>' +
      rewardHtml +
      '<div class="detail-desc">' + (escapeHtml(item.description) || '这个人很懒，什么都没写…') + '</div>' +
      '<div class="detail-publisher">' +
        '<div class="detail-avatar">' + (isMine ? '我' : 'TA') + '</div>' +
        '<div><div style="font-size:14px;font-weight:500">' + (isMine ? '我' : '热心同学') + '</div>' +
        '<div style="font-size:11px;color:var(--text-3)">' + (done ? doneText : '进行中') + '</div></div>' +
      '</div>' +
      '<div class="detail-contact-box">' +
        '<div style="font-size:12px;color:var(--text-3);margin-bottom:4px">联系方式</div>' +
        contactHtml +
      '</div>' +
      tipBlockHtml(item, isMine) +
      '<div class="detail-actions">' + actionHtml + '</div>';
  }

  /* ============ 打赏区块（招领帖专属） ============ */
  function tipBlockHtml(item, isMine) {
    if (item.type !== Constant.TYPE.FOUND) return '';   // 寻物帖走「悬赏」那条线

    const s = Reward.summarizeReward(item);
    const records = Reward.getTipList(item).slice().reverse();  // 最新的排最上

    const wall = s.tipCount > 0
      ? '<div class="tip-wall">' +
          '<div class="tip-wall-head">' + Constant.TEXT.tipWallTitle +
            '<span class="tip-wall-sum">' +
              Constant.TEXT.tipSummary.replace('{n}', s.tipCount).replace('{amount}', s.tipTotal) +
            '</span>' +
          '</div>' +
          records.map(function (t) {
            return '<div class="tip-item">' +
              '<span class="tip-amt">¥' + t.amount + '</span>' +
              '<span class="tip-note">' + escapeHtml(t.note || Constant.TEXT.tipRecordNote) + '</span>' +
              '<span class="tip-at">' + fmtTime(t.at) + '</span>' +
            '</div>';
          }).join('') +
        '</div>'
      : '<div class="tip-wall tip-wall-empty">' + Constant.TEXT.tipWallEmpty +
          '<div class="tip-wall-sub">' + Constant.TEXT.tipWallEmptySub + '</div>' +
        '</div>';

    const btn = isMine
      ? ''
      : '<button class="btn-reward" type="button" onclick="openTipPanel()">'
          + Constant.TEXT.tipButton + '</button>';

    return '<div class="detail-tip-box">' + btn + wall +
      '<div class="tip-demo-note">' + Constant.TEXT.tipDemoNote + '</div>' +
    '</div>';
  }

  window.revealContact = function () {
    state.contactRevealed = true;
    renderDetail();
  };
  
  window.copyContact = function (text) {
    const ok = function () { toast(Constant.TEXT.copySuccess); };
    const legacyCopy = function () {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); ok(); } catch (e) { toast(Constant.TEXT.copyFail); }
      document.body.removeChild(ta);
    };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(ok).catch(legacyCopy);
    } else {
      legacyCopy();
    }
  };


  window.markClose = function (label) {
    if (confirm(Constant.TEXT.confirmClose.replace('{label}', label))) {
      ItemStore.update(state.currentDetailId, { status: Constant.STATUS.DONE });
      toast(Constant.TEXT.toastUpdated);
      renderDetail();
    }
  };
  window.revokeClose = function () {
    ItemStore.update(state.currentDetailId, { status: Constant.STATUS.OPEN });
    toast(Constant.TEXT.toastUpdated);
    renderDetail();
  };
  window.removeItem = function () {
    if (confirm(Constant.TEXT.confirmDelete)) {
      ItemStore.remove(state.currentDetailId);
      toast(Constant.TEXT.toastDeleted);
      go('mine');
    }
  };

  /* ============ 打赏弹层 ============ */
  function renderTipAmounts() {
    const box = $('#tip-amounts');
    box.innerHTML = '';
    Constant.TIP_AMOUNTS.forEach(n => {
      const d = el('div', 'tip-amt-opt' + (state.tipAmount === n ? ' on' : ''), '¥' + n);
      d.onclick = function () {
        state.tipAmount = n;
        $('#tip-custom').value = '';          // 选档位就丢掉自定义值，避免两个来源打架
        $('#tip-err').textContent = '';
        renderTipAmounts();
      };
      box.appendChild(d);
    });
  }

  window.openTipPanel = function () {
    const item = ItemStore.getById(state.currentDetailId);
    if (!Reward.canTip(item, ItemStore.isOwner(item))) return;   // 双保险：手改 DOM 也打不了赏

    state.tipAmount = Constant.TIP_AMOUNTS[0];   // 默认落在第一档
    $('#tip-custom').value = '';
    $('#tip-note').value = '';
    $('#tip-err').textContent = '';
    renderTipAmounts();
    $('#tip-mask').classList.remove('hidden');
  };

  window.closeTipPanel = function () {
    $('#tip-mask').classList.add('hidden');
  };

  // 自定义金额：一输入就重画档位，非档位值时自然全不高亮
  $('#tip-custom').oninput = function () {
    const v = $('#tip-custom').value.trim();
    state.tipAmount = (v === '') ? Constant.TIP_AMOUNTS[0] : Number(v);
    $('#tip-err').textContent = '';
    renderTipAmounts();
  };

  $('#tip-confirm').onclick = function () {
    if (!Constant.isValidAmount(state.tipAmount)) {
      $('#tip-err').textContent = Constant.TEXT.errTipAmount
        .replace('{min}', Constant.AMOUNT_LIMIT.min)
        .replace('{max}', Constant.AMOUNT_LIMIT.max);
      return;
    }

    const tip = Reward.makeTip(state.tipAmount, $('#tip-note').value);
    const saved = ItemStore.addTip(state.currentDetailId, tip);
    if (!saved) { toast(Constant.TEXT.toastNotFound); return; }

    closeTipPanel();
    toast(Constant.TEXT.tipSuccess);
    renderDetail();
  };

  /* ============ 我的发布 ============ */
  function renderMine() {
    const mine = ItemStore.getAll().filter(i => ItemStore.isOwner(i));
    const openCount = mine.filter(i => i.status === Constant.STATUS.OPEN).length;
    // 我发布的信息累计收到的打赏金额（招领帖才有；寻物帖恒为 0，不影响求和）
    const tipSum = mine.reduce((sum, it) => sum + Reward.summarizeReward(it).tipTotal, 0);
    $('#mine-stats').innerHTML =
      '<div><b>' + mine.length + '</b><span>全部发布</span></div>' +
      '<div><b>' + openCount + '</b><span>进行中</span></div>' +
      '<div><b>' + (mine.length - openCount) + '</b><span>已完结</span></div>' +
      '<div><b>' + tipSum + '</b><span>收获打赏</span></div>';
    renderCardList($('#mine-list'), mine, true);
    $('#mine-empty').classList.toggle('hidden', mine.length > 0);
  }
  // 启动时默认进入首页
  /* ============ 启动 ============ */
 
  go('home');
})();
