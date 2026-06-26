// ── Constants ──────────────────────────────────────────────────────────────────

const PALETTE = [
  '#ef4444','#f97316','#f59e0b','#eab308','#22c55e',
  '#10b981','#06b6d4','#3b82f6','#6366f1','#8b5cf6',
  '#a855f7','#ec4899','#14b8a6','#84cc16','#0ea5e9',
];

// Fixed per-category colors, Apple Card-inspired (Apple system palette).
// Food→orange, Shopping→magenta, Transport→blue, Other→gray, etc.
const CATEGORY_COLORS = {
  salary:        '#34C759', // green
  freelance:     '#30D158', // green
  investment:    '#00C7BE', // mint
  other_income:  '#63E6BE', // light mint
  housing:       '#5856D6', // indigo
  grocery:       '#30D158', // green   (Apple Card: Grocery)
  food:          '#FF9500', // orange  (Apple Card: Food & Drink)
  shopping:      '#AF52DE', // magenta (Apple Card: Shopping)
  entertainment: '#FF2D55', // pink    (Apple Card: Entertainment)
  streaming:     '#FF375F', // pink-red
  travel:        '#64D2FF', // light cyan (Apple Card: Travel)
  transport:     '#007AFF', // blue    (Apple Card: Transportation)
  auto:          '#A2845E', // brown   (Apple Card: Auto)
  health:        '#FF453A', // red     (Apple Card: Health & Wellness)
  personal_care: '#FF6482', // rose
  fitness:       '#30B0C7', // teal
  utilities:     '#FFCC00', // yellow  (Apple Card: Bills & Utilities)
  subscriptions: '#BF5AF2', // purple
  education:     '#5AC8FA', // light blue
  other:         '#8E8E93', // gray    (Apple Card: Other)
};

// Apple system palette for custom categories (stable hash, never random)
const APPLE_PALETTE = [
  '#FF9500','#FF2D55','#AF52DE','#5856D6','#007AFF',
  '#32ADE6','#30B0C7','#00C7BE','#34C759','#FFCC00',
  '#FF453A','#A2845E','#BF5AF2','#5AC8FA','#8E8E93',
];

function catColor(id) {
  if (CATEGORY_COLORS[id]) return CATEGORY_COLORS[id];
  let h = 0;
  for (let i = 0; i < String(id).length; i++) h = (h * 31 + String(id).charCodeAt(i)) >>> 0;
  return APPLE_PALETTE[h % APPLE_PALETTE.length];
}

// Conic-gradient ring that fades smoothly between segment colors instead of
// hard breaks. Each segment keeps a solid core; boundaries blend over ~5°.
function buildDonutGradient(segments) {
  const total = segments.reduce((s, sg) => s + sg.v, 0);
  if (!total) return 'var(--surface3)';
  const stops = [];
  let angle = 0;
  segments.forEach(sg => {
    const span = sg.v / total * 360;
    const f = Math.min(5, span / 2);   // blend band half-width
    stops.push(`${sg.c} ${(angle + f).toFixed(2)}deg`);
    stops.push(`${sg.c} ${(angle + span - f).toFixed(2)}deg`);
    angle += span;
  });
  // Close the seam smoothly back into the first color
  stops.push(`${segments[0].c} 360deg`);
  return `conic-gradient(from -90deg, ${stops.join(', ')})`;
}

const CATEGORIES = [
  { id:'salary',        label:'Salary',         icon:'💰', type:'income'  },
  { id:'freelance',     label:'Freelance',       icon:'💼', type:'income'  },
  { id:'investment',    label:'Investment',      icon:'📈', type:'income'  },
  { id:'other_income',  label:'Other Income',    icon:'📥', type:'income'  },
  { id:'housing',       label:'Housing / Rent',   icon:'🏠', type:'expense' },
  { id:'grocery',       label:'Grocery',          icon:'🛒', type:'expense' },
  { id:'food',          label:'Food & Drink',     icon:'🍔', type:'expense' },
  { id:'shopping',      label:'Shopping',         icon:'🛍️', type:'expense' },
  { id:'entertainment', label:'Entertainment',    icon:'🎬', type:'expense' },
  { id:'streaming',     label:'Streaming',        icon:'📺', type:'expense' },
  { id:'travel',        label:'Travel',           icon:'✈️', type:'expense' },
  { id:'transport',     label:'Transportation',   icon:'🚗', type:'expense' },
  { id:'auto',          label:'Auto',             icon:'🚙', type:'expense' },
  { id:'health',        label:'Health & Wellness',icon:'💊', type:'expense' },
  { id:'personal_care', label:'Personal Care',    icon:'💅', type:'expense' },
  { id:'fitness',       label:'Fitness',          icon:'💪', type:'expense' },
  { id:'utilities',     label:'Bills & Utilities',icon:'⚡', type:'expense' },
  { id:'subscriptions', label:'Subscriptions',    icon:'📱', type:'expense' },
  { id:'education',     label:'Education',         icon:'📚', type:'expense' },
  { id:'other',         label:'Other',            icon:'📌', type:'expense' },
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

const BANK_PRESETS = {
  'Chase':            { date:'Transaction Date', desc:'Description', amt:'Amount',  negate:false },
  'Bank of America':  { date:'Date',             desc:'Description', amt:'Amount',  negate:false },
  'Wells Fargo':      { date:'Date',             desc:'Description', amt:'Amount',  negate:true  },
  'Capital One':      { date:'Transaction Date', desc:'Description', debit:'Debit', credit:'Credit' },
  'Citi':             { date:'Date',             desc:'Description', debit:'Debit', credit:'Credit' },
  'American Express': { date:'Date',             desc:'Description', amt:'Amount',  negate:true  },
  'Discover':         { date:'Trans. Date',      desc:'Description', amt:'Amount',  negate:true  },
  'US Bank':          { date:'Date',             desc:'Name',        amt:'Amount',  negate:false },
};

// ── State ──────────────────────────────────────────────────────────────────────

const PERSONS = [
  { id: 'A', label: 'Person A', color: '#3b82f6' },
  { id: 'B', label: 'Person B', color: '#a855f7' },
];

// Cloud sync state — stored separately from financial data
const SYNC = {
  clientId:    '',
  fileId:      '',
  token:       '',
  tokenExpiry: 0,
  tokenClient: null,
  status:      'idle',  // idle | connecting | syncing | synced | error
  lastSynced:  null,
  timer:       null,
};

const ACCOUNT_TYPES = {
  checking:    { label: 'Checking',    icon: '🏦' },
  savings:     { label: 'Savings',     icon: '💰' },
  investment:  { label: 'Investment',  icon: '📈' },
  retirement:  { label: 'Retirement',  icon: '🏦' },
  property:    { label: 'Property',    icon: '🏠' },
  crypto:      { label: 'Crypto',      icon: '₿'  },
  other_asset: { label: 'Other Asset', icon: '💎' },
  liability:   { label: 'Liability',   icon: '💳' },
};

const S = {
  view: 'calendar',
  year: new Date().getFullYear(),
  month: new Date().getMonth(),
  search: '',
  filters: new Set(['all']),
  activePerson: 'all',
  transactions: [],
  goals: [],
  debts: [],
  budgets: {},
  customCategories: [],
  persons: { A: 'Person A', B: 'Person B' },
  importMappings: {},
  vendorSearch: '',
  vendorSort: 'amount',
  vendorRules: {},
  incomeSettings: { A: {hourlyRate: 0, expectedHours: 0}, B: {hourlyRate: 0, expectedHours: 0} },
  paidBills: {},
  accounts: [],
  netWorthHistory: [],
  trendsMonths: 6,
  showYoY: false,
  modal: null,
};

// ── Persistence ────────────────────────────────────────────────────────────────

function load() {
  try {
    const d = JSON.parse(localStorage.getItem('bb2') || '{}');
    S.transactions      = d.transactions      || [];
    S.goals             = d.goals             || [];
    S.debts             = d.debts             || [];
    S.budgets           = d.budgets           || {};
    S.customCategories  = d.customCategories  || [];
    S.persons           = d.persons           || { A: 'Person A', B: 'Person B' };
    S.importMappings    = d.importMappings    || {};
    S.vendorRules       = d.vendorRules       || {};
    S.incomeSettings    = d.incomeSettings    || { A: {hourlyRate:0, expectedHours:0}, B: {hourlyRate:0, expectedHours:0} };
    S.paidBills         = d.paidBills         || {};
    S.accounts          = d.accounts          || [];
    S.netWorthHistory   = d.netWorthHistory   || [];
    // Migrate: existing transactions default to person A
    S.transactions.forEach(tx => { if (!tx.person) tx.person = 'A'; });
  } catch {}
}

function save() {
  localStorage.setItem('bb2', JSON.stringify({
    transactions: S.transactions, goals: S.goals, debts: S.debts,
    budgets: S.budgets, customCategories: S.customCategories,
    persons: S.persons, importMappings: S.importMappings,
    vendorRules: S.vendorRules, incomeSettings: S.incomeSettings,
    paidBills: S.paidBills, accounts: S.accounts,
    netWorthHistory: S.netWorthHistory, lastModified: Date.now(),
  }));
  scheduleSyncToGoogle();
  fireBudgetAlerts();
}

const ALERTED_BUDGETS = new Set(); // session-only: tracks thresholds already toasted

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

function cats() { return [...CATEGORIES, ...S.customCategories]; }

function getCat(id) { return cats().find(c=>c.id===id) || CATEGORIES[CATEGORIES.length-1]; }

// Returns [{categoryId, amount}] — expands splits when present
function txBreakdowns(tx) {
  if (tx.splits && tx.splits.length) return tx.splits;
  return [{ categoryId: tx.categoryId, amount: tx.amount }];
}

function textColor(hex) {
  const r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16);
  return (r*299+g*587+b*114)/1000 > 145 ? '#111' : '#fff';
}

// ── Recurrence engine ──────────────────────────────────────────────────────────

function occurrences(tx, year, month) {
  const start  = new Date(tx.startDate + 'T00:00:00');
  const mStart = new Date(year, month, 1);
  let   mEnd   = new Date(year, month+1, 0);
  if (start > mEnd) return [];

  if (tx.endDate) {
    const endD = new Date(tx.endDate + 'T00:00:00');
    if (endD < mStart) return [];
    if (endD < mEnd) mEnd = endD;
  }

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
    if (S.activePerson !== 'all') {
      if (S.activePerson === 'joint') { if (tx.person !== 'joint') return false; }
      else if (tx.person !== S.activePerson && tx.person !== 'joint') return false;
    }
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
  cats().forEach(c => {
    const on = !allActive && S.filters.has(c.id);
    html += `<button class="filter-chip${on?' active':''}" onclick="toggleFilter('${c.id}')">${c.icon} ${c.label}</button>`;
  });
  document.getElementById('filter-bar').innerHTML = html;
}

function renderSummary() {
  const evs = applyFilters(monthEvents(S.year, S.month));
  let income=0, expenses=0;
  evs.forEach(({tx}) => {
    txBreakdowns(tx).forEach(({categoryId, amount}) => {
      getCat(categoryId).type==='income' ? income+=amount : expenses+=amount;
    });
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

  const filteredTx = S.transactions.filter(tx => {
    if (!S.filters.has('all') && !S.filters.has(tx.categoryId)) return false;
    if (S.activePerson !== 'all') {
      if (S.activePerson === 'joint') return tx.person === 'joint';
      return tx.person === S.activePerson || tx.person === 'joint';
    }
    return true;
  });

  for (let offset = 0; offset <= 30; offset++) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset);
    const ds = dstr(d);
    filteredTx.forEach(tx => {
      const key = tx.id + ds;
      if (seen.has(key)) return;
      if (occurrences(tx, d.getFullYear(), d.getMonth()).includes(ds)) {
        seen.add(key);
        items.push({date: ds, tx, offset});
      }
    });
  }

  const el = document.getElementById('upcoming-list');
  if (!items.length) { el.innerHTML = '<div class="empty-sm">No bills in the next 30 days.</div>'; return; }

  const totalDue = items.reduce((s, {tx}) => getCat(tx.categoryId).type === 'expense' ? s + tx.amount : s, 0);

  const groups = [
    {label: 'Today',     items: items.filter(i => i.offset === 0)},
    {label: 'Tomorrow',  items: items.filter(i => i.offset === 1)},
    {label: 'This Week', items: items.filter(i => i.offset >= 2 && i.offset <= 6)},
    {label: 'Next Week', items: items.filter(i => i.offset >= 7 && i.offset <= 13)},
    {label: 'Later',     items: items.filter(i => i.offset >= 14)},
  ].filter(g => g.items.length);

  el.innerHTML = `
    <div class="upcoming-total-row">
      <span style="color:var(--muted);font-size:10px;text-transform:uppercase;letter-spacing:.5px">Due in 30 days</span>
      <span class="expense-text" style="font-weight:700;font-size:12px">${fmt(totalDue)}</span>
    </div>
    ${groups.map(g => `
      <div class="upcoming-group-lbl">${g.label}</div>
      ${g.items.map(({date, tx}) => {
        const cat  = getCat(tx.categoryId);
        const col  = tx.color || PALETTE[8];
        const ds   = new Date(date + 'T00:00:00').toLocaleDateString('en-US', {month:'short', day:'numeric'});
        const sign = cat.type === 'income';
        const paid = (S.paidBills[tx.id] || []).includes(date);
        return `<div class="upcoming-item${paid ? ' upcoming-paid' : ''}" onclick="editTx('${tx.id}')">
          <div class="upcoming-color" style="background:${col}"></div>
          <div class="upcoming-info">
            <div class="upcoming-name">${esc(tx.name)}</div>
            <div class="upcoming-meta">${ds}</div>
          </div>
          <div class="upcoming-amt ${sign ? 'income-text' : 'expense-text'}">${sign ? '+' : '-'}${fmt(tx.amount)}</div>
          <button class="upcoming-check-btn${paid ? ' paid' : ''}" onclick="event.stopPropagation();togglePaidBill('${tx.id}','${date}')" title="${paid ? 'Mark unpaid' : 'Mark paid'}">✓</button>
        </div>`;
      }).join('')}`).join('')}`;
}

function togglePaidBill(txId, date) {
  if (!S.paidBills[txId]) S.paidBills[txId] = [];
  const arr = S.paidBills[txId];
  const idx = arr.indexOf(date);
  if (idx >= 0) arr.splice(idx, 1); else arr.push(date);
  save();
  renderUpcoming();
}

function buildDonutSVG(segments, size = 84, sw = 14) {
  const total = segments.reduce((s, sg) => s + sg.v, 0);
  if (!total) return `<svg width="${size}" height="${size}"><circle cx="${size/2}" cy="${size/2}" r="${(size-sw)/2}" fill="none" stroke="var(--border)" stroke-width="${sw}"/></svg>`;
  const r = (size - sw) / 2, circ = 2 * Math.PI * r;
  let off = 0;
  const arcs = segments.map(sg => {
    const pct  = sg.v / total;
    const arc  = `<circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="${sg.c}" stroke-width="${sw}" stroke-dasharray="${(pct*circ).toFixed(2)} ${circ.toFixed(2)}" stroke-dashoffset="${(-off*circ).toFixed(2)}" transform="rotate(-90 ${size/2} ${size/2})"/>`;
    off += pct;
    return arc;
  });
  return `<svg width="${size}" height="${size}" style="display:block">${arcs.join('')}</svg>`;
}

function renderAnalysis() {
  const evs = applyFilters(monthEvents(S.year, S.month));
  let income=0, expenses=0;
  const catTotals={}, catColors={};

  evs.forEach(({tx}) => {
    txBreakdowns(tx).forEach(({categoryId, amount}) => {
      const cat = getCat(categoryId);
      if (cat.type==='income') { income+=amount; }
      else {
        expenses+=amount;
        catTotals[categoryId] = (catTotals[categoryId]||0)+amount;
        if (!catColors[categoryId]) catColors[categoryId]=catColor(categoryId);
      }
    });
  });

  const sorted = Object.entries(catTotals).sort((a,b)=>b[1]-a[1]).slice(0,8);

  // Donut chart from top 6 categories
  const donutSegs = sorted.slice(0,6).map(([id,v]) => ({v, c: catColors[id] || PALETTE[8]}));
  const donutHtml = sorted.length ? `
    <div class="donut-row">
      <div class="donut-chart">${buildDonutSVG(donutSegs)}</div>
      <div class="donut-legend">${sorted.slice(0,6).map(([id,amt])=>{
        const cat=getCat(id), pct=expenses>0?Math.round(amt/expenses*100):0;
        return `<div class="donut-legend-item">
          <span class="donut-legend-dot" style="background:${catColors[id]||PALETTE[8]}"></span>
          <span class="donut-legend-lbl">${cat.icon} ${cat.label}</span>
          <span class="donut-legend-pct">${pct}%</span>
        </div>`;
      }).join('')}</div>
    </div>` : '';

  const breakdownHtml = sorted.map(([id,amt]) => {
    const cat    = getCat(id);
    const budget = S.budgets[id];
    const col    = catColors[id] || PALETTE[8];

    let barPct, barColor, valCls;
    if (budget) {
      const bPct = (amt / budget) * 100;
      barPct   = Math.min(bPct, 100);
      barColor = bPct >= 90 ? '#ef4444' : bPct >= 70 ? '#f59e0b' : '#22c55e';
      valCls   = bPct >= 90 ? 'expense-text' : bPct >= 70 ? 'warn-text' : 'income-text';
    } else {
      barPct   = income > 0 ? Math.min(Math.round(amt/income*100), 100) : 0;
      barColor = col;
      valCls   = '';
    }

    const capHtml = budget ? `<div class="budget-cap">/ ${fmt(budget)}</div>` : '';

    return `<div class="breakdown-row">
      <div>${cat.icon} ${cat.label}</div>
      <div class="breakdown-bar-wrap"><div class="breakdown-bar" style="width:${barPct}%;background:${barColor}"></div></div>
      <div class="breakdown-val ${valCls}">${fmt(amt)}${capHtml}</div>
    </div>`;
  }).join('') || '<div class="empty-sm">No expense data.</div>';

  // Budget overview: show unspent budgets too
  const budgetedCats = Object.keys(S.budgets);
  const unspentBudgets = budgetedCats
    .filter(id => !catTotals[id])
    .map(id => {
      const cat = getCat(id);
      return `<div class="breakdown-row">
        <div>${cat.icon} ${cat.label}</div>
        <div class="breakdown-bar-wrap"><div class="breakdown-bar" style="width:0%;background:#22c55e"></div></div>
        <div class="breakdown-val income-text">${fmt(0)}<div class="budget-cap">/ ${fmt(S.budgets[id])}</div></div>
      </div>`;
    }).join('');

  const totalBudgeted = budgetedCats.reduce((s,id) => s + (S.budgets[id]||0), 0);
  const totalSpentBudgeted = budgetedCats.reduce((s,id) => s + (catTotals[id]||0), 0);
  const budgetSummaryHtml = totalBudgeted > 0 ? `
    <div class="budget-summary-row">
      <span>${fmt(totalSpentBudgeted)} spent</span>
      <span class="budget-summary-bar-wrap"><span class="budget-summary-bar" style="width:${Math.min(totalSpentBudgeted/totalBudgeted*100,100).toFixed(1)}%;background:${totalSpentBudgeted/totalBudgeted>=.9?'#ef4444':totalSpentBudgeted/totalBudgeted>=.7?'#f59e0b':'#22c55e'}"></span></span>
      <span style="color:var(--muted)">${fmt(totalBudgeted)} budgeted</span>
    </div>` : '';

  // Tips always reflect the full month, not the active filter
  const fullEvs = monthEvents(S.year, S.month);
  let fullIncome=0, fullExpenses=0;
  const fullCatTotals={};
  fullEvs.forEach(({tx}) => {
    txBreakdowns(tx).forEach(({categoryId, amount}) => {
      const cat = getCat(categoryId);
      if (cat.type==='income') fullIncome+=amount;
      else { fullExpenses+=amount; fullCatTotals[categoryId]=(fullCatTotals[categoryId]||0)+amount; }
    });
  });
  const tips = buildTips(fullIncome, fullExpenses, fullCatTotals);

  document.getElementById('analysis-panel').innerHTML = `
    <div class="panel-title">Spending Breakdown</div>
    ${donutHtml}
    ${budgetSummaryHtml}
    <div class="panel-section">${breakdownHtml}${unspentBudgets}</div>
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

// ── Net Worth Tracker ──────────────────────────────────────────────────────────

function netWorthTotal() {
  const assets = S.accounts.filter(a => a.type !== 'liability').reduce((s, a) => s + a.balance, 0);
  const manualLiab = S.accounts.filter(a => a.type === 'liability').reduce((s, a) => s + a.balance, 0);
  const debtLiab = S.debts.reduce((s, d) => s + d.balance, 0);
  return assets - manualLiab - debtLiab;
}

function snapshotNetWorth() {
  const today = new Date().toISOString().slice(0, 10);
  const nw = netWorthTotal();
  const last = S.netWorthHistory[S.netWorthHistory.length - 1];
  if (!last || last.date !== today) {
    S.netWorthHistory.push({ date: today, netWorth: nw });
    if (S.netWorthHistory.length > 365) S.netWorthHistory = S.netWorthHistory.slice(-365);
    save();
  }
}

function buildNetWorthChart() {
  const history = S.netWorthHistory.slice(-24);
  if (history.length < 2) return `<div class="nw-chart-placeholder">Add accounts and revisit each month to build your net worth history chart.</div>`;

  const vals = history.map(h => h.netWorth);
  const min = Math.min(...vals), max = Math.max(...vals);
  const range = max - min || 1;
  const W = 560, H = 80, pad = 8;

  const pts = history.map((h, i) => {
    const x = pad + (i / (history.length - 1)) * (W - pad * 2);
    const y = H - pad - ((h.netWorth - min) / range) * (H - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  const last = vals[vals.length - 1], first = vals[0];
  const change = last - first;
  const col = last >= 0 ? 'var(--income)' : 'var(--expense)';
  const dots = history.map((h, i) => {
    const x = pad + (i / (history.length - 1)) * (W - pad * 2);
    const y = H - pad - ((h.netWorth - min) / range) * (H - pad * 2);
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3" fill="${col}" title="${h.date}: ${fmt(h.netWorth)}"/>`;
  }).join('');

  return `<div class="nw-chart-wrap">
    <div class="nw-chart-lbl">Net Worth Trend · ${history.length} snapshots</div>
    <svg viewBox="0 0 ${W} ${H}" style="width:100%;height:80px;overflow:visible">
      <polyline points="${pts}" fill="none" stroke="${col}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
      ${dots}
    </svg>
    <div class="nw-chart-labels">
      <span>${history[0].date}</span><span>${history[history.length-1].date}</span>
    </div>
    <div class="nw-chart-change ${change>=0?'income-text':'expense-text'}">${change>=0?'▲':'▼'} ${fmt(Math.abs(change))} since first snapshot</div>
  </div>`;
}

function renderNetWorth() {
  snapshotNetWorth();
  const el = document.getElementById('networth-content');
  if (!el) return;

  const assets    = S.accounts.filter(a => a.type !== 'liability');
  const manualLiab = S.accounts.filter(a => a.type === 'liability');
  const totalAssets = assets.reduce((s, a) => s + a.balance, 0);
  const totalManualLiab = manualLiab.reduce((s, a) => s + a.balance, 0);
  const totalDebtLiab = S.debts.reduce((s, d) => s + d.balance, 0);
  const totalLiab = totalManualLiab + totalDebtLiab;
  const nw = totalAssets - totalLiab;

  const acctRow = (a, isAuto) => `
    <div class="nw-row" style="border-left-color:${a.color||PALETTE[4]}">
      <div class="nw-row-icon">${(ACCOUNT_TYPES[a.type]||ACCOUNT_TYPES.other_asset).icon}</div>
      <div class="nw-row-name">${esc(a.name)}</div>
      <div class="nw-row-type muted">${(ACCOUNT_TYPES[a.type]||{label:a.type}).label}</div>
      <div class="nw-row-bal ${a.type==='liability'?'expense-text':'income-text'}">${fmt(a.balance)}</div>
      <div class="nw-row-actions">${isAuto
        ? '<span class="muted" style="font-size:10px">from Debts</span>'
        : `<button class="btn-icon" onclick="openAccountModal('${a.id}')">✏️</button><button class="btn-icon" onclick="deleteAccount('${a.id}')">🗑️</button>`
      }</div>
    </div>`;

  el.innerHTML = `
    <div class="nw-summary-row">
      <div class="nw-card nw-total">
        <div class="nw-card-label">Net Worth</div>
        <div class="nw-card-val ${nw>=0?'income-text':'expense-text'}">${fmt(nw)}</div>
      </div>
      <div class="nw-card">
        <div class="nw-card-label">Total Assets</div>
        <div class="nw-card-val income-text">${fmt(totalAssets)}</div>
      </div>
      <div class="nw-card">
        <div class="nw-card-label">Total Liabilities</div>
        <div class="nw-card-val expense-text">${fmt(totalLiab)}</div>
      </div>
    </div>
    ${buildNetWorthChart()}
    <div class="nw-sections">
      <div class="nw-section">
        <div class="nw-section-hdr"><span>Assets</span><span class="income-text">${fmt(totalAssets)}</span></div>
        ${assets.length ? assets.map(a => acctRow(a, false)).join('') : '<div class="nw-empty">No assets yet.</div>'}
        <button class="btn btn-ghost btn-sm nw-add-btn" onclick="openAccountModal(null,'checking')">＋ Add Asset</button>
      </div>
      <div class="nw-section">
        <div class="nw-section-hdr"><span>Liabilities</span><span class="expense-text">${fmt(totalLiab)}</span></div>
        ${manualLiab.map(a => acctRow(a, false)).join('')}
        ${S.debts.map(d => acctRow({id:d.id, name:d.name, balance:d.balance, color:d.color, type:'liability'}, true)).join('')}
        ${!manualLiab.length && !S.debts.length ? '<div class="nw-empty">No liabilities yet.</div>' : ''}
        <button class="btn btn-ghost btn-sm nw-add-btn" onclick="openAccountModal(null,'liability')">＋ Add Liability</button>
      </div>
    </div>`;
}

function openAccountModal(id, defaultType = 'checking') {
  const a = id ? S.accounts.find(x => x.id === id) : null;
  const col = a?.color || PALETTE[4];
  S.modal = { type: 'account', editing: !!a, data: { ...(a || {}), selectedColor: col } };

  const swatches = PALETTE.map(c =>
    `<button class="color-swatch${c===col?' selected':''}" style="background:${c}" data-color="${c}" onclick="pickColor('${c}')"></button>`
  ).join('');

  const selType = a?.type || defaultType;
  document.getElementById('modal-title').textContent = a ? 'Edit Account' : 'Add Account';
  document.getElementById('modal-body').innerHTML = `
    <div class="form-group">
      <label class="form-label">Account Name</label>
      <input class="form-input" id="f-name" type="text" value="${esc(a?.name||'')}" placeholder="e.g. Chase Checking, Vanguard 401k…" />
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Type</label>
        <select class="form-select" id="f-acct-type">
          ${Object.entries(ACCOUNT_TYPES).map(([k,v])=>`<option value="${k}"${k===selType?' selected':''}>${v.icon} ${v.label}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Balance ($)</label>
        <input class="form-input" id="f-amount" type="number" step="0.01" value="${a?.balance??''}" placeholder="0.00" />
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Color</label>
      <div class="color-palette">${swatches}</div>
    </div>`;
  document.getElementById('modal-delete-btn').style.display = a ? 'block' : 'none';
  document.getElementById('modal-save-btn').textContent = 'Save';
  showModal(true);
}

function deleteAccount(id) {
  if (!confirm('Delete this account?')) return;
  S.accounts = S.accounts.filter(a => a.id !== id);
  save(); renderNetWorth();
}

// ── Render: Trends ─────────────────────────────────────────────────────────────

function renderTrends() {
  const n    = S.trendsMonths || 6;
  const now  = new Date();
  const data = [];
  for (let i=n-1; i>=0; i--) {
    let y=now.getFullYear(), m=now.getMonth()-i;
    while(m<0){m+=12;y--;}
    const evs=applyFilters(monthEvents(y,m));
    let inc=0,exp=0;
    evs.forEach(({tx})=>{
      txBreakdowns(tx).forEach(({categoryId,amount})=>{
        getCat(categoryId).type==='income' ? inc+=amount : exp+=amount;
      });
    });
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

  renderCategoryTrends(data);
  renderYoYSection();
  renderIncomeProjection();
}

// ── Render: Category Trends ────────────────────────────────────────────────────

function renderCategoryTrends(data) {
  const el = document.getElementById('cat-trends');
  if (!el) return;

  const catData = {};
  data.forEach(({month: m, year: y}, idx) => {
    applyFilters(monthEvents(y, m)).forEach(({tx}) => {
      txBreakdowns(tx).forEach(({categoryId, amount}) => {
        if (getCat(categoryId).type !== 'expense') return;
        if (!catData[categoryId]) catData[categoryId] = new Array(data.length).fill(0);
        catData[categoryId][idx] += amount;
      });
    });
  });

  const rows = Object.entries(catData)
    .map(([id, totals]) => ({cat: getCat(id), totals, total: totals.reduce((s,v)=>s+v,0)}))
    .filter(r => r.total > 0)
    .sort((a, b) => b.total - a.total);

  if (!rows.length) { el.innerHTML = '<div class="muted" style="padding:8px 0;font-size:12px">No expense data.</div>'; return; }

  const maxVal = Math.max(...rows.flatMap(r => r.totals), 1);
  const nowY   = new Date().getFullYear();

  el.innerHTML = `<div style="overflow-x:auto"><table class="cat-trends-table">
    <thead><tr><th>Category</th>${data.map(d=>`<th>${d.label}${d.year!==nowY?' '+d.year:''}</th>`).join('')}<th>Total</th></tr></thead>
    <tbody>${rows.map(r => `<tr>
      <td class="cat-trends-name">${r.cat.icon} ${r.cat.label}</td>
      ${r.totals.map(v => `<td>
        <div class="cat-trends-bar-cell">
          <div class="cat-trends-bar" style="width:${Math.round(v/maxVal*56)}px;background:var(--expense);opacity:${v>0?.75:.15}"></div>
          <span class="${v>0?'':'cat-trends-zero'}">${v>0?fmt(v):'—'}</span>
        </div></td>`).join('')}
      <td class="expense-text" style="font-weight:700">${fmt(r.total)}</td>
    </tr>`).join('')}
    </tbody></table></div>`;
}

// ── Render: Year-over-Year ─────────────────────────────────────────────────────

function renderYoYSection() {
  const el = document.getElementById('yoy-section');
  const btn = document.getElementById('yoy-btn');
  if (!el) return;
  if (btn) btn.classList.toggle('active', S.showYoY);
  if (!S.showYoY) { el.innerHTML = ''; return; }

  const now = new Date();
  const cy = now.getFullYear(), py = cy - 1;
  const months = [];
  for (let m = 0; m < 12; m++) {
    const cEvs = applyFilters(monthEvents(cy, m));
    const pEvs = applyFilters(monthEvents(py, m));
    let cExp=0, pExp=0, cInc=0, pInc=0;
    cEvs.forEach(({tx})=>{ txBreakdowns(tx).forEach(({categoryId,amount})=>{ getCat(categoryId).type==='income'?cInc+=amount:cExp+=amount; }); });
    pEvs.forEach(({tx})=>{ txBreakdowns(tx).forEach(({categoryId,amount})=>{ getCat(categoryId).type==='income'?pInc+=amount:pExp+=amount; }); });
    months.push({label:SHORT[m], cExp, pExp, cInc, pInc});
  }

  const maxExp = Math.max(...months.flatMap(m=>[m.cExp,m.pExp]), 1);
  const cTotExp = months.reduce((s,m)=>s+m.cExp,0);
  const pTotExp = months.reduce((s,m)=>s+m.pExp,0);
  const diff = cTotExp - pTotExp;

  el.innerHTML = `
    <div class="trends-section-label" style="margin-top:16px">Year-over-Year: Expenses</div>
    <div class="yoy-legend">
      <span class="legend-dot" style="background:#3b82f6"></span>${cy}
      <span class="legend-dot" style="background:#6b7280"></span>${py}
      <span style="margin-left:8px" class="${diff<=0?'income-text':'expense-text'}">${diff<=0?'▼':'▲'} ${fmt(Math.abs(diff))} vs prior year</span>
    </div>
    <div class="trends-chart">
      ${months.map(m=>{
        const cH=Math.round(m.cExp/maxExp*160), pH=Math.round(m.pExp/maxExp*160);
        return `<div class="trend-col">
          <div class="trend-bars" style="gap:3px">
            <div class="trend-bar" style="height:${cH}px;background:#3b82f6;width:14px" title="${cy}: ${fmt(m.cExp)}"></div>
            <div class="trend-bar" style="height:${pH}px;background:#6b7280;width:14px" title="${py}: ${fmt(m.pExp)}"></div>
          </div>
          <div class="trend-lbl">${m.label}</div>
        </div>`;
      }).join('')}
    </div>
    <div class="trends-table" style="margin-top:12px">
      <table>
        <thead><tr><th>Month</th><th>${cy} Exp</th><th>${py} Exp</th><th>Δ</th><th>${cy} Inc</th><th>${py} Inc</th></tr></thead>
        <tbody>${months.map(m=>{
          const d=m.cExp-m.pExp;
          return `<tr>
            <td>${m.label}</td>
            <td class="expense-text">${fmt(m.cExp)}</td>
            <td class="expense-text">${fmt(m.pExp)}</td>
            <td class="${d<=0?'income-text':'expense-text'}">${d<=0?'▼':'▲'}${fmt(Math.abs(d))}</td>
            <td class="income-text">${fmt(m.cInc)}</td>
            <td class="income-text">${fmt(m.pInc)}</td>
          </tr>`;
        }).join('')}</tbody>
      </table>
    </div>`;
}

function setTrendsRange(n) {
  S.trendsMonths = n;
  document.querySelectorAll('.trend-pill').forEach(b => b.classList.toggle('active', +b.dataset.months === n));
  renderTrends();
}

function toggleYoY() {
  S.showYoY = !S.showYoY;
  renderYoYSection();
}

function renderIncomeProjection() {
  const container = document.getElementById('income-projection');
  if (!container) return;

  const personsToShow = S.activePerson === 'all'
    ? PERSONS
    : PERSONS.filter(p => p.id === S.activePerson);

  if (!personsToShow.length) { container.innerHTML = ''; return; }

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const cards = personsToShow.map(p => {
    const cfg = S.incomeSettings[p.id] || {hourlyRate: 0, expectedHours: 0};
    const projected = cfg.hourlyRate * cfg.expectedHours;

    // Actual income this month for this person
    const evs = monthEvents(year, month).filter(({tx}) =>
      getCat(tx.categoryId).type === 'income' && (tx.person === p.id || tx.person === 'joint')
    );
    const actual = evs.reduce((s,{tx})=>s+tx.amount, 0);

    const variance = actual - projected;
    const hasProjection = projected > 0;

    return `<div class="proj-card" style="border-left-color:${p.color}">
      <div class="proj-person">${esc(S.persons[p.id])}</div>
      ${hasProjection ? `
        <div class="proj-row">
          <span class="proj-lbl">Projected (${cfg.expectedHours}h × ${fmt(cfg.hourlyRate)}/hr)</span>
          <span class="proj-val">${fmt(projected)}</span>
        </div>
        <div class="proj-row">
          <span class="proj-lbl">Actual income this month</span>
          <span class="proj-val income-text">${fmt(actual)}</span>
        </div>
        <div class="proj-row proj-variance">
          <span class="proj-lbl">Variance</span>
          <span class="proj-val ${variance>=0?'income-text':'expense-text'}">${variance>=0?'+':''}${fmt(variance)}</span>
        </div>
        <div class="proj-rate">
          ${actual===0&&projected===0?'':'Effective: '+fmt(projected>0?actual/cfg.expectedHours:0)+'/hr'}
        </div>
      ` : `<div class="proj-empty">No projection set. Click <strong>📐 Income Projection</strong> to configure.</div>`}
    </div>`;
  }).join('');

  container.innerHTML = `
    <div class="trends-section-label" style="padding-top:16px">Income Projection — ${MONTHS[month]}</div>
    <div class="proj-cards">${cards}</div>`;
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
  if (!S.modal.data.person) S.modal.data.person = S.activePerson === 'all' ? 'A' : (S.activePerson === 'joint' ? 'joint' : S.activePerson);

  const catOpts = cats().map(c=>
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
      <label class="form-label">End Date <span class="optional-lbl">optional — stops recurrence</span></label>
      <input class="form-input" id="f-enddate" type="date" value="${data.endDate||''}" />
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
      <label class="form-label">Person</label>
      <div class="person-toggle">
        <button class="person-btn${(data.person||'A')==='A'?' active':''}" data-person="A" onclick="pickPerson('A')" style="--pc:${PERSONS[0].color}">${esc(S.persons.A)}</button>
        <button class="person-btn${(data.person||'A')==='B'?' active':''}" data-person="B" onclick="pickPerson('B')" style="--pc:${PERSONS[1].color}">${esc(S.persons.B)}</button>
        <button class="person-btn${(data.person||'A')==='joint'?' active':''}" data-person="joint" onclick="pickPerson('joint')" style="--pc:#22c55e">Joint</button>
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Note (optional)</label>
      <input class="form-input" id="f-note" type="text" value="${esc(data.note||'')}" placeholder="Any notes…" maxlength="120" />
    </div>
    <div class="form-group">
      <div class="split-header">
        <button class="split-toggle" onclick="toggleSplitSection()">✂️ Split by category</button>
      </div>
      <div id="split-section" style="display:${(data.splits&&data.splits.length)?'block':'none'}">
        <div class="split-section">
          <div id="split-rows"></div>
          <button class="btn btn-ghost btn-sm" onclick="addSplit()" style="margin-top:6px">＋ Add split</button>
          <div class="split-remaining" id="split-remaining"></div>
        </div>
      </div>
    </div>`;

  document.getElementById('modal-delete-btn').style.display = editing ? 'block' : 'none';
  document.getElementById('modal-save-btn').style.display = '';
  document.getElementById('modal-save-btn').textContent = 'Save';
  updateAnnual();
  // Populate splits if editing a split transaction
  if (data.splits && data.splits.length) {
    S.modal.data.splits = data.splits.map(s => ({...s}));
    renderSplitRows();
  }
  showModal(true);
}

function pickColor(c) {
  if (S.modal) S.modal.data.selectedColor = c;
  document.querySelectorAll('.color-swatch').forEach(s=>s.classList.toggle('selected', s.dataset.color===c));
  const ci = document.getElementById('f-color');
  if (ci) ci.value = c;
}

function pickPerson(p) {
  if (S.modal) S.modal.data.person = p;
  document.querySelectorAll('.person-btn').forEach(b => b.classList.toggle('active', b.dataset.person === p));
}

function toggleSplitSection() {
  const sec = document.getElementById('split-section');
  if (!sec) return;
  const open = sec.style.display === 'none';
  sec.style.display = open ? 'block' : 'none';
  if (open && !S.modal.data.splits?.length) addSplit();
  else if (!open) { S.modal.data.splits = []; }
}

function addSplit() {
  if (!S.modal) return;
  if (!S.modal.data.splits) S.modal.data.splits = [];
  const currentCat = document.getElementById('f-cat')?.value || 'other';
  S.modal.data.splits.push({ id: uid(), amount: 0, categoryId: currentCat });
  renderSplitRows();
}

function removeSplit(sid) {
  if (!S.modal) return;
  S.modal.data.splits = (S.modal.data.splits || []).filter(s => s.id !== sid);
  renderSplitRows();
}

function renderSplitRows() {
  const rows = document.getElementById('split-rows');
  const rem  = document.getElementById('split-remaining');
  if (!rows || !S.modal) return;
  const splits  = S.modal.data.splits || [];
  const total   = parseFloat(document.getElementById('f-amount')?.value) || 0;
  const used    = splits.reduce((s, sp) => s + (sp.amount || 0), 0);
  const left    = total - used;

  rows.innerHTML = splits.map(sp => `
    <div class="split-row">
      <input class="form-input split-amt" type="number" min="0.01" step="0.01"
             value="${sp.amount||''}" placeholder="0.00"
             oninput="updateSplitAmt('${sp.id}',this.value)" />
      <select class="form-select split-cat" onchange="updateSplitCat('${sp.id}',this.value)">
        ${cats().map(c=>`<option value="${c.id}"${c.id===sp.categoryId?' selected':''}>${c.icon} ${c.label}</option>`).join('')}
      </select>
      <button class="btn-icon" onclick="removeSplit('${sp.id}')">✕</button>
    </div>`).join('');

  if (rem) {
    if (!splits.length) { rem.innerHTML = ''; return; }
    const cls = Math.abs(left) < 0.01 ? 'income-text' : left > 0 ? '' : 'expense-text';
    rem.innerHTML = `<span class="${cls}">${
      Math.abs(left) < 0.01 ? '✓ Splits balanced'
        : left > 0 ? `${fmt(left)} remaining`
        : `${fmt(Math.abs(left))} over total`
    }</span>`;
  }
}

function updateSplitAmt(sid, val) {
  const sp = (S.modal?.data.splits || []).find(s => s.id === sid);
  if (sp) sp.amount = parseFloat(val) || 0;
  renderSplitRows();
}

function updateSplitCat(sid, catId) {
  const sp = (S.modal?.data.splits || []).find(s => s.id === sid);
  if (sp) sp.categoryId = catId;
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
  document.getElementById('modal-save-btn').style.display = '';
  document.getElementById('modal-save-btn').textContent = 'Save';
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
  document.getElementById('modal-save-btn').style.display = '';
  document.getElementById('modal-save-btn').textContent = 'Save';
  showModal(true);
}

// ── Modal: Budgets ─────────────────────────────────────────────────────────────

function openBudgetModal() {
  S.modal = {type: 'budgets', editing: false, data: {}};

  const rows = cats().filter(c => c.type === 'expense').map(c => `
    <div class="budget-form-row">
      <div class="budget-cat-label">${c.icon} ${c.label}</div>
      <input class="form-input" id="fb-${c.id}" type="number" min="0" step="1"
             value="${S.budgets[c.id]||''}" placeholder="No limit" />
    </div>`).join('');

  document.getElementById('modal-title').textContent = '💰 Monthly Budgets';
  document.getElementById('modal-body').innerHTML = `
    <div class="budget-hint">Set monthly spending caps. Leave blank for no limit. Bar colors turn yellow at 70% and red at 90%.</div>
    ${rows}`;
  document.getElementById('modal-delete-btn').style.display = 'none';
  showModal(true);
}

function saveBudgets() {
  cats().filter(c => c.type === 'expense').forEach(c => {
    const val = parseFloat(document.getElementById('fb-' + c.id)?.value);
    if (val > 0) S.budgets[c.id] = val;
    else delete S.budgets[c.id];
  });
  save(); showModal(false); renderAnalysis();
}

// ── Modal: save / delete ───────────────────────────────────────────────────────

function modalSave() {
  if (!S.modal) return;
  const t = S.modal.type;
  if      (t==='transaction') saveTx();
  else if (t==='goal')        saveGoal();
  else if (t==='debt')        saveDebt();
  else if (t==='budgets')     saveBudgets();
  else if (t==='categories')  saveCategoryChanges();
  else if (t==='income-proj') saveIncomeProjection();
  else if (t==='account')     saveAccount();
  // import handles its own save buttons
}

function modalDelete() {
  if (!S.modal) return;
  const t = S.modal.type;
  if      (t==='transaction') deleteTxConfirm();
  else if (t==='goal')        deleteGoalConfirm();
  else if (t==='debt')        deleteDebtConfirm();
  else if (t==='account')     { S.accounts = S.accounts.filter(a=>a.id!==S.modal.data.id); save(); showModal(false); renderNetWorth(); }
}

function saveAccount() {
  const name    = document.getElementById('f-name')?.value.trim();
  const balance = parseFloat(document.getElementById('f-amount')?.value);
  const type    = document.getElementById('f-acct-type')?.value;
  const color   = S.modal.data.selectedColor || PALETTE[4];
  if (!name || isNaN(balance)) return showToast('⚠️ Name and balance are required');
  const obj = { name, balance, type, color };
  if (S.modal.editing && S.modal.data.id) {
    const i = S.accounts.findIndex(a => a.id === S.modal.data.id);
    if (i >= 0) S.accounts[i] = { ...S.accounts[i], ...obj };
  } else {
    S.accounts.push({ id: uid(), ...obj });
  }
  save(); showModal(false); renderNetWorth();
}

function saveTx() {
  const name    = document.getElementById('f-name')?.value.trim();
  const amount  = parseFloat(document.getElementById('f-amount')?.value);
  const cat     = document.getElementById('f-cat')?.value;
  const freq    = document.getElementById('f-freq')?.value;
  const date    = document.getElementById('f-date')?.value;
  const endDate = document.getElementById('f-enddate')?.value;
  const note    = document.getElementById('f-note')?.value.trim();
  const color   = S.modal.data.selectedColor || PALETTE[8];
  if (!name||!amount||amount<=0||!date) return;

  const person = S.modal.data.person || 'A';
  const obj = {name,amount,categoryId:cat,frequency:freq,startDate:date,note,color,person};
  if (endDate) obj.endDate = endDate; else delete obj.endDate;

  // Handle splits
  const splits = (S.modal.data.splits || []).filter(s => s.amount > 0);
  if (splits.length > 0) {
    const splitSum = splits.reduce((s, sp) => s + sp.amount, 0);
    if (Math.abs(splitSum - amount) > 0.01) {
      showToast(`⚠️ Splits total ${fmt(splitSum)} doesn't match amount ${fmt(amount)}`);
      return;
    }
    obj.splits = splits;
    obj.categoryId = splits[0].categoryId;
  } else {
    delete obj.splits;
  }

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

function switchPerson(p) {
  S.activePerson = p;
  document.querySelectorAll('.person-filter-btn').forEach(b => b.classList.toggle('active', b.dataset.p === p));
  render();
}

function switchView(v) {
  S.view=v;
  document.querySelectorAll('.view').forEach(el=>el.classList.toggle('active', el.id==='view-'+v));
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.toggle('active', b.dataset.view===v));
  if (v==='goals')    renderGoals();
  if (v==='debts')    renderDebts();
  if (v==='trends')   renderTrends();
  if (v==='vendors')  renderVendors();
  if (v==='joint')    renderJointReport();
  if (v==='settings') renderSettings();
  if (v==='networth') renderNetWorth();
  if (v==='breakdown') renderBreakdown();
}

function toggleSidebar() {
  const nav = document.querySelector('.sidebar-nav');
  const overlay = document.getElementById('sidebar-overlay');
  const open = nav.classList.toggle('open');
  overlay.classList.toggle('visible', open);
}

// ── Export ─────────────────────────────────────────────────────────────────────

function exportData() {
  const blob = new Blob([JSON.stringify({transactions:S.transactions,goals:S.goals,debts:S.debts},null,2)], {type:'application/json'});
  const a    = Object.assign(document.createElement('a'), {href:URL.createObjectURL(blob), download:`vantagepoint-${new Date().toISOString().slice(0,10)}.json`});
  a.click(); URL.revokeObjectURL(a.href);
}

function exportCSV() {
  const headers = ['Date','Description','Amount','Type','Category','Person','Frequency','Note'];
  const rows = S.transactions.map(tx => {
    const cat = getCat(tx.categoryId);
    return [
      tx.startDate,
      tx.name,
      tx.amount,
      cat.type,
      cat.label,
      S.persons[tx.person] || tx.person || 'A',
      tx.frequency,
      tx.note || '',
    ];
  });
  const csv = [headers, ...rows]
    .map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([csv], {type: 'text/csv'});
  const a = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(blob),
    download: `vantagepoint-${new Date().toISOString().slice(0,10)}.csv`,
  });
  a.click();
  URL.revokeObjectURL(a.href);
}

// ── PDF Report Export ──────────────────────────────────────────────────────────

function exportPDFReport() {
  const evs = applyFilters(monthEvents(S.year, S.month));
  let income=0, expenses=0;
  const catTotals = {};
  evs.forEach(({tx}) => {
    txBreakdowns(tx).forEach(({categoryId, amount}) => {
      if (getCat(categoryId).type==='income') income+=amount;
      else { expenses+=amount; catTotals[categoryId]=(catTotals[categoryId]||0)+amount; }
    });
  });

  const monthLabel = `${MONTHS[S.month]} ${S.year}`;
  const sorted = [...evs].sort((a,b) => a.date.localeCompare(b.date));

  const win = window.open('', '_blank');
  if (!win) { showToast('⚠️ Pop-up blocked — allow pop-ups and try again'); return; }
  win.document.write(`<!DOCTYPE html><html><head>
<title>VantagePoint — ${monthLabel}</title>
<style>
  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family:Arial,sans-serif; color:#111; font-size:12px; padding:24px; }
  h1  { font-size:20px; margin-bottom:2px; }
  .sub { color:#666; font-size:12px; margin-bottom:18px; }
  .summary { display:flex; gap:20px; background:#f5f5f5; padding:14px 18px; border-radius:8px; margin-bottom:22px; }
  .sum-item .lbl { font-size:10px; text-transform:uppercase; letter-spacing:.5px; color:#888; margin-bottom:2px; }
  .sum-item .val { font-size:18px; font-weight:800; }
  .income { color:#16a34a; } .expense { color:#dc2626; }
  table { width:100%; border-collapse:collapse; margin-bottom:22px; font-size:11px; }
  th { background:#f0f0f0; padding:6px 10px; text-align:left; font-weight:700; border-bottom:2px solid #ddd; }
  td { padding:5px 10px; border-bottom:1px solid #eee; }
  tr:last-child td { border-bottom:none; }
  h2 { font-size:13px; font-weight:700; margin:18px 0 8px; text-transform:uppercase; letter-spacing:.5px; color:#555; }
  button { margin-top:16px; padding:8px 20px; background:#111; color:#fff; border:none; border-radius:6px; cursor:pointer; font-size:13px; }
  @media print { button { display:none; } body { padding:12px; } }
</style></head><body>
<h1>VantagePoint</h1>
<div class="sub">${monthLabel} · Financial Report</div>
<div class="summary">
  <div class="sum-item"><div class="lbl">Income</div><div class="val income">${fmt(income)}</div></div>
  <div class="sum-item"><div class="lbl">Expenses</div><div class="val expense">${fmt(expenses)}</div></div>
  <div class="sum-item"><div class="lbl">Balance</div><div class="val ${income-expenses>=0?'income':'expense'}">${income-expenses>=0?'+':''}${fmt(income-expenses)}</div></div>
</div>
<h2>Transactions (${sorted.length})</h2>
<table>
  <thead><tr><th>Date</th><th>Name</th><th>Category</th><th>Amount</th><th>Person</th></tr></thead>
  <tbody>${sorted.map(({date,tx})=>{
    const c = getCat(tx.categoryId);
    return `<tr>
      <td>${date}</td>
      <td>${esc(tx.name)}</td>
      <td>${c.icon} ${c.label}</td>
      <td class="${c.type==='income'?'income':'expense'}">${fmt(tx.amount)}</td>
      <td>${esc(S.persons[tx.person]||tx.person||'A')}</td>
    </tr>`;
  }).join('')}</tbody>
</table>
<h2>Category Summary</h2>
<table>
  <thead><tr><th>Category</th><th>Amount</th><th>% of Expenses</th></tr></thead>
  <tbody>${Object.entries(catTotals).sort((a,b)=>b[1]-a[1]).map(([id,amt])=>{
    const c=getCat(id);
    return `<tr>
      <td>${c.icon} ${c.label}</td>
      <td class="${c.type==='income'?'income':'expense'}">${fmt(amt)}</td>
      <td>${expenses>0?Math.round(amt/expenses*100):0}%</td>
    </tr>`;
  }).join('')}</tbody>
</table>
<button onclick="window.print()">🖨️ Print / Save as PDF</button>
</body></html>`);
  win.document.close();
  win.focus();
}

// ── Drag & Drop Import ─────────────────────────────────────────────────────────

function initDragDrop() {
  const overlay = document.getElementById('drop-zone-overlay');
  if (!overlay) return;
  let counter = 0;

  document.addEventListener('dragenter', e => {
    if (!e.dataTransfer?.types?.includes('Files')) return;
    counter++;
    overlay.classList.add('active');
  });
  document.addEventListener('dragleave', () => {
    if (--counter <= 0) { counter = 0; overlay.classList.remove('active'); }
  });
  document.addEventListener('dragover', e => { e.preventDefault(); });
  document.addEventListener('drop', e => {
    e.preventDefault();
    counter = 0;
    overlay.classList.remove('active');
    const file = e.dataTransfer?.files?.[0];
    if (!file) return;
    openImportModal();
    requestAnimationFrame(() => {
      if (file.name.toLowerCase().endsWith('.pdf')) loadImportPDF(file);
      else loadImportCSV(file);
    });
  });
}

// ── CSV Import ─────────────────────────────────────────────────────────────────

function openImportModal() {
  S.modal = {type: 'import', editing: false, data: {step: 'upload'}};
  document.getElementById('modal-title').textContent = '📥 Import Transactions';
  document.getElementById('modal-delete-btn').style.display = 'none';
  document.getElementById('modal-save-btn').style.display = 'none';
  renderImportStep();
  showModal(true);
}

function renderImportStep() {
  const d = S.modal.data;
  const body = document.getElementById('modal-body');

  if (d.step === 'upload') {
    const profiles = Object.keys(S.importMappings);
    const profileHtml = profiles.length ? `
      <div class="form-group">
        <label class="form-label">Saved Profiles</label>
        <select class="form-select" id="imp-profile">
          <option value="">— New mapping —</option>
          ${profiles.map(p=>`<option value="${esc(p)}">${esc(p)}</option>`).join('')}
        </select>
      </div>` : '';

    body.innerHTML = `
      <div class="import-hint">Upload a CSV or PDF bank statement. CSV files go through a column mapper; PDF files are auto-parsed (Chase, Bank of America, Wells Fargo, City National).</div>
      ${profileHtml}
      <div class="form-group">
        <label class="form-label">Person</label>
        <div class="person-toggle">
          <button class="person-btn active" data-person="A" onclick="pickImportPerson('A')" style="--pc:${PERSONS[0].color}">${esc(S.persons.A)}</button>
          <button class="person-btn" data-person="B" onclick="pickImportPerson('B')" style="--pc:${PERSONS[1].color}">${esc(S.persons.B)}</button>
          <button class="person-btn" data-person="joint" onclick="pickImportPerson('joint')" style="--pc:#22c55e">Joint</button>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">File</label>
        <input class="form-input" id="imp-file" type="file" accept=".csv,.pdf,text/csv,application/pdf" />
      </div>
      <div class="import-actions">
        <button class="btn btn-primary" onclick="loadImportFile()">Next →</button>
      </div>`;
    d.importPerson = S.activePerson === 'all' ? 'A' : (S.activePerson === 'joint' ? 'joint' : S.activePerson);
  }

  if (d.step === 'map') {
    const headers = d.headers;
    const norm = h => h.toLowerCase().replace(/[^a-z0-9]/g, '');
    const hn = new Set(headers.map(norm));

    const guess = col => {
      const n = col.toLowerCase();
      if (/date/.test(n)) return 'date';
      if (/desc|memo|narr|name|payee/.test(n)) return 'desc';
      if (/amount|amt/.test(n)) return 'amount';
      if (/debit/.test(n)) return 'debit';
      if (/credit/.test(n)) return 'credit';
      return '';
    };
    const guessIdx = (type) => {
      const idx = headers.findIndex(h => guess(h) === type);
      return idx >= 0 ? idx : 0;
    };

    // Auto-detect bank from headers
    let detectedBank = '';
    for (const [bank, p] of Object.entries(BANK_PRESETS)) {
      const needed = [p.date, p.desc, p.amt || p.debit].filter(Boolean);
      if (needed.every(col => hn.has(norm(col)))) { detectedBank = bank; break; }
    }

    const saved    = S.importMappings[d.profileName] || {};
    const isSplit  = saved.splitAmt !== undefined ? saved.splitAmt : (detectedBank && !BANK_PRESETS[detectedBank]?.amt);
    const dateIdx  = saved.date   !== undefined ? saved.date   : guessIdx('date');
    const descIdx  = saved.desc   !== undefined ? saved.desc   : guessIdx('desc');
    const amtIdx   = saved.amount !== undefined ? saved.amount : guessIdx('amount');
    const debitIdx = saved.debit  !== undefined ? saved.debit  : guessIdx('debit');
    const creditIdx= saved.credit !== undefined ? saved.credit : guessIdx('credit');
    const negateChk= saved.negate !== undefined ? saved.negate : false;

    const makeOpts = (sel) => headers.map((h,i)=>`<option value="${i}"${i===sel?' selected':''}>${esc(h)}</option>`).join('');

    body.innerHTML = `
      <div class="import-hint">Preview of first 3 rows. Select your bank or map columns manually.</div>
      <div class="imp-preview">${renderCsvPreview(d.rows.slice(0,3), headers)}</div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Bank Preset <span class="optional-lbl">auto-detected</span></label>
          <select class="form-select" id="imp-bank" onchange="applyBankPreset()">
            <option value="">— Manual mapping —</option>
            ${Object.keys(BANK_PRESETS).map(b=>`<option value="${esc(b)}"${b===detectedBank?' selected':''}>${esc(b)}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Date Column</label>
          <select class="form-select" id="imp-date">${makeOpts(dateIdx)}</select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Description Column</label>
          <select class="form-select" id="imp-desc">${makeOpts(descIdx)}</select>
        </div>
        <div class="form-group">
          <label class="form-label">Amount Mode</label>
          <label class="imp-check-row" style="margin-top:8px"><input type="checkbox" id="imp-split-amt"${isSplit?' checked':''} onchange="toggleSplitAmt()"/> Separate Debit / Credit columns</label>
        </div>
      </div>
      <div id="imp-amt-single" style="display:${isSplit?'none':'block'}">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Amount Column</label>
            <select class="form-select" id="imp-amt">${makeOpts(amtIdx)}</select>
          </div>
          <div class="form-group" style="justify-content:flex-end">
            <label class="form-label">Negate amounts?</label>
            <label class="imp-check-row"><input type="checkbox" id="imp-negate"${negateChk?' checked':''}/> Flip sign (if expenses are positive)</label>
          </div>
        </div>
      </div>
      <div id="imp-amt-split" style="display:${isSplit?'block':'none'}">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Debit Column <span class="optional-lbl">(expense)</span></label>
            <select class="form-select" id="imp-debit">${makeOpts(debitIdx)}</select>
          </div>
          <div class="form-group">
            <label class="form-label">Credit Column <span class="optional-lbl">(income)</span></label>
            <select class="form-select" id="imp-credit">${makeOpts(creditIdx)}</select>
          </div>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Save mapping as</label>
        <input class="form-input" id="imp-profile-name" type="text" placeholder="e.g. Chase Checking" value="${esc(d.profileName||'')}"/>
      </div>
      ${buildVendorRulesHTML(d.rows.map(r => ({name: r[descIdx] || ''})))}
      <div class="import-actions">
        <button class="btn btn-ghost" onclick="backToUpload()">← Back</button>
        <button class="btn btn-primary" onclick="runImport()">Import Transactions</button>
      </div>`;
  }

  if (d.step === 'pdf-preview') {
    const txs = d.pdfTxs || [];
    const rows = txs.slice(0, 12).map(t => `
      <tr>
        <td>${t.date}</td>
        <td>${esc(t.name)}</td>
        <td class="${t.amount < 0 ? 'expense-text' : 'income-text'}" style="text-align:right">${t.amount < 0 ? '-' : '+'}$${Math.abs(t.amount).toFixed(2)}</td>
      </tr>`).join('');
    body.innerHTML = `
      <div class="import-hint">Found <strong>${txs.length} transactions</strong>. Preview of first ${Math.min(txs.length, 12)}:</div>
      <div class="imp-preview">
        <table class="imp-table">
          <thead><tr><th>Date</th><th>Description</th><th>Amount</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      ${txs.length > 12 ? `<div class="import-hint">…and ${txs.length - 12} more transactions</div>` : ''}
      ${buildVendorRulesHTML(txs)}
      <div class="import-actions">
        <button class="btn btn-ghost" onclick="backToUpload()">← Back</button>
        <button class="btn btn-primary" onclick="runPDFImport()">Import ${txs.length} Transactions</button>
      </div>`;
  }

  if (d.step === 'done') {
    body.innerHTML = `
      <div class="import-done">
        <div class="import-done-icon">✅</div>
        <div class="import-done-title">${d.imported} transactions imported</div>
        <div class="import-done-sub">${d.dupes} duplicates skipped</div>
        <button class="btn btn-primary" onclick="showModal(false);render()">Close</button>
      </div>`;
  }
}

function toggleSplitAmt() {
  const split = document.getElementById('imp-split-amt')?.checked;
  const single = document.getElementById('imp-amt-single');
  const splitEl = document.getElementById('imp-amt-split');
  if (single) single.style.display = split ? 'none' : 'block';
  if (splitEl) splitEl.style.display = split ? 'block' : 'none';
}

function applyBankPreset() {
  const bank = document.getElementById('imp-bank')?.value;
  if (!bank || !BANK_PRESETS[bank]) return;
  const p = BANK_PRESETS[bank];
  const headers = S.modal.data.headers;
  const norm = h => h.toLowerCase().replace(/[^a-z0-9]/g, '');
  const findIdx = name => {
    if (!name) return -1;
    const n = norm(name);
    const i = headers.findIndex(h => norm(h) === n);
    return i >= 0 ? i : headers.findIndex(h => norm(h).includes(n.slice(0, Math.min(n.length, 5))));
  };
  const setEl = (id, idx) => { if (idx >= 0) { const el = document.getElementById(id); if (el) el.value = idx; } };
  setEl('imp-date', findIdx(p.date));
  setEl('imp-desc', findIdx(p.desc));
  const isSplit = !p.amt;
  const splitChk = document.getElementById('imp-split-amt');
  if (splitChk) { splitChk.checked = isSplit; toggleSplitAmt(); }
  if (p.amt)    { setEl('imp-amt', findIdx(p.amt)); const neg = document.getElementById('imp-negate'); if (neg) neg.checked = p.negate; }
  if (p.debit)  setEl('imp-debit',  findIdx(p.debit));
  if (p.credit) setEl('imp-credit', findIdx(p.credit));
}

function pickImportPerson(p) {
  if (S.modal?.data) S.modal.data.importPerson = p;
  document.querySelectorAll('#modal-body .person-btn').forEach(b => b.classList.toggle('active', b.dataset.person === p));
}

function renderCsvPreview(rows, headers) {
  const th = headers.map(h=>`<th>${esc(h)}</th>`).join('');
  const trs = rows.map(r=>`<tr>${r.map(c=>`<td>${esc(c)}</td>`).join('')}</tr>`).join('');
  return `<table class="imp-table"><thead><tr>${th}</tr></thead><tbody>${trs}</tbody></table>`;
}

function loadImportFile() {
  const file = document.getElementById('imp-file')?.files?.[0];
  if (!file) { alert('Please choose a file.'); return; }
  if (/\.pdf$/i.test(file.name) || file.type === 'application/pdf') {
    loadImportPDF(file);
    return;
  }
  const profileSel = document.getElementById('imp-profile')?.value || '';
  const reader = new FileReader();
  reader.onload = e => {
    const {headers, rows} = parseCSV(e.target.result);
    if (!headers.length) { alert('Could not parse CSV.'); return; }
    S.modal.data.headers = headers;
    S.modal.data.rows = rows;
    S.modal.data.profileName = profileSel || file.name.replace(/\.csv$/i,'');
    S.modal.data.step = 'map';
    renderImportStep();
  };
  reader.readAsText(file);
}

function backToUpload() {
  S.modal.data.step = 'upload';
  renderImportStep();
}

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (!lines.length) return {headers:[], rows:[]};
  const splitLine = line => {
    const out = [], re = /("(?:[^"]|"")*"|[^,]*),?/g;
    let m;
    while ((m = re.exec(line)) !== null) {
      if (m.index === line.length) break;
      let v = m[1];
      if (v.startsWith('"')) v = v.slice(1,-1).replace(/""/g,'"');
      out.push(v.trim());
    }
    return out;
  };
  const headers = splitLine(lines[0]);
  const rows = lines.slice(1).filter(l=>l.trim()).map(splitLine);
  return {headers, rows};
}

function txHash(date, amount, desc) {
  return `${date}|${amount}|${String(desc).toLowerCase().replace(/\s+/g,' ').trim()}`;
}

function runImport() {
  saveVendorRulesFromForm();
  const d       = S.modal.data;
  const dateIdx = parseInt(document.getElementById('imp-date').value);
  const descIdx = parseInt(document.getElementById('imp-desc').value);
  const isSplit = document.getElementById('imp-split-amt')?.checked;
  const amtIdx  = isSplit ? -1 : parseInt(document.getElementById('imp-amt')?.value ?? 0);
  const debitIdx = isSplit ? parseInt(document.getElementById('imp-debit')?.value ?? 0) : -1;
  const creditIdx= isSplit ? parseInt(document.getElementById('imp-credit')?.value ?? 0) : -1;
  const negate  = !isSplit && (document.getElementById('imp-negate')?.checked ?? false);
  const profName = document.getElementById('imp-profile-name').value.trim();

  if (profName) {
    S.importMappings[profName] = {date: dateIdx, desc: descIdx, amount: amtIdx, debit: debitIdx, credit: creditIdx, negate, splitAmt: isSplit};
  }

  const existing = new Set(S.transactions.map(tx => txHash(tx.startDate, tx.amount, tx.name)));

  let imported = 0, dupes = 0;
  d.rows.forEach(row => {
    const rawDate = row[dateIdx] || '';
    const desc    = row[descIdx] || 'Imported';
    let rawAmt;

    if (isSplit) {
      const debit  = parseFloat((row[debitIdx]  || '').replace(/[^0-9.]/g, '')) || 0;
      const credit = parseFloat((row[creditIdx] || '').replace(/[^0-9.]/g, '')) || 0;
      if (!debit && !credit) return;
      rawAmt = debit > 0 ? debit : -credit; // debit=expense(+), credit=income(-)
    } else {
      rawAmt = parseFloat((row[amtIdx] || '').replace(/[^0-9.\-]/g, ''));
      if (isNaN(rawAmt)) return;
      if (negate) rawAmt = -rawAmt;
    }

    const amount = Math.abs(rawAmt);
    if (amount <= 0) return;

    const date = normalizeDate(rawDate);
    if (!date) return;

    const hash = txHash(date, amount, desc);
    if (existing.has(hash)) { dupes++; return; }
    existing.add(hash);

    const vendor = extractVendor(desc);
    const catId  = S.vendorRules[vendor] || (rawAmt < 0 ? 'other' : 'other_income');
    S.transactions.push({
      id: uid(), name: desc, amount, categoryId: catId,
      frequency: 'once', startDate: date, note: '',
      color: PALETTE[8], person: d.importPerson || 'A',
      importHash: hash,
    });
    imported++;
  });

  save();
  d.step = 'done';
  d.imported = imported;
  d.dupes = dupes;
  renderImportStep();
}

function normalizeDate(s) {
  s = s.trim();
  // Try ISO first
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // MM/DD/YYYY or M/D/YYYY
  const m1 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m1) return `${m1[3]}-${p2(m1[1])}-${p2(m1[2])}`;
  // MM-DD-YYYY
  const m2 = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (m2) return `${m2[3]}-${p2(m2[1])}-${p2(m2[2])}`;
  // Try Date parse as fallback
  const dt = new Date(s);
  if (!isNaN(dt)) return dstr(dt);
  return null;
}

// ── PDF Import ─────────────────────────────────────────────────────────────────

async function loadPDFJS() {
  if (window.pdfjsLib) return;
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    s.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      resolve();
    };
    s.onerror = () => reject(new Error('Failed to load PDF.js'));
    document.head.appendChild(s);
  });
}

async function extractPDFLines(file) {
  await loadPDFJS();
  const buf = await file.arrayBuffer();
  const pdf = await window.pdfjsLib.getDocument({ data: buf }).promise;
  const lines = [];

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();

    // Collect non-empty items with position + advance width
    const items = content.items
      .filter(i => i.str && i.str.trim())
      .map(i => ({ x: i.transform[4], y: i.transform[5], str: i.str, w: i.width || 0 }));
    if (!items.length) continue;

    // Sort top-to-bottom, then left-to-right
    items.sort((a, b) => b.y - a.y || a.x - b.x);

    // Group by Y proximity (6pt window) — avoids rounding artifacts
    const groups = [];
    for (const item of items) {
      const last = groups[groups.length - 1];
      if (last && Math.abs(item.y - last[0].y) <= 6) {
        last.push(item);
      } else {
        groups.push([item]);
      }
    }

    for (const group of groups) {
      group.sort((a, b) => a.x - b.x);

      // Smart space insertion: use advance width to detect real gaps vs tight chars
      let text = group[0].str;
      for (let i = 1; i < group.length; i++) {
        const prev = group[i - 1];
        const curr = group[i];
        const charW = prev.w > 0 ? prev.w / Math.max(1, prev.str.length) : 6;
        const prevEnd = prev.x + (prev.w > 0 ? prev.w : prev.str.length * charW);
        const gap = curr.x - prevEnd;
        text += (gap > charW * 0.4 ? ' ' : '') + curr.str;
      }

      text = text
        .replace(/\s{3,}/g, '  ')
        .replace(/([\d,]+\.\d{2})\s+-/g, '$1-')
        .replace(/([\d,]+\.\d{2})-\s+(SC)/gi, '$1-$2')
        .trim();

      if (text) lines.push(text);
    }
  }
  return lines;
}

function parseBankStatementLines(lines) {
  const txs = [];
  let year = new Date().getFullYear();
  let prevMon = 0;
  let inActivity = false;

  // Detect statement year from "Statement Dates M/DD/YY thru M/DD/YY"
  for (const ln of lines) {
    const m = ln.match(/Statement\s+Dates\s+\d+\/\d+\/(\d{2,4})/i);
    if (m) { const y = +m[1]; year = y < 100 ? 2000 + y : y; break; }
    const m2 = ln.match(/^Date\s+\d+\/\d+\/(\d{2,4})/);
    if (m2) { const y = +m2[1]; year = y < 100 ? 2000 + y : y; break; }
  }

  // M/DD  DESCRIPTION  AMOUNT[-[SC]]  BALANCE
  const TX = /^(\d{1,2})\/(\d{2})\s+(.+?)\s+([\d,]+\.\d{2}(?:-(SC)?)?)\s+([\d,]+\.\d{2})\s*$/;

  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i].trim();

    if (/Activity\s+in\s+Date\s+Order/i.test(ln))                          { inActivity = true;  continue; }
    if (/Summary\s+of\s+Deposits|Interest\s+Rate\s+Summary|End\s+of\s+Statement/i.test(ln)) { inActivity = false; }
    if (!inActivity) continue;
    if (/^Date\s+Descri/i.test(ln)) continue;

    const m = TX.exec(ln);
    if (!m) continue;

    const [, moStr, dyStr, rawDesc, amtStr, scMarker] = m;
    if (scMarker) continue; // skip service charges

    const mon = +moStr, day = +dyStr;
    if (prevMon === 12 && mon === 1) year++;
    prevMon = mon;

    const date = `${year}-${String(mon).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const isDebit = amtStr.includes('-');
    const amt = parseFloat(amtStr.replace(/[^0-9.]/g, ''));
    if (!amt) continue;

    // PayPal transactions: real merchant is on the continuation line
    let desc = rawDesc.trim();
    if (/PAYPAL$/i.test(desc)) {
      const nxt = (lines[i + 1] || '').trim();
      if (nxt && !/^\d/.test(nxt) && !/^(Card#|C#|PR\d|XX)/i.test(nxt) && !TX.test(nxt) && nxt.length < 40) {
        desc = nxt;
      }
    }

    txs.push({ date, name: desc, amount: isDebit ? -amt : amt });
  }
  return txs;
}

// ── Chase Bank Parser ──────────────────────────────────────────────────────────
function parseChaseStatement(lines) {
  const txs = [];
  let year = new Date().getFullYear();
  let prevMon = 0;
  let inActivity = false;
  let isCredit = false;
  let prevBalance = null;

  for (const ln of lines.slice(0, 80)) {
    const m = ln.match(/\b(20\d{2})\b/);
    if (m) { year = +m[1]; break; }
  }

  const headerText = lines.slice(0, 40).join('\n');
  if (/credit\s+card|visa\b|mastercard/i.test(headerText)) isCredit = true;
  if (/trans(?:action)?\s+date.*post\s+date/i.test(headerText)) isCredit = true;

  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i].trim();

    if (/^(?:account\s+activity|transaction\s+detail|transaction\s+history|transactions?)\s*$/i.test(ln) ||
        /^date\s+description\s+amount/i.test(ln) ||
        /^trans(?:action)?\s+date\s+post/i.test(ln)) {
      inActivity = true; continue;
    }
    if (/^fees\s+charged|^interest\s+charged|^account\s+summary/i.test(ln)) inActivity = false;
    if (!inActivity) continue;
    if (/^(?:date\s+|trans(?:action)?\s+date\s+|post\s+date\s+|beginning\s+balance|ending\s+balance)/i.test(ln)) continue;

    const dm = ln.match(/^(\d{1,2})\/(\d{2})\s+/);
    if (!dm) continue;
    const mon = +dm[1], day = +dm[2];
    if (mon < 1 || mon > 12 || day < 1 || day > 31) continue;

    let rest = ln.slice(dm[0].length);
    if (isCredit) rest = rest.replace(/^\d{1,2}\/\d{2}\s+/, '');

    const allAmts = [...rest.matchAll(/-?[\d,]+\.\d{2}/g)];
    if (!allAmts.length) continue;

    const txAmtMatch = allAmts.length >= 2 ? allAmts[allAmts.length - 2] : allAmts[0];
    const balMatch   = allAmts.length >= 2 ? allAmts[allAmts.length - 1] : null;
    const desc = rest.slice(0, txAmtMatch.index).trim();
    if (!desc) continue;

    let raw = parseFloat(txAmtMatch[0].replace(/,/g, ''));
    if (!raw || isNaN(raw)) continue;

    if (balMatch) {
      const bal = parseFloat(balMatch[0].replace(/,/g, ''));
      if (!txAmtMatch[0].startsWith('-') && prevBalance !== null && !isCredit) {
        const delta = bal - prevBalance;
        if (Math.abs(delta + raw) < 0.50) raw = -raw;
      }
      prevBalance = bal;
    }

    if (prevMon === 12 && mon === 1) year++;
    prevMon = mon;

    const date = `${year}-${String(mon).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    txs.push({ date, name: desc, amount: isCredit ? -raw : raw });
  }
  return txs;
}

// ── Bank of America Parser ─────────────────────────────────────────────────────
function parseBofAStatement(lines) {
  const txs = [];
  let year = new Date().getFullYear();
  let inDebits = false;

  for (const ln of lines.slice(0, 80)) {
    const m = ln.match(/\b(20\d{2})\b/);
    if (m) { year = +m[1]; break; }
  }

  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i].trim();

    if (/withdrawals?\s+and\s+other\s+debits/i.test(ln)) { inDebits = true; continue; }
    if (/deposits?\s+and\s+other\s+credits/i.test(ln)) { inDebits = false; continue; }
    if (/^date\s+description/i.test(ln)) continue;

    // BofA date: MM/DD/YY or MM/DD/YYYY
    const dm = ln.match(/^(\d{1,2})\/(\d{2})\/(\d{2,4})\s+/);
    if (!dm) continue;
    const mon = +dm[1], day = +dm[2];
    const txYear = +dm[3] < 100 ? 2000 + +dm[3] : +dm[3];
    if (mon < 1 || mon > 12 || day < 1 || day > 31) continue;

    const rest = ln.slice(dm[0].length);
    const allAmts = [...rest.matchAll(/-?[\d,]+\.\d{2}/g)];
    if (!allAmts.length) continue;

    const txAmtMatch = allAmts.length >= 2 ? allAmts[allAmts.length - 2] : allAmts[0];
    const desc = rest.slice(0, txAmtMatch.index).trim();
    if (!desc) continue;

    let raw = parseFloat(txAmtMatch[0].replace(/,/g, ''));
    if (!raw || isNaN(raw)) continue;

    // In the "Withdrawals" section amounts are shown as positive — negate them
    if (inDebits && raw > 0) raw = -raw;

    const date = `${txYear}-${String(mon).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    txs.push({ date, name: desc, amount: raw });
  }
  return txs;
}

// ── Wells Fargo Parser ─────────────────────────────────────────────────────────
// WF uses two separate Deposits / Withdrawals columns (both positive).
// We use the running balance delta to infer direction.
function parseWellsFargoStatement(lines) {
  const txs = [];
  let inActivity = false;
  let prevBalance = null;

  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i].trim();

    if (/^transaction\s+history\s*$/i.test(ln) ||
        /^date\s+description\s+deposits/i.test(ln)) { inActivity = true; continue; }
    if (/^ending\s+balance|^total\s+(?:deposits|withdrawals)/i.test(ln)) inActivity = false;
    if (!inActivity) continue;
    if (/^(?:date|description|deposits|withdrawals|ending\s+daily)/i.test(ln)) continue;

    // WF date: M/D/YYYY or MM/DD/YYYY
    const dm = ln.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+/);
    if (!dm) continue;
    const mon = +dm[1], day = +dm[2], txYear = +dm[3];
    if (mon < 1 || mon > 12 || day < 1 || day > 31) continue;

    const rest = ln.slice(dm[0].length);
    const allAmts = [...rest.matchAll(/[\d,]+\.\d{2}/g)];
    if (!allAmts.length) continue;

    const txAmtMatch = allAmts.length >= 2 ? allAmts[allAmts.length - 2] : allAmts[0];
    const balMatch   = allAmts.length >= 2 ? allAmts[allAmts.length - 1] : null;
    const desc = rest.slice(0, txAmtMatch.index).trim();
    if (!desc) continue;

    let raw = parseFloat(txAmtMatch[0].replace(/,/g, ''));
    if (!raw || isNaN(raw)) continue;

    if (balMatch) {
      const bal = parseFloat(balMatch[0].replace(/,/g, ''));
      if (prevBalance !== null) {
        const delta = bal - prevBalance;
        if (Math.abs(delta + raw) < 0.50) raw = -raw; // balance went down → debit
      }
      prevBalance = bal;
    }

    const date = `${txYear}-${String(mon).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    txs.push({ date, name: desc, amount: raw });
  }
  return txs;
}

// ── Bank Detector + Dispatcher ─────────────────────────────────────────────────
function detectBankFromLines(lines) {
  const hdr = lines.slice(0, 50).join('\n');
  if (/chase\.com|jpmorgan\s+chase|chase\s+bank|chase\s+total\s+checking|chase\s+sapphire|chase\s+freedom/i.test(hdr)) return 'chase';
  if (/bank\s+of\s+america|bankofamerica\.com/i.test(hdr)) return 'bofa';
  if (/wells\s+fargo|wellsfargo\.com/i.test(hdr)) return 'wellsfargo';
  if (/city\s+national/i.test(hdr)) return 'citynational';
  return null;
}

async function loadImportPDF(file) {
  const body = document.getElementById('modal-body');
  body.innerHTML = `<div style="text-align:center;padding:30px;color:var(--muted)">🔄 Parsing PDF statement…</div>`;
  try {
    const lines = await extractPDFLines(file);
    const PARSERS = {
      chase: parseChaseStatement,
      bofa: parseBofAStatement,
      wellsfargo: parseWellsFargoStatement,
      citynational: parseBankStatementLines,
    };

    const detectedBank = detectBankFromLines(lines);
    let txs = detectedBank ? PARSERS[detectedBank](lines) : [];

    // Fallback: try every parser until one returns results
    if (!txs.length) {
      for (const [, parser] of Object.entries(PARSERS)) {
        txs = parser(lines);
        if (txs.length) break;
      }
    }

    console.log('[PDF] bank:', detectedBank, 'lines:', lines.length, lines.slice(0, 30));
    console.log('[PDF] txs:', txs.length, txs.slice(0, 5));

    if (!txs.length) {
      const preview = lines.slice(0, 20).map(l => esc(l)).join('<br>');
      body.innerHTML = `<div class="import-hint" style="color:var(--expense);padding:12px 20px">
        ⚠️ No transactions found. Extracted ${lines.length} text lines.<br>
        Supported banks: Chase, Bank of America, Wells Fargo, City National.<br><br>
        <details><summary style="cursor:pointer;color:var(--muted);font-size:11px">First 20 extracted lines (for support)</summary>
        <pre style="font-size:10px;color:var(--muted);margin-top:8px;white-space:pre-wrap">${preview}</pre></details><br>
        <button class="btn btn-ghost btn-sm" onclick="backToUpload()">← Try again</button></div>`;
      return;
    }
    S.modal.data.pdfTxs = txs;
    S.modal.data.step = 'pdf-preview';
    renderImportStep();
  } catch (err) {
    body.innerHTML = `<div class="import-hint" style="color:var(--expense);padding:20px;text-align:center">
      ⚠️ Error parsing PDF: ${esc(String(err.message || err))}<br><br>
      <button class="btn btn-ghost btn-sm" onclick="backToUpload()">← Try again</button></div>`;
  }
}

function runPDFImport() {
  saveVendorRulesFromForm();
  const d = S.modal.data;
  const txs = d.pdfTxs || [];
  const existing = new Set(S.transactions.map(tx => txHash(tx.startDate, tx.amount, tx.name)));
  let imported = 0, dupes = 0;
  txs.forEach(({ date, name, amount }) => {
    const amt = Math.abs(amount);
    const hash = txHash(date, amt, name);
    if (existing.has(hash)) { dupes++; return; }
    existing.add(hash);
    const vendor = extractVendor(name);
    const catId = S.vendorRules[vendor] || (amount < 0 ? 'other' : 'other_income');
    S.transactions.push({
      id: uid(), name, amount: amt, categoryId: catId,
      frequency: 'once', startDate: date, note: '',
      color: PALETTE[8], person: d.importPerson || 'A',
      importHash: hash,
    });
    imported++;
  });
  save();
  d.step = 'done';
  d.imported = imported;
  d.dupes = dupes;
  renderImportStep();
}

// ── Vendor Rules Helpers (import) ──────────────────────────────────────────────

function buildVendorRulesHTML(txs) {
  const vendors = [...new Set(txs.map(t => extractVendor(t.name)).filter(Boolean))].sort((a, b) => {
    return (S.vendorRules[a] ? 1 : 0) - (S.vendorRules[b] ? 1 : 0) || a.localeCompare(b);
  });
  if (!vendors.length) return '';

  const rows = vendors.map(v => {
    const existing = S.vendorRules[v] || '';
    const isNew = !existing;
    const opts = `<option value="">— skip —</option>` +
      cats().map(c => `<option value="${c.id}"${c.id === existing ? ' selected' : ''}>${c.icon} ${c.label}</option>`).join('');
    return `<div class="vendor-rule-row${isNew ? ' vendor-rule-new' : ''}">
      <span class="vendor-rule-name">${esc(v)}${isNew ? ' <span class="vendor-rule-badge">new</span>' : ''}</span>
      <select class="form-select vendor-rule-sel" data-vendor="${esc(v)}">${opts}</select>
    </div>`;
  }).join('');

  const newCount = vendors.filter(v => !S.vendorRules[v]).length;
  const subtitle = newCount ? `${newCount} new vendor${newCount > 1 ? 's' : ''} · rules saved for future imports` : 'all vendors have saved rules';
  return `<div class="vendor-rules-panel">
    <div class="vendor-rules-title">Vendor Categories <span class="muted">· ${subtitle}</span></div>
    <div class="vendor-rules-list">${rows}</div>
  </div>`;
}

function saveVendorRulesFromForm() {
  document.querySelectorAll('.vendor-rule-sel').forEach(sel => {
    const vendor = sel.dataset.vendor;
    if (!vendor) return;
    if (sel.value) S.vendorRules[vendor] = sel.value;
    else delete S.vendorRules[vendor];
  });
}

// ── Vendor Tracking ────────────────────────────────────────────────────────────

function extractVendor(name) {
  let v = String(name).trim();
  v = v.replace(/^(purchase|pos\s+purchase|pos\s+debit|pos|ach|debit\s+card|checkcard|debit\s+purchase|online\s+transfer|autopay|payment\s+to|payment\s+from|bill\s+pay|zelle(\s+payment)?(\s+to|\s+from)?)\s+/i, '');
  v = v.replace(/\s+\d{1,2}\/\d{1,2}(\/\d{2,4})?$/, '');
  v = v.replace(/\s+\d{8}$/, '');
  v = v.replace(/\s+[#*]\S+/g, '').trim();
  const words = v.split(/\s+/).slice(0, 3).join(' ');
  return words.replace(/\b\w/g, c => c.toUpperCase()) || name;
}

function buildVendorIndex() {
  const year = new Date().getFullYear();
  const vendors = {};

  S.transactions.forEach(tx => {
    if (S.activePerson !== 'all') {
      if (S.activePerson === 'joint') { if (tx.person !== 'joint') return; }
      else if (tx.person !== S.activePerson && tx.person !== 'joint') return;
    }
    const isExpense = getCat(tx.categoryId).type === 'expense';
    for (let m = 0; m < 12; m++) {
      occurrences(tx, year, m).forEach(date => {
        const vendor = extractVendor(tx.name);
        if (!vendors[vendor]) vendors[vendor] = {name: vendor, total: 0, income: 0, count: 0, lastDate: ''};
        if (isExpense) vendors[vendor].total += tx.amount;
        else           vendors[vendor].income += tx.amount;
        vendors[vendor].count++;
        if (!vendors[vendor].lastDate || date > vendors[vendor].lastDate) vendors[vendor].lastDate = date;
      });
    }
  });
  return vendors;
}

function renderVendors() {
  const el = document.getElementById('vendors-content');
  let items = Object.values(buildVendorIndex());

  const q = S.vendorSearch.toLowerCase().trim();
  if (q) items = items.filter(v => v.name.toLowerCase().includes(q));

  if (S.vendorSort === 'amount') items.sort((a,b) => b.total - a.total);
  else if (S.vendorSort === 'name')  items.sort((a,b) => a.name.localeCompare(b.name));
  else if (S.vendorSort === 'count') items.sort((a,b) => b.count - a.count);

  if (!items.length) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">🏪</div><div>No vendor data yet. Add transactions or import a CSV to see YTD spending by merchant.</div></div>`;
    return;
  }

  const year = new Date().getFullYear();
  const catOptsFor = (vendor) => cats().map(c =>
    `<option value="${c.id}"${(S.vendorRules[vendor]||'') === c.id ? ' selected' : ''}>${c.icon} ${c.label}</option>`
  ).join('');

  el.innerHTML = `
    <table class="vendor-table">
      <thead><tr>
        <th class="sortable${S.vendorSort==='name'?' sorted':''}" onclick="sortVendors('name')">Vendor</th>
        <th class="sortable${S.vendorSort==='count'?' sorted':''}" onclick="sortVendors('count')"># Txns</th>
        <th class="sortable${S.vendorSort==='amount'?' sorted':''}" onclick="sortVendors('amount')">${year} Spent</th>
        <th>Last Date</th>
        <th>Auto-Category</th>
      </tr></thead>
      <tbody>${items.map(v => `
        <tr>
          <td class="vendor-name">${esc(v.name)}</td>
          <td class="vendor-count">${v.count}</td>
          <td class="expense-text vendor-amt">${fmt(v.total)}${v.income>0?` <span class="income-text vendor-income">+${fmt(v.income)}</span>`:''}</td>
          <td class="vendor-date">${v.lastDate ? new Date(v.lastDate+'T00:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'}) : '—'}</td>
          <td><select class="vendor-cat-select" onchange="setVendorRule('${esc(v.name)}',this.value)">
            <option value="">— none —</option>${catOptsFor(v.name)}
          </select></td>
        </tr>`).join('')}
      </tbody>
    </table>`;
}

function sortVendors(col) {
  S.vendorSort = col;
  renderVendors();
}

function setVendorRule(vendor, catId) {
  if (catId) S.vendorRules[vendor] = catId;
  else delete S.vendorRules[vendor];
  // Apply retroactively to all matching transactions
  S.transactions.forEach(tx => {
    if (extractVendor(tx.name) === vendor && catId) tx.categoryId = catId;
  });
  save();
  renderVendors();
}

// ── Joint Report ───────────────────────────────────────────────────────────────

function renderJointReport() {
  const evs = monthEvents(S.year, S.month);
  const slots = {A:{income:0,exp:0,cats:{}}, B:{income:0,exp:0,cats:{}}, joint:{income:0,exp:0,cats:{}}};

  evs.forEach(({tx}) => {
    const pid = (tx.person === 'joint' ? 'joint' : tx.person) || 'A';
    const slot = slots[pid] || slots.joint;
    const cat  = getCat(tx.categoryId);
    if (cat.type === 'income') slot.income += tx.amount;
    else {
      slot.exp += tx.amount;
      slot.cats[tx.categoryId] = (slot.cats[tx.categoryId]||0) + tx.amount;
    }
  });

  const combined = {
    income: slots.A.income + slots.B.income + slots.joint.income,
    exp: slots.A.exp + slots.B.exp + slots.joint.exp,
  };
  combined.bal = combined.income - combined.exp;

  const card = (pid, label, col) => {
    const s = slots[pid];
    const bal = s.income - s.exp;
    return `<div class="joint-card" style="border-top:3px solid ${col}">
      <div class="joint-card-title">${label}</div>
      <div class="joint-stat"><span class="joint-lbl">Income</span><span class="income-text joint-val">${fmt(s.income)}</span></div>
      <div class="joint-stat"><span class="joint-lbl">Expenses</span><span class="expense-text joint-val">${fmt(s.exp)}</span></div>
      <div class="joint-stat joint-bal-row"><span class="joint-lbl">Balance</span><span class="${bal>=0?'positive':'negative'} joint-val">${bal>=0?'+':''}${fmt(bal)}</span></div>
    </div>`;
  };

  // Top-N categories across everyone
  const allCats = {};
  ['A','B','joint'].forEach(pid => {
    Object.entries(slots[pid].cats).forEach(([cid,amt]) => {
      allCats[cid] = (allCats[cid]||0) + amt;
    });
  });
  const topCats = Object.entries(allCats).sort((a,b)=>b[1]-a[1]).slice(0,8);

  const breakdownRows = topCats.map(([cid]) => {
    const cat   = getCat(cid);
    const aAmt  = slots.A.cats[cid]    || 0;
    const bAmt  = slots.B.cats[cid]    || 0;
    const jAmt  = slots.joint.cats[cid]|| 0;
    const total = aAmt + bAmt + jAmt;
    const maxAmt = Math.max(combined.exp, 1);
    return `<tr>
      <td>${cat.icon} ${cat.label}</td>
      <td class="expense-text">${aAmt>0?fmt(aAmt):'—'}</td>
      <td class="expense-text">${bAmt>0?fmt(bAmt):'—'}</td>
      <td class="expense-text">${jAmt>0?fmt(jAmt):'—'}</td>
      <td>
        <div class="joint-bar-wrap">
          <div class="joint-bar" style="width:${Math.round(total/maxAmt*100)}%"></div>
        </div>
      </td>
      <td class="expense-text">${fmt(total)}</td>
    </tr>`;
  }).join('');

  document.getElementById('joint-content').innerHTML = `
    <div class="joint-month-label">${MONTHS[S.month]} ${S.year}</div>
    <div class="joint-cards">
      ${card('A',    S.persons.A,  PERSONS[0].color)}
      ${card('B',    S.persons.B,  PERSONS[1].color)}
      ${card('joint','Joint',      '#22c55e')}
      <div class="joint-card combined-card">
        <div class="joint-card-title">Combined</div>
        <div class="joint-stat"><span class="joint-lbl">Total Income</span><span class="income-text joint-val">${fmt(combined.income)}</span></div>
        <div class="joint-stat"><span class="joint-lbl">Total Expenses</span><span class="expense-text joint-val">${fmt(combined.exp)}</span></div>
        <div class="joint-stat joint-bal-row"><span class="joint-lbl">Net</span><span class="${combined.bal>=0?'positive':'negative'} joint-val">${combined.bal>=0?'+':''}${fmt(combined.bal)}</span></div>
        <div class="joint-stat"><span class="joint-lbl">Savings Rate</span><span class="joint-val">${combined.income>0?Math.round((combined.bal/combined.income)*100):0}%</span></div>
      </div>
    </div>
    ${topCats.length ? `
      <div class="joint-breakdown-title">Expense Breakdown</div>
      <div class="joint-breakdown-wrap">
        <table class="joint-breakdown-table">
          <thead><tr><th>Category</th><th>${esc(S.persons.A)}</th><th>${esc(S.persons.B)}</th><th>Joint</th><th></th><th>Total</th></tr></thead>
          <tbody>${breakdownRows}</tbody>
        </table>
      </div>` : ''}`;
}

// ── Settings ────────────────────────────────────────────────────────────────────

function renderSettingsSync() {
  const el = document.getElementById('settings-sync');
  if (!el) return;
  if (!SYNC.clientId) {
    el.innerHTML = `
      <div class="sync-setup-box">
        <p style="color:var(--muted);font-size:13px;margin:0 0 10px">Sync data to Google Drive — access VantagePoint from any device, automatically.</p>
        <details class="sync-instructions">
          <summary>How to get a Client ID (one-time, ~5 min) ›</summary>
          <ol class="sync-steps">
            <li>Open <a href="https://console.cloud.google.com" target="_blank" rel="noopener">console.cloud.google.com</a></li>
            <li>Create a new project (any name)</li>
            <li>APIs &amp; Services → Library → search <strong>Google Drive API</strong> → Enable</li>
            <li>APIs &amp; Services → Credentials → Create Credentials → <strong>OAuth 2.0 Client ID</strong></li>
            <li>Application type: <strong>Web application</strong></li>
            <li>Authorized JavaScript origins: add <code>https://conquested.github.io</code></li>
            <li>Copy the Client ID (looks like <code>xxxx.apps.googleusercontent.com</code>)</li>
          </ol>
        </details>
        <div class="form-row" style="margin-top:10px;gap:8px;align-items:center">
          <input class="form-input" id="sync-cid-input" type="text" placeholder="xxxxxxxx.apps.googleusercontent.com" style="flex:1;min-width:0"/>
          <button class="btn btn-primary btn-sm" onclick="saveSyncClientId()">Connect Google Drive</button>
        </div>
      </div>`;
  } else {
    const stMap = { idle:'⚪ Not connected', connecting:'🟡 Connecting…', syncing:'🟡 Syncing…', synced:'🟢 Connected', error:'🔴 Error — try reconnecting' };
    const connected = !!SYNC.token;
    el.innerHTML = `
      <div class="settings-data-row">
        <div class="settings-item-info">
          <div class="settings-item-title">Google Drive</div>
          <div class="settings-item-desc">${stMap[SYNC.status] || '⚪ Unknown'}${SYNC.lastSynced && connected ? ' · last synced ' + timeSince(SYNC.lastSynced) : ''}</div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
          ${connected
            ? `<button class="btn btn-ghost btn-sm" onclick="syncFromGoogle(true)">↺ Sync Now</button>`
            : `<button class="btn btn-primary btn-sm" onclick="connectGoogle()">Reconnect</button>`}
          <button class="btn btn-danger btn-sm" onclick="disconnectGoogle()">Disconnect</button>
        </div>
      </div>`;
  }
}

function saveSyncClientId() {
  const cid = document.getElementById('sync-cid-input')?.value.trim();
  if (!cid) { alert('Please enter your Client ID.'); return; }
  SYNC.clientId = cid;
  localStorage.setItem('sync_cid', cid);
  if (S.view === 'settings') renderSettingsSync();
  connectGoogle();
}

function renderSettings() {
  // Person names
  document.getElementById('settings-persons').innerHTML =
    PERSONS.map(p => `
      <div class="settings-field-row">
        <label class="form-label" style="min-width:80px">Person ${p.id}</label>
        <input class="form-input" id="sp-name-${p.id}" value="${esc(S.persons[p.id])}" maxlength="30" placeholder="Person ${p.id}" style="max-width:200px"/>
        <div class="person-color-dot" style="background:${p.color}"></div>
      </div>`).join('') +
    `<button class="btn btn-primary btn-sm" onclick="savePersonNames()" style="margin-top:10px">Save Names</button>`;

  // Categories (inline, same logic as modal)
  renderSettingsCategories();

  // Data management
  document.getElementById('settings-data').innerHTML = `
    <div class="settings-data-row">
      <div class="settings-item-info">
        <div class="settings-item-title">Import Backup</div>
        <div class="settings-item-desc">Restore from a previously exported JSON file</div>
      </div>
      <input type="file" id="sd-json-file" accept=".json" style="display:none" onchange="importJSON(this)"/>
      <button class="btn btn-ghost btn-sm" onclick="document.getElementById('sd-json-file').click()">📂 Import JSON</button>
    </div>
    <div class="settings-data-row">
      <div class="settings-item-info">
        <div class="settings-item-title">Export Data</div>
        <div class="settings-item-desc">Download all your data as a JSON backup</div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-ghost btn-sm" onclick="exportData()">⬇️ JSON Backup</button>
        <button class="btn btn-ghost btn-sm" onclick="exportCSV()">⬇️ CSV Export</button>
      </div>
    </div>
    <div class="settings-data-row danger-row">
      <div class="settings-item-info">
        <div class="settings-item-title">Clear All Data</div>
        <div class="settings-item-desc">Permanently delete all transactions, goals, debts, and settings</div>
      </div>
      <button class="btn btn-danger btn-sm" onclick="clearAllData()">🗑️ Clear Everything</button>
    </div>`;

  renderSettingsSync();
}

function renderSettingsCategories() {
  const custom = S.customCategories;
  document.getElementById('settings-cats').innerHTML =
    custom.map((c,i) => `
      <div class="cat-form-row" id="catrow-${i}">
        <input class="form-input cat-icon-input" id="ci-icon-${i}" value="${esc(c.icon)}" placeholder="🏷️" maxlength="4" onchange="updateCat(${i})"/>
        <input class="form-input cat-name-input" id="ci-label-${i}" value="${esc(c.label)}" placeholder="Category name" maxlength="30" onchange="updateCat(${i})"/>
        <select class="form-select cat-type-select" id="ci-type-${i}" onchange="updateCat(${i})">
          <option value="expense"${c.type==='expense'?' selected':''}>Expense</option>
          <option value="income"${c.type==='income'?' selected':''}>Income</option>
        </select>
        <button class="btn btn-danger btn-sm" onclick="deleteCat(${i})">✕</button>
      </div>`).join('') +
    `<div class="cat-form-row">
      <input class="form-input cat-icon-input" id="ci-icon-new" placeholder="🏷️" maxlength="4"/>
      <input class="form-input cat-name-input" id="ci-label-new" placeholder="New category…" maxlength="30"/>
      <select class="form-select cat-type-select" id="ci-type-new">
        <option value="expense">Expense</option>
        <option value="income">Income</option>
      </select>
      <button class="btn btn-ghost btn-sm" onclick="addNewCat()">＋ Add</button>
    </div>`;
}

function updateCat(i) {
  const c = S.customCategories[i];
  if (!c) return;
  c.icon  = document.getElementById(`ci-icon-${i}`)?.value.trim()  || c.icon;
  c.label = document.getElementById(`ci-label-${i}`)?.value.trim() || c.label;
  c.type  = document.getElementById(`ci-type-${i}`)?.value         || c.type;
  save();
}

function savePersonNames() {
  PERSONS.forEach(p => {
    const val = document.getElementById(`sp-name-${p.id}`)?.value.trim();
    if (val) S.persons[p.id] = val;
  });
  save();
  render();
  renderPersonToggle();
  const btn = document.querySelector('[onclick="savePersonNames()"]');
  if (btn) { btn.textContent = 'Saved ✓'; setTimeout(()=>btn.textContent='Save Names', 1500); }
}

function importJSON(input) {
  const file = input?.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const d = JSON.parse(e.target.result);
      if (!d.transactions) { alert('Invalid backup file.'); return; }
      if (!confirm(`This will replace all current data. Import ${d.transactions.length} transactions?`)) return;
      d.lastModified = Date.now();
      localStorage.setItem('bb2', JSON.stringify(d));
      load();
      render();
      renderSettings();
      alert('Data imported successfully.');
    } catch { alert('Could not parse JSON file.'); }
  };
  reader.readAsText(file);
}

function clearAllData() {
  if (!confirm('Delete ALL data permanently? This cannot be undone.')) return;
  localStorage.removeItem('bb2');
  localStorage.removeItem('bb-notified');
  location.reload();
}

// ── Income Projection Modal ─────────────────────────────────────────────────────

function openIncomeProjectionModal() {
  S.modal = {type: 'income-proj', editing: false, data: {}};
  document.getElementById('modal-title').textContent = '📐 Income Projection';
  document.getElementById('modal-delete-btn').style.display = 'none';
  document.getElementById('modal-save-btn').style.display = 'inline-flex';
  document.getElementById('modal-save-btn').textContent = 'Save';

  const rows = PERSONS.map(p => {
    const cfg = S.incomeSettings[p.id] || {hourlyRate: 0, expectedHours: 0};
    return `<div class="proj-form-section" style="border-left:3px solid ${p.color};padding-left:12px;margin-bottom:16px">
      <div class="proj-person-lbl">${esc(S.persons[p.id])}</div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Hourly Rate ($)</label>
          <input class="form-input" id="ip-rate-${p.id}" type="number" min="0" step="0.01" value="${cfg.hourlyRate||''}" placeholder="e.g. 25.00"/>
        </div>
        <div class="form-group">
          <label class="form-label">Expected Hours / Month</label>
          <input class="form-input" id="ip-hours-${p.id}" type="number" min="0" step="0.5" value="${cfg.expectedHours||''}" placeholder="e.g. 160"/>
        </div>
      </div>
      <div class="proj-calc" id="ip-calc-${p.id}"></div>
    </div>`;
  }).join('');

  document.getElementById('modal-body').innerHTML = `
    <div class="budget-hint">Set your expected monthly income. When you import your pay CSV, the actual income reconciles against the projection automatically.</div>
    ${rows}`;

  // Live calculation preview
  PERSONS.forEach(p => {
    ['rate','hours'].forEach(field => {
      document.getElementById(`ip-${field}-${p.id}`)?.addEventListener('input', () => updateProjCalc(p.id));
    });
    updateProjCalc(p.id);
  });

  showModal(true);
}

function updateProjCalc(pid) {
  const rate  = parseFloat(document.getElementById(`ip-rate-${pid}`)?.value) || 0;
  const hours = parseFloat(document.getElementById(`ip-hours-${pid}`)?.value) || 0;
  const el    = document.getElementById(`ip-calc-${pid}`);
  if (!el) return;
  el.innerHTML = rate && hours
    ? `<div class="annual-cost">→ ~${fmt(rate * hours)}/month · ~${fmt(rate * hours * 12)}/year</div>`
    : '';
}

function saveIncomeProjection() {
  PERSONS.forEach(p => {
    const rate  = parseFloat(document.getElementById(`ip-rate-${p.id}`)?.value) || 0;
    const hours = parseFloat(document.getElementById(`ip-hours-${p.id}`)?.value) || 0;
    S.incomeSettings[p.id] = {hourlyRate: rate, expectedHours: hours};
  });
  save();
  showModal(false);
  renderIncomeProjection();
}

// ── Custom Categories ───────────────────────────────────────────────────────────

function openCategoryModal() {
  S.modal = {type: 'categories', editing: false, data: {}};
  document.getElementById('modal-title').textContent = '⚙️ Custom Categories';
  document.getElementById('modal-delete-btn').style.display = 'none';
  document.getElementById('modal-save-btn').style.display = 'inline-flex';
  document.getElementById('modal-save-btn').textContent = 'Save';
  renderCategoryModalBody();
  showModal(true);
}

function renderCategoryModalBody() {
  const custom = S.customCategories;
  document.getElementById('modal-body').innerHTML = `
    <div class="budget-hint">Add custom spending/income categories. Built-in ones cannot be removed.</div>
    ${custom.map((c,i) => `
      <div class="cat-form-row" id="catrow-${i}">
        <input class="form-input cat-icon-input" id="ci-icon-${i}" value="${esc(c.icon)}" placeholder="🏷️" maxlength="4"/>
        <input class="form-input cat-name-input" id="ci-label-${i}" value="${esc(c.label)}" placeholder="Category name" maxlength="30"/>
        <select class="form-select cat-type-select" id="ci-type-${i}">
          <option value="expense"${c.type==='expense'?' selected':''}>Expense</option>
          <option value="income"${c.type==='income'?' selected':''}>Income</option>
        </select>
        <button class="btn btn-danger btn-sm" onclick="deleteCat(${i})">✕</button>
      </div>`).join('')}
    <div class="cat-form-row" id="catrow-new">
      <input class="form-input cat-icon-input" id="ci-icon-new" placeholder="🏷️" maxlength="4"/>
      <input class="form-input cat-name-input" id="ci-label-new" placeholder="New category…" maxlength="30"/>
      <select class="form-select cat-type-select" id="ci-type-new">
        <option value="expense">Expense</option>
        <option value="income">Income</option>
      </select>
      <button class="btn btn-ghost btn-sm" onclick="addNewCat()">＋ Add</button>
    </div>`;
}

function addNewCat() {
  const icon  = document.getElementById('ci-icon-new')?.value.trim() || '📌';
  const label = document.getElementById('ci-label-new')?.value.trim();
  const type  = document.getElementById('ci-type-new')?.value || 'expense';
  if (!label) return;
  S.customCategories.push({id: 'c_' + uid(), label, icon, type});
  save();
  if (S.view === 'settings') renderSettingsCategories(); else renderCategoryModalBody();
}

function deleteCat(i) {
  const cat = S.customCategories[i];
  if (cat && S.transactions.some(tx => tx.categoryId === cat.id)) {
    if (!confirm(`"${cat.label}" is used in some transactions. Delete anyway? Those transactions will show as "Other".`)) return;
  }
  S.customCategories.splice(i, 1);
  save();
  if (S.view === 'settings') renderSettingsCategories(); else renderCategoryModalBody();
}

function saveCategoryChanges() {
  S.customCategories.forEach((c, i) => {
    const icon  = document.getElementById(`ci-icon-${i}`)?.value.trim();
    const label = document.getElementById(`ci-label-${i}`)?.value.trim();
    const type  = document.getElementById(`ci-type-${i}`)?.value;
    if (icon)  c.icon  = icon;
    if (label) c.label = label;
    if (type)  c.type  = type;
  });
  save();
  showModal(false);
  render();
}

// ── Cloud Sync (Google Drive AppData) ──────────────────────────────────────────

function loadSyncConfig() {
  SYNC.clientId   = localStorage.getItem('sync_cid') || '';
  SYNC.fileId     = localStorage.getItem('sync_fid') || '';
  SYNC.lastSynced = localStorage.getItem('sync_ts')  || null;
}

function loadGIS() {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.onload = resolve;
    s.onerror = () => reject(new Error('Failed to load Google Identity Services'));
    document.head.appendChild(s);
  });
}

async function initSync() {
  if (!SYNC.clientId) { renderSyncStatus(); return; }
  try {
    await loadGIS();
    SYNC.tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: SYNC.clientId,
      scope: 'https://www.googleapis.com/auth/drive.appdata',
      callback: handleSyncToken,
      error_callback: () => { SYNC.status = 'idle'; renderSyncStatus(); },
    });
    SYNC.status = 'connecting';
    renderSyncStatus();
    SYNC.tokenClient.requestAccessToken({ prompt: '' });
  } catch (e) {
    SYNC.status = 'error';
    renderSyncStatus();
  }
}

function handleSyncToken(resp) {
  if (resp.error) { SYNC.status = 'error'; renderSyncStatus(); return; }
  SYNC.token = resp.access_token;
  SYNC.tokenExpiry = Date.now() + (resp.expires_in - 60) * 1000;
  SYNC.status = 'synced';
  renderSyncStatus();
  syncFromGoogle();
}

async function connectGoogle() {
  if (!SYNC.clientId) return;
  SYNC.status = 'connecting';
  renderSyncStatus();
  try {
    await loadGIS();
    if (!SYNC.tokenClient) {
      SYNC.tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: SYNC.clientId,
        scope: 'https://www.googleapis.com/auth/drive.appdata',
        callback: handleSyncToken,
        error_callback: () => { SYNC.status = 'error'; renderSyncStatus(); },
      });
    }
    SYNC.tokenClient.requestAccessToken({ prompt: 'consent' });
  } catch (e) {
    SYNC.status = 'error';
    renderSyncStatus();
  }
}

function disconnectGoogle() {
  if (SYNC.token && window.google?.accounts?.oauth2) {
    google.accounts.oauth2.revoke(SYNC.token, () => {});
  }
  SYNC.token = ''; SYNC.tokenExpiry = 0; SYNC.tokenClient = null;
  SYNC.clientId = ''; SYNC.fileId = ''; SYNC.status = 'idle'; SYNC.lastSynced = null;
  SYNC.timer = null;
  localStorage.removeItem('sync_cid');
  localStorage.removeItem('sync_fid');
  localStorage.removeItem('sync_ts');
  renderSyncStatus();
  if (S.view === 'settings') renderSettingsSync();
}

function scheduleSyncToGoogle() {
  if (!SYNC.token || !SYNC.clientId) return;
  clearTimeout(SYNC.timer);
  SYNC.timer = setTimeout(syncToGoogle, 3000);
}

async function ensureToken() {
  if (SYNC.token && Date.now() < SYNC.tokenExpiry) return true;
  if (!SYNC.tokenClient) return false;
  return new Promise(resolve => {
    const prev = SYNC.tokenClient.callback;
    SYNC.tokenClient.callback = resp => {
      SYNC.tokenClient.callback = prev;
      if (resp.error || !resp.access_token) { resolve(false); return; }
      SYNC.token = resp.access_token;
      SYNC.tokenExpiry = Date.now() + (resp.expires_in - 60) * 1000;
      resolve(true);
    };
    SYNC.tokenClient.requestAccessToken({ prompt: '' });
  });
}

async function driveReq(url, opts = {}) {
  if (!await ensureToken()) throw new Error('No valid token');
  return fetch(url, {
    ...opts,
    headers: { Authorization: `Bearer ${SYNC.token}`, ...(opts.headers || {}) },
  });
}

async function syncToGoogle() {
  if (!SYNC.clientId || !SYNC.token) return;
  SYNC.status = 'syncing';
  renderSyncStatus();
  try {
    const data = localStorage.getItem('bb2') || '{}';
    const bound = 'vp' + Date.now();
    const meta  = JSON.stringify(SYNC.fileId
      ? { name: 'vantagepoint-data.json' }
      : { name: 'vantagepoint-data.json', parents: ['appDataFolder'] });
    const body = `--${bound}\r\nContent-Type: application/json\r\n\r\n${meta}\r\n--${bound}\r\nContent-Type: application/json\r\n\r\n${data}\r\n--${bound}--`;
    const url = SYNC.fileId
      ? `https://www.googleapis.com/upload/drive/v3/files/${SYNC.fileId}?uploadType=multipart`
      : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
    const res  = await driveReq(url, {
      method:  SYNC.fileId ? 'PATCH' : 'POST',
      headers: { 'Content-Type': `multipart/related; boundary="${bound}"` },
      body,
    });
    const json = await res.json();
    if (json.id && !SYNC.fileId) {
      SYNC.fileId = json.id;
      localStorage.setItem('sync_fid', SYNC.fileId);
    }
    SYNC.lastSynced = new Date().toISOString();
    localStorage.setItem('sync_ts', SYNC.lastSynced);
    SYNC.status = 'synced';
  } catch (e) {
    console.error('[Sync] upload failed:', e);
    SYNC.status = 'error';
  }
  renderSyncStatus();
}

async function syncFromGoogle(force = false) {
  if (!SYNC.clientId || !SYNC.token) return;
  SYNC.status = 'syncing';
  renderSyncStatus();
  try {
    if (!SYNC.fileId) {
      const res  = await driveReq("https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&fields=files(id,name)&q=name%3D'vantagepoint-data.json'");
      const json = await res.json();
      const f    = json.files?.[0];
      if (!f) { await syncToGoogle(); return; }
      SYNC.fileId = f.id;
      localStorage.setItem('sync_fid', SYNC.fileId);
    }
    const localRaw = JSON.parse(localStorage.getItem('bb2') || '{}');
    const localMs  = localRaw.lastModified || 0;
    const dataRes  = await driveReq(`https://www.googleapis.com/drive/v3/files/${SYNC.fileId}?alt=media`);
    const cloud    = await dataRes.json();
    if (!cloud.transactions) { await syncToGoogle(); return; }
    const cloudMs  = cloud.lastModified || 0;
    if (!force && cloudMs <= localMs + 2000) { await syncToGoogle(); return; }
    localStorage.setItem('bb2', JSON.stringify(cloud));
    load();
    render();
    showToast('☁️ Data updated from Google Drive');
    SYNC.lastSynced = new Date().toISOString();
    localStorage.setItem('sync_ts', SYNC.lastSynced);
    SYNC.status = 'synced';
  } catch (e) {
    console.error('[Sync] download failed:', e);
    SYNC.status = 'error';
  }
  renderSyncStatus();
}

function renderSyncStatus() {
  const dot = document.getElementById('sync-dot');
  const lbl = document.getElementById('sync-lbl');
  const map = {
    idle:       { bg: 'var(--border)',   text: 'Not synced' },
    connecting: { bg: '#f59e0b',         text: 'Connecting…' },
    syncing:    { bg: '#f59e0b',         text: 'Syncing…' },
    synced:     { bg: '#22c55e',         text: SYNC.lastSynced ? 'Synced ' + timeSince(SYNC.lastSynced) : 'Synced' },
    error:      { bg: 'var(--expense)',  text: 'Sync error' },
  };
  const s = map[SYNC.status] || map.idle;
  if (dot) dot.style.background = s.bg;
  if (lbl) lbl.textContent = s.text;
  if (S.view === 'settings') renderSettingsSync();
}

function timeSince(iso) {
  const sec = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (sec < 60)    return 'just now';
  if (sec < 3600)  return Math.floor(sec / 60)   + 'm ago';
  if (sec < 86400) return Math.floor(sec / 3600)  + 'h ago';
  return Math.floor(sec / 86400) + 'd ago';
}

function showToast(msg, ms = 3000) {
  let t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  requestAnimationFrame(() => t.classList.add('toast-show'));
  setTimeout(() => { t.classList.remove('toast-show'); setTimeout(() => t.remove(), 300); }, ms);
}

// ── Render: Breakdown ────────────────────────────────────────────────────────

function bdShiftMonth(delta) {
  S.month += delta;
  if (S.month < 0)  { S.month = 11; S.year--; }
  if (S.month > 11) { S.month = 0;  S.year++; }
  renderBreakdown();
}

function bdToggleAllCats() {
  S.bdShowAll = !S.bdShowAll;
  renderBreakdown();
}

function renderBreakdown() {
  const el = document.getElementById('breakdown-content');
  if (!el) return;

  const lbl = document.getElementById('bd-month-lbl');
  if (lbl) lbl.textContent = `${MONTHS[S.month]} ${S.year}`;

  const evs = applyFilters(monthEvents(S.year, S.month))
    .sort((a, b) => b.date.localeCompare(a.date));

  // Per-category expense totals (splits expanded)
  const catTotals = {};
  evs.forEach(({tx}) => {
    txBreakdowns(tx).forEach(({categoryId, amount}) => {
      if (getCat(categoryId).type === 'expense')
        catTotals[categoryId] = (catTotals[categoryId] || 0) + amount;
    });
  });

  const sorted = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);
  const totalSpent = sorted.reduce((s, [, v]) => s + v, 0);

  if (!sorted.length) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">🧮</div>
      <div>No spending for ${esc(MONTHS[S.month])} ${S.year}.</div>
      <div class="empty-sm">Add transactions to see the spending breakdown.</div></div>`;
    return;
  }

  // Fixed color per category (never shifts month to month)
  const colorOf = {};
  sorted.forEach(([id]) => { colorOf[id] = catColor(id); });

  const donutSegs = sorted.map(([id, v]) => ({ v, c: colorOf[id] }));
  const donutGradient = buildDonutGradient(donutSegs);
  const VISIBLE = 9;
  const showAll = !!S.bdShowAll;
  const legendCats = showAll ? sorted : sorted.slice(0, VISIBLE);

  const legendHtml = legendCats.map(([id, amt]) => {
    const cat = getCat(id);
    const pct = totalSpent > 0 ? (amt / totalSpent) * 100 : 0;
    return `<div class="bd-leg-item">
      <span class="bd-leg-dot" style="background:${colorOf[id]}"></span>
      <div class="bd-leg-text">
        <div class="bd-leg-name" title="${esc(cat.label)}">${cat.icon} ${esc(cat.label)}</div>
        <div class="bd-leg-amt">${fmt(amt)} <span class="bd-leg-pct">(${pct.toFixed(1)}%)</span></div>
      </div>
    </div>`;
  }).join('');

  const toggleHtml = sorted.length > VISIBLE
    ? `<button class="bd-show-all" onclick="bdToggleAllCats()">${showAll ? 'Show fewer' : `Show all ${sorted.length} categories`} ▾</button>`
    : '';

  // Transactions list grouped by date
  let txHtml = '';
  let lastDate = null;
  evs.forEach(({date, tx}) => {
    if (date !== lastDate) {
      lastDate = date;
      const [y, m, dd] = date.split('-').map(Number);
      txHtml += `<div class="bd-tx-date">${SHORT[m-1]} ${dd}, ${y}</div>`;
    }
    const cat = getCat(tx.categoryId);
    const income = cat.type === 'income';
    const who = tx.person === 'joint' ? 'Joint' : (S.persons[tx.person] || 'Person A');
    txHtml += `<div class="bd-tx-row" onclick="editTx('${tx.id}')">
      <span class="bd-tx-icon">${cat.icon}</span>
      <span class="bd-tx-name" title="${esc(tx.name)}">${esc(tx.name)}</span>
      <span class="bd-tx-cat">${esc(cat.label)}</span>
      <span class="bd-tx-who">${esc(who)}</span>
      <span class="bd-tx-amt ${income ? 'income-text' : ''}">${income ? '+' : ''}${fmt(tx.amount)}</span>
    </div>`;
  });

  // Summary metrics (spending = expenses)
  const expenseAmts = [];
  evs.forEach(({tx}) => { if (getCat(tx.categoryId).type === 'expense') expenseAmts.push(tx.amount); });
  const largest = expenseAmts.length ? Math.max(...expenseAmts) : 0;
  const avg     = expenseAmts.length ? totalSpent / expenseAmts.length : 0;

  el.innerHTML = `
    <div class="bd-card bd-spending-card">
      <div class="bd-card-title">Spending by Category</div>
      <div class="bd-spending-body">
        <div class="bd-donut-wrap">
          <div class="bd-donut-ring" style="background:${donutGradient}"></div>
          <div class="bd-donut-center">
            <div class="bd-donut-total">${fmt(totalSpent)}</div>
            <div class="bd-donut-total-lbl">Total</div>
          </div>
        </div>
        <div class="bd-legend">
          <div class="bd-legend-grid">${legendHtml}</div>
          ${toggleHtml}
        </div>
      </div>
    </div>

    <div class="bd-lower">
      <div class="bd-card bd-tx-card">
        <div class="bd-card-title">Transactions <span class="muted">· ${evs.length}</span></div>
        <div class="bd-tx-list">${txHtml}</div>
      </div>
      <div class="bd-card bd-summary-card">
        <div class="bd-card-title">Summary</div>
        <div class="bd-sum-row"><span class="bd-sum-lbl">Total transactions</span><span class="bd-sum-val">${evs.length}</span></div>
        <div class="bd-sum-row"><span class="bd-sum-lbl">Largest transaction</span><span class="bd-sum-val">${fmt(largest)}</span></div>
        <div class="bd-sum-row"><span class="bd-sum-lbl">Average transaction</span><span class="bd-sum-val">${fmt(avg)}</span></div>
        <div class="bd-sum-row"><span class="bd-sum-lbl">Total spending</span><span class="bd-sum-val">${fmt(totalSpent)}</span></div>
        <button class="bd-csv-btn" onclick="exportCSV()">Download CSV</button>
      </div>
    </div>`;
}

// ── Budget Alerts ──────────────────────────────────────────────────────────────

function getBudgetAlerts() {
  if (!Object.keys(S.budgets).length) return [];
  const now = new Date();
  const evs = monthEvents(now.getFullYear(), now.getMonth());
  const catTotals = {};
  evs.forEach(({tx}) => {
    txBreakdowns(tx).forEach(({categoryId, amount}) => {
      if (getCat(categoryId).type === 'expense')
        catTotals[categoryId] = (catTotals[categoryId] || 0) + amount;
    });
  });
  return Object.entries(S.budgets)
    .map(([id, budget]) => ({ id, budget, spent: catTotals[id] || 0, cat: getCat(id) }))
    .map(a => ({ ...a, pct: a.spent / a.budget }))
    .filter(a => a.pct >= 0.7)
    .sort((a, b) => b.pct - a.pct);
}

function renderBudgetAlerts() {
  const strip = document.getElementById('budget-alert-strip');
  if (!strip) return;
  const alerts = getBudgetAlerts();
  if (!alerts.length) { strip.innerHTML = ''; return; }

  const items = alerts.map(a => {
    const over  = a.pct >= 1;
    const warn  = a.pct >= 0.9;
    const cls   = over ? 'ba-over' : warn ? 'ba-warn' : 'ba-caution';
    const icon  = over ? '🚨' : warn ? '⚠️' : '🔔';
    const label = over
      ? `${a.cat.icon} <strong>${a.cat.label}</strong> is over budget — ${fmt(a.spent)} of ${fmt(a.budget)}`
      : `${a.cat.icon} <strong>${a.cat.label}</strong> at ${Math.round(a.pct * 100)}% — ${fmt(a.spent)} of ${fmt(a.budget)}`;
    return `<div class="ba-item ${cls}">${icon} <span>${label}</span></div>`;
  }).join('');

  strip.innerHTML = `<div class="budget-alert-strip-inner">${items}<button class="ba-dismiss" onclick="document.getElementById('budget-alert-strip').innerHTML=''">✕</button></div>`;
}

function fireBudgetAlerts() {
  const monthKey = `${new Date().getFullYear()}-${new Date().getMonth()}`;
  getBudgetAlerts().forEach(a => {
    const threshold = a.pct >= 1 ? '100' : '90';
    if (a.pct < 0.9) return;
    const key = `${monthKey}:${a.id}:${threshold}`;
    if (ALERTED_BUDGETS.has(key)) return;
    ALERTED_BUDGETS.add(key);
    const msg = a.pct >= 1
      ? `${a.cat.icon} ${a.cat.label} is over budget (${fmt(a.spent)} / ${fmt(a.budget)})`
      : `${a.cat.icon} ${a.cat.label} at ${Math.round(a.pct * 100)}% of budget`;
    showToast(msg, 5000);
    // Browser notification if permission granted
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      const notified = new Set(JSON.parse(localStorage.getItem('bb-notified') || '[]'));
      if (!notified.has(key)) {
        new Notification('VantagePoint — Budget Alert', { body: msg.replace(/[^\x20-\x7E]/g, '') });
        notified.add(key);
        localStorage.setItem('bb-notified', JSON.stringify([...notified].slice(-200)));
      }
    }
  });
  renderBudgetAlerts();
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

function renderPersonToggle() {
  const btns = [
    {p:'all',   label:'All'},
    {p:'A',     label: S.persons.A},
    {p:'B',     label: S.persons.B},
    {p:'joint', label:'Joint'},
  ];
  document.getElementById('person-toggle').innerHTML = btns.map(({p, label}) =>
    `<button class="person-filter-btn${S.activePerson===p?' active':''}" data-p="${p}" onclick="switchPerson('${p}')">${label}</button>`
  ).join('');
}

function render() {
  renderPersonToggle();
  renderMonthStrip();
  renderFilterBar();
  renderSummary();
  renderCalendar();
  renderUpcoming();
  renderAnalysis();
  renderBudgetAlerts();
}

// ── Init ───────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  load();
  loadSyncConfig();
  initSync();

  document.getElementById('prev-month').addEventListener('click', prevMonth);
  document.getElementById('next-month').addEventListener('click', nextMonth);
  document.getElementById('today-btn').addEventListener('click', goToday);
  document.getElementById('add-tx-btn').addEventListener('click', openAddTx);
  document.getElementById('export-btn').addEventListener('click', exportData);
  document.getElementById('add-goal-btn').addEventListener('click', ()=>openGoalModal());
  document.getElementById('add-debt-btn').addEventListener('click', ()=>openDebtModal());
  document.getElementById('budgets-btn').addEventListener('click', openBudgetModal);
  document.getElementById('import-btn').addEventListener('click', openImportModal);
  document.getElementById('income-proj-btn').addEventListener('click', openIncomeProjectionModal);
  document.getElementById('sidebar-overlay').addEventListener('click', toggleSidebar);

  document.getElementById('vendor-search').addEventListener('input', e => {
    S.vendorSearch = e.target.value;
    renderVendors();
  });

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

  document.getElementById('add-account-btn')?.addEventListener('click', () => openAccountModal());
  document.getElementById('report-btn')?.addEventListener('click', exportPDFReport);
  document.getElementById('bd-prev')?.addEventListener('click', () => bdShiftMonth(-1));
  document.getElementById('bd-next')?.addEventListener('click', () => bdShiftMonth(1));

  initDragDrop();
  checkNotifications();
  render();
  fireBudgetAlerts();
});
