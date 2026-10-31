import React, { useState, useEffect } from 'react';
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
import { ErrorState, LoadingState, Modal, Switch, buttonStyles } from './ui';
import { Play, X } from 'lucide-react';
import { describeError } from '../lib/errors';

interface BotVariablesModalProps {
  visible: boolean;
  bot: Bot | null;
  userEmail: string;
  onClose: () => void;
  onConfirm: (botInputs: BotInput) => void;
  /** Values from a previous launch ("Run again"): override the bot's defaults when the type matches. */
  initialInputs?: BotInput;
  /** Main button text ("Save schedule" when the inputs are for a schedule). */
  confirmLabel?: string;
}

const inputClass =
  'w-full min-w-0 rounded-lg border border-line bg-white px-3.5 py-2.5 text-base text-ink outline-none transition placeholder:text-muted/60 focus:border-ink focus:ring-2 focus:ring-brand';

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
  initialInputs,
  confirmLabel = 'Run bot now',
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

      // Reuse the inputs of the last launch where the variable still exists with the same type.
      if (initialInputs) {
        for (const [name, value] of Object.entries(initialInputs)) {
          if (initialValues[name] && initialValues[name].type?.toUpperCase() === value.type?.toUpperCase()) {
            initialValues[name] = value;
          }
        }
      }
      setInputValues(initialValues);
    } catch (error: any) {
      console.error('Error loading bot variables:', error);
      setError(describeError(error));
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
            <Switch
              value={!!v.boolean}
              onValueChange={b => setEntryValue(index, { type: 'BOOLEAN', boolean: b })}
              label={`Value for ${entry.key || `entry ${index + 1}`}`}
            />
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
          <p className="text-sm text-muted">
            Every value is <span className="font-semibold text-ink">{constraint.subtype.toLowerCase()}</span>
          </p>
        ) : null}
        {entries.map((entry, index) => (
          <fieldset key={`${variableName}-dict-${index}`} className="space-y-2 rounded-lg border border-line bg-page/50 p-3">
            <legend className="sr-only">Entry {index + 1}</legend>
            <input
              className={inputClass}
              value={entry.key}
              onChange={e => setKey(index, e.target.value)}
              placeholder="Key"
              aria-label={`Key of entry ${index + 1}`}
            />
            {!constraint.locked ? (
              <div role="radiogroup" aria-label="Value type" className="flex flex-wrap gap-1.5">
                {DICTIONARY_VALUE_SUBTYPES.map(st => (
                  <button
                    key={st}
                    role="radio"
                    aria-checked={entry.value.type === st}
                    onClick={() => setSubtype(index, st)}
                    className={`rounded-md px-2.5 py-1 text-sm font-medium capitalize transition-colors ${
                      entry.value.type === st ? 'bg-ink text-surface' : 'border border-line bg-surface text-ink-soft'
                    }`}
                  >
                    {st.toLowerCase()}
                  </button>
                ))}
              </div>
            ) : null}
            {renderValueEditor(entry, index)}
            <button
              onClick={() => removeRow(index)}
              disabled={entries.length <= 1}
              className="text-sm font-semibold text-fail disabled:text-line"
            >
              Remove entry
            </button>
          </fieldset>
        ))}
        <button
          onClick={addRow}
          className="w-full rounded-lg border-2 border-dashed border-line py-2.5 text-sm font-semibold text-ink-soft"
        >
          Add entry
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
        <div className="flex items-center justify-between rounded-lg border border-line bg-page/50 px-4 py-3">
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
          aria-describedby={variable.description ? `${inputId}-desc` : undefined}
        />
      );
    } else if (varType === 'NUMBER') {
      field = (
        <input
          id={inputId}
          className={inputClass}
          type="number"
          inputMode="decimal"
          value={currentValue?.number?.toString() || ''}
          onChange={e => handleInputChange(variable.name, 'NUMBER', e.target.value)}
          onFocus={e => e.target.select()}
          placeholder={defaultValue.number?.toString() || `Enter ${variable.name}`}
          aria-describedby={variable.description ? `${inputId}-desc` : undefined}
        />
      );
    } else if (varType === 'DATETIME') {
      const parts = getDisplayedDateTime(variable.name);
      field = (
        <div className="space-y-1.5">
          <div className="flex gap-2">
            <input
              id={inputId}
              type="date"
              className={inputClass}
              value={parts.date}
              onChange={e => handleDateTimePartChange(variable.name, 'date', e.target.value)}
              aria-label={`${variable.name} date`}
            />
            <input
              type="time"
              className={inputClass}
              value={to24h(parts.time)}
              onChange={e => handleDateTimePartChange(variable.name, 'time', e.target.value)}
              aria-label={`${variable.name} time`}
            />
          </div>
          <p className="text-sm text-muted">Buenos Aires time (UTC−3)</p>
        </div>
      );
    } else if (varType === 'DICTIONARY') {
      field = renderDictionaryEditor(variable);
    } else {
      field = (
        <div className="rounded-lg border border-dashed border-line px-3 py-2.5">
          <p className="text-sm text-muted">This app can't edit this type, so the bot's default is sent:</p>
          <p className="mt-1 break-words font-medium text-ink">{formatLockedDefaultDisplay(variable)}</p>
        </div>
      );
    }

    return (
      <div key={variable.name} data-row className="px-4 py-4">
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <label htmlFor={inputId} className="min-w-0 break-all font-semibold text-ink">
            {variable.name}
          </label>
          <span className="shrink-0 text-sm text-muted">
            {variable.type.toLowerCase()}
            {!isKnownType ? ', fixed' : ''}
          </span>
        </div>
        {variable.description ? (
          <p id={`${inputId}-desc`} className="-mt-1 mb-2 text-sm text-muted">
            {variable.description}
          </p>
        ) : null}
        {field}
      </div>
    );
  };

  return (
    <Modal visible={visible} onRequestClose={onClose} variant="page" labelledBy="variables-title">
      <div className="flex h-full flex-col bg-page safe-top safe-bottom safe-x">
        <div className="bg-nav text-white">
          <div className="flex items-center gap-1 px-2 py-2">
            <button
              onClick={onClose}
              aria-label="Cancel"
              className="flex size-11 shrink-0 items-center justify-center rounded-md active:bg-white/10"
            >
              <X size={22} />
            </button>
            <div className="min-w-0 flex-1">
              <h2 id="variables-title" className="text-[0.9375rem] font-semibold leading-tight">
                Bot inputs
              </h2>
              {bot && <p className="truncate text-sm text-white/60">{bot.name}</p>}
            </div>
          </div>
          <div className="brand-line h-0.5" />
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          {loading ? (
            <LoadingState title="Loading inputs" subtitle="Reading the bot's variables" />
          ) : error ? (
            <ErrorState title="Couldn't load the inputs" error={error} onRetry={loadBotVariables} />
          ) : variables.length === 0 ? (
            <p className="p-6 text-muted">This bot doesn't take any inputs.</p>
          ) : (
            <div className="m-3 divide-y divide-line rounded-lg border border-line bg-surface">
              <p className="px-4 py-3 text-sm text-muted">
                Defaults come from the bot. Change what you need, then run it.
              </p>
              {variables.map(renderVariableInput)}
            </div>
          )}
        </div>

        {/* Main action pinned within thumb reach, below the form it submits. */}
        <div className="border-t border-line bg-surface p-3">
          <button
            onClick={handleConfirm}
            disabled={loading || !!error}
            className={`${buttonStyles.primary} w-full`}
          >
            <Play size={16} fill="currentColor" />
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
};
