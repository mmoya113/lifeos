import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateDayScore, moneySummary, safeState, streakFor, weekKeys } from '../src/core.js';

const day = '2026-08-06';
const emptyState = () => ({ tasks:[], habits:[], focus:{ daily:{} } });

test('moneySummary separates income, expenses and balance', () => {
  assert.deepEqual(moneySummary([{ type:'income', amount:100 }, { type:'expense', amount:35.5 }]), { income:100, expense:35.5, balance:64.5 });
});

test('calculateDayScore weights tasks, habits and focus', () => {
  const state = emptyState();
  state.tasks = [{ done:true, due:day }, { done:false, due:day }];
  state.habits = [{ checks:[day] }, { checks:[] }];
  state.focus.daily[day] = 25;
  assert.equal(calculateDayScore(state, day), 50);
});

test('streakFor counts consecutive days including today', () => {
  const date = new Date('2026-08-06T12:00:00Z');
  assert.equal(streakFor(['2026-08-04','2026-08-05','2026-08-06'], date), 3);
});

test('weekKeys always returns seven dates', () => assert.equal(weekKeys(new Date('2026-08-06T12:00:00Z')).length, 7));

test('safeState rejects incomplete backups', () => {
  const fallback = { fallback:true };
  assert.equal(safeState({ tasks:[] }, fallback), fallback);
});
