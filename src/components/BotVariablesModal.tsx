import React, { useState, useEffect } from 'react';
import { Settings2 } from 'lucide-react';
import { BotVariable, BotInput, Bot, BotDictionaryEntry, BotDictionaryEntryValue, DictionaryValueSubtype } from '../types';
import { getBotContent, getToken } from '../Functions';
import { AVAILABLE_USERS, DEFAULT_PASSWORD } from '../constants/users';
import {
  ARGENTINA_TIMEZONE,
  ARGENTINA_TIMEZONE_ID,
  ARGENTINA_OFFSET,
  KNOWN_INPUT_TYPES,
  DICTIONARY_VALUE_SUBTYPES,
  coerceValueToFixedSubtype,
  getDictionaryConstraint,
  parseDictionaryFromVariable,
  defaultValueForSubtype,
  buildLockedVariableInput,
  formatLockedDefaultDisplay,
} from '../utils/botVariables';
import { ErrorState, LoadingState, Modal, Switch } from './ui';

interface BotVariablesModalProps {
  visible: boolean;
  bot: Bot | null;
  userEmail: string;
  onClose: () => void;
  onConfirm: (botInputs: BotInput) => void;
}

const inputClass =
  'w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-base text-ink outline-none transition placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20';

const getDateTimeParts = (value?: string): { date: string; time: string } => {
  if (!value) {
    return { date: '', time: '' };
  }

  const bracketMatch = value.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(?::\d{2})?[+-]\d{2}:\d{2}\[.+\]$/);
  if (bracketMatch) {
    const hours = Number(bracketMatch[2].split(':')[0]);
    const minutes = bracketMatch[2].split(':')[1];
    const meridiem = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours % 12 || 12;
    return {
      date: bracketMatch[1],
      time: `${hour12.toString().padStart(2, '0')}:${minutes} ${meridiem}`,
    };
  }

  const valueWithoutTimezone = value.replace(ARGENTINA_TIMEZONE, '').trim();
  const isoMatch = valueWithoutTimezone.match(/^(\d{4}-\d{2}-\d{2})[T\s](\d{2}:\d{2}(?::\d{2})?(?:\s?[APMapm]{2})?)/);
  if (isoMatch) {
    return {
      date: isoMatch[1],
      time: isoMatch[2],
    };
  }

  const parts = valueWithoutTimezone.split(' ');
  if (parts.length >= 2) {
    return {
      date: parts[0],
      time: parts.slice(1).join(' '),
    };
  }

  return { date: valueWithoutTimezone, time: '' };
};

const buildDateTimeValue = (date: string, time: string): string => {
  const safeDate = date.trim();
  const safeTime = time.trim();
  if (!safeDate || !safeTime) {
    return '';
  }

  const timeMatch = safeTime.match(/^(\d{1,2}):(\d{2})(?::\d{2})?(?:\s?([APMapm]{2}))?$/);
  if (!timeMatch) {
    return '';
  }

  let hours = Number(timeMatch[1]);
  const minutes = timeMatch[2];
  const meridiem = timeMatch[3]?.toUpperCase();

  if (meridiem === 'PM' && hours < 12) {
    hours += 12;
  }
  if (meridiem === 'AM' && hours === 12) {
    hours = 0;
  }

  const hh = hours.toString().padStart(2, '0');
  return `${safeDate}T${hh}:${minutes}:00${ARGENTINA_OFFSET}[${ARGENTINA_TIMEZONE_ID}]`;
};

/** "02:30 PM" | "14:30" -> "14:30" (value format of <input type="time">). */
const to24h = (time: string): string => {
  const m = time.trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?(?:\s?([APMapm]{2}))?$/);
  if (!m) return '';
  let hours = Number(m[1]);
  const meridiem = m[3]?.toUpperCase();
  if (meridiem === 'PM' && hours < 12) hours += 12;
  if (meridiem === 'AM' && hours === 12) hours = 0;
  return `${hours.toString().padStart(2, '0')}:${m[2]}`;
};

export const BotVariablesModal: React.FC<BotVariablesModalProps> = ({
  visible,
  bot,
  userEmail,
  onClose,
  onConfirm,
}) => {
  const [variables, setVariables] = useState<BotVariable[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inputValues, setInputValues] = useState<BotInput>({});
  // Partially filled DATETIME fields (a date without a time yet), keyed by variable name.
  const [dateTimeDrafts, setDateTimeDrafts] = useState<Record<string, { date: string; time: string }>>({});

  useEffect(() => {
    if (visible && bot) {
      loadBotVariables();
    } else {
      // Reset state when modal is closed
      setVariables([]);
      setInputValues({});
      setDateTimeDrafts({});
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, bot]);

  const loadBotVariables = async () => {
    if (!bot) return;

    setLoading(true);
    setError(null);

    try {
      const user = AVAILABLE_USERS.find(u => u.email === userEmail);
      if (!user) {
        throw new Error('User not found');
      }

      const token = await getToken(user.email, DEFAULT_PASSWORD);
      const botContent = await getBotContent(bot.id, token, user.email);

      const inputVariables = botContent.variables.filter(
        variable => variable.input && variable.type?.toUpperCase() !== 'WINDOW',
      );

      setVariables(inputVariables);

      // Initialize input values with default values
      const initialValues: BotInput = {};
      inputVariables.forEach(variable => {
        const defaultValue = variable.defaultValue;
        const vt = variable.type?.toUpperCase() || '';

        if (vt === 'BOOLEAN') {
          initialValues[variable.name] = {
            type: 'BOOLEAN',
            boolean: defaultValue.boolean ?? false,
          };
        } else if (vt === 'STRING') {
          initialValues[variable.name] = {
            type: 'STRING',
            string: defaultValue.string ?? '',
          };
        } else if (vt === 'NUMBER') {
          initialValues[variable.name] = {
            type: 'NUMBER',
            number: defaultValue.number ?? 0,
          };
        } else if (vt === 'DATETIME') {
          initialValues[variable.name] = {
            type: 'DATETIME',
            string: defaultValue.string ?? defaultValue.datetime ?? '',
          };
        } else if (vt === 'DICTIONARY') {
          initialValues[variable.name] = {
            type: 'DICTIONARY',
            dictionary: parseDictionaryFromVariable(variable),
          };
        } else {
          initialValues[variable.name] = buildLockedVariableInput(variable);
        }
      });

      setInputValues(initialValues);
    } catch (error: any) {
      console.error('Error loading bot variables:', error);
      setError(error.message || 'Failed to load bot variables');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (
    variableName: string,
    type: 'BOOLEAN' | 'STRING' | 'NUMBER' | 'DATETIME',
    value: any,
  ) => {
    setInputValues(prev => ({
      ...prev,
      [variableName]: {
        type,
        ...(type === 'BOOLEAN' && { boolean: value }),
        ...(type === 'STRING' && { string: value }),
        ...(type === 'DATETIME' && { string: value }),
        ...(type === 'NUMBER' && {
          number: value === '' ? 0 : isNaN(Number(value)) ? 0 : Number(value),
        }),
      },
    }));
  };

  const getDisplayedDateTime = (variableName: string) =>
    dateTimeDrafts[variableName] ?? getDateTimeParts(inputValues[variableName]?.string);

  const handleDateTimePartChange = (variableName: string, part: 'date' | 'time', value: string) => {
    const currentParts = getDisplayedDateTime(variableName);
    const next = { ...currentParts, [part]: value };
    setDateTimeDrafts(prev => ({ ...prev, [variableName]: next }));
    handleInputChange(variableName, 'DATETIME', buildDateTimeValue(next.date, next.time));
  };

  const handleConfirm = () => {
    onConfirm(inputValues);
  };

  const renderDictionaryEditor = (variable: BotVariable) => {
    const variableName = variable.name;
    const constraint = getDictionaryConstraint(variable);
    const emptyEntry: BotDictionaryEntry = constraint.locked
      ? { key: '', value: defaultValueForSubtype(constraint.subtype) }
      : { key: '', value: { type: 'STRING', string: '' } };

    const raw = inputValues[variableName]?.dictionary;
    const entries: BotDictionaryEntry[] = Array.isArray(raw) && raw.length > 0 ? raw : [emptyEntry];

    const setEntries = (next: BotDictionaryEntry[]) => {
      setInputValues(prev => ({
        ...prev,
        [variableName]: { type: 'DICTIONARY', dictionary: next },
      }));
    };

    const setKey = (index: number, key: string) => {
      const next = [...entries];
      next[index] = { ...next[index], key };
      setEntries(next);
    };

    const setSubtype = (index: number, subtype: DictionaryValueSubtype) => {
      if (constraint.locked) {
        return;
      }
      const next = [...entries];
      next[index] = { ...next[index], value: defaultValueForSubtype(subtype) };
      setEntries(next);
    };

    const setEntryValue = (index: number, value: BotDictionaryEntryValue) => {
      const next = [...entries];
      next[index] = { ...next[index], value };
      setEntries(next);
    };

    const addRow = () => {
      setEntries([...entries, emptyEntry]);
    };

    const removeRow = (index: number) => {
      if (entries.length <= 1) {
        return;
      }
      setEntries(entries.filter((_, i) => i !== index));
    };

    const renderValueEditor = (entry: BotDictionaryEntry, index: number) => {
      const subtype = constraint.locked ? constraint.subtype : entry.value.type;
      const v = constraint.locked ? coerceValueToFixedSubtype(entry.value, constraint.subtype) : entry.value;

      if (subtype === 'BOOLEAN') {
        return (
          <div className="flex items-center gap-3 py-1">
            <Switch value={!!v.boolean} onValueChange={b => setEntryValue(index, { type: 'BOOLEAN', boolean: b })} />
            <span className="text-sm text-ink-soft">{v.boolean ? 'True' : 'False'}</span>
          </div>
        );
      }
      if (subtype === 'NUMBER') {
        return (
          <input
            className={inputClass}
            type="number"
            inputMode="decimal"
            value={v.number?.toString() ?? ''}
            onChange={e =>
              setEntryValue(index, { type: 'NUMBER', number: e.target.value === '' ? 0 : Number(e.target.value) || 0 })
            }
            placeholder="0"
          />
        );
      }
      return (
        <input
          className={inputClass}
          value={v.string ?? ''}
          onChange={e =>
            setEntryValue(index, {
              type: constraint.locked ? 'STRING' : entry.value.type,
              string: e.target.value,
            } as BotDictionaryEntryValue)
          }
          placeholder={subtype === 'ANY' ? 'Value' : 'Text'}
        />
      );
    };

    return (
      <div className="space-y-3">
        {constraint.locked ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted">Value type (fixed)</span>
            <span className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-white">
              {constraint.subtype}
            </span>
          </div>
        ) : null}
        {entries.map((entry, index) => (
          <div key={`${variableName}-dict-${index}`} className="space-y-2 rounded-xl border border-line bg-surface p-3">
            <input className={inputClass} value={entry.key} onChange={e => setKey(index, e.target.value)} placeholder="Key" />
            {!constraint.locked ? (
              <div className="flex flex-wrap gap-1.5">
                {DICTIONARY_VALUE_SUBTYPES.map(st => (
                  <button
                    key={st}
                    onClick={() => setSubtype(index, st)}
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${
                      entry.value.type === st ? 'bg-primary text-white' : 'border border-line bg-white text-muted'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            ) : null}
            {renderValueEditor(entry, index)}
            <button
              onClick={() => removeRow(index)}
              disabled={entries.length <= 1}
              className="text-sm font-semibold text-danger disabled:text-gray-300"
            >
              Remove
            </button>
          </div>
        ))}
        <button
          onClick={addRow}
          className="w-full rounded-xl border-2 border-dashed border-primary/40 py-2.5 text-sm font-semibold text-primary"
        >
          + Add entry
        </button>
      </div>
    );
  };

  const renderVariableInput = (variable: BotVariable) => {
    const currentValue = inputValues[variable.name];
    const defaultValue = variable.defaultValue;
    const varType = variable.type?.toUpperCase() || '';
    const isKnownType = KNOWN_INPUT_TYPES.has(varType);
    const inputId = `var-${variable.name}`;

    let field: React.ReactNode;
    if (varType === 'BOOLEAN') {
      field = (
        <div className="flex items-center justify-between rounded-xl bg-surface px-4 py-3">
          <span className="font-medium text-ink">{currentValue?.boolean ? 'True' : 'False'}</span>
          <Switch
            value={currentValue?.boolean || false}
            onValueChange={value => handleInputChange(variable.name, 'BOOLEAN', value)}
            label={variable.name}
          />
        </div>
      );
    } else if (varType === 'STRING') {
      field = (
        <input
          id={inputId}
          className={inputClass}
          value={currentValue?.string || ''}
          onChange={e => handleInputChange(variable.name, 'STRING', e.target.value)}
          placeholder={defaultValue.string || `Enter ${variable.name}`}
        />
      );
    } else if (varType === 'NUMBER') {
      field = (
        <div className="relative">
          <input
            id={inputId}
            className={`${inputClass} pr-12`}
            type="number"
            inputMode="decimal"
            value={currentValue?.number?.toString() || ''}
            onChange={e => handleInputChange(variable.name, 'NUMBER', e.target.value)}
            onFocus={e => e.target.select()}
            placeholder={defaultValue.number?.toString() || `Enter ${variable.name}`}
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">🔢</span>
        </div>
      );
    } else if (varType === 'DATETIME') {
      const parts = getDisplayedDateTime(variable.name);
      field = (
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              id={inputId}
              type="date"
              className={inputClass}
              value={parts.date}
              onChange={e => handleDateTimePartChange(variable.name, 'date', e.target.value)}
            />
            <input
              type="time"
              className={inputClass}
              value={to24h(parts.time)}
              onChange={e => handleDateTimePartChange(variable.name, 'time', e.target.value)}
            />
          </div>
          <p className="rounded-lg bg-surface px-3 py-1.5 text-xs text-muted">{ARGENTINA_TIMEZONE}</p>
        </div>
      );
    } else if (varType === 'DICTIONARY') {
      field = renderDictionaryEditor(variable);
    } else {
      field = (
        <div className="rounded-xl border border-dashed border-line bg-surface p-3">
          <p className="mb-1 text-xs text-muted">
            Unsupported input type in this app. The bot default is sent unchanged.
          </p>
          <p className="break-words font-mono text-sm text-ink">{formatLockedDefaultDisplay(variable)}</p>
        </div>
      );
    }

    return (
      <div key={variable.name} className="rounded-2xl border border-line bg-white p-4 shadow-sm">
        <div className="mb-1 flex items-start justify-between gap-2">
          <label htmlFor={inputId} className="break-all font-semibold text-ink">
            {variable.name}
          </label>
          <div className="flex shrink-0 items-center gap-1.5">
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
              {variable.type}
            </span>
            {!isKnownType ? (
              <span className="rounded-full bg-muted/15 px-2 py-0.5 text-[11px] font-semibold text-muted">
                Read-only
              </span>
            ) : null}
          </div>
        </div>
        {variable.description ? <p className="mb-2 text-sm text-muted">{variable.description}</p> : null}
        <div className="mt-2">{field}</div>
      </div>
    );
  };

  return (
    <Modal visible={visible} onRequestClose={onClose} variant="sheet">
      <div className="flex items-center justify-between border-b border-line bg-white px-4 py-3">
        <button onClick={onClose} className="rounded-lg px-2 py-1.5 font-medium text-danger">
          Cancel
        </button>
        <div className="flex items-center gap-2">
          <Settings2 size={20} className="text-primary" />
          <h2 className="text-lg font-bold text-ink">Bot Variables</h2>
        </div>
        <button
          onClick={handleConfirm}
          disabled={loading}
          className="rounded-lg bg-primary px-3 py-1.5 font-semibold text-white disabled:opacity-50"
        >
          Continue
        </button>
      </div>

      {bot && (
        <div className="flex items-center gap-3 border-b border-line bg-white px-4 py-3">
          <span className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-2xl">🤖</span>
          <div className="min-w-0">
            <p className="break-words font-semibold text-ink">{bot.name}</p>
            <p className="text-sm text-muted">Configure input variables</p>
          </div>
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {loading ? (
          <LoadingState emoji="⚙️" title="Loading Configuration" subtitle="Retrieving bot variables" />
        ) : error ? (
          <ErrorState
            title="Connection Error"
            subtitle="Unable to load bot configuration"
            error={error}
            onRetry={loadBotVariables}
          />
        ) : variables.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
            <p className="text-muted">This bot doesn't have any input variables to configure.</p>
            <button onClick={handleConfirm} className="rounded-xl bg-primary px-6 py-3 font-semibold text-white">
              Continue
            </button>
          </div>
        ) : (
          <div className="space-y-3 p-4">{variables.map(renderVariableInput)}</div>
        )}
      </div>
    </Modal>
  );
};
