import { useState } from 'react';
import { FaPlus, FaRegTrashCan } from 'react-icons/fa6';

/* ------------------------------------------------------------------ *
 * Shared types + helpers for the "Local Dropdown" field.             *
 *                                                                    *
 * A Local Dropdown field models "City -> Outlets": each row contains *
 * a PARENT dropdown (e.g. City) and a CHILD dropdown (e.g. Outlets). *
 * When a parent value (city) is selected, the child only shows the   *
 * outlets mapped to that city. Rows are fully independent of each    *
 * other (several city/outlet pairs in one form element).             *
 * ------------------------------------------------------------------ */

export interface LocalRowRule {
  id: number;
  /** Value selected in the parent dropdown (a city) that triggers this rule. */
  option: string;
  /** Choices the child dropdown shows when the parent equals `option`. */
  options: string[];
}

export interface LocalDropdownRow {
  id: number;
  /** Heading shown above the parent dropdown (e.g. "Select City"). */
  parentLabel: string;
  /** Heading shown above the child dropdown (e.g. "Select Outlet"). */
  childLabel: string;
  /** Options the parent dropdown offers (the cities). */
  parentOptions: string[];
  /** Parent value -> child options mapping (city -> its outlets). */
  rules: LocalRowRule[];
}

/** Fresh, empty row ready for the user to add their own cities. */
export function defaultLocalRow(): LocalDropdownRow {
  return {
    id: Date.now() + Math.random(),
    parentLabel: 'Select City',
    childLabel: 'Select Outlet',
    parentOptions: [],
    rules: [],
  };
}

/**
 * Compute the outlets the child dropdown should show for the selected
 * city. Returns "nothing" when the city has no outlets configured yet.
 */
export function childOptionsFor(row: LocalDropdownRow, parentValue: string): string[] {
  if (!row) return [];
  const rules = row.rules ?? [];
  if (parentValue) {
    const rule = rules.find((r) => r.option === parentValue);
    if (rule && rule.options && rule.options.length > 0) return [...rule.options];
    return [];
  }
  return Array.from(new Set(rules.flatMap((r) => r.options ?? [])));
}

const selectCls =
  'w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500';

const labelCls = 'block text-[11px] font-semibold text-slate-600 mb-1';

/* ------------------------------------------------------------------ *
 * Shared renderer: draws every row as a horizontal City/Outlets pair. *
 * Used both on the editor canvas (live preview) and on the public     *
 * form. `values` maps `rowId:parent` / `rowId:child` -> value.        *
 * ------------------------------------------------------------------ */
export function LocalDropdownRowsField({
  rows,
  values,
  onChange,
  disabledChildren = false,
}: {
  rows: LocalDropdownRow[];
  values?: Record<string, string>;
  onChange?: (key: string, value: string) => void;
  /** When true, the child dropdowns are read-only (editor canvas). */
  disabledChildren?: boolean;
}) {
  const val = (rowId: number, kind: 'parent' | 'child') => values?.[`${kind}:${rowId}`] ?? '';
  return (
    <div className="space-y-3">
      {rows.length === 0 && (
        <div className="text-[11px] text-slate-400 border border-dashed border-slate-200 rounded px-2.5 py-2">
          No city/outlet pairs yet. Add one from the settings panel.
        </div>
      )}
      {rows.map((row) => {
        const parentVal = val(row.id, 'parent');
        const childVal = val(row.id, 'child');
        const childOptions = childOptionsFor(row, parentVal);
        const parentOptions = row.parentOptions ?? [];
        const showChildPlaceholder =
          !parentVal || childOptions.length === 0
            ? parentVal
              ? 'No outlets for this city'
              : 'Select a city first'
            : 'Select outlet';
        return (
          <div key={row.id} className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelCls}>{row.parentLabel}</label>
              <select
                value={parentVal}
                onChange={(e) => onChange?.(`parent:${row.id}`, e.target.value)}
                className={selectCls}
              >
                <option value="">Select City</option>
                {parentOptions.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>{row.childLabel}</label>
              <select
                value={childVal}
                disabled={disabledChildren}
                onChange={(e) => onChange?.(`child:${row.id}`, e.target.value)}
                className={`${selectCls} ${disabledChildren ? 'bg-slate-50 text-slate-500 cursor-pointer' : ''}`}
              >
                <option value="">{showChildPlaceholder}</option>
                {childOptions.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Editor UI: configures the City -> Outlets pairs for a Local         *
 * Dropdown field. Lives in the right inspector drawer under General   *
 * Settings. Simple flow: add a city, then add that city's outlets.    *
 * ------------------------------------------------------------------ */

export interface LocalDropdownSettingsProps {
  rows: LocalDropdownRow[];
  onChange: (rows: LocalDropdownRow[]) => void;
}

const inputCls =
  'w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500';

export function LocalDropdownSettings({ rows, onChange }: LocalDropdownSettingsProps) {
  const setRow = (rowId: number, patch: Partial<LocalDropdownRow>) => {
    onChange(rows.map((r) => (r.id === rowId ? { ...r, ...patch } : r)));
  };

  const addRow = () => onChange([...(rows ?? []), defaultLocalRow()]);
  const removeRow = (rowId: number) => onChange((rows ?? []).filter((r) => r.id !== rowId));

  return (
    <div className="w-full border border-slate-200 rounded-md bg-white text-xs font-sans shadow-sm select-none">
      <div className="flex items-center justify-between px-3 py-2.5 bg-slate-50 border-b border-slate-200">
        <span className="font-semibold text-slate-700 text-sm flex items-center gap-1.5">
          <FaPlus className="w-3 h-3 text-blue-600" />
          City / Outlets
        </span>
        <button
          type="button"
          onClick={addRow}
          className="flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium text-[11px] border border-blue-200 hover:bg-blue-50 rounded px-2 py-1 transition"
        >
          <FaPlus className="w-2.5 h-2.5" />
          Add Pair
        </button>
      </div>

      <div className="p-3 space-y-3">
        {(rows ?? []).length === 0 && (
          <div className="text-[11px] text-slate-400 bg-slate-50 border border-dashed border-slate-200 rounded px-2.5 py-2">
            No city/outlet pairs yet. Click &quot;Add Pair&quot; to add your first city and its outlets.
          </div>
        )}

        {(rows ?? []).map((row, ri) => (
          <CityOutletRow
            key={row.id}
            index={ri}
            row={row}
            onChange={(patch) => setRow(row.id, patch)}
            onRemove={() => removeRow(row.id)}
          />
        ))}
      </div>
    </div>
  );
}

/* Internal: one City -> Outlets row editor with quick-add inputs. */
function CityOutletRow({
  index,
  row,
  onChange,
  onRemove,
}: {
  index: number;
  row: LocalDropdownRow;
  onChange: (patch: Partial<LocalDropdownRow>) => void;
  onRemove: () => void;
}) {
  const [newCity, setNewCity] = useState('');
  const [newOutletFor, setNewOutletFor] = useState<string | null>(null);
  const [newOutlet, setNewOutlet] = useState('');

  const parentOptions = row.parentOptions ?? [];
  const rules = row.rules ?? [];

  const addCity = () => {
    const name = newCity.trim();
    if (!name || parentOptions.includes(name)) return;
    onChange({
      parentOptions: [...parentOptions, name],
      rules: [...rules, { id: Date.now() + Math.random(), option: name, options: [] }],
    });
    setNewCity('');
  };

  const renameCity = (old: string, name: string) => {
    const next = name.trim();
    if (!next || next === old) return;
    onChange({
      parentOptions: parentOptions.map((o) => (o === old ? next : o)),
      rules: rules.map((r) => (r.option === old ? { ...r, option: next } : r)),
    });
  };

  const removeCity = (name: string) => {
    onChange({
      parentOptions: parentOptions.filter((o) => o !== name),
      rules: rules.filter((r) => r.option !== name),
    });
  };

  const addOutlet = (city: string) => {
    const name = newOutlet.trim();
    if (!name) return;
    const rule = rules.find((r) => r.option === city) ?? {
      id: Date.now() + Math.random(),
      option: city,
      options: [],
    };
    const options = rule.options.includes(name) ? rule.options : [...rule.options, name];
    onChange({
      rules: [
        ...rules.filter((r) => r.option !== city),
        { ...rule, options },
      ],
    });
    setNewOutlet('');
    setNewOutletFor(null);
  };

  const removeOutlet = (city: string, outlet: string) => {
    const rule = rules.find((r) => r.option === city);
    if (!rule) return;
    onChange({
      rules: [
        ...rules.filter((r) => r.option !== city),
        { ...rule, options: rule.options.filter((o) => o !== outlet) },
      ],
    });
  };

  return (
    <div className="border border-slate-200 rounded-md p-2.5 space-y-2.5 bg-slate-50/60">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">
          City / Outlets {index + 1}
        </span>
        <button
          type="button"
          onClick={onRemove}
          className="text-slate-400 hover:text-rose-500 p-1 transition shrink-0"
          title="Remove pair"
        >
          <FaRegTrashCan className="w-3 h-3" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block font-medium text-slate-500 mb-1 text-[10px]">City dropdown label</label>
          <input value={row.parentLabel} onChange={(e) => onChange({ parentLabel: e.target.value })} className={inputCls} />
        </div>
        <div>
          <label className="block font-medium text-slate-500 mb-1 text-[10px]">Outlet dropdown label</label>
          <input value={row.childLabel} onChange={(e) => onChange({ childLabel: e.target.value })} className={inputCls} />
        </div>
      </div>

      <div className="space-y-1.5">
        {parentOptions.length === 0 && (
          <div className="text-[10px] text-slate-400 border border-dashed border-slate-200 rounded px-2 py-1.5">
            No cities yet. Add your first city below.
          </div>
        )}
        {parentOptions.map((city) => {
          const rule = rules.find((r) => r.option === city);
          const outletCount = rule?.options?.length ?? 0;
          return (
            <div key={city} className="border border-slate-200 bg-white rounded-md p-2 space-y-1.5">
              <div className="flex items-center justify-between gap-1.5">
                <input
                  type="text"
                  value={city}
                  onChange={(e) => renameCity(city, e.target.value)}
                  className={`${inputCls} !py-1 font-semibold text-slate-700 bg-blue-50/50 border-blue-100`}
                />
                <button
                  type="button"
                  onClick={() => removeCity(city)}
                  className="text-slate-400 hover:text-rose-500 p-1 transition shrink-0"
                  title="Remove city"
                >
                  <FaRegTrashCan className="w-3 h-3" />
                </button>
              </div>

              {outletCount > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {rule!.options.map((outlet) => (
                    <span
                      key={outlet}
                      className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 rounded-full px-2 py-0.5 text-[10px]"
                    >
                      {outlet}
                      <button
                        type="button"
                        onClick={() => removeOutlet(city, outlet)}
                        className="text-slate-400 hover:text-rose-500 transition"
                        title="Remove outlet"
                      >
                        <FaRegTrashCan className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <div className="text-[10px] text-slate-400">No outlets yet.</div>
              )}

              {newOutletFor === city ? (
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    autoFocus
                    value={newOutlet}
                    onChange={(e) => setNewOutlet(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') addOutlet(city);
                      if (e.key === 'Escape') {
                        setNewOutletFor(null);
                        setNewOutlet('');
                      }
                    }}
                    placeholder="Outlet name..."
                    className={inputCls}
                  />
                  <button
                    type="button"
                    onClick={() => addOutlet(city)}
                    className="text-blue-600 hover:text-blue-700 p-1.5 shrink-0"
                    title="Add outlet"
                  >
                    <FaPlus className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setNewOutletFor(city);
                    setNewOutlet('');
                  }}
                  className="flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium text-[10px] hover:bg-blue-50 rounded px-1.5 py-0.5 transition"
                >
                  <FaPlus className="w-2 h-2" />
                  Add outlet
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-1.5">
        <input
          type="text"
          value={newCity}
          onChange={(e) => setNewCity(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') addCity();
          }}
          placeholder="Add city, e.g. Lahore..."
          className={inputCls}
        />
        <button
          type="button"
          onClick={addCity}
          className="flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium text-[10px] border border-blue-200 hover:bg-blue-50 rounded px-2 py-1.5 transition shrink-0"
        >
          <FaPlus className="w-2 h-2" />
          Add City
        </button>
      </div>
    </div>
  );
}

export default LocalDropdownSettings;