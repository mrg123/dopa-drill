// Trophies (id036): many small achievements, like the ones in mobile games.
// Each series is one measure with rising steps; every step is a trophy.
// Days and streaks get dense steps; volume series get wide ones so long
// sessions are not pushed too hard (docs/SPEC.md 14.7). Nothing is
// random, conditions are always shown (except a few secrets), and a trophy,
// once earned, is kept.
import { SKILLS, LANES } from './skills.js';
import { isUnlocked, isMastered, starsOf } from './session.js';

export const CATS = ['继续', '多多', '技能', '成长', '加时', '连击', '精准', '多巴', '复习', '年级', '收藏', '秘密'];

const fmt = (n) => (n >= 10000 && n % 10000 === 0 ? `${n / 10000}万` : n.toLocaleString('ja-JP'));
const DOPA_LABEL = { 2: '100', 3: '1000', 4: '1万', 5: '10万', 6: '100万', 7: '1000万', 8: '1亿', 9: '10亿' };
const RANKS = ['bronze', 'silver', 'gold', 'rainbow'];
export const RANK_NAME = { bronze: '铜', silver: '银', gold: '金', rainbow: '彩虹', secret: '秘密' };

// Rank by position in its series: first ~30% bronze, then silver, gold, and the last step rainbow.
function rankAt(i, n) {
  if (n === 1) return 'gold';
  if (i === n - 1) return 'rainbow';
  return RANKS[Math.min(2, Math.floor((i / (n - 1)) * 3.3))];
}

// A series: { key, cat, title, metric, steps, name(v), desc(v) } or explicit items.
const SERIES_DEFS = [
  { key: 'streak', cat: '继续', title: '连续每天玩', metric: 'bestStreak', steps: [3, 5, 7, 10, 14, 21, 30, 50, 75, 100, 150, 200, 365], name: (v) => `连续 ${v} 天`, desc: (v) => `连续玩 ${v} 天` },
  { key: 'days', cat: '继续', title: '游玩天数', metric: 'days', steps: [1, 3, 5, 7, 10, 15, 20, 30, 40, 50, 75, 100, 150, 200, 300, 365, 500, 730, 1000], name: (v) => `游玩天数 ${fmt(v)} 天`, desc: (v) => `累计游玩 ${fmt(v)} 天` },
  { key: 'stickers', cat: '继续', title: '登录贴纸', metric: 'stickers', steps: [1, 7, 14, 30, 50, 100, 200, 365], name: (v) => `贴纸 ${v} 张`, desc: (v) => `收集 ${v} 张登录奖励贴纸` },
  { key: 'crowns', cat: '继续', title: '皇冠贴纸', metric: 'crowns', steps: [1, 3, 5, 10, 20, 52], name: (v) => `皇冠 ${v} 个`, desc: (v) => `收集 ${v} 张第 7 天的皇冠贴纸` },
  { key: 'problems', cat: '多多', title: '做题数量', metric: 'problems', steps: [10, 30, 50, 100, 200, 300, 500, 750, 1000, 1500, 2000, 3000, 5000, 7500, 10000, 20000, 30000, 50000, 100000], name: (v) => `做对 ${fmt(v)} 题`, desc: (v) => `累计做题 ${fmt(v)} 道` },
  { key: 'cells', cat: '多多', title: '输入的数字格', metric: 'cells', steps: [100, 500, 1000, 3000, 5000, 10000, 30000, 50000, 100000, 300000], name: (v) => `输入 ${fmt(v)} 位`, desc: (v) => `累计输入正确数字 ${fmt(v)} 位` },
  { key: 'plays', cat: '多多', title: '游玩次数', metric: 'plays', steps: [1, 3, 5, 10, 20, 30, 50, 100, 200, 300, 500, 1000, 2000], name: (v) => `玩 ${fmt(v)} 次`, desc: (v) => `累计把练习通关 ${fmt(v)} 次` },
  { key: 'minutes', cat: '多多', title: '游玩时长', metric: 'minutes', steps: [10, 30, 60, 120, 300, 600, 1200, 3000], name: (v) => (v >= 60 ? `合计 ${v / 60} 小时` : `合计 ${v} 分钟`), desc: (v) => `累计游玩时长 ${v >= 60 ? `${v / 60} 小时` : `${v} 分钟`}` },
  { key: 'unlocked', cat: '技能', title: '技能解锁', metric: 'unlocked', steps: [3, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 58], name: (v) => `解锁 ${v} 个`, desc: (v) => `解锁 ${v} 个技能` },
  { key: 'mastered', cat: '技能', title: '技能大师', metric: 'mastered', steps: [1, 3, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 58], name: (v) => `大师 ${v} 个`, desc: (v) => `把 ${v} 个技能练到大师` },
  { key: 'gradeDone', cat: '技能', title: '所有年级全部练到大师', items: [1, 2, 3, 4, 5, 6].map((g) => ({ id: `gradeDone-${g}`, metric: `gradeDone${g}`, need: 1, name: `${g} 年级全部大师`, desc: `把 ${g} 年级的技能全部练到大师` })) },
  { key: 'laneDone', cat: '技能', title: '所有系别全部练到大师', items: LANES.map((l, i) => ({ id: `laneDone-${i}`, metric: `laneDone${i}`, need: 1, name: `${l} 大师`, desc: `把「${l}」系的技能全部练到大师` })) },
  { key: 'extras', cat: '加时', title: '进入加时', metric: 'extras', steps: [1, 3, 5, 10, 20, 30, 50, 100, 200, 300], name: (v) => `加时 ${v} 次`, desc: (v) => `进入加时 ${v} 次` },
  { key: 'extraBest', cat: '加时', title: '单次加时的最高分', metric: 'extraBest', steps: [3, 5, 7, 10, 12, 15, 18, 20, 23, 25, 30], name: (v) => `单局 ${v} 题`, desc: (v) => `单次加时做对 ${v} 题` },
  { key: 'extraSolved', cat: '加时', title: '在加时里做题', metric: 'extraSolved', steps: [10, 30, 50, 100, 200, 300, 500, 1000, 2000, 3000], name: (v) => `加时 ${fmt(v)} 题`, desc: (v) => `在加时里累计做对 ${fmt(v)} 题` },
  { key: 'combo', cat: '连击', title: '连击', metric: 'maxCombo', steps: [5, 10, 15, 20, 30, 40, 50, 75, 100, 150, 200, 300], name: (v) => `${v} 连击`, desc: (v) => `达成 ${v} 连击` },
  { key: 'perfects', cat: '精准', title: '零失误通关', metric: 'perfects', steps: [1, 3, 5, 10, 20, 30, 50, 100, 200, 300], name: (v) => `零失误 ${v} 次`, desc: (v) => `以 100% 首次正确率通关 ${v} 次` },
  { key: 'firstTry', cat: '精准', title: '首次答对', metric: 'firstTry', steps: [10, 50, 100, 300, 500, 1000, 3000, 5000, 10000, 30000], name: (v) => `首次答对 ${fmt(v)} 题`, desc: (v) => `一次答对的题数 ${fmt(v)} 道` },
  { key: 'dopa', cat: '多巴', title: '多巴', metric: 'bestDopaL', steps: [2, 3, 4, 5, 6, 7, 8, 9], name: (v) => `多巴 ${DOPA_LABEL[v]}`, desc: (v) => `单局多巴得分超过 ${DOPA_LABEL[v]}` },
  { key: 'review', cat: '复习', title: '复习', metric: 'reviewSolved', steps: [1, 5, 10, 30, 50, 100, 200, 300], name: (v) => `复习 ${v} 题`, desc: (v) => `重做做错的题 ${v} 道` },
  ...[1, 2, 3, 4, 5, 6].map((g) => ({ key: `grade${g}`, cat: '年级', title: `在 ${g} 年级玩`, metric: `gradePlays${g}`, steps: [1, 10, 30], name: (v) => `${g} 年级 ${v} 次`, desc: (v) => `在「${g} 年级」玩 ${v} 次` })),
  { key: 'secret', cat: '秘密', title: '秘密', items: [
    { id: 'secret-perfect14', metric: 'flag:perfect14', need: 1, name: '14 题全对', desc: '14 题全部一次做对，没有「差一点」', secret: true },
    { id: 'secret-extraClean', metric: 'flag:extraClean', need: 1, name: '加时零失误', desc: '加时里做对 5 题以上，且没有「差一点」', secret: true },
    { id: 'secret-sunday', metric: 'flag:sunday', need: 1, name: '星期天的算术', desc: '在星期天玩', secret: true },
    { id: 'secret-newyear', metric: 'flag:newyear', need: 1, name: '新年练习', desc: '1 月 1 日玩一次', secret: true },
    { id: 'secret-comeback', metric: 'flag:comeback', need: 1, name: '欢迎回来！', desc: '隔一周以上再来玩', secret: true },
    { id: 'secret-allmodes', metric: 'allModes', need: 1, name: '所有玩法都玩过', desc: '把「我的水平・按年级・练习・复习」全部玩一遍', secret: true },
  ] },
];

// Other features add their own series (id045). Keep this list append-only.
export const SERIES = [];
export const TROPHIES = [];
export const TROPHY = {};
export function addSeries(def) {
  const items = def.items
    ? def.items.map((it, i, a) => ({ rank: it.secret ? 'secret' : rankAt(i, a.length), ...it }))
    : def.steps.map((v, i, a) => ({ id: `${def.key}-${v}`, metric: def.metric, need: v, name: def.name(v), desc: def.desc(v), rank: rankAt(i, a.length) }));
  const series = { key: def.key, cat: def.cat, title: def.title, items: items.map((it) => ({ ...it, series: def.key, cat: def.cat, reward: it.reward || null })) };
  SERIES.push(series);
  for (const it of series.items) { TROPHIES.push(it); TROPHY[it.id] = it; }
  return series;
}
SERIES_DEFS.forEach(addSeries);

// id045: the features added after id036 (stars, quests, hammer, rust,
// time capsule, "有进步", collection).
[
  { key: 'questDays', cat: '继续', title: '任务全完成', metric: 'questDays', steps: [1, 3, 7, 14, 30, 50, 100, 200, 365], name: (v) => `全部完成 ${v} 天`, desc: (v) => `完成当日全部任务的天数 ${v} 天` },
  { key: 'questRun', cat: '继续', title: '连续完成每日任务', metric: 'questRun', steps: [2, 3, 5, 7, 14, 30], name: (v) => `任务连续 ${v} 天`, desc: (v) => `连续 ${v} 天完成全部任务` },
  { key: 'hammer', cat: '继续', title: '补签锤', metric: 'hammerUsed', steps: [1, 3, 10], name: (v) => (v === 1 ? '第一次补签' : `补签 ${v} 次`), desc: (v) => `使用补签锤 ${v} 次` },
  { key: 'starsTotal', cat: '技能', title: '星星数量', metric: 'starsTotal', steps: [5, 10, 25, 50, 75, 100, 150, 200, 250, 290], name: (v) => `星星 ${v} 个`, desc: (v) => `累计收集技能星 ${v} 颗` },
  { key: 'star5', cat: '技能', title: '☆5 技能', metric: 'star5', steps: [1, 3, 5, 10, 20, 30, 58], name: (v) => `☆5 ${v} 个`, desc: (v) => `做出 ${v} 个 ☆5 技能` },
  { key: 'gradeStar3', cat: '技能', title: '所有年级全 ☆3', items: [1, 2, 3, 4, 5, 6].map((g) => ({ id: `gradeStar3-${g}`, metric: `gradeStar3${g}`, need: 1, name: `${g} 年级全部 ☆3`, desc: `把 ${g} 年级的技能全部练到 ☆3 以上` })) },
  { key: 'polished', cat: '成长', title: '擦亮生锈的技能', metric: 'polished', steps: [1, 3, 5, 10, 30, 50], name: (v) => `擦亮 ${v} 次`, desc: (v) => `擦亮生锈技能 ${v} 次` },
  { key: 'capsules', cat: '成长', title: '时间胶囊', metric: 'capsules', steps: [1, 3, 5, 10, 30], name: (v) => `胶囊 ${v} 个`, desc: (v) => `打开 ${v} 个时间胶囊` },
  { key: 'capsuleFaster', cat: '成长', title: '比那天更快', metric: 'capsuleFaster', steps: [1, 5, 10], name: (v) => `比那天更快 ${v} 次`, desc: (v) => `在时间胶囊里比那天更快（${v} 次）` },
  { key: 'grew', cat: '成长', title: '有进步！', metric: 'grew', steps: [1, 5, 10, 30, 50, 100], name: (v) => `进步 ${v} 次`, desc: (v) => `结果页出现「有进步！」${v} 次` },
  { key: 'items', cat: '收藏', title: '收藏', metric: 'itemsOwned', steps: [10, 20, 30, 40, 47], name: (v) => `收藏 ${v} 个`, desc: (v) => `收集 ${v} 个收藏` },
  { key: 'catComplete', cat: '收藏', title: '收藏全收集', metric: 'catComplete', steps: [1, 3, 5, 8], name: (v) => `集齐 ${v} 类`, desc: (v) => `集齐 ${v} 类收藏` },
].forEach(addSeries);

// Numbers every trophy is measured against, from the saved state.
// snap: { stats, prog, bestStreak, stickers, crowns, ...extra metrics }
export function trophyMetrics(snap) {
  const s = snap.stats || {};
  const prog = snap.prog || { skills: {} };
  const m = {
    bestStreak: snap.bestStreak || 0, days: s.days || 0, stickers: snap.stickers || 0, crowns: snap.crowns || 0,
    problems: s.problems || 0, cells: s.cells || 0, plays: s.plays || 0, minutes: Math.floor((s.playMs || 0) / 60000),
    unlocked: SKILLS.filter((x) => isUnlocked(prog, x.id)).length, mastered: SKILLS.filter((x) => isMastered(prog, x.id)).length,
    extras: s.extras || 0, extraBest: s.extraBest || 0, extraSolved: s.extraSolved || 0, maxCombo: s.maxCombo || 0,
    perfects: s.perfects || 0, firstTry: s.firstTry || 0, bestDopaL: Math.floor((s.bestDopaL || 0) + 1e-9), reviewSolved: s.reviewSolved || 0,
  };
  const stars = Object.fromEntries(SKILLS.map((x) => [x.id, starsOf(prog, x.id)]));
  m.starsTotal = Object.values(stars).reduce((a, b) => a + b, 0);
  m.star5 = Object.values(stars).filter((n) => n >= 5).length;
  m.polished = s.polished || 0; m.capsules = s.capsules || 0; m.capsuleFaster = s.capsuleFaster || 0; m.grew = s.grew || 0;
  for (let g = 1; g <= 6; g++) {
    m[`gradeStar3${g}`] = SKILLS.filter((x) => x.grade === g).every((x) => stars[x.id] >= 3) ? 1 : 0;
    m[`gradeDone${g}`] = SKILLS.filter((x) => x.grade === g).every((x) => isMastered(prog, x.id)) ? 1 : 0;
    m[`gradePlays${g}`] = (s.grades || {})[g] || 0;
  }
  LANES.forEach((_, i) => { m[`laneDone${i}`] = SKILLS.filter((x) => x.lane === i).every((x) => isMastered(prog, x.id)) ? 1 : 0; });
  for (const [k, v] of Object.entries(s.flags || {})) if (v) m[`flag:${k}`] = 1;
  const modes = s.modes || {};
  m.allModes = ['level', 'grade', 'practice', 'review'].every((k) => modes[k]) ? 1 : 0;
  Object.assign(m, snap.extra || {});
  return m;
}
export const valueOf = (m, metric) => m[metric] || 0;

// Earn every trophy whose condition is met. Returns the new ones (in list order).
// `state` is the saved { got: { id: time } }; the first call earns what the
// existing records already reach and marks them as a batch.
export function evaluate(state, metrics, at = Date.now()) {
  state.got = state.got || {};
  const fresh = [];
  for (const t of TROPHIES) {
    if (state.got[t.id]) continue;
    if (valueOf(metrics, t.metric) >= t.need) { state.got[t.id] = at; fresh.push(t); }
  }
  if (!state.init) { state.init = true; state.batch = fresh.map((t) => t.id); return []; }
  return fresh;
}

export const earnedCount = (state) => TROPHIES.filter((t) => state.got && state.got[t.id]).length;

// Progress of one series for the list screen.
export function seriesView(series, state, metrics) {
  const got = series.items.filter((t) => state.got && state.got[t.id]);
  const next = series.items.find((t) => !(state.got && state.got[t.id]));
  const top = got[got.length - 1] || null;
  return { series, got, next, top, value: next ? valueOf(metrics, next.metric) : null };
}
