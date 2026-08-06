import { calculateDayScore, moneySummary, safeState, streakFor, todayKey, uid, weekKeys } from './core.js';

const STORAGE_KEY = 'lifeos:v1';
const dateToday = todayKey();
const daysAgo = amount => { const date = new Date(); date.setDate(date.getDate() - amount); return todayKey(date); };

const DEFAULT_STATE = {
  profile: { name: 'Marc', currency: 'EUR', theme: 'dark' },
  tasks: [
    { id: 'welcome-1', title: 'Choose the one thing that would make today count', area: 'Personal', priority: 3, due: dateToday, done: false, created: Date.now() },
    { id: 'welcome-2', title: 'Do one focused session without your phone', area: 'Study', priority: 2, due: dateToday, done: false, created: Date.now() - 1 },
    { id: 'welcome-3', title: 'Move your body for at least 20 minutes', area: 'Health', priority: 1, due: dateToday, done: false, created: Date.now() - 2 }
  ],
  habits: [
    { id: 'habit-1', name: 'Move', icon: '⚡', color: '#a7ff66', checks: [daysAgo(1), daysAgo(2), daysAgo(3)] },
    { id: 'habit-2', name: 'Read', icon: '📚', color: '#8878ff', checks: [daysAgo(1), daysAgo(3)] },
    { id: 'habit-3', name: 'Hydrate', icon: '💧', color: '#54c8ff', checks: [daysAgo(1), daysAgo(2)] }
  ],
  focus: { totalMinutes: 0, sessions: 0, daily: {} },
  money: [],
  activity: {}
};

let state = loadState();
let currentFilter = 'all';
let timer = { total: 1500, remaining: 1500, interval: null, running: false };

function loadState() {
  try { return safeState(JSON.parse(localStorage.getItem(STORAGE_KEY)), structuredClone(DEFAULT_STATE)); }
  catch { return structuredClone(DEFAULT_STATE); }
}
function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); renderAll(); }
const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const escapeHtml = value => String(value).replace(/[&<>'"]/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[char]));
const formatDate = value => value ? new Intl.DateTimeFormat(undefined, { month:'short', day:'numeric' }).format(new Date(`${value}T12:00:00`)) : 'Anytime';
const formatMoney = value => new Intl.NumberFormat(undefined, { style:'currency', currency:state.profile.currency }).format(value);

function toast(message) { const node = $('#toast'); node.querySelector('p').textContent = message; node.classList.add('show'); clearTimeout(toast.timer); toast.timer = setTimeout(() => node.classList.remove('show'), 2300); }

function navigate(view) {
  $$('.view').forEach(node => node.classList.toggle('active', node.id === `${view}View`));
  $$('[data-view]').forEach(node => node.classList.toggle('active', node.dataset.view === view));
  history.replaceState(null, '', `#${view}`);
  window.scrollTo({ top:0, behavior:'smooth' });
}

function taskHtml(task, planner = false) {
  return `<div class="${planner ? 'planner-task' : 'task-item'} ${task.done ? 'done' : ''}" data-id="${task.id}">
    <input class="task-check" type="checkbox" ${task.done ? 'checked' : ''} aria-label="Complete ${escapeHtml(task.title)}">
    <div class="task-main"><strong>${escapeHtml(task.title)}</strong><small>${escapeHtml(task.area)} · ${formatDate(task.due)}</small></div>
    ${planner ? `<div class="task-tags"><span class="tag">${escapeHtml(task.area)}</span><span class="tag">${task.due === dateToday ? 'Today' : formatDate(task.due)}</span></div>` : ''}
    <i class="priority-dot priority-${task.priority}" title="Priority ${task.priority}"></i><button class="delete-task" aria-label="Delete task">×</button>
  </div>`;
}

function renderTasks() {
  const today = state.tasks.filter(task => !task.done && (!task.due || task.due <= dateToday)).slice(0, 4);
  $('#todayTasks').innerHTML = today.length ? today.map(task => taskHtml(task)).join('') : '<div class="task-item"><div class="task-main"><strong>Today is clear ✦</strong><small>Add your next move or enjoy the space.</small></div></div>';
  const area = $('#areaFilter')?.value || 'all';
  const filtered = state.tasks.filter(task => (currentFilter === 'all' || (currentFilter === 'done') === task.done) && (area === 'all' || task.area === area));
  $('#plannerTasks').innerHTML = filtered.map(task => taskHtml(task, true)).join('');
  $('#taskEmpty').style.display = filtered.length ? 'none' : 'block';
  $$('.task-check').forEach(box => box.addEventListener('change', event => {
    const task = state.tasks.find(item => item.id === event.target.closest('[data-id]').dataset.id); task.done = event.target.checked;
    state.activity[dateToday] = (state.activity[dateToday] || 0) + (task.done ? 1 : -1); saveState(); toast(task.done ? 'Momentum gained' : 'Task reopened');
  }));
  $$('.delete-task').forEach(button => button.addEventListener('click', event => { state.tasks = state.tasks.filter(item => item.id !== event.target.closest('[data-id]').dataset.id); saveState(); toast('Task removed'); }));
}

function habitHtml(habit, full = false) {
  const checked = habit.checks.includes(dateToday); const streak = streakFor(habit.checks);
  const recent = weekKeys().map((day, index) => `<span class="habit-day ${habit.checks.includes(day) ? 'hit' : ''}">${'MTWTFSS'[index]}</span>`).join('');
  return `<div class="habit-row" data-id="${habit.id}" style="--habit-color:${habit.color}"><span class="habit-icon">${habit.icon}</span><div class="habit-info"><strong>${escapeHtml(habit.name)}</strong><small>${streak} day streak · ${habit.checks.length} total</small></div>${full ? `<div class="habit-week">${recent}</div>` : ''}<button class="habit-check ${checked ? 'checked' : ''}" aria-label="Check in">✓</button>${full ? '<button class="delete-habit" aria-label="Delete habit">×</button>' : ''}</div>`;
}

function renderHabits() {
  $('#todayHabits').innerHTML = state.habits.slice(0, 4).map(habit => habitHtml(habit)).join('') || '<p class="muted">Create your first habit.</p>';
  $('#habitManager').innerHTML = state.habits.map(habit => habitHtml(habit, true)).join('');
  const completed = state.habits.filter(habit => habit.checks.includes(dateToday)).length;
  const percent = state.habits.length ? Math.round(completed / state.habits.length * 100) : 0;
  const best = Math.max(0, ...state.habits.map(habit => streakFor(habit.checks)));
  $('#habitBest').textContent = `${best} day${best === 1 ? '' : 's'}`; $('#habitPercent').textContent = `${percent}%`; $('#habitProgress').style.width = `${percent}%`;
  $('#totalChecks').textContent = state.habits.reduce((total, habit) => total + habit.checks.length, 0);
  $$('.habit-check').forEach(button => button.addEventListener('click', event => {
    const habit = state.habits.find(item => item.id === event.target.closest('[data-id]').dataset.id);
    habit.checks = habit.checks.includes(dateToday) ? habit.checks.filter(day => day !== dateToday) : [...habit.checks, dateToday]; saveState(); toast(habit.checks.includes(dateToday) ? 'Habit checked in' : 'Check-in removed');
  }));
  $$('.delete-habit').forEach(button => button.addEventListener('click', event => { state.habits = state.habits.filter(item => item.id !== event.target.closest('[data-id]').dataset.id); saveState(); toast('Habit removed'); }));
}

function renderDashboard() {
  const now = new Date(); const hour = now.getHours();
  $('#greeting').textContent = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  $('#fullDate').textContent = new Intl.DateTimeFormat(undefined, { weekday:'long', month:'long', day:'numeric' }).format(now).toUpperCase();
  const score = calculateDayScore(state); $('#dayScore').textContent = score; $('#scoreRing').style.setProperty('--score', score); $('#scoreLabel').textContent = score > 80 ? 'Exceptional day' : score > 50 ? 'Momentum building' : score > 0 ? 'Keep moving' : 'Ready to begin';
  const week = weekKeys(); const values = week.map(day => Math.max(0, state.activity[day] || 0)); const peak = Math.max(3, ...values);
  $('#weekChart').innerHTML = week.map((day, index) => `<div class="bar-wrap"><i class="bar ${day === dateToday ? 'today' : ''}" style="height:${Math.max(6, values[index] / peak * 100)}%"></i><small>${'MTWTFSS'[index]}</small></div>`).join('');
  $('#tasksDone').textContent = state.tasks.filter(task => task.done).length; $('#focusMinutes').textContent = `${state.focus.daily[dateToday] || 0}m`; $('#bestStreak').textContent = Math.max(0, ...state.habits.map(habit => streakFor(habit.checks)));
}

function renderMoney() {
  const summary = moneySummary(state.money); $('#balance').textContent = formatMoney(summary.balance); $('#incomeTotal').textContent = formatMoney(summary.income); $('#expenseTotal').textContent = formatMoney(summary.expense);
  $('#balanceDelta').textContent = state.money.length ? `${state.money.length} tracked ${state.money.length === 1 ? 'entry' : 'entries'}` : 'Start tracking to see your progress';
  const icons = { Work:'↗', Food:'◉', Transport:'➜', Fun:'✦', Shopping:'◇', Other:'•' };
  $('#transactions').innerHTML = state.money.length ? [...state.money].reverse().map(entry => `<div class="transaction" data-id="${entry.id}"><span class="transaction-icon">${icons[entry.category] || '•'}</span><div class="transaction-info"><strong>${escapeHtml(entry.description)}</strong><small>${escapeHtml(entry.category)} · ${formatDate(entry.date)}</small></div><strong class="transaction-amount ${entry.type}">${entry.type === 'income' ? '+' : '−'}${formatMoney(entry.amount)}</strong><button aria-label="Delete entry">×</button></div>`).join('') : '<div class="empty-state" style="display:block;padding:35px"><p>No entries yet. Your numbers will appear here.</p></div>';
  $$('#transactions .transaction button').forEach(button => button.addEventListener('click', event => { state.money = state.money.filter(item => item.id !== event.target.closest('[data-id]').dataset.id); saveState(); toast('Entry removed'); }));
}

function renderProfile() { const initial = (state.profile.name || 'Y')[0].toUpperCase(); $('#avatar').textContent = initial; $('#profileName').textContent = state.profile.name; $('#heroName').textContent = `${state.profile.name}.`; $('#nameSetting').value = state.profile.name; $('#currencySetting').value = state.profile.currency; document.body.classList.toggle('light', state.profile.theme === 'light'); }
function renderFocusStats() { const today = state.focus.daily[dateToday] || 0; $('#focusToday').textContent = `${today} min`; $('#focusSessions').textContent = state.focus.sessions; $('#focusAllTime').textContent = `${Math.floor(state.focus.totalMinutes / 60)}h ${state.focus.totalMinutes % 60}m`; }
function renderAll() { renderProfile(); renderTasks(); renderHabits(); renderDashboard(); renderMoney(); renderFocusStats(); }

function updateTimer() {
  const minutes = Math.floor(timer.remaining / 60); const seconds = timer.remaining % 60;
  $('#timerText').textContent = `${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}`;
  $('#timerRing').style.setProperty('--timer-progress', ((timer.total - timer.remaining) / timer.total) * 100);
  document.title = timer.running ? `${$('#timerText').textContent} — LifeOS` : 'LifeOS — Make today count';
}
function toggleTimer() {
  if (timer.running) { clearInterval(timer.interval); timer.running = false; $('#timerStart').textContent = 'Resume focus'; $('#timerStatus').textContent = 'Paused'; return; }
  timer.running = true; $('#timerStart').textContent = 'Pause'; $('#timerStatus').textContent = $('#focusIntention').value || 'In deep focus';
  timer.interval = setInterval(() => { timer.remaining -= 1; updateTimer(); if (timer.remaining <= 0) completeTimer(); }, 1000);
}
function completeTimer() {
  clearInterval(timer.interval); timer.running = false; const minutes = Math.round(timer.total / 60); state.focus.totalMinutes += minutes; state.focus.sessions += 1; state.focus.daily[dateToday] = (state.focus.daily[dateToday] || 0) + minutes; state.activity[dateToday] = (state.activity[dateToday] || 0) + 1; saveState();
  timer.remaining = timer.total; updateTimer(); $('#timerStart').textContent = 'Start focus'; $('#timerStatus').textContent = 'Session complete — great work'; toast(`${minutes} focused minutes logged`);
  if ('Notification' in window && Notification.permission === 'granted') new Notification('LifeOS', { body:'Focus session complete. Take a breath.' });
}

function bindEvents() {
  $$('[data-view]').forEach(button => button.addEventListener('click', () => navigate(button.dataset.view)));
  $$('[data-view-target]').forEach(button => button.addEventListener('click', () => navigate(button.dataset.viewTarget)));
  $$('[data-open]').forEach(button => button.addEventListener('click', () => $(`#${button.dataset.open}`).showModal()));
  $$('.filter-tabs button').forEach(button => button.addEventListener('click', () => { currentFilter = button.dataset.filter; $$('.filter-tabs button').forEach(node => node.classList.toggle('active', node === button)); renderTasks(); }));
  $('#areaFilter').addEventListener('change', renderTasks);
  $('#taskForm').addEventListener('submit', event => { event.preventDefault(); const data = new FormData(event.target); state.tasks.unshift({ id:uid('task'), title:data.get('title').trim(), area:data.get('area'), priority:Number(data.get('priority')), due:data.get('due') || dateToday, done:false, created:Date.now() }); saveState(); event.target.reset(); $('#taskModal').close(); toast('Task added'); });
  $('#habitForm').addEventListener('submit', event => { event.preventDefault(); const data = new FormData(event.target); state.habits.push({ id:uid('habit'), name:data.get('name').trim(), icon:data.get('icon'), color:data.get('color'), checks:[] }); saveState(); event.target.reset(); $('#habitModal').close(); toast('Habit created'); });
  $('#moneyForm').addEventListener('submit', event => { event.preventDefault(); const data = new FormData(event.target); state.money.push({ id:uid('money'), description:data.get('description').trim(), type:data.get('type'), amount:Number(data.get('amount')), category:data.get('category'), date:dateToday }); saveState(); event.target.reset(); $('#moneyModal').close(); toast('Entry tracked'); });
  $('#themeToggle').addEventListener('click', () => { state.profile.theme = state.profile.theme === 'light' ? 'dark' : 'light'; saveState(); });
  $('#saveSettings').addEventListener('click', () => { state.profile.name = $('#nameSetting').value.trim() || 'You'; state.profile.currency = $('#currencySetting').value; saveState(); toast('Settings saved'); });
  $('#exportData').addEventListener('click', () => { const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([JSON.stringify(state, null, 2)], {type:'application/json'})); link.download = `lifeos-backup-${dateToday}.json`; link.click(); URL.revokeObjectURL(link.href); toast('Backup exported'); });
  $('#importData').addEventListener('change', async event => { try { const imported = safeState(JSON.parse(await event.target.files[0].text()), null); if (!imported) throw new Error(); state = imported; saveState(); toast('Backup restored'); } catch { toast('That backup is not valid'); } event.target.value=''; });
  $('#resetData').addEventListener('click', () => { if (confirm('Reset LifeOS and delete all local data? This cannot be undone.')) { state = structuredClone(DEFAULT_STATE); saveState(); toast('LifeOS reset'); } });
  $('#timerStart').addEventListener('click', toggleTimer); $('#timerReset').addEventListener('click', () => { clearInterval(timer.interval); timer.running=false; timer.remaining=timer.total; updateTimer(); $('#timerStart').textContent='Start focus'; $('#timerStatus').textContent='Ready when you are'; });
  $$('.timer-modes button').forEach(button => button.addEventListener('click', () => { clearInterval(timer.interval); timer.running=false; timer.total=Number(button.dataset.minutes)*60; timer.remaining=timer.total; $$('.timer-modes button').forEach(node => node.classList.toggle('active', node===button)); $('#timerStart').textContent='Start'; updateTimer(); }));
  $('#timerSound').addEventListener('click', async () => { if ('Notification' in window && Notification.permission === 'default') await Notification.requestPermission(); toast('Session notifications enabled'); });
  const palette = $('#commandPalette'); const openPalette = () => { palette.showModal(); renderCommands(''); setTimeout(() => $('#commandInput').focus(), 30); };
  $('#commandTrigger').addEventListener('click', openPalette); $('#commandInput').addEventListener('input', event => renderCommands(event.target.value));
  document.addEventListener('keydown', event => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase()==='k') { event.preventDefault(); palette.open ? palette.close() : openPalette(); } if (!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName) && /^[1-5]$/.test(event.key)) navigate(['today','planner','habits','focus','money'][Number(event.key)-1]); });
}

function renderCommands(query) {
  const commands = [{label:'Go to Today',icon:'◫',action:()=>navigate('today')},{label:'Open Planner',icon:'✓',action:()=>navigate('planner')},{label:'Start Focus',icon:'◎',action:()=>navigate('focus')},{label:'Add a task',icon:'＋',action:()=>$('#taskModal').showModal()},{label:'Create a habit',icon:'↗',action:()=>$('#habitModal').showModal()},...state.tasks.map(task=>({label:task.title,icon:task.done?'✓':'○',action:()=>navigate('planner')}))].filter(command=>command.label.toLowerCase().includes(query.toLowerCase())).slice(0,8);
  $('#commandResults').innerHTML = commands.map((command,index)=>`<button class="command-item" data-command="${index}"><b>${command.icon}</b>${escapeHtml(command.label)}<span>Enter ↵</span></button>`).join('') || '<div class="empty-state" style="display:block;padding:25px">No results</div>';
  $$('.command-item').forEach(button=>button.addEventListener('click',()=>{ $('#commandPalette').close(); commands[Number(button.dataset.command)].action(); }));
}

bindEvents(); renderAll(); updateTimer(); navigate(location.hash.slice(1) || 'today');
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('./sw.js').catch(() => {});
