// Optional activity insights. Recorder evidence is kept only in bounded memory.
const Z2H_ACTIVITY_EXTRA_FLAGS = ['show_day_details', 'show_comparison', 'show_calendar', 'show_weekly_summary', 'show_freshness', 'compact_mode'];
const Z2H_ACTIVITY_EXTRA_TTL = 5 * 60 * 1000;

function z2hActivityExtraText(host, key) {
  const config = host.config || host._config || {};
  const language = config.language === 'ru' || config.language === 'en' ? config.language : host._lang?.() || 'en';
  const words = {
    en: {
      extras: 'Activity insights', show_day_details: 'Selected day details', show_comparison: 'Today vs yesterday at the same time',
      show_calendar: 'Activity calendar', show_weekly_summary: 'Weekly summary', show_freshness: 'Home Assistant update age', compact_mode: 'Compact display',
      select: 'Select a day', no_data: 'No data', loading: 'Loading history…', error: 'History unavailable', partial: 'Partial history',
      observed: 'Observed increments; gaps are unknown', steps: 'Steps', distance: 'Distance', calories: 'Calories',
      today: 'Today', yesterday: 'Yesterday', through: 'Through', recent: 'Last 7 complete days', previous: 'Previous 7 days',
      goal: 'Days reaching the current goal', best: 'Best day', days: 'recorded days', ha_update: 'Home Assistant entity updated',
      sync_note: 'This is the entity update time, not the watch sync time.', minutes: 'min ago', hours: 'h ago', just_now: 'just now',
      details: 'Details', compact_note: 'Expand the sections below for details.', available: 'Recorded', future: 'Future day',
      monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu', friday: 'Fri', saturday: 'Sat', sunday: 'Sun',
    },
    ru: {
      extras: 'Подробности активности', show_day_details: 'Подробности выбранного дня', show_comparison: 'Сегодня и вчера к тому же времени',
      show_calendar: 'Календарь активности', show_weekly_summary: 'Итоги недели', show_freshness: 'Давность обновления в Home Assistant', compact_mode: 'Компактный вид',
      select: 'Выберите день', no_data: 'Нет данных', loading: 'Загружаю историю…', error: 'История недоступна', partial: 'Неполная история',
      observed: 'Записанные прибавления; пропуски неизвестны', steps: 'Шаги', distance: 'Расстояние', calories: 'Калории',
      today: 'Сегодня', yesterday: 'Вчера', through: 'К', recent: 'Последние 7 завершённых дней', previous: 'Предыдущие 7 дней',
      goal: 'Дней с достижением текущей цели', best: 'Лучший день', days: 'дней с данными', ha_update: 'Сущность Home Assistant обновлена',
      sync_note: 'Это время обновления сущности, а не синхронизации часов.', minutes: 'мин назад', hours: 'ч назад', just_now: 'только что',
      details: 'Подробности', compact_note: 'Разверните разделы ниже для подробностей.', available: 'Записано', future: 'Будущий день',
      monday: 'Пн', tuesday: 'Вт', wednesday: 'Ср', thursday: 'Чт', friday: 'Пт', saturday: 'Сб', sunday: 'Вс',
    },
  };
  return words[language === 'ru' ? 'ru' : 'en'][key] || key;
}

function z2hActivityMonthSlots(now = new Date(), timeZone = 'UTC') {
  const parts = z2hLocalParts(now, timeZone);
  const count = new Date(Date.UTC(parts.year, parts.month, 0)).getUTCDate();
  const last = z2hZonedDateFromParts({ year: parts.year, month: parts.month, day: count, hour: 12 }, timeZone);
  const days = z2hCalendarDays({ endDate: last, count, timeZone });
  const offset = (new Date(Date.UTC(parts.year, parts.month - 1, 1)).getUTCDay() + 6) % 7;
  return { days, offset, year: parts.year, month: parts.month };
}

function z2hActivityComparisonWindows(now = new Date(), timeZone = 'UTC') {
  const slots = z2hCalendarDays({ endDate: now, count: 2, timeZone });
  const parts = z2hLocalParts(now, timeZone);
  const yesterday = z2hLocalParts(slots[0].start, timeZone);
  const cutoff = z2hZonedDateFromParts({ year: yesterday.year, month: yesterday.month, day: yesterday.day,
    hour: parts.hour, minute: parts.minute, second: parts.second }, timeZone);
  // A DST-skipped wall time cannot be compared faithfully with today's cutoff.
  const actual = z2hLocalParts(cutoff, timeZone);
  const comparable = actual.hour === parts.hour && actual.minute === parts.minute;
  return { today: { start: slots[1].start, end: now }, yesterday: { start: slots[0].start, end: cutoff }, comparable };
}

function z2hActivityCounterSummary(items, start, end, timeZone = 'UTC') {
  const hours = Array(24).fill(null);
  const rows = (Array.isArray(items) ? items : []).map(item => {
    const raw = item?.state ?? item?.s;
    const value = raw == null || String(raw).trim() === '' ? null : Number(raw);
    return { time: z2hHistoryTimeMs(item), value: Number.isFinite(value) && value >= 0 ? value : null };
  }).filter(row => row.time != null && row.time >= +start && row.time < +end)
    .sort((a, b) => a.time - b.time);
  let previous = null;
  let total = null;
  let missing = false;
  let reset = false;
  const valid = [];
  for (const row of rows) {
    if (row.value == null) { missing = true; previous = null; continue; }
    valid.push(row);
    const hour = z2hLocalParts(new Date(row.time), timeZone).hour;
    const delta = previous == null ? row.value : row.value >= previous ? row.value - previous : row.value;
    if (previous != null && row.value < previous) reset = true;
    // After an unavailable state, the accumulated value cannot be attributed to an hour.
    if (!(missing && previous == null)) hours[hour] = (hours[hour] ?? 0) + delta;
    total = row.value;
    previous = row.value;
  }
  const first = valid[0];
  const last = valid[valid.length - 1];
  // Sparse recorder samples are useful evidence, but cannot prove complete coverage.
  const tolerance = 15 * 60 * 1000;
  const complete = Boolean(first && last && !missing && !reset && first.time - +start <= tolerance && +end - last.time <= tolerance);
  return { hours, total, complete, missing, firstTime: first?.time ?? null, lastTime: last?.time ?? null };
}

function z2hActivityWeeklySummary(rows, now = new Date(), timeZone = 'UTC', target = null) {
  const today = z2hStartOfLocalDay(now, timeZone);
  const slots = z2hCalendarDays({ endDate: new Date(+today - 1), count: 14, timeZone });
  const byDay = new Map((rows || []).map(row => [row.key, row]));
  const summary = days => {
    const values = days.map(day => byDay.get(day.key)).filter(row => row && Number.isFinite(row.steps) && row.steps >= 0);
    return {
      start: days[0].key, end: days[6].key, count: values.length,
      complete: values.length === 7 && values.every(row => row.complete !== false),
      total: values.length ? values.reduce((sum, row) => sum + row.steps, 0) : null,
      goalDays: target > 0 ? values.filter(row => row.steps >= target).length : null,
      best: values.reduce((best, row) => !best || row.steps > best.steps ? row : best, null),
    };
  };
  const current = summary(slots.slice(7));
  const previous = summary(slots.slice(0, 7));
  return { current, previous, delta: current.complete && previous.complete ? current.total - previous.total : null };
}

function z2hActivityExtrasState(card) {
  const mappings = card._resolvedMappings();
  const timeZone = card._timeZone();
  const seed = JSON.stringify([mappings.steps_entity, mappings.distance_entity, mappings.calories_entity, timeZone]);
  if (card._z2hActivityExtras?.seed !== seed) card._z2hActivityExtras = { seed, mappings, timeZone, cache: new Map(), selected: null };
  return card._z2hActivityExtras;
}

function z2hActivityExtraRequest(card, state, kind, entity, start, end) {
  if (!entity || !card._hass?.callWS) return { data: null, error: true };
  const key = JSON.stringify([kind, entity, state.timeZone, start.toISOString(), end.toISOString()]);
  const cached = state.cache.get(key);
  if (cached && (cached.pending || Date.now() - cached.created < Z2H_ACTIVITY_EXTRA_TTL)) return cached;
  const entry = { pending: true, created: Date.now(), data: null, error: false };
  state.cache.set(key, entry);
  if (state.cache.size > 64) {
    for (const [oldKey, oldEntry] of state.cache) {
      if (oldKey !== key && !oldEntry.pending) state.cache.delete(oldKey);
      if (state.cache.size <= 64) break;
    }
  }
  let request;
  try {
    request = kind === 'daily' ? z2hFetchDailyChanges(card._hass, [entity], start, end) : card._hass.callWS({
      type: 'history/history_during_period', start_time: start.toISOString(), end_time: end.toISOString(),
      entity_ids: [entity], include_start_time_state: false, minimal_response: false, no_attributes: true,
    });
  } catch (error) { request = Promise.reject(error); }
  entry.promise = Promise.resolve(request).then(result => { entry.data = result; })
    .catch(() => { entry.error = true; })
    .finally(() => {
      entry.pending = false;
      entry.created = Date.now();
      if (card._z2hActivityExtras === state) z2hActivityRefreshExtras(card);
    });
  return entry;
}

function z2hActivityExtraValue(card, value) {
  return Number.isFinite(value) ? z2hEsc(card._fmtNumber(value, Number.isInteger(value) ? 0 : 1)) : z2hActivityExtraText(card, 'no_data');
}

function z2hActivityExtraSection(card, title, body, id) {
  return card.config?.compact_mode === true
    ? `<details class="z2h-extra-section" data-z2h-extra-section="${id}"${card._z2hActivityExtras?.expanded?.has(id) ? ' open' : ''}><summary>${z2hEsc(title)}</summary>${body}</details>`
    : `<section class="z2h-extra-section"><h3>${z2hEsc(title)}</h3>${body}</section>`;
}

function z2hActivityComparisonHtml(card, state, now) {
  const t = key => z2hActivityExtraText(card, key);
  if (!state.comparisonNow || z2hLocalDayKey(now, state.timeZone) !== z2hLocalDayKey(state.comparisonNow, state.timeZone) || +now - +state.comparisonNow >= Z2H_ACTIVITY_EXTRA_TTL) state.comparisonNow = now;
  const windows = z2hActivityComparisonWindows(state.comparisonNow, state.timeZone);
  if (!windows.comparable) return `<p>${t('no_data')} · ${t('partial')}</p>`;
  const sides = ['today', 'yesterday'].map(side => {
    const window = windows[side];
    const request = z2hActivityExtraRequest(card, state, 'history', state.mappings.steps_entity, window.start, window.end);
    return { side, request, value: z2hActivityCounterSummary(request.data?.[state.mappings.steps_entity], window.start, window.end, state.timeZone) };
  });
  const time = new Intl.DateTimeFormat(card._lang(), { timeZone: state.timeZone, hour: '2-digit', minute: '2-digit' }).format(windows.today.end);
  const body = sides.map(({ side, request, value }) => `<div><span>${t(side)}</span><strong>${request.pending ? t('loading') : request.error ? t('error') : z2hActivityExtraValue(card, value.total)}</strong><small>${!request.pending && value.total != null && !value.complete ? t('partial') : ''}</small></div>`).join('');
  const delta = sides.every(side => side.value.complete) ? sides[0].value.total - sides[1].value.total : null;
  return `<p>${t('through')} ${z2hEsc(time)} · ${t('steps')}</p><div class="z2h-extra-columns">${body}</div>${delta != null ? `<p class="z2h-extra-delta">${delta > 0 ? '+' : ''}${z2hActivityExtraValue(card, delta)}</p>` : ''}`;
}

function z2hActivityDailyRows(card, state, now) {
  const today = z2hStartOfLocalDay(now, state.timeZone);
  const month = z2hActivityMonthSlots(now, state.timeZone);
  const recent = z2hCalendarDays({ endDate: new Date(+today - 1), count: 14, timeZone: state.timeZone });
  const start = card.config.show_calendar === true && +month.days[0].start < +recent[0].start ? month.days[0].start : recent[0].start;
  const request = z2hActivityExtraRequest(card, state, 'daily', state.mappings.steps_entity, start, today);
  const map = z2hRowsToDailyMap(request.data, state.timeZone);
  const days = z2hCalendarDays({ endDate: new Date(+today - 1), count: 45, timeZone: state.timeZone });
  const rows = days.map(day => {
    const row = map.get(day.key)?.[state.mappings.steps_entity];
    return { key: day.key, steps: row?.change ?? null, complete: row?.startMs === +day.start && row?.endMs === +day.end };
  });
  return { request, rows, month };
}

function z2hActivityCalendarHtml(card, state, daily, now) {
  const t = key => z2hActivityExtraText(card, key);
  const todayKey = z2hLocalDayKey(now, state.timeZone);
  const values = new Map(daily.rows.map(row => [row.key, row.steps]));
  const live = card._hass?.states?.[state.mappings.steps_entity];
  const liveTime = z2hHistoryTimeMs({ last_updated: live?.last_changed || live?.last_updated });
  const liveValue = live?.state == null || String(live.state).trim() === '' ? NaN : Number(live.state);
  if (Number.isFinite(liveValue) && liveValue >= 0 && liveTime >= +z2hStartOfLocalDay(now, state.timeZone) && liveTime <= +now) values.set(todayKey, liveValue);
  const target = card._targetValue(live);
  const title = new Intl.DateTimeFormat(card._lang(), { timeZone: state.timeZone, month: 'long', year: 'numeric' }).format(daily.month.days[0].start);
  const headers = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(day => `<span class="z2h-calendar-weekday">${t(day)}</span>`).join('');
  const padding = Array.from({ length: daily.month.offset }, () => '<span aria-hidden="true"></span>').join('');
  const cells = daily.month.days.map(day => {
    const value = values.get(day.key);
    const future = day.key > todayKey;
    const label = `${day.key} · ${future ? t('future') : Number.isFinite(value) ? `${t('steps')}: ${value}` : t('no_data')}`;
    const ratio = Number.isFinite(value) && target > 0 ? Math.max(0, Math.min(1, value / target)) : 0;
    return `<button type="button" data-z2h-extra-day="${day.key}"${future ? ' disabled' : ''} aria-label="${z2hEsc(label)}" aria-pressed="${state.selected === day.key}"${day.key === todayKey ? ' aria-current="date"' : ''} class="${Number.isFinite(value) ? 'has-data' : ''}${ratio >= 1 ? ' goal-met' : ''}" style="--day-intensity:${12 + Math.round(ratio * 36)}%"><span>${Number(day.key.slice(-2))}</span><small>${future ? '' : Number.isFinite(value) ? z2hEsc(card._fmtNumber(value)) : '—'}</small></button>`;
  }).join('');
  const selected = state.selected ? `${state.selected} · ${t('steps')}: ${z2hActivityExtraValue(card, values.get(state.selected))}` : '';
  return `<p>${z2hEsc(title)}</p>${daily.request.pending ? `<p>${t('loading')}</p>` : daily.request.error ? `<p>${t('error')}</p>` : ''}<div class="z2h-extra-calendar">${headers}${padding}${cells}</div><p role="status" data-z2h-calendar-selection>${selected}</p>`;
}

function z2hActivityWeeklyHtml(card, state, daily, now) {
  const t = key => z2hActivityExtraText(card, key);
  if (daily.request.pending) return `<p>${t('loading')}</p>`;
  if (daily.request.error) return `<p>${t('error')}</p>`;
  const target = card._targetValue(card._hass?.states?.[state.mappings.steps_entity]);
  const weeks = z2hActivityWeeklySummary(daily.rows, now, state.timeZone, target);
  const body = [[weeks.current, 'recent'], [weeks.previous, 'previous']].map(([week, label]) => `<div><span>${t(label)}</span><small>${week.start} — ${week.end}</small><strong>${z2hActivityExtraValue(card, week.total)}</strong><small>${week.count}/7 ${t('days')}${week.complete ? '' : ` · ${t('partial')}`}</small><p>${t('goal')}: ${week.goalDays ?? '—'}</p><p>${t('best')}: ${week.best ? `${week.best.key} · ${z2hActivityExtraValue(card, week.best.steps)}` : t('no_data')}</p></div>`).join('');
  return `<div class="z2h-extra-columns">${body}</div>${weeks.delta != null ? `<p>${weeks.delta > 0 ? '+' : ''}${z2hActivityExtraValue(card, weeks.delta)} ${t('steps')}</p>` : ''}`;
}

function z2hActivitySelectedDayHtml(card, state, now) {
  const t = key => z2hActivityExtraText(card, key);
  const todayKey = z2hLocalDayKey(now, state.timeZone);
  const picker = `<label class="z2h-extra-date">${t('select')}<input type="date" data-z2h-extra-date max="${todayKey}" value="${z2hEsc(state.selected || '')}"></label>`;
  if (!state.selected) return picker;
  const parts = state.selected.split('-').map(Number);
  const day = z2hZonedDateFromParts({ year: parts[0], month: parts[1], day: parts[2], hour: 12 }, state.timeZone);
  const slot = z2hCalendarDays({ endDate: day, count: 1, timeZone: state.timeZone })[0];
  if (slot.key !== state.selected || slot.key > todayKey) return picker;
  // A selected live day has a stable cutoff until the short cache TTL expires.
  if (!state.detailNow || z2hLocalDayKey(now, state.timeZone) !== z2hLocalDayKey(state.detailNow, state.timeZone) || +now - +state.detailNow >= Z2H_ACTIVITY_EXTRA_TTL) state.detailNow = now;
  const end = slot.key === todayKey ? state.detailNow : slot.end;
  const data = ['steps', 'distance', 'calories'].filter(metric => state.mappings[`${metric}_entity`]).map(metric => {
    const entity = state.mappings[`${metric}_entity`];
    const request = z2hActivityExtraRequest(card, state, 'history', entity, slot.start, end);
    return { metric, entity, request, value: z2hActivityCounterSummary(request.data?.[entity], slot.start, end, state.timeZone) };
  });
  const cards = data.map(({ metric, entity, request, value }) => {
    const unit = metric === 'steps' ? '' : card._hass?.states?.[entity]?.attributes?.unit_of_measurement || '';
    return `<div><span>${t(metric)}</span><strong>${request.pending ? t('loading') : request.error ? t('error') : z2hActivityExtraValue(card, value.total)}${value.total != null && unit ? ` ${z2hEsc(unit)}` : ''}</strong><small>${value.total != null && !value.complete ? t('partial') : ''}</small></div>`;
  }).join('');
  const profile = data.find(row => row.metric === 'steps');
  const max = Math.max(1, ...(profile?.value.hours || []).filter(Number.isFinite));
  const hourLabel = hour => `${String(hour).padStart(2, '0')}:00 · ${t('steps')}: ${z2hActivityExtraValue(card, profile.value.hours[hour])}`;
  const bars = profile && !profile.request.pending ? `<p>${t('observed')}</p><div class="z2h-extra-hours" aria-label="${z2hEsc(t('show_day_details'))}">${profile.value.hours.map((value, hour) => `<button type="button" data-z2h-detail-hour="${hour}" class="z2h-extra-hour" aria-label="${z2hEsc(hourLabel(hour))}" aria-pressed="${state.selectedHour === hour}"><i style="height:${value == null ? 2 : Math.max(2, value / max * 70)}px" class="${value == null ? 'missing' : ''}"></i><small>${hour % 6 === 0 ? hour : ''}</small></button>`).join('')}</div><p role="status" data-z2h-detail-hour-readout>${Number.isInteger(state.selectedHour) ? z2hEsc(hourLabel(state.selectedHour)) : ''}</p><details><summary>${t('details')}</summary><div class="z2h-extra-hour-values">${profile.value.hours.map((value, hour) => `<span>${String(hour).padStart(2, '0')}:00</span><span>${z2hActivityExtraValue(card, value)}</span>`).join('')}</div></details>` : '';
  return `${picker}<p>${slot.key}</p><div class="z2h-extra-columns">${cards}</div>${bars}`;
}

function z2hActivityFreshnessHtml(card, state, now) {
  const t = key => z2hActivityExtraText(card, key);
  const updated = z2hHistoryTimeMs(card._hass?.states?.[state.mappings.steps_entity]);
  const minutes = updated == null ? null : Math.max(0, Math.floor((+now - updated) / 60000));
  const age = minutes == null ? t('no_data') : minutes === 0 ? t('just_now') : minutes < 60 ? `${minutes} ${t('minutes')}` : `${Math.floor(minutes / 60)} ${t('hours')}`;
  return `<p>${t('ha_update')}: <strong>${z2hEsc(age)}</strong></p><small>${t('sync_note')}</small>`;
}

function z2hActivityRenderExtras(card) {
  if (!card.config || !Z2H_ACTIVITY_EXTRA_FLAGS.some(flag => card.config[flag] === true)) return '';
  const state = z2hActivityExtrasState(card);
  const now = new Date();
  const t = key => z2hActivityExtraText(card, key);
  let body = '';
  if (card.config.show_comparison === true) body += z2hActivityExtraSection(card, t('show_comparison'), z2hActivityComparisonHtml(card, state, now), 'comparison');
  if (card.config.show_calendar === true || card.config.show_weekly_summary === true) {
    const daily = z2hActivityDailyRows(card, state, now);
    if (card.config.show_calendar === true) body += z2hActivityExtraSection(card, t('show_calendar'), z2hActivityCalendarHtml(card, state, daily, now), 'calendar');
    if (card.config.show_weekly_summary === true) body += z2hActivityExtraSection(card, t('show_weekly_summary'), z2hActivityWeeklyHtml(card, state, daily, now), 'weekly');
  }
  if (card.config.show_day_details === true) body += z2hActivityExtraSection(card, t('show_day_details'), z2hActivitySelectedDayHtml(card, state, now), 'day');
  if (card.config.show_freshness === true) body += z2hActivityExtraSection(card, t('show_freshness'), z2hActivityFreshnessHtml(card, state, now), 'freshness');
  if (!body && card.config.compact_mode === true) body = z2hActivityExtraSection(card, t('details'), `<p>${t('compact_note')}</p>`, 'compact');
  return `<div data-z2h-activity-extras><style>
    [data-z2h-activity-extras]{min-width:0;margin-top:16px;font-size:12px;color:var(--primary-text-color)}
    [data-z2h-activity-extras] *{box-sizing:border-box;min-width:0}
    .z2h-extra-section{border-top:1px solid color-mix(in srgb,var(--primary-text-color) 12%,transparent);padding:12px 0}
    .z2h-extra-section h3,.z2h-extra-section summary{font-size:13px;font-weight:650;margin:0 0 10px}.z2h-extra-section summary{cursor:pointer}
    .z2h-extra-section p{margin:8px 0;overflow-wrap:anywhere}.z2h-extra-section small{color:var(--secondary-text-color)}
    .z2h-extra-columns{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.z2h-extra-columns strong,.z2h-extra-columns small{display:block}.z2h-extra-columns strong{font-size:18px;margin:4px 0;overflow-wrap:anywhere}
    .z2h-extra-calendar{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:3px}.z2h-calendar-weekday{text-align:center;font-size:10px}
    .z2h-extra-calendar button{font:inherit;border:1px solid transparent;border-radius:7px;min-height:42px;padding:4px 1px;background:color-mix(in srgb,var(--primary-text-color) 5%,transparent);color:inherit;cursor:pointer;touch-action:manipulation}
    .z2h-extra-calendar button small{display:block;font-size:8px;overflow:hidden;text-overflow:ellipsis}.z2h-extra-calendar .has-data{background:color-mix(in srgb,var(--primary-color) var(--day-intensity,12%),transparent)}.z2h-extra-calendar .goal-met{box-shadow:inset 0 -2px var(--primary-color)}
    .z2h-extra-calendar button[aria-pressed=true]{border-color:var(--primary-color)}.z2h-extra-calendar button[aria-current=date]{font-weight:800}.z2h-extra-calendar button:disabled{opacity:.35;cursor:default}
    .z2h-extra-date{display:flex;flex-wrap:wrap;align-items:center;gap:8px}.z2h-extra-date input{max-width:100%;padding:6px;color:var(--primary-text-color);background:var(--card-background-color);border:1px solid var(--divider-color);border-radius:6px}
    .z2h-extra-hours{display:grid;grid-template-columns:repeat(24,minmax(0,1fr));gap:2px;height:94px;align-items:end;margin:10px 0}.z2h-extra-hour{display:grid;grid-template-rows:74px 16px;align-items:end;border:0;padding:0;background:transparent;color:inherit;cursor:pointer;touch-action:manipulation}.z2h-extra-hour[aria-pressed=true]{outline:1px solid var(--primary-color);outline-offset:1px}.z2h-extra-hour i{display:block;background:var(--primary-color);border-radius:2px}.z2h-extra-hour i.missing{background:var(--disabled-text-color);opacity:.45}.z2h-extra-hour small{font-size:9px}.z2h-extra-hour-values{display:grid;grid-template-columns:1fr 1fr;gap:4px}
    ha-card.z2h-activity-compact{padding:12px!important}ha-card.z2h-activity-compact .activity-head{margin-bottom:8px}ha-card.z2h-activity-compact .activity-history-chart{height:120px}ha-card.z2h-activity-compact .z2h-extra-section{padding:8px 0}ha-card.z2h-activity-compact [data-z2h-activity-extras]{margin-top:8px}
  </style>${body}</div>`;
}

function z2hActivityRefreshExtras(card) {
  const root = card.querySelector?.('[data-z2h-activity-extras]');
  if (!root) return;
  const focusedDay = typeof document !== 'undefined' && root.contains?.(document.activeElement) ? document.activeElement?.dataset?.z2hExtraDay : null;
  root.outerHTML = z2hActivityRenderExtras(card);
  z2hActivityWireExtras(card);
  if (focusedDay && /^\d{4}-\d{2}-\d{2}$/.test(focusedDay)) card.querySelector?.(`[data-z2h-extra-day="${focusedDay}"]`)?.focus();
}

function z2hActivitySelectExtraDay(card, key) {
  if (!(card.config?.show_day_details === true || card.config?.show_calendar === true)) return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key || '')) return false;
  const state = z2hActivityExtrasState(card);
  const logical = new Date(`${key}T12:00:00Z`);
  if (!Number.isFinite(+logical) || logical.toISOString().slice(0, 10) !== key || key > z2hLocalDayKey(new Date(), state.timeZone)) return false;
  if (state.selected !== key) state.selectedHour = null;
  state.selected = key;
  state.expanded = state.expanded || new Set();
  state.expanded.add('day');
  z2hActivityRefreshExtras(card);
  return true;
}

function z2hActivityWireExtras(card) {
  card.querySelector?.('ha-card')?.classList?.toggle('z2h-activity-compact', card.config?.compact_mode === true);
  const root = card.querySelector?.('[data-z2h-activity-extras]');
  if (root) {
    for (const button of root.querySelectorAll('[data-z2h-detail-hour]')) {
      const select = () => {
        z2hActivityExtrasState(card).selectedHour = Number(button.dataset.z2hDetailHour);
        root.querySelector('[data-z2h-detail-hour-readout]').textContent = button.getAttribute('aria-label');
        for (const hour of root.querySelectorAll('[data-z2h-detail-hour]')) hour.setAttribute('aria-pressed', String(hour === button));
      };
      button.addEventListener('click', select);
      button.addEventListener('focus', select);
      button.addEventListener('pointerenter', event => { if (event.pointerType !== 'touch') select(); });
    }
    for (const button of root.querySelectorAll('[data-z2h-extra-day]')) button.addEventListener('click', () => z2hActivitySelectExtraDay(card, button.dataset.z2hExtraDay));
    root.querySelector('[data-z2h-extra-date]')?.addEventListener('change', event => z2hActivitySelectExtraDay(card, event.target.value));
    for (const details of root.querySelectorAll('[data-z2h-extra-section]')) details.addEventListener('toggle', () => {
      const state = z2hActivityExtrasState(card);
      state.expanded = state.expanded || new Set();
      if (details.open) state.expanded.add(details.dataset.z2hExtraSection);
      else state.expanded.delete(details.dataset.z2hExtraSection);
    });
  }
  if (card.config?.show_day_details === true) {
    for (const button of card.querySelectorAll?.('.activity-history [data-activity-day]') || []) {
      if (button.dataset.z2hExtrasWired) continue;
      button.dataset.z2hExtrasWired = 'true';
      button.addEventListener('click', () => { if (card.config?.show_day_details === true) z2hActivitySelectExtraDay(card, button.dataset.activityDay); });
    }
  }
}

function z2hActivityExtrasEditor(editor) {
  return `<section class="z2h-section"><div class="z2h-section-title">${z2hActivityExtraText(editor, 'extras')}</div>${Z2H_ACTIVITY_EXTRA_FLAGS.map(flag => editor._toggleHtml(flag, z2hActivityExtraText(editor, flag), editor._config?.[flag] === true)).join('')}</section>`;
}

z2hRegisterOptionalFeature({ id: 'activity-extras', cards: [AmazfitActivityCard], editors: [AmazfitActivityCardEditor],
  render: z2hActivityRenderExtras, wire: z2hActivityWireExtras, editor: z2hActivityExtrasEditor });
