/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { Timezone } from '../models/office.model';

/** Fixed GMT offset zones (ADR-0009 D4): "GMT-12:00" … "GMT+14:00", no daylight saving. */
const FIXED_GMT = /^GMT[+-]\d{2}:\d{2}$/;

/** "(UTC-05:00) …" / "(UTC+05:30) …" / "(UTC) …" at the start of a description. */
const OFFSET_PREFIX = /^\(UTC(?:([+-])(\d{2}):(\d{2}))?\)/;

/** Standard offset in minutes, parsed from the description prefix; 0 for "(UTC)" or no prefix. */
export function timezoneOffsetMinutes(tz: Timezone): number {
  const m = OFFSET_PREFIX.exec(tz.description ?? '');
  if (!m || !m[1]) return 0;
  const minutes = Number(m[2]) * 60 + Number(m[3]);
  return m[1] === '-' ? -minutes : minutes;
}

/** True for the fixed GMT offset zones (name like "GMT-05:00"). */
export function isFixedGmt(tz: Timezone): boolean {
  return FIXED_GMT.test(tz.timezoneName ?? '');
}

/** New array ordered by offset (west → east), then by description. */
export function sortTimezones(list: readonly Timezone[]): Timezone[] {
  return [...list].sort(
    (a, b) =>
      timezoneOffsetMinutes(a) - timezoneOffsetMinutes(b) ||
      (a.description || a.timezoneName).localeCompare(b.description || b.timezoneName),
  );
}

/** Splits a list for a picker: named zones and fixed GMT offsets, each sorted by offset. */
export function groupTimezones(list: readonly Timezone[]): { named: Timezone[]; fixed: Timezone[] } {
  const sorted = sortTimezones(list);
  return { named: sorted.filter((t) => !isFixedGmt(t)), fixed: sorted.filter(isFixedGmt) };
}
