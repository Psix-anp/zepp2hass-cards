/* Optional achievements are recalculated from available records, without persistent storage. */
function z2hAchievementNumber(value) {
  if (value === null || value === undefined || value === '' || typeof value === 'boolean') return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function z2hAchievementTarget(config, key, fallback, min, max) {
  const value = z2hAchievementNumber(config?.[key]);
  return value === null ? fallback : Math.min(max, Math.max(min, value));
}

function z2hAchievementDayNumber(key) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(key))) return null;
  const value = Date.parse(`${key}T00:00:00Z`);
  return Number.isFinite(value) && new Date(value).toISOString().slice(0, 10) === key ? value / 86400000 : null;
}

function z2hCalculateAchievements(category, records, config = {}) {
  const valid = (Array.isArray(records) ? records : []).filter(row => row && z2hAchievementDayNumber(row.key) !== null);
  const rows = [...new Map(valid.map(row => [row.key, row])).values()].sort((a, b) => a.key.localeCompare(b.key));
  const stepsTarget = z2hAchievementTarget(config, 'achievement_steps_target', 10000, 100, 50000);
  const sleepTarget = z2hAchievementTarget(config, 'achievement_sleep_target', 480, 240, 600);
  const tolerance = z2hAchievementTarget(config, 'achievement_sleep_tolerance', 30, 0, 120);
  const scoreTarget = z2hAchievementTarget(config, 'achievement_sleep_score_target', 80, 1, 100);
  const day = row => z2hAchievementDayNumber(row.key);
  const adjacent = (a, b) => a && b && day(b) - day(a) === 1;
  const weekend = row => [0, 6].includes(new Date(`${row.key}T12:00:00Z`).getUTCDay());
  const output = [];
  const add = (id, en, ru, descriptionEn, descriptionRu, tiers, series) => {
    const progress = Math.max(0, ...series.map(item => item.value));
    const level = tiers.filter(tier => progress >= tier).length;
    const next = tiers[Math.min(level, tiers.length - 1)];
    const earnedDate = level ? series.find(item => item.value >= tiers[level - 1])?.key || null : null;
    output.push({ id, category, title: { en, ru }, description: { en: descriptionEn, ru: descriptionRu }, tiers, level, progress, next, earnedDate, percent: Math.min(100, Math.round(progress / next * 100)) });
  };
  const count = (source, predicate) => {
    let value = 0;
    return source.map((row, index) => ({ key: row.key, value: (value += predicate(row, index) ? 1 : 0) }));
  };
  const sum = (source, metric) => {
    let value = 0;
    return source.map(row => ({ key: row.key, value: (value += z2hAchievementNumber(metric(row)) ?? 0) }));
  };
  const recordsSeries = (source, metric) => {
    let best = null;
    return count(source, row => {
      const value = z2hAchievementNumber(metric(row));
      if (value === null) return false;
      const improved = best !== null && value > best;
      best = best === null ? value : Math.max(best, value);
      return improved;
    });
  };
  const streak = predicate => {
    let value = 0;
    return rows.map((row, index) => {
      value = predicate(row) ? (adjacent(rows[index - 1], row) ? value + 1 : 1) : 0;
      return { key: row.key, value };
    });
  };
  if (category === 'activity') {
    const available = row => row.hasData !== false && z2hAchievementNumber(row.steps) !== null;
    const goal = row => available(row) && Number(row.steps) >= stepsTarget;
    const moving = row => available(row) && Number(row.steps) >= stepsTarget / 2;
    add('activity_goal_days', 'Goal days', 'Дни с целью', `Days with at least ${stepsTarget} steps`, `Дни с минимум ${stepsTarget} шагами`, [1, 3, 7], count(rows, goal));
    add('activity_goal_streak', 'Goal streak', 'Серия целей', 'Consecutive recorded days meeting your step goal', 'Дни подряд с записями и выполненной целью шагов', [3, 5, 7], streak(goal));
    add('activity_moving_days', 'Finding your rhythm', 'В своём ритме', `Days reaching half your step goal (${stepsTarget / 2})`, `Дни с половиной цели шагов (${stepsTarget / 2})`, [3, 7, 14], count(rows, moving));
    add('activity_weekend', 'Active weekends', 'Активные выходные', 'Weekend days meeting your step goal', 'Выходные дни с выполненной целью шагов', [1, 2, 4], count(rows, row => weekend(row) && goal(row)));
    add('activity_comeback', 'Back to your goal', 'Возвращение к цели', 'Goal days immediately after a recorded day below goal', 'Достижение цели сразу после дня с записью ниже цели', [1, 2, 3], count(rows, (row, i) => adjacent(rows[i - 1], row) && available(rows[i - 1]) && !goal(rows[i - 1]) && goal(row)));
    add('activity_steady', 'Steady movement', 'Равномерное движение', 'Consecutive recorded days reaching half your step goal', 'Дни подряд с записями и половиной цели шагов', [3, 7, 14], streak(moving));
    add('activity_total_steps', 'Step collector', 'Копилка шагов', 'Total steps in the available 30-day window', 'Сумма шагов в доступном окне 30 дней', [50000, 100000, 250000], sum(rows.filter(available), row => row.steps));
    add('activity_distance', 'Kilometres behind you', 'Километры позади', 'Recorded distance in kilometres over the available 30 days', 'Записанное расстояние в километрах за доступные 30 дней', [25, 50, 100], sum(rows, row => row.distanceKm));
    add('activity_records', 'A new personal best', 'Новый личный максимум', 'Step records exceeding earlier observed days in this window', 'Рекорды шагов выше предыдущих записанных дней этого периода', [1, 3, 5], recordsSeries(rows.filter(available), row => row.steps));
    add('activity_goal_month', 'A consistent month', 'Стабильный месяц', 'Goal days in the available 30-day window', 'Дни с целью в доступном окне 30 дней', [10, 20, 25], count(rows, goal));
  }
  if (category === 'sleep') {
    const window = row => z2hAchievementNumber(row.sleepTotal) !== null && Math.abs(Number(row.sleepTotal) - sleepTarget) <= tolerance;
    const score = row => z2hAchievementNumber(row.score) !== null && row.score >= scoreTarget && row.score <= 100;
    const regular = key => count(rows, (row, i) => {
      const previous = rows[i - 1];
      if (!adjacent(previous, row)) return false;
      const a = z2hAchievementNumber(previous[key]);
      const b = z2hAchievementNumber(row[key]);
      if (a === null || b === null || a >= 1440 || b >= 1440) return false;
      const diff = Math.abs(a - b);
      return Math.min(diff, 1440 - diff) <= 30;
    });
    add('sleep_window', 'Your sleep window', 'Личный диапазон сна', `Nights within ${sleepTarget} ± ${tolerance} minutes`, `Ночи в диапазоне ${sleepTarget} ± ${tolerance} минут`, [1, 3, 7], count(rows, window));
    add('sleep_streak', 'Sleep routine', 'Режим сна', 'Consecutive recorded nights within your personal sleep window', 'Ночи подряд с записями в личном диапазоне сна', [3, 5, 7], streak(window));
    add('sleep_score', 'Quality nights', 'Качественные ночи', `Recorded nights with sleep score at least ${scoreTarget}`, `Ночи с оценкой сна минимум ${scoreTarget}`, [1, 3, 7], count(rows, score));
    add('sleep_bedtime', 'Consistent bedtime', 'Стабильное засыпание', 'Adjacent recorded nights with bedtimes within 30 minutes', 'Соседние ночи с разницей засыпания до 30 минут', [2, 4, 6], regular('bedtime'));
    add('sleep_wake', 'Consistent waking', 'Стабильное пробуждение', 'Adjacent recorded nights with wake times within 30 minutes', 'Соседние ночи с разницей пробуждения до 30 минут', [2, 4, 6], regular('wake'));
    add('sleep_balanced', 'A balanced night', 'Сбалансированная ночь', 'Nights meeting both your duration window and score target', 'Ночи в личном диапазоне длительности и с целевой оценкой', [1, 3, 7], count(rows, row => window(row) && score(row)));
    add('sleep_best', 'A new score best', 'Новый рекорд оценки сна', 'Sleep scores exceeding earlier observed nights in this window', 'Оценки сна выше предыдущих записанных ночей этого периода', [1, 3, 5], recordsSeries(rows, row => row.score <= 100 ? row.score : null));
    add('sleep_balanced_streak', 'A steady sleep week', 'Ровная неделя сна', 'Consecutive recorded nights meeting your duration and score targets', 'Ночи подряд с личной длительностью и целевой оценкой сна', [3, 5, 7], streak(row => window(row) && score(row)));
  }
  if (category === 'training') {
    const sessions = [...new Map(valid.filter(row => typeof row.sport === 'string' && row.sport.trim() && !['unknown', 'unavailable'].includes(row.sport.toLowerCase()) && z2hAchievementNumber(row.minutes) !== null && row.minutes > 0)
      .map(row => [JSON.stringify([row.key, row.start || '', row.sport.trim().toLowerCase(), row.minutes]), row])).values()].sort((a, b) => a.key.localeCompare(b.key));
    const days = [...new Map(sessions.map(row => [row.key, row])).values()];
    const uniqueSports = new Set();
    const variety = sessions.map(row => { uniqueSports.add(row.sport.trim().toLowerCase()); return { key: row.key, value: uniqueSports.size }; });
    const weekDays = new Map();
    const weeks = new Set();
    const rhythm = days.map(row => {
      const weekday = new Date(`${row.key}T12:00:00Z`).getUTCDay();
      const monday = day(row) - (weekday + 6) % 7;
      weekDays.set(monday, (weekDays.get(monday) || 0) + 1);
      if (weekDays.get(monday) >= 2) weeks.add(monday);
      return { key: row.key, value: weeks.size };
    });
    const shortDays = [...new Map(sessions.filter(row => row.minutes >= 10 && row.minutes <= 45).map(row => [row.key, row])).values()];
    const firstSport = new Map();
    const returns = new Set();
    const returnSeries = sessions.map(row => {
      const sport = row.sport.trim().toLowerCase();
      if (!firstSport.has(sport)) firstSport.set(sport, day(row));
      if (day(row) - firstSport.get(sport) >= 7) returns.add(sport);
      return { key: row.key, value: returns.size };
    });
    add('training_days', 'Showing up', 'Время для тренировки', 'Distinct days with a recorded workout; one count per day', 'Разные дни с тренировкой; не больше одного зачёта в день', [1, 3, 6], count(days, () => true));
    add('training_variety', 'Try something different', 'Разнообразие занятий', 'Different recorded workout types', 'Разные записанные виды тренировок', [2, 3, 4], variety);
    add('training_rhythm', 'Weekly rhythm', 'Недельный ритм', 'Calendar weeks with workouts on at least two different days', 'Календарные недели с тренировками минимум в два разных дня', [1, 2, 3], rhythm);
    add('training_short', 'A little time for you', 'Немного времени для себя', 'Distinct days with a 10–45 minute workout', 'Разные дни с тренировкой длительностью 10–45 минут', [1, 3, 6], count(shortDays, () => true));
    add('training_weekend', 'Weekend session', 'Занятие в выходной', 'Distinct weekend days with a recorded workout', 'Разные выходные дни с записанной тренировкой', [1, 2, 4], count(days, weekend));
    add('training_return', 'A familiar favourite', 'Знакомое любимое занятие', 'Workout types repeated at least seven days apart', 'Виды тренировок, повторённые с интервалом минимум семь дней', [1, 2, 3], returnSeries);
    const weeklyTarget = Math.round(z2hAchievementTarget(config, 'achievement_training_weekly_target', 2, 1, 7));
    const achievedWeeks = [...weekDays].filter(([, value]) => value >= weeklyTarget).sort((a, b) => a[0] - b[0]);
    let weekStreak = 0;
    const weekly = achievedWeeks.map(([monday], index) => {
      weekStreak = index && monday - achievedWeeks[index - 1][0] === 7 ? weekStreak + 1 : 1;
      const earnedDay = days.filter(row => day(row) >= monday && day(row) < monday + 7)[weeklyTarget - 1];
      return { key: earnedDay.key, value: weekStreak };
    });
    add('training_sessions', 'Sessions collected', 'Тренировки в копилке', 'Distinct recorded workouts in the available window', 'Разные записанные тренировки за доступный период', [5, 10, 25], count(sessions, () => true));
    add('training_goal_weeks', 'Weekly plan achieved', 'Недельный план выполнен', `Weeks with workouts on ${weeklyTarget} different days`, `Недели с тренировками в ${weeklyTarget} разных дня`, [1, 2, 3], weekly.map((row, index) => ({ key: row.key, value: index + 1 })));
    add('training_week_streak', 'Weeks in a rhythm', 'Недели в ритме', 'Consecutive calendar weeks meeting your personal workout-day target', 'Календарные недели подряд с личной целью тренировочных дней', [2, 3, 4], weekly);
  }
  return output;
}

function z2hAchievementCategory(card) {
  if (card instanceof AmazfitActivityCard || card instanceof AmazfitActivityCardEditor) return 'activity';
  if (card instanceof AmazfitSleepCard || card instanceof AmazfitSleepCardEditor) return 'sleep';
  if (card instanceof AmazfitTrainingCard || card instanceof AmazfitTrainingCardEditor) return 'training';
  return null;
}

function z2hAchievementsEnabled(card) {
  const category = z2hAchievementCategory(card);
  return Boolean(category && card.config?.show_achievements === true && card.config?.[`achievements_${category}`] !== false
    && z2hCalculateAchievements(category, [], card.config).some(item => card.config[`achievement_${item.id}`] !== false));
}

function z2hAchievementContext(card, now = new Date()) {
  const category = z2hAchievementCategory(card);
  const timeZone = card._hass?.config?.time_zone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const mappings = card._resolvedMappings?.() || {};
  const entity = category === 'activity' ? mappings.steps_entity : category === 'sleep' ? card.config?.entity : mappings.last_workout_entity;
  const slots = z2hCalendarDays({ endDate: now, count: 30, timeZone });
  const distanceEntity = category === 'activity' && card.config?.achievement_activity_distance !== false ? mappings.distance_entity : null;
  return { category, timeZone, entity, distanceEntity, slots, key: JSON.stringify([category, entity, distanceEntity, timeZone, slots[29].key]) };
}

function z2hEnsureAchievementHistory(card, now = new Date()) {
  if (!z2hAchievementsEnabled(card)) return null;
  const context = z2hAchievementContext(card, now);
  if (context.category === 'training') return null;
  const cached = card._z2hAchievementHistory;
  if (cached?.key === context.key && (cached.status === 'loading' || Date.now() - cached.created < 300000)) return cached.promise;
  const entry = { key: context.key, status: 'loading', rows: [], promise: null, created: Date.now() };
  card._z2hAchievementHistory = entry;
  if (!context.entity || !card._hass?.callWS) { entry.status = 'missing'; return null; }
  let request;
  try {
    request = context.category === 'activity'
      ? z2hFetchDailyChanges(card._hass, [context.entity, context.distanceEntity].filter(Boolean), context.slots[0].start, context.slots[29].start)
      : card._hass.callWS({ type: 'history/history_during_period', start_time: context.slots[0].start.toISOString(), end_time: now.toISOString(), entity_ids: [context.entity], minimal_response: false, no_attributes: false });
  } catch (error) { request = Promise.reject(error); }
  const current = () => card._z2hAchievementHistory === entry && z2hAchievementContext(card).key === context.key;
  entry.promise = Promise.resolve(request).then(result => {
    if (!current()) return;
    if (context.category === 'activity') {
      const map = z2hRowsToDailyMap(result, context.timeZone);
      entry.rows = context.slots.slice(0, -1).map(slot => {
        const steps = z2hAchievementNumber(map.get(slot.key)?.[context.entity]?.change);
        const distance = z2hAchievementNumber(map.get(slot.key)?.[context.distanceEntity]?.change);
        const distanceKm = z2hAchievementDistanceKm(distance, card._hass?.states?.[context.distanceEntity]);
        return { key: slot.key, steps, distanceKm, hasData: steps !== null };
      });
    } else {
      entry.rows = Array.isArray(result?.[context.entity]) ? result[context.entity] : [];
    }
    entry.status = 'ready';
  }).catch(() => { if (current()) entry.status = 'error'; }).finally(() => { if (current() && z2hAchievementsEnabled(card)) card.render(); });
  return entry.promise;
}

function z2hAchievementWorkoutRows(card, context, now) {
  const mappings = card._resolvedMappings?.() || {};
  const recent = card._hass?.states?.[mappings.workout_count_entity]?.attributes?.recent_workouts;
  const rows = [];
  for (const text of Array.isArray(recent) ? recent : []) {
    if (typeof text !== 'string') continue;
    const match = text.match(/^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})\s+-\s+(.+?)\s+\((\d+(?:\.\d+)?)\s+min\)$/i);
    if (match && z2hAchievementDayNumber(match[1]) !== null && Number(match[2].slice(0, 2)) < 24 && Number(match[2].slice(3)) < 60) {
      const [year, month, day] = match[1].split('-').map(Number);
      const [hour, minute] = match[2].split(':').map(Number);
      const date = z2hZonedDateFromParts({ year, month, day, hour, minute }, context.timeZone);
      if (date <= now) rows.push({ key: match[1], start: date.toISOString(), sport: match[3], minutes: Number(match[4]) });
    }
  }
  const last = card._hass?.states?.[mappings.last_workout_entity];
  const attrs = last?.attributes || {};
  const raw = attrs.start_time || (attrs.date && attrs.time ? `${attrs.date}T${attrs.time}:00` : '');
  let key = null;
  // Offset-free Zepp workout timestamps are local calendar labels, not browser-zone instants.
  let start = null;
  if (typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(raw)) {
    const values = raw.match(/\d+/g).map(Number);
    const date = z2hZonedDateFromParts({ year: values[0], month: values[1], day: values[2], hour: values[3], minute: values[4], second: values[5] || 0 }, context.timeZone);
    if (date <= now) { key = raw.slice(0, 10); start = date.toISOString(); }
  } else if (raw && Number.isFinite(Date.parse(raw)) && Date.parse(raw) <= now.getTime()) {
    key = z2hLocalDayKey(new Date(raw), context.timeZone); start = new Date(raw).toISOString();
  }
  if (key) rows.push({ key, start, sport: last.state, minutes: z2hAchievementNumber(attrs.duration_minutes) });
  return rows.filter(row => row.key >= context.slots[0].key && row.key <= context.slots[29].key && z2hAchievementDayNumber(row.key) !== null);
}

function z2hAchievementDistanceKm(value, state) {
  if (value === null) return null;
  const unit = String(state?.attributes?.unit_of_measurement || '').toLowerCase();
  return unit === 'km' ? value : unit === 'm' ? value / 1000 : unit === 'mi' ? value * 1.609344 : null;
}

function z2hAchievementRecords(card, context, now = new Date()) {
  if (context.category === 'training') return z2hAchievementWorkoutRows(card, context, now);
  const entry = card._z2hAchievementHistory;
  const cached = entry?.key === context.key && entry.status === 'ready' ? entry.rows : [];
  if (context.category === 'activity') {
    const rows = cached.slice();
    const state = card._hass?.states?.[context.entity];
    const updated = z2hHistoryTimeMs({ last_updated: state?.last_changed || state?.last_updated });
    const steps = z2hAchievementNumber(state?.state);
    const distanceState = card._hass?.states?.[context.distanceEntity];
    const distanceTime = z2hHistoryTimeMs({ last_updated: distanceState?.last_changed || distanceState?.last_updated });
    const distanceKm = distanceTime >= context.slots[29].start.getTime() && distanceTime <= now.getTime()
      ? z2hAchievementDistanceKm(z2hAchievementNumber(distanceState?.state), distanceState) : null;
    if (steps !== null && updated !== null && updated >= context.slots[29].start.getTime() && updated <= now.getTime()) rows.push({ key: context.slots[29].key, steps, distanceKm, hasData: true });
    return rows;
  }
  const currentState = card._hass?.states?.[context.entity];
  return card._historyToNights(cached, currentState).filter(night => night.stop <= now).map(night => {
    const key = z2hLocalDayKey(night.stop, context.timeZone);
    const start = z2hLocalParts(night.start, context.timeZone);
    const stop = z2hLocalParts(night.stop, context.timeZone);
    return { key, sleepTotal: night.sleepTotal, score: night.score, bedtime: start.hour * 60 + start.minute, wake: stop.hour * 60 + stop.minute };
  }).filter(row => row.key >= context.slots[0].key && row.key <= context.slots[29].key);
}

function z2hAchievementText(host) {
  const language = host._lang?.() === 'ru' ? 'ru' : 'en';
  const translations = {
    en: { title: 'Achievements', collection: 'Collection', recent: 'Recent badges', empty: 'No badges earned in available records yet.', note: 'Calculated from available records in the last 30 days. History may be incomplete; badges are not permanently stored.', loading: 'Loading achievement history…', error: 'Achievement history unavailable.', missing: 'No recorded history available.', retry: 'Retry', level: 'Level', earned: 'Observed on', locked: 'Locked', activity: 'Activity', sleep: 'Sleep', training: 'Training', show: 'Show achievements', showLocked: 'Show locked achievements', animation: 'Animate badges', steps: 'Personal step target', sleepTarget: 'Personal sleep target (minutes)', tolerance: 'Sleep window tolerance (± minutes)', score: 'Personal sleep score target', individual: 'Individual badges', targets: 'Targets apply to all available records; changing them recalculates badges.' },
    ru: { title: 'Достижения', collection: 'Коллекция', recent: 'Недавние награды', empty: 'В доступных записях пока нет полученных наград.', note: 'Расчёт по доступным записям за последние 30 дней. История может быть неполной; награды не сохраняются навсегда.', loading: 'Загрузка истории достижений…', error: 'История достижений недоступна.', missing: 'Нет доступных записей истории.', retry: 'Повторить', level: 'Уровень', earned: 'Подтверждено', locked: 'Закрыто', activity: 'Активность', sleep: 'Сон', training: 'Тренировки', show: 'Показывать достижения', showLocked: 'Показывать закрытые достижения', animation: 'Анимация наград', steps: 'Личная цель шагов', sleepTarget: 'Личная цель сна (минуты)', tolerance: 'Допуск диапазона сна (± минуты)', score: 'Личная цель оценки сна', individual: 'Отдельные награды', targets: 'Цели применяются ко всем доступным записям; изменение целей пересчитывает награды.' },
  };
  return { language, ...translations[language] };
}

function z2hRenderAchievements(card) {
  if (!z2hAchievementsEnabled(card) || !card._hass) return '';
  z2hEnsureAchievementHistory(card);
  const context = z2hAchievementContext(card);
  const text = z2hAchievementText(card);
  const rows = z2hAchievementRecords(card, context);
  const badges = z2hCalculateAchievements(context.category, rows, card.config).filter(item => card.config[`achievement_${item.id}`] !== false);
  const earned = badges.filter(item => item.level > 0).sort((a, b) => (b.earnedDate || '').localeCompare(a.earnedDate || ''));
  const visible = badges.filter(item => item.level > 0 || card.config.show_locked_achievements !== false);
  const levels = text.language === 'ru' ? ['Закрыто', 'Бронза', 'Серебро', 'Золото'] : ['Locked', 'Bronze', 'Silver', 'Gold'];
  const prior = card._z2hAchievementLevels?.key === context.key ? card._z2hAchievementLevels.values : new Map();
  const newlyEarned = new Set(earned.filter(item => item.level > (prior.get(item.id) || 0)).map(item => item.id));
  card._z2hAchievementLevels = { key: context.key, values: new Map(badges.map(item => [item.id, item.level])) };
  const badgeHtml = item => {
    const amount = new Intl.NumberFormat(text.language, { maximumFractionDigits: 1 }).format(item.progress);
    const progress = item.level === item.tiers.length ? amount : `${amount} / ${item.next}`;
    return `<article class="z2h-badge ${item.level ? 'earned' : 'locked'}${newlyEarned.has(item.id) ? ' newly-earned' : ''}" data-achievement-id="${item.id}" data-achievement-level="${item.level}"><div class="z2h-badge-title"><span aria-hidden="true">${item.level ? '✦' : '◇'}</span> ${z2hEsc(item.title[text.language])}</div><div class="z2h-badge-meta">${levels[item.level]} · ${progress}</div><progress max="100" value="${item.percent}" aria-label="${z2hEsc(item.title[text.language])}"></progress><div class="z2h-badge-description">${z2hEsc(item.description[text.language])}</div>${item.earnedDate ? `<div class="z2h-badge-meta">${text.earned}: <time datetime="${item.earnedDate}">${item.earnedDate}</time></div>` : ''}</article>`;
  };
  const entry = card._z2hAchievementHistory;
  const status = entry?.key === context.key ? entry.status : null;
  const statusHtml = status === 'loading' ? text.loading : status === 'error' ? `${text.error} <button type="button" data-achievement-retry>${text.retry}</button>` : !rows.length ? text.missing : '';
  return `<section class="z2h-achievements${card.config.achievement_animation === true ? ' animate' : ''}" aria-label="${text.title}"><style>
    .z2h-achievements{margin-top:16px;padding-top:14px;border-top:1px solid var(--divider-color,#8884);font-family:inherit;min-width:0}.z2h-achievements h3{font-size:16px;margin:0 0 9px}.z2h-achievement-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(180px,100%),1fr));gap:8px}.z2h-badge{min-width:0;border-radius:12px;padding:11px;background:color-mix(in srgb,var(--primary-color,#03a9f4) 9%,transparent)}.z2h-badge.locked{background:color-mix(in srgb,var(--primary-text-color,#888) 5%,transparent)}.z2h-badge-title{font-size:12px;font-weight:700;overflow-wrap:anywhere}.z2h-badge-title>span{color:var(--primary-color,#03a9f4)}.z2h-badge-meta,.z2h-badge-description,.z2h-achievement-note,.z2h-achievement-status{font-size:11px;line-height:1.45;color:var(--secondary-text-color,#777);margin-top:5px;overflow-wrap:anywhere}.z2h-badge progress{display:block;width:100%;height:5px;margin-top:7px;accent-color:var(--primary-color,#03a9f4)}.z2h-achievements summary{cursor:pointer;padding:10px 0;font-size:12px;font-weight:650}.z2h-achievements button{font:inherit;color:var(--primary-color,#03a9f4);background:transparent;border:1px solid var(--divider-color,#8884);border-radius:8px;padding:8px;cursor:pointer}.z2h-achievements.animate .earned{animation:z2h-badge-appear .35s ease-out}@keyframes z2h-badge-appear{from{opacity:.35;transform:translateY(3px)}to{opacity:1;transform:translateY(0)}}@media(prefers-reduced-motion:reduce){.z2h-achievements.animate .earned{animation:none}}
    .z2h-achievements{color:var(--primary-text-color)}.z2h-badge[data-achievement-level="1"]{border-left:3px solid #b77945}.z2h-badge[data-achievement-level="2"]{border-left:3px solid #91a5b8}.z2h-badge[data-achievement-level="3"]{border-left:3px solid #d8ac42}.z2h-achievements.animate .earned:not(.newly-earned){animation:none}
  </style><h3>${text.title} · ${text[context.category]}</h3><div class="z2h-achievement-note">${text.note}</div>${statusHtml ? `<div class="z2h-achievement-status" role="status">${statusHtml}</div>` : ''}<div class="z2h-achievement-note">${text.recent}</div><div class="z2h-achievement-grid">${earned.length ? earned.slice(0, 2).map(badgeHtml).join('') : `<div class="z2h-achievement-note">${text.empty}</div>`}</div><details data-achievement-collection ${card._z2hAchievementCollectionOpen ? 'open' : ''}><summary>${text.collection} · ${earned.length} / ${badges.length}</summary><div class="z2h-achievement-grid">${visible.map(badgeHtml).join('')}</div></details></section>`;
}

function z2hWireAchievements(card) {
  card.querySelector?.('[data-achievement-collection]')?.addEventListener('toggle', event => { card._z2hAchievementCollectionOpen = event.currentTarget.open; });
  card.querySelector?.('[data-achievement-retry]')?.addEventListener('click', () => { card._z2hAchievementHistory = null; card.render(); });
}

function z2hAchievementEditor(editor) {
  const category = z2hAchievementCategory(editor);
  const config = editor._config || {};
  const text = z2hAchievementText(editor);
  let html = editor._toggleHtml('show_achievements', text.show, config.show_achievements === true);
  html += editor._toggleHtml(`achievements_${category}`, text[category], config[`achievements_${category}`] !== false);
  html += editor._toggleHtml('show_locked_achievements', text.showLocked, config.show_locked_achievements !== false);
  html += editor._toggleHtml('achievement_animation', text.animation, config.achievement_animation === true);
  if (category === 'activity') html += editor._numberHtml('achievement_steps_target', text.steps, config.achievement_steps_target ?? 10000, { min: 100, max: 50000, step: 100 });
  if (category === 'sleep') {
    html += editor._numberHtml('achievement_sleep_target', text.sleepTarget, config.achievement_sleep_target ?? 480, { min: 240, max: 600, step: 15 });
    html += editor._numberHtml('achievement_sleep_tolerance', text.tolerance, config.achievement_sleep_tolerance ?? 30, { min: 0, max: 120, step: 15 });
    html += editor._numberHtml('achievement_sleep_score_target', text.score, config.achievement_sleep_score_target ?? 80, { min: 1, max: 100, step: 1 });
  }
  if (category === 'training') html += editor._numberHtml('achievement_training_weekly_target', text.language === 'ru' ? 'Цель: тренировочных дней за неделю' : 'Target: workout days per week', config.achievement_training_weekly_target ?? 2, { min: 1, max: 7, step: 1 });
  const toggles = z2hCalculateAchievements(category, [], config).map(item => editor._toggleHtml(`achievement_${item.id}`, item.title[text.language], config[`achievement_${item.id}`] !== false)).join('');
  return `<section class="z2h-section"><div class="z2h-section-title">${text.title}</div>${html}<div class="z2h-section-note">${text.targets}</div><details><summary>${text.individual}</summary>${toggles}</details></section>`;
}

z2hRegisterOptionalFeature({ id: 'achievements', cards: [AmazfitActivityCard, AmazfitSleepCard, AmazfitTrainingCard], editors: [AmazfitActivityCardEditor, AmazfitSleepCardEditor, AmazfitTrainingCardEditor], render: z2hRenderAchievements, wire: z2hWireAchievements, editor: z2hAchievementEditor, editorWire() {} });
