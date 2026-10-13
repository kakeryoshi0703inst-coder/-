/**
 * 最後にいつやった？ (Personal Last-Done Tracker - Ver.4 Ultimate)
 * Main Application Controller (Mobile-First + Calendar View)
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Initialize Database (Zero automatic seed data as requested)
  await window.lifeLogDB.init();

  // Application State
  const state = {
    categories: [],
    items: [],
    allHistories: [],
    currentView: 'list', // 'list' | 'calendar'
    selectedCategory: 'all', // 'all' | 'attention' | catId
    searchQuery: '',
    sortOrder: 'priority', // 'priority' | 'recent' | 'oldest' | 'name'
    activeItemId: null,
    editingIntervalPreset: 7,
    editingCategory: 'cat_clean',
    calDate: new Date(),
    calSelectedDate: new Date()
  };

  // Cached DOM Elements
  const DOM = {
    // Header & Summary
    statBadgeAlert: document.getElementById('statBadgeAlert'),
    statAlertCount: document.getElementById('statAlertCount'),
    statTotalCount: document.getElementById('statTotalCount'),
    btnOpenSettings: document.getElementById('btnOpenSettings'),
    searchInput: document.getElementById('searchInput'),
    btnSearchClear: document.getElementById('btnSearchClear'),
    sortSelect: document.getElementById('sortSelect'),
    categoryFilterChips: document.getElementById('categoryFilterChips'),

    // View Switcher Tabs
    tabViewList: document.getElementById('tabViewList'),
    tabViewCalendar: document.getElementById('tabViewCalendar'),
    subviewList: document.getElementById('subviewList'),
    subviewCalendar: document.getElementById('subviewCalendar'),

    // Main List & FAB
    itemsListContainer: document.getElementById('itemsListContainer'),
    btnAddNewItem: document.getElementById('btnAddNewItem'),

    // Calendar Subview Elements
    calPrevMonth: document.getElementById('calPrevMonth'),
    calNextMonth: document.getElementById('calNextMonth'),
    calTodayBtn: document.getElementById('calTodayBtn'),
    calMonthTitle: document.getElementById('calMonthTitle'),
    calendarDaysGrid: document.getElementById('calendarDaysGrid'),
    calSelectedDateTitle: document.getElementById('calSelectedDateTitle'),
    calSelectedCountBadge: document.getElementById('calSelectedCountBadge'),
    calDueDaySection: document.getElementById('calDueDaySection'),
    calDueCountBadge: document.getElementById('calDueCountBadge'),
    calDueItemsList: document.getElementById('calDueItemsList'),
    calDoneDaySection: document.getElementById('calDoneDaySection'),
    calDoneCountBadge: document.getElementById('calDoneCountBadge'),
    calDayItemsList: document.getElementById('calDayItemsList'),
    calMonthSummaryCard: document.getElementById('calMonthSummaryCard'),
    btnCalAddDoneForDate: document.getElementById('btnCalAddDoneForDate'),
    calItemPickerModal: document.getElementById('calItemPickerModal'),
    btnCloseCalPickerModal: document.getElementById('btnCloseCalPickerModal'),
    calPickerTitle: document.getElementById('calPickerTitle'),
    calPickerItemsGrid: document.getElementById('calPickerItemsGrid'),

    // Detail Bottom Sheet
    itemDetailModal: document.getElementById('itemDetailModal'),
    btnCloseDetailModal: document.getElementById('btnCloseDetailModal'),
    detailCatBadge: document.getElementById('detailCatBadge'),
    detailItemTitle: document.getElementById('detailItemTitle'),
    detailElapsedText: document.getElementById('detailElapsedText'),
    detailStatusPill: document.getElementById('detailStatusPill'),
    detailLastDoneDateStr: document.getElementById('detailLastDoneDateStr'),
    detailIntervalInfo: document.getElementById('detailIntervalInfo'),
    detailNextDueBadge: document.getElementById('detailNextDueBadge'),
    detailNextDueDateStr: document.getElementById('detailNextDueDateStr'),
    quickNextDueDateInput: document.getElementById('quickNextDueDateInput'),
    btnQuickSaveNextDue: document.getElementById('btnQuickSaveNextDue'),
    btnQuickClearNextDue: document.getElementById('btnQuickClearNextDue'),
    recordDoneDateInput: document.getElementById('recordDoneDateInput'),
    recordDoneNoteInput: document.getElementById('recordDoneNoteInput'),
    btnSubmitRecordDone: document.getElementById('btnSubmitRecordDone'),
    detailHistoryCount: document.getElementById('detailHistoryCount'),
    detailHistoryList: document.getElementById('detailHistoryList'),
    btnEditCurrentItem: document.getElementById('btnEditCurrentItem'),
    btnDeleteCurrentItem: document.getElementById('btnDeleteCurrentItem'),

    // Create / Edit Modal
    itemEditModal: document.getElementById('itemEditModal'),
    btnCloseEditModal: document.getElementById('btnCloseEditModal'),
    btnCancelEditItem: document.getElementById('btnCancelEditItem'),
    editModalTitle: document.getElementById('editModalTitle'),
    itemEditForm: document.getElementById('itemEditForm'),
    editItemId: document.getElementById('editItemId'),
    editTitleInput: document.getElementById('editTitleInput'),
    editCategoryRadioGrid: document.getElementById('editCategoryRadioGrid'),
    intervalPresetChips: document.getElementById('intervalPresetChips'),
    editCustomIntervalInput: document.getElementById('editCustomIntervalInput'),
    initialDoneGroup: document.getElementById('initialDoneGroup'),
    editInitialDoneDate: document.getElementById('editInitialDoneDate'),
    editNextDueGroup: document.getElementById('editNextDueGroup'),
    editNextDueDate: document.getElementById('editNextDueDate'),
    btnClearNextDueDate: document.getElementById('btnClearNextDueDate'),
    btnAutoCalcNextDue: document.getElementById('btnAutoCalcNextDue'),
    editNextDueQuickChips: document.getElementById('editNextDueQuickChips'),
    editNotesInput: document.getElementById('editNotesInput'),

    // Settings Modal
    settingsModal: document.getElementById('settingsModal'),
    btnCloseSettingsModal: document.getElementById('btnCloseSettingsModal'),
    btnExportJson: document.getElementById('btnExportJson'),
    fileImportJson: document.getElementById('fileImportJson'),
    btnClearAllData: document.getElementById('btnClearAllData'),

    // Toast
    toastMessage: document.getElementById('toastMessage')
  };

  // --- Date & Time Formatting Helpers ---
  const toLocalIsoDateTime = (d = new Date()) => {
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const toYmdString = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const formatJapaneseDate = (isoStr) => {
    if (!isoStr) return '未実施';
    const d = new Date(isoStr);
    const days = ['日', '月', '火', '水', '木', '金', '土'];
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 (${days[d.getDay()]}) ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const formatTimeOnly = (isoStr) => {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const formatYmdToJapanese = (ymdStr) => {
    if (!ymdStr) return '';
    const parts = ymdStr.split('-');
    if (parts.length < 3) return ymdStr;
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const d = parseInt(parts[2], 10);
    const dateObj = new Date(y, m - 1, d);
    const days = ['日', '月', '火', '水', '木', '金', '土'];
    return `${y}年${m}月${d}日 (${days[dateObj.getDay()]})`;
  };

  const getEffectiveDueDate = (item) => {
    // 1. 手動で指定された目安日があれば最優先
    if (item.nextDueAt) {
      return item.nextDueAt;
    }
    // 2. 目標周期と前回実施日があれば自動計算
    if (item.intervalDays && item.lastDoneAt) {
      const d = new Date(item.lastDoneAt);
      const nextD = new Date(d.getFullYear(), d.getMonth(), d.getDate() + item.intervalDays);
      return toYmdString(nextD);
    }
    return null;
  };

  const calcItemStatus = (item) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // 経過日数の計算
    let elapsedDays = null;
    let elapsedText = '未実施';
    if (item.lastDoneAt) {
      const lastDone = new Date(item.lastDoneAt);
      const diffMs = now.getTime() - lastDone.getTime();
      elapsedDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
      if (elapsedDays === 0) {
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        elapsedText = diffHours <= 1 ? '今日 (さっき)' : `今日 (${diffHours}時間前)`;
      } else if (elapsedDays === 1) {
        elapsedText = '昨日';
      } else {
        elapsedText = `${elapsedDays}日前`;
      }
    }

    const effectiveDueDate = getEffectiveDueDate(item);

    // 目安日（手動指定または周期自動計算）がある場合
    if (effectiveDueDate) {
      const [ey, em, ed] = effectiveDueDate.split('-').map(Number);
      const targetDate = new Date(ey, em - 1, ed);
      const diffDays = Math.round((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays < 0) {
        const overdue = Math.abs(diffDays);
        return {
          code: 'danger',
          elapsedDays,
          elapsedText,
          statusLabel: `🔴 ${overdue}日超過`,
          isAttention: true,
          diffDays, // negative
          effectiveDueDate,
          isManualDue: Boolean(item.nextDueAt)
        };
      } else if (diffDays === 0) {
        return {
          code: 'warning',
          elapsedDays,
          elapsedText,
          statusLabel: '🟡 今日が目安',
          isAttention: true,
          diffDays: 0,
          effectiveDueDate,
          isManualDue: Boolean(item.nextDueAt)
        };
      } else if (diffDays <= 2 || (item.intervalDays && diffDays <= Math.max(1, Math.ceil(item.intervalDays * 0.2)))) {
        return {
          code: 'warning',
          elapsedDays,
          elapsedText,
          statusLabel: `🟡 あと${diffDays}日`,
          isAttention: true,
          diffDays,
          effectiveDueDate,
          isManualDue: Boolean(item.nextDueAt)
        };
      } else {
        return {
          code: 'good',
          elapsedDays,
          elapsedText,
          statusLabel: `🟢 あと${diffDays}日`,
          isAttention: false,
          diffDays,
          effectiveDueDate,
          isManualDue: Boolean(item.nextDueAt)
        };
      }
    }

    // 目安日がない場合
    if (!item.lastDoneAt) {
      return {
        code: 'neutral',
        elapsedDays: null,
        elapsedText: '未実施',
        statusLabel: '⚪ 未実施',
        isAttention: true,
        diffDays: 0,
        effectiveDueDate: null,
        isManualDue: false
      };
    }

    return {
      code: 'neutral',
      elapsedDays,
      elapsedText,
      statusLabel: `⚪ ${elapsedText}に実施`,
      isAttention: false,
      diffDays: 0,
      effectiveDueDate: null,
      isManualDue: false
    };
  };

  const showToast = (message) => {
    DOM.toastMessage.textContent = message;
    DOM.toastMessage.classList.add('show');
    setTimeout(() => {
      DOM.toastMessage.classList.remove('show');
    }, 2400);
  };

  const getCategory = (catId) => {
    return state.categories.find(c => c.id === catId) || state.categories[0] || {
      id: 'cat_clean', name: '掃除', icon: '🧹', color: '#689676', softColor: '#ECF4EE'
    };
  };

  // --- Initial Refresh & Data Load ---
  async function refreshData() {
    state.categories = await window.lifeLogDB.getCategories();
    state.items = await window.lifeLogDB.getAllItems();
    state.allHistories = await window.lifeLogDB.getAllHistories();

    renderHeaderCategoryChips();
    renderMainItemList();
    renderCalendarView();
  }

  // --- View Switcher: List vs Calendar ---
  function switchView(viewName) {
    state.currentView = viewName;
    const isList = viewName === 'list';

    DOM.tabViewList.classList.toggle('active', isList);
    DOM.tabViewList.setAttribute('aria-selected', String(isList));
    DOM.tabViewCalendar.classList.toggle('active', !isList);
    DOM.tabViewCalendar.setAttribute('aria-selected', String(!isList));

    DOM.subviewList.style.display = isList ? 'flex' : 'none';
    DOM.subviewCalendar.style.display = isList ? 'none' : 'flex';

    if (!isList) {
      renderCalendarView();
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  DOM.tabViewList.addEventListener('click', () => switchView('list'));
  DOM.tabViewCalendar.addEventListener('click', () => switchView('calendar'));

  // --- Header Category Chips ---
  function renderHeaderCategoryChips() {
    const staticBtns = DOM.categoryFilterChips.querySelectorAll('.cat-filter-btn[data-cat="all"], .cat-attention-btn');
    DOM.categoryFilterChips.innerHTML = '';
    staticBtns.forEach(b => DOM.categoryFilterChips.appendChild(b));

    state.categories.forEach(cat => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `cat-filter-btn ${state.selectedCategory === cat.id ? 'active' : ''}`;
      btn.setAttribute('data-cat', cat.id);
      btn.innerHTML = `${cat.icon} ${cat.name}`;
      btn.addEventListener('click', () => {
        setCategoryFilter(cat.id);
      });
      DOM.categoryFilterChips.appendChild(btn);
    });

    DOM.categoryFilterChips.querySelector('[data-cat="all"]').onclick = () => setCategoryFilter('all');
    DOM.categoryFilterChips.querySelector('[data-cat="attention"]').onclick = () => setCategoryFilter('attention');
  }

  function setCategoryFilter(catKey) {
    state.selectedCategory = catKey;
    DOM.categoryFilterChips.querySelectorAll('.cat-filter-btn').forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-cat') === catKey);
    });
    renderMainItemList();
  }

  // --- Main Item List Rendering ---
  function renderMainItemList() {
    let list = [...state.items];

    // Compute statuses
    const itemsWithStatus = list.map(item => ({
      item,
      status: calcItemStatus(item)
    }));

    // Update Header Summary Stats
    const attentionCount = itemsWithStatus.filter(x => x.status.isAttention).length;
    DOM.statTotalCount.textContent = state.items.length;
    if (attentionCount > 0) {
      DOM.statAlertCount.textContent = attentionCount;
      DOM.statBadgeAlert.style.display = 'inline-flex';
    } else {
      DOM.statBadgeAlert.style.display = 'none';
    }

    // Category Filter
    if (state.selectedCategory === 'attention') {
      list = itemsWithStatus.filter(x => x.status.isAttention);
    } else if (state.selectedCategory !== 'all') {
      list = itemsWithStatus.filter(x => x.item.categoryId === state.selectedCategory);
    } else {
      list = itemsWithStatus;
    }

    // Search Filter
    const q = state.searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(({ item }) => {
        const titleMatch = (item.title || '').toLowerCase().includes(q);
        const notesMatch = (item.notes || '').toLowerCase().includes(q);
        const cat = getCategory(item.categoryId);
        const catMatch = cat.name.toLowerCase().includes(q);
        return titleMatch || notesMatch || catMatch;
      });
    }

    // Sort Order
    list.sort((a, b) => {
      if (state.sortOrder === 'priority') {
        const score = (status) => {
          if (status.code === 'danger') return 1000 + Math.abs(status.diffDays);
          if (status.code === 'warning') return 500 - status.diffDays;
          if (status.code === 'neutral' && !status.elapsedDays) return 400; // never done
          if (status.code === 'neutral') return 200 + (status.elapsedDays || 0);
          return 100 - status.diffDays;
        };
        return score(b.status) - score(a.status);
      } else if (state.sortOrder === 'next_due') {
        const getDueTime = (x) => {
          if (!x.status.effectiveDueDate) return 9999999999999;
          return new Date(x.status.effectiveDueDate).getTime();
        };
        return getDueTime(a) - getDueTime(b);
      } else if (state.sortOrder === 'recent') {
        const timeA = a.item.lastDoneAt ? new Date(a.item.lastDoneAt).getTime() : 0;
        const timeB = b.item.lastDoneAt ? new Date(b.item.lastDoneAt).getTime() : 0;
        return timeB - timeA;
      } else if (state.sortOrder === 'oldest') {
        const timeA = a.item.lastDoneAt ? new Date(a.item.lastDoneAt).getTime() : 0;
        const timeB = b.item.lastDoneAt ? new Date(b.item.lastDoneAt).getTime() : 0;
        return timeA - timeB;
      } else if (state.sortOrder === 'name') {
        return (a.item.title || '').localeCompare(b.item.title || '', 'ja');
      }
      return 0;
    });

    // Render Container
    DOM.itemsListContainer.innerHTML = '';

    if (list.length === 0) {
      renderEmptyState();
      return;
    }

    list.forEach(({ item, status }) => {
      const card = createItemCard(item, status);
      DOM.itemsListContainer.appendChild(card);
    });
  }

  // --- Create Item Card Element (Thumb-Friendly) ---
  function createItemCard(item, status) {
    const card = document.createElement('div');
    card.className = `item-card status-${status.code}`;
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');

    const cat = getCategory(item.categoryId);
    const intervalText = item.intervalDays ? `目安: ${item.intervalDays}日ごと` : '周期なし';

    let nextDueHtml = '';
    if (status.effectiveDueDate) {
      const parts = status.effectiveDueDate.split('-');
      const dueShort = `${parseInt(parts[1], 10)}/${parseInt(parts[2], 10)}`;
      const prefix = status.isManualDue ? '📌' : '⏰';
      const cleanLabel = status.statusLabel.replace(/^[🔴🟡🟢⚪]\s*/, '');
      nextDueHtml = `
        <div class="item-card-next-due due-${status.code}">
          <span>${prefix} 次回目安: <strong>${dueShort}</strong> (${cleanLabel})</span>
        </div>
      `;
    }

    card.innerHTML = `
      <div class="item-card-header">
        <span class="item-cat-pill" style="background:${cat.softColor}; color:${cat.color};">
          ${cat.icon} ${cat.name}
        </span>
        <span class="item-status-badge ${status.code}">
          ${status.statusLabel}
        </span>
      </div>

      <div class="item-card-title">${escapeHtml(item.title)}</div>

      ${nextDueHtml}

      <div class="item-card-footer">
        <div class="last-done-time-info">
          <span>最後:</span>
          <span class="last-done-highlight">${status.elapsedText}</span>
        </div>
        <div class="item-interval-info">
          ${intervalText}
        </div>
      </div>
    `;

    // Tap to open Detail Sheet (Prevents accidental completion)
    const openAction = () => openItemDetail(item.id);
    card.addEventListener('click', openAction);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openAction();
      }
    });

    return card;
  }

  // --- Empty State with Starter Ideas ---
  function renderEmptyState() {
    const isSearchingOrFiltering = state.searchQuery || state.selectedCategory !== 'all';
    
    if (isSearchingOrFiltering) {
      DOM.itemsListContainer.innerHTML = `
        <div class="empty-state-mobile">
          <div class="empty-icon">🔍</div>
          <div class="empty-title">見つかりませんでした</div>
          <p class="empty-desc">条件に一致する項目はありません。フィルターを解除するか検索ワードを変更してください。</p>
        </div>
      `;
      return;
    }

    DOM.itemsListContainer.innerHTML = `
      <div class="empty-state-mobile">
        <div class="empty-icon">✨</div>
        <div class="empty-title">まだ項目がありません</div>
        <p class="empty-desc">
          下の<strong>「＋新しい項目を追加」</strong>から、掃除や買い物など定期的に行うことを登録してみましょう！
        </p>
        
        <div class="empty-suggestions">
          <span style="font-size:12px; font-weight:700; color:var(--text-sub); text-align:left;">💡 よくある登録例（タップして作成）:</span>
          <button type="button" class="suggestion-chip" data-title="お風呂掃除" data-cat="cat_clean" data-days="7">
            <span>🧹 お風呂掃除</span>
            <span style="color:var(--text-muted); font-size:11px;">1週間ごと →</span>
          </button>
          <button type="button" class="suggestion-chip" data-title="トイレットペーパー買い足し" data-cat="cat_shopping" data-days="14">
            <span>🛒 トイレットペーパー買い足し</span>
            <span style="color:var(--text-muted); font-size:11px;">2週間ごと →</span>
          </button>
          <button type="button" class="suggestion-chip" data-title="シーツ・枕カバーの洗濯" data-cat="cat_housework" data-days="7">
            <span>🧺 シーツ・枕カバーの洗濯</span>
            <span style="color:var(--text-muted); font-size:11px;">1週間ごと →</span>
          </button>
          <button type="button" class="suggestion-chip" data-title="歯ブラシ交換" data-cat="cat_health" data-days="30">
            <span>💅 歯ブラシ交換</span>
            <span style="color:var(--text-muted); font-size:11px;">1ヶ月ごと →</span>
          </button>
        </div>
      </div>
    `;

    DOM.itemsListContainer.querySelectorAll('.suggestion-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        openEditModal({
          title: btn.getAttribute('data-title'),
          categoryId: btn.getAttribute('data-cat'),
          intervalDays: parseInt(btn.getAttribute('data-days'), 10)
        });
      });
    });
  }

  // ==========================================================================
  // CALENDAR VIEW (カレンダー欄でいつ行ったかを一目で把握)
  // ==========================================================================
  function renderCalendarView() {
    const year = state.calDate.getFullYear();
    const month = state.calDate.getMonth();
    DOM.calMonthTitle.textContent = `${year}年 ${month + 1}月`;

    // Map completed activities by 'YYYY-MM-DD'
    const dateMap = {};
    (state.allHistories || []).forEach(h => {
      const item = state.items.find(i => i.id === h.itemId);
      if (!item) return;
      const dKey = toYmdString(new Date(h.doneAt));
      if (!dateMap[dKey]) dateMap[dKey] = [];
      dateMap[dKey].push({ item, doneAt: h.doneAt, note: h.note });
    });

    // Also include items with lastDoneAt if not yet in histories
    state.items.forEach(item => {
      if (item.lastDoneAt) {
        const dKey = toYmdString(new Date(item.lastDoneAt));
        if (!dateMap[dKey]) dateMap[dKey] = [];
        const exists = dateMap[dKey].some(x => x.item.id === item.id);
        if (!exists) {
          dateMap[dKey].push({ item, doneAt: item.lastDoneAt, note: '' });
        }
      }
    });

    // Map items due by 'YYYY-MM-DD'
    const dueMap = {};
    state.items.forEach(item => {
      const status = calcItemStatus(item);
      if (status.effectiveDueDate) {
        const dKey = status.effectiveDueDate;
        if (!dueMap[dKey]) dueMap[dKey] = [];
        dueMap[dKey].push({ item, status });
      }
    });

    // Ensure state.calSelectedDate is synchronized to the displayed month!
    syncSelectedDateToMonth(year, month, dateMap);

    // Generate Calendar Grid Days
    DOM.calendarDaysGrid.innerHTML = '';
    const firstDayOfWeek = new Date(year, month, 1).getDay();
    const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const todayStr = toYmdString(new Date());
    const selectedStr = toYmdString(state.calSelectedDate);

    // Prev month padding cells (clicking moves to prev month and selects date)
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const prevCellDate = new Date(year, month - 1, dayNum);
      const cell = document.createElement('div');
      cell.className = 'cal-day-cell other-month';
      cell.innerHTML = `<span class="cal-day-num">${dayNum}</span>`;
      cell.addEventListener('click', () => {
        state.calDate = new Date(year, month - 1, 1);
        state.calSelectedDate = prevCellDate;
        renderCalendarView();
      });
      DOM.calendarDaysGrid.appendChild(cell);
    }

    // Current month days
    for (let d = 1; d <= daysInCurrentMonth; d++) {
      const cellDate = new Date(year, month, d);
      const dKey = toYmdString(cellDate);
      const tasks = dateMap[dKey] || [];
      const dueItemsForDay = dueMap[dKey] || [];

      const cell = document.createElement('div');
      cell.className = 'cal-day-cell';
      if (dKey === todayStr) cell.classList.add('today');
      if (dKey === selectedStr) cell.classList.add('selected');

      let dotsHtml = '';
      if (tasks.length > 0) {
        dotsHtml = '<div class="cal-dots-container">' + 
          tasks.slice(0, 3).map(t => {
            const cat = getCategory(t.item.categoryId);
            return `<span class="cal-dot" style="background:${cat.color}"></span>`;
          }).join('') +
          '</div>';
      }

      const dueMarkHtml = dueItemsForDay.length > 0 ? `<span class="cal-due-mark" title="目安日 (${dueItemsForDay.length}件)"></span>` : '';

      cell.innerHTML = `
        <span class="cal-day-num">${d}</span>
        ${dueMarkHtml}
        ${dotsHtml}
      `;

      cell.addEventListener('click', () => {
        state.calSelectedDate = cellDate;
        renderCalendarView();
      });

      DOM.calendarDaysGrid.appendChild(cell);
    }

    // Next month padding cells
    const totalRendered = firstDayOfWeek + daysInCurrentMonth;
    const nextPadding = totalRendered % 7 === 0 ? 0 : 7 - (totalRendered % 7);
    for (let d = 1; d <= nextPadding; d++) {
      const nextCellDate = new Date(year, month + 1, d);
      const cell = document.createElement('div');
      cell.className = 'cal-day-cell other-month';
      cell.innerHTML = `<span class="cal-day-num">${d}</span>`;
      cell.addEventListener('click', () => {
        state.calDate = new Date(year, month + 1, 1);
        state.calSelectedDate = nextCellDate;
        renderCalendarView();
      });
      DOM.calendarDaysGrid.appendChild(cell);
    }

    // Render Selected Day Tasks List
    renderSelectedDayDetails(selectedStr, dateMap[selectedStr] || [], dueMap[selectedStr] || []);

    // Render Monthly Summary
    renderMonthSummary(year, month, dateMap);
  }

  function syncSelectedDateToMonth(year, month, dateMap) {
    if (!state.calSelectedDate || state.calSelectedDate.getFullYear() !== year || state.calSelectedDate.getMonth() !== month) {
      const today = new Date();
      if (today.getFullYear() === year && today.getMonth() === month) {
        state.calSelectedDate = new Date(today);
        return;
      }

      // Check if this month has any activity records
      const recordDates = [];
      Object.keys(dateMap).forEach(dKey => {
        const parts = dKey.split('-');
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        if (y === year && m === month && dateMap[dKey].length > 0) {
          recordDates.push(dKey);
        }
      });

      if (recordDates.length > 0) {
        // Select the latest day with records in this month!
        recordDates.sort();
        const latestKey = recordDates[recordDates.length - 1];
        const [ly, lm, ld] = latestKey.split('-').map(Number);
        state.calSelectedDate = new Date(ly, lm - 1, ld);
      } else {
        const maxDays = new Date(year, month + 1, 0).getDate();
        const prevDay = state.calSelectedDate ? state.calSelectedDate.getDate() : 1;
        state.calSelectedDate = new Date(year, month, Math.min(prevDay, maxDays));
      }
    }
  }

  function renderSelectedDayDetails(dateStr, tasks = [], dueItems = []) {
    const [y, m, day] = dateStr.split('-').map(Number);
    const d = new Date(y, m - 1, day);
    const days = ['日', '月', '火', '水', '木', '金', '土'];
    const titleText = `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 (${days[d.getDay()]})`;
    DOM.calSelectedDateTitle.textContent = titleText;
    DOM.calSelectedCountBadge.textContent = `目安: ${dueItems.length}件 / 実績: ${tasks.length}件`;

    // 1. Due Items Section (目安日)
    DOM.calDueCountBadge.textContent = `${dueItems.length}件`;
    if (dueItems.length === 0) {
      DOM.calDueItemsList.innerHTML = `
        <div style="font-size:12px; color:var(--text-muted); text-align:center; padding:10px 0;">この日が作業目安日の項目はありません。</div>
      `;
    } else {
      DOM.calDueItemsList.innerHTML = '';
      dueItems.forEach(({ item, status }) => {
        const cat = getCategory(item.categoryId);
        const card = document.createElement('div');
        card.className = 'cal-due-item-card';
        card.setAttribute('role', 'button');
        card.setAttribute('tabindex', '0');
        card.innerHTML = `
          <div class="cal-item-info">
            <div class="cal-item-title-row">
              <span class="item-cat-pill" style="background:${cat.softColor}; color:${cat.color};">
                ${cat.icon} ${cat.name}
              </span>
              <span class="cal-item-title">${escapeHtml(item.title)}</span>
            </div>
            <span style="font-size:11px; color:var(--text-sub);">
              最後: ${status.elapsedText} ${item.intervalDays ? `(${item.intervalDays}日ごと)` : ''}
            </span>
          </div>
          <span class="cal-due-badge-pill ${status.code}">
            ${status.statusLabel}
          </span>
        `;
        card.addEventListener('click', () => openItemDetail(item.id));
        DOM.calDueItemsList.appendChild(card);
      });
    }

    // 2. Done History Tasks (実施記録)
    DOM.calDoneCountBadge.textContent = `${tasks.length}件`;
    if (tasks.length === 0) {
      DOM.calDayItemsList.innerHTML = `
        <div style="font-size:12px; color:var(--text-muted); text-align:center; padding:10px 0;">この日に実施した記録はありません。</div>
      `;
      return;
    }

    DOM.calDayItemsList.innerHTML = '';
    tasks.forEach(t => {
      const cat = getCategory(t.item.categoryId);
      const timeStr = formatTimeOnly(t.doneAt);

      const card = document.createElement('div');
      card.className = 'cal-history-item-card';
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      card.innerHTML = `
        <div class="cal-item-info">
          <div class="cal-item-title-row">
            <span class="item-cat-pill" style="background:${cat.softColor}; color:${cat.color};">
              ${cat.icon} ${cat.name}
            </span>
            <span class="cal-item-title">${escapeHtml(t.item.title)}</span>
          </div>
          ${t.note ? `<span class="cal-item-note">📝 ${escapeHtml(t.note)}</span>` : ''}
        </div>
        <div class="cal-item-time">${timeStr}</div>
      `;

      card.addEventListener('click', () => openItemDetail(t.item.id));
      DOM.calDayItemsList.appendChild(card);
    });
  }

  function renderMonthSummary(year, month, dateMap) {
    let monthTotal = 0;
    const catCounts = {};

    Object.keys(dateMap).forEach(dKey => {
      const parts = dKey.split('-');
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      if (y === year && m === month) {
        dateMap[dKey].forEach(t => {
          monthTotal++;
          const cid = t.item.categoryId;
          catCounts[cid] = (catCounts[cid] || 0) + 1;
        });
      }
    });

    let chipsHtml = '';
    Object.keys(catCounts).forEach(cid => {
      const cat = getCategory(cid);
      chipsHtml += `
        <span class="cal-breakdown-chip" style="background:${cat.softColor}; color:${cat.color};">
          ${cat.icon} ${cat.name}: ${catCounts[cid]}回
        </span>
      `;
    });

    DOM.calMonthSummaryCard.innerHTML = `
      <div class="cal-month-summary-title">📊 ${month + 1}月の活動サマリー（合計 ${monthTotal} 回実施）</div>
      ${monthTotal > 0 ? `<div class="cal-month-breakdown-row">${chipsHtml}</div>` : '<div style="font-size:12px; color:var(--text-muted);">まだ今月の実施記録はありません。</div>'}
    `;
  }

  // Calendar Navigation Listeners
  function changeCalendarMonth(delta) {
    const y = state.calDate.getFullYear();
    const m = state.calDate.getMonth();
    // Setting to 1st avoids the end-of-month rollover bug (e.g. Oct 31 -> Sep 31 -> Oct 1):
    state.calDate = new Date(y, m + delta, 1);
    renderCalendarView();
  }

  DOM.calPrevMonth.addEventListener('click', () => changeCalendarMonth(-1));
  DOM.calNextMonth.addEventListener('click', () => changeCalendarMonth(1));
  DOM.calTodayBtn.addEventListener('click', () => {
    state.calDate = new Date();
    state.calSelectedDate = new Date();
    renderCalendarView();
  });

  // Calendar Quick Pick for Record Done
  DOM.btnCalAddDoneForDate.addEventListener('click', () => {
    if (state.items.length === 0) {
      showToast('先に新しい項目を登録してください');
      openEditModal(null);
      return;
    }

    const d = state.calSelectedDate || new Date();
    DOM.calPickerTitle.textContent = `${d.getMonth() + 1}月${d.getDate()}日に実施した項目`;
    DOM.calPickerItemsGrid.innerHTML = '';

    state.items.forEach(item => {
      const cat = getCategory(item.categoryId);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'cal-picker-item-btn';
      btn.innerHTML = `
        <div class="cal-picker-item-left">
          <span class="item-cat-pill" style="background:${cat.softColor}; color:${cat.color};">
            ${cat.icon} ${cat.name}
          </span>
          <span class="cal-picker-item-title">${escapeHtml(item.title)}</span>
        </div>
        <span class="cal-picker-item-sub">記録する →</span>
      `;
      btn.addEventListener('click', () => {
        closeCalPickerModal();
        openItemDetail(item.id);
      });
      DOM.calPickerItemsGrid.appendChild(btn);
    });

    DOM.calItemPickerModal.classList.add('open');
    DOM.calItemPickerModal.setAttribute('aria-hidden', 'false');
  });

  function closeCalPickerModal() {
    DOM.calItemPickerModal.classList.remove('open');
    DOM.calItemPickerModal.setAttribute('aria-hidden', 'true');
  }

  DOM.btnCloseCalPickerModal.addEventListener('click', closeCalPickerModal);

  // ==========================================================================
  // DETAIL BOTTOM SHEET (詳細確認 & 完了記録)
  // ==========================================================================
  async function openItemDetail(itemId) {
    const item = await window.lifeLogDB.getItemById(itemId);
    if (!item) return;

    state.activeItemId = item.id;
    const cat = getCategory(item.categoryId);
    const status = calcItemStatus(item);

    // Populate Detail View
    DOM.detailCatBadge.textContent = `${cat.icon} ${cat.name}`;
    DOM.detailCatBadge.style.background = cat.softColor;
    DOM.detailCatBadge.style.color = cat.color;

    DOM.detailItemTitle.textContent = item.title;
    DOM.detailElapsedText.textContent = status.elapsedText;
    DOM.detailStatusPill.className = `status-indicator-pill ${status.code}`;
    DOM.detailStatusPill.textContent = status.statusLabel;

    DOM.detailLastDoneDateStr.textContent = formatJapaneseDate(item.lastDoneAt);

    let intervalText = '目標周期: 設定なし';
    if (item.intervalDays) {
      const remaining = item.intervalDays - (status.elapsedDays || 0);
      intervalText = `目標周期: ${item.intervalDays}日ごと (${remaining >= 0 ? `あと${remaining}日` : `${Math.abs(remaining)}日超過`})`;
    }
    DOM.detailIntervalInfo.textContent = intervalText;

    // Next Due Date in Detail View
    if (status.effectiveDueDate) {
      const dueDesc = status.isManualDue ? '📌 指定' : '⏰ 周期自動';
      DOM.detailNextDueDateStr.textContent = `${formatYmdToJapanese(status.effectiveDueDate)} (${dueDesc})`;
      DOM.detailNextDueBadge.textContent = status.statusLabel;
      DOM.detailNextDueBadge.className = `next-due-status-badge ${status.code}`;
      DOM.quickNextDueDateInput.value = status.effectiveDueDate;
    } else {
      DOM.detailNextDueDateStr.textContent = '未設定';
      DOM.detailNextDueBadge.textContent = '未設定';
      DOM.detailNextDueBadge.className = 'next-due-status-badge neutral';
      DOM.quickNextDueDateInput.value = '';
    }

    // Reset Record Done Form inside Detail Sheet
    DOM.recordDoneDateInput.value = toLocalIsoDateTime(new Date());
    DOM.recordDoneNoteInput.value = '';

    // Load History
    await renderItemHistory(item.id);

    // Open Bottom Sheet
    DOM.itemDetailModal.classList.add('open');
    DOM.itemDetailModal.setAttribute('aria-hidden', 'false');
  }

  function closeItemDetail() {
    DOM.itemDetailModal.classList.remove('open');
    DOM.itemDetailModal.setAttribute('aria-hidden', 'true');
    state.activeItemId = null;
  }

  // Quick edit next due date inside detail sheet
  DOM.btnQuickSaveNextDue.addEventListener('click', async () => {
    if (!state.activeItemId) return;
    const dateVal = DOM.quickNextDueDateInput.value;
    if (!dateVal) {
      showToast('目安日の日付を選択してください');
      return;
    }
    const item = await window.lifeLogDB.getItemById(state.activeItemId);
    if (!item) return;
    item.nextDueAt = dateVal;
    await window.lifeLogDB.saveItem(item);
    showToast('次の作業目安日を更新しました！✨');
    await openItemDetail(state.activeItemId);
    await refreshData();
  });

  DOM.btnQuickClearNextDue.addEventListener('click', async () => {
    if (!state.activeItemId) return;
    const item = await window.lifeLogDB.getItemById(state.activeItemId);
    if (!item) return;
    item.nextDueAt = null;
    await window.lifeLogDB.saveItem(item);
    showToast('目安日の手動指定を解除しました');
    await openItemDetail(state.activeItemId);
    await refreshData();
  });

  async function renderItemHistory(itemId) {
    const histories = await window.lifeLogDB.getHistoriesByItemId(itemId);
    DOM.detailHistoryCount.textContent = `${histories.length}回`;

    if (histories.length === 0) {
      DOM.detailHistoryList.innerHTML = `
        <div style="font-size:12px; color:var(--text-muted); text-align:center; padding:12px 0;">まだ過去の実施記録はありません。</div>
      `;
      return;
    }

    DOM.detailHistoryList.innerHTML = '';
    histories.forEach(h => {
      const row = document.createElement('div');
      row.className = 'history-item-row';
      row.innerHTML = `
        <div>
          <span class="history-item-date">${formatJapaneseDate(h.doneAt)}</span>
          ${h.note ? `<span class="history-item-note">（${escapeHtml(h.note)}）</span>` : ''}
        </div>
        <button type="button" class="btn-del-history" title="この記録を取り消す" aria-label="削除">✕</button>
      `;

      row.querySelector('.btn-del-history').addEventListener('click', async (e) => {
        e.stopPropagation();
        if (!confirm('この実施履歴を取り消してもよろしいですか？')) return;
        await window.lifeLogDB.deleteHistory(h.id, itemId);
        showToast('履歴を削除しました');
        await openItemDetail(itemId); // refresh detail sheet
        await refreshData();
      });

      DOM.detailHistoryList.appendChild(row);
    });
  }

  // --- SUBMIT: RECORD "DONE" (今やった！) ---
  DOM.btnSubmitRecordDone.addEventListener('click', async () => {
    if (!state.activeItemId) return;

    const doneDateVal = DOM.recordDoneDateInput.value ? new Date(DOM.recordDoneDateInput.value).toISOString() : new Date().toISOString();
    const noteVal = DOM.recordDoneNoteInput.value.trim();

    const { item } = await window.lifeLogDB.recordDone(state.activeItemId, doneDateVal, noteVal);
    showToast(`「${item.title}」の実施を記録しました！✨`);

    // Refresh detail sheet & background list
    await openItemDetail(state.activeItemId);
    await refreshData();
  });

  // Edit / Delete inside Detail Sheet
  DOM.btnEditCurrentItem.addEventListener('click', async () => {
    const item = await window.lifeLogDB.getItemById(state.activeItemId);
    if (!item) return;
    closeItemDetail();
    openEditModal(item);
  });

  DOM.btnDeleteCurrentItem.addEventListener('click', async () => {
    if (!confirm('この項目とすべての実施履歴を削除してもよろしいですか？')) return;
    await window.lifeLogDB.deleteItem(state.activeItemId);
    closeItemDetail();
    showToast('項目を削除しました');
    await refreshData();
  });

  // ==========================================================================
  // CREATE / EDIT ITEM MODAL (ゴミ箱アイコン付き)
  // ==========================================================================
  function openEditModal(item = null) {
    renderCategoryRadioGrid();

    if (item && item.id) {
      // Editing existing
      DOM.editModalTitle.textContent = '項目を編集';
      DOM.editItemId.value = item.id;
      DOM.editTitleInput.value = item.title || '';
      selectEditCategory(item.categoryId || 'cat_clean');
      setEditInterval(item.intervalDays);
      DOM.initialDoneGroup.style.display = 'none'; // Don't overwrite history directly here
      DOM.editNextDueDate.value = item.nextDueAt || '';
      DOM.editNotesInput.value = item.notes || '';
      DOM.btnCancelEditItem.title = 'この項目を削除';
      DOM.btnCancelEditItem.setAttribute('aria-label', 'この項目を削除');
    } else {
      // New creation
      DOM.editModalTitle.textContent = '新しい項目を登録';
      DOM.editItemId.value = '';
      DOM.editTitleInput.value = item?.title || '';
      selectEditCategory(item?.categoryId || 'cat_clean');
      setEditInterval(item?.intervalDays !== undefined ? item.intervalDays : 7);
      DOM.initialDoneGroup.style.display = 'block';
      DOM.editInitialDoneDate.value = toLocalIsoDateTime(new Date());
      DOM.editNextDueDate.value = '';
      DOM.editNotesInput.value = '';
      DOM.btnCancelEditItem.title = '破棄・閉じる';
      DOM.btnCancelEditItem.setAttribute('aria-label', '破棄');
    }

    DOM.itemEditModal.classList.add('open');
    DOM.itemEditModal.setAttribute('aria-hidden', 'false');
    setTimeout(() => DOM.editTitleInput.focus(), 150);
  }

  function closeEditModal() {
    DOM.itemEditModal.classList.remove('open');
    DOM.itemEditModal.setAttribute('aria-hidden', 'true');
  }

  // Trash / Cancel button listener
  DOM.btnCancelEditItem.addEventListener('click', async () => {
    const existingId = DOM.editItemId.value;
    if (existingId) {
      if (!confirm('この項目とすべての実施履歴を削除してもよろしいですか？')) return;
      await window.lifeLogDB.deleteItem(existingId);
      closeEditModal();
      showToast('項目を削除しました');
      await refreshData();
    } else {
      // Discard new item draft
      closeEditModal();
    }
  });

  function renderCategoryRadioGrid() {
    DOM.editCategoryRadioGrid.innerHTML = '';
    state.categories.forEach(cat => {
      const chip = document.createElement('div');
      chip.className = `cat-radio-chip ${cat.id === state.editingCategory ? 'selected' : ''}`;
      chip.innerHTML = `${cat.icon} ${cat.name}`;
      chip.addEventListener('click', () => {
        selectEditCategory(cat.id);
      });
      DOM.editCategoryRadioGrid.appendChild(chip);
    });
  }

  function selectEditCategory(catId) {
    state.editingCategory = catId;
    DOM.editCategoryRadioGrid.querySelectorAll('.cat-radio-chip').forEach(c => {
      c.classList.remove('selected');
    });
    renderCategoryRadioGrid();
  }

  function setEditInterval(days) {
    state.editingIntervalPreset = days;
    const chips = DOM.intervalPresetChips.querySelectorAll('.preset-chip');

    chips.forEach(chip => {
      const chipDays = parseInt(chip.getAttribute('data-days'), 10);
      const isMatch = (days === null && chipDays === 0) || (chipDays === days);
      chip.classList.toggle('active', isMatch);
    });

    if (days !== null && days > 0) {
      DOM.editCustomIntervalInput.value = days;
    } else {
      DOM.editCustomIntervalInput.value = '';
    }
  }

  // Interval Preset Chips Listeners
  DOM.intervalPresetChips.querySelectorAll('.preset-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const d = parseInt(chip.getAttribute('data-days'), 10);
      setEditInterval(d === 0 ? null : d);
    });
  });

  DOM.editCustomIntervalInput.addEventListener('input', (e) => {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val) && val > 0) {
      setEditInterval(val);
    } else if (!e.target.value) {
      setEditInterval(null);
    }
  });

  // Next Due Date Quick Preset Chips in Edit Modal
  DOM.editNextDueQuickChips.querySelectorAll('.quick-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const days = parseInt(chip.getAttribute('data-days'), 10);
      const target = new Date();
      target.setDate(target.getDate() + days);
      DOM.editNextDueDate.value = toYmdString(target);
      showToast(`目安日を${chip.textContent}（${toYmdString(target)}）にセットしました`);
    });
  });

  DOM.btnClearNextDueDate.addEventListener('click', () => {
    DOM.editNextDueDate.value = '';
    showToast('目安日をクリアしました');
  });

  DOM.btnAutoCalcNextDue.addEventListener('click', async () => {
    const intervalDays = state.editingIntervalPreset;
    if (!intervalDays) {
      showToast('目標周期を選択してください（周期なしでは自動計算できません）');
      return;
    }

    let baseDate = new Date();
    const existingId = DOM.editItemId.value;
    if (existingId) {
      const item = await window.lifeLogDB.getItemById(existingId);
      if (item && item.lastDoneAt) {
        baseDate = new Date(item.lastDoneAt);
      }
    } else if (DOM.editInitialDoneDate.value) {
      baseDate = new Date(DOM.editInitialDoneDate.value);
    }

    const calculatedDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() + intervalDays);
    DOM.editNextDueDate.value = toYmdString(calculatedDate);
    showToast(`目標周期(${intervalDays}日)から次回目安日を算出しました`);
  });

  // Submit Create / Edit Item Form
  DOM.itemEditForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = DOM.editTitleInput.value.trim();
    if (!title) return;

    const existingId = DOM.editItemId.value;
    const intervalDays = state.editingIntervalPreset;
    const nextDueVal = DOM.editNextDueDate.value ? DOM.editNextDueDate.value : null;
    const notes = DOM.editNotesInput.value.trim();

    if (existingId) {
      // Update
      const item = await window.lifeLogDB.getItemById(existingId);
      if (item) {
        item.title = title;
        item.categoryId = state.editingCategory;
        item.intervalDays = intervalDays;
        item.nextDueAt = nextDueVal;
        item.notes = notes;
        await window.lifeLogDB.saveItem(item);
        showToast('項目を更新しました');
      }
    } else {
      // Create new
      const initialDoneVal = DOM.editInitialDoneDate.value ? new Date(DOM.editInitialDoneDate.value).toISOString() : null;
      const newItem = await window.lifeLogDB.saveItem({
        title,
        categoryId: state.editingCategory,
        intervalDays,
        nextDueAt: nextDueVal,
        notes,
        lastDoneAt: initialDoneVal
      });

      // If initial date is given, add a history record as well
      if (initialDoneVal) {
        await window.lifeLogDB.recordDone(newItem.id, initialDoneVal, '初回登録', nextDueVal);
      }
      showToast(`「${title}」を登録しました！`);
    }

    closeEditModal();
    await refreshData();
  });

  // ==========================================================================
  // EVENT LISTENERS & SETTINGS
  // ==========================================================================
  DOM.btnAddNewItem.addEventListener('click', () => openEditModal(null));
  DOM.btnCloseDetailModal.addEventListener('click', closeItemDetail);
  DOM.btnCloseEditModal.addEventListener('click', closeEditModal);

  // Search Input
  DOM.searchInput.addEventListener('input', (e) => {
    state.searchQuery = e.target.value;
    DOM.btnSearchClear.style.display = state.searchQuery ? 'block' : 'none';
    renderMainItemList();
  });

  DOM.btnSearchClear.addEventListener('click', () => {
    DOM.searchInput.value = '';
    state.searchQuery = '';
    DOM.btnSearchClear.style.display = 'none';
    renderMainItemList();
  });

  // Sort Order Change
  DOM.sortSelect.addEventListener('change', (e) => {
    state.sortOrder = e.target.value;
    renderMainItemList();
  });

  // Settings Modal
  DOM.btnOpenSettings.addEventListener('click', () => {
    DOM.settingsModal.classList.add('open');
    DOM.settingsModal.setAttribute('aria-hidden', 'false');
  });

  DOM.btnCloseSettingsModal.addEventListener('click', () => {
    DOM.settingsModal.classList.remove('open');
    DOM.settingsModal.setAttribute('aria-hidden', 'true');
  });

  // Export JSON
  DOM.btnExportJson.addEventListener('click', async () => {
    const jsonStr = await window.lifeLogDB.exportAllData();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `memottoku-backup-${toYmdString(new Date())}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('JSONデータを保存しました');
  });

  // Import JSON
  DOM.fileImportJson.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const res = await window.lifeLogDB.importAllData(event.target.result);
      if (res.success) {
        showToast(`${res.count}件の項目を復元しました`);
        await refreshData();
      } else {
        alert('復元に失敗しました: ' + res.error);
      }
      DOM.fileImportJson.value = '';
    };
    reader.readAsText(file);
  });

  // Clear All Data
  DOM.btnClearAllData.addEventListener('click', async () => {
    if (!confirm('警告: すべての項目と履歴が削除されます。本当に初期化しますか？')) return;
    await window.lifeLogDB.clearAllData();
    DOM.settingsModal.classList.remove('open');
    showToast('すべてのデータを初期化しました');
    await refreshData();
  });

  // Escape Key to close modals
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeItemDetail();
      closeEditModal();
      closeCalPickerModal();
      DOM.settingsModal.classList.remove('open');
    }
  });

  // Helper
  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Initial Load
  await refreshData();
});
