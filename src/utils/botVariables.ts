// Pure helpers for BotVariablesModal, unchanged from the React Native app.
import {
  BotVariable,
  BotInput,
  BotDictionaryEntry,
  BotDictionaryEntryValue,
  DictionaryValueSubtype,
} from '../types';

export const ARGENTINA_TIMEZONE = '-03 (UTC-3:00) Buenos Aires, America';
export const ARGENTINA_TIMEZONE_ID = 'America/Argentina/Buenos_Aires';
export const ARGENTINA_OFFSET = '-03:00';

export const KNOWN_INPUT_TYPES = new Set([
  'BOOLEAN',
  'STRING',
  'NUMBER',
  'DATETIME',
  'DICTIONARY',
]);

export const DICTIONARY_VALUE_SUBTYPES: DictionaryValueSubtype[] = [
  'ANY',
  'STRING',
  'NUMBER',
  'BOOLEAN',
];

export type DictionaryFixedSubtype = 'STRING' | 'NUMBER' | 'BOOLEAN';

export type DictionaryConstraint =
  | { locked: true; subtype: DictionaryFixedSubtype }
  | { locked: false };

export const normalizeDictionaryValue = (raw: unknown): BotDictionaryEntryValue => {
  if (!raw || typeof raw !== 'object') {
    return { type: 'STRING', string: '' };
  }
  const r = raw as Record<string, unknown>;
  const t = String(r.type || 'STRING').toUpperCase();
  if (t === 'NUMBER') {
    const n = r.number;
    return {
      type: 'NUMBER',
      number: typeof n === 'number' ? n : Number(n) || 0,
    };
  }
  if (t === 'BOOLEAN') {
    return { type: 'BOOLEAN', boolean: !!r.boolean };
  }
  if (t === 'ANY') {
    return { type: 'ANY', string: r.string != null ? String(r.string) : '' };
  }
  return { type: 'STRING', string: r.string != null ? String(r.string) : '' };
};

export const coerceValueToFixedSubtype = (
  raw: unknown,
  subtype: DictionaryFixedSubtype
): BotDictionaryEntryValue => {
  const n = normalizeDictionaryValue(raw);
  if (subtype === 'BOOLEAN') {
    if (n.type === 'BOOLEAN') {
      return { type: 'BOOLEAN', boolean: !!n.boolean };
    }
    if (n.type === 'NUMBER') {
      return { type: 'BOOLEAN', boolean: !!n.number };
    }
    const s = (n.string ?? '').toLowerCase();
    return {
      type: 'BOOLEAN',
      boolean: s === 'true' || s === '1' || s === 'yes',
    };
  }
  if (subtype === 'NUMBER') {
    if (n.type === 'NUMBER') {
      return { type: 'NUMBER', number: n.number ?? 0 };
    }
    if (n.type === 'BOOLEAN') {
      return { type: 'NUMBER', number: n.boolean ? 1 : 0 };
    }
    return { type: 'NUMBER', number: Number(n.string) || 0 };
  }
  if (n.type === 'STRING') {
    return { type: 'STRING', string: n.string ?? '' };
  }
  if (n.type === 'NUMBER') {
    return { type: 'STRING', string: String(n.number ?? '') };
  }
  if (n.type === 'BOOLEAN') {
    return { type: 'STRING', string: n.boolean ? 'true' : 'false' };
  }
  return { type: 'STRING', string: n.string ?? '' };
};

export const getDictionaryConstraint = (variable: BotVariable): DictionaryConstraint => {
  const dv = variable.defaultValue as Record<string, unknown>;
  const props = variable.properties;

  const metaCandidates = [
    dv.dictionarySubtype,
    dv.dictionaryValueSubtype,
    dv.valueSubtype,
    dv.entryValueType,
    props?.dictionarySubtype,
    props?.dictionaryValueSubtype,
    props?.valueSubtype,
    props?.entryValueType,
    props?.subtype,
  ]
    .filter(v => v != null && String(v).trim() !== '')
    .map(v => String(v).toUpperCase());

  for (const t of metaCandidates) {
    if (t === 'STRING' || t === 'NUMBER' || t === 'BOOLEAN') {
      return { locked: true, subtype: t };
    }
    if (t === 'ANY') {
      return { locked: false };
    }
  }

  const dvType = String(dv.type || '').toUpperCase();
  if (
    variable.type?.toUpperCase() === 'DICTIONARY' &&
    (dvType === 'STRING' || dvType === 'NUMBER' || dvType === 'BOOLEAN')
  ) {
    return { locked: true, subtype: dvType };
  }

  return { locked: false };
};

export const parseDictionaryFromVariable = (variable: BotVariable): BotDictionaryEntry[] => {
  const c = getDictionaryConstraint(variable);
  const dict = variable.defaultValue.dictionary;

  if (Array.isArray(dict) && dict.length > 0) {
    return dict.map((entry: unknown) => {
      const e = entry as Record<string, unknown>;
      const key = String(e?.key ?? '');
      const value = c.locked
        ? coerceValueToFixedSubtype(e?.value, c.subtype)
        : normalizeDictionaryValue(e?.value);
      return { key, value };
    });
  }

  if (c.locked) {
    return [{ key: '', value: defaultValueForSubtype(c.subtype) }];
  }
  return [{ key: '', value: { type: 'STRING', string: '' } }];
};

export const defaultValueForSubtype = (subtype: DictionaryValueSubtype): BotDictionaryEntryValue => {
  if (subtype === 'BOOLEAN') {
    return { type: 'BOOLEAN', boolean: false };
  }
  if (subtype === 'NUMBER') {
    return { type: 'NUMBER', number: 0 };
  }
  if (subtype === 'ANY') {
    return { type: 'ANY', string: '' };
  }
  return { type: 'STRING', string: '' };
};

export const buildLockedVariableInput = (variable: BotVariable): BotInput[string] => {
  const dv = variable.defaultValue;
  const out: BotInput[string] = { type: variable.type };
  if (dv.boolean !== undefined) {
    out.boolean = dv.boolean;
  }
  if (dv.string !== undefined) {
    out.string = dv.string;
  }
  if (dv.number !== undefined) {
    out.number = dv.number;
  }
  if (dv.datetime !== undefined) {
    out.datetime = dv.datetime;
  }
  return out;
};

export const formatLockedDefaultDisplay = (variable: BotVariable): string => {
  const dv = variable.defaultValue;
  const parts: string[] = [];
  if (dv.boolean !== undefined) {
    parts.push(dv.boolean ? 'True' : 'False');
  }
  if (dv.string !== undefined && dv.string !== '') {
    parts.push(dv.string);
  }
  if (dv.number !== undefined) {
    parts.push(String(dv.number));
  }
  if (dv.datetime !== undefined) {
    parts.push(String(dv.datetime));
  }
  if (parts.length > 0) {
    return parts.join(' · ');
  }
  return '(empty)';
};

