const CATEGORIES = {
  salary:        { label: 'Salary / Paycheck', icon: '💰', type: 'income',  color: '#22c55e' },
  freelance:     { label: 'Freelance / Side Income', icon: '💼', type: 'income',  color: '#10b981' },
  other_income:  { label: 'Other Income',      icon: '📥', type: 'income',  color: '#34d399' },
  housing:       { label: 'Housing / Rent',    icon: '🏠', type: 'expense', color: '#6366f1' },
  food:          { label: 'Food & Dining',     icon: '🍔', type: 'expense', color: '#f59e0b' },
  transport:     { label: 'Transport',         icon: '🚗', type: 'expense', color: '#3b82f6' },
  entertainment: { label: 'Entertainment',     icon: '🎬', type: 'expense', color: '#ec4899' },
  health:        { label: 'Health & Medical',  icon: '💊', type: 'expense', color: '#ef4444' },
  subscriptions: { label: 'Subscriptions',     icon: '📱', type: 'expense', color: '#8b5cf6' },
  utilities:     { label: 'Utilities',         icon: '⚡', type: 'expense', color: '#06b6d4' },
  shopping:      { label: 'Shopping',          icon: '🛍️', type: 'expense', color: '#f97316' },
  savings:       { label: 'Savings / Invest',  icon: '🏦', type: 'expense', color: '#14b8a6' },
  other_expense: { label: 'Other Expense',     icon: '💸', type: 'expense', color: '#94a3b8' },
};

let state = {
  currentYear: new Date().getFullYear(),
  currentMonth: new Date().getMonth(),
  transactions: [],
  editingId: null,
};

function loadData() {
  const saved = localStorage.getItem('budget-balancer-transactions');
  if (saved) {
    try { state.transactions = JSON.parse(saved); } catch { state.transactions = []; }
  }
}

function saveData() {
  localStorage.setItem('budget-balancer-transactions', JSON.stringify(state.transactions));
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function fmt(amount) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

function getMonthTransactions(year, month) {
  return state.transactions.filter(t => {
    const d = new Date(t.date + 'T00:00:00');
    return d.getFullYear() === year && d.getMonth() === month;
  });
}

function calcSummary(transactions) {
  let income = 0, expenses = 0;
  transactions.forEach(t => {
    const cat = CATEGORIES[t.category];
    if (cat.type === 'income') income += t.amount;
    else expenses += t.amount;
  });
  return { income, expenses, balance: income - expenses };
}

function renderCalendar() {
  const { currentYear: year, currentMonth: month } = state;
  const monthNames = ['January','February','March','April','May','June',
                      'July','August','September','October','November','December'];
  document.getElementById('month-label').textContent = `${monthNames[month]} ${year}`;

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const monthTx = getMonthTransactions(year, month);
  const byDay = {};
  monthTx.forEach(t => {
    const day = parseInt(t.date.split('-')[2], 10);
    if (!byDay[day]) byDay[day] = [];
    byDay[day].push(t);
  });

  const grid = document.getElementById('calendar-grid');
  grid.innerHTML = '';

  // Day headers
  ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].forEach(d => {
    const el = document.createElement('div');
    el.className = 'cal-header';
    el.textContent = d;
    grid.appendChild(el);
  });

  // Empty cells before first day
  for (let i = 0; i < firstDay; i++) {
    grid.appendChild(Object.assign(document.createElement('div'), { className: 'cal-cell empty' }));
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const cell = document.createElement('div');
    cell.className = 'cal-cell';
    const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
    if (isToday) cell.classList.add('today');

    const txs = byDay[day] || [];
    let dayIncome = 0, dayExpenses = 0;
    txs.forEach(t => {
      if (CATEGORIES[t.category].type === 'income') dayIncome += t.amount;
      else dayExpenses += t.amount;
    });

    let dotsHtml = '';
    if (dayIncome > 0) dotsHtml += `<span class="dot dot-income"></span>`;
    if (dayExpenses > 0) dotsHtml += `<span class="dot dot-expense"></span>`;

    cell.innerHTML = `
      <span class="cal-day-num">${day}</span>
      <div class="cal-dots">${dotsHtml}</div>
      ${dayIncome > 0 ? `<div class="cal-amount income-text">+${fmt(dayIncome)}</div>` : ''}
      ${dayExpenses > 0 ? `<div class="cal-amount expense-text">-${fmt(dayExpenses)}</div>` : ''}
    `;
    cell.addEventListener('click', () => openModal(year, month, day));
    grid.appendChild(cell);
  }
}

function renderSummary() {
  const { currentYear: year, currentMonth: month } = state;
  const monthTx = getMonthTransactions(year, month);
  const { income, expenses, balance } = calcSummary(monthTx);

  document.getElementById('sum-income').textContent = fmt(income);
  document.getElementById('sum-expenses').textContent = fmt(expenses);
  const balEl = document.getElementById('sum-balance');
  balEl.textContent = (balance >= 0 ? '+' : '') + fmt(balance);
  balEl.className = balance >= 0 ? 'sum-value positive' : 'sum-value negative';

  const rate = income > 0 ? Math.round((expenses / income) * 100) : 0;
  document.getElementById('spend-bar-fill').style.width = Math.min(rate, 100) + '%';
  document.getElementById('spend-bar-fill').className = 'bar-fill' + (rate > 90 ? ' danger' : rate > 70 ? ' warn' : '');
  document.getElementById('spend-rate').textContent = `${rate}% of income spent`;
}

function renderTransactions() {
  const { currentYear: year, currentMonth: month } = state;
  const monthTx = getMonthTransactions(year, month)
    .sort((a, b) => b.date.localeCompare(a.date));

  const list = document.getElementById('tx-list');
  if (monthTx.length === 0) {
    list.innerHTML = '<div class="empty-state">No transactions this month.<br>Click a calendar day to add one.</div>';
    return;
  }

  list.innerHTML = monthTx.map(t => {
    const cat = CATEGORIES[t.category];
    const isIncome = cat.type === 'income';
    const d = new Date(t.date + 'T00:00:00');
    const dayStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `
      <div class="tx-item">
        <span class="tx-icon">${cat.icon}</span>
        <div class="tx-info">
          <div class="tx-desc">${escHtml(t.description || cat.label)}</div>
          <div class="tx-meta">${dayStr} · ${cat.label}</div>
        </div>
        <div class="tx-right">
          <div class="tx-amount ${isIncome ? 'income-text' : 'expense-text'}">
            ${isIncome ? '+' : '-'}${fmt(t.amount)}
          </div>
          <div class="tx-actions">
            <button class="btn-icon" onclick="editTransaction('${t.id}')" title="Edit">✏️</button>
            <button class="btn-icon" onclick="deleteTransaction('${t.id}')" title="Delete">🗑️</button>
          </div>
        </div>
      </div>`;
  }).join('');
}

function renderAnalysis() {
  const { currentYear: year, currentMonth: month } = state;
  const monthTx = getMonthTransactions(year, month);
  const { income, expenses } = calcSummary(monthTx);
  const panel = document.getElementById('analysis-panel');

  if (income === 0 && expenses === 0) {
    panel.innerHTML = '<div class="empty-state">Add transactions to see your spending analysis and cost-saving tips.</div>';
    return;
  }

  // Category breakdown
  const catTotals = {};
  monthTx.forEach(t => {
    if (!catTotals[t.category]) catTotals[t.category] = 0;
    catTotals[t.category] += t.amount;
  });

  const expenseCategories = Object.entries(catTotals)
    .filter(([cat]) => CATEGORIES[cat].type === 'expense')
    .sort((a, b) => b[1] - a[1]);

  const tips = buildTips(income, expenses, catTotals, expenseCategories, monthTx);

  const breakdownHtml = expenseCategories.map(([cat, amt]) => {
    const pct = income > 0 ? Math.round((amt / income) * 100) : 0;
    const c = CATEGORIES[cat];
    return `
      <div class="breakdown-row">
        <span>${c.icon} ${c.label}</span>
        <div class="breakdown-bar-wrap">
          <div class="breakdown-bar" style="width:${Math.min(pct, 100)}%;background:${c.color}"></div>
        </div>
        <span class="breakdown-amt">${fmt(amt)} <span class="pct-label">${pct}%</span></span>
      </div>`;
  }).join('');

  panel.innerHTML = `
    <h3 class="analysis-title">Spending Breakdown</h3>
    <div class="breakdown-list">${breakdownHtml || '<div class="empty-state">No expenses this month.</div>'}</div>
    <h3 class="analysis-title" style="margin-top:20px">💡 Recommendations</h3>
    <div class="tips-list">${tips}</div>`;
}

function buildTips(income, expenses, catTotals, expenseCategories, monthTx) {
  const tips = [];
  const balance = income - expenses;
  const savingsRate = income > 0 ? (balance / income) * 100 : 0;

  // 1. Overall balance
  if (balance < 0) {
    tips.push({ level: 'remove', text: `You're spending <strong>${fmt(Math.abs(balance))}</strong> more than you earn this month. Immediate action needed — identify expenses to cut.` });
  } else if (savingsRate < 10) {
    tips.push({ level: 'reconsider', text: `Your savings rate is only <strong>${Math.round(savingsRate)}%</strong>. Aim for at least 20% for financial stability.` });
  } else if (savingsRate >= 20) {
    tips.push({ level: 'good', text: `Great job! You're saving <strong>${Math.round(savingsRate)}%</strong> of your income. Consider putting the surplus into investments.` });
  }

  // 2. 50/30/20 rule check (needs/wants/savings)
  if (income > 0) {
    const needsCategories = ['housing', 'food', 'transport', 'health', 'utilities'];
    const wantsCategories = ['entertainment', 'shopping', 'subscriptions', 'other_expense'];
    let needs = 0, wants = 0;
    needsCategories.forEach(c => { if (catTotals[c]) needs += catTotals[c]; });
    wantsCategories.forEach(c => { if (catTotals[c]) wants += catTotals[c]; });
    const needsPct = Math.round((needs / income) * 100);
    const wantsPct = Math.round((wants / income) * 100);

    if (needsPct > 50) {
      tips.push({ level: 'reconsider', text: `Essential expenses (housing, food, transport, etc.) are <strong>${needsPct}%</strong> of income — above the recommended 50%. Look for cheaper alternatives.` });
    }
    if (wantsPct > 30) {
      tips.push({ level: 'reconsider', text: `Discretionary spending (entertainment, shopping, subscriptions) is <strong>${wantsPct}%</strong> of income — above the recommended 30%.` });
    }
  }

  // 3. Housing check
  if (catTotals['housing'] && income > 0) {
    const pct = (catTotals['housing'] / income) * 100;
    if (pct > 35) {
      tips.push({ level: 'reconsider', text: `🏠 Housing is <strong>${Math.round(pct)}%</strong> of your income (recommended: ≤30%). Consider: a roommate, negotiating rent, or moving to a lower-cost area.` });
    }
  }

  // 4. Food check
  if (catTotals['food'] && income > 0) {
    const pct = (catTotals['food'] / income) * 100;
    if (pct > 15) {
      tips.push({ level: 'replace', text: `🍔 Food spending is <strong>${Math.round(pct)}%</strong> of income. Consider meal prepping, cooking at home more, or using grocery apps (Ibotta, Flipp) to reduce this.` });
    }
  }

  // 5. Entertainment check
  if (catTotals['entertainment'] && income > 0) {
    const pct = (catTotals['entertainment'] / income) * 100;
    if (pct > 10) {
      tips.push({ level: 'remove', text: `🎬 Entertainment is <strong>${Math.round(pct)}%</strong> of income. Look for free or low-cost alternatives: library events, free streaming, outdoor activities.` });
    }
  }

  // 6. Subscriptions audit
  if (catTotals['subscriptions']) {
    const subTx = monthTx.filter(t => t.category === 'subscriptions');
    if (subTx.length >= 2) {
      const total = catTotals['subscriptions'];
      tips.push({ level: 'remove', text: `📱 You have <strong>${subTx.length} subscription</strong> charges totaling <strong>${fmt(total)}/mo</strong>. Review each one — cancel any you use less than weekly.` });
    }
  }

  // 7. Shopping check
  if (catTotals['shopping'] && income > 0) {
    const pct = (catTotals['shopping'] / income) * 100;
    if (pct > 10) {
      tips.push({ level: 'reconsider', text: `🛍️ Shopping is <strong>${Math.round(pct)}%</strong> of income. Try a 24-hour rule before purchases — if you still want it tomorrow, then buy it.` });
    }
  }

  // 8. No savings category
  if (!catTotals['savings'] && income > 0) {
    tips.push({ level: 'replace', text: `🏦 You have no savings allocated this month. Try automating a transfer to savings on payday — even 5-10% makes a difference over time.` });
  }

  // 9. Largest single expense
  const largest = expenseCategories[0];
  if (largest && income > 0) {
    const pct = Math.round((largest[1] / income) * 100);
    if (pct > 40 && largest[0] !== 'housing' && largest[0] !== 'savings') {
      tips.push({ level: 'reconsider', text: `⚠️ <strong>${CATEGORIES[largest[0]].label}</strong> is your biggest expense at <strong>${fmt(largest[1])}</strong> (${pct}% of income). Could this be reduced?` });
    }
  }

  if (tips.length === 0) {
    tips.push({ level: 'good', text: `Your budget looks healthy! Keep tracking and aim to increase your savings rate over time.` });
  }

  const levelConfig = {
    good:       { icon: '✅', label: 'Looking Good',  cls: 'tip-good' },
    reconsider: { icon: '🔄', label: 'Reconsider',    cls: 'tip-reconsider' },
    replace:    { icon: '♻️', label: 'Replace / Cut', cls: 'tip-replace' },
    remove:     { icon: '🚨', label: 'Remove',        cls: 'tip-remove' },
  };

  return tips.map(tip => {
    const cfg = levelConfig[tip.level];
    return `
      <div class="tip ${cfg.cls}">
        <span class="tip-icon">${cfg.icon}</span>
        <div class="tip-body">
          <div class="tip-label">${cfg.label}</div>
          <div class="tip-text">${tip.text}</div>
        </div>
      </div>`;
  }).join('');
}

function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Modal ──────────────────────────────────────────────────────────────────────

function openModal(year, month, day) {
  const dateStr = `${year}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
  document.getElementById('modal-date').value = dateStr;
  document.getElementById('modal-amount').value = '';
  document.getElementById('modal-desc').value = '';
  document.getElementById('modal-category').value = 'food';
  document.getElementById('modal-title').textContent = 'Add Transaction';
  document.getElementById('modal-delete-btn').style.display = 'none';
  state.editingId = null;
  showModal(true);
}

function openAddModal() {
  const today = new Date();
  const y = state.currentYear, m = state.currentMonth;
  const dateStr = `${y}-${String(m + 1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
  openModalWithDate(dateStr);
}

function openModalWithDate(dateStr) {
  document.getElementById('modal-date').value = dateStr;
  document.getElementById('modal-amount').value = '';
  document.getElementById('modal-desc').value = '';
  document.getElementById('modal-category').value = 'food';
  document.getElementById('modal-title').textContent = 'Add Transaction';
  document.getElementById('modal-delete-btn').style.display = 'none';
  state.editingId = null;
  showModal(true);
}

function editTransaction(id) {
  const tx = state.transactions.find(t => t.id === id);
  if (!tx) return;
  state.editingId = id;
  document.getElementById('modal-date').value = tx.date;
  document.getElementById('modal-amount').value = tx.amount;
  document.getElementById('modal-desc').value = tx.description || '';
  document.getElementById('modal-category').value = tx.category;
  document.getElementById('modal-title').textContent = 'Edit Transaction';
  document.getElementById('modal-delete-btn').style.display = 'inline-flex';
  showModal(true);
}

function deleteTransaction(id) {
  if (!confirm('Delete this transaction?')) return;
  state.transactions = state.transactions.filter(t => t.id !== id);
  saveData();
  render();
}

function showModal(show) {
  document.getElementById('modal-overlay').classList.toggle('visible', show);
  if (show) setTimeout(() => document.getElementById('modal-amount').focus(), 50);
}

function handleModalSubmit(e) {
  e.preventDefault();
  const amount = parseFloat(document.getElementById('modal-amount').value);
  const category = document.getElementById('modal-category').value;
  const description = document.getElementById('modal-desc').value.trim();
  const date = document.getElementById('modal-date').value;

  if (!amount || amount <= 0 || !date) return;

  if (state.editingId) {
    const tx = state.transactions.find(t => t.id === state.editingId);
    if (tx) { tx.amount = amount; tx.category = category; tx.description = description; tx.date = date; }
  } else {
    state.transactions.push({ id: generateId(), date, amount, category, description });
  }

  saveData();
  showModal(false);
  render();
}

function handleModalDelete() {
  if (state.editingId) {
    deleteTransaction(state.editingId);
    showModal(false);
  }
}

// ── Navigation ─────────────────────────────────────────────────────────────────

function prevMonth() {
  state.currentMonth--;
  if (state.currentMonth < 0) { state.currentMonth = 11; state.currentYear--; }
  render();
}

function nextMonth() {
  state.currentMonth++;
  if (state.currentMonth > 11) { state.currentMonth = 0; state.currentYear++; }
  render();
}

function goToday() {
  const now = new Date();
  state.currentYear = now.getFullYear();
  state.currentMonth = now.getMonth();
  render();
}

// ── Render ─────────────────────────────────────────────────────────────────────

function render() {
  renderCalendar();
  renderSummary();
  renderTransactions();
  renderAnalysis();
}

// ── Init ───────────────────────────────────────────────────────────────────────

function buildCategoryOptions() {
  const sel = document.getElementById('modal-category');
  const incomeGroup = document.createElement('optgroup');
  incomeGroup.label = '── Income';
  const expenseGroup = document.createElement('optgroup');
  expenseGroup.label = '── Expenses';

  Object.entries(CATEGORIES).forEach(([key, cat]) => {
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = `${cat.icon} ${cat.label}`;
    if (cat.type === 'income') incomeGroup.appendChild(opt);
    else expenseGroup.appendChild(opt);
  });

  sel.appendChild(incomeGroup);
  sel.appendChild(expenseGroup);
}

document.addEventListener('DOMContentLoaded', () => {
  loadData();
  buildCategoryOptions();

  document.getElementById('prev-month').addEventListener('click', prevMonth);
  document.getElementById('next-month').addEventListener('click', nextMonth);
  document.getElementById('today-btn').addEventListener('click', goToday);
  document.getElementById('add-btn').addEventListener('click', openAddModal);
  document.getElementById('modal-form').addEventListener('submit', handleModalSubmit);
  document.getElementById('modal-delete-btn').addEventListener('click', handleModalDelete);
  document.getElementById('modal-cancel').addEventListener('click', () => showModal(false));
  document.getElementById('modal-overlay').addEventListener('click', e => {
    if (e.target === document.getElementById('modal-overlay')) showModal(false);
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') showModal(false); });

  render();
});
