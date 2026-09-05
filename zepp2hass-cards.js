/*
 * Zepp2Hass Cards
 * Community dashboard cards for Home Assistant + Zepp2Hass
 * Generated bundle — edit src/ files, not this file
 * https://github.com/Psix-anp/zepp2hass-cards
 * License: MIT
 */

const Z2H_VERSION = "1.1.1";
const Z2H_CARD_DEFINITIONS = [
  {
    type: "amazfit-sleep-card",
    name: "Amazfit Sleep Card",
    description: "Zepp-style sleep dashboard with graphical setup",
  },
  {
    type: "amazfit-activity-card",
    name: "Amazfit Activity Card",
    description: "Zepp-style activity dashboard with graphical setup",
  },
  {
    type: "amazfit-health-card",
    name: "Amazfit Health Card",
    description: "Health and training telemetry with graphical setup",
  },
  {
    type: "amazfit-training-card",
    name: "Amazfit Training Card",
    description: "Workout history, training load and recovery with graphical setup",
  },
  {
    type: "family-activity-card",
    name: "Family Activity Card",
    description: "Absolute-step family leaderboard with graphical setup",
  },
];

function z2hEsc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function z2hNumber(value, fallback = null) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function z2hDispatchConfigChanged(host, config) {
  host.dispatchEvent(new CustomEvent("config-changed", {
    detail: { config: structuredClone(config) },
    bubbles: true,
    composed: true,
  }));
}

async function z2hFetchEntityRegistry(hass) {
  const rows = await hass.callWS({ type: "config/entity_registry/list" });
  return Array.isArray(rows) ? rows : [];
}

function z2hDiscoveryText(value) {
  return String(value ?? "").trim().toLowerCase();
}

function z2hUniqueSuffixMatch(uniqueId, suffix) {
  const unique = z2hDiscoveryText(uniqueId);
  const wanted = z2hDiscoveryText(suffix).replace(/^[_-]+/, "");
  if (!unique || !wanted) return false;
  return unique === wanted || unique.endsWith(`_${wanted}`) || unique.endsWith(`-${wanted}`);
}

function z2hEntitySuffixMatch(entityId, suffix) {
  const local = z2hDiscoveryText(entityId).split(".").pop() || "";
  const wanted = z2hDiscoveryText(suffix).replace(/^[_-]+/, "");
  if (!local || !wanted) return false;
  if (local === wanted || local.endsWith(`_${wanted}`)) return true;
  const escaped = wanted.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`_${escaped}_\\d+$`).test(local);
}

function z2hDiscoverSameDevice({ registry, seedEntityId, platform = "zepp2hass", metricSpecs = [] }) {
  if (!Array.isArray(registry) || !seedEntityId) return {};
  const seed = registry.find((row) => row?.entity_id === seedEntityId);
  if (!seed) return {};

  const candidates = registry.filter((row) => {
    if (!row || row.platform !== platform) return false;
    // Zepp2Hass may expose some metrics (for example Training Load) under a
    // secondary HA device while keeping them in the same integration entry.
    // config_entry_id therefore identifies one watch more reliably than
    // device_id; device_id is only a fallback for older registry rows.
    if (seed.config_entry_id) return row.config_entry_id === seed.config_entry_id;
    if (seed.device_id) return row.device_id === seed.device_id;
    return false;
  });

  const discovered = {};
  for (const spec of metricSpecs) {
    if (!spec?.key) continue;
    let best = null;
    let bestScore = 0;
    for (const row of candidates) {
      let score = 0;
      if ((spec.uniqueSuffixes || []).some((suffix) => z2hUniqueSuffixMatch(row.unique_id, suffix))) {
        score = Math.max(score, 300);
      }
      const original = z2hDiscoveryText(row.original_name);
      if ((spec.originalNames || []).some((name) => original && original === z2hDiscoveryText(name))) {
        score = Math.max(score, 200);
      }
      const fallbackSuffixes = (spec.entitySuffixes?.length ? spec.entitySuffixes : spec.uniqueSuffixes) || [];
      if (fallbackSuffixes.some((suffix) => z2hEntitySuffixMatch(row.entity_id, suffix))) {
        score = Math.max(score, 100);
      }
      if (score > bestScore || (score === bestScore && score > 0 && row.entity_id < (best?.entity_id || "~"))) {
        best = row;
        bestScore = score;
      }
    }
    if (best && bestScore > 0) discovered[spec.key] = best.entity_id;
  }
  return discovered;
}

function z2hResolveMappings({ config = {}, discovered = {}, mappingKeys = [] }) {
  const resolved = {};
  for (const key of mappingKeys) {
    resolved[key] = config[key] || discovered[key] || null;
  }
  return resolved;
}

function z2hMetricMatchesRegistryRow(row, metricSpec) {
  if (!row || !metricSpec) return false;
  if ((metricSpec.uniqueSuffixes || []).some((suffix) => z2hUniqueSuffixMatch(row.unique_id, suffix))) return true;
  const original = z2hDiscoveryText(row.original_name);
  if ((metricSpec.originalNames || []).some((name) => original && original === z2hDiscoveryText(name))) return true;
  const suffixes = (metricSpec.entitySuffixes?.length ? metricSpec.entitySuffixes : metricSpec.uniqueSuffixes) || [];
  return suffixes.some((suffix) => z2hEntitySuffixMatch(row.entity_id, suffix));
}

function z2hFindRegistrySeed({ registry, platform = "zepp2hass", metricSpec }) {
  if (!Array.isArray(registry) || !metricSpec) return null;
  const matches = registry
    .filter((row) => row?.platform === platform && z2hMetricMatchesRegistryRow(row, metricSpec))
    .map((row) => row.entity_id)
    .filter(Boolean)
    .sort();
  return matches.length === 1 ? matches[0] : null;
}

function z2hFindSeedFromStates(hass, metricSpec, preferredEntities = []) {
  const states = hass?.states || {};
  const ids = Object.keys(states);
  if (!ids.length || !metricSpec) return null;
  const preferred = new Set((preferredEntities || []).filter((id) => states[id]));
  let best = null;
  let bestScore = 0;
  for (const entityId of ids) {
    if (!entityId.startsWith("sensor.")) continue;
    let score = 0;
    const suffixes = (metricSpec.entitySuffixes?.length ? metricSpec.entitySuffixes : metricSpec.uniqueSuffixes) || [];
    if (suffixes.some((suffix) => z2hEntitySuffixMatch(entityId, suffix))) score = Math.max(score, 200);
    const friendly = z2hDiscoveryText(states[entityId]?.attributes?.friendly_name);
    if ((metricSpec.originalNames || []).some((name) => friendly && friendly === z2hDiscoveryText(name))) score = Math.max(score, 150);
    if (!score) continue;
    if (preferred.has(entityId)) score += 25;
    if (/amazfit|zepp/i.test(entityId)) score += 10;
    if (score > bestScore || (score === bestScore && entityId < (best || "~"))) {
      best = entityId;
      bestScore = score;
    }
  }
  return best;
}

function z2hLocalParts(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const out = {};
  for (const part of parts) {
    if (part.type !== "literal") out[part.type] = Number(part.value);
  }
  return out;
}

function z2hZonedDateFromParts({ year, month, day, hour = 0, minute = 0, second = 0 }, timeZone) {
  const desired = Date.UTC(year, month - 1, day, hour, minute, second);
  let guess = desired;
  for (let i = 0; i < 4; i += 1) {
    const actual = z2hLocalParts(new Date(guess), timeZone);
    const actualAsUtc = Date.UTC(actual.year, actual.month - 1, actual.day, actual.hour, actual.minute, actual.second);
    const delta = desired - actualAsUtc;
    guess += delta;
    if (delta === 0) break;
  }
  return new Date(guess);
}

function z2hLocalDayKey(date, timeZone) {
  const p = z2hLocalParts(date, timeZone);
  return `${String(p.year).padStart(4, "0")}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

function z2hStartOfLocalDay(date, timeZone = "UTC") {
  const p = z2hLocalParts(date, timeZone);
  return z2hZonedDateFromParts({ year: p.year, month: p.month, day: p.day }, timeZone);
}

function z2hCalendarDays({ endDate = new Date(), count = 7, timeZone = "UTC" } = {}) {
  const endParts = z2hLocalParts(endDate, timeZone);
  const total = Math.max(1, Math.floor(Number(count) || 1));
  const days = [];
  for (let offset = total - 1; offset >= 0; offset -= 1) {
    const logical = new Date(Date.UTC(endParts.year, endParts.month - 1, endParts.day - offset));
    const y = logical.getUTCFullYear();
    const m = logical.getUTCMonth() + 1;
    const d = logical.getUTCDate();
    const nextLogical = new Date(Date.UTC(y, m - 1, d + 1));
    const start = z2hZonedDateFromParts({ year: y, month: m, day: d }, timeZone);
    const end = z2hZonedDateFromParts({
      year: nextLogical.getUTCFullYear(),
      month: nextLogical.getUTCMonth() + 1,
      day: nextLogical.getUTCDate(),
    }, timeZone);
    const key = `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const label = new Intl.DateTimeFormat(undefined, { timeZone, weekday: "short", day: "numeric" }).format(start);
    days.push({ key, label, start, end });
  }
  return days;
}

async function z2hFetchDailyChanges(hass, entityIds, start, end) {
  const statisticIds = (Array.isArray(entityIds) ? entityIds : []).filter(Boolean);
  return hass.callWS({
    type: "recorder/statistics_during_period",
    start_time: start.toISOString(),
    end_time: end.toISOString(),
    statistic_ids: statisticIds,
    period: "day",
    types: ["change"],
  });
}

function z2hHistoryTimeMs(item) {
  if (!item || typeof item !== "object") return null;
  const raw = item.last_updated ?? item.last_changed ?? item.lu ?? item.lc ?? item.lastUpdated ?? item.lastChanged;
  if (typeof raw === "number" && Number.isFinite(raw)) return raw < 1e12 ? raw * 1000 : raw;
  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function z2hHistoryNumericState(item) {
  if (!item || typeof item !== "object") return null;
  const raw = item.state ?? item.s;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

function z2hBuildHourlyStepProfile(historyItems, timeZone = "UTC") {
  const rows = (Array.isArray(historyItems) ? historyItems : [])
    .map((item) => ({ item, timeMs: z2hHistoryTimeMs(item), value: z2hHistoryNumericState(item) }))
    .filter((row) => row.timeMs != null && row.value != null)
    .sort((a, b) => a.timeMs - b.timeMs);
  const hours = Array.from({ length: 24 }, () => 0);
  let previous = null;
  for (const row of rows) {
    const delta = previous == null ? row.value : (row.value >= previous ? row.value - previous : row.value);
    previous = row.value;
    if (!(Number.isFinite(delta) && delta >= 0)) continue;
    const hour = z2hLocalParts(new Date(row.timeMs), timeZone).hour;
    if (Number.isInteger(hour) && hour >= 0 && hour < 24) hours[hour] += delta;
  }
  const rounded = hours.map((value) => Math.max(0, Math.round(value)));
  const total = rounded.reduce((sum, value) => sum + value, 0);
  const bestValue = Math.max(0, ...rounded);
  const bestHour = bestValue > 0 ? rounded.findIndex((value) => value === bestValue) : null;
  const activeHours = rounded.filter((value) => value > 0).length;
  return { hours: rounded, total, bestHour, bestValue, activeHours };
}

function z2hStatisticTimeMs(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value < 1e12 ? value * 1000 : value;
  }
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function z2hRowsToDailyMap(rowsByEntity, timeZone = "UTC") {
  const result = new Map();
  if (!rowsByEntity || typeof rowsByEntity !== "object") return result;
  for (const [entityId, rows] of Object.entries(rowsByEntity)) {
    if (!Array.isArray(rows)) continue;
    for (const row of rows) {
      const startMs = z2hStatisticTimeMs(row?.start);
      const endMs = z2hStatisticTimeMs(row?.end);
      const keyDateMs = startMs ?? (endMs != null ? endMs - 1 : null);
      if (keyDateMs == null) continue;
      const key = z2hLocalDayKey(new Date(keyDateMs), timeZone);
      const changeNumber = Number(row?.change);
      const normalized = {
        startMs,
        endMs,
        change: row?.change !== null && row?.change !== undefined && Number.isFinite(changeNumber) ? changeNumber : null,
      };
      if (!result.has(key)) result.set(key, { key });
      result.get(key)[entityId] = normalized;
    }
  }
  return result;
}

function z2hPeriodStart(period, now = new Date(), timeZone = "UTC") {
  const today = z2hStartOfLocalDay(now, timeZone);
  if (period === "today") return today;
  const parts = z2hLocalParts(now, timeZone);
  if (period === "month") {
    return z2hZonedDateFromParts({ year: parts.year, month: parts.month, day: 1 }, timeZone);
  }
  if (period === "week") {
    const logical = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
    const weekday = logical.getUTCDay();
    const daysSinceMonday = (weekday + 6) % 7;
    logical.setUTCDate(logical.getUTCDate() - daysSinceMonday);
    return z2hZonedDateFromParts({
      year: logical.getUTCFullYear(),
      month: logical.getUTCMonth() + 1,
      day: logical.getUTCDate(),
    }, timeZone);
  }
  return today;
}

async function z2hFetchCompletedDailyChanges(hass, entityIds, periodStart, todayStart) {
  return z2hFetchDailyChanges(hass, entityIds, periodStart, todayStart);
}

function z2hMetricState(hass, entityId) {
  const state = entityId ? hass?.states?.[entityId] : null;
  const attributes = state?.attributes || {};
  const unit = attributes.unit_of_measurement || "";
  if (!state || state.state === "unknown" || state.state === "unavailable") {
    return { available: false, value: null, unit, attributes };
  }
  const value = Number(state.state);
  if (!Number.isFinite(value)) return { available: false, value: null, unit, attributes };
  return { available: true, value, unit, attributes };
}

function z2hFiniteSeries(value) {
  if (!Array.isArray(value)) return [];
  const out = [];
  for (const item of value) {
    if (item === null || item === undefined || item === "") continue;
    const n = Number(item);
    if (Number.isFinite(n)) out.push(n);
  }
  return out;
}

function z2hShouldRenderMetric(metric, configuredVisible = true, hideUnavailable = true) {
  if (!configuredVisible) return false;
  if (!hideUnavailable) return true;
  return Boolean(metric?.available);
}

function z2hNormalizeParticipants(configParticipants) {
  if (!Array.isArray(configParticipants)) return [];
  return configParticipants.map((participant) => {
    const source = participant && typeof participant === "object" ? participant : {};
    const targetMode = ["entity", "manual", "none"].includes(source.target_mode) ? source.target_mode : "entity";
    const manualTargetNumber = Number(source.manual_target);
    const manualTarget = Number.isFinite(manualTargetNumber) && manualTargetNumber > 0 ? manualTargetNumber : null;
    const name = typeof source.name === "string" ? source.name.trim() : "";
    const stepsEntity = typeof source.steps_entity === "string" ? source.steps_entity.trim() : "";
    return {
      ...source,
      id: typeof source.id === "string" ? source.id : "",
      name,
      steps_entity: stepsEntity,
      distance_entity: typeof source.distance_entity === "string" ? source.distance_entity.trim() : "",
      calories_entity: typeof source.calories_entity === "string" ? source.calories_entity.trim() : "",
      target_mode: targetMode,
      manual_target: manualTarget,
      valid: Boolean(name && stepsEntity),
    };
  });
}

function z2hRankParticipants(rows) {
  const normalized = (Array.isArray(rows) ? rows : []).map((row, index) => {
    const stepsNumber = Number(row?.steps);
    const targetNumber = Number(row?.target);
    const steps = Number.isFinite(stepsNumber) && stepsNumber >= 0 ? stepsNumber : 0;
    const target = Number.isFinite(targetNumber) && targetNumber > 0 ? targetNumber : null;
    return {
      ...(row || {}),
      _sourceIndex: index,
      steps,
      target,
      targetPercent: target ? (steps / target) * 100 : null,
    };
  });

  normalized.sort((a, b) => {
    if (b.steps !== a.steps) return b.steps - a.steps;
    const byName = String(a.name || "").localeCompare(String(b.name || ""));
    return byName || a._sourceIndex - b._sourceIndex;
  });

  let previousSteps = null;
  let previousRank = 0;
  return normalized.map((row, index) => {
    const rank = previousSteps !== null && row.steps === previousSteps ? previousRank : index + 1;
    previousSteps = row.steps;
    previousRank = rank;
    const { _sourceIndex, ...result } = row;
    return { ...result, rank };
  });
}

function z2hParticipantDailyTarget(participant, state) {
  if (participant?.target_mode === "none") return null;
  if (participant?.target_mode === "manual") {
    const value = Number(participant?.manual_target);
    return Number.isFinite(value) && value > 0 ? value : null;
  }
  const value = Number(state?.attributes?.target);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function z2hBuildParticipantPeriodRows({ participants, hass, completedChanges, period = "today", now = new Date() } = {}) {
  const normalized = z2hNormalizeParticipants(participants).filter((participant) => participant.valid);
  const rows = normalized.map((participant) => {
    const state = hass?.states?.[participant.steps_entity];
    const currentNumber = Number(state?.state);
    const currentSteps = state && state.state !== "unknown" && state.state !== "unavailable" && Number.isFinite(currentNumber) && currentNumber >= 0 ? currentNumber : null;
    const dailyTarget = z2hParticipantDailyTarget(participant, state);
    const completedRows = Array.isArray(completedChanges?.[participant.steps_entity]) ? completedChanges[participant.steps_entity] : [];
    const completedDaily = period === "today" ? [] : completedRows
      .map((row) => Number(row?.change))
      .filter((value) => Number.isFinite(value) && value >= 0);
    const dailySteps = [...completedDaily];
    if (currentSteps !== null) dailySteps.push(currentSteps);
    const steps = dailySteps.reduce((sum, value) => sum + value, 0);
    const target = dailyTarget ? dailyTarget * Math.max(1, dailySteps.length) : null;
    return {
      id: participant.id,
      name: participant.name,
      participant,
      steps,
      target,
      dailyTarget,
      dailySteps,
      hasCurrent: currentSteps !== null,
      period,
    };
  });
  return z2hRankParticipants(rows);
}

class Z2HBaseEditor extends HTMLElement {
  constructor() {
    super();
    this._config = null;
    this._hass = null;
    if (typeof this.attachShadow === "function" && !this.shadowRoot) {
      this.attachShadow({ mode: "open" });
    }
  }

  setConfig(config) {
    this._config = structuredClone(config || {});
    this.render();
  }

  set hass(hass) {
    const firstHass = !this._hass;
    this._hass = hass;
    if (!this._config) return;
    const root = this.shadowRoot || this;
    const hasEditorDom = Boolean(root?.querySelector?.(".z2h-editor"));
    if (firstHass || !hasEditorDom) {
      this.render();
      return;
    }
    this._syncHassToPickers(root);
  }

  get hass() {
    return this._hass;
  }

  _syncHassToPickers(root = this.shadowRoot || this) {
    for (const picker of root?.querySelectorAll?.("[data-z2h-entity-picker]") || []) {
      picker.hass = this._hass;
    }
  }

  _setConfigValue(key, value) {
    this._config = { ...(this._config || {}), [key]: value };
    this._emit();
    this.render();
  }

  _deleteConfigValue(key) {
    const next = { ...(this._config || {}) };
    delete next[key];
    this._config = next;
    this._emit();
    this.render();
  }

  _emit() {
    z2hDispatchConfigChanged(this, this._config || {});
  }

  _entityPickerHtml({ key, label, value = "", domains = ["sensor"] }) {
    return `
      <div class="z2h-field z2h-entity-field">
        <div class="z2h-label">${z2hEsc(label)}</div>
        <ha-entity-picker
          data-z2h-entity-picker="${z2hEsc(key)}"
          data-domains="${z2hEsc(domains.join(","))}"
          data-value="${z2hEsc(value || "")}">
        </ha-entity-picker>
      </div>`;
  }

  _toggleHtml(key, label, checked) {
    return `
      <label class="z2h-toggle-row">
        <span>${z2hEsc(label)}</span>
        <input type="checkbox" data-z2h-toggle="${z2hEsc(key)}" ${checked ? "checked" : ""}>
      </label>`;
  }

  _selectHtml(key, label, value, options) {
    const optionHtml = options.map((option) => {
      const optionValue = typeof option === "string" ? option : option.value;
      const optionLabel = typeof option === "string" ? option : option.label;
      return `<option value="${z2hEsc(optionValue)}" ${String(optionValue) === String(value) ? "selected" : ""}>${z2hEsc(optionLabel)}</option>`;
    }).join("");
    return `
      <label class="z2h-field">
        <span class="z2h-label">${z2hEsc(label)}</span>
        <select data-z2h-select="${z2hEsc(key)}">${optionHtml}</select>
      </label>`;
  }

  _numberHtml(key, label, value, { min = null, max = null, step = 1 } = {}) {
    const minAttr = min === null ? "" : ` min="${z2hEsc(min)}"`;
    const maxAttr = max === null ? "" : ` max="${z2hEsc(max)}"`;
    return `
      <label class="z2h-field">
        <span class="z2h-label">${z2hEsc(label)}</span>
        <input type="number" data-z2h-number="${z2hEsc(key)}" value="${z2hEsc(value ?? "")}" step="${z2hEsc(step)}"${minAttr}${maxAttr}>
      </label>`;
  }

  _editorStyles() {
    return `
      :host { display:block; color:var(--primary-text-color); }
      * { box-sizing:border-box; }
      .z2h-editor { display:grid; gap:16px; padding:4px 0 12px; }
      .z2h-section { display:grid; gap:10px; padding:14px; border:1px solid var(--divider-color, rgba(127,127,127,.22)); border-radius:14px; background:var(--card-background-color, var(--ha-card-background)); }
      .z2h-section-title { font-size:14px; font-weight:700; }
      .z2h-section-note { font-size:12px; line-height:1.35; color:var(--secondary-text-color); }
      .z2h-field { display:grid; gap:6px; min-width:0; }
      .z2h-label { font-size:12px; color:var(--secondary-text-color); }
      .z2h-field select, .z2h-field input[type=number], .z2h-field input[type=text] { width:100%; min-height:40px; padding:0 10px; color:var(--primary-text-color); background:var(--secondary-background-color, transparent); border:1px solid var(--divider-color, rgba(127,127,127,.28)); border-radius:10px; }
      .z2h-toggle-row { display:flex; align-items:center; justify-content:space-between; gap:16px; min-height:34px; font-size:14px; }
      .z2h-toggle-row input { width:18px; height:18px; accent-color:var(--primary-color); }
      .z2h-actions { display:flex; flex-wrap:wrap; gap:8px; }
      .z2h-button { min-height:36px; padding:0 12px; border:1px solid var(--divider-color, rgba(127,127,127,.28)); border-radius:10px; color:var(--primary-color); background:transparent; font:inherit; cursor:pointer; }
      ha-entity-picker { width:100%; }
    `;
  }

  _wireEntityPickers(root) {
    for (const picker of root?.querySelectorAll?.("[data-z2h-entity-picker]") || []) {
      const key = picker.dataset.z2hEntityPicker;
      picker.hass = this._hass;
      picker.value = this._config?.[key] || picker.dataset.value || "";
      const domains = (picker.dataset.domains || "sensor").split(",").filter(Boolean);
      picker.includeDomains = domains;
      picker.addEventListener("value-changed", (event) => {
        const value = event?.detail?.value || "";
        if (value) this._setConfigValue(key, value);
        else this._deleteConfigValue(key);
      });
    }
  }

  _wireCommonControls(root) {
    for (const toggle of root?.querySelectorAll?.("[data-z2h-toggle]") || []) {
      toggle.addEventListener("change", () => this._setConfigValue(toggle.dataset.z2hToggle, Boolean(toggle.checked)));
    }
    for (const select of root?.querySelectorAll?.("[data-z2h-select]") || []) {
      select.addEventListener("change", () => this._setConfigValue(select.dataset.z2hSelect, select.value));
    }
    for (const input of root?.querySelectorAll?.("[data-z2h-number]") || []) {
      input.addEventListener("change", () => {
        const value = Number(input.value);
        if (Number.isFinite(value)) this._setConfigValue(input.dataset.z2hNumber, value);
      });
    }
  }

  renderContent() {
    return "";
  }

  afterRender() {}

  render() {
    if (!this._config || !this._hass) return;
    const root = this.shadowRoot || this;
    if (!("innerHTML" in root)) return;
    root.innerHTML = `<style>${this._editorStyles()}</style><div class="z2h-editor">${this.renderContent()}</div>`;
    this._wireEntityPickers(root);
    this._wireCommonControls(root);
    this.afterRender(root);
  }
}

const Z2H_SLEEP_COMPANION_SPECS = [
  { key: "sleep_total_entity", uniqueSuffixes: ["sleep_total"], originalNames: ["Sleep Total", "Total Sleep", "Total Duration"] },
  { key: "sleep_deep_entity", uniqueSuffixes: ["sleep_deep"], originalNames: ["Sleep Deep", "Deep Sleep"] },
  { key: "sleep_light_entity", uniqueSuffixes: ["sleep_light"], originalNames: ["Sleep Light", "Light Sleep"] },
  { key: "sleep_rem_entity", uniqueSuffixes: ["sleep_rem"], originalNames: ["Sleep REM", "REM Sleep", "REM"] },
  { key: "sleep_awake_entity", uniqueSuffixes: ["sleep_awake"], originalNames: ["Sleep Awake", "Awake"] },
];

class AmazfitSleepCardEditor extends Z2HBaseEditor {
  constructor() {
    super();
    this._discovered = {};
    this._detecting = false;
    this._detectError = null;
    this._detectedSeed = null;
  }

  setConfig(config) {
    const previousSeed = this._config?.entity;
    super.setConfig(config);
    if (previousSeed !== this._config?.entity) {
      this._discovered = {};
      this._detectedSeed = null;
      this._detectError = null;
    }
    this._detect(false);
  }

  set hass(hass) {
    super.hass = hass;
    this._detect(false);
  }

  _lang() {
    const lang = String(this._hass?.language || navigator.language || "en").toLowerCase();
    return lang.startsWith("ru") ? "ru" : "en";
  }

  _t(key) {
    const tr = {
      ru: {
        source: "Источник данных",
        sleep_score: "Sleep Score",
        auto: "Автоопределение",
        redetect: "Определить заново",
        detecting: "Ищу сущности Zepp2Hass…",
        detected: "Найдено",
        none: "Сопутствующие сущности не найдены",
        detect_error: "Не удалось прочитать реестр сущностей",
        display: "Отображение",
        language: "Язык",
        language_auto: "Авто",
        russian: "Русский",
        english: "English",
        chart_height: "Высота графика",
        score: "Оценка сна",
        summary: "Общее время сна",
        percentages: "Проценты фаз",
        quality: "Оценка качества",
        naps: "Дневной сон",
        history: "История",
        seven_days: "7 дней",
        thirty_days: "30 дней",
        target: "Цель сна, минут",
        target_note: "0 отключает баланс/дефицит сна.",
        advanced: "Дополнительные сущности",
        advanced_note: "Оставьте Auto, если Zepp2Hass определился правильно. Ручной выбор всегда имеет приоритет.",
        automatic: "Auto",
        total: "Общее время",
        deep: "Глубокий",
        light: "Лёгкий",
        rem: "REM",
        awake: "Пробуждения",
      },
      en: {
        source: "Data source",
        sleep_score: "Sleep Score",
        auto: "Auto-discovery",
        redetect: "Re-detect",
        detecting: "Finding Zepp2Hass entities…",
        detected: "Found",
        none: "No companion entities found",
        detect_error: "Could not read the entity registry",
        display: "Display",
        language: "Language",
        language_auto: "Auto",
        russian: "Русский",
        english: "English",
        chart_height: "Chart height",
        score: "Sleep score",
        summary: "Total sleep",
        percentages: "Stage percentages",
        quality: "Sleep quality",
        naps: "Naps",
        history: "History",
        seven_days: "7 days",
        thirty_days: "30 days",
        target: "Sleep target, minutes",
        target_note: "0 disables sleep balance/debt.",
        advanced: "Companion entities",
        advanced_note: "Keep Auto when Zepp2Hass is detected correctly. Manual choices always win.",
        automatic: "Auto",
        total: "Total sleep",
        deep: "Deep",
        light: "Light",
        rem: "REM",
        awake: "Awake",
      },
    };
    return tr[this._lang()][key] ?? key;
  }

  _bool(key, fallback = true) {
    return this._config?.[key] === undefined ? fallback : this._config[key] !== false;
  }

  _setConfigValue(key, value) {
    const seedChanged = key === "entity" && value !== this._config?.entity;
    super._setConfigValue(key, value);
    if (seedChanged) {
      this._discovered = {};
      this._detectedSeed = null;
      this._detectError = null;
      this._detect(true);
    }
  }

  async _detect(force = false) {
    let seed = this._config?.entity || null;
    if (!this._hass?.callWS) return;
    if (!force && seed && this._detectedSeed === seed) return;
    if (this._detecting && !force) return;

    const requestedSeed = seed;
    this._detecting = true;
    this._detectError = null;
    this.render();
    try {
      const registry = await z2hFetchEntityRegistry(this._hass);
      if (requestedSeed !== (this._config?.entity || null)) return;
      const sleepScoreSpec = { uniqueSuffixes: ["sleep_score"], originalNames: ["Sleep Score"] };
      const seedRow = seed ? registry.find((row) => row?.entity_id === seed) : null;
      const validSeed = seedRow?.platform === "zepp2hass" && z2hMetricMatchesRegistryRow(seedRow, sleepScoreSpec);
      if (!validSeed) {
        const autoSeed = z2hFindRegistrySeed({ registry, platform: "zepp2hass", metricSpec: sleepScoreSpec });
        if (autoSeed) {
          seed = autoSeed;
          this._config = { ...(this._config || {}), entity: autoSeed };
          this._emit();
        }
      }
      if (!seed) {
        this._discovered = {};
        this._detectedSeed = null;
        return;
      }
      this._discovered = z2hDiscoverSameDevice({
        registry,
        seedEntityId: seed,
        platform: "zepp2hass",
        metricSpecs: Z2H_SLEEP_COMPANION_SPECS,
      });
      this._detectedSeed = seed;
    } catch (error) {
      this._detectError = error?.message || String(error);
      this._detectedSeed = seed;
    } finally {
      this._detecting = false;
      this.render();
    }
  }

  _detectionStatus() {
    if (this._detecting) return this._t("detecting");
    if (this._detectError) return this._t("detect_error");
    const count = Object.keys(this._discovered || {}).length;
    return count ? `${this._t("detected")}: ${count}/${Z2H_SLEEP_COMPANION_SPECS.length}` : this._t("none");
  }

  _advancedRow(spec, label) {
    const explicit = this._config?.[spec.key] || "";
    const auto = this._discovered?.[spec.key] || "";
    return `
      <div class="z2h-advanced-row">
        ${this._entityPickerHtml({ key: spec.key, label, value: explicit, domains: ["sensor"] })}
        <div class="z2h-auto-line">
          <span>${this._t("automatic")}: ${auto ? `<code>${z2hEsc(auto)}</code>` : "—"}</span>
          ${explicit ? `<button type="button" class="z2h-button" data-z2h-auto-key="${z2hEsc(spec.key)}">${this._t("automatic")}</button>` : ""}
        </div>
      </div>`;
  }

  renderContent() {
    if (!this._config) return "";
    return `
      <section class="z2h-section">
        <div class="z2h-section-title">${this._t("source")}</div>
        ${this._entityPickerHtml({ key: "entity", label: this._t("sleep_score"), value: this._config.entity || "", domains: ["sensor"] })}
        <div class="z2h-auto-line">
          <span class="z2h-section-note"><strong>${this._t("auto")}:</strong> ${z2hEsc(this._detectionStatus())}</span>
          <button type="button" class="z2h-button" data-z2h-redetect>${this._t("redetect")}</button>
        </div>
      </section>

      <section class="z2h-section">
        <div class="z2h-section-title">${this._t("display")}</div>
        ${this._selectHtml("language", this._t("language"), this._config.language || "auto", [
          { value: "auto", label: this._t("language_auto") },
          { value: "ru", label: this._t("russian") },
          { value: "en", label: this._t("english") },
        ])}
        ${this._numberHtml("chart_height", this._t("chart_height"), this._config.chart_height ?? 235, { min: 150, max: 420, step: 5 })}
        ${this._toggleHtml("show_score", this._t("score"), this._bool("show_score"))}
        ${this._toggleHtml("show_summary", this._t("summary"), this._bool("show_summary"))}
        ${this._toggleHtml("show_percentages", this._t("percentages"), this._bool("show_percentages"))}
        ${this._toggleHtml("show_quality", this._t("quality"), this._bool("show_quality"))}
        ${this._toggleHtml("show_naps", this._t("naps"), this._bool("show_naps"))}
      </section>

      <section class="z2h-section">
        <div class="z2h-section-title">${this._t("history")}</div>
        ${this._toggleHtml("show_7d", this._t("seven_days"), this._bool("show_7d"))}
        ${this._toggleHtml("show_30d", this._t("thirty_days"), this._bool("show_30d"))}
        ${this._numberHtml("target_sleep_minutes", this._t("target"), this._config.target_sleep_minutes ?? 0, { min: 0, max: 900, step: 15 })}
        <div class="z2h-section-note">${this._t("target_note")}</div>
      </section>

      <section class="z2h-section">
        <div class="z2h-section-title">${this._t("advanced")}</div>
        <div class="z2h-section-note">${this._t("advanced_note")}</div>
        ${this._advancedRow(Z2H_SLEEP_COMPANION_SPECS[0], this._t("total"))}
        ${this._advancedRow(Z2H_SLEEP_COMPANION_SPECS[1], this._t("deep"))}
        ${this._advancedRow(Z2H_SLEEP_COMPANION_SPECS[2], this._t("light"))}
        ${this._advancedRow(Z2H_SLEEP_COMPANION_SPECS[3], this._t("rem"))}
        ${this._advancedRow(Z2H_SLEEP_COMPANION_SPECS[4], this._t("awake"))}
      </section>`;
  }

  _editorStyles() {
    return `${super._editorStyles()}
      .z2h-auto-line { display:flex; align-items:center; justify-content:space-between; gap:10px; min-width:0; }
      .z2h-auto-line code { overflow-wrap:anywhere; font-size:11px; color:var(--secondary-text-color); }
      .z2h-advanced-row { display:grid; gap:5px; padding-top:4px; }
    `;
  }

  afterRender(root) {
    root?.querySelector?.("[data-z2h-redetect]")?.addEventListener("click", () => this._detect(true));
    for (const button of root?.querySelectorAll?.("[data-z2h-auto-key]") || []) {
      button.addEventListener("click", () => this._deleteConfigValue(button.dataset.z2hAutoKey));
    }
  }
}

if (!customElements.get("amazfit-sleep-card-editor")) {
  customElements.define("amazfit-sleep-card-editor", AmazfitSleepCardEditor);
}

// Amazfit Sleep Card v6
class AmazfitSleepCard extends HTMLElement {
  setConfig(config) {
    const previousEntity = this.config?.entity || null;
    this.config = {
      title: null,
      language: "auto", // auto | ru | en
      chart_height: 235,
      show_score: true,
      show_summary: true,
      show_percentages: true,
      show_quality: true,
      show_naps: true,
      show_7d: true,
      show_30d: true,
      target_sleep_minutes: 0,
      sleep_total_entity: null,
      sleep_deep_entity: null,
      sleep_light_entity: null,
      sleep_rem_entity: null,
      sleep_awake_entity: null,
      ...config,
    };
    if (previousEntity !== this.config.entity) {
      this._discoveredCompanions = {};
      this._companionDiscoverySeed = null;
      this._companionDiscoveryReady = false;
      this._companionDiscoveryPromise = null;
    }
    this._view = this._view || "night";
    if ((this._view === "7d" && this.config.show_7d === false) || (this._view === "30d" && this.config.show_30d === false)) {
      this._view = "night";
    }
    this._detailNightKey = this._detailNightKey || null;
    this._trendMetric = this._trendMetric || "sleep";
    if (this._hass) this._ensureDiscoveredCompanions();
  }

  _sleepHassSignature(hass = this._hass) {
    if (!hass || !this.config) return "";
    const ids = new Set();
    if (this.config.entity) ids.add(this.config.entity);
    for (const kind of ["sleep_total", "sleep_deep", "sleep_light", "sleep_rem", "sleep_awake"]) {
      const configKey = `${kind}_entity`;
      const configured = this.config?.[configKey];
      const discovered = this._discoveredCompanions?.[configKey];
      if (configured) ids.add(configured);
      if (discovered) ids.add(discovered);
      const seed = this.config.entity || "";
      const candidate = seed.replace(/_sleep_score$/, `_${kind}`);
      if (candidate !== seed && hass.states?.[candidate]) ids.add(candidate);
    }
    const states = [...ids].sort().map((id) => {
      const state = hass.states?.[id];
      return [id, state?.state ?? null, state?.last_updated ?? null, state?.last_changed ?? null];
    });
    return JSON.stringify([hass.language || "", states]);
  }

  set hass(hass) {
    this._hass = hass;
    const signature = this._sleepHassSignature(hass);
    if (signature !== this._lastSleepHassSignature) {
      this._lastSleepHassSignature = signature;
      this.render();
    }
    this._ensureDiscoveredCompanions();
  }

  getCardSize() {
    return 6;
  }

  static getConfigElement() {
    return document.createElement("amazfit-sleep-card-editor");
  }

  static getStubConfig(hass, entities) {
    const metricSpec = { uniqueSuffixes: ["sleep_score"], originalNames: ["Sleep Score"] };
    return {
      entity: z2hFindSeedFromStates(hass, metricSpec, entities) || (Array.isArray(entities) ? entities.find((id) => typeof id === "string" && id.startsWith("sensor.")) : "") || "",
      language: "auto",
    };
  }

  _lang() {
    if (this.config?.language === "ru" || this.config?.language === "en") {
      return this.config.language;
    }
    const lang = (this._hass?.language || navigator.language || "en").toLowerCase();
    return lang.startsWith("ru") ? "ru" : "en";
  }

  _t(key) {
    const tr = {
      ru: {
        title: "Сон",
        score_unit: "балла",
        total_sleep: "Общее время сна",
        wake_short: "Пробужд.",
        wake: "Пробуждения",
        rem: "REM",
        light: "Лёгкий",
        deep: "Глубокий",
        excellent: "Отличный сон",
        good: "Хороший сон",
        normal: "Нормальный сон",
        mediocre: "Посредственный сон",
        recover: "Стоит восстановиться",
        entity_missing: "Сущность не найдена",
        no_stages: "В атрибуте stages нет данных сна",
        hour: "ч",
        minute: "мин",
        cursor_time: "Время",
        no_stage: "Нет данных",
        tab_night: "Ночь",
        tab_7d: "7 дней",
        tab_30d: "30 дней",
        today: "Сегодня",
        history_loading: "Загружаю историю сна…",
        history_error: "Не удалось загрузить историю сна",
        retry: "Повторить",
        no_history: "За этот период данных сна нет",
        average_sleep: "Средний сон",
        average_score: "Средний балл",
        average_deep: "Средний глубокий",
        average_rem: "Средний REM",
        bedtime_regular: "Стабильность засыпания",
        wake_regular: "Стабильность подъёма",
        average_bedtime: "Среднее засыпание",
        average_wake: "Средний подъём",
        later: "позже",
        earlier: "раньше",
        today_delta: "Последняя ночь",
        sleep_debt: "Недосып",
        sleep_balance: "Баланс сна",
        nights: "ночей",
        nap: "Дневной сон",
        taps_hint: "Нажми на день для подробностей",
        score_short: "Балл",
        trend_sleep: "Сон",
        trend_score: "Балл",
        no_data_short: "Нет данных",
      },
      en: {
        title: "Sleep",
        score_unit: "points",
        total_sleep: "Total sleep",
        wake_short: "Awake",
        wake: "Awake",
        rem: "REM",
        light: "Light",
        deep: "Deep",
        excellent: "Excellent sleep",
        good: "Good sleep",
        normal: "Normal sleep",
        mediocre: "Fair sleep",
        recover: "Recovery recommended",
        entity_missing: "Entity not found",
        no_stages: "No sleep data in stages attribute",
        hour: "h",
        minute: "min",
        cursor_time: "Time",
        no_stage: "No data",
        tab_night: "Night",
        tab_7d: "7 days",
        tab_30d: "30 days",
        today: "Today",
        history_loading: "Loading sleep history…",
        history_error: "Could not load sleep history",
        retry: "Retry",
        no_history: "No sleep data for this period",
        average_sleep: "Average sleep",
        average_score: "Average score",
        average_deep: "Average deep",
        average_rem: "Average REM",
        bedtime_regular: "Bedtime regularity",
        wake_regular: "Wake regularity",
        average_bedtime: "Average bedtime",
        average_wake: "Average wake time",
        later: "later",
        earlier: "earlier",
        today_delta: "Latest night",
        sleep_debt: "Sleep debt",
        sleep_balance: "Sleep balance",
        nights: "nights",
        nap: "Nap",
        taps_hint: "Tap a day for details",
        score_short: "Score",
        trend_sleep: "Sleep",
        trend_score: "Score",
        no_data_short: "No data",
      }
    };
    return tr[this._lang()][key] ?? key;
  }

  _mins(value) {
    const m = Math.max(0, Math.round(Number(value) || 0));
    const h = Math.floor(m / 60);
    const r = m % 60;
    if (h && r) return `${h} ${this._t("hour")} ${r} ${this._t("minute")}`;
    if (h) return `${h} ${this._t("hour")}`;
    return `${r} ${this._t("minute")}`;
  }

  _time(d) {
    const locale = this._lang() === "ru" ? "ru-RU" : "en-GB";
    return new Intl.DateTimeFormat(locale, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(d);
  }

  _clockFromMinute(value) {
    const total = ((Math.round(Number(value) || 0) % 1440) + 1440) % 1440;
    const hour = Math.floor(total / 60);
    const minute = total % 60;
    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  }

  _scheduleDeltaLabel(value) {
    const minutes = Math.round(Number(value) || 0);
    if (minutes === 0) return `${this._t("today_delta")}: ±0 ${this._t("minute")}`;
    const direction = minutes > 0 ? this._t("later") : this._t("earlier");
    return `${this._t("today_delta")}: ${Math.abs(minutes)} ${this._t("minute")} ${direction}`;
  }

  _esc(v) {
    return String(v ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  _quality(score) {
    const n = Number(score);
    if (!Number.isFinite(n)) return "";
    if (n >= 90) return this._t("excellent");
    if (n >= 80) return this._t("good");
    if (n >= 70) return this._t("normal");
    if (n >= 60) return this._t("mediocre");
    return this._t("recover");
  }


  _timezone() {
    return this._hass?.config?.time_zone || undefined;
  }

  _dateKey(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: this._timezone(),
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date);
    const values = Object.fromEntries(parts.map(p => [p.type, p.value]));
    return `${values.year}-${values.month}-${values.day}`;
  }

  _dateLabel(date, long = false) {
    const locale = this._lang() === "ru" ? "ru-RU" : "en-GB";
    return new Intl.DateTimeFormat(locale, {
      timeZone: this._timezone(),
      day: "numeric",
      month: long ? "long" : "short",
      ...(long ? { weekday: "short" } : {}),
    }).format(date);
  }

  _localMinuteOfDay(date) {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: this._timezone(),
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(date);
    const values = Object.fromEntries(parts.map(p => [p.type, p.value]));
    let hour = Number(values.hour);
    if (hour === 24) hour = 0;
    return hour * 60 + Number(values.minute || 0);
  }

  _historyStateParts(item) {
    if (!item || typeof item !== "object") {
      return { state: undefined, attributes: {}, updatedMs: 0 };
    }
    const compact = Object.prototype.hasOwnProperty.call(item, "s") || Object.prototype.hasOwnProperty.call(item, "a");
    const state = compact ? item.s : item.state;
    const attributes = (compact ? item.a : item.attributes) || {};
    let updatedMs = 0;
    if (compact) {
      const raw = item.lu ?? item.lc;
      if (Number.isFinite(Number(raw))) updatedMs = Number(raw) * 1000;
    } else {
      updatedMs = Date.parse(item.last_updated || item.last_changed || "") || 0;
    }
    return { state, attributes, updatedMs };
  }

  _parseStages(attributes) {
    const raw = Array.isArray(attributes?.stages) ? attributes.stages : [];
    const validPhases = new Set(["WAKE_STAGE", "REM_STAGE", "LIGHT_STAGE", "DEEP_STAGE"]);
    return raw
      .filter(s => s && validPhases.has(s.phase))
      .map(s => {
        const start = new Date(s.start);
        const stop = new Date(s.stop);
        let duration = Number(s.duration_min);
        if (!Number.isFinite(duration)) duration = Math.max(0, (stop - start) / 60000);
        return { ...s, start, stop, duration };
      })
      .filter(s => !Number.isNaN(s.start.getTime()) && !Number.isNaN(s.stop.getTime()) && s.stop >= s.start)
      .sort((a, b) => a.start - b.start);
  }

  _napSummary(naps) {
    if (!Array.isArray(naps) || !naps.length) return { count: 0, totalMinutes: 0 };
    let total = 0;
    let recognized = 0;
    const durationFrom = (nap) => {
      if (!nap || typeof nap !== "object") return null;
      for (const key of ["duration_min", "durationMin", "duration", "totalTime", "total_time"]) {
        const n = Number(nap[key]);
        if (Number.isFinite(n) && n >= 0) return n;
      }
      const startRaw = nap.start ?? nap.startTime ?? nap.start_time;
      const stopRaw = nap.stop ?? nap.end ?? nap.endTime ?? nap.end_time;
      if (startRaw == null || stopRaw == null) return null;
      const startNum = Number(startRaw);
      const stopNum = Number(stopRaw);
      if (Number.isFinite(startNum) && Number.isFinite(stopNum) && startNum >= 0 && startNum <= 1440 && stopNum >= 0 && stopNum <= 1440) {
        return stopNum >= startNum ? stopNum - startNum : (1440 - startNum) + stopNum;
      }
      const start = new Date(startRaw);
      const stop = new Date(stopRaw);
      if (!Number.isNaN(start.getTime()) && !Number.isNaN(stop.getTime())) {
        return Math.max(0, (stop - start) / 60000);
      }
      return null;
    };
    for (const nap of naps) {
      const duration = durationFrom(nap);
      if (duration != null) {
        total += duration;
        recognized += 1;
      }
    }
    return { count: naps.length, totalMinutes: recognized ? Math.round(total) : null };
  }

  _wakeEventsLabel(count) {
    const n = Math.max(0, Math.round(Number(count) || 0));
    if (this._lang() !== "ru") return `${n} ${n === 1 ? "awakening" : "awakenings"}`;
    const mod10 = n % 10;
    const mod100 = n % 100;
    let word = "пробуждений";
    if (mod10 === 1 && mod100 !== 11) word = "пробуждение";
    else if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) word = "пробуждения";
    return `${n} ${word}`;
  }

  _dataNightsLabel(count) {
    const n = Math.max(0, Math.round(Number(count) || 0));
    if (this._lang() !== "ru") return `Data: ${n} ${n === 1 ? "night" : "nights"}`;
    const mod10 = n % 10;
    const mod100 = n % 100;
    let word = "ночей";
    if (mod10 === 1 && mod100 !== 11) word = "ночь";
    else if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) word = "ночи";
    return `Данных: ${n} ${word}`;
  }

  async _ensureDiscoveredCompanions(force = false) {
    const seed = this.config?.entity;
    if (!seed || !this._hass?.callWS) return this._discoveredCompanions || {};
    if (!force && this._companionDiscoveryReady && this._companionDiscoverySeed === seed) {
      return this._discoveredCompanions || {};
    }
    if (!force && this._companionDiscoveryPromise && this._companionDiscoverySeed === seed) {
      return this._companionDiscoveryPromise;
    }

    this._companionDiscoverySeed = seed;
    const requestSeed = seed;
    const promise = z2hFetchEntityRegistry(this._hass)
      .then((registry) => {
        if (this.config?.entity !== requestSeed) return this._discoveredCompanions || {};
        this._discoveredCompanions = z2hDiscoverSameDevice({
          registry,
          seedEntityId: requestSeed,
          platform: "zepp2hass",
          metricSpecs: Z2H_SLEEP_COMPANION_SPECS,
        });
        this._companionDiscoveryReady = true;
        this.render();
        return this._discoveredCompanions;
      })
      .catch(() => {
        if (this.config?.entity === requestSeed) this._companionDiscoveryReady = true;
        return this._discoveredCompanions || {};
      })
      .finally(() => {
        if (this._companionDiscoveryPromise === promise) this._companionDiscoveryPromise = null;
      });
    this._companionDiscoveryPromise = promise;
    return promise;
  }

  _companionEntityId(kind) {
    const configKey = `${kind}_entity`;
    const configured = this.config?.[configKey];
    if (configured) return configured;
    const discovered = this._discoveredCompanions?.[configKey];
    if (discovered) return discovered;
    const scoreEntity = this.config?.entity || "";
    const candidate = scoreEntity.replace(/_sleep_score$/, `_${kind}`);
    if (candidate !== scoreEntity && this._hass?.states?.[candidate]) return candidate;
    return null;
  }

  _durationMinutesFromState(stateObj) {
    if (!stateObj) return null;
    const value = Number(stateObj.state);
    if (!Number.isFinite(value)) return null;
    const unit = String(stateObj.attributes?.unit_of_measurement || "min").toLowerCase();
    if (["h", "hr", "hrs", "hour", "hours"].includes(unit)) return Math.round(value * 60);
    if (["s", "sec", "second", "seconds"].includes(unit)) return Math.round(value / 60);
    return Math.round(value);
  }

  _currentCompanionSummary() {
    const get = (kind) => {
      const id = this._companionEntityId(kind);
      return id ? this._durationMinutesFromState(this._hass?.states?.[id]) : null;
    };
    const result = {
      sleepTotal: get("sleep_total"),
      deep: get("sleep_deep"),
      light: get("sleep_light"),
      rem: get("sleep_rem"),
      awake: get("sleep_awake"),
    };
    return result;
  }

  _periodSlots(nights, days, anchor = new Date()) {
    const byKey = new Map((Array.isArray(nights) ? nights : []).map(n => [n.key, n]));
    const slots = [];
    for (let i = Math.max(1, Number(days) || 1) - 1; i >= 0; i--) {
      const date = new Date(anchor.getTime() - i * 86400000);
      const key = this._dateKey(date);
      slots.push({ key, date, night: byKey.get(key) || null });
    }
    return slots;
  }

  _buildNight(state, attributes, updatedMs = 0) {
    const stages = this._parseStages(attributes);
    if (!stages.length) return null;
    const totals = { DEEP_STAGE: 0, LIGHT_STAGE: 0, REM_STAGE: 0, WAKE_STAGE: 0 };
    for (const stage of stages) totals[stage.phase] += stage.duration;
    Object.keys(totals).forEach(k => totals[k] = Math.round(totals[k]));
    const start = new Date(Math.min(...stages.map(s => s.start.getTime())));
    const stop = new Date(Math.max(...stages.map(s => s.stop.getTime())));
    const scoreNumber = Number(state);
    return {
      key: this._dateKey(new Date(start.getTime() + 12 * 60 * 60 * 1000)),
      score: Number.isFinite(scoreNumber) ? Math.round(scoreNumber) : state,
      stages,
      totals,
      sleepTotal: totals.DEEP_STAGE + totals.LIGHT_STAGE + totals.REM_STAGE,
      wakeEvents: stages.filter(stage => stage.phase === "WAKE_STAGE").length,
      start,
      stop,
      updatedMs: Number(updatedMs) || 0,
      naps: Array.isArray(attributes?.naps) ? attributes.naps : [],
      napSummary: this._napSummary(attributes?.naps),
    };
  }

  _nightRank(night) {
    if (!night) return -Infinity;
    return night.stages.length * 1e15 + night.stop.getTime() * 1e3 + (night.updatedMs || 0);
  }

  _historyToNights(historyItems, currentState) {
    const candidates = [];
    for (const item of Array.isArray(historyItems) ? historyItems : []) {
      const parts = this._historyStateParts(item);
      const night = this._buildNight(parts.state, parts.attributes, parts.updatedMs);
      if (night) candidates.push(night);
    }
    if (currentState) {
      const parts = this._historyStateParts(currentState);
      const night = this._buildNight(parts.state, parts.attributes, parts.updatedMs);
      if (night) candidates.push(night);
    }
    const byKey = new Map();
    for (const night of candidates) {
      const existing = byKey.get(night.key);
      if (!existing || this._nightRank(night) >= this._nightRank(existing)) byKey.set(night.key, night);
    }
    return [...byKey.values()].sort((a, b) => a.stop - b.stop);
  }

  _std(values) {
    if (!values.length) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
    return Math.sqrt(variance);
  }

  _periodStats(nights) {
    const valid = (Array.isArray(nights) ? nights : []).filter(n => n && n.sleepTotal > 0);
    if (!valid.length) {
      return { avgScore: 0, avgSleep: 0, avgDeep: 0, avgRem: 0, bedtimeSpreadMin: 0, wakeSpreadMin: 0, avgBedtimeMin: 0, avgWakeMin: 0, latestBedtimeDeltaMin: 0, latestWakeDeltaMin: 0, sleepDebt: 0, sleepBalance: 0, count: 0 };
    }
    const avg = (values) => Math.round(values.reduce((a, b) => a + b, 0) / values.length);
    const scores = valid.map(n => Number(n.score)).filter(Number.isFinite);
    const bedtimes = valid.map(n => {
      let minute = this._localMinuteOfDay(n.start);
      if (minute < 12 * 60) minute += 1440;
      return minute;
    });
    const wakes = valid.map(n => this._localMinuteOfDay(n.stop));
    const mean = (values) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
    const avgBedtimeRaw = mean(bedtimes);
    const avgWakeRaw = mean(wakes);
    const baselineBedtimes = bedtimes.length > 1 ? bedtimes.slice(0, -1) : bedtimes;
    const baselineWakes = wakes.length > 1 ? wakes.slice(0, -1) : wakes;
    const latestBedtimeDeltaMin = bedtimes.length ? Math.round(bedtimes[bedtimes.length - 1] - mean(baselineBedtimes)) : 0;
    const latestWakeDeltaMin = wakes.length ? Math.round(wakes[wakes.length - 1] - mean(baselineWakes)) : 0;
    const target = Math.max(0, Number(this.config?.target_sleep_minutes) || 0);
    const totalSleep = valid.reduce((sum, n) => sum + n.sleepTotal, 0);
    const sleepBalance = target ? totalSleep - target * valid.length : 0;
    return {
      avgScore: scores.length ? avg(scores) : 0,
      avgSleep: avg(valid.map(n => n.sleepTotal)),
      avgDeep: avg(valid.map(n => n.totals.DEEP_STAGE || 0)),
      avgRem: avg(valid.map(n => n.totals.REM_STAGE || 0)),
      bedtimeSpreadMin: Math.round(this._std(bedtimes)),
      wakeSpreadMin: Math.round(this._std(wakes)),
      avgBedtimeMin: ((Math.round(avgBedtimeRaw) % 1440) + 1440) % 1440,
      avgWakeMin: ((Math.round(avgWakeRaw) % 1440) + 1440) % 1440,
      latestBedtimeDeltaMin,
      latestWakeDeltaMin,
      sleepDebt: Math.max(0, -sleepBalance),
      sleepBalance,
      count: valid.length,
    };
  }

  async _loadHistory(days) {
    if (!this._hass?.callWS) return [];
    const end = new Date();
    const start = new Date(end.getTime() - (Math.max(1, Number(days) || 1) + 2) * 86400000);
    const result = await this._hass.callWS({
      type: "history/history_during_period",
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      entity_ids: [this.config.entity],
      minimal_response: false,
      no_attributes: false,
    });
    return Array.isArray(result?.[this.config.entity]) ? result[this.config.entity] : [];
  }

  _ensureHistory(days) {
    const requested = Math.max(1, Number(days) || 1);
    const entity = this.config.entity;
    if (this._historyEntity === entity && (this._historyLoadedDays || 0) >= requested) return Promise.resolve();
    if (this._historyPromise && this._historyEntity === entity && (this._historyRequestedDays || 0) >= requested) return this._historyPromise;

    this._historyEntity = entity;
    this._historyRequestedDays = requested;
    this._historyLoading = true;
    this._historyError = null;
    const token = (this._historyToken || 0) + 1;
    this._historyToken = token;
    this._historyPromise = this._loadHistory(requested)
      .then(records => {
        if (this._historyToken !== token) return;
        this._historyRecords = records;
        this._historyLoadedDays = requested;
        this._historyLoading = false;
        this._historyError = null;
        this.render();
      })
      .catch(err => {
        if (this._historyToken !== token) return;
        this._historyLoading = false;
        this._historyError = err?.message || String(err);
        this.render();
      })
      .finally(() => {
        if (this._historyToken === token) this._historyPromise = null;
      });
    return this._historyPromise;
  }

  _periodNights(allNights, days) {
    const cutoff = Date.now() - (Math.max(1, days) + 1) * 86400000;
    return (Array.isArray(allNights) ? allNights : []).filter(n => n.stop.getTime() >= cutoff).slice(-days);
  }


  _viewTabsHtml() {
    const show7 = this.config?.show_7d !== false;
    const show30 = this.config?.show_30d !== false;
    if ((this._view === "7d" && !show7) || (this._view === "30d" && !show30)) this._view = "night";
    const active = this._view || "night";
    const tabs = [
      `<button class="view-tab ${active === "night" ? "active" : ""}" data-view="night">${this._t("tab_night")}</button>`,
      show7 ? `<button class="view-tab ${active === "7d" ? "active" : ""}" data-view="7d">${this._t("tab_7d")}</button>` : "",
      show30 ? `<button class="view-tab ${active === "30d" ? "active" : ""}" data-view="30d">${this._t("tab_30d")}</button>` : "",
    ].filter(Boolean);
    return `
      <div class="view-tabs" role="tablist" style="grid-template-columns:repeat(${tabs.length},minmax(0,1fr))">
        ${tabs.join("")}
      </div>`;
  }

  _summaryTile(label, value, cls = "", sub = "") {
    return `<div class="period-stat ${cls}"><div class="period-stat-value">${value}</div><div class="period-stat-label">${label}</div>${sub ? `<div class="period-stat-sub">${sub}</div>` : ""}</div>`;
  }

  _renderPeriodContent(days, nights, anchor = new Date()) {
    const period = (Array.isArray(nights) ? nights : []).slice(-days);
    if (!period.length) return `<div class="history-empty">${this._t("no_history")}</div>`;

    const stats = this._periodStats(period);
    const regularity = (minutes) => `±${this._mins(minutes)}`;
    const balanceValue = stats.sleepBalance < 0
      ? `−${this._mins(Math.abs(stats.sleepBalance))}`
      : `+${this._mins(stats.sleepBalance)}`;

    const summary = `
      <div class="period-summary">
        ${this._summaryTile(this._t("average_sleep"), this._mins(stats.avgSleep))}
        ${this._summaryTile(this._t("average_score"), String(stats.avgScore))}
        ${this._summaryTile(this._t("average_deep"), this._mins(stats.avgDeep), "deep-text")}
        ${this._summaryTile(this._t("average_rem"), this._mins(stats.avgRem), "rem-text")}
        ${this._summaryTile(this._t("bedtime_regular"), regularity(stats.bedtimeSpreadMin))}
        ${this._summaryTile(this._t("wake_regular"), regularity(stats.wakeSpreadMin))}
        ${this._summaryTile(this._t("average_bedtime"), this._clockFromMinute(stats.avgBedtimeMin), "", this._scheduleDeltaLabel(stats.latestBedtimeDeltaMin))}
        ${this._summaryTile(this._t("average_wake"), this._clockFromMinute(stats.avgWakeMin), "", this._scheduleDeltaLabel(stats.latestWakeDeltaMin))}
        ${Number(this.config?.target_sleep_minutes) > 0 ? this._summaryTile(stats.sleepBalance < 0 ? this._t("sleep_debt") : this._t("sleep_balance"), balanceValue, stats.sleepBalance < 0 ? "wake-text" : "deep-text") : ""}
      </div>`;

    if (days <= 7) {
      const slots = this._periodSlots(period, 7, anchor);
      const available = slots.map(slot => slot.night).filter(Boolean);
      const maxTotal = Math.max(480, ...available.map(n => n.sleepTotal + (n.totals.WAKE_STAGE || 0)));
      const bars = slots.map(slot => {
        const night = slot.night;
        if (!night) {
          return `
            <div class="history-day empty">
              <span class="history-score">—</span>
              <span class="history-bar-shell"><span class="history-column empty"></span></span>
              <span class="history-duration">—</span>
              <span class="history-date">${this._dateLabel(slot.date)}</span>
            </div>`;
        }
        const total = Math.max(1, night.sleepTotal + (night.totals.WAKE_STAGE || 0));
        const outerHeight = Math.max(18, Math.min(100, total / maxTotal * 100));
        const seg = (key, cls, labelKey) => {
          const value = night.totals[key] || 0;
          if (!value) return "";
          const percent = Math.round(value / total * 100);
          return `<span class="history-segment ${cls}" style="height:${Math.max(2, value / total * 100)}%" data-tip-title="${this._esc(this._t(labelKey))}" data-tip-body="${this._esc(`${this._mins(value)} · ${percent}%`)}"></span>`;
        };
        return `
          <button class="history-day" data-night-key="${night.key}" title="${this._dateLabel(night.stop, true)}">
            <span class="history-score">${this._esc(night.score)}</span>
            <span class="history-bar-shell">
              <span class="history-column" style="height:${outerHeight}%">
                ${seg("WAKE_STAGE", "wake", "wake")}
                ${seg("REM_STAGE", "rem", "rem")}
                ${seg("LIGHT_STAGE", "light", "light")}
                ${seg("DEEP_STAGE", "deep", "deep")}
              </span>
            </span>
            <span class="history-duration">${this._mins(night.sleepTotal)}</span>
            <span class="history-date">${this._dateLabel(night.stop)}</span>
          </button>`;
      }).join("");

      return `
        ${summary}
        <div class="history-hint">${this._t("taps_hint")}</div>
        <div class="period-interactive">
          <div class="history-bars">${bars}</div>
          <div class="period-tooltip"><strong></strong><span></span></div>
        </div>`;
    }

    const W = 1000;
    const H = 170;
    const top = 10;
    const bottom = 12;
    const usableH = H - top - bottom;
    const n = period.length;
    const maxSleep = Math.max(600, ...period.map(night => night.sleepTotal));
    const slot = W / Math.max(1, n);
    const barW = Math.max(5, Math.min(22, slot * 0.48));
    const pointX = (i) => slot * i + slot / 2;
    const scoreY = (score) => {
      const numeric = Number(score);
      if (!Number.isFinite(numeric)) return H / 2;
      const normalized = Math.max(50, Math.min(100, numeric));
      return top + (100 - normalized) / 50 * usableH;
    };
    const points = period.map((night, i) => `${pointX(i).toFixed(1)},${scoreY(night.score).toFixed(1)}`).join(" ");
    const rects = period.map((night, i) => {
      const h = Math.max(2, night.sleepTotal / maxSleep * usableH);
      const x = pointX(i) - barW / 2;
      const y = H - bottom - h;
      return `<rect class="duration-bar" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${h.toFixed(1)}" rx="3"></rect>`;
    }).join("");
    const dots = period.map((night, i) => `<circle class="score-dot" cx="${pointX(i).toFixed(1)}" cy="${scoreY(night.score).toFixed(1)}" r="4"></circle>`).join("");
    const hits = period.map((night, i) => `<rect class="trend-hit" data-night-key="${night.key}" data-tip-title="${this._esc(this._dateLabel(night.stop, true))}" data-tip-body="${this._esc(`${this._mins(night.sleepTotal)} · ${this._t("score_short")} ${night.score}`)}" x="${(slot * i).toFixed(1)}" y="0" width="${slot.toFixed(1)}" height="${H}"></rect>`).join("");
    const first = period[0];
    const mid = period[Math.floor((period.length - 1) / 2)];
    const last = period[period.length - 1];
    const metric = this._trendMetric === "score" ? "score" : "sleep";

    return `
      <div class="period-data-count">${this._dataNightsLabel(period.length)}</div>
      ${summary}
      <div class="trend-mode-switch">
        <button class="trend-mode ${metric === "sleep" ? "active" : ""}" data-trend-metric="sleep">${this._t("trend_sleep")}</button>
        <button class="trend-mode ${metric === "score" ? "active" : ""}" data-trend-metric="score">${this._t("trend_score")}</button>
      </div>
      <div class="history-hint">${this._t("taps_hint")}</div>
      <div class="period-interactive trend-wrap">
        <svg class="trend-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
          <g class="sleep-series ${metric === "sleep" ? "active-series" : "hidden-series"}">${rects}</g>
          <g class="score-series ${metric === "score" ? "active-series" : "hidden-series"}">
            <polyline class="score-line" points="${points}"></polyline>
            ${dots}
          </g>
          ${hits}
        </svg>
        <div class="trend-labels"><span>${this._dateLabel(first.stop)}</span><span>${this._dateLabel(mid.stop)}</span><span>${this._dateLabel(last.stop)}</span></div>
        <div class="period-tooltip"><strong></strong><span></span></div>
      </div>`;
  }

  _setupViewControls() {
    for (const button of this.querySelectorAll?.(".view-tab") || []) {
      button.addEventListener("click", () => {
        const view = button.dataset.view;
        if (!view) return;
        this._view = view;
        if (view === "night") this._detailNightKey = null;
        this.render();
      });
    }

    for (const target of this.querySelectorAll?.("[data-night-key]") || []) {
      target.addEventListener("click", () => {
        this._detailNightKey = target.dataset.nightKey || null;
        this._view = "night";
        this.render();
      });
    }

    for (const button of this.querySelectorAll?.(".trend-mode") || []) {
      button.addEventListener("click", () => {
        this._trendMetric = button.dataset.trendMetric === "score" ? "score" : "sleep";
        this.render();
      });
    }

    const periodTooltip = this.querySelector?.(".period-tooltip");
    if (periodTooltip) {
      let tooltipTimer = null;
      const titleEl = periodTooltip.querySelector?.("strong");
      const bodyEl = periodTooltip.querySelector?.("span");
      const hide = (delay = 0) => {
        if (tooltipTimer) clearTimeout(tooltipTimer);
        const apply = () => periodTooltip.classList.remove("visible");
        if (delay) tooltipTimer = setTimeout(apply, delay); else apply();
      };
      const show = (target, event) => {
        if (!target?.dataset?.tipTitle) return;
        if (tooltipTimer) clearTimeout(tooltipTimer);
        if (titleEl) titleEl.textContent = target.dataset.tipTitle || "";
        if (bodyEl) bodyEl.textContent = target.dataset.tipBody || "";
        const vw = window.innerWidth || 1000;
        const vh = window.innerHeight || 800;
        const left = Math.max(8, Math.min(vw - 210, (event?.clientX || 0) + 12));
        const top = Math.max(8, Math.min(vh - 90, (event?.clientY || 0) - 54));
        periodTooltip.style.left = `${left}px`;
        periodTooltip.style.top = `${top}px`;
        periodTooltip.classList.add("visible");
      };
      for (const target of this.querySelectorAll?.("[data-tip-title]") || []) {
        target.addEventListener("pointerenter", (event) => { if (event.pointerType === "mouse") show(target, event); });
        target.addEventListener("pointermove", (event) => { if (event.pointerType === "mouse") show(target, event); });
        target.addEventListener("pointerleave", (event) => { if (event.pointerType === "mouse") hide(); });
        target.addEventListener("pointerdown", (event) => show(target, event));
        target.addEventListener("pointerup", () => hide(1600));
        target.addEventListener("pointercancel", () => hide(300));
      }
    }

    const today = this.querySelector?.(".today-button");
    if (today) today.addEventListener("click", () => {
      this._detailNightKey = null;
      this._view = "night";
      this.render();
    });

    const retry = this.querySelector?.(".retry-history");
    if (retry) retry.addEventListener("click", () => {
      const days = this._view === "30d" ? 30 : 7;
      this._historyLoadedDays = 0;
      this._historyError = null;
      this._ensureHistory(days);
      this.render();
    });
  }

  _renderPeriodCard(stateObj, days) {
    const requiredDays = days;
    if ((this._historyLoadedDays || 0) < requiredDays && !this._historyLoading && !this._historyError) {
      this._ensureHistory(requiredDays);
    }
    const allNights = this._historyToNights(this._historyRecords || [], stateObj);
    const period = this._periodNights(allNights, days);
    const title = this.config.title || this._t("title");
    let content;
    if (this._historyLoading && (this._historyLoadedDays || 0) < requiredDays) {
      content = `<div class="history-status"><ha-icon icon="mdi:loading" class="spin"></ha-icon><span>${this._t("history_loading")}</span></div>`;
    } else if (this._historyError && (this._historyLoadedDays || 0) < requiredDays) {
      content = `<div class="history-status error-status"><span>${this._t("history_error")}</span><button class="retry-history">${this._t("retry")}</button></div>`;
    } else {
      content = this._renderPeriodContent(days, period);
    }

    this.innerHTML = `
      <style>
        :host { --sleep-deep:#7657ef; --sleep-light:#4c98f1; --sleep-rem:#2cc7b7; --sleep-wake:#f3a33a; }
        ha-card { padding:18px; overflow:hidden; border-radius:var(--ha-card-border-radius,16px); }
        .header { display:flex; align-items:center; gap:10px; margin-bottom:12px; }
        .icon-wrap { width:38px; height:38px; border-radius:50%; display:grid; place-items:center; background:color-mix(in srgb,var(--sleep-deep) 14%,transparent); }
        .icon-wrap ha-icon { color:var(--sleep-deep); --mdc-icon-size:23px; }
        .title { font-size:21px; font-weight:700; color:var(--primary-text-color); }
        .view-tabs { display:grid; grid-template-columns:repeat(3,1fr); gap:5px; padding:4px; margin:0 0 18px; border-radius:12px; background:color-mix(in srgb,var(--primary-text-color) 6%,transparent); }
        .view-tab { appearance:none; border:0; border-radius:9px; padding:8px 6px; color:var(--secondary-text-color); background:transparent; font:inherit; font-size:12px; font-weight:650; cursor:pointer; }
        .view-tab.active { background:var(--ha-card-background,var(--card-background-color)); color:var(--sleep-deep); box-shadow:0 1px 5px rgba(0,0,0,.12); }
        .history-status { min-height:220px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:10px; color:var(--secondary-text-color); font-size:13px; }
        .history-status .spin { animation:spin 1s linear infinite; color:var(--sleep-deep); }
        @keyframes spin { to { transform:rotate(360deg); } }
        .retry-history { border:0; border-radius:10px; padding:8px 14px; background:color-mix(in srgb,var(--sleep-deep) 16%,transparent); color:var(--sleep-deep); font-weight:700; cursor:pointer; }
        .period-summary { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:8px; margin-bottom:14px; }
        .period-stat { min-width:0; padding:10px; border-radius:12px; background:color-mix(in srgb,var(--primary-text-color) 5%,transparent); }
        .period-stat-value { font-size:16px; line-height:1.1; font-weight:750; color:var(--primary-text-color); white-space:nowrap; }
        .period-stat-label { margin-top:6px; font-size:10px; line-height:1.25; color:var(--secondary-text-color); }
        .period-data-count { margin:-4px 0 10px; color:var(--secondary-text-color); font-size:11px; text-align:right; }
        .trend-mode-switch { display:flex; justify-content:center; gap:5px; margin:2px auto 8px; width:max-content; padding:3px; border-radius:10px; background:color-mix(in srgb,var(--primary-text-color) 6%,transparent); }
        .trend-mode { appearance:none; border:0; border-radius:8px; padding:6px 14px; color:var(--secondary-text-color); background:transparent; font:inherit; font-size:11px; font-weight:700; cursor:pointer; }
        .trend-mode.active { background:var(--ha-card-background,var(--card-background-color)); color:var(--sleep-deep); box-shadow:0 1px 4px rgba(0,0,0,.1); }
        .history-hint { margin:4px 0 8px; text-align:right; color:var(--secondary-text-color); font-size:10px; }
        .period-interactive { position:relative; }
        .period-tooltip { position:fixed; z-index:10000; min-width:120px; max-width:210px; padding:9px 11px; border-radius:10px; opacity:0; pointer-events:none; transform:translateY(4px); transition:opacity .12s ease,transform .12s ease; background:color-mix(in srgb,var(--ha-card-background,var(--card-background-color)) 94%,var(--primary-text-color) 6%); box-shadow:0 5px 20px rgba(0,0,0,.22); border:1px solid color-mix(in srgb,var(--secondary-text-color) 18%,transparent); }
        .period-tooltip.visible { opacity:1; transform:translateY(0); }
        .period-tooltip strong,.period-tooltip span { display:block; }
        .period-tooltip strong { font-size:12px; color:var(--primary-text-color); }
        .period-tooltip span { margin-top:4px; font-size:11px; color:var(--secondary-text-color); }
        .history-bars { display:flex; align-items:stretch; gap:8px; height:252px; padding-top:6px; }
        .history-day { appearance:none; border:0; background:transparent; padding:0; flex:1 1 0; min-width:0; display:grid; grid-template-rows:24px 1fr 22px 20px; align-items:end; color:inherit; cursor:pointer; -webkit-tap-highlight-color:transparent; }
        .history-day.empty { cursor:default; opacity:.48; }
        .history-score { align-self:start; justify-self:center; padding:3px 6px; border-radius:8px; font-size:11px; font-weight:750; color:var(--sleep-deep); background:color-mix(in srgb,var(--sleep-deep) 12%,transparent); }
        .history-bar-shell { height:100%; display:flex; align-items:flex-end; justify-content:center; padding:4px 0; }
        .history-column { width:min(28px,60%); min-height:4px; border-radius:8px; overflow:hidden; display:flex; flex-direction:column; justify-content:flex-end; box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--secondary-text-color) 12%,transparent); }
        .history-segment { display:block; width:100%; min-height:2px; touch-action:manipulation; }
        .history-column.empty { height:12%; min-height:18px; background:color-mix(in srgb,var(--secondary-text-color) 5%,transparent); border:1px dashed color-mix(in srgb,var(--secondary-text-color) 28%,transparent); box-shadow:none; }
        .history-segment.deep { background:var(--sleep-deep); } .history-segment.light { background:var(--sleep-light); } .history-segment.rem { background:var(--sleep-rem); } .history-segment.wake { background:var(--sleep-wake); }
        .history-duration { justify-self:center; font-size:10px; font-weight:650; color:var(--primary-text-color); white-space:nowrap; }
        .history-date { justify-self:center; font-size:10px; color:var(--secondary-text-color); white-space:nowrap; }
        .trend-wrap { margin-top:4px; }
        .trend-svg { width:100%; height:200px; display:block; overflow:visible; }
        .duration-bar { fill:color-mix(in srgb,var(--sleep-deep) 24%,transparent); }
        .score-line { fill:none; stroke:var(--sleep-deep); stroke-width:4; vector-effect:non-scaling-stroke; stroke-linejoin:round; stroke-linecap:round; }
        .score-dot { fill:var(--sleep-deep); stroke:var(--ha-card-background,var(--card-background-color)); stroke-width:2; vector-effect:non-scaling-stroke; }
        .trend-hit { fill:transparent; cursor:pointer; touch-action:manipulation; pointer-events:all; }
        .hidden-series { opacity:0; pointer-events:none; }
        .active-series { opacity:1; }
        .trend-labels { display:flex; justify-content:space-between; color:var(--secondary-text-color); font-size:10px; margin-top:4px; }
        .history-empty { min-height:180px; display:grid; place-items:center; color:var(--secondary-text-color); font-size:13px; }
        .deep-text { color:var(--sleep-deep); } .rem-text { color:var(--sleep-rem); } .wake-text { color:var(--sleep-wake); }
        @media (max-width:560px) { ha-card{padding:15px 13px}.period-summary{grid-template-columns:repeat(2,minmax(0,1fr))}.history-bars{gap:4px;height:230px}.history-column{width:min(24px,70%)}.trend-svg{height:170px} }
      </style>
      <ha-card>
        <div class="header"><div class="icon-wrap"><ha-icon icon="mdi:weather-night"></ha-icon></div><div class="title">${this._esc(title)}</div></div>
        ${this._viewTabsHtml()}
        ${content}
      </ha-card>`;
    this._setupViewControls();
  }

  _stageAtTime(stages, timestamp) {
    if (!Array.isArray(stages) || !Number.isFinite(timestamp)) return null;

    let nearest = null;
    let nearestDistance = Infinity;

    for (const stage of stages) {
      const start = stage.start instanceof Date ? stage.start.getTime() : new Date(stage.start).getTime();
      const stop = stage.stop instanceof Date ? stage.stop.getTime() : new Date(stage.stop).getTime();
      if (!Number.isFinite(start) || !Number.isFinite(stop)) continue;

      if (timestamp >= start && timestamp <= stop) return stage;

      const distance = timestamp < start ? start - timestamp : timestamp - stop;
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = stage;
      }
    }

    // Amazfit stages are minute buckets and often leave a one-minute gap
    // between stop and the next start. Treat tiny gaps as continuous.
    return nearestDistance <= 90 * 1000 ? nearest : null;
  }

  _setupInteraction(stages, nightStart, nightStop, stageInfo, rowY, graphW, graphH) {
    const plot = this.querySelector?.(".plot-area");
    if (!plot) return;

    const layer = plot.querySelector(".interaction-layer");
    const svg = plot.querySelector("svg.plot");
    const marker = plot.querySelector(".hover-marker");
    const dot = plot.querySelector(".hover-dot");
    const tooltip = plot.querySelector(".sleep-tooltip");
    const tooltipStage = plot.querySelector(".tooltip-stage");
    const tooltipCursor = plot.querySelector(".tooltip-cursor");
    const tooltipRange = plot.querySelector(".tooltip-range");
    const tickEls = [...(this.querySelectorAll?.(".xaxis .tick") || [])];
    if (!layer || !svg || !marker || !dot || !tooltip || !tooltipStage || !tooltipCursor || !tooltipRange) return;

    const startMs = nightStart.getTime();
    const stopMs = nightStop.getTime();
    const totalMs = Math.max(1, stopMs - startMs);
    const maxScale = 8;
    const viewport = this._sleepViewport || (this._sleepViewport = { key: null, scale: 1, start: 0 });
    const pointers = new Map();
    let mode = null; // inspect | pan | pinch
    let activePointerId = null;
    let pointerStartX = 0;
    let pointerMoved = false;
    let panStart = 0;
    let panSpan = 1;
    let pinchStartDistance = 0;
    let pinchStartScale = 1;
    let pinchFocalData = 0.5;
    let hideTimer = null;
    let lastTapAt = 0;
    let lastTapX = 0;

    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
    const localFraction = (clientX) => {
      const rect = plot.getBoundingClientRect();
      if (!rect.width) return 0;
      return clamp((clientX - rect.left) / rect.width, 0, 1);
    };
    const normalizeViewport = () => {
      viewport.scale = clamp(Number(viewport.scale) || 1, 1, maxScale);
      const span = 1 / viewport.scale;
      viewport.start = clamp(Number(viewport.start) || 0, 0, Math.max(0, 1 - span));
      return span;
    };
    const updateTicks = () => {
      const span = normalizeViewport();
      tickEls.forEach((el, index) => {
        const fraction = viewport.start + span * (index / Math.max(1, tickEls.length - 1));
        el.textContent = this._time(new Date(startMs + totalMs * fraction));
      });
    };
    const applyViewport = () => {
      const span = normalizeViewport();
      if (viewport.scale === 1 && viewport.start === 0) {
        svg.setAttribute("viewBox", `0 0 ${graphW} ${graphH}`);
      } else {
        svg.setAttribute("viewBox", `${(viewport.start * graphW).toFixed(3)} 0 ${(span * graphW).toFixed(3)} ${graphH}`);
      }
      layer.dataset.zoomed = viewport.scale > 1.001 ? "true" : "false";
      layer.style.cursor = viewport.scale > 1.001 ? (mode === "pan" ? "grabbing" : "grab") : "crosshair";
      updateTicks();
    };
    const resetViewport = () => {
      viewport.scale = 1;
      viewport.start = 0;
      applyViewport();
    };
    const zoomAt = (clientX, nextScale) => {
      const local = localFraction(clientX);
      const oldSpan = normalizeViewport();
      const focal = viewport.start + local * oldSpan;
      viewport.scale = clamp(nextScale, 1, maxScale);
      const newSpan = 1 / viewport.scale;
      viewport.start = focal - local * newSpan;
      applyViewport();
    };

    const cancelHide = () => {
      if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
    };
    const hide = (delay = 0) => {
      cancelHide();
      const apply = () => {
        marker.classList.remove("visible");
        dot.classList.remove("visible");
        tooltip.classList.remove("visible");
      };
      if (delay > 0) hideTimer = setTimeout(apply, delay);
      else apply();
    };
    const showAt = (clientX) => {
      cancelHide();
      const rect = plot.getBoundingClientRect();
      if (!rect.width) return;
      const local = localFraction(clientX);
      const span = normalizeViewport();
      const dataFraction = viewport.start + local * span;
      const timestamp = startMs + totalMs * dataFraction;
      const stage = this._stageAtTime(stages, timestamp);
      const exactTime = new Date(timestamp);
      const xPct = local * 100;

      marker.style.left = `${xPct}%`;
      marker.classList.add("visible");
      tooltipCursor.textContent = `${this._t("cursor_time")}: ${this._time(exactTime)}`;
      tooltip.style.left = `${xPct}%`;
      tooltip.classList.remove("edge-left", "edge-right", "deep", "light", "rem", "wake");
      if (local < 0.18) tooltip.classList.add("edge-left");
      else if (local > 0.82) tooltip.classList.add("edge-right");

      if (stage) {
        const info = stageInfo[stage.phase];
        tooltip.classList.add(info.cls);
        tooltipStage.textContent = this._t(info.nameKey);
        tooltipRange.textContent = `${this._time(stage.start)}–${this._time(stage.stop)} · ${this._mins(stage.duration)}`;
        const yPct = (rowY[info.row] / graphH) * 100;
        dot.style.left = `${xPct}%`;
        dot.style.top = `${yPct}%`;
        dot.className = `hover-dot visible ${info.cls}`;
        requestAnimationFrame(() => {
          const tooltipHeight = tooltip.offsetHeight || 66;
          const stageY = rect.height * (rowY[info.row] / graphH);
          let top = stageY - tooltipHeight - 13;
          if (top < 4) top = stageY + 13;
          top = Math.max(4, Math.min(rect.height - tooltipHeight - 4, top));
          tooltip.style.top = `${top}px`;
        });
      } else {
        tooltipStage.textContent = this._t("no_stage");
        tooltipRange.textContent = "";
        dot.classList.remove("visible");
        tooltip.style.top = "8px";
      }
      tooltip.classList.add("visible");
    };

    const pointerDistance = () => {
      const values = [...pointers.values()];
      if (values.length < 2) return 0;
      return Math.hypot(values[0].x - values[1].x, values[0].y - values[1].y);
    };
    const pointerMidX = () => {
      const values = [...pointers.values()];
      return values.length >= 2 ? (values[0].x + values[1].x) / 2 : (values[0]?.x || 0);
    };
    const beginPinch = () => {
      if (pointers.size < 2) return;
      mode = "pinch";
      hide();
      pinchStartDistance = Math.max(1, pointerDistance());
      pinchStartScale = viewport.scale;
      const span = normalizeViewport();
      pinchFocalData = viewport.start + localFraction(pointerMidX()) * span;
    };
    const beginPan = (event) => {
      mode = "pan";
      activePointerId = event.pointerId;
      pointerStartX = event.clientX;
      pointerMoved = false;
      panStart = viewport.start;
      panSpan = 1 / viewport.scale;
      hide();
      applyViewport();
    };

    layer.addEventListener("wheel", (event) => {
      event.preventDefault();
      const factor = Math.exp(-event.deltaY * 0.002);
      zoomAt(event.clientX, viewport.scale * factor);
      hide();
    }, { passive: false });

    layer.addEventListener("dblclick", (event) => {
      event.preventDefault();
      resetViewport();
      hide();
    });

    layer.addEventListener("pointerdown", (event) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      try { layer.setPointerCapture?.(event.pointerId); } catch (_) {}
      if (event.pointerType === "touch") {
        pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
        if (pointers.size >= 2) { beginPinch(); return; }
      }
      if (viewport.scale > 1.001) beginPan(event);
      else {
        mode = "inspect";
        activePointerId = event.pointerId;
        pointerStartX = event.clientX;
        pointerMoved = false;
        showAt(event.clientX);
      }
    });

    layer.addEventListener("pointermove", (event) => {
      if (event.pointerType === "touch" && pointers.has(event.pointerId)) {
        pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      }
      if (mode === "pinch" && pointers.size >= 2) {
        event.preventDefault();
        const distance = Math.max(1, pointerDistance());
        viewport.scale = clamp(pinchStartScale * (distance / pinchStartDistance), 1, maxScale);
        const span = 1 / viewport.scale;
        viewport.start = pinchFocalData - localFraction(pointerMidX()) * span;
        applyViewport();
        return;
      }
      if (mode === "pan" && event.pointerId === activePointerId) {
        event.preventDefault();
        const rect = plot.getBoundingClientRect();
        const dx = event.clientX - pointerStartX;
        if (Math.abs(dx) > 4) pointerMoved = true;
        viewport.start = panStart - (dx / Math.max(1, rect.width)) * panSpan;
        applyViewport();
        return;
      }
      if (mode === "inspect" && event.pointerId === activePointerId) {
        if (Math.abs(event.clientX - pointerStartX) > 4) pointerMoved = true;
        showAt(event.clientX);
        return;
      }
      if (event.pointerType === "mouse" && mode == null) showAt(event.clientX);
    });

    const finishPointer = (event, cancelled = false) => {
      const previousMode = mode;
      if (event.pointerType === "touch") pointers.delete(event.pointerId);
      try { layer.releasePointerCapture?.(event.pointerId); } catch (_) {}

      if (previousMode === "pinch") {
        if (pointers.size >= 2) beginPinch();
        else if (pointers.size === 1 && viewport.scale > 1.001) {
          const [id, point] = pointers.entries().next().value;
          mode = "pan";
          activePointerId = id;
          pointerStartX = point.x;
          pointerMoved = false;
          panStart = viewport.start;
          panSpan = 1 / viewport.scale;
        } else mode = null;
        return;
      }

      if (event.pointerId !== activePointerId) return;
      const wasTap = !pointerMoved && !cancelled;
      mode = null;
      activePointerId = null;
      applyViewport();
      if (cancelled) { hide(300); return; }

      if (wasTap && event.pointerType === "touch") {
        const now = Date.now();
        if (now - lastTapAt < 350 && Math.abs(event.clientX - lastTapX) < 32) {
          resetViewport();
          lastTapAt = 0;
          hide();
          return;
        }
        lastTapAt = now;
        lastTapX = event.clientX;
      }
      if (wasTap || previousMode === "inspect") showAt(event.clientX);
      hide(1600);
    };

    layer.addEventListener("pointerup", (event) => finishPointer(event, false));
    layer.addEventListener("pointercancel", (event) => finishPointer(event, true));
    layer.addEventListener("pointerleave", (event) => {
      if (event.pointerType === "mouse" && mode == null) hide();
    });

    applyViewport();
  }

  render() {
    if (!this._hass || !this.config) return;

    const stateObj = this._hass.states[this.config.entity];
    if (!stateObj) {
      this.innerHTML = `<ha-card><div style="padding:16px">${this._t("entity_missing")}: ${this._esc(this.config.entity)}</div></ha-card>`;
      return;
    }

    if (this._view === "7d" && this.config.show_7d !== false) {
      this._renderPeriodCard(stateObj, 7);
      return;
    }
    if (this._view === "30d" && this.config.show_30d !== false) {
      this._renderPeriodCard(stateObj, 30);
      return;
    }

    const allNights = this._historyToNights(this._historyRecords || [], stateObj);
    const currentNight = this._buildNight(stateObj.state, stateObj.attributes || {}, Date.parse(stateObj.last_updated || stateObj.last_changed || "") || 0);
    let detailNight = this._detailNightKey ? allNights.find(n => n.key === this._detailNightKey) : currentNight;
    if (!detailNight) detailNight = currentNight || allNights[allNights.length - 1] || null;

    const raw = detailNight?.stages || (Array.isArray(stateObj.attributes.stages) ? stateObj.attributes.stages : []);

    const stageInfo = {
      WAKE_STAGE:  { row: 0, nameKey: "wake",  shortKey: "wake_short", cls: "wake" },
      REM_STAGE:   { row: 1, nameKey: "rem",   shortKey: "rem",        cls: "rem" },
      LIGHT_STAGE: { row: 2, nameKey: "light", shortKey: "light",      cls: "light" },
      DEEP_STAGE:  { row: 3, nameKey: "deep",  shortKey: "deep",       cls: "deep" },
    };

    const stages = raw
      .filter(s => stageInfo[s.phase])
      .map(s => {
        const start = new Date(s.start);
        const stop = new Date(s.stop);
        let duration = Number(s.duration_min);
        if (!Number.isFinite(duration)) duration = Math.max(0, (stop - start) / 60000);
        return { ...s, start, stop, duration };
      })
      .filter(s => !Number.isNaN(s.start.getTime()) && !Number.isNaN(s.stop.getTime()) && s.stop >= s.start);

    if (!stages.length) {
      this.innerHTML = `<ha-card><div style="padding:16px">${this._t("no_stages")}</div></ha-card>`;
      return;
    }

    const nightStart = new Date(Math.min(...stages.map(s => s.start.getTime())));
    const nightStop = new Date(Math.max(...stages.map(s => s.stop.getTime())));
    const totalRange = Math.max(1, nightStop - nightStart);
    const viewportKey = `${this.config.entity || ""}:${detailNight?.key || nightStart.toISOString()}`;
    if (!this._sleepViewport || this._sleepViewport.key !== viewportKey) {
      this._sleepViewport = { key: viewportKey, scale: 1, start: 0 };
    }

    const totals = {
      DEEP_STAGE: 0,
      LIGHT_STAGE: 0,
      REM_STAGE: 0,
      WAKE_STAGE: 0,
    };

    stages.forEach(s => totals[s.phase] += s.duration);
    Object.keys(totals).forEach(k => totals[k] = Math.round(totals[k]));

    const isCurrentDetail = !this._detailNightKey && currentNight && detailNight?.key === currentNight.key;
    const companion = isCurrentDetail ? this._currentCompanionSummary() : null;
    const displayTotals = { ...totals };
    if (companion) {
      if (Number.isFinite(companion.deep)) displayTotals.DEEP_STAGE = companion.deep;
      if (Number.isFinite(companion.light)) displayTotals.LIGHT_STAGE = companion.light;
      if (Number.isFinite(companion.rem)) displayTotals.REM_STAGE = companion.rem;
      if (Number.isFinite(companion.awake)) displayTotals.WAKE_STAGE = companion.awake;
    }
    const stageSleepTotal = displayTotals.DEEP_STAGE + displayTotals.LIGHT_STAGE + displayTotals.REM_STAGE;
    const sleepTotal = Number.isFinite(companion?.sleepTotal) ? companion.sleepTotal : stageSleepTotal;
    const pct = m => stageSleepTotal > 0 ? Math.round((m / stageSleepTotal) * 100) : 0;
    const wakeEvents = detailNight?.wakeEvents ?? stages.filter(stage => stage.phase === "WAKE_STAGE").length;

    const W = 1000;
    const H = 210;
    const padY = 14;
    const usableH = H - padY * 2;
    const rowY = [0,1,2,3].map(i => padY + i * usableH / 3);
    const x = d => ((d - nightStart) / totalRange) * W;

    const segments = [];
    const connectors = [];

    stages.forEach((s, i) => {
      const info = stageInfo[s.phase];
      const sx = x(s.start);
      const ex = x(s.stop);
      const sy = rowY[info.row];

      segments.push(`
        <line class="stage ${info.cls}"
          x1="${sx.toFixed(2)}" y1="${sy.toFixed(2)}"
          x2="${ex.toFixed(2)}" y2="${sy.toFixed(2)}">
          <title>${this._t(info.nameKey)}: ${this._time(s.start)}–${this._time(s.stop)} · ${this._mins(s.duration)}</title>
        </line>
      `);

      if (i > 0) {
        const prev = stages[i - 1];
        const pInfo = stageInfo[prev.phase];
        const py = rowY[pInfo.row];
        const midY = (py + sy) / 2;

        connectors.push(`
          <line class="connector ${pInfo.cls}"
            x1="${sx.toFixed(2)}" y1="${py.toFixed(2)}"
            x2="${sx.toFixed(2)}" y2="${midY.toFixed(2)}" />
          <line class="connector ${info.cls}"
            x1="${sx.toFixed(2)}" y1="${midY.toFixed(2)}"
            x2="${sx.toFixed(2)}" y2="${sy.toFixed(2)}" />
        `);
      }
    });

    const ticks = Array.from({ length: 5 }, (_, i) => {
      const t = new Date(nightStart.getTime() + totalRange * i / 4);
      return {
        left: i * 25,
        label: this._time(t),
        edge: i === 0 ? "first" : i === 4 ? "last" : "",
      };
    });

    const selectedScore = detailNight?.score ?? stateObj.state;
    const scoreRaw = Number(selectedScore);
    const score = Number.isFinite(scoreRaw) ? Math.round(scoreRaw) : selectedScore;
    const scorePercent = Number.isFinite(scoreRaw)
      ? Math.max(0, Math.min(100, scoreRaw))
      : 0;

    const metrics = [
      ["DEEP_STAGE", "deep"],
      ["LIGHT_STAGE", "light"],
      ["REM_STAGE", "rem"],
      ["WAKE_STAGE", "wake"],
    ].map(([key, labelKey]) => {
      const isWake = key === "WAKE_STAGE";
      const percent = isWake
        ? (displayTotals[key] > 0 ? "<1%" : "0%")
        : `${pct(displayTotals[key])}%`;

      return `
        <div class="metric">
          <div class="metric-head">
            <span class="dot ${stageInfo[key].cls}"></span>
            <span>${this._t(labelKey)}</span>
          </div>
          <div class="metric-value">${this._mins(displayTotals[key])}</div>
          ${isWake ? `<div class="metric-events wake-text">${this._wakeEventsLabel(wakeEvents)}</div>` : ""}
          ${this.config.show_percentages ? `<div class="metric-pct ${stageInfo[key].cls}-text">${percent}</div>` : ""}
        </div>
      `;
    }).join("");

    const quality = this._quality(scoreRaw);
    const title = this.config.title || this._t("title");
    const napSummary = detailNight?.napSummary || { count: 0, totalMinutes: 0 };
    const detailDate = detailNight ? this._dateLabel(detailNight.stop, true) : "";

    this.innerHTML = `
      <style>
        :host {
          --sleep-deep: #7657ef;
          --sleep-light: #4c98f1;
          --sleep-rem: #2cc7b7;
          --sleep-wake: #f3a33a;
        }

        ha-card {
          padding: 18px 18px 16px;
          overflow: hidden;
          border-radius: var(--ha-card-border-radius, 16px);
        }

        .header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 14px;
        }

        .icon-wrap {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          background: color-mix(in srgb, var(--sleep-deep) 14%, transparent);
        }

        .icon-wrap ha-icon {
          color: var(--sleep-deep);
          --mdc-icon-size: 23px;
        }

        .title {
          font-size: 21px;
          font-weight: 700;
          color: var(--primary-text-color);
        }

        .view-tabs {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 5px;
          padding: 4px;
          margin: 0 0 15px;
          border-radius: 12px;
          background: color-mix(in srgb, var(--primary-text-color) 6%, transparent);
        }

        .view-tab {
          appearance: none;
          border: 0;
          border-radius: 9px;
          padding: 8px 6px;
          color: var(--secondary-text-color);
          background: transparent;
          font: inherit;
          font-size: 12px;
          font-weight: 650;
          cursor: pointer;
        }

        .view-tab.active {
          background: var(--ha-card-background, var(--card-background-color));
          color: var(--sleep-deep);
          box-shadow: 0 1px 5px rgba(0,0,0,.12);
        }

        .detail-date-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin: -4px 0 12px;
          color: var(--secondary-text-color);
          font-size: 11px;
        }

        .today-button {
          appearance: none;
          border: 0;
          border-radius: 9px;
          padding: 6px 10px;
          background: color-mix(in srgb, var(--sleep-deep) 12%, transparent);
          color: var(--sleep-deep);
          font: inherit;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
        }

        .nap-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          margin-top: 8px;
          padding: 5px 8px;
          border-radius: 9px;
          background: color-mix(in srgb, var(--sleep-rem) 10%, transparent);
          color: var(--sleep-rem);
          font-size: 11px;
          font-weight: 650;
        }

        .hero {
          display: grid;
          grid-template-columns: 126px 1fr;
          gap: 22px;
          align-items: center;
          margin: 4px 0 18px;
        }

        .score-ring {
          width: 116px;
          height: 116px;
          position: relative;
          border-radius: 50%;
          display: grid;
          place-items: center;
          background:
            conic-gradient(
              var(--sleep-deep) calc(var(--score) * 1%),
              color-mix(in srgb, var(--primary-text-color) 10%, transparent) 0
            );
        }

        .score-ring::after {
          content: "";
          position: absolute;
          inset: 7px;
          border-radius: 50%;
          background: var(--ha-card-background, var(--card-background-color));
        }

        .score-inner {
          position: relative;
          z-index: 1;
          text-align: center;
        }

        .score-number {
          font-size: 37px;
          line-height: 1;
          font-weight: 760;
          color: var(--primary-text-color);
        }

        .score-label {
          margin-top: 4px;
          font-size: 12px;
          color: var(--secondary-text-color);
        }

        .duration {
          font-size: 31px;
          line-height: 1;
          font-weight: 720;
          color: var(--primary-text-color);
        }

        .duration-label {
          margin-top: 7px;
          font-size: 13px;
          color: var(--secondary-text-color);
        }

        .range {
          margin-top: 9px;
          font-size: 17px;
          font-weight: 650;
          color: var(--sleep-deep);
        }

        .quality {
          margin-top: 7px;
          font-size: 12px;
          font-weight: 600;
          color: var(--secondary-text-color);
        }

        .chart {
          display: grid;
          grid-template-columns: 84px minmax(0,1fr);
          gap: 12px;
          margin-top: 8px;
        }

        .ylabels {
          height: ${Number(this.config.chart_height)}px;
          display: grid;
          grid-template-rows: repeat(4,1fr);
          align-items: center;
        }

        .ylabel {
          font-size: 12px;
          white-space: nowrap;
        }

        .wake-text { color: var(--sleep-wake); }
        .rem-text { color: var(--sleep-rem); }
        .light-text { color: var(--sleep-light); }
        .deep-text { color: var(--sleep-deep); }

        .plot-area {
          height: ${Number(this.config.chart_height)}px;
          position: relative;
          min-width: 0;
        }

        .interaction-layer {
          position: absolute;
          inset: 0;
          z-index: 8;
          cursor: crosshair;
          touch-action: none;
          -webkit-tap-highlight-color: transparent;
        }

        .hover-marker {
          position: absolute;
          top: 0;
          bottom: 0;
          z-index: 5;
          width: 1px;
          opacity: 0;
          pointer-events: none;
          background: color-mix(in srgb, var(--primary-text-color) 44%, transparent);
          transform: translateX(-0.5px);
          transition: opacity .12s ease;
        }

        .hover-marker.visible { opacity: 1; }

        .hover-dot {
          position: absolute;
          z-index: 7;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          opacity: 0;
          pointer-events: none;
          transform: translate(-50%, -50%);
          border: 2px solid var(--ha-card-background, var(--card-background-color));
          box-shadow: 0 1px 4px rgba(0,0,0,.22);
          transition: opacity .1s ease;
        }

        .hover-dot.visible { opacity: 1; }
        .hover-dot.deep { background: var(--sleep-deep); }
        .hover-dot.light { background: var(--sleep-light); }
        .hover-dot.rem { background: var(--sleep-rem); }
        .hover-dot.wake { background: var(--sleep-wake); }

        .sleep-tooltip {
          position: absolute;
          z-index: 10;
          min-width: 132px;
          max-width: 190px;
          padding: 9px 11px;
          opacity: 0;
          pointer-events: none;
          border-radius: 11px;
          border: 1px solid color-mix(in srgb, var(--primary-text-color) 13%, transparent);
          background: color-mix(in srgb, var(--ha-card-background, var(--card-background-color)) 94%, transparent);
          box-shadow: 0 5px 18px rgba(0,0,0,.20);
          backdrop-filter: blur(8px);
          transform: translateX(-50%);
          transition: opacity .12s ease;
        }

        .sleep-tooltip.visible { opacity: 1; }
        .sleep-tooltip.edge-left { transform: translateX(4px); }
        .sleep-tooltip.edge-right { transform: translateX(calc(-100% - 4px)); }

        .tooltip-stage {
          font-size: 13px;
          line-height: 1.2;
          font-weight: 750;
        }
        .sleep-tooltip.deep .tooltip-stage { color: var(--sleep-deep); }
        .sleep-tooltip.light .tooltip-stage { color: var(--sleep-light); }
        .sleep-tooltip.rem .tooltip-stage { color: var(--sleep-rem); }
        .sleep-tooltip.wake .tooltip-stage { color: var(--sleep-wake); }

        .tooltip-cursor {
          margin-top: 4px;
          color: var(--primary-text-color);
          font-size: 14px;
          font-weight: 700;
        }

        .tooltip-range {
          margin-top: 3px;
          color: var(--secondary-text-color);
          font-size: 11px;
          white-space: nowrap;
        }

        .grid-lines {
          position: absolute;
          inset: 0;
          display: grid;
          grid-template-rows: repeat(4,1fr);
          align-items: center;
          pointer-events: none;
        }

        .grid-line {
          border-top: 1px dashed color-mix(in srgb, var(--secondary-text-color) 18%, transparent);
        }

        svg.plot {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          overflow: hidden;
          clip-path: inset(0);
        }

        .stage,
        .connector {
          vector-effect: non-scaling-stroke;
          stroke-linecap: round;
        }

        .stage {
          stroke-width: 9;
        }

        .connector {
          stroke-width: 4;
        }

        .stage.deep, .connector.deep { stroke: var(--sleep-deep); }
        .stage.light, .connector.light { stroke: var(--sleep-light); }
        .stage.rem, .connector.rem { stroke: var(--sleep-rem); }
        .stage.wake, .connector.wake { stroke: var(--sleep-wake); }

        .xaxis {
          position: relative;
          height: 27px;
          margin-left: 96px;
          border-top: 1px solid color-mix(in srgb, var(--secondary-text-color) 26%, transparent);
        }

        .tick {
          position: absolute;
          top: 7px;
          transform: translateX(-50%);
          font-size: 11px;
          color: var(--secondary-text-color);
          white-space: nowrap;
        }

        .tick.first { transform: none; }
        .tick.last { transform: translateX(-100%); }

        .metrics {
          display: grid;
          grid-template-columns: repeat(4, minmax(0,1fr));
          gap: 10px;
          margin-top: 13px;
          padding-top: 14px;
          border-top: 1px solid color-mix(in srgb, var(--secondary-text-color) 16%, transparent);
        }

        .metric {
          min-width: 0;
          padding: 1px 5px;
        }

        .metric-head {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          color: var(--secondary-text-color);
          white-space: nowrap;
        }

        .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex: 0 0 auto;
        }

        .dot.deep { background: var(--sleep-deep); }
        .dot.light { background: var(--sleep-light); }
        .dot.rem { background: var(--sleep-rem); }
        .dot.wake { background: var(--sleep-wake); }

        .metric-value {
          margin-top: 7px;
          font-size: 15px;
          font-weight: 700;
          line-height: 1.1;
          color: var(--primary-text-color);
          white-space: nowrap;
        }

        .metric-events {
          margin-top: 6px;
          font-size: 10px;
          font-weight: 650;
          white-space: nowrap;
        }

        .metric-pct {
          margin-top: 7px;
          font-size: 13px;
          font-weight: 700;
        }

        @media (max-width: 560px) {
          ha-card { padding: 15px 13px; }

          .hero {
            grid-template-columns: 104px 1fr;
            gap: 14px;
          }

          .score-ring {
            width: 96px;
            height: 96px;
          }

          .score-number { font-size: 31px; }
          .duration { font-size: 26px; }
          .range { font-size: 15px; }

          .chart {
            grid-template-columns: 70px minmax(0,1fr);
            gap: 8px;
          }

          .xaxis { margin-left: 78px; }
          .ylabel { font-size: 10px; }

          .metrics {
            grid-template-columns: repeat(2, minmax(0,1fr));
            row-gap: 14px;
          }
        }
      </style>

      <ha-card>
        <div class="header">
          <div class="icon-wrap">
            <ha-icon icon="mdi:weather-night"></ha-icon>
          </div>
          <div class="title">${this._esc(title)}</div>
        </div>

        ${this._viewTabsHtml()}
        ${this._detailNightKey ? `<div class="detail-date-row"><span>${this._esc(detailDate)}</span><button class="today-button">${this._t("today")}</button></div>` : ""}

        <div class="hero">
          ${this.config.show_score ? `
            <div class="score-ring" style="--score:${scorePercent}">
              <div class="score-inner">
                <div class="score-number">${this._esc(score)}</div>
                <div class="score-label">${this._t("score_unit")}</div>
              </div>
            </div>
          ` : `<div></div>`}

          <div>
            ${this.config.show_summary ? `
              <div class="duration">${this._mins(sleepTotal)}</div>
              <div class="duration-label">${this._t("total_sleep")}</div>
            ` : ""}
            <div class="range">${this._time(nightStart)} – ${this._time(nightStop)}</div>
            ${this.config.show_quality && quality ? `<div class="quality">${quality}</div>` : ""}
            ${this.config.show_naps !== false && napSummary.count ? `<div class="nap-badge"><ha-icon icon="mdi:power-sleep"></ha-icon>${this._t("nap")}: ${napSummary.totalMinutes != null ? this._mins(napSummary.totalMinutes) : napSummary.count}</div>` : ""}
          </div>
        </div>

        <div class="chart">
          <div class="ylabels">
            <div class="ylabel wake-text">${this._t("wake_short")}</div>
            <div class="ylabel rem-text">${this._t("rem")}</div>
            <div class="ylabel light-text">${this._t("light")}</div>
            <div class="ylabel deep-text">${this._t("deep")}</div>
          </div>

          <div class="plot-area">
            <div class="grid-lines">
              <div class="grid-line"></div>
              <div class="grid-line"></div>
              <div class="grid-line"></div>
              <div class="grid-line"></div>
            </div>

            <svg class="plot" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
              ${connectors.join("")}
              ${segments.join("")}
            </svg>

            <div class="hover-marker"></div>
            <div class="hover-dot"></div>
            <div class="sleep-tooltip">
              <div class="tooltip-stage"></div>
              <div class="tooltip-cursor"></div>
              <div class="tooltip-range"></div>
            </div>
            <div class="interaction-layer" aria-label="Interactive sleep timeline"></div>
          </div>
        </div>

        <div class="xaxis">
          ${ticks.map(t => `
            <div class="tick ${t.edge}" style="left:${t.left}%">${t.label}</div>
          `).join("")}
        </div>

        <div class="metrics">
          ${metrics}
        </div>
      </ha-card>
    `;

    this._setupViewControls();
    this._setupInteraction(stages, nightStart, nightStop, stageInfo, rowY, W, H);
  }
}

if (!customElements.get("amazfit-sleep-card")) {
  customElements.define("amazfit-sleep-card", AmazfitSleepCard);
}

window.customCards = window.customCards || [];
if (!window.customCards.some(c => c.type === "amazfit-sleep-card")) {
  window.customCards.push({
    type: "amazfit-sleep-card",
    name: "Amazfit Sleep Card",
    description: "Amazfit / Zepp-style sleep hypnogram",
    preview: true,
  });
}

const Z2H_ACTIVITY_METRIC_SPECS = [
  { key: "steps_entity", uniqueSuffixes: ["steps"], originalNames: ["Steps"] },
  { key: "distance_entity", uniqueSuffixes: ["distance"], originalNames: ["Distance"] },
  { key: "calories_entity", uniqueSuffixes: ["calories"], originalNames: ["Calories"] },
  { key: "fat_burning_entity", uniqueSuffixes: ["fat_burning", "fatburning"], originalNames: ["Fat Burning", "Fat burning"] },
  { key: "stands_entity", uniqueSuffixes: ["stands"], originalNames: ["Stands"] },
];

class AmazfitActivityCard extends HTMLElement {
  setConfig(config) {
    const stepsEntity = config?.steps_entity || config?.entity || "";
    const previous = this.config?.steps_entity || null;
    this.config = {
      title: null,
      language: "auto",
      steps_entity: stepsEntity,
      distance_entity: null,
      calories_entity: null,
      fat_burning_entity: null,
      stands_entity: null,
      target_mode: "entity",
      manual_target: 10000,
      show_distance: true,
      show_calories: true,
      show_fat_burning: true,
      show_stands: true,
      show_7d: true,
      show_30d: true,
      show_hourly_profile: true,
      ...config,
      steps_entity: stepsEntity,
    };
    if (previous !== stepsEntity) {
      this._activityDiscovered = {};
      this._activityDiscoverySeed = null;
      this._activityDiscoveryReady = false;
      this._activityDiscoveryPromise = null;
      this._historyCache = {};
      this._recordCache = {};
      this._recordLoading = null;
      this._hourlyHistoryCache = null;
      this._selectedActivityDay = null;
      this._hourlyHistoryLoading = null;
    }
    this._view = this._view || "today";
    if ((this._view === "7d" && this.config.show_7d === false) || (this._view === "30d" && this.config.show_30d === false)) {
      this._view = "today";
    }
    if (this._hass) this._ensureDiscoveredMetrics();
  }

  set hass(hass) {
    this._hass = hass;
    this.render();
    this._ensureDiscoveredMetrics();
  }

  getCardSize() { return 5; }

  static getConfigElement() {
    return document.createElement("amazfit-activity-card-editor");
  }

  static getStubConfig(hass, entities) {
    const metricSpec = Z2H_ACTIVITY_METRIC_SPECS[0];
    return { steps_entity: z2hFindSeedFromStates(hass, metricSpec, entities) || (Array.isArray(entities) ? entities.find((id) => typeof id === "string" && id.startsWith("sensor.")) : "") || "", language: "auto" };
  }

  _lang() {
    if (["ru", "en"].includes(this.config?.language)) return this.config.language;
    const lang = String(this._hass?.language || navigator.language || "en").toLowerCase();
    return lang.startsWith("ru") ? "ru" : "en";
  }

  _t(key) {
    const tr = {
      ru: {
        title: "Активность", today: "Сегодня", days7: "7 дней", days30: "30 дней",
        steps: "Шаги", goal: "Цель", distance: "Расстояние", calories: "Калории",
        fat: "Жиросжигание", stands: "Вставания", entity_missing: "Сущность шагов не найдена",
        history_unavailable: "История недоступна", no_history: "Нет записанной активности", loading: "Загружаю историю…", retry: "Повторить",
        average: "Среднее", best: "Лучший день", goal_days: "Дней с целью", streak: "Серия", days_word: "дн.",
        records: "Рекорды", personal_record: "Личный рекорд", best_7d: "Лучший за 7 дней", best_30d: "Лучший за 30 дней",
        hourly_profile: "Активность по часам", most_active_hour: "Самый активный час", active_hours: "Активных часов",
        select_day: "Выберите день на графике", missing_day: "Нет данных",
      },
      en: {
        title: "Activity", today: "Today", days7: "7 days", days30: "30 days",
        steps: "Steps", goal: "Goal", distance: "Distance", calories: "Calories",
        fat: "Fat burning", stands: "Stands", entity_missing: "Steps entity not found",
        history_unavailable: "History unavailable", no_history: "No recorded activity", loading: "Loading history…", retry: "Retry",
        average: "Average", best: "Best day", goal_days: "Goal days", streak: "Streak", days_word: "days",
        records: "Records", personal_record: "Personal record", best_7d: "Best 7 days", best_30d: "Best 30 days",
        hourly_profile: "Activity by hour", most_active_hour: "Most active hour", active_hours: "Active hours",
        select_day: "Select a day on the chart", missing_day: "No data",
      },
    };
    return tr[this._lang()][key] ?? key;
  }

  _fmtNumber(value, maximumFractionDigits = 0) {
    const n = Number(value);
    if (!Number.isFinite(n)) return "—";
    const locale = this._lang() === "ru" ? "ru-RU" : "en-US";
    return new Intl.NumberFormat(locale, { maximumFractionDigits }).format(n).replace(/[\u00a0\u202f]/g, " ");
  }

  _availableState(entityId) {
    if (!entityId) return null;
    const state = this._hass?.states?.[entityId];
    if (!state || state.state === "unknown" || state.state === "unavailable") return null;
    const value = Number(state.state);
    if (!Number.isFinite(value)) return null;
    return { state, value };
  }

  _targetValue(stepsState) {
    if (this.config?.target_mode === "manual") {
      const manual = Number(this.config?.manual_target);
      return Number.isFinite(manual) && manual > 0 ? manual : null;
    }
    const target = Number(stepsState?.attributes?.target);
    return Number.isFinite(target) && target > 0 ? target : null;
  }

  _resolvedMappings() {
    const keys = Z2H_ACTIVITY_METRIC_SPECS.map((spec) => spec.key);
    return z2hResolveMappings({ config: this.config || {}, discovered: this._activityDiscovered || {}, mappingKeys: keys });
  }

  async _ensureDiscoveredMetrics(force = false) {
    const seed = this.config?.steps_entity;
    if (!seed || !this._hass?.callWS) return this._activityDiscovered || {};
    if (!force && this._activityDiscoveryReady && this._activityDiscoverySeed === seed) return this._activityDiscovered || {};
    if (!force && this._activityDiscoveryPromise && this._activityDiscoverySeed === seed) return this._activityDiscoveryPromise;
    this._activityDiscoverySeed = seed;
    const requestSeed = seed;
    const promise = z2hFetchEntityRegistry(this._hass)
      .then((registry) => {
        if (this.config?.steps_entity !== requestSeed) return this._activityDiscovered || {};
        this._activityDiscovered = z2hDiscoverSameDevice({
          registry,
          seedEntityId: requestSeed,
          platform: "zepp2hass",
          metricSpecs: Z2H_ACTIVITY_METRIC_SPECS,
        });
        this._activityDiscoveryReady = true;
        this.render();
        return this._activityDiscovered;
      })
      .catch(() => {
        if (this.config?.steps_entity === requestSeed) this._activityDiscoveryReady = true;
        return this._activityDiscovered || {};
      })
      .finally(() => {
        if (this._activityDiscoveryPromise === promise) this._activityDiscoveryPromise = null;
      });
    this._activityDiscoveryPromise = promise;
    return promise;
  }

  _tabsHtml() {
    const show7 = this.config?.show_7d !== false;
    const show30 = this.config?.show_30d !== false;
    if ((this._view === "7d" && !show7) || (this._view === "30d" && !show30)) this._view = "today";
    const tabs = [
      ["today", this._t("today")],
      ...(show7 ? [["7d", this._t("days7")]] : []),
      ...(show30 ? [["30d", this._t("days30")]] : []),
    ];
    return `<div class="activity-tabs" style="grid-template-columns:repeat(${tabs.length},minmax(0,1fr))">${tabs.map(([view,label]) => `<button class="activity-tab ${this._view === view ? "active" : ""}" data-activity-view="${view}">${label}</button>`).join("")}</div>`;
  }

  _metricTile(key, label, entityId, fractionDigits = 0) {
    const metric = this._availableState(entityId);
    if (!metric) return "";
    const unit = metric.state.attributes?.unit_of_measurement || "";
    return `<div class="activity-metric" data-metric="${key}"><div class="activity-metric-label">${label}</div><div class="activity-metric-value">${this._fmtNumber(metric.value, fractionDigits)}${unit ? `<span>${z2hEsc(unit)}</span>` : ""}</div></div>`;
  }

  _styles() {
    return `
      ha-card{padding:18px;border-radius:var(--ha-card-border-radius,16px);overflow:hidden}
      .activity-head{display:flex;align-items:center;gap:10px;margin-bottom:14px}.activity-icon{width:38px;height:38px;border-radius:50%;display:grid;place-items:center;background:color-mix(in srgb,var(--primary-color) 14%,transparent);color:var(--primary-color)}.activity-title{font-size:21px;font-weight:750}
      .activity-tabs{display:grid;gap:5px;padding:4px;border-radius:12px;background:color-mix(in srgb,var(--primary-text-color) 6%,transparent);margin-bottom:18px}.activity-tab{border:0;border-radius:9px;padding:8px 6px;background:transparent;color:var(--secondary-text-color);font:inherit;font-size:12px;font-weight:650}.activity-tab.active{background:var(--ha-card-background,var(--card-background-color));color:var(--primary-color);box-shadow:0 1px 5px rgba(0,0,0,.12)}
      .activity-hero{padding:14px 2px 18px}.activity-kicker{font-size:12px;color:var(--secondary-text-color);margin-bottom:2px}.activity-steps-line{display:flex;align-items:flex-end;justify-content:space-between;gap:12px}.activity-steps{font-size:40px;line-height:1;font-weight:800;letter-spacing:-1.2px}.activity-goal{text-align:right;color:var(--secondary-text-color);font-size:12px}.activity-goal strong{display:block;color:var(--primary-text-color);font-size:16px}.activity-progress-track{height:9px;border-radius:99px;background:color-mix(in srgb,var(--primary-text-color) 10%,transparent);overflow:hidden;margin-top:13px}.activity-progress-fill{height:100%;border-radius:inherit;background:var(--primary-color)}.activity-progress-row{display:flex;justify-content:space-between;margin-top:6px;font-size:12px;color:var(--secondary-text-color)}.activity-progress-pct{font-weight:750;color:var(--primary-color)}
      .activity-metrics{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.activity-metric{padding:12px;border-radius:13px;background:color-mix(in srgb,var(--primary-text-color) 5%,transparent)}.activity-metric-label{font-size:11px;color:var(--secondary-text-color)}.activity-metric-value{margin-top:4px;font-size:20px;font-weight:750}.activity-metric-value span{font-size:11px;font-weight:500;color:var(--secondary-text-color);margin-left:4px}.activity-empty{padding:28px 12px;text-align:center;color:var(--secondary-text-color)}
      .activity-history{display:grid;gap:14px}.activity-history-chart{height:190px;display:flex;align-items:stretch;gap:5px;position:relative;padding-top:10px;border-bottom:1px solid color-mix(in srgb,var(--primary-text-color) 12%,transparent)}.activity-days{display:grid;grid-template-columns:repeat(var(--activity-days),minmax(0,1fr));gap:5px;align-items:end;width:100%;position:relative;z-index:2}.activity-day{display:grid;grid-template-rows:1fr auto;gap:5px;align-items:end;min-width:0;height:100%}.activity-day-bar-wrap{height:100%;display:flex;align-items:end;justify-content:center}.activity-day-bar{width:min(18px,70%);min-height:2px;border-radius:6px 6px 2px 2px;background:var(--primary-color);opacity:.88}.activity-day.empty .activity-day-bar{height:2px!important;background:color-mix(in srgb,var(--primary-text-color) 14%,transparent)}.activity-day-label{text-align:center;font-size:9px;line-height:1.1;color:var(--secondary-text-color);white-space:nowrap;overflow:hidden}.activity-history.compact .activity-history-chart{height:150px}.activity-history.compact .activity-days{gap:2px}.activity-history.compact .activity-day-label{display:none}.activity-history.compact .activity-day-bar{width:80%;border-radius:3px 3px 1px 1px}.activity-target-line{position:absolute;left:0;right:0;border-top:1px dashed color-mix(in srgb,var(--primary-color) 62%,transparent);z-index:1}.activity-history-summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.activity-history-stat{padding:10px;border-radius:12px;background:color-mix(in srgb,var(--primary-text-color) 5%,transparent)}.activity-history-stat strong{display:block;font-size:18px}.activity-history-stat span{display:block;font-size:10px;color:var(--secondary-text-color)}.activity-history-stat small{display:block;margin-top:3px;font-size:9px;color:var(--secondary-text-color)}
      .activity-records{margin-top:14px}.activity-records-title{font-size:12px;font-weight:750;color:var(--secondary-text-color);margin-bottom:8px}.activity-records-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.activity-record{padding:11px 12px;border-radius:13px;background:color-mix(in srgb,var(--primary-text-color) 5%,transparent)}.activity-record-label{font-size:10px;color:var(--secondary-text-color)}.activity-record-value{margin-top:3px;font-size:18px;font-weight:800}.activity-record-date{margin-top:2px;font-size:9px;color:var(--secondary-text-color)}.activity-record.streak .activity-record-value{color:var(--primary-color)}
      .activity-hourly{margin-top:16px;padding-top:2px}.activity-hourly-title{font-size:12px;font-weight:750;color:var(--secondary-text-color);margin-bottom:9px}.activity-hourly-chart{height:92px;display:grid;grid-template-columns:repeat(24,minmax(0,1fr));gap:2px;align-items:end;border-bottom:1px solid color-mix(in srgb,var(--primary-text-color) 12%,transparent);padding-bottom:15px;position:relative}.activity-hour{appearance:none;height:100%;display:flex;align-items:end;position:relative;border:0;padding:0;background:transparent;color:inherit;cursor:pointer;-webkit-tap-highlight-color:transparent}.activity-hour:focus-visible{outline:2px solid var(--primary-color);outline-offset:2px;border-radius:4px}.activity-hour-bar{width:100%;min-height:2px;border-radius:3px 3px 1px 1px;background:color-mix(in srgb,var(--primary-color) 82%,transparent)}.activity-hour.selected .activity-hour-bar{background:var(--primary-color);box-shadow:0 0 0 1px color-mix(in srgb,var(--primary-color) 44%,transparent)}.activity-hour:nth-child(3n+1)::after{content:attr(data-hour);position:absolute;left:0;bottom:-14px;transform:translateX(-1px);font-size:8px;color:var(--secondary-text-color)}.activity-hourly-selection{display:flex;align-items:baseline;gap:7px;margin-top:8px;padding:7px 9px;border-radius:9px;background:color-mix(in srgb,var(--primary-color) 9%,transparent);font-size:11px}.activity-hourly-selection strong{color:var(--primary-text-color)}.activity-hourly-selection span{color:var(--primary-color);font-weight:750}.activity-hourly-summary{display:flex;gap:14px;flex-wrap:wrap;margin-top:8px;font-size:10px;color:var(--secondary-text-color)}.activity-hourly-summary strong{color:var(--primary-text-color);font-size:11px}
      .activity-day{appearance:none;border:0;padding:0;background:transparent;color:inherit;font:inherit;cursor:pointer;border-radius:7px;touch-action:pan-y pinch-zoom;-webkit-tap-highlight-color:transparent}
      .activity-day:focus-visible{outline:2px solid var(--primary-color);outline-offset:1px}
      .activity-day[aria-pressed="true"]{background:color-mix(in srgb,var(--primary-color) 12%,transparent)}
      .activity-day[aria-pressed="true"] .activity-day-bar{opacity:1;box-shadow:0 0 0 1px var(--primary-color)}
      .activity-day-bar{background:linear-gradient(to top,color-mix(in srgb,var(--primary-color) 60%,transparent),var(--primary-color));border-radius:7px 7px 2px 2px}
      .activity-day.empty{opacity:.6}
      .activity-day-selection{min-height:52px;box-sizing:border-box;padding:10px 12px;border-radius:12px;background:color-mix(in srgb,var(--primary-color) 9%,transparent);display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:4px 12px;font-size:12px;color:var(--secondary-text-color)}
      .activity-day-selection strong{color:var(--primary-text-color);font-size:14px}
      .activity-day-selection small{flex-basis:100%;font-size:11px}
      .activity-period-axis{display:flex;justify-content:space-between;font-size:10px;color:var(--secondary-text-color);margin-top:-8px}
      .activity-retry{margin-top:10px;border:1px solid var(--divider-color);border-radius:9px;padding:7px 11px;background:transparent;color:var(--primary-color)}
      @media(max-width:420px){.activity-history-summary{grid-template-columns:repeat(2,minmax(0,1fr))}}
    `;
  }

  _dayDateLabel(day) {
    const key = String(day?.key || "");
    const match = key.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return day?.label || key;
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12, 0, 0);
    const locale = this._lang() === "ru" ? "ru-RU" : "en-US";
    return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(date).replace(/\.$/, "");
  }

  _buildRecordStats(daily) {
    const available = (Array.isArray(daily) ? daily : [])
      .filter((day) => day?.hasData && Number.isFinite(Number(day.steps)))
      .slice()
      .sort((a, b) => String(a.key || "").localeCompare(String(b.key || "")));
    const bestOf = (rows) => rows.reduce((winner, day) => !winner || Number(day.steps) > Number(winner.steps) ? day : winner, null);
    const keyMs = (day) => {
      const key = String(day?.key || "");
      const ms = /^\d{4}-\d{2}-\d{2}$/.test(key) ? Date.parse(`${key}T00:00:00Z`) : NaN;
      return Number.isFinite(ms) ? ms : null;
    };
    const anchorMs = keyMs(available[available.length - 1]);
    const windowRows = (days) => {
      if (anchorMs == null) return available.slice(-days);
      const minMs = anchorMs - (Math.max(1, days) - 1) * 86400000;
      return available.filter((day) => {
        const ms = keyMs(day);
        return ms != null && ms >= minMs && ms <= anchorMs;
      });
    };
    const last30 = windowRows(30);
    const last7 = windowRows(7);
    const allTime = bestOf(available);
    const best30 = bestOf(last30);
    const best7 = bestOf(last7);
    let streak = 0;
    let expectedMs = null;
    for (let i = available.length - 1; i >= 0; i -= 1) {
      const day = available[i];
      const target = Number(day.target);
      const ms = keyMs(day);
      if (!(Number.isFinite(target) && target > 0 && Number(day.steps) >= target)) break;
      if (expectedMs != null && ms != null && ms !== expectedMs) break;
      streak += 1;
      expectedMs = ms != null ? ms - 86400000 : null;
    }
    const average30 = last30.length ? Math.round(last30.reduce((sum, day) => sum + Number(day.steps), 0) / last30.length) : 0;
    return { allTime, best30, best7, streak, average30 };
  }

  _recordCacheKey() {
    return `${this.config?.steps_entity || ""}:all-time`;
  }

  async _loadActivityRecords(force = false) {
    const mappings = this._resolvedMappings();
    const stepsEntity = mappings.steps_entity;
    if (!stepsEntity || !this._hass?.callWS) return null;
    const key = this._recordCacheKey();
    this._recordCache = this._recordCache || {};
    if (!force && this._recordCache[key]) return this._recordCache[key];
    if (!force && this._recordLoading) return this._recordLoading;
    const timeZone = this._timeZone();
    const start = z2hZonedDateFromParts({ year: 2000, month: 1, day: 1 }, timeZone);
    const todaySlot = z2hCalendarDays({ endDate: new Date(), count: 1, timeZone })[0];
    const end = todaySlot.end;
    const target = this._targetValue(this._hass.states?.[stepsEntity]);
    const promise = z2hFetchDailyChanges(this._hass, [stepsEntity], start, end)
      .then((rowsByEntity) => {
        const map = z2hRowsToDailyMap(rowsByEntity, timeZone);
        const data = Array.from(map.values())
          .map((entry) => {
            const row = entry?.[stepsEntity];
            const steps = Number.isFinite(row?.change) ? Number(row.change) : null;
            return { key: entry.key, steps, hasData: Number.isFinite(steps), target };
          })
          .filter((day) => day.hasData)
          .sort((a, b) => String(a.key).localeCompare(String(b.key)));
        const current = this._availableState(stepsEntity);
        if (current) {
          const todayKey = z2hLocalDayKey(new Date(), timeZone);
          const existing = data.find((day) => day.key === todayKey);
          if (existing) existing.steps = current.value;
          else data.push({ key: todayKey, steps: current.value, hasData: true, target });
        }
        const value = { data, error: null };
        this._recordCache[key] = value;
        return value;
      })
      .catch((error) => {
        const value = { data: null, error: error?.message || String(error) };
        this._recordCache[key] = value;
        return value;
      })
      .finally(() => {
        if (this._recordLoading === promise) this._recordLoading = null;
        this.render();
      });
    this._recordLoading = promise;
    return promise;
  }

  _recordTile(label, day, extraClass = "") {
    if (!day) return "";
    return `<div class="activity-record ${extraClass}"><div class="activity-record-label">${label}</div><div class="activity-record-value">${this._fmtNumber(day.steps)}</div><div class="activity-record-date">${z2hEsc(this._dayDateLabel(day))}</div></div>`;
  }

  _renderRecords() {
    const key = this._recordCacheKey();
    const cached = this._recordCache?.[key];
    if (!cached && !this._recordLoading) this._loadActivityRecords();
    if (!cached?.data?.length || cached.error) return "";
    const stats = this._buildRecordStats(cached.data);
    const streak = stats.streak > 0 ? `<div class="activity-record streak"><div class="activity-record-label">${this._t("streak")}</div><div class="activity-record-value">${stats.streak} ${this._t("days_word")}</div><div class="activity-record-date">${this._t("goal")}</div></div>` : "";
    return `<div class="activity-records"><div class="activity-records-title">${this._t("records")}</div><div class="activity-records-grid">${this._recordTile(this._t("personal_record"), stats.allTime)}${this._recordTile(this._t("best_30d"), stats.best30)}${this._recordTile(this._t("best_7d"), stats.best7)}${streak}</div></div>`;
  }

  _hourlyCacheKey() {
    return `${this.config?.steps_entity || ""}:${z2hLocalDayKey(new Date(), this._timeZone())}`;
  }

  async _loadHourlyHistory(force = false) {
    const mappings = this._resolvedMappings();
    const stepsEntity = mappings.steps_entity;
    if (!stepsEntity || !this._hass?.callWS) return null;
    const key = this._hourlyCacheKey();
    if (!force && this._hourlyHistoryCache?.key === key) return this._hourlyHistoryCache;
    if (!force && this._hourlyHistoryLoading) return this._hourlyHistoryLoading;
    const timeZone = this._timeZone();
    const start = z2hStartOfLocalDay(new Date(), timeZone);
    const end = new Date();
    const promise = this._hass.callWS({
      type: "history/history_during_period",
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      entity_ids: [stepsEntity],
      minimal_response: false,
      no_attributes: true,
    }).then((result) => {
      const rows = Array.isArray(result?.[stepsEntity]) ? result[stepsEntity] : [];
      this._hourlyHistoryCache = { key, rows };
      return this._hourlyHistoryCache;
    }).catch(() => {
      this._hourlyHistoryCache = { key, rows: [] };
      return this._hourlyHistoryCache;
    }).finally(() => {
      if (this._hourlyHistoryLoading === promise) this._hourlyHistoryLoading = null;
      this.render();
    });
    this._hourlyHistoryLoading = promise;
    return promise;
  }

  _renderHourlyProfile(stepsMetric) {
    if (this.config?.show_hourly_profile === false) return "";
    const key = this._hourlyCacheKey();
    if (this._hourlyHistoryCache?.key !== key && !this._hourlyHistoryLoading) this._loadHourlyHistory();
    const rows = [...(this._hourlyHistoryCache?.key === key ? this._hourlyHistoryCache.rows : [])];
    const liveState = stepsMetric?.state;
    if (liveState) rows.push({ state: String(stepsMetric.value), last_updated: liveState.last_updated || liveState.last_changed || new Date().toISOString() });
    const profile = z2hBuildHourlyStepProfile(rows, this._timeZone());
    const maxValue = Math.max(1, ...profile.hours);
    const bars = profile.hours.map((value, hour) => {
      const height = value > 0 ? Math.max(3, Math.min(100, value / maxValue * 100)) : 2;
      const hourLabel = String(hour).padStart(2, "0");
      const range = `${hourLabel}:00–${String((hour + 1) % 24).padStart(2, "0")}:00`;
      const selected = this._selectedHourlyHour === hour;
      return `<button type="button" class="activity-hour${selected ? " selected" : ""}" data-activity-hour="${hour}" data-hour="${hourLabel}" title="${range} · ${this._fmtNumber(value)} ${this._t("steps")}" aria-label="${range} · ${this._fmtNumber(value)} ${this._t("steps")}" aria-pressed="${selected}"><span class="activity-hour-bar" style="height:${height.toFixed(1)}%"></span></button>`;
    }).join("");
    const bestRange = profile.bestHour == null ? "—" : `${String(profile.bestHour).padStart(2, "0")}:00–${String((profile.bestHour + 1) % 24).padStart(2, "0")}:00`;
    const selectedHour = Number(this._selectedHourlyHour);
    const selectedRange = Number.isInteger(selectedHour) && selectedHour >= 0 && selectedHour < 24 ? `${String(selectedHour).padStart(2, "0")}:00–${String((selectedHour + 1) % 24).padStart(2, "0")}:00` : null;
    const selection = selectedRange ? `<div class="activity-hourly-selection" role="status"><strong>${selectedRange}</strong><span>${this._fmtNumber(profile.hours[selectedHour])} ${this._t("steps")}</span></div>` : "";
    return `<div class="activity-hourly"><div class="activity-hourly-title">${this._t("hourly_profile")}</div><div class="activity-hourly-chart">${bars}</div>${selection}<div class="activity-hourly-summary"><span>${this._t("most_active_hour")}: <strong>${bestRange}${profile.bestHour == null ? "" : ` · ${this._fmtNumber(profile.bestValue)}`}</strong></span><span>${this._t("active_hours")}: <strong>${profile.activeHours}</strong></span></div></div>`;
  }

  _renderToday(stepsMetric, mappings) {
    const steps = stepsMetric.value;
    const target = this._targetValue(stepsMetric.state);
    const percent = target ? Math.round((steps / target) * 100) : null;
    const barPercent = percent == null ? 0 : Math.max(0, Math.min(100, percent));
    const metrics = [
      this.config.show_distance !== false ? this._metricTile("distance", this._t("distance"), mappings.distance_entity, 2) : "",
      this.config.show_calories !== false ? this._metricTile("calories", this._t("calories"), mappings.calories_entity, 0) : "",
      this.config.show_fat_burning !== false ? this._metricTile("fat_burning", this._t("fat"), mappings.fat_burning_entity, 0) : "",
      this.config.show_stands !== false ? this._metricTile("stands", this._t("stands"), mappings.stands_entity, 0) : "",
    ].filter(Boolean).join("");
    return `
      <div class="activity-hero">
        <div class="activity-kicker">${this._t("steps")}</div>
        <div class="activity-steps-line">
          <div class="activity-steps">${this._fmtNumber(steps)}</div>
          ${target ? `<div class="activity-goal">${this._t("goal")}<strong>${this._fmtNumber(target)}</strong></div>` : ""}
        </div>
        ${target ? `<div class="activity-progress-track"><div class="activity-progress-fill" style="width:${barPercent}%"></div></div><div class="activity-progress-row"><span>${this._fmtNumber(steps)} / ${this._fmtNumber(target)}</span><span class="activity-progress-pct">${percent}%</span></div>` : ""}
      </div>
      ${metrics ? `<div class="activity-metrics">${metrics}</div>` : ""}
      ${this._renderHourlyProfile(stepsMetric)}
      ${this._renderRecords()}`;
  }

  _timeZone() {
    return this._hass?.config?.time_zone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  }

  _historyCacheKey(days) {
    return `${this.config?.steps_entity || ""}:${days}`;
  }

  async _loadActivityHistory(days, force = false) {
    const count = days <= 7 ? 7 : 30;
    const mappings = this._resolvedMappings();
    const stepsEntity = mappings.steps_entity;
    if (!stepsEntity || !this._hass?.callWS) return null;
    const cacheKey = this._historyCacheKey(count);
    this._historyCache = this._historyCache || {};
    this._historyLoading = this._historyLoading || {};
    if (!force && this._historyCache[cacheKey]) return this._historyCache[cacheKey];
    if (!force && this._historyLoading[cacheKey]) return this._historyLoading[cacheKey];

    const timeZone = this._timeZone();
    const slots = z2hCalendarDays({ endDate: new Date(), count, timeZone });
    const start = slots[0].start;
    const end = slots[slots.length - 1].end;
    const target = this._targetValue(this._hass.states?.[stepsEntity]);
    const promise = z2hFetchDailyChanges(this._hass, [stepsEntity], start, end)
      .then((rowsByEntity) => {
        const map = z2hRowsToDailyMap(rowsByEntity, timeZone);
        const data = slots.map((slot) => {
          const row = map.get(slot.key)?.[stepsEntity];
          const steps = Number.isFinite(row?.change) ? row.change : null;
          return { ...slot, steps, hasData: Number.isFinite(steps), target };
        });
        const current = this._availableState(stepsEntity);
        if (current && data.length) {
          data[data.length - 1] = { ...data[data.length - 1], steps: current.value, hasData: true, target };
        }
        const value = { data, error: null };
        this._historyCache[cacheKey] = value;
        return value;
      })
      .catch((error) => {
        const value = { data: null, error: error?.message || String(error) };
        this._historyCache[cacheKey] = value;
        return value;
      })
      .finally(() => {
        delete this._historyLoading[cacheKey];
        this.render();
      });
    this._historyLoading[cacheKey] = promise;
    this.render();
    return promise;
  }

  _buildHistoryStats(daily) {
    const available = (Array.isArray(daily) ? daily : []).filter((day) => day?.hasData && Number.isFinite(Number(day.steps)));
    if (!available.length) return { available: [], average: 0, best: null, goalDays: 0, eligible: [], streak: 0 };
    const values = available.map((day) => Number(day.steps));
    const average = Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
    const best = available.reduce((winner, day) => !winner || Number(day.steps) > Number(winner.steps) ? day : winner, null);
    const eligible = available.filter((day) => Number.isFinite(Number(day.target)) && Number(day.target) > 0);
    const goalDays = eligible.filter((day) => Number(day.steps) >= Number(day.target)).length;
    let streak = 0;
    const calendar = Array.isArray(daily) ? daily : [];
    for (let i = calendar.length - 1; i >= 0; i -= 1) {
      const day = calendar[i];
      if (!(day?.hasData && Number.isFinite(Number(day.steps)))) break;
      const target = Number(day.target);
      if (!(Number.isFinite(target) && target > 0 && Number(day.steps) >= target)) break;
      streak += 1;
    }
    return { available, average, best, goalDays, eligible, streak };
  }

  _renderHistoryContent(days, daily) {
    const data = Array.isArray(daily) ? daily : [];
    const stats = this._buildHistoryStats(data);
    const { available, average, best: bestDay, goalDays, eligible } = stats;
    if (!available.length) return `<div class="activity-empty">${this._t("no_history")}</div>`;
    const best = Number(bestDay?.steps) || 0;
    const targetValues = eligible.map((day) => Number(day.target));
    const referenceTarget = targetValues.length ? targetValues[targetValues.length - 1] : null;
    const maxValue = Math.max(1, best, referenceTarget || 0);
    const targetBottom = referenceTarget ? Math.max(0, Math.min(100, (referenceTarget / maxValue) * 100)) : null;
    const compact = days > 7;
    const bars = data.map((day) => {
      const hasData = day?.hasData && Number.isFinite(Number(day.steps));
      const height = hasData ? Math.max(2, Math.min(100, (Number(day.steps) / maxValue) * 100)) : 2;
      const label = z2hEsc(day?.label || day?.key || "");
      const date = this._dayDateLabel(day);
      const value = hasData ? `${this._t("steps")}: ${this._fmtNumber(day.steps)}` : this._t("missing_day");
      const goal = hasData && Number(day.target) > 0 ? `${this._t("goal")}: ${this._fmtNumber(day.target)} · ${Math.round(Number(day.steps) / Number(day.target) * 100)}%` : "";
      return `<button type="button" class="activity-day${hasData ? "" : " empty"}" data-activity-day="${z2hEsc(day.key)}" data-day-date="${z2hEsc(date)}" data-day-value="${z2hEsc(value)}" data-day-goal="${z2hEsc(goal)}" aria-label="${z2hEsc(`${date} · ${value}${goal ? ` · ${goal}` : ""}`)}" aria-pressed="false"><span class="activity-day-bar-wrap"><span class="activity-day-bar" style="height:${height.toFixed(1)}%"></span></span><span class="activity-day-label">${label}</span></button>`;
    }).join("");
    return `<div class="activity-history${compact ? " compact" : ""}" data-available-days="${available.length}">
      <div class="activity-history-chart">
        ${targetBottom !== null ? `<div class="activity-target-line" style="bottom:${targetBottom.toFixed(1)}%"></div>` : ""}
        <div class="activity-days" style="--activity-days:${data.length}">${bars}</div>
      </div>
      ${compact ? `<div class="activity-period-axis"><span>${z2hEsc(this._dayDateLabel(data[0]))}</span><span>${z2hEsc(this._dayDateLabel(data[data.length - 1]))}</span></div>` : ""}
      <div class="activity-day-selection" role="status" aria-live="polite"><span data-day-selected-date>${this._t("select_day")}</span><strong data-day-selected-value></strong><small data-day-selected-goal></small></div>
      <div class="activity-history-summary">
        <div class="activity-history-stat"><strong data-stat="average">${this._fmtNumber(average)}</strong><span>${this._t("average")}</span></div>
        <div class="activity-history-stat"><strong data-stat="best">${this._fmtNumber(best)}</strong><span>${this._t("best")}</span><small>${z2hEsc(this._dayDateLabel(bestDay))}</small></div>
        <div class="activity-history-stat"><strong data-stat="goal-days">${goalDays} / ${eligible.length}</strong><span>${this._t("goal_days")}</span></div>
        <div class="activity-history-stat"><strong data-stat="streak">${stats.streak} ${this._t("days_word")}</strong><span>${this._t("streak")}</span></div>
      </div>
    </div>`;
  }

  _renderHistory(days) {
    const count = days <= 7 ? 7 : 30;
    const key = this._historyCacheKey(count);
    const cached = this._historyCache?.[key];
    if (!cached && !this._historyLoading?.[key]) this._loadActivityHistory(count);
    if (this._historyLoading?.[key] && !cached) return `<div class="activity-empty">${this._t("loading")}</div>`;
    if (cached?.error) return `<div class="activity-empty">${this._t("history_unavailable")}<br><button class="activity-retry" data-activity-retry="${count}">${this._t("retry")}</button></div>`;
    return this._renderHistoryContent(count, cached?.data || []);
  }

  _setupTabs() {
    for (const button of this.querySelectorAll?.("[data-activity-view]") || []) {
      button.addEventListener("click", () => {
        this._view = button.dataset.activityView;
        this.render();
      });
    }
    for (const button of this.querySelectorAll?.("[data-activity-retry]") || []) {
      button.addEventListener("click", () => this._loadActivityHistory(Number(button.dataset.activityRetry) || 7, true));
    }
  }

  _setupHourlyProfile() {
    for (const button of this.querySelectorAll?.("[data-activity-hour]") || []) {
      button.addEventListener("click", () => {
        const hour = Number(button.dataset.activityHour);
        if (!Number.isInteger(hour) || hour < 0 || hour > 23) return;
        this._selectedHourlyHour = hour;
        this.render();
      });
    }
  }

  _setupHistorySelection() {
    const buttons = [...(this.querySelectorAll?.("[data-activity-day]") || [])];
    const date = this.querySelector?.("[data-day-selected-date]");
    const value = this.querySelector?.("[data-day-selected-value]");
    const goal = this.querySelector?.("[data-day-selected-goal]");
    if (!date || !value || !goal) return;
    const select = (button) => {
      this._selectedActivityDay = button.dataset.activityDay;
      for (const item of buttons) item.setAttribute("aria-pressed", String(item === button));
      date.textContent = button.dataset.dayDate;
      value.textContent = button.dataset.dayValue;
      goal.textContent = button.dataset.dayGoal;
    };
    for (const button of buttons) {
      button.addEventListener("click", () => select(button));
      button.addEventListener("focus", () => select(button));
      button.addEventListener("pointerenter", event => { if (event.pointerType === "mouse") select(button); });
    }
    const selected = buttons.find(button => button.dataset.activityDay === this._selectedActivityDay);
    if (selected) select(selected);
  }

  render() {
    if (!this._hass || !this.config) return;
    const mappings = this._resolvedMappings();
    const stepsMetric = this._availableState(mappings.steps_entity);
    if (!stepsMetric) {
      this.innerHTML = `<ha-card><style>${this._styles()}</style><div class="activity-empty">${this._t("entity_missing")}: ${z2hEsc(mappings.steps_entity || "")}</div></ha-card>`;
      return;
    }
    const title = this.config.title || this._t("title");
    const body = this._view === "today" ? this._renderToday(stepsMetric, mappings) : this._renderHistory(this._view === "7d" ? 7 : 30);
    this.innerHTML = `<ha-card><style>${this._styles()}</style><div class="activity-head"><div class="activity-icon"><ha-icon icon="mdi:walk"></ha-icon></div><div class="activity-title">${z2hEsc(title)}</div></div>${this._tabsHtml()}${body}</ha-card>`;
    this._setupTabs();
    this._setupHourlyProfile();
    this._setupHistorySelection();
  }
}

if (!customElements.get("amazfit-activity-card")) {
  customElements.define("amazfit-activity-card", AmazfitActivityCard);
}
window.customCards = window.customCards || [];
if (!window.customCards.some((card) => card.type === "amazfit-activity-card")) {
  window.customCards.push({ type: "amazfit-activity-card", name: "Amazfit Activity Card", description: "Zepp-style personal activity dashboard", preview: true });
}

class AmazfitActivityCardEditor extends Z2HBaseEditor {
  constructor() {
    super();
    this._discovered = {};
    this._detecting = false;
    this._detectError = null;
    this._detectedSeed = null;
  }

  setConfig(config) {
    const previous = this._config?.steps_entity;
    super.setConfig(config);
    if (previous !== this._config?.steps_entity) {
      this._discovered = {};
      this._detectedSeed = null;
      this._detectError = null;
    }
    this._detect(false);
  }

  set hass(hass) {
    super.hass = hass;
    this._detect(false);
  }

  _lang() {
    const lang = String(this._hass?.language || navigator.language || "en").toLowerCase();
    return lang.startsWith("ru") ? "ru" : "en";
  }

  _t(key) {
    const tr = {
      ru: {
        source: "Источник данных", steps: "Шаги", auto: "Автоопределение", redetect: "Определить заново",
        detecting: "Ищу сущности Zepp2Hass…", detected: "Найдено", none: "Сопутствующие сущности не найдены", detect_error: "Не удалось прочитать реестр сущностей",
        target: "Цель шагов", target_mode: "Источник цели", entity_target: "Из Zepp2Hass", manual_target: "Своя цель", manual_value: "Шагов в день",
        display: "Показывать", language: "Язык", language_auto: "Авто", russian: "Русский", english: "English",
        distance: "Расстояние", calories: "Калории", fat: "Жиросжигание", stands: "Вставания",
        history: "История", seven: "7 дней", thirty: "30 дней", hourly_profile: "Активность по часам сегодня", advanced: "Сущности", advanced_note: "Ручные сущности имеют приоритет. Auto возвращает автоопределение.", automatic: "Auto",
      },
      en: {
        source: "Data source", steps: "Steps", auto: "Auto-discovery", redetect: "Re-detect",
        detecting: "Finding Zepp2Hass entities…", detected: "Found", none: "No companion entities found", detect_error: "Could not read the entity registry",
        target: "Step goal", target_mode: "Goal source", entity_target: "From Zepp2Hass", manual_target: "Manual goal", manual_value: "Steps per day",
        display: "Display", language: "Language", language_auto: "Auto", russian: "Русский", english: "English",
        distance: "Distance", calories: "Calories", fat: "Fat burning", stands: "Stands",
        history: "History", seven: "7 days", thirty: "30 days", hourly_profile: "Hourly activity today", advanced: "Entities", advanced_note: "Manual entities take priority. Auto restores discovery.", automatic: "Auto",
      },
    };
    return tr[this._lang()][key] ?? key;
  }

  _bool(key, fallback = true) {
    return this._config?.[key] === undefined ? fallback : this._config[key] !== false;
  }

  _setConfigValue(key, value) {
    const seedChanged = key === "steps_entity" && value !== this._config?.steps_entity;
    super._setConfigValue(key, value);
    if (seedChanged) {
      this._discovered = {};
      this._detectedSeed = null;
      this._detectError = null;
      this._detect(true);
    }
  }

  async _detect(force = false) {
    let seed = this._config?.steps_entity || null;
    if (!this._hass?.callWS) return;
    if (!force && seed && this._detectedSeed === seed) return;
    if (this._detecting && !force) return;
    const requestedSeed = seed;
    this._detecting = true;
    this._detectError = null;
    this.render();
    try {
      const entityRegistry = await z2hFetchEntityRegistry(this._hass);
      if (requestedSeed !== (this._config?.steps_entity || null)) return;
      const stepsSpec = Z2H_ACTIVITY_METRIC_SPECS[0];
      const seedRow = seed ? entityRegistry.find((row) => row?.entity_id === seed) : null;
      const validSeed = seedRow?.platform === "zepp2hass" && z2hMetricMatchesRegistryRow(seedRow, stepsSpec);
      if (!validSeed) {
        const autoSeed = z2hFindRegistrySeed({ registry: entityRegistry, platform: "zepp2hass", metricSpec: stepsSpec });
        if (autoSeed) {
          seed = autoSeed;
          this._config = { ...(this._config || {}), steps_entity: autoSeed };
          this._emit();
        }
      }
      if (!seed) {
        this._discovered = {};
        this._detectedSeed = null;
        return;
      }
      this._discovered = z2hDiscoverSameDevice({
        registry: entityRegistry,
        seedEntityId: seed,
        platform: "zepp2hass",
        metricSpecs: Z2H_ACTIVITY_METRIC_SPECS,
      });
      this._detectedSeed = seed;
    } catch (error) {
      this._detectError = error?.message || String(error);
      this._detectedSeed = seed;
    } finally {
      this._detecting = false;
      this.render();
    }
  }

  _status() {
    if (this._detecting) return this._t("detecting");
    if (this._detectError) return this._t("detect_error");
    const count = Object.keys(this._discovered || {}).filter((key) => key !== "steps_entity").length;
    return count ? `${this._t("detected")}: ${count}/4` : this._t("none");
  }

  _advancedRow(key, label) {
    const explicit = this._config?.[key] || "";
    const automatic = this._discovered?.[key] || "";
    return `<div class="z2h-advanced-row">
      ${this._entityPickerHtml({ key, label, value: explicit, domains: ["sensor"] })}
      <div class="z2h-auto-line"><span>${this._t("automatic")}: ${automatic ? `<code>${z2hEsc(automatic)}</code>` : "—"}</span>${explicit ? `<button type="button" class="z2h-button" data-z2h-auto-key="${z2hEsc(key)}">${this._t("automatic")}</button>` : ""}</div>
    </div>`;
  }

  renderContent() {
    if (!this._config) return "";
    const targetMode = this._config.target_mode || "entity";
    return `<section class="z2h-section">
      <div class="z2h-section-title">${this._t("source")}</div>
      ${this._entityPickerHtml({ key: "steps_entity", label: this._t("steps"), value: this._config.steps_entity || "", domains: ["sensor"] })}
      <div class="z2h-auto-line"><span class="z2h-section-note"><strong>${this._t("auto")}:</strong> ${z2hEsc(this._status())}</span><button type="button" class="z2h-button" data-z2h-redetect>${this._t("redetect")}</button></div>
    </section>
    <section class="z2h-section">
      <div class="z2h-section-title">${this._t("target")}</div>
      ${this._selectHtml("target_mode", this._t("target_mode"), targetMode, [
        { value: "entity", label: this._t("entity_target") },
        { value: "manual", label: this._t("manual_target") },
      ])}
      ${targetMode === "manual" ? this._numberHtml("manual_target", this._t("manual_value"), this._config.manual_target ?? 10000, { min: 1, max: 100000, step: 500 }) : ""}
    </section>
    <section class="z2h-section">
      <div class="z2h-section-title">${this._t("display")}</div>
      ${this._selectHtml("language", this._t("language"), this._config.language || "auto", [
        { value: "auto", label: this._t("language_auto") },
        { value: "ru", label: this._t("russian") },
        { value: "en", label: this._t("english") },
      ])}
      ${this._toggleHtml("show_distance", this._t("distance"), this._bool("show_distance"))}
      ${this._toggleHtml("show_calories", this._t("calories"), this._bool("show_calories"))}
      ${this._toggleHtml("show_fat_burning", this._t("fat"), this._bool("show_fat_burning"))}
      ${this._toggleHtml("show_stands", this._t("stands"), this._bool("show_stands"))}
    </section>
    <section class="z2h-section">
      <div class="z2h-section-title">${this._t("history")}</div>
      ${this._toggleHtml("show_7d", this._t("seven"), this._bool("show_7d"))}
      ${this._toggleHtml("show_30d", this._t("thirty"), this._bool("show_30d"))}
      ${this._toggleHtml("show_hourly_profile", this._t("hourly_profile"), this._bool("show_hourly_profile"))}
    </section>
    <section class="z2h-section">
      <div class="z2h-section-title">${this._t("advanced")}</div>
      <div class="z2h-section-note">${this._t("advanced_note")}</div>
      ${this._advancedRow("distance_entity", this._t("distance"))}
      ${this._advancedRow("calories_entity", this._t("calories"))}
      ${this._advancedRow("fat_burning_entity", this._t("fat"))}
      ${this._advancedRow("stands_entity", this._t("stands"))}
    </section>`;
  }

  _editorStyles() {
    return `${super._editorStyles()}
      .z2h-auto-line{display:flex;align-items:center;justify-content:space-between;gap:10px;min-width:0}.z2h-auto-line code{overflow-wrap:anywhere;font-size:11px;color:var(--secondary-text-color)}.z2h-advanced-row{display:grid;gap:5px;padding-top:4px}
    `;
  }

  afterRender(root) {
    root?.querySelector?.("[data-z2h-redetect]")?.addEventListener("click", () => this._detect(true));
    for (const button of root?.querySelectorAll?.("[data-z2h-auto-key]") || []) {
      button.addEventListener("click", () => this._deleteConfigValue(button.dataset.z2hAutoKey));
    }
  }
}

if (!customElements.get("amazfit-activity-card-editor")) {
  customElements.define("amazfit-activity-card-editor", AmazfitActivityCardEditor);
}

const Z2H_OVERVIEW_METRIC_SPECS = [
  { key: "steps_entity", uniqueSuffixes: ["steps"], originalNames: ["Steps"] },
  { key: "sleep_score_entity", uniqueSuffixes: ["sleep_score"], originalNames: ["Sleep Score"] },
  { key: "heart_rate_entity", uniqueSuffixes: ["heart_rate"], originalNames: ["Heart Rate"] },
  { key: "pai_entity", uniqueSuffixes: ["pai"], originalNames: ["PAI"] },
  { key: "training_load_entity", uniqueSuffixes: ["training_load"], originalNames: ["Training Load"] },
];

class AmazfitOverviewCard extends HTMLElement {
  setConfig(config) {
    const seed = config?.entity || config?.steps_entity || "";
    const previous = this.config?.entity || "";
    this.config = {
      title: null,
      language: "auto",
      entity: seed,
      steps_entity: null,
      sleep_score_entity: null,
      heart_rate_entity: null,
      pai_entity: null,
      training_load_entity: null,
      ...config,
      entity: seed,
    };
    if (previous !== seed) {
      this._overviewDiscovered = {};
      this._overviewDiscoverySeed = null;
      this._overviewDiscoveryReady = false;
      this._overviewDiscoveryPromise = null;
    }
    if (this._hass) this._ensureDiscoveredMetrics();
  }

  set hass(hass) {
    this._hass = hass;
    this.render();
    this._ensureDiscoveredMetrics();
  }

  getCardSize() { return 5; }

  static getConfigElement() { return document.createElement("amazfit-overview-card-editor"); }

  static getStubConfig(hass, entities) {
    const spec = Z2H_OVERVIEW_METRIC_SPECS[0];
    return { entity: z2hFindSeedFromStates(hass, spec, entities) || "", language: "auto" };
  }

  _lang() {
    if (["ru", "en"].includes(this.config?.language)) return this.config.language;
    return String(this._hass?.language || navigator.language || "en").toLowerCase().startsWith("ru") ? "ru" : "en";
  }

  _t(key) {
    const tr = {
      ru: { title: "Сегодня", sleep: "Сон", steps: "Шаги", heart_rate: "Пульс", pai: "PAI", recovery: "Восстановление", hours: "ч", unavailable: "Недоступно" },
      en: { title: "Today", sleep: "Sleep", steps: "Steps", heart_rate: "Heart rate", pai: "PAI", recovery: "Recovery", hours: "h", unavailable: "Unavailable" },
    };
    return tr[this._lang()][key] ?? key;
  }

  _number(value, digits = 0) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "—";
    return new Intl.NumberFormat(this._lang() === "ru" ? "ru-RU" : "en-US", { maximumFractionDigits: digits }).format(number).replace(/[\u00a0\u202f]/g, " ");
  }

  _state(entityId) {
    const state = entityId ? this._hass?.states?.[entityId] : null;
    return state && state.state !== "unknown" && state.state !== "unavailable" ? state : null;
  }

  _resolvedMappings() {
    return z2hResolveMappings({
      config: this.config || {},
      discovered: this._overviewDiscovered || {},
      mappingKeys: Z2H_OVERVIEW_METRIC_SPECS.map((spec) => spec.key),
    });
  }

  async _ensureDiscoveredMetrics(force = false) {
    const seed = this.config?.entity;
    if (!seed || !this._hass?.callWS) return this._overviewDiscovered || {};
    if (!force && this._overviewDiscoveryReady && this._overviewDiscoverySeed === seed) return this._overviewDiscovered || {};
    if (!force && this._overviewDiscoveryPromise && this._overviewDiscoverySeed === seed) return this._overviewDiscoveryPromise;
    this._overviewDiscoverySeed = seed;
    const requestedSeed = seed;
    const promise = z2hFetchEntityRegistry(this._hass).then((registry) => {
      if (this.config?.entity !== requestedSeed) return this._overviewDiscovered || {};
      this._overviewDiscovered = z2hDiscoverSameDevice({ registry, seedEntityId: requestedSeed, platform: "zepp2hass", metricSpecs: Z2H_OVERVIEW_METRIC_SPECS });
      this._overviewDiscoveryReady = true;
      this.render();
      return this._overviewDiscovered;
    }).catch(() => {
      if (this.config?.entity === requestedSeed) this._overviewDiscoveryReady = true;
      return this._overviewDiscovered || {};
    }).finally(() => {
      if (this._overviewDiscoveryPromise === promise) this._overviewDiscoveryPromise = null;
    });
    this._overviewDiscoveryPromise = promise;
    return promise;
  }

  _tile(key, label, value, unit, entityId, primary = false) {
    const enabled = entityId ? "" : " disabled";
    return `<button type="button" class="overview-tile${primary ? " primary" : ""}" data-overview-entity="${z2hEsc(entityId || "")}"${enabled}><span>${label}</span><strong>${value}</strong>${unit ? `<small>${unit}</small>` : ""}</button>`;
  }

  _heroTile(label, value, entityId) {
    const enabled = entityId ? "" : " disabled";
    return `<button type="button" class="overview-hero" data-overview-entity="${z2hEsc(entityId || "")}"${enabled}><span>${label}</span><strong>${value}</strong></button>`;
  }

  _styles() {
    return `
      ha-card{padding:18px;border-radius:var(--ha-card-border-radius,16px);overflow:hidden}.overview-head{display:flex;align-items:center;gap:10px;margin-bottom:14px}.overview-icon{width:38px;height:38px;border-radius:50%;display:grid;place-items:center;background:color-mix(in srgb,var(--primary-color) 14%,transparent);color:var(--primary-color)}.overview-title{font-size:21px;font-weight:750}.overview-summary{margin-bottom:10px;padding:14px;border-radius:15px;background:linear-gradient(135deg,color-mix(in srgb,var(--primary-color) 14%,transparent),color-mix(in srgb,var(--primary-color) 4%,transparent));display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.overview-hero{appearance:none;min-width:0;padding:0;border:0;background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer}.overview-hero:disabled{cursor:default}.overview-hero:focus-visible,.overview-tile:focus-visible{outline:2px solid var(--primary-color);outline-offset:2px;border-radius:4px}.overview-hero span{display:block;font-size:10px;color:var(--secondary-text-color)}.overview-hero strong{display:block;margin-top:3px;font-size:29px;font-weight:800;letter-spacing:-.6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.overview-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.overview-tile{appearance:none;min-width:0;padding:11px 9px;border:0;border-radius:13px;background:color-mix(in srgb,var(--primary-text-color) 5%,transparent);color:inherit;font:inherit;text-align:left;cursor:pointer}.overview-tile:disabled{cursor:default;opacity:.65}.overview-tile span,.overview-tile small{display:block;font-size:9px;color:var(--secondary-text-color)}.overview-tile strong{display:block;margin-top:4px;font-size:19px;line-height:1.05;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.overview-tile small{margin-top:2px}.overview-tile.primary{background:color-mix(in srgb,var(--primary-color) 9%,transparent)}@media(max-width:360px){.overview-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.overview-tile.primary{grid-column:1/-1}}
    `;
  }

  _setupInteractions() {
    for (const tile of this.querySelectorAll?.("[data-overview-entity]") || []) {
      tile.addEventListener("click", () => {
        const entityId = tile.dataset.overviewEntity;
        if (entityId) this.dispatchEvent(new CustomEvent("hass-more-info", { detail: { entityId }, bubbles: true, composed: true }));
      });
    }
  }

  render() {
    if (!this._hass || !this.config) return;
    const mappings = this._resolvedMappings();
    const steps = this._state(mappings.steps_entity);
    const sleep = this._state(mappings.sleep_score_entity);
    const heart = this._state(mappings.heart_rate_entity);
    const pai = this._state(mappings.pai_entity);
    const load = this._state(mappings.training_load_entity);
    const recovery = Number(load?.attributes?.full_recovery_time_hours);
    const title = this.config.title || this._t("title");
    this.innerHTML = `<ha-card><style>${this._styles()}</style><div class="overview-head"><div class="overview-icon"><ha-icon icon="mdi:chart-donut-variant"></ha-icon></div><div class="overview-title">${z2hEsc(title)}</div></div><div class="overview-summary">${this._heroTile(this._t("steps"), this._number(steps?.state), mappings.steps_entity)}${this._heroTile(this._t("sleep"), this._number(sleep?.state), mappings.sleep_score_entity)}</div><div class="overview-grid">${this._tile("heart", this._t("heart_rate"), this._number(heart?.state), heart?.attributes?.unit_of_measurement || "", mappings.heart_rate_entity, true)}${this._tile("pai", this._t("pai"), this._number(pai?.state), "", mappings.pai_entity)}${this._tile("recovery", this._t("recovery"), Number.isFinite(recovery) ? this._number(recovery) : "—", Number.isFinite(recovery) ? this._t("hours") : "", mappings.training_load_entity)}</div></ha-card>`;
    this._setupInteractions();
  }
}

if (!customElements.get("amazfit-overview-card")) customElements.define("amazfit-overview-card", AmazfitOverviewCard);
window.customCards = window.customCards || [];
if (!window.customCards.some((card) => card.type === "amazfit-overview-card")) window.customCards.push({ type: "amazfit-overview-card", name: "Amazfit Overview Card", description: "Today overview for Zepp2Hass telemetry", preview: true });

class AmazfitOverviewCardEditor extends Z2HBaseEditor {
  _lang() { return String(this._hass?.language || navigator.language || "en").toLowerCase().startsWith("ru") ? "ru" : "en"; }

  _t(key) {
    const tr = {
      ru: { source: "Источник данных", seed: "Любая сущность Zepp2Hass", language: "Язык", auto: "Авто", russian: "Русский", english: "English", advanced: "Сущности", note: "Выберите одну сущность Zepp2Hass для автоопределения. Ручные настройки имеют приоритет.", steps: "Шаги", sleep: "Sleep Score", heart: "Пульс", pai: "PAI", training: "Нагрузка" },
      en: { source: "Data source", seed: "Any Zepp2Hass entity", language: "Language", auto: "Auto", russian: "Русский", english: "English", advanced: "Entities", note: "Choose one Zepp2Hass entity for auto-discovery. Manual settings take priority.", steps: "Steps", sleep: "Sleep Score", heart: "Heart rate", pai: "PAI", training: "Training load" },
    };
    return tr[this._lang()][key] ?? key;
  }

  renderContent() {
    if (!this._config) return "";
    return `<section class="z2h-section"><div class="z2h-section-title">${this._t("source")}</div>${this._entityPickerHtml({ key: "entity", label: this._t("seed"), value: this._config.entity || "", domains: ["sensor"] })}${this._selectHtml("language", this._t("language"), this._config.language || "auto", [{ value: "auto", label: this._t("auto") }, { value: "ru", label: this._t("russian") }, { value: "en", label: this._t("english") }])}</section><section class="z2h-section"><div class="z2h-section-title">${this._t("advanced")}</div><div class="z2h-section-note">${this._t("note")}</div>${this._entityPickerHtml({ key: "steps_entity", label: this._t("steps"), value: this._config.steps_entity || "", domains: ["sensor"] })}${this._entityPickerHtml({ key: "sleep_score_entity", label: this._t("sleep"), value: this._config.sleep_score_entity || "", domains: ["sensor"] })}${this._entityPickerHtml({ key: "heart_rate_entity", label: this._t("heart"), value: this._config.heart_rate_entity || "", domains: ["sensor"] })}${this._entityPickerHtml({ key: "pai_entity", label: this._t("pai"), value: this._config.pai_entity || "", domains: ["sensor"] })}${this._entityPickerHtml({ key: "training_load_entity", label: this._t("training"), value: this._config.training_load_entity || "", domains: ["sensor"] })}</section>`;
  }
}

if (!customElements.get("amazfit-overview-card-editor")) customElements.define("amazfit-overview-card-editor", AmazfitOverviewCardEditor);

const Z2H_HEALTH_METRIC_SPECS = [
  { key: "heart_rate_entity", uniqueSuffixes: ["heart_rate"], originalNames: ["Heart Rate"] },
  { key: "resting_hr_entity", uniqueSuffixes: ["heart_rate_resting", "resting_heart_rate"], originalNames: ["Heart Rate Resting", "Resting Heart Rate"] },
  { key: "max_hr_entity", uniqueSuffixes: ["heart_rate_max", "max_heart_rate"], originalNames: ["Heart Rate Max", "Max Heart Rate"] },
  { key: "stress_entity", uniqueSuffixes: ["stress"], originalNames: ["Stress"] },
  { key: "spo2_entity", uniqueSuffixes: ["blood_oxygen", "spo2"], originalNames: ["Blood Oxygen", "SpO2", "SpO₂"] },
  { key: "temperature_entity", uniqueSuffixes: ["body_temperature", "temperature"], originalNames: ["Body Temperature"] },
  { key: "pai_entity", uniqueSuffixes: ["pai"], originalNames: ["PAI"] },
  { key: "training_load_entity", uniqueSuffixes: ["training_load"], originalNames: ["Training Load"] },
];

class AmazfitHealthCard extends HTMLElement {
  setConfig(config) {
    const seed = config?.heart_rate_entity || config?.entity || "";
    const previous = this.config?.heart_rate_entity || null;
    this.config = {
      title: null,
      language: "auto",
      heart_rate_entity: seed,
      resting_hr_entity: null,
      max_hr_entity: null,
      stress_entity: null,
      spo2_entity: null,
      temperature_entity: null,
      pai_entity: null,
      training_load_entity: null,
      show_current_hr: true,
      show_resting_hr: true,
      show_max_hr: true,
      show_stress: true,
      show_spo2: true,
      show_temperature: true,
      show_pai: true,
      show_training: true,
      hide_unavailable: true,
      density: "compact",
      ...config,
      heart_rate_entity: seed,
    };
    if (previous !== seed) {
      this._healthDiscovered = {};
      this._healthDiscoverySeed = null;
      this._healthDiscoveryReady = false;
      this._healthDiscoveryPromise = null;
    }
    if (this._hass) this._ensureDiscoveredMetrics();
  }

  set hass(hass) {
    this._hass = hass;
    this.render();
    this._ensureDiscoveredMetrics();
  }

  getCardSize() { return this.config?.density === "expanded" ? 6 : 5; }

  static getConfigElement() {
    return document.createElement("amazfit-health-card-editor");
  }

  static getStubConfig(hass, entities) {
    const metricSpec = Z2H_HEALTH_METRIC_SPECS[0];
    return { heart_rate_entity: z2hFindSeedFromStates(hass, metricSpec, entities) || (Array.isArray(entities) ? entities.find((id) => typeof id === "string" && id.startsWith("sensor.")) : "") || "", language: "auto" };
  }

  _lang() {
    if (["ru", "en"].includes(this.config?.language)) return this.config.language;
    const lang = String(this._hass?.language || navigator.language || "en").toLowerCase();
    return lang.startsWith("ru") ? "ru" : "en";
  }

  _t(key) {
    const tr = {
      ru: {
        title: "Здоровье", heart: "Сердце", wellness: "Самочувствие", training: "Тренировки",
        current_hr: "Пульс", resting_hr: "В покое", max_hr: "Максимальный", stress: "Стресс",
        spo2: "SpO₂", temperature: "Температура", pai: "PAI", training_load: "Нагрузка",
        recovery: "Восстановление", vo2: "VO₂ Max", unavailable: "Недоступно",
      },
      en: {
        title: "Health", heart: "Heart", wellness: "Wellness", training: "Training",
        current_hr: "Heart rate", resting_hr: "Resting", max_hr: "Maximum", stress: "Stress",
        spo2: "SpO₂", temperature: "Temperature", pai: "PAI", training_load: "Training load",
        recovery: "Recovery", vo2: "VO₂ Max", unavailable: "Unavailable",
      },
    };
    return tr[this._lang()][key] ?? key;
  }

  _fmt(value, digits = 0) {
    const n = Number(value);
    if (!Number.isFinite(n)) return "—";
    const locale = this._lang() === "ru" ? "ru-RU" : "en-US";
    return new Intl.NumberFormat(locale, { maximumFractionDigits: digits }).format(n).replace(/[\u00a0\u202f]/g, " ");
  }

  _resolvedMappings() {
    return z2hResolveMappings({
      config: this.config || {},
      discovered: this._healthDiscovered || {},
      mappingKeys: Z2H_HEALTH_METRIC_SPECS.map((spec) => spec.key),
    });
  }

  async _ensureDiscoveredMetrics(force = false) {
    const seed = this.config?.heart_rate_entity;
    if (!seed || !this._hass?.callWS) return this._healthDiscovered || {};
    if (!force && this._healthDiscoveryReady && this._healthDiscoverySeed === seed) return this._healthDiscovered || {};
    if (!force && this._healthDiscoveryPromise && this._healthDiscoverySeed === seed) return this._healthDiscoveryPromise;
    this._healthDiscoverySeed = seed;
    const requestSeed = seed;
    const promise = z2hFetchEntityRegistry(this._hass)
      .then((registry) => {
        if (this.config?.heart_rate_entity !== requestSeed) return this._healthDiscovered || {};
        this._healthDiscovered = z2hDiscoverSameDevice({ registry, seedEntityId: requestSeed, platform: "zepp2hass", metricSpecs: Z2H_HEALTH_METRIC_SPECS });
        this._healthDiscoveryReady = true;
        this.render();
        return this._healthDiscovered;
      })
      .catch(() => {
        if (this.config?.heart_rate_entity === requestSeed) this._healthDiscoveryReady = true;
        return this._healthDiscovered || {};
      })
      .finally(() => {
        if (this._healthDiscoveryPromise === promise) this._healthDiscoveryPromise = null;
      });
    this._healthDiscoveryPromise = promise;
    return promise;
  }

  _sparkline(metric, key) {
    const values = z2hFiniteSeries(metric?.attributes?.last_week);
    if (values.length < 2) return "";
    const width = 120;
    const height = 34;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = Math.max(1, max - min);
    const points = values.map((value, index) => {
      const x = values.length === 1 ? width / 2 : (index / (values.length - 1)) * width;
      const y = height - 3 - ((value - min) / range) * (height - 6);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(" ");
    return `<svg class="health-sparkline" data-sparkline="${key}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-hidden="true"><polyline points="${points}"></polyline></svg>`;
  }

  _metricHtml(key, label, metric, { primary = false, digits = 0, sparkline = false } = {}) {
    const value = metric?.available ? this._fmt(metric.value, digits) : "—";
    const unit = metric?.available ? metric.unit : "";
    return `<div class="health-metric${primary ? " primary" : ""}" data-metric="${key}">
      <div class="health-metric-label">${label}</div>
      <div class="health-metric-value"><strong>${value}</strong>${unit ? `<span>${z2hEsc(unit)}</span>` : ""}</div>
      ${sparkline ? this._sparkline(metric, key) : ""}
    </div>`;
  }

  _should(metric, configKey) {
    return z2hShouldRenderMetric(metric, this.config?.[configKey] !== false, this.config?.hide_unavailable !== false);
  }

  _styles() {
    return `
      ha-card{padding:18px;border-radius:var(--ha-card-border-radius,16px);overflow:hidden}.health-head{display:flex;align-items:center;gap:10px;margin-bottom:15px}.health-icon{width:38px;height:38px;border-radius:50%;display:grid;place-items:center;background:color-mix(in srgb,var(--primary-color) 14%,transparent);color:var(--primary-color)}.health-title{font-size:21px;font-weight:750}
      .health-card-body{display:grid;gap:12px}.health-card-body.expanded{gap:18px}.health-section{display:grid;gap:9px}.health-section-title{font-size:12px;font-weight:750;color:var(--secondary-text-color);text-transform:uppercase;letter-spacing:.05em}.health-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.health-heart-grid{display:grid;grid-template-columns:1.3fr .85fr .85fr;gap:8px}.health-metric{min-width:0;padding:11px 12px;border-radius:13px;background:color-mix(in srgb,var(--primary-text-color) 5%,transparent)}.health-metric.primary{padding:14px;background:color-mix(in srgb,var(--primary-color) 9%,transparent)}.health-metric-label{font-size:10px;color:var(--secondary-text-color)}.health-metric-value{margin-top:4px;display:flex;align-items:baseline;gap:4px}.health-metric-value strong{font-size:21px}.health-metric.primary .health-metric-value strong{font-size:31px}.health-metric-value span{font-size:10px;color:var(--secondary-text-color)}.health-sparkline{width:100%;height:28px;margin-top:7px;overflow:visible}.health-sparkline polyline{fill:none;stroke:var(--primary-color);stroke-width:2;vector-effect:non-scaling-stroke;stroke-linecap:round;stroke-linejoin:round}.health-training{display:grid;grid-template-columns:1.2fr .9fr .9fr;gap:8px}.health-card-body.expanded .health-metric{padding:15px}.health-card-body.expanded .health-section-title{font-size:13px}@media(max-width:420px){.health-heart-grid,.health-training{grid-template-columns:1fr 1fr}.health-metric.primary{grid-column:1/-1}.health-grid{grid-template-columns:1fr 1fr}}
    `;
  }

  render() {
    if (!this._hass || !this.config) return;
    const m = this._resolvedMappings();
    const current = z2hMetricState(this._hass, m.heart_rate_entity);
    const resting = z2hMetricState(this._hass, m.resting_hr_entity);
    const max = z2hMetricState(this._hass, m.max_hr_entity);
    const stress = z2hMetricState(this._hass, m.stress_entity);
    const spo2 = z2hMetricState(this._hass, m.spo2_entity);
    const temp = z2hMetricState(this._hass, m.temperature_entity);
    const pai = z2hMetricState(this._hass, m.pai_entity);
    const training = z2hMetricState(this._hass, m.training_load_entity);

    const heart = [
      this._should(current, "show_current_hr") ? this._metricHtml("current_hr", this._t("current_hr"), current, { primary: true }) : "",
      this._should(resting, "show_resting_hr") ? this._metricHtml("resting_hr", this._t("resting_hr"), resting) : "",
      this._should(max, "show_max_hr") ? this._metricHtml("max_hr", this._t("max_hr"), max) : "",
    ].filter(Boolean).join("");

    const wellness = [
      this._should(stress, "show_stress") ? this._metricHtml("stress", this._t("stress"), stress, { sparkline: true }) : "",
      this._should(spo2, "show_spo2") ? this._metricHtml("spo2", this._t("spo2"), spo2, { digits: 1 }) : "",
      this._should(temp, "show_temperature") ? this._metricHtml("temperature", this._t("temperature"), temp, { digits: 2 }) : "",
      this._should(pai, "show_pai") ? this._metricHtml("pai", this._t("pai"), pai, { sparkline: true }) : "",
    ].filter(Boolean).join("");

    let trainingHtml = "";
    if (this.config.show_training !== false && (!this.config.hide_unavailable || training.available)) {
      const recovery = Number(training.attributes?.full_recovery_time_hours);
      const vo2 = Number(training.attributes?.vo2_max);
      const cells = [this._metricHtml("training_load", this._t("training_load"), training, { primary: true })];
      if (Number.isFinite(recovery) && recovery >= 0) {
        cells.push(`<div class="health-metric" data-metric="recovery"><div class="health-metric-label">${this._t("recovery")}</div><div class="health-metric-value"><strong>${this._fmt(recovery,1)}</strong><span>h</span></div></div>`);
      }
      if (Number.isFinite(vo2) && vo2 > 0) {
        cells.push(`<div class="health-metric" data-metric="vo2"><div class="health-metric-label">${this._t("vo2")}</div><div class="health-metric-value"><strong>${this._fmt(vo2,1)}</strong></div></div>`);
      }
      trainingHtml = cells.join("");
    }

    const density = this.config.density === "expanded" ? "expanded" : "compact";
    const title = this.config.title || this._t("title");
    this.innerHTML = `<ha-card><style>${this._styles()}</style><div class="health-head"><div class="health-icon"><ha-icon icon="mdi:heart-pulse"></ha-icon></div><div class="health-title">${z2hEsc(title)}</div></div><div class="health-card-body ${density}">
      ${heart ? `<section class="health-section" data-health-group="heart"><div class="health-section-title">${this._t("heart")}</div><div class="health-heart-grid">${heart}</div></section>` : ""}
      ${wellness ? `<section class="health-section" data-health-group="wellness"><div class="health-section-title">${this._t("wellness")}</div><div class="health-grid">${wellness}</div></section>` : ""}
      ${trainingHtml ? `<section class="health-section" data-health-group="training"><div class="health-section-title">${this._t("training")}</div><div class="health-training">${trainingHtml}</div></section>` : ""}
    </div></ha-card>`;
  }
}

if (!customElements.get("amazfit-health-card")) customElements.define("amazfit-health-card", AmazfitHealthCard);
window.customCards = window.customCards || [];
if (!window.customCards.some((card) => card.type === "amazfit-health-card")) {
  window.customCards.push({ type: "amazfit-health-card", name: "Amazfit Health Card", description: "Zepp-style health and training telemetry", preview: true });
}

class AmazfitHealthCardEditor extends Z2HBaseEditor {
  constructor() {
    super();
    this._discovered = {};
    this._detecting = false;
    this._detectError = null;
    this._detectedSeed = null;
  }

  setConfig(config) {
    const previous = this._config?.heart_rate_entity;
    super.setConfig(config);
    if (previous !== this._config?.heart_rate_entity) {
      this._discovered = {};
      this._detectedSeed = null;
      this._detectError = null;
    }
    this._detect(false);
  }

  set hass(hass) {
    super.hass = hass;
    this._detect(false);
  }

  _lang() {
    const lang = String(this._hass?.language || navigator.language || "en").toLowerCase();
    return lang.startsWith("ru") ? "ru" : "en";
  }

  _t(key) {
    const tr = {
      ru: {
        source: "Источник данных", heart_rate: "Пульс", auto: "Автоопределение", redetect: "Определить заново",
        detecting: "Ищу сущности Zepp2Hass…", detected: "Найдено", none: "Сопутствующие сущности не найдены", detect_error: "Не удалось прочитать реестр сущностей",
        heart: "Сердце", current_hr: "Текущий пульс", resting_hr: "Пульс в покое", max_hr: "Максимальный пульс",
        wellness: "Самочувствие", stress: "Стресс", spo2: "SpO₂", temperature: "Температура", pai: "PAI",
        training: "Тренировки", training_load: "Тренировочная нагрузка",
        display: "Отображение", hide_unavailable: "Скрывать недоступные показатели", density: "Плотность", compact: "Компактно", expanded: "Расширенно", language: "Язык", automatic_language: "Авто", russian: "Русский", english: "English",
        entities: "Сущности", entities_note: "Ручные сущности имеют приоритет. Auto возвращает автоопределение.", automatic: "Auto",
      },
      en: {
        source: "Data source", heart_rate: "Heart rate", auto: "Auto-discovery", redetect: "Re-detect",
        detecting: "Finding Zepp2Hass entities…", detected: "Found", none: "No companion entities found", detect_error: "Could not read the entity registry",
        heart: "Heart", current_hr: "Current heart rate", resting_hr: "Resting heart rate", max_hr: "Maximum heart rate",
        wellness: "Wellness", stress: "Stress", spo2: "SpO₂", temperature: "Temperature", pai: "PAI",
        training: "Training", training_load: "Training load",
        display: "Display", hide_unavailable: "Hide unavailable metrics", density: "Density", compact: "Compact", expanded: "Expanded", language: "Language", automatic_language: "Auto", russian: "Русский", english: "English",
        entities: "Entities", entities_note: "Manual entities take priority. Auto restores discovery.", automatic: "Auto",
      },
    };
    return tr[this._lang()][key] ?? key;
  }

  _bool(key, fallback = true) {
    return this._config?.[key] === undefined ? fallback : this._config[key] !== false;
  }

  _setConfigValue(key, value) {
    const seedChanged = key === "heart_rate_entity" && value !== this._config?.heart_rate_entity;
    super._setConfigValue(key, value);
    if (seedChanged) {
      this._discovered = {};
      this._detectedSeed = null;
      this._detectError = null;
      this._detect(true);
    }
  }

  async _detect(force = false) {
    let seed = this._config?.heart_rate_entity || null;
    if (!this._hass?.callWS) return;
    if (!force && seed && this._detectedSeed === seed) return;
    if (this._detecting && !force) return;
    const requestedSeed = seed;
    this._detecting = true;
    this._detectError = null;
    this.render();
    try {
      const registry = await z2hFetchEntityRegistry(this._hass);
      if (requestedSeed !== (this._config?.heart_rate_entity || null)) return;
      const heartRateSpec = Z2H_HEALTH_METRIC_SPECS[0];
      const seedRow = seed ? registry.find((row) => row?.entity_id === seed) : null;
      const validSeed = seedRow?.platform === "zepp2hass" && z2hMetricMatchesRegistryRow(seedRow, heartRateSpec);
      if (!validSeed) {
        const autoSeed = z2hFindRegistrySeed({ registry, platform: "zepp2hass", metricSpec: heartRateSpec });
        if (autoSeed) {
          seed = autoSeed;
          this._config = { ...(this._config || {}), heart_rate_entity: autoSeed };
          this._emit();
        }
      }
      if (!seed) {
        this._discovered = {};
        this._detectedSeed = null;
        return;
      }
      this._discovered = z2hDiscoverSameDevice({
        registry,
        seedEntityId: seed,
        platform: "zepp2hass",
        metricSpecs: Z2H_HEALTH_METRIC_SPECS,
      });
      this._detectedSeed = seed;
    } catch (error) {
      this._detectError = error?.message || String(error);
      this._detectedSeed = seed;
    } finally {
      this._detecting = false;
      this.render();
    }
  }

  _status() {
    if (this._detecting) return this._t("detecting");
    if (this._detectError) return this._t("detect_error");
    const count = Object.keys(this._discovered || {}).filter((key) => key !== "heart_rate_entity").length;
    return count ? `${this._t("detected")}: ${count}/7` : this._t("none");
  }

  _advancedRow(key, label) {
    const explicit = this._config?.[key] || "";
    const automatic = this._discovered?.[key] || "";
    return `<div class="z2h-advanced-row">
      ${this._entityPickerHtml({ key, label, value: explicit, domains: ["sensor"] })}
      <div class="z2h-auto-line"><span>${this._t("automatic")}: ${automatic ? `<code>${z2hEsc(automatic)}</code>` : "—"}</span>${explicit ? `<button type="button" class="z2h-button" data-z2h-auto-key="${z2hEsc(key)}">${this._t("automatic")}</button>` : ""}</div>
    </div>`;
  }

  renderContent() {
    if (!this._config) return "";
    return `<section class="z2h-section">
      <div class="z2h-section-title">${this._t("source")}</div>
      ${this._entityPickerHtml({ key: "heart_rate_entity", label: this._t("heart_rate"), value: this._config.heart_rate_entity || "", domains: ["sensor"] })}
      <div class="z2h-auto-line"><span class="z2h-section-note"><strong>${this._t("auto")}:</strong> ${z2hEsc(this._status())}</span><button type="button" class="z2h-button" data-z2h-redetect>${this._t("redetect")}</button></div>
    </section>
    <section class="z2h-section">
      <div class="z2h-section-title">${this._t("heart")}</div>
      ${this._toggleHtml("show_current_hr", this._t("current_hr"), this._bool("show_current_hr"))}
      ${this._toggleHtml("show_resting_hr", this._t("resting_hr"), this._bool("show_resting_hr"))}
      ${this._toggleHtml("show_max_hr", this._t("max_hr"), this._bool("show_max_hr"))}
    </section>
    <section class="z2h-section">
      <div class="z2h-section-title">${this._t("wellness")}</div>
      ${this._toggleHtml("show_stress", this._t("stress"), this._bool("show_stress"))}
      ${this._toggleHtml("show_spo2", this._t("spo2"), this._bool("show_spo2"))}
      ${this._toggleHtml("show_temperature", this._t("temperature"), this._bool("show_temperature"))}
      ${this._toggleHtml("show_pai", this._t("pai"), this._bool("show_pai"))}
    </section>
    <section class="z2h-section">
      <div class="z2h-section-title">${this._t("training")}</div>
      ${this._toggleHtml("show_training", this._t("training_load"), this._bool("show_training"))}
    </section>
    <section class="z2h-section">
      <div class="z2h-section-title">${this._t("display")}</div>
      ${this._toggleHtml("hide_unavailable", this._t("hide_unavailable"), this._bool("hide_unavailable"))}
      ${this._selectHtml("density", this._t("density"), this._config.density || "compact", [
        { value: "compact", label: this._t("compact") },
        { value: "expanded", label: this._t("expanded") },
      ])}
      ${this._selectHtml("language", this._t("language"), this._config.language || "auto", [
        { value: "auto", label: this._t("automatic_language") },
        { value: "ru", label: this._t("russian") },
        { value: "en", label: this._t("english") },
      ])}
    </section>
    <section class="z2h-section">
      <div class="z2h-section-title">${this._t("entities")}</div>
      <div class="z2h-section-note">${this._t("entities_note")}</div>
      ${this._advancedRow("resting_hr_entity", this._t("resting_hr"))}
      ${this._advancedRow("max_hr_entity", this._t("max_hr"))}
      ${this._advancedRow("stress_entity", this._t("stress"))}
      ${this._advancedRow("spo2_entity", this._t("spo2"))}
      ${this._advancedRow("temperature_entity", this._t("temperature"))}
      ${this._advancedRow("pai_entity", this._t("pai"))}
      ${this._advancedRow("training_load_entity", this._t("training_load"))}
    </section>`;
  }

  _editorStyles() {
    return `${super._editorStyles()}
      .z2h-auto-line{display:flex;align-items:center;justify-content:space-between;gap:10px;min-width:0}.z2h-auto-line code{overflow-wrap:anywhere;font-size:11px;color:var(--secondary-text-color)}.z2h-advanced-row{display:grid;gap:5px;padding-top:4px}
    `;
  }

  afterRender(root) {
    root?.querySelector?.("[data-z2h-redetect]")?.addEventListener("click", () => this._detect(true));
    for (const button of root?.querySelectorAll?.("[data-z2h-auto-key]") || []) {
      button.addEventListener("click", () => this._deleteConfigValue(button.dataset.z2hAutoKey));
    }
  }
}

if (!customElements.get("amazfit-health-card-editor")) {
  customElements.define("amazfit-health-card-editor", AmazfitHealthCardEditor);
}

const Z2H_TRAINING_METRIC_SPECS = [
  { key: "last_workout_entity", uniqueSuffixes: ["last_workout"], originalNames: ["Last Workout"] },
  { key: "training_load_entity", uniqueSuffixes: ["training_load"], originalNames: ["Training Load"] },
  { key: "workout_count_entity", uniqueSuffixes: ["workout_history", "workout_count"], entitySuffixes: ["workout_count"], originalNames: ["Count", "Workout Count"] },
];

class AmazfitTrainingCard extends HTMLElement {
  setConfig(config) {
    const seed = config?.last_workout_entity || config?.entity || "";
    const previous = this.config?.last_workout_entity || null;
    this.config = {
      title: null,
      language: "auto",
      last_workout_entity: seed,
      training_load_entity: null,
      workout_count_entity: null,
      show_recovery: true,
      show_vo2: true,
      show_recent: true,
      recent_limit: 5,
      ...config,
      last_workout_entity: seed,
    };
    if (previous !== seed) {
      this._trainingDiscovered = {};
      this._trainingDiscoverySeed = null;
      this._trainingDiscoveryReady = false;
      this._trainingDiscoveryPromise = null;
    }
    if (this._hass) this._ensureDiscoveredMetrics();
  }

  set hass(hass) {
    this._hass = hass;
    this.render();
    this._ensureDiscoveredMetrics();
  }

  getCardSize() { return 5; }

  static getConfigElement() { return document.createElement("amazfit-training-card-editor"); }

  static getStubConfig(hass, entities) {
    const spec = Z2H_TRAINING_METRIC_SPECS[0];
    return { last_workout_entity: z2hFindSeedFromStates(hass, spec, entities) || "", language: "auto" };
  }

  _lang() {
    if (["ru", "en"].includes(this.config?.language)) return this.config.language;
    const lang = String(this._hass?.language || navigator.language || "en").toLowerCase();
    return lang.startsWith("ru") ? "ru" : "en";
  }

  _t(key) {
    const tr = {
      ru: {
        title: "Тренировки", last_workout: "Последняя тренировка", duration: "Длительность", training_load: "Нагрузка",
        recovery: "Восстановление", vo2: "VO₂ Max", recent: "Последние тренировки", total: "Всего тренировок",
        no_workout: "Нет данных о тренировках", hours: "ч", minutes: "мин", points: "баллов",
      },
      en: {
        title: "Training", last_workout: "Last workout", duration: "Duration", training_load: "Training load",
        recovery: "Recovery", vo2: "VO₂ Max", recent: "Recent workouts", total: "Total workouts",
        no_workout: "No workout data", hours: "h", minutes: "min", points: "points",
      },
    };
    return tr[this._lang()][key] ?? key;
  }

  _resolvedMappings() {
    return z2hResolveMappings({
      config: this.config || {},
      discovered: this._trainingDiscovered || {},
      mappingKeys: Z2H_TRAINING_METRIC_SPECS.map((spec) => spec.key),
    });
  }

  async _ensureDiscoveredMetrics(force = false) {
    const seed = this.config?.last_workout_entity;
    if (!seed || !this._hass?.callWS) return this._trainingDiscovered || {};
    if (!force && this._trainingDiscoveryReady && this._trainingDiscoverySeed === seed) return this._trainingDiscovered || {};
    if (!force && this._trainingDiscoveryPromise && this._trainingDiscoverySeed === seed) return this._trainingDiscoveryPromise;
    this._trainingDiscoverySeed = seed;
    const requestSeed = seed;
    const promise = z2hFetchEntityRegistry(this._hass)
      .then((registry) => {
        if (this.config?.last_workout_entity !== requestSeed) return this._trainingDiscovered || {};
        this._trainingDiscovered = z2hDiscoverSameDevice({
          registry,
          seedEntityId: requestSeed,
          platform: "zepp2hass",
          metricSpecs: Z2H_TRAINING_METRIC_SPECS,
        });
        this._trainingDiscoveryReady = true;
        this.render();
        return this._trainingDiscovered;
      })
      .catch(() => {
        if (this.config?.last_workout_entity === requestSeed) this._trainingDiscoveryReady = true;
        return this._trainingDiscovered || {};
      })
      .finally(() => {
        if (this._trainingDiscoveryPromise === promise) this._trainingDiscoveryPromise = null;
      });
    this._trainingDiscoveryPromise = promise;
    return promise;
  }

  _state(entityId) {
    if (!entityId) return null;
    const state = this._hass?.states?.[entityId];
    if (!state || state.state === "unknown" || state.state === "unavailable") return null;
    return state;
  }

  _number(value, digits = 0) {
    const n = Number(value);
    if (!Number.isFinite(n)) return "—";
    return new Intl.NumberFormat(this._lang() === "ru" ? "ru-RU" : "en-US", { maximumFractionDigits: digits }).format(n).replace(/[\u00a0\u202f]/g, " ");
  }

  _dateTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value || "");
    return new Intl.DateTimeFormat(this._lang() === "ru" ? "ru-RU" : "en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false }).format(date).replace(/\.$/, "");
  }

  _parseRecent(text) {
    const raw = String(text || "");
    const match = raw.match(/^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})\s+-\s+(.+?)\s+\((\d+)\s+min\)$/i);
    if (!match) return { title: raw, meta: "" };
    const [, date, time, sport, minutes] = match;
    const parsed = new Date(`${date}T${time}:00`);
    const when = Number.isNaN(parsed.getTime()) ? `${date} ${time}` : this._dateTime(parsed);
    return { title: sport, meta: `${when} · ${minutes} ${this._t("minutes")}` };
  }

  _styles() {
    return `
      ha-card{padding:18px;border-radius:var(--ha-card-border-radius,16px);overflow:hidden}.training-head{display:flex;align-items:center;gap:10px;margin-bottom:15px}.training-icon{width:38px;height:38px;border-radius:50%;display:grid;place-items:center;background:color-mix(in srgb,var(--primary-color) 14%,transparent);color:var(--primary-color)}.training-title{font-size:21px;font-weight:750}
      .training-last{padding:15px;border-radius:15px;background:color-mix(in srgb,var(--primary-color) 8%,transparent);margin-bottom:10px}.training-kicker{font-size:10px;color:var(--secondary-text-color);text-transform:uppercase;letter-spacing:.04em}.training-sport{margin-top:4px;font-size:25px;font-weight:800;line-height:1.1}.training-last-meta{margin-top:8px;display:flex;gap:12px;flex-wrap:wrap;font-size:11px;color:var(--secondary-text-color)}
      .training-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.training-stat{padding:11px;border-radius:13px;background:color-mix(in srgb,var(--primary-text-color) 5%,transparent)}.training-stat strong{display:block;font-size:19px}.training-stat span{display:block;margin-top:2px;font-size:9px;color:var(--secondary-text-color)}
      .training-recent{margin-top:14px}.training-section-title{font-size:12px;font-weight:750;color:var(--secondary-text-color);margin-bottom:7px}.training-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:9px 2px;border-top:1px solid color-mix(in srgb,var(--primary-text-color) 8%,transparent)}.training-row:first-of-type{border-top:0}.training-row-title{font-size:13px;font-weight:650}.training-row-meta{margin-top:2px;font-size:9px;color:var(--secondary-text-color)}.training-count{font-size:10px;color:var(--secondary-text-color);white-space:nowrap}.training-empty{padding:25px 8px;text-align:center;color:var(--secondary-text-color)}
      @media(max-width:420px){.training-stats{grid-template-columns:repeat(2,minmax(0,1fr))}.training-stat:first-child{grid-column:1/-1}}
    `;
  }

  render() {
    if (!this._hass || !this.config) return;
    const mappings = this._resolvedMappings();
    const last = this._state(mappings.last_workout_entity);
    const load = this._state(mappings.training_load_entity);
    const countState = this._state(mappings.workout_count_entity);
    const recent = Array.isArray(countState?.attributes?.recent_workouts) ? countState.attributes.recent_workouts : [];
    const title = this.config.title || this._t("title");
    if (!last && !load && !recent.length) {
      this.innerHTML = `<ha-card><style>${this._styles()}</style><div class="training-head"><div class="training-icon"><ha-icon icon="mdi:run"></ha-icon></div><div class="training-title">${z2hEsc(title)}</div></div><div class="training-empty">${this._t("no_workout")}</div></ha-card>`;
      return;
    }
    const attrs = last?.attributes || {};
    const duration = Number(attrs.duration_minutes);
    const start = attrs.start_time || (attrs.date && attrs.time ? `${attrs.date}T${attrs.time}:00` : "");
    const loadValue = Number(load?.state);
    const loadAttrs = load?.attributes || {};
    const recovery = Number(loadAttrs.full_recovery_time_hours);
    const vo2 = Number(loadAttrs.vo2_max);
    const stats = [
      Number.isFinite(loadValue) ? `<div class="training-stat"><strong>${this._number(loadValue)}</strong><span>${this._t("training_load")}</span></div>` : "",
      this.config.show_recovery !== false && Number.isFinite(recovery) ? `<div class="training-stat"><strong>${this._number(recovery)} ${this._t("hours")}</strong><span>${this._t("recovery")}</span></div>` : "",
      this.config.show_vo2 !== false && Number.isFinite(vo2) && vo2 > 0 ? `<div class="training-stat"><strong>${this._number(vo2, 1)}</strong><span>${this._t("vo2")}</span></div>` : "",
    ].filter(Boolean).join("");
    const limit = Math.max(1, Math.min(10, Number(this.config.recent_limit) || 5));
    const recentRows = this.config.show_recent === false ? "" : recent.slice(0, limit).map((item) => {
      const parsed = this._parseRecent(item);
      return `<div class="training-row"><div><div class="training-row-title">${z2hEsc(parsed.title)}</div>${parsed.meta ? `<div class="training-row-meta">${z2hEsc(parsed.meta)}</div>` : ""}</div></div>`;
    }).join("");
    const count = Number(countState?.state);
    this.innerHTML = `<ha-card><style>${this._styles()}</style><div class="training-head"><div class="training-icon"><ha-icon icon="mdi:run"></ha-icon></div><div class="training-title">${z2hEsc(title)}</div></div>
      ${last ? `<div class="training-last"><div class="training-kicker">${this._t("last_workout")}</div><div class="training-sport">${z2hEsc(last.state)}</div><div class="training-last-meta">${Number.isFinite(duration) ? `<span>${this._t("duration")}: <strong>${this._number(duration)} ${this._t("minutes")}</strong></span>` : ""}${start ? `<span>${z2hEsc(this._dateTime(start))}</span>` : ""}</div></div>` : ""}
      ${stats ? `<div class="training-stats">${stats}</div>` : ""}
      ${recentRows ? `<div class="training-recent"><div class="training-section-title">${this._t("recent")}</div>${recentRows}${Number.isFinite(count) ? `<div class="training-count">${this._t("total")}: ${this._number(count)}</div>` : ""}</div>` : ""}
    </ha-card>`;
  }
}

if (!customElements.get("amazfit-training-card")) customElements.define("amazfit-training-card", AmazfitTrainingCard);
window.customCards = window.customCards || [];
if (!window.customCards.some((card) => card.type === "amazfit-training-card")) {
  window.customCards.push({ type: "amazfit-training-card", name: "Amazfit Training Card", description: "Workout history, training load and recovery", preview: true });
}

class AmazfitTrainingCardEditor extends Z2HBaseEditor {
  constructor() {
    super();
    this._discovered = {};
    this._detecting = false;
    this._detectError = null;
    this._detectedSeed = null;
  }

  setConfig(config) {
    const previous = this._config?.last_workout_entity;
    super.setConfig(config);
    if (previous !== this._config?.last_workout_entity) {
      this._discovered = {};
      this._detectedSeed = null;
      this._detectError = null;
    }
    this._detect(false);
  }

  set hass(hass) { super.hass = hass; this._detect(false); }

  _lang() {
    const lang = String(this._hass?.language || navigator.language || "en").toLowerCase();
    return lang.startsWith("ru") ? "ru" : "en";
  }

  _t(key) {
    const tr = {
      ru: {
        source: "Источник данных", last_workout: "Последняя тренировка", auto: "Автоопределение", redetect: "Определить заново",
        detecting: "Ищу сущности Zepp2Hass…", detected: "Найдено", none: "Сопутствующие сущности не найдены", detect_error: "Не удалось прочитать реестр сущностей",
        display: "Показывать", recovery: "Восстановление", vo2: "VO₂ Max", recent: "Последние тренировки", recent_limit: "Количество последних тренировок",
        entities: "Сущности", entities_note: "Ручные сущности имеют приоритет. Auto возвращает автоопределение.", automatic: "Auto", training_load: "Тренировочная нагрузка", workout_count: "История тренировок",
        language: "Язык", automatic_language: "Авто", russian: "Русский", english: "English",
      },
      en: {
        source: "Data source", last_workout: "Last workout", auto: "Auto-discovery", redetect: "Re-detect",
        detecting: "Finding Zepp2Hass entities…", detected: "Found", none: "No companion entities found", detect_error: "Could not read the entity registry",
        display: "Display", recovery: "Recovery", vo2: "VO₂ Max", recent: "Recent workouts", recent_limit: "Recent workout count",
        entities: "Entities", entities_note: "Manual entities take priority. Auto restores discovery.", automatic: "Auto", training_load: "Training load", workout_count: "Workout history",
        language: "Language", automatic_language: "Auto", russian: "Русский", english: "English",
      },
    };
    return tr[this._lang()][key] ?? key;
  }

  _bool(key, fallback = true) { return this._config?.[key] === undefined ? fallback : this._config[key] !== false; }

  _setConfigValue(key, value) {
    const seedChanged = key === "last_workout_entity" && value !== this._config?.last_workout_entity;
    super._setConfigValue(key, value);
    if (seedChanged) { this._discovered = {}; this._detectedSeed = null; this._detectError = null; this._detect(true); }
  }

  async _detect(force = false) {
    let seed = this._config?.last_workout_entity || null;
    if (!this._hass?.callWS) return;
    if (!force && seed && this._detectedSeed === seed) return;
    if (this._detecting && !force) return;
    const requestedSeed = seed;
    this._detecting = true;
    this._detectError = null;
    this.render();
    try {
      const registry = await z2hFetchEntityRegistry(this._hass);
      if (requestedSeed !== (this._config?.last_workout_entity || null)) return;
      const spec = Z2H_TRAINING_METRIC_SPECS[0];
      const seedRow = seed ? registry.find((row) => row?.entity_id === seed) : null;
      const validSeed = seedRow?.platform === "zepp2hass" && z2hMetricMatchesRegistryRow(seedRow, spec);
      if (!validSeed) {
        const autoSeed = z2hFindRegistrySeed({ registry, platform: "zepp2hass", metricSpec: spec });
        if (autoSeed) { seed = autoSeed; this._config = { ...(this._config || {}), last_workout_entity: autoSeed }; this._emit(); }
      }
      if (!seed) { this._discovered = {}; this._detectedSeed = null; return; }
      this._discovered = z2hDiscoverSameDevice({ registry, seedEntityId: seed, platform: "zepp2hass", metricSpecs: Z2H_TRAINING_METRIC_SPECS });
      this._detectedSeed = seed;
    } catch (error) {
      this._detectError = error?.message || String(error);
      this._detectedSeed = seed;
    } finally {
      this._detecting = false;
      this.render();
    }
  }

  _status() {
    if (this._detecting) return this._t("detecting");
    if (this._detectError) return this._t("detect_error");
    const count = Object.keys(this._discovered || {}).filter((key) => key !== "last_workout_entity").length;
    return count ? `${this._t("detected")}: ${count}/2` : this._t("none");
  }

  _advancedRow(key, label) {
    const explicit = this._config?.[key] || "";
    const automatic = this._discovered?.[key] || "";
    return `<div class="z2h-advanced-row">${this._entityPickerHtml({ key, label, value: explicit, domains: ["sensor"] })}<div class="z2h-auto-line"><span>${this._t("automatic")}: ${automatic ? `<code>${z2hEsc(automatic)}</code>` : "—"}</span>${explicit ? `<button type="button" class="z2h-button" data-z2h-auto-key="${z2hEsc(key)}">${this._t("automatic")}</button>` : ""}</div></div>`;
  }

  renderContent() {
    if (!this._config) return "";
    return `<section class="z2h-section"><div class="z2h-section-title">${this._t("source")}</div>${this._entityPickerHtml({ key: "last_workout_entity", label: this._t("last_workout"), value: this._config.last_workout_entity || "", domains: ["sensor"] })}<div class="z2h-auto-line"><span class="z2h-section-note"><strong>${this._t("auto")}:</strong> ${z2hEsc(this._status())}</span><button type="button" class="z2h-button" data-z2h-redetect>${this._t("redetect")}</button></div></section>
      <section class="z2h-section"><div class="z2h-section-title">${this._t("display")}</div>${this._toggleHtml("show_recovery", this._t("recovery"), this._bool("show_recovery"))}${this._toggleHtml("show_vo2", this._t("vo2"), this._bool("show_vo2"))}${this._toggleHtml("show_recent", this._t("recent"), this._bool("show_recent"))}${this._numberHtml("recent_limit", this._t("recent_limit"), this._config.recent_limit ?? 5, { min: 1, max: 10, step: 1 })}${this._selectHtml("language", this._t("language"), this._config.language || "auto", [{ value: "auto", label: this._t("automatic_language") },{ value: "ru", label: this._t("russian") },{ value: "en", label: this._t("english") }])}</section>
      <section class="z2h-section"><div class="z2h-section-title">${this._t("entities")}</div><div class="z2h-section-note">${this._t("entities_note")}</div>${this._advancedRow("training_load_entity", this._t("training_load"))}${this._advancedRow("workout_count_entity", this._t("workout_count"))}</section>`;
  }

  _editorStyles() { return `${super._editorStyles()}.z2h-auto-line{display:flex;align-items:center;justify-content:space-between;gap:10px;min-width:0}.z2h-auto-line code{overflow-wrap:anywhere;font-size:11px;color:var(--secondary-text-color)}.z2h-advanced-row{display:grid;gap:5px;padding-top:4px}`; }

  afterRender(root) {
    root?.querySelector?.("[data-z2h-redetect]")?.addEventListener("click", () => this._detect(true));
    for (const button of root?.querySelectorAll?.("[data-z2h-auto-key]") || []) button.addEventListener("click", () => this._deleteConfigValue(button.dataset.z2hAutoKey));
  }
}

if (!customElements.get("amazfit-training-card-editor")) customElements.define("amazfit-training-card-editor", AmazfitTrainingCardEditor);


class FamilyActivityCard extends HTMLElement {
  setConfig(config) {
    this.config = {
      title: null,
      language: "auto",
      participants: [],
      show_today: true,
      show_week: true,
      show_month: true,
      show_target_percent: true,
      ...config,
      participants: Array.isArray(config?.participants) ? config.participants : [],
    };
    const signature = this._participantSignature();
    if (this._familySignature !== signature) {
      this._familySignature = signature;
      this._historyCache = {};
      this._historyLoading = {};
    }
    this._period = this._period || "today";
    if (!this._periodEnabled(this._period)) this._period = this._firstEnabledPeriod();
  }

  set hass(hass) {
    this._hass = hass;
    this.render();
  }

  getCardSize() { return 5; }

  static getConfigElement() {
    return document.createElement("family-activity-card-editor");
  }

  static getStubConfig(_hass, entities) {
    const steps = (entities || []).find((id) => /steps/i.test(id)) || "sensor.person_steps";
    return {
      participants: [{ id: "p1", name: "Person", steps_entity: steps, target_mode: "entity" }],
      language: "auto",
    };
  }

  _lang() {
    if (["ru", "en"].includes(this.config?.language)) return this.config.language;
    const lang = String(this._hass?.language || navigator.language || "en").toLowerCase();
    return lang.startsWith("ru") ? "ru" : "en";
  }

  _t(key) {
    const tr = {
      ru: {
        title: "Семейная активность", today: "Сегодня", week: "Неделя", month: "Месяц",
        loading: "Загружаю историю…", history_error: "История недоступна", retry: "Повторить",
        empty: "Добавьте участников в настройках", invalid: "Заполните имя и сущность шагов участника",
        average: "Среднее", best: "Лучший день", goal_days: "Дней с целью", leader_gap: "До лидера", previous_gap: "До предыдущего",
        steps: "шагов",
      },
      en: {
        title: "Family activity", today: "Today", week: "Week", month: "Month",
        loading: "Loading history…", history_error: "History unavailable", retry: "Retry",
        empty: "Add participants in card settings", invalid: "Complete participant name and steps entity",
        average: "Average", best: "Best day", goal_days: "Goal days", leader_gap: "To leader", previous_gap: "To previous",
        steps: "steps",
      },
    };
    return tr[this._lang()][key] ?? key;
  }

  _fmt(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return "—";
    const locale = this._lang() === "ru" ? "ru-RU" : "en-US";
    return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(n).replace(/[\u00a0\u202f,]/g, (m) => m === "," && locale === "en-US" ? " " : " ");
  }

  _participantSignature() {
    return JSON.stringify((this.config?.participants || []).map((p) => [p?.id || "", p?.steps_entity || "", p?.target_mode || "", p?.manual_target ?? null]));
  }

  _normalizedParticipants() {
    return z2hNormalizeParticipants(this.config?.participants || []);
  }

  _periodEnabled(period) {
    if (period === "today") return this.config?.show_today !== false;
    if (period === "week") return this.config?.show_week !== false;
    if (period === "month") return this.config?.show_month !== false;
    return false;
  }

  _firstEnabledPeriod() {
    return ["today", "week", "month"].find((period) => this._periodEnabled(period)) || "today";
  }

  _timeZone() {
    return this._hass?.config?.time_zone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  }

  _tabsHtml() {
    const periods = [
      ["today", this._t("today")],
      ["week", this._t("week")],
      ["month", this._t("month")],
    ].filter(([period]) => this._periodEnabled(period));
    if (periods.length <= 1) return "";
    return `<div class="family-tabs" style="grid-template-columns:repeat(${periods.length},minmax(0,1fr))">${periods.map(([period,label]) => `<button type="button" class="family-tab ${this._period === period ? "active" : ""}" data-family-period="${period}">${label}</button>`).join("")}</div>`;
  }

  _historyKey(period, now = new Date()) {
    const start = z2hPeriodStart(period, now, this._timeZone());
    return `${period}:${start.toISOString()}:${this._participantSignature()}`;
  }

  async _loadPeriod(period, force = false) {
    if (period === "today" || !this._hass?.callWS) return null;
    const participants = this._normalizedParticipants().filter((p) => p.valid);
    const ids = [...new Set(participants.map((p) => p.steps_entity).filter(Boolean))];
    if (!ids.length) return null;
    const now = new Date();
    const timeZone = this._timeZone();
    const start = z2hPeriodStart(period, now, timeZone);
    const todayStart = z2hPeriodStart("today", now, timeZone);
    const key = this._historyKey(period, now);
    this._historyCache = this._historyCache || {};
    this._historyLoading = this._historyLoading || {};
    if (!force && this._historyCache[key]) return this._historyCache[key];
    if (!force && this._historyLoading[key]) return this._historyLoading[key];
    const promise = z2hFetchCompletedDailyChanges(this._hass, ids, start, todayStart)
      .then((completedChanges) => {
        const value = { completedChanges, error: null };
        this._historyCache[key] = value;
        return value;
      })
      .catch((error) => {
        const value = { completedChanges: null, error: error?.message || String(error) };
        this._historyCache[key] = value;
        return value;
      })
      .finally(() => {
        delete this._historyLoading[key];
        this.render();
      });
    this._historyLoading[key] = promise;
    this.render();
    return promise;
  }

  _rowsForPeriod(period, completedChanges = {}) {
    return z2hBuildParticipantPeriodRows({
      participants: this._normalizedParticipants(),
      hass: this._hass,
      completedChanges,
      period,
      now: new Date(),
    });
  }

  _detailHtml(row, rows) {
    if (this._expandedId !== row.id) return "";
    const daily = (row.dailySteps || []).filter((value) => Number.isFinite(Number(value))).map(Number);
    if (!daily.length) return "";
    const average = Math.round(daily.reduce((sum, value) => sum + value, 0) / daily.length);
    const best = Math.max(...daily);
    const goalDays = Number.isFinite(Number(row.dailyTarget)) && row.dailyTarget > 0 ? daily.filter((value) => value >= row.dailyTarget).length : null;
    const leader = rows[0];
    const rowIndex = rows.findIndex((candidate) => candidate.id === row.id);
    const previousHigher = rows.slice(0, rowIndex).reverse().find((candidate) => candidate.steps > row.steps);
    const leaderGap = leader && leader.id !== row.id ? Math.max(0, leader.steps - row.steps) : null;
    const previousGap = previousHigher ? Math.max(0, previousHigher.steps - row.steps) : null;
    const cells = [
      `<div><strong>${this._fmt(average)}</strong><span>${this._t("average")}</span></div>`,
      `<div><strong>${this._fmt(best)}</strong><span>${this._t("best")}</span></div>`,
      ...(goalDays !== null ? [`<div><strong>${goalDays} / ${daily.length}</strong><span>${this._t("goal_days")}</span></div>`] : []),
      ...(leaderGap !== null ? [`<div><strong>−${this._fmt(leaderGap)}</strong><span>${this._t("leader_gap")}</span></div>`] : []),
      ...(previousGap !== null && previousGap !== leaderGap ? [`<div><strong>−${this._fmt(previousGap)}</strong><span>${this._t("previous_gap")}</span></div>`] : []),
    ];
    return `<div class="family-details">${cells.join("")}</div>`;
  }

  _rowsHtml(rows) {
    if (!rows.length) return `<div class="family-empty">${this._t("empty")}</div>`;
    const leaderSteps = Math.max(0, Number(rows[0]?.steps) || 0);
    return `<div class="family-list">${rows.map((row) => {
      const width = leaderSteps > 0 ? Math.max(0, Math.min(100, (row.steps / leaderSteps) * 100)) : 0;
      const target = this.config?.show_target_percent !== false && Number.isFinite(Number(row.targetPercent)) ? `<span class="family-target-percent">${Math.round(row.targetPercent)}%</span>` : "";
      const rankHtml = row.rank === 1
        ? `<span class="family-rank family-medal gold" data-rank="1"><span class="family-medal-disc">1</span></span>`
        : row.rank === 2
          ? `<span class="family-rank family-medal silver" data-rank="2"><span class="family-medal-disc">2</span></span>`
          : row.rank === 3
            ? `<span class="family-rank family-medal bronze" data-rank="3"><span class="family-medal-disc">3</span></span>`
            : `<span class="family-rank family-rank-number" data-rank="${row.rank}">${row.rank}</span>`;
      return `<div class="family-person ${row.rank <= 3 ? `family-top family-top-${row.rank}` : ""}" data-family-id="${z2hEsc(row.id || row.name || "")}">
        <button type="button" class="family-row" data-family-row="${z2hEsc(row.id || "")}">
          ${rankHtml}
          <span class="family-name">${z2hEsc(row.name)}</span>
          <strong class="family-steps">${this._fmt(row.steps)}</strong>
          ${target}
          <span class="family-bar-track"><span class="family-bar" style="width:${width.toFixed(1)}%"></span></span>
        </button>
        ${this._detailHtml(row, rows)}
      </div>`;
    }).join("")}</div>`;
  }

  _renderPeriod() {
    const valid = this._normalizedParticipants().filter((participant) => participant.valid);
    const invalidCount = this._normalizedParticipants().length - valid.length;
    const warning = invalidCount ? `<div class="family-warning">${this._t("invalid")}</div>` : "";
    if (!valid.length) return `${warning}<div class="family-empty">${this._t("empty")}</div>`;
    if (this._period === "today") return `${warning}${this._rowsHtml(this._rowsForPeriod("today", {}))}`;
    const now = new Date();
    const key = this._historyKey(this._period, now);
    const cached = this._historyCache?.[key];
    if (!cached && !this._historyLoading?.[key]) this._loadPeriod(this._period);
    if (this._historyLoading?.[key] && !cached) return `${warning}<div class="family-empty">${this._t("loading")}</div>`;
    if (cached?.error) return `${warning}<div class="family-empty">${this._t("history_error")}<br><button type="button" class="family-retry" data-family-retry="${this._period}">${this._t("retry")}</button></div>`;
    return `${warning}${this._rowsHtml(this._rowsForPeriod(this._period, cached?.completedChanges || {}))}`;
  }

  _styles() {
    return `
      ha-card{padding:18px;border-radius:var(--ha-card-border-radius,16px);overflow:hidden}.family-head{display:flex;align-items:center;gap:10px;margin-bottom:14px}.family-icon{width:38px;height:38px;border-radius:50%;display:grid;place-items:center;background:color-mix(in srgb,var(--primary-color) 14%,transparent);color:var(--primary-color)}.family-title{font-size:21px;font-weight:750}
      .family-tabs{display:grid;gap:5px;padding:4px;border-radius:12px;background:color-mix(in srgb,var(--primary-text-color) 6%,transparent);margin-bottom:14px}.family-tab{border:0;border-radius:9px;padding:8px 6px;background:transparent;color:var(--secondary-text-color);font:inherit;font-size:12px;font-weight:650}.family-tab.active{background:var(--ha-card-background,var(--card-background-color));color:var(--primary-color);box-shadow:0 1px 5px rgba(0,0,0,.12)}
      .family-list{display:grid;gap:7px}.family-person{border-radius:13px;background:color-mix(in srgb,var(--primary-text-color) 4.5%,transparent);overflow:hidden;border:1px solid transparent}.family-person.family-top{background:color-mix(in srgb,var(--primary-text-color) 4%,transparent)}.family-person.family-top-1{border-color:color-mix(in srgb,#d8a400 36%,transparent)}.family-person.family-top-2{border-color:color-mix(in srgb,#9aa0a6 34%,transparent)}.family-person.family-top-3{border-color:color-mix(in srgb,#b86b35 34%,transparent)}.family-row{width:100%;display:grid;grid-template-columns:34px minmax(0,1fr) auto auto;gap:5px 9px;align-items:center;padding:11px 12px;border:0;background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer}.family-rank{grid-row:1/3;font-size:20px;font-weight:800;color:var(--primary-color);text-align:center}.family-rank-number{display:grid;place-items:center}.family-medal{position:relative;width:30px;height:34px;display:grid;place-items:start center;color:#222}.family-medal:before,.family-medal:after{content:"";position:absolute;top:20px;width:8px;height:12px;border-radius:1px;background:currentColor;opacity:.68}.family-medal:before{left:7px;transform:rotate(12deg)}.family-medal:after{right:7px;transform:rotate(-12deg)}.family-medal-disc{position:relative;z-index:2;width:25px;height:25px;border-radius:50%;display:grid;place-items:center;font-size:11px;font-weight:900;border:2px solid color-mix(in srgb,#fff 56%,transparent);box-shadow:0 2px 5px rgba(0,0,0,.22)}.family-medal.gold{color:#d8a400}.family-medal.gold .family-medal-disc{background:#f4c542}.family-medal.silver{color:#92979d}.family-medal.silver .family-medal-disc{background:#c8ccd0}.family-medal.bronze{color:#a85e2e}.family-medal.bronze .family-medal-disc{background:#cd7f4b}.family-name{font-size:14px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.family-steps{font-size:17px;text-align:right;white-space:nowrap}.family-target-percent{min-width:43px;text-align:right;font-size:11px;font-weight:750;color:var(--primary-color)}.family-bar-track{grid-column:2/-1;height:6px;border-radius:99px;background:color-mix(in srgb,var(--primary-text-color) 10%,transparent);overflow:hidden}.family-bar{display:block;height:100%;border-radius:inherit;background:var(--primary-color)}
      .family-details{display:grid;grid-template-columns:repeat(auto-fit,minmax(88px,1fr));gap:6px;padding:0 12px 12px 51px}.family-details div{padding:8px 9px;border-radius:10px;background:color-mix(in srgb,var(--primary-text-color) 5%,transparent)}.family-details strong{display:block;font-size:14px}.family-details span{font-size:9px;color:var(--secondary-text-color)}.family-warning{padding:10px 12px;margin-bottom:8px;border-radius:11px;background:color-mix(in srgb,var(--warning-color,#f5a623) 12%,transparent);color:var(--primary-text-color);font-size:12px}.family-empty{padding:24px 12px;text-align:center;color:var(--secondary-text-color)}.family-retry{margin-top:9px;border:1px solid var(--divider-color);border-radius:9px;padding:7px 11px;background:transparent;color:var(--primary-color)}
      @media(max-width:420px){.family-row{grid-template-columns:27px minmax(0,1fr) auto}.family-target-percent{grid-column:3}.family-steps{grid-column:3}.family-name{grid-row:1/3}.family-bar-track{grid-column:2/-1}.family-details{padding-left:48px}}
    `;
  }

  _setupInteractions() {
    for (const button of this.querySelectorAll?.("[data-family-period]") || []) {
      button.addEventListener("click", () => {
        this._period = button.dataset.familyPeriod;
        this.render();
      });
    }
    for (const button of this.querySelectorAll?.("[data-family-retry]") || []) {
      button.addEventListener("click", () => this._loadPeriod(button.dataset.familyRetry, true));
    }
    for (const button of this.querySelectorAll?.("[data-family-row]") || []) {
      button.addEventListener("click", () => {
        const id = button.dataset.familyRow;
        this._expandedId = this._expandedId === id ? null : id;
        this.render();
      });
    }
  }

  render() {
    if (!this._hass || !this.config) return;
    if (!this._periodEnabled(this._period)) this._period = this._firstEnabledPeriod();
    const title = this.config.title || this._t("title");
    this.innerHTML = `<ha-card><style>${this._styles()}</style><div class="family-head"><div class="family-icon"><ha-icon icon="mdi:account-group"></ha-icon></div><div class="family-title">${z2hEsc(title)}</div></div>${this._tabsHtml()}${this._renderPeriod()}</ha-card>`;
    this._setupInteractions();
  }
}

if (!customElements.get("family-activity-card")) customElements.define("family-activity-card", FamilyActivityCard);
window.customCards = window.customCards || [];
if (!window.customCards.some((card) => card.type === "family-activity-card")) {
  window.customCards.push({ type: "family-activity-card", name: "Family Activity Card", description: "Absolute-step family leaderboard for Home Assistant", preview: true });
}

class FamilyActivityCardEditor extends Z2HBaseEditor {
  constructor() {
    super();
    this._participantCounter = 0;
  }

  setConfig(config) {
    const participants = (Array.isArray(config?.participants) ? config.participants : []).map((participant) => {
      const { distance_entity: _distance, calories_entity: _calories, ...stepsOnly } = participant || {};
      return stepsOnly;
    });
    super.setConfig({ ...(config || {}), participants });
  }

  _lang() {
    const lang = String(this._hass?.language || navigator.language || "en").toLowerCase();
    return lang.startsWith("ru") ? "ru" : "en";
  }

  _t(key) {
    const tr = {
      ru: {
        periods: "Периоды", today: "Сегодня", week: "Неделя", month: "Месяц", target_percent: "Показывать % личной цели",
        language: "Язык", automatic: "Авто", russian: "Русский", english: "English",
        participants: "Участники", participants_note: "Рейтинг всегда строится по абсолютным шагам. Порядок здесь нужен только для удобства настройки.",
        add: "Добавить участника", participant: "Участник", name: "Имя", steps: "Шаги",
        target_mode: "Личная цель", target_entity: "Из атрибута сущности", target_manual: "Своя", target_none: "Не показывать", manual_target: "Шагов в день",
        up: "Вверх", down: "Вниз", remove: "Удалить",
      },
      en: {
        periods: "Periods", today: "Today", week: "Week", month: "Month", target_percent: "Show personal target %",
        language: "Language", automatic: "Auto", russian: "Русский", english: "English",
        participants: "Participants", participants_note: "Ranking always uses absolute steps. This order is only for configuration convenience.",
        add: "Add participant", participant: "Participant", name: "Name", steps: "Steps",
        target_mode: "Personal target", target_entity: "From entity attribute", target_manual: "Manual", target_none: "None", manual_target: "Steps per day",
        up: "Up", down: "Down", remove: "Remove",
      },
    };
    return tr[this._lang()][key] ?? key;
  }

  _bool(key, fallback = true) {
    return this._config?.[key] === undefined ? fallback : this._config[key] !== false;
  }

  _participants() {
    return Array.isArray(this._config?.participants) ? this._config.participants : [];
  }

  _setParticipants(participants) {
    this._config = { ...(this._config || {}), participants };
    this._emit();
    this.render();
  }

  _newParticipantId() {
    this._participantCounter += 1;
    const existing = new Set(this._participants().map((participant) => participant?.id).filter(Boolean));
    let id = `p_${Date.now()}_${this._participantCounter}`;
    while (existing.has(id)) {
      this._participantCounter += 1;
      id = `p_${Date.now()}_${this._participantCounter}`;
    }
    return id;
  }

  _addParticipant() {
    const participant = { id: this._newParticipantId(), name: "", steps_entity: "", target_mode: "entity" };
    this._setParticipants([...this._participants(), participant]);
    return participant;
  }

  _updateParticipant(id, patch) {
    const participants = this._participants().map((participant) => participant?.id === id ? { ...participant, ...(patch || {}), id: participant.id } : participant);
    this._setParticipants(participants);
  }

  _removeParticipant(id) {
    this._setParticipants(this._participants().filter((participant) => participant?.id !== id));
  }

  _moveParticipant(id, delta) {
    const participants = [...this._participants()];
    const index = participants.findIndex((participant) => participant?.id === id);
    if (index < 0) return;
    const nextIndex = Math.max(0, Math.min(participants.length - 1, index + Number(delta || 0)));
    if (nextIndex === index) return;
    const [participant] = participants.splice(index, 1);
    participants.splice(nextIndex, 0, participant);
    this._setParticipants(participants);
  }

  _participantEntityHtml(participant, key, label) {
    return `<div class="z2h-field z2h-entity-field">
      <div class="z2h-label">${z2hEsc(label)}</div>
      <ha-entity-picker data-family-entity-id="${z2hEsc(participant.id)}" data-family-entity-key="${z2hEsc(key)}" data-value="${z2hEsc(participant[key] || "")}"></ha-entity-picker>
    </div>`;
  }

  _participantHtml(participant, index, total) {
    const targetMode = ["entity", "manual", "none"].includes(participant?.target_mode) ? participant.target_mode : "entity";
    const targetOptions = [
      ["entity", this._t("target_entity")],
      ["manual", this._t("target_manual")],
      ["none", this._t("target_none")],
    ].map(([value,label]) => `<option value="${value}" ${targetMode === value ? "selected" : ""}>${z2hEsc(label)}</option>`).join("");
    return `<div class="family-editor-person" data-family-editor-person="${z2hEsc(participant.id)}">
      <div class="family-editor-person-head"><strong>${z2hEsc(participant.name || `${this._t("participant")} ${index + 1}`)}</strong><span>#${index + 1}</span></div>
      <label class="z2h-field"><span class="z2h-label">${this._t("name")}</span><input type="text" value="${z2hEsc(participant.name || "")}" data-family-text-id="${z2hEsc(participant.id)}" data-family-text-key="name"></label>
      ${this._participantEntityHtml(participant, "steps_entity", this._t("steps"))}
      <label class="z2h-field"><span class="z2h-label">${this._t("target_mode")}</span><select data-family-target-mode="${z2hEsc(participant.id)}">${targetOptions}</select></label>
      ${targetMode === "manual" ? `<label class="z2h-field"><span class="z2h-label">${this._t("manual_target")}</span><input type="number" min="1" max="100000" step="500" value="${z2hEsc(participant.manual_target ?? 10000)}" data-family-manual-target="${z2hEsc(participant.id)}"></label>` : ""}
      <div class="z2h-actions family-editor-actions">
        <button type="button" class="z2h-button" data-family-move="-1" data-family-id="${z2hEsc(participant.id)}" ${index === 0 ? "disabled" : ""}>${this._t("up")}</button>
        <button type="button" class="z2h-button" data-family-move="1" data-family-id="${z2hEsc(participant.id)}" ${index === total - 1 ? "disabled" : ""}>${this._t("down")}</button>
        <button type="button" class="z2h-button danger" data-family-remove="${z2hEsc(participant.id)}">${this._t("remove")}</button>
      </div>
    </div>`;
  }

  renderContent() {
    if (!this._config) return "";
    const participants = this._participants();
    return `<section class="z2h-section">
      <div class="z2h-section-title">${this._t("periods")}</div>
      ${this._toggleHtml("show_today", this._t("today"), this._bool("show_today"))}
      ${this._toggleHtml("show_week", this._t("week"), this._bool("show_week"))}
      ${this._toggleHtml("show_month", this._t("month"), this._bool("show_month"))}
      ${this._toggleHtml("show_target_percent", this._t("target_percent"), this._bool("show_target_percent"))}
      ${this._selectHtml("language", this._t("language"), this._config.language || "auto", [
        { value: "auto", label: this._t("automatic") },
        { value: "ru", label: this._t("russian") },
        { value: "en", label: this._t("english") },
      ])}
    </section>
    <section class="z2h-section">
      <div class="family-editor-section-head"><div><div class="z2h-section-title">${this._t("participants")}</div><div class="z2h-section-note">${this._t("participants_note")}</div></div><button type="button" class="z2h-button" data-family-add>+ ${this._t("add")}</button></div>
      <div class="family-editor-list">${participants.map((participant,index) => this._participantHtml(participant,index,participants.length)).join("")}</div>
    </section>`;
  }

  _editorStyles() {
    return `${super._editorStyles()}
      .family-editor-section-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.family-editor-list{display:grid;gap:12px}.family-editor-person{display:grid;gap:9px;padding:12px;border-radius:12px;background:color-mix(in srgb,var(--primary-text-color) 4%,transparent)}.family-editor-person-head{display:flex;justify-content:space-between;gap:10px}.family-editor-person-head span{color:var(--secondary-text-color);font-size:11px}.family-editor-actions{margin-top:2px}.z2h-button.danger{color:var(--error-color,#db4437)}.z2h-button:disabled{opacity:.4;cursor:default}
    `;
  }

  afterRender(root) {
    root?.querySelector?.("[data-family-add]")?.addEventListener("click", () => this._addParticipant());
    for (const input of root?.querySelectorAll?.("[data-family-text-id]") || []) {
      input.addEventListener("change", () => this._updateParticipant(input.dataset.familyTextId, { [input.dataset.familyTextKey]: input.value }));
    }
    for (const picker of root?.querySelectorAll?.("[data-family-entity-id]") || []) {
      picker.hass = this._hass;
      picker.value = picker.dataset.value || "";
      picker.includeDomains = ["sensor"];
      picker.addEventListener("value-changed", (event) => this._updateParticipant(picker.dataset.familyEntityId, { [picker.dataset.familyEntityKey]: event?.detail?.value || "" }));
    }
    for (const select of root?.querySelectorAll?.("[data-family-target-mode]") || []) {
      select.addEventListener("change", () => this._updateParticipant(select.dataset.familyTargetMode, { target_mode: select.value }));
    }
    for (const input of root?.querySelectorAll?.("[data-family-manual-target]") || []) {
      input.addEventListener("change", () => {
        const value = Number(input.value);
        if (Number.isFinite(value) && value > 0) this._updateParticipant(input.dataset.familyManualTarget, { manual_target: value });
      });
    }
    for (const button of root?.querySelectorAll?.("[data-family-move]") || []) {
      button.addEventListener("click", () => this._moveParticipant(button.dataset.familyId, Number(button.dataset.familyMove)));
    }
    for (const button of root?.querySelectorAll?.("[data-family-remove]") || []) {
      button.addEventListener("click", () => this._removeParticipant(button.dataset.familyRemove));
    }
  }
}

if (!customElements.get("family-activity-card-editor")) {
  customElements.define("family-activity-card-editor", FamilyActivityCardEditor);
}
