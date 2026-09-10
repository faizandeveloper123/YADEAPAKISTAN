import { useState } from 'react';
import { FaCircleInfo, FaLink, FaPlus, FaRegTrashCan } from 'react-icons/fa6';

/* ------------------------------------------------------------------ *
 * Shared types + helpers for the "logical dropdown" (dependent /     *
 * cascading dropdown) feature.                                       *
 *                                                                    *
 * A dropdown field can declare `logic`: it is controlled by another  *
 * dropdown (the "controlling field"). When the controlling field     *
 * selects a value, this dropdown only shows the options mapped to    *
 * that value via `rules`.                                            *
 * ------------------------------------------------------------------ */

export interface DropdownLogicRule {
  id: number;
  /** Value selected in the controlling field that triggers this rule. */
  option: string;
  /** Choices this (dependent) dropdown shows when the rule fires. */
  options: string[];
}

export interface DropdownLogic {
  /** Element id of the controlling dropdown. */
  dependsOn: number;
  /** Label fallback — used when the controller id can't be matched (e.g. old payloads). */
  dependsOnLabel?: string;
  rules: DropdownLogicRule[];
}

/** Dropdown-ish types that can participate in dropdown logic. */
export const LOGIC_DROPDOWN_TYPES = ['single_dropdown', 'multi_dropdown', 'select'];

export function isLogicDropdownType(type: string): boolean {
  return LOGIC_DROPDOWN_TYPES.includes(type);
}

/** Minimal structural type so any element list can be passed in. */
export interface LogicElementLike {
  id?: number;
  label: string;
}

/**
 * Compute the choices a dropdown should show right now.
 *
 * - No logic            -> its own `options` (or the fallback list).
 * - Controller missing  -> its own options (fallback), so the field never breaks.
 * - No controller value -> its own options (fallback) until the user picks a rule trigger.
 * - Rule matched        -> the rule's mapped options.
 * - Rule matched but empty list -> fallback options so the field is never dead.
 */
export function resolveDropdownOptions(
  logic: DropdownLogic | undefined,
  ownOptions: string[] | undefined,
  elements: LogicElementLike[],
  valueOf: (id: number) => string | undefined,
  fallbackOptions: string[] = ['Option 1', 'Option 2', 'Option 3']
): string[] {
  const own = ownOptions && ownOptions.length > 0 ? ownOptions : [...fallbackOptions];
  if (!logic) return [...own];
  const controller =
    elements.find((e) => e.id === logic.dependsOn) ??
    elements.find((e) => e.label === logic.dependsOnLabel);
  if (!controller) return [...own];
  if (controller.id === undefined) return [...own];
  const selected = valueOf(controller.id);
  if (!selected) return [...own];
  const rule = (logic.rules ?? []).find((r) => r.option === selected);
  if (rule && rule.options.length > 0) return [...rule.options];
  return [...own];
}

/* ------------------------------------------------------------------ *
 * Editor UI: configures the logic for the currently selected dropdown *
 * field. Lives in the right inspector under General Settings.         *
 * ------------------------------------------------------------------ */

export interface DropdownLogicSettingsProps {
  element: {
    id: number;
    label: string;
    type: string;
    options?: string[];
    logic?: DropdownLogic;
  };
  allElements: {
    id: number;
    label: string;
    type: string;
    options?: string[];
  }[];
  onChange: (logic: DropdownLogic | null) => void;
}

const inputCls =
  'w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500';
const labelCls = 'block font-medium text-slate-700 mb-1';

export function DropdownLogicSettings({
  element,
  allElements,
  onChange,
}: DropdownLogicSettingsProps) {
  const controllers = allElements.filter(
    (e) => e.id !== element.id && isLogicDropdownType(e.type)
  );
  const [logic, setLogic] = useState<DropdownLogic | null>(element.logic ?? null);
  const enabled = !!logic;
  const controller =
    controllers.find((c) => c.id === logic?.dependsOn) ??
    allElements.find((e) => e.label === logic?.dependsOnLabel);

  const commit = (next: DropdownLogic | null) => {
    setLogic(next);
    onChange(next);
  };

  const patchLogic = (patch: Partial<DropdownLogic>) => {
    if (!logic) return;
    commit({ ...logic, ...patch });
  };

  const updateRuleOption = (ruleId: number, value: string) => {
    patchLogic({
      rules: (logic?.rules ?? []).map((r) => (r.id === ruleId ? { ...r, option: value } : r)),
    });
  };

  const updateRuleShowOption = (ruleId: number, index: number, value: string) => {
    patchLogic({
      rules: (logic?.rules ?? []).map((r) => {
        if (r.id !== ruleId) return r;
        const next = [...r.options];
        next[index] = value;
        return { ...r, options: next };
      }),
    });
  };

  const addRuleShowOption = (ruleId: number) => {
    patchLogic({
      rules: (logic?.rules ?? []).map((r) =>
        r.id === ruleId ? { ...r, options: [...r.options, `Option ${r.options.length + 1}`] } : r
      ),
    });
  };

  const removeRuleShowOption = (ruleId: number, index: number) => {
    patchLogic({
      rules: (logic?.rules ?? []).map((r) => {
        if (r.id !== ruleId) return r;
        const next = [...r.options];
        next.splice(index, 1);
        return { ...r, options: next };
      }),
    });
  };

  const addRule = () => {
    patchLogic({
      rules: [
        ...(logic?.rules ?? []),
        { id: Date.now() + Math.random(), option: '', options: [] as string[] },
      ],
    });
  };

  const removeRule = (ruleId: number) => {
    patchLogic({ rules: (logic?.rules ?? []).filter((r) => r.id !== ruleId) });
  };

  return (
    <div className="w-full border border-slate-200 rounded-md bg-white text-xs font-sans shadow-sm select-none">
      <div className="flex items-center justify-between px-3 py-2.5 bg-slate-50 border-b border-slate-200">
        <span className="font-semibold text-slate-700 text-sm flex items-center gap-1.5">
          <FaLink className="w-3.5 h-3.5 text-blue-600" />
          Dropdown Logic
        </span>
        <button
          type="button"
          onClick={() =>
            commit(
              enabled
                ? null
                : controllers.length > 0
                ? { dependsOn: controllers[0].id, dependsOnLabel: controllers[0].label, rules: [] }
                : null
            )
          }
          disabled={!enabled && controllers.length === 0}
          className={`text-[11px] font-medium rounded px-2 py-1 border transition disabled:opacity-50 disabled:cursor-not-allowed ${
            enabled
              ? 'border-rose-200 text-rose-600 hover:bg-rose-50'
              : 'border-blue-200 text-blue-600 hover:bg-blue-50'
          }`}
        >
          {enabled ? 'Remove Logic' : 'Add Logic'}
        </button>
      </div>

      {!enabled ? (
        <div className="p-3.5">
          <p className="text-[11px] text-slate-500 leading-snug">
            Make this dropdown's options change based on another dropdown. Pick a controlling
            field, then map each of its values to the options this field should show.
          </p>
          {controllers.length === 0 && (
            <p className="text-[10px] text-amber-600 bg-amber-50 border border-amber-100 rounded px-2 py-1.5 mt-2">
              Add another dropdown (Single / Multi / Select) to be the controlling field.
            </p>
          )}
        </div>
      ) : (
        <div className="p-3.5 space-y-4">
          <div>
            <label className={labelCls}>Controlling field</label>
            <select
              value={logic?.dependsOn ?? ''}
              onChange={(e) => {
                const c = controllers.find((x) => x.id === Number(e.target.value));
                if (c) commit({ dependsOn: c.id, dependsOnLabel: c.label, rules: logic?.rules ?? [] });
              }}
              className={inputCls}
            >
              {controllers.length === 0 && <option value="">No dropdowns available</option>}
              {controllers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
            {!controller && (
              <p className="text-[10px] text-amber-600 mt-1">
                The controlling field was removed. Pick another one above.
              </p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className={labelCls}>Mapping rules</label>
              <button
                type="button"
                onClick={addRule}
                className="flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium text-[11px] border border-blue-200 hover:bg-blue-50 rounded px-2 py-0.5 transition"
              >
                <FaPlus className="w-2.5 h-2.5" />
                Add rule
              </button>
            </div>

            {(logic?.rules ?? []).length === 0 && (
              <div className="text-[11px] text-slate-400 bg-slate-50 border border-dashed border-slate-200 rounded px-2.5 py-2">
                No rules yet. Click "Add rule", then set which controlling value shows which
                options.
              </div>
            )}

            <div className="space-y-2.5">
              {(logic?.rules ?? []).map((rule) => (
                <div key={rule.id} className="border border-slate-200 rounded-md p-2 space-y-2 bg-slate-50/60">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold text-slate-500 w-9 shrink-0">When</span>
                    <input
                      list={`dlogic-${rule.id}`}
                      value={rule.option}
                      onChange={(e) => updateRuleOption(rule.id, e.target.value)}
                      placeholder={controller?.options?.[0] ?? 'value'}
                      className={inputCls}
                    />
                    <button
                      type="button"
                      onClick={() => removeRule(rule.id)}
                      className="text-slate-400 hover:text-rose-500 p-1 transition shrink-0"
                      title="Remove rule"
                    >
                      <FaRegTrashCan className="w-3 h-3" />
                    </button>
                  </div>
                  <datalist id={`dlogic-${rule.id}`}>
                    {(controller?.options ?? []).map((o) => (
                      <option key={o} value={o} />
                    ))}
                  </datalist>

                  <div className="flex items-start gap-2">
                    <span className="text-[10px] font-semibold text-slate-500 w-9 shrink-0 pt-1">Show</span>
                    <div className="flex-1 space-y-1.5">
                      {rule.options.map((opt, oi) => (
                        <div key={oi} className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={opt}
                            onChange={(e) => updateRuleShowOption(rule.id, oi, e.target.value)}
                            placeholder={`Option ${oi + 1}`}
                            className={inputCls}
                          />
                          <button
                            type="button"
                            onClick={() => removeRuleShowOption(rule.id, oi)}
                            className="text-slate-400 hover:text-rose-500 p-1 transition shrink-0"
                            title="Remove option"
                          >
                            <FaRegTrashCan className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                      {rule.options.length === 0 && (
                        <div className="text-[10px] text-slate-400 border border-dashed border-slate-200 bg-white rounded px-2 py-1.5">
                          No options shown for this value yet.
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => addRuleShowOption(rule.id)}
                        className="flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium text-[11px] border border-blue-200 hover:bg-blue-50 rounded px-1.5 py-0.5 transition"
                      >
                        <FaPlus className="w-2 h-2" />
                        Add option
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-start gap-1.5 text-[10px] text-slate-400 leading-snug">
            <FaCircleInfo className="w-3 h-3 mt-0.5 flex-shrink-0" />
            <span>
              When a controlling value is selected, this dropdown shows only that rule's options.
              Before any value is picked (or for values without a rule), its own Options list is
              shown as fallback. Test it right on the canvas.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default DropdownLogicSettings;