// ── Constants ──────────────────────────────────────────────────────────────────

const PALETTE = [
  '#ef4444','#f97316','#f59e0b','#eab308','#22c55e',
  '#10b981','#06b6d4','#3b82f6','#6366f1','#8b5cf6',
  '#a855f7','#ec4899','#14b8a6','#84cc16','#0ea5e9',
];

const CATEGORIES = [
  { id:'salary',        label:'Salary',         icon:'💰', type:'income'  },
  { id:'freelance',     label:'Freelance',       icon:'💼', type:'income'  },
  { id:'investment',    label:'Investment',      icon:'📈', type:'income'  },
  { id:'other_income',  label:'Other Income',    icon:'📥', type:'income'  },
  { id:'housing',       label:'Housing / Rent',  icon:'🏠', type:'expense' },
  { id:'food',          label:'Food & Dining',   icon:'🍔', type:'expense' },
  { id:'transport',     label:'Transport',       icon:'🚗', type:'expense' },
  { id:'streaming',     label:'Streaming',       icon:'📺', type:'expense' },
  { id:'entertainment', label:'Entertainment',   icon:'🎬', type:'expense' },
  { id:'health',        label:'Health',          icon:'💊', type:'expense' },
  { id:'utilities',     label:'Utilities',       icon:'⚡', type:'expense' },
  { id:'shopping',      label:'Shopping',        icon:'🛍️', type:'expense' },
  { id:'fitness',       label:'Fitness',         icon:'💪', type:'expense' },
  { id:'education',     label:'Education',       icon:'📚', type:'expense' },
  { id:'subscriptions', label:'Subscriptions',   icon:'📱', type:'expense' },
  { id:'other',         label:'Other',           icon:'📌', type:'expense' },
];

const FREQS = [
  { id:'once',      label:'One-time',  mult:0  },
  { id:'weekly',    label:'Weekly',    mult:52 },
  { id:'biweekly',  label:'Bi-weekly', mult:26 },
  { id:'monthly',   label:'Monthly',   mult:12 },
  { id:'quarterly', label:'Quarterly', mult:4  },
  { id:'annually',  label:'Annually',  mult:1  },
];

const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];
const SHORT  = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ── State ──────────────────────────────────────────────────────────────────────

const S = {
  view: 'calendar',
  year: new Date().getFullYear(),
  month: new Date().getMonth(),
  search: '',
  filters: new Set(['all']),
  transactions: [],
  goals: [],
  debts: [],
  modal: null,
};

// ── Persistence ────────────────────────────────────────────────────────────────

function load() {
  try {
    const d = JSON.parse(localStorage.getItem('bb2') || '{}');
    S.transactions = d.transactions || [];
    S.goals        = d.goals        || [];
    S.debts        = d.debts        || [];
  } catch {}
}

function save() {
  localStorage.setItem('bb2', JSON.stringify({
    transactions: S.transactions, goals: S.goals, debts: S.debts,
  }));
}

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2,6); }

// ── Utils ──────────────────────────────────────────────────────────────────────

function fmt(n) {
  return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2}).format(n);
}

function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function dstr(d) {
  return `${d.getFullYear()}-${p2(d.getMonth()+1)}-${p2(d.getDate())}`;
}

function p2(n) { return String(n).padStart(2,'0'); }

function getCat(id) { return CATEGORIES.find(c=>c.id===id) || CATEGORIES[CATEGORIES.length-1]; }

function textColor(hex) {
  const r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16);
  return (r*299+g*587+b*114)/1000 > 145 ? '#111' : '#fff';
}

// ── Recurrence engine ──────────────────────────────────────────────────────────

function occurrences(tx, year, month) {
  const start  = new Date(tx.startDate + 'T00:00:00');
  const mStart = new Date(year, month, 1);
  const mEnd   = new Date(year, month+1, 0);
  if (start > mEnd) return [];

  switch (tx.frequency) {
    case 'once':
      return (start >= mStart && start <= mEnd) ? [tx.startDate] : [];

    case 'weekly': {
      const out = [], dow = start.getDay();
      for (let d=1; d<=mEnd.getDate(); d++) {
        const dt = new Date(year, month, d);
        if (dt >= start && dt.getDay()===dow) out.push(dstr(dt));
      }
      return out;
    }

    case 'biweekly': {
      const out = [];
      // Use UTC day-diff to avoid DST skewing the modulo calculation
      const utcStart  = Date.UTC(start.getFullYear(),  start.getMonth(),  start.getDate());
      const utcMStart = Date.UTC(mStart.getFullYear(), mStart.getMonth(), mStart.getDate());
      const diff = Math.round((utcMStart - utcStart) / 86400000);
      const skip = ((diff % 14) + 14) % 14;
      // Advance using local date components so DST never shifts the weekday
      let cur = skip === 0
        ? new Date(mStart.getFullYear(), mStart.getMonth(), mStart.getDate())
        : new Date(mStart.getFullYear(), mStart.getMonth(), mStart.getDate() + (14 - skip));
      while (cur <= mEnd) {
        if (cur >= start) out.push(dstr(cur));
        cur = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate() + 14);
      }
      return out;
    }

    case 'monthly': {
      const dt = new Date(year, month, start.getDate());
      return (dt.getMonth()===month && dt>=start) ? [dstr(dt)] : [];
    }

    case 'quarterly': {
      const sm = start.getFullYear()*12+start.getMonth();
      const cm = year*12+month;
      if ((cm-sm)%3!==0) return [];
      const dt = new Date(year, month, start.getDate());
      return (dt.getMonth()===month && dt>=start) ? [dstr(dt)] : [];
    }

    case 'annually': {
      if (start.getMonth()!==month) return [];
      const dt = new Date(year, month, start.getDate());
      return (dt.getMonth()===month && dt>=start) ? [dstr(dt)] : [];
    }

    default: return [];
  }
}

function monthEvents(year, month) {
  const out = [];
  S.transactions.forEach(tx => {
    occurrences(tx, year, month).forEach(date => out.push({date, tx}));
  });
  return out;
}

function applyFilters(events) {
  return events.filter(({tx}) => {
    if (S.search && !tx.name.toLowerCase().includes(S.search)) return false;
    if (!S.filters.has('all') && !S.filters.has(tx.categoryId)) return false;
    return true;
  });
}

// ── Render: Calendar ───────────────────────────────────────────────────────────

function renderCalendar() {
  const events  = applyFilters(monthEvents(S.year, S.month));
  const byDay   = {};
  events.forEach(e => {
    const day = +e.date.split('-')[2];
    (byDay[day] = byDay[day]||[]).push(e);
  });

  const firstDay    = new Date(S.year, S.month, 1).getDay();
  const daysInMonth = new Date(S.year, S.month+1, 0).getDate();
  const today       = new Date();

  const grid = document.getElementById('calendar-grid');
  grid.innerHTML = '';

  ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].forEach(d => {
    grid.insertAdjacentHTML('beforeend', `<div class="cal-dow">${d}</div>`);
  });

  for (let i=0; i<firstDay; i++) {
    grid.insertAdjacentHTML('beforeend', '<div class="cal-cell empty"></div>');
  }

  for (let day=1; day<=daysInMonth; day++) {
    const isToday = today.getFullYear()===S.year && today.getMonth()===S.month && today.getDate()===day;
    const evs = byDay[day] || [];

    const evHtml = evs.slice(0,4).map(({tx}) => {
      const bg = tx.color || PALETTE[8];
      const tc = textColor(bg);
      return `<div class="cal-event" style="background:${bg};color:${tc}"
                   onclick="event.stopPropagation();editTx('${tx.id}')"
                   title="${esc(tx.name)} — ${fmt(tx.amount)}">
        <span class="event-name">${esc(tx.name)}</span>
        <span class="event-amt">${fmt(tx.amount)}</span>
      </div>`;
    }).join('');

    const more = evs.length>4 ? `<div class="cal-more">+${evs.length-4} more</div>` : '';
    const numClass = isToday ? 'cal-day-num today-num' : 'cal-day-num';

    grid.insertAdjacentHTML('beforeend', `
      <div class="cal-cell${isToday?' today':''}"
           onclick="addTxOnDay(${S.year},${S.month},${day})">
        <div class="${numClass}">${day}</div>
        ${evHtml}${more}
      </div>`);
  }
}

function renderMonthStrip() {
  document.getElementById('month-strip').innerHTML =
    SHORT.map((m,i)=>
      `<button class="month-chip${i===S.month?' active':''}" onclick="goMonth(${i})">${m}</button>`
    ).join('');
}

function renderFilterBar() {
  const allActive = S.filters.has('all');
  let html = `<button class="filter-chip${allActive?' active':''}" onclick="toggleFilter('all')">All</button>`;
  CATEGORIES.forEach(c => {
    const on = !allActive && S.filters.has(c.id);
    html += `<button class="filter-chip${on?' active':''}" onclick="toggleFilter('${c.id}')">${c.icon} ${c.label}</button>`;
  });
  document.getElementById('filter-bar').innerHTML = html;
}

function renderSummary() {
  const evs = applyFilters(monthEvents(S.year, S.month));
  let income=0, expenses=0;
  evs.forEach(({tx}) => {
    getCat(tx.categoryId).type==='income' ? income+=tx.amount : expenses+=tx.amount;
  });
  const balance = income - expenses;
  const rate    = income>0 ? Math.round(expenses/income*100) : 0;

  document.getElementById('cal-title').textContent    = `${MONTHS[S.month]} ${S.year}`;
  document.getElementById('sum-income').textContent   = fmt(income);
  document.getElementById('sum-expenses').textContent = fmt(expenses);
  const balEl = document.getElementById('sum-balance');
  balEl.textContent = (balance>=0?'+':'')+fmt(balance);
  balEl.className   = 'sum-val '+(balance>=0?'positive':'negative');

  const fill = document.getElementById('spend-bar-fill');
  fill.style.width = Math.min(rate,100)+'%';
  fill.className   = 'spend-bar-fill'+(rate>90?' danger':rate>70?' warn':'');
  document.getElementById('spend-rate-lbl').textContent = `${rate}% of income`;
}

// ── Render: Right panel ────────────────────────────────────────────────────────

function renderUpcoming() {
  const today = new Date(); today.setHours(0,0,0,0);
  const seen  = new Set();
  const items = [];

  const filteredTx = S.filters.has('all')
    ? S.transactions
    : S.transactions.filter(tx => S.filters.has(tx.categoryId));

  for (let offset=0; offset<=14; offset++) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset);
    const ds = dstr(d);
    filteredTx.forEach(tx => {
      const key = tx.id+ds;
      if (seen.has(key)) return;
      if (occurrences(tx, d.getFullYear(), d.getMonth()).includes(ds)) {
        seen.add(key);
        items.push({date:ds, tx, offset});
      }
    });
  }

  const el = document.getElementById('upcoming-list');
  if (!items.length) { el.innerHTML='<div class="empty-sm">No bills in the next 14 days.</div>'; return; }

  el.innerHTML = items.map(({date, tx, offset}) => {
    const cat     = getCat(tx.categoryId);
    const col     = tx.color || PALETTE[8];
    const when    = offset===0?'Today':offset===1?'Tomorrow':`In ${offset}d`;
    const dateStr = new Date(date+'T00:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'});
    const sign    = cat.type==='income';
    return `<div class="upcoming-item" onclick="editTx('${tx.id}')">
      <div class="upcoming-color" style="background:${col}"></div>
      <div class="upcoming-info">
        <div class="upcoming-name">${esc(tx.name)}</div>
        <div class="upcoming-meta">${dateStr} · ${when}</div>
      </div>
      <div class="upcoming-amt ${sign?'income-text':'expense-text'}">${sign?'+':'-'}${fmt(tx.amount)}</div>
    </div>`;
  }).join('');
}

function renderAnalysis() {
  const evs = applyFilters(monthEvents(S.year, S.month));
  let income=0, expenses=0;
  const catTotals={}, catColors={};

  evs.forEach(({tx}) => {
    const cat = getCat(tx.categoryId);
    if (cat.type==='income') { income+=tx.amount; }
    else {
      expenses+=tx.amount;
      catTotals[tx.categoryId] = (catTotals[tx.categoryId]||0)+tx.amount;
      if (!catColors[tx.categoryId]) catColors[tx.categoryId]=tx.color||PALETTE[8];
    }
  });

  const sorted = Object.entries(catTotals).sort((a,b)=>b[1]-a[1]).slice(0,8);

  const breakdownHtml = sorted.map(([id,amt]) => {
    const cat  = getCat(id);
    const pct  = income>0 ? Math.min(Math.round(amt/income*100),100) : 0;
    const col  = catColors[id] || PALETTE[8];
    return `<div class="breakdown-row">
      <div>${cat.icon} ${cat.label}</div>
      <div class="breakdown-bar-wrap"><div class="breakdown-bar" style="width:${pct}%;background:${col}"></div></div>
      <div class="breakdown-val">${fmt(amt)}</div>
    </div>`;
  }).join('') || '<div class="empty-sm">No expense data.</div>';

  // Tips always reflect the full month, not the active filter
  const fullEvs = monthEvents(S.year, S.month);
  let fullIncome=0, fullExpenses=0;
  const fullCatTotals={};
  fullEvs.forEach(({tx}) => {
    const cat = getCat(tx.categoryId);
    if (cat.type==='income') fullIncome+=tx.amount;
    else { fullExpenses+=tx.amount; fullCatTotals[tx.categoryId]=(fullCatTotals[tx.categoryId]||0)+tx.amount; }
  });
  const tips = buildTips(fullIncome, fullExpenses, fullCatTotals);

  document.getElementById('analysis-panel').innerHTML = `
    <div class="panel-title">Spending Breakdown</div>
    <div class="panel-section">${breakdownHtml}</div>
    <div class="panel-title" style="margin-top:8px">Recommendations</div>
    <div class="tips-list">${tips}</div>`;
}

function buildTips(income, expenses, cat) {
  const tips=[], bal=income-expenses, rate=income>0?(bal/income)*100:0;

  if (bal<0) tips.push({l:'remove', t:`You're spending <strong>${fmt(Math.abs(bal))}</strong> more than you earn. Cut expenses immediately.`});
  else if (rate<10) tips.push({l:'reconsider', t:`Savings rate is only <strong>${Math.round(rate)}%</strong>. Aim for 20%+.`});
  else if (rate>=20) {
    const activeGoals = S.goals.filter(g => g.saved < g.target);
    let suggestion;
    if (activeGoals.length > 0) {
      suggestion = `putting <strong>${fmt(bal)}</strong> towards your <strong>${esc(activeGoals[0].name)}</strong> goal`;
    } else {
      suggestion = `investing your <strong>${fmt(bal)}</strong> surplus or placing it into a savings account`;
    }
    tips.push({l:'good', t:`Solid! You're saving <strong>${Math.round(rate)}%</strong> of income. Consider ${suggestion}.`});
  }

  const needs=['housing','food','transport','health','utilities'];
  const wants=['entertainment','shopping','streaming','subscriptions','fitness'];
  let n=0,w=0;
  needs.forEach(c=>{if(cat[c])n+=cat[c];});
  wants.forEach(c=>{if(cat[c])w+=cat[c];});
  if (income>0) {
    if (n/income>.5) tips.push({l:'reconsider',t:`Essentials are <strong>${Math.round(n/income*100)}%</strong> of income (target ≤50%). Look for cheaper alternatives.`});
    if (w/income>.3) tips.push({l:'reconsider',t:`Discretionary spending is <strong>${Math.round(w/income*100)}%</strong> of income (target ≤30%).`});
  }

  if (cat.housing && income>0 && cat.housing/income>.33) tips.push({l:'reconsider',t:`🏠 Housing is <strong>${Math.round(cat.housing/income*100)}%</strong> of income. Consider a roommate or renegotiating rent.`});
  if (cat.food    && income>0 && cat.food/income>.15)    tips.push({l:'replace',   t:`🍔 Food is <strong>${Math.round(cat.food/income*100)}%</strong> of income. Meal prep and cooking at home can cut this significantly.`});

  if (!tips.length) tips.push({l:'good', t:`Budget looks healthy! Keep tracking and look for ways to grow your savings rate.`});

  const cfg = {good:{icon:'✅',cls:'tip-good'}, reconsider:{icon:'🔄',cls:'tip-reconsider'}, replace:{icon:'♻️',cls:'tip-replace'}, remove:{icon:'🚨',cls:'tip-remove'}};
  return tips.map(({l,t})=>`
    <div class="tip ${cfg[l].cls}">
      <span class="tip-icon">${cfg[l].icon}</span>
      <div><div class="tip-lbl">${l}</div><div class="tip-txt">${t}</div></div>
    </div>`).join('');
}

// ── Render: Goals ──────────────────────────────────────────────────────────────

function renderGoals() {
  const el = document.getElementById('goals-content');
  if (!S.goals.length) {
    el.innerHTML=`<div class="empty-state"><div class="empty-icon">🎯</div><div>No savings goals yet.</div><button class="btn btn-primary" onclick="openGoalModal()">Create a Goal</button></div>`;
    return;
  }
  el.innerHTML = S.goals.map(g => {
    const pct  = Math.min(Math.round(g.saved/g.target*100),100);
    const rem  = Math.max(g.target-g.saved,0);
    const dt   = new Date(g.targetDate+'T00:00:00');
    const dlbl = dt.toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'});
    const mos  = Math.max(1, Math.round((dt-new Date())/(30*86400000)));
    const per  = rem>0 ? rem/mos : 0;
    return `<div class="goal-card" style="border-left-color:${g.color}">
      <div class="goal-header">
        <div class="goal-name">${esc(g.name)}</div>
        <div class="goal-actions">
          <button class="btn-icon" onclick="openGoalModal('${g.id}')">✏️</button>
          <button class="btn-icon" onclick="deleteGoal('${g.id}')">🗑️</button>
        </div>
      </div>
      <div class="goal-progress-bar"><div class="goal-bar-fill" style="width:${pct}%;background:${g.color}"></div></div>
      <div class="goal-stats">
        <span>${fmt(g.saved)} saved</span><span>${pct}%</span><span>${fmt(g.target)} goal</span>
      </div>
      <div class="goal-meta">Target: ${dlbl} · ${rem>0?`~${fmt(per)}/mo needed`:'🎉 Goal reached!'}</div>
      ${rem>0?`<div class="goal-add-row">
        <input class="form-input goal-add-input" id="gadd-${g.id}" type="number" min="0.01" step="0.01" placeholder="Add amount…"/>
        <button class="btn btn-sm btn-primary" onclick="addToGoal('${g.id}')">Add</button>
      </div>`:''}
    </div>`;
  }).join('');
}

function addToGoal(id) {
  const val = parseFloat(document.getElementById('gadd-'+id)?.value);
  if (!val || val<=0) return;
  const g = S.goals.find(x=>x.id===id);
  if (g) { g.saved = Math.min(g.saved+val, g.target); save(); renderGoals(); }
}

function deleteGoal(id) {
  if (!confirm('Delete this goal?')) return;
  S.goals = S.goals.filter(g=>g.id!==id);
  save(); renderGoals();
}

// ── Render: Debts ──────────────────────────────────────────────────────────────

function renderDebts() {
  const el = document.getElementById('debts-content');
  if (!S.debts.length) {
    el.innerHTML=`<div class="empty-state"><div class="empty-icon">💳</div><div>No debts tracked yet.</div><button class="btn btn-primary" onclick="openDebtModal()">Add a Debt</button></div>`;
    return;
  }
  el.innerHTML = S.debts.map(d => {
    const r   = d.rate/100/12;
    let mos   = 0, totalInt = 0;
    if (d.payment>0) {
      if (r>0 && d.payment>d.balance*r) {
        mos = Math.ceil(-Math.log(1-(d.balance*r)/d.payment)/Math.log(1+r));
        totalInt = d.payment*mos - d.balance;
      } else if (r===0) {
        mos=Math.ceil(d.balance/d.payment); totalInt=0;
      } else { mos=999; totalInt=0; }
    }
    const mosStr = mos>0&&mos<999 ? (mos>=12?`${Math.floor(mos/12)}y ${mos%12}m`:`${mos}m`) : '—';
    return `<div class="debt-card" style="border-left-color:${d.color}">
      <div class="debt-header">
        <div class="debt-name">${esc(d.name)}</div>
        <div class="debt-balance">${fmt(d.balance)}</div>
        <div class="debt-actions">
          <button class="btn-icon" onclick="openDebtModal('${d.id}')">✏️</button>
          <button class="btn-icon" onclick="deleteDebt('${d.id}')">🗑️</button>
        </div>
      </div>
      <div class="debt-stats">
        <div class="debt-stat"><div class="ds-label">Interest</div><div class="ds-val">${d.rate}% APR</div></div>
        <div class="debt-stat"><div class="ds-label">Min Payment</div><div class="ds-val">${fmt(d.payment)}/mo</div></div>
        <div class="debt-stat"><div class="ds-label">Payoff</div><div class="ds-val">${mosStr}</div></div>
        <div class="debt-stat"><div class="ds-label">Total Interest</div><div class="ds-val expense-text">${totalInt>0?fmt(totalInt):'$0.00'}</div></div>
      </div>
    </div>`;
  }).join('');
}

function deleteDebt(id) {
  if (!confirm('Delete this debt?')) return;
  S.debts = S.debts.filter(d=>d.id!==id);
  save(); renderDebts();
}

// ── Render: Trends ─────────────────────────────────────────────────────────────

function renderTrends() {
  const now  = new Date();
  const data = [];
  for (let i=5; i>=0; i--) {
    let y=now.getFullYear(), m=now.getMonth()-i;
    while(m<0){m+=12;y--;}
    const evs=monthEvents(y,m);
    let inc=0,exp=0;
    evs.forEach(({tx})=>{ getCat(tx.categoryId).type==='income'?inc+=tx.amount:exp+=tx.amount; });
    data.push({label:SHORT[m],year:y,month:m,inc,exp,bal:inc-exp});
  }

  let cumBal = 0;
  data.forEach(d => { cumBal += d.bal; d.cumBal = cumBal; });

  const maxVal = Math.max(...data.map(d=>Math.max(d.inc,d.exp)),1);
  const maxCum = Math.max(...data.map(d=>Math.abs(d.cumBal)),1);

  document.getElementById('trends-chart').innerHTML = data.map(d=>{
    const iH = Math.round(d.inc/maxVal*180);
    const eH = Math.round(d.exp/maxVal*180);
    return `<div class="trend-col">
      <div class="trend-bars">
        <div class="trend-bar income-bar"  style="height:${iH}px" title="Income: ${fmt(d.inc)}"></div>
        <div class="trend-bar expense-bar" style="height:${eH}px" title="Expenses: ${fmt(d.exp)}"></div>
      </div>
      <div class="trend-lbl">${d.label}</div>
      <div class="trend-bal ${d.bal>=0?'positive':'negative'}">${d.bal>=0?'+':''}${fmt(d.bal)}</div>
      <div class="trend-cum ${d.cumBal>=0?'positive':'negative'}" title="Running balance">${d.cumBal>=0?'+':''}${fmt(d.cumBal)}</div>
    </div>`;
  }).join('');

  const maxCumAbs = Math.max(...data.map(d => Math.abs(d.cumBal)), 1);
  const runningHtml = data.map(d => {
    const barH = Math.round(Math.abs(d.cumBal) / maxCumAbs * 60);
    const cls  = d.cumBal >= 0 ? 'positive' : 'negative';
    return `<div class="trend-col">
      <div class="trend-bars" style="height:60px">
        <div class="trend-bar ${d.cumBal>=0?'income-bar':'expense-bar'}" style="height:${barH}px;width:40px"></div>
      </div>
      <div class="trend-lbl">${d.label}</div>
      <div class="trend-bal ${cls}">${d.cumBal>=0?'+':''}${fmt(d.cumBal)}</div>
    </div>`;
  }).join('');

  document.getElementById('trends-running').innerHTML = runningHtml;

  document.getElementById('trends-table').innerHTML = `
    <table>
      <thead><tr><th>Month</th><th>Income</th><th>Expenses</th><th>Net</th><th>Running Balance</th></tr></thead>
      <tbody>${data.map(d=>`
        <tr>
          <td>${d.label} ${d.year}</td>
          <td class="income-text">${fmt(d.inc)}</td>
          <td class="expense-text">${fmt(d.exp)}</td>
          <td class="${d.bal>=0?'positive':'negative'}">${d.bal>=0?'+':''}${fmt(d.bal)}</td>
          <td class="${d.cumBal>=0?'positive':'negative'}">${d.cumBal>=0?'+':''}${fmt(d.cumBal)}</td>
        </tr>`).join('')}
      </tbody>
    </table>`;
}

// ── Modal: Transaction ─────────────────────────────────────────────────────────

function addTxOnDay(y,m,day) {
  openTxModal({startDate:`${y}-${p2(m+1)}-${p2(day)}`});
}

function openAddTx() {
  openTxModal({startDate:`${S.year}-${p2(S.month+1)}-${p2(new Date().getDate())}`});
}

function editTx(id) {
  const tx = S.transactions.find(t=>t.id===id);
  if (tx) openTxModal(tx, true);
}

function openTxModal(data={}, editing=false) {
  S.modal = {type:'transaction', editing, data:{...data}};
  const selColor = data.color || PALETTE[8];
  S.modal.data.selectedColor = selColor;

  const catOpts = CATEGORIES.map(c=>
    `<option value="${c.id}" ${c.id===(data.categoryId||'food')?'selected':''}>${c.icon} ${c.label}</option>`
  ).join('');

  const freqOpts = FREQS.map(f=>
    `<option value="${f.id}" ${f.id===(data.frequency||'once')?'selected':''}>${f.label}</option>`
  ).join('');

  const swatches = PALETTE.map(c=>
    `<button class="color-swatch${c===selColor?' selected':''}" style="background:${c}" data-color="${c}" onclick="pickColor('${c}')"></button>`
  ).join('');

  document.getElementById('modal-title').textContent = editing ? 'Edit Transaction' : 'Add Transaction';
  document.getElementById('modal-body').innerHTML = `
    <div class="form-group">
      <label class="form-label">Name</label>
      <input class="form-input" id="f-name" type="text" value="${esc(data.name||'')}" placeholder="e.g. Rent, Netflix, Paycheck…" maxlength="60" />
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Amount ($)</label>
        <input class="form-input" id="f-amount" type="number" min="0.01" step="0.01" value="${data.amount||''}" placeholder="0.00" oninput="updateAnnual()" />
      </div>
      <div class="form-group">
        <label class="form-label">Category</label>
        <select class="form-select" id="f-cat">${catOpts}</select>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Frequency</label>
        <select class="form-select" id="f-freq" onchange="updateAnnual()">${freqOpts}</select>
      </div>
      <div class="form-group">
        <label class="form-label">Start Date</label>
        <input class="form-input" id="f-date" type="date" value="${data.startDate||''}" />
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Color</label>
      <div class="color-palette">
        ${swatches}
        <input class="color-custom" id="f-color" type="color" value="${selColor}" oninput="pickColor(this.value)" />
      </div>
      <div id="annual-display"></div>
    </div>
    <div class="form-group">
      <label class="form-label">Note (optional)</label>
      <input class="form-input" id="f-note" type="text" value="${esc(data.note||'')}" placeholder="Any notes…" maxlength="120" />
    </div>`;

  document.getElementById('modal-delete-btn').style.display = editing ? 'block' : 'none';
  updateAnnual();
  showModal(true);
}

function pickColor(c) {
  if (S.modal) S.modal.data.selectedColor = c;
  document.querySelectorAll('.color-swatch').forEach(s=>s.classList.toggle('selected', s.dataset.color===c));
  const ci = document.getElementById('f-color');
  if (ci) ci.value = c;
}

function updateAnnual() {
  const amt  = parseFloat(document.getElementById('f-amount')?.value)||0;
  const freq = document.getElementById('f-freq')?.value;
  const el   = document.getElementById('annual-display');
  if (!el) return;
  if (freq && freq!=='once' && amt>0) {
    const mult = FREQS.find(f=>f.id===freq)?.mult||1;
    el.innerHTML = `<div class="annual-cost">Annual cost: ~${fmt(amt*mult)}</div>`;
  } else { el.innerHTML=''; }
}

// ── Modal: Goal ────────────────────────────────────────────────────────────────

function openGoalModal(id) {
  const g   = id ? S.goals.find(x=>x.id===id) : null;
  const col = g?.color || PALETTE[4];
  S.modal   = {type:'goal', editing:!!g, data:{...g, selectedColor:col}};

  const swatches = PALETTE.map(c=>
    `<button class="color-swatch${c===col?' selected':''}" style="background:${c}" data-color="${c}" onclick="pickColor('${c}')"></button>`
  ).join('');

  document.getElementById('modal-title').textContent = g ? 'Edit Goal' : 'New Savings Goal';
  document.getElementById('modal-body').innerHTML = `
    <div class="form-group">
      <label class="form-label">Goal Name</label>
      <input class="form-input" id="f-name" type="text" value="${esc(g?.name||'')}" placeholder="e.g. Emergency Fund, Vacation…" />
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Target Amount ($)</label>
        <input class="form-input" id="f-target" type="number" min="1" step="1" value="${g?.target||''}" placeholder="0.00" />
      </div>
      <div class="form-group">
        <label class="form-label">Amount Saved ($)</label>
        <input class="form-input" id="f-saved" type="number" min="0" step="0.01" value="${g?.saved||0}" placeholder="0.00" />
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Target Date</label>
      <input class="form-input" id="f-date" type="date" value="${g?.targetDate||''}" />
    </div>
    <div class="form-group">
      <label class="form-label">Color</label>
      <div class="color-palette">${swatches}<input class="color-custom" id="f-color" type="color" value="${col}" oninput="pickColor(this.value)" /></div>
    </div>`;

  document.getElementById('modal-delete-btn').style.display = g ? 'block' : 'none';
  showModal(true);
}

// ── Modal: Debt ────────────────────────────────────────────────────────────────

function openDebtModal(id) {
  const d   = id ? S.debts.find(x=>x.id===id) : null;
  const col = d?.color || PALETTE[0];
  S.modal   = {type:'debt', editing:!!d, data:{...d, selectedColor:col}};

  const swatches = PALETTE.map(c=>
    `<button class="color-swatch${c===col?' selected':''}" style="background:${c}" data-color="${c}" onclick="pickColor('${c}')"></button>`
  ).join('');

  document.getElementById('modal-title').textContent = d ? 'Edit Debt' : 'Add Debt';
  document.getElementById('modal-body').innerHTML = `
    <div class="form-group">
      <label class="form-label">Debt Name</label>
      <input class="form-input" id="f-name" type="text" value="${esc(d?.name||'')}" placeholder="e.g. Credit Card, Car Loan…" />
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Current Balance ($)</label>
        <input class="form-input" id="f-balance" type="number" min="0" step="0.01" value="${d?.balance||''}" placeholder="0.00" />
      </div>
      <div class="form-group">
        <label class="form-label">Interest Rate (APR %)</label>
        <input class="form-input" id="f-rate" type="number" min="0" step="0.01" value="${d?.rate||''}" placeholder="e.g. 22.99" />
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Monthly Payment ($)</label>
      <input class="form-input" id="f-payment" type="number" min="0" step="0.01" value="${d?.payment||''}" placeholder="0.00" />
    </div>
    <div class="form-group">
      <label class="form-label">Color</label>
      <div class="color-palette">${swatches}<input class="color-custom" id="f-color" type="color" value="${col}" oninput="pickColor(this.value)" /></div>
    </div>`;

  document.getElementById('modal-delete-btn').style.display = d ? 'block' : 'none';
  showModal(true);
}

// ── Modal: save / delete ───────────────────────────────────────────────────────

function modalSave() {
  if (!S.modal) return;
  const t = S.modal.type;
  if      (t==='transaction') saveTx();
  else if (t==='goal')        saveGoal();
  else if (t==='debt')        saveDebt();
}

function modalDelete() {
  if (!S.modal) return;
  const t = S.modal.type;
  if      (t==='transaction') deleteTxConfirm();
  else if (t==='goal')        deleteGoalConfirm();
  else if (t==='debt')        deleteDebtConfirm();
}

function saveTx() {
  const name   = document.getElementById('f-name')?.value.trim();
  const amount = parseFloat(document.getElementById('f-amount')?.value);
  const cat    = document.getElementById('f-cat')?.value;
  const freq   = document.getElementById('f-freq')?.value;
  const date   = document.getElementById('f-date')?.value;
  const note   = document.getElementById('f-note')?.value.trim();
  const color  = S.modal.data.selectedColor || PALETTE[8];
  if (!name||!amount||amount<=0||!date) return;

  const obj = {name,amount,categoryId:cat,frequency:freq,startDate:date,note,color};
  if (S.modal.editing && S.modal.data.id) {
    const i = S.transactions.findIndex(t=>t.id===S.modal.data.id);
    if (i>=0) S.transactions[i]={...S.transactions[i],...obj};
  } else {
    S.transactions.push({id:uid(),...obj});
  }
  save(); showModal(false); render();
}

function deleteTxConfirm() {
  if (!confirm('Delete this transaction?')) return;
  S.transactions = S.transactions.filter(t=>t.id!==S.modal.data.id);
  save(); showModal(false); render();
}

function saveGoal() {
  const name   = document.getElementById('f-name')?.value.trim();
  const target = parseFloat(document.getElementById('f-target')?.value);
  const saved  = parseFloat(document.getElementById('f-saved')?.value)||0;
  const date   = document.getElementById('f-date')?.value;
  const color  = S.modal.data.selectedColor || PALETTE[4];
  if (!name||!target||target<=0||!date) return;

  const obj = {name,target,saved,targetDate:date,color};
  if (S.modal.editing && S.modal.data.id) {
    const i=S.goals.findIndex(g=>g.id===S.modal.data.id);
    if (i>=0) S.goals[i]={...S.goals[i],...obj};
  } else { S.goals.push({id:uid(),...obj}); }
  save(); showModal(false); renderGoals();
}

function deleteGoalConfirm() {
  if (!confirm('Delete this goal?')) return;
  S.goals=S.goals.filter(g=>g.id!==S.modal.data.id);
  save(); showModal(false); renderGoals();
}

function saveDebt() {
  const name    = document.getElementById('f-name')?.value.trim();
  const balance = parseFloat(document.getElementById('f-balance')?.value);
  const rate    = parseFloat(document.getElementById('f-rate')?.value)||0;
  const payment = parseFloat(document.getElementById('f-payment')?.value)||0;
  const color   = S.modal.data.selectedColor || PALETTE[0];
  if (!name||!balance||balance<=0) return;

  const obj = {name,balance,rate,payment,color};
  if (S.modal.editing && S.modal.data.id) {
    const i=S.debts.findIndex(d=>d.id===S.modal.data.id);
    if (i>=0) S.debts[i]={...S.debts[i],...obj};
  } else { S.debts.push({id:uid(),...obj}); }
  save(); showModal(false); renderDebts();
}

function deleteDebtConfirm() {
  if (!confirm('Delete this debt?')) return;
  S.debts=S.debts.filter(d=>d.id!==S.modal.data.id);
  save(); showModal(false); renderDebts();
}

// ── Modal visibility ───────────────────────────────────────────────────────────

function showModal(open) {
  document.getElementById('modal-overlay').classList.toggle('open', open);
  if (open) setTimeout(()=>document.querySelector('#modal-body input')?.focus(), 60);
}

// ── Navigation ─────────────────────────────────────────────────────────────────

function goMonth(m) { S.month=m; render(); }

function prevMonth() {
  S.month--; if(S.month<0){S.month=11;S.year--;} render();
}
function nextMonth() {
  S.month++; if(S.month>11){S.month=0;S.year++;} render();
}
function goToday() {
  const n=new Date(); S.year=n.getFullYear(); S.month=n.getMonth(); render();
}

function toggleFilter(id) {
  if (id==='all') { S.filters=new Set(['all']); }
  else {
    S.filters.delete('all');
    S.filters.has(id) ? S.filters.delete(id) : S.filters.add(id);
    if (!S.filters.size) S.filters.add('all');
  }
  renderFilterBar(); renderCalendar(); renderSummary(); renderUpcoming(); renderAnalysis();
}

function switchView(v) {
  S.view=v;
  document.querySelectorAll('.view').forEach(el=>el.classList.toggle('active', el.id==='view-'+v));
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.toggle('active', b.dataset.view===v));
  if (v==='goals')  renderGoals();
  if (v==='debts')  renderDebts();
  if (v==='trends') renderTrends();
}

// ── Export ─────────────────────────────────────────────────────────────────────

function exportData() {
  const blob = new Blob([JSON.stringify({transactions:S.transactions,goals:S.goals,debts:S.debts},null,2)], {type:'application/json'});
  const a    = Object.assign(document.createElement('a'), {href:URL.createObjectURL(blob), download:`budget-${new Date().toISOString().slice(0,10)}.json`});
  a.click(); URL.revokeObjectURL(a.href);
}

// ── Notifications ──────────────────────────────────────────────────────────────

function checkNotifications() {
  if (!('Notification' in window) || Notification.permission==='denied') return;
  if (Notification.permission==='default') { Notification.requestPermission(); return; }

  const today    = new Date(); today.setHours(0,0,0,0);
  const notified = new Set(JSON.parse(localStorage.getItem('bb-notified')||'[]'));
  const fresh    = [];

  for (let offset=0; offset<=2; offset++) {
    const d  = new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset);
    const ds = dstr(d);
    S.transactions.forEach(tx => {
      if (getCat(tx.categoryId).type!=='expense') return;
      const key = tx.id+ds;
      if (notified.has(key)) return;
      if (occurrences(tx, d.getFullYear(), d.getMonth()).includes(ds)) {
        const when = offset===0?'today':offset===1?'tomorrow':'in 2 days';
        new Notification('VantagePoint — Bill Due', {body:`${tx.name}: ${fmt(tx.amount)} due ${when}`});
        fresh.push(key);
      }
    });
  }

  if (fresh.length) {
    localStorage.setItem('bb-notified', JSON.stringify([...notified,...fresh].slice(-200)));
  }
}

// ── Main render ────────────────────────────────────────────────────────────────

function render() {
  renderMonthStrip();
  renderFilterBar();
  renderSummary();
  renderCalendar();
  renderUpcoming();
  renderAnalysis();
}

// ── Init ───────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  load();

  document.getElementById('prev-month').addEventListener('click', prevMonth);
  document.getElementById('next-month').addEventListener('click', nextMonth);
  document.getElementById('today-btn').addEventListener('click', goToday);
  document.getElementById('add-tx-btn').addEventListener('click', openAddTx);
  document.getElementById('export-btn').addEventListener('click', exportData);
  document.getElementById('add-goal-btn').addEventListener('click', ()=>openGoalModal());
  document.getElementById('add-debt-btn').addEventListener('click', ()=>openDebtModal());

  document.getElementById('search-input').addEventListener('input', e => {
    S.search = e.target.value.toLowerCase().trim();
    renderCalendar(); renderSummary(); renderUpcoming(); renderAnalysis();
  });

  document.querySelectorAll('.nav-btn[data-view]').forEach(b => {
    b.addEventListener('click', ()=>switchView(b.dataset.view));
  });

  document.getElementById('modal-overlay').addEventListener('click', e => {
    if (e.target===document.getElementById('modal-overlay')) showModal(false);
  });
  document.addEventListener('keydown', e=>{ if(e.key==='Escape') showModal(false); });

  checkNotifications();
  render();
});
