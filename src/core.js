export const todayKey = (date = new Date()) => date.toISOString().slice(0, 10);

export function uid(prefix = 'item') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function calculateDayScore(state, date = todayKey()) {
  const dueTasks = state.tasks.filter(task => !task.due || task.due <= date);
  const taskRate = dueTasks.length ? dueTasks.filter(task => task.done).length / dueTasks.length : 0;
  const habitRate = state.habits.length ? state.habits.filter(habit => habit.checks.includes(date)).length / state.habits.length : 0;
  const focusRate = Math.min((state.focus.daily?.[date] || 0) / 50, 1);
  return Math.round((taskRate * 0.5 + habitRate * 0.35 + focusRate * 0.15) * 100);
}

export function streakFor(checks = [], date = new Date()) {
  const days = new Set(checks);
  const cursor = new Date(date);
  let streak = 0;
  if (!days.has(todayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (days.has(todayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function moneySummary(entries = []) {
  return entries.reduce((sum, entry) => {
    const amount = Number(entry.amount) || 0;
    sum[entry.type] += amount;
    sum.balance += entry.type === 'income' ? amount : -amount;
    return sum;
  }, { income: 0, expense: 0, balance: 0 });
}

export function weekKeys(date = new Date()) {
  const monday = new Date(date);
  const day = (monday.getDay() + 6) % 7;
  monday.setDate(monday.getDate() - day);
  return Array.from({ length: 7 }, (_, index) => {
    const next = new Date(monday); next.setDate(monday.getDate() + index); return todayKey(next);
  });
}

export function safeState(candidate, fallback) {
  if (!candidate || typeof candidate !== 'object') return fallback;
  const required = ['profile', 'tasks', 'habits', 'focus', 'money'];
  return required.every(key => Object.hasOwn(candidate, key)) ? candidate : fallback;
}
