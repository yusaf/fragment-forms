import type { JSONData, FormElement, FormElements, Primitive } from './utils.js';
import {
	toEntries,
	setValues,
	getAltNamesAndTypes,
	sliceCoerceTypeFromName,
	coerceTypeValue,
	nameToPath
} from './utils.js';
import { extend, contains, debounce, alwaysSelectors } from './utils.js';

import structuredClone from '@ungap/structured-clone';
if (!('structuredClone' in globalThis)) {
	//@ts-ignore
	globalThis.structuredClone = structuredClone;
}

const FormDataSelector = `
input[name]:not([name=""]):not(:disabled):not([type=checkbox]):not([type=radio]):not([type=submit]),
input[name]:not([name=""])[type=checkbox]:not(:disabled):checked,
input[name]:not([name=""])[type=radio]:not(:disabled):checked,
select[name]:not([name=""]):not(:disabled):has(:checked:not(:disabled)) option,
textarea[name]:not([name=""]):not(:disabled)
`;

export function formToJSON<T extends JSONData>(
	element: FormData | NodeListOf<Element> | HTMLFormElement | null | undefined
): T {
	if (!element) {
		throw new Error(
			'The toJSON argument must be either be FormData, a  HTML form element, or a list of input, select or textarea elements.'
		);
	}

	const entries = toEntries(element);

	const data: any = {};

	for (let i = 0, iLen = entries.length; i < iLen; i++) {
		const [path, value] = entries[i];
		let target = data;
		for (let j = 0, jLen = path.length; j < jLen; j++) {
			const isLast = j === jLen - 1;
			const key = path[j];
			const nextKey = path?.[j + 1];
			let current = target?.[key];
			if (isLast) {
				if (key === '') {
					target.push(value);
				} else {
					current = value;
				}
			} //
			else if (current === undefined) {
				if (!isNaN(nextKey as any as number)) {
					current = [];
				} else if (nextKey === '') {
					current = [];
				} else if (nextKey !== undefined) {
					current = {};
				}
			}
			if (key !== '') {
				if (typeof target !== 'object') {
					throw new Error(
						`You are trying to set a property onto a primitive value at the path [${path.join(
							', '
						)}]`
					);
				}
				target[key] = current;
				target = target[key];
			}
		}
	}
	return data;
}
export function fillForm(form: HTMLFormElement | null | undefined, data: JSONData) {
	if (!form) {
		return;
	}
	const elements = form?.querySelectorAll(
		'input[name]:not([name=""]), select[name]:not([name=""]), textarea[name]:not([name=""])'
	) as any as FormElements;

	const [altNames, coerceTypes] = getAltNamesAndTypes(elements);

	setValues({
		form,
		altNames,
		coerceTypes,
		data,
		path: []
	});
}
export function clearForm(
	form: HTMLFormElement | null | undefined,
	everything: boolean | string = false
) {
	if (!form) {
		return;
	}
	const elements = form.querySelectorAll(
		typeof everything === 'string'
			? everything
			: everything
			? `input:not([type="submit"]), select option, textarea`
			: FormDataSelector
	) as any as FormElements;

	for (let i = 0, iLen = elements.length; i < iLen; i++) {
		const element = elements[i];
		const nodeName = element.nodeName.toLowerCase();
		const type = nodeName === 'input' ? element?.type || 'text' : nodeName;
		if (type === 'radio') {
			(element as HTMLInputElement).checked = false;
		} else if (type === 'checkbox') {
			(element as HTMLInputElement).checked = false;
		} else if (nodeName === 'option') {
			(element as any as HTMLOptionElement).selected = false;
		} else if (nodeName === 'input' || nodeName === 'textarea') {
			element.value = '';
		}
	}
}

const inputTypes = [
	'checkbox',
	'color',
	'date',
	'datetime-local',
	'email',
	'hidden',
	'month',
	'number',
	'password',
	'radio',
	'range',
	'search',
	'tel',
	'text',
	'time',
	'url',
	'week'
] as const;
const nodeNames = ['select', 'option', 'textarea'] as const;

type types = (typeof nodeNames)[number] | (typeof inputTypes)[number];

export function attributes(data: JSONData | null = null) {
	const valueTracker: any = {};
	const arraysCache: any = {};
	return function (
		name: string,
		type: types,
		additional: Primitive | Record<string, Primitive> = {}
	) {
		let attrs: any = {
			name
		};

		if (type === 'select') {
			if (name.endsWith('[]')) {
				attrs.multiple = true;
			}
			return attrs;
		}

		let [altName, coerceFrom] = sliceCoerceTypeFromName(name);

		let defaultValue: any;
		if (typeof additional !== 'object' || additional instanceof Date) {
			defaultValue = coerceTypeValue(additional, coerceFrom);
			attrs.value = defaultValue;
		} else {
			attrs = { ...attrs, ...additional };
			if (additional.hasOwnProperty('value')) {
				defaultValue = coerceTypeValue(additional.value, coerceFrom);
				attrs.value = defaultValue;
			}
		}

		let nodeName: string;
		if (inputTypes.includes(type as any)) {
			nodeName = 'input';
			attrs.type = type;
		} else {
			nodeName = type;
		}

		const path = nameToPath(altName);

		let attrName = '';
		let attrValue: string | boolean = '';
		let target: any = data || {};
		for (let i = 0, iLen = path.length; i < iLen; i++) {
			const isLast = i === iLen - 1;
			const key = path[i];
			const nextKey = path?.[i + 1];
			const hasCurrent = target?.hasOwnProperty(key);
			let current = target?.[key];

			if (nextKey === '') {
				if (!hasCurrent) {
					break;
				}
				if (!arraysCache.hasOwnProperty(name)) {
					arraysCache[name] = current.map((item: any) => coerceTypeValue(item, coerceFrom));
				}
				const values = arraysCache[name];
				const has = values.includes(defaultValue);
				if (type === 'checkbox') {
					attrName = 'checked';
					attrValue = has;
				} else if (type === 'option') {
					attrName = 'selected';
					attrValue = has;
				} else if (nodeName === 'input') {
					if (!valueTracker.hasOwnProperty(name)) {
						valueTracker[name] = 0;
					}
					attrName = 'value';
					attrValue = values?.[valueTracker[name]++];
				}
				break;
			} //
			else if (isLast) {
				if (!hasCurrent) {
					break;
				}
				const value = coerceTypeValue(current, coerceFrom);
				if (type === 'radio') {
					attrName = 'checked';
					attrValue = value === defaultValue;
				} else if (type === 'checkbox') {
					attrName = 'checked';
					attrValue = value === defaultValue;
				} else if (type === 'option') {
					attrName = 'selected';
					attrValue = value === defaultValue;
				} else {
					attrName = 'value';
					attrValue = value;
				}

				break;
			} //
			else if (current === undefined) {
				if (!isNaN(nextKey as any as number)) {
					current = [];
				} else if (nextKey === '') {
					current = [];
				} else if (nextKey !== undefined) {
					current = {};
				}
			}
			if (data) {
				target[key] = current;
				target = target[key];
			}
		}

		if (attrName) {
			attrs[attrName] = attrValue;
		} else {
		}
		if (type === 'option') {
			delete attrs['name'];
		}
		return attrs;
	};
}

type FragmentFormArgOpts = {
	debounceTimeout?: number;
	autosaveTimeout?: number;
};
type FragmentFormOpts = {
	debounceTimeout: number;
	autosaveTimeout: number;
};
export class FragmentForm<T extends JSONData = {}> {
	private form: HTMLFormElement;
	private listeners: [string, CallableFunction][] = [];
	private opts: FragmentFormOpts = {
		debounceTimeout: 500,
		autosaveTimeout: 0
	};

	private fragmentOnInputAlready: boolean = false;
	private autoSaveCallbackAlready: boolean = false;
	private autoSaveTimerAlready: boolean = false;

	private valuesToSave: any = {};
	private valuesSavedHistory: any = {};

	private autoSaveTimerStartNumber: number = 0;
	private autoSaveTimerCurrentNumber: number = 0;
	private autoSaveNumberTimer: any;
	private autoSaveNumberTimerCallback?: (timeRemaining: number) => void;

	private autoSaveCallback?: (value: T) => void;
	private _clearAutoSaveDebounce: () => void = () => {};

	private saveStatusCallback?: (enabled: boolean) => void;

	constructor(form: HTMLFormElement | null, opts?: FragmentFormArgOpts) {
		if (!(form instanceof HTMLFormElement)) {
			throw new Error('form argument must be a HTML Form element');
		}
		this.form = form;

		const formValues = formToJSON(this.form);
		this.valuesSavedHistory = formValues;

		if (opts) {
			this.opts = { ...this.opts, ...opts };
		}
		if (this.opts.autosaveTimeout) {
			if (this.opts.autosaveTimeout <= this.opts.debounceTimeout) {
				throw new Error(
					'Autosave timer should be 0 (disabled) or a number greater than the debounceTimeout'
				);
			}
			this.autoSaveTimerStartNumber = this.opts.autosaveTimeout
				? Math.floor(this.opts.autosaveTimeout / 1000)
				: 0;
		}

		return this;
	}
	public static attributes = attributes;

	private _disable(disable: boolean) {
		const inputs = this.form.querySelectorAll(
			'input, textarea, select, button'
		) as any as FormElements;
		for (let i = 0, iLen = inputs.length; i < iLen; i++) {
			inputs[i].disabled = disable;
		}
		return this;
	}

	public disableAll() {
		return this._disable(true);
	}
	public enableAll() {
		return this._disable(false);
	}

	public clear() {
		this.valuesToSave = {};
		this.valuesSavedHistory = {};
		this._setSaveStatus(false);
		clearForm(this.form);
		return this;
	}

	public fill(data: any, clear = true) {
		if (clear) {
			this.clear();
		}
		const lastSavedHistory = structuredClone(this.valuesSavedHistory);
		this.valuesSavedHistory = extend(this.valuesSavedHistory, data);
		if (contains(lastSavedHistory, this.valuesSavedHistory)) {
			this.valuesToSave = {};
			this._setSaveStatus(false);
			this._clearAutoSaveDebounce();
		} else {
			this.valuesToSave = extend(this.valuesToSave, data);
			this._startAutosaveTimer();
		}
		fillForm(this.form, data);
		return this;
	}

	public saveStatus(callback: (enabled: boolean) => void) {
		this.saveStatusCallback = callback;
		this._setSaveStatus(!!Object.keys(this.valuesToSave).length);
		return this;
	}

	private _setSaveStatus(status: boolean) {
		if (this.saveStatusCallback) {
			this.saveStatusCallback(status);
		}
		return this;
	}

	public cancelSave() {
		this._setSaveStatus(false);
		this._clearAutoSaveDebounce();
		return this;
	}

	private _cancelAutoSaveTimer() {
		clearInterval(this.autoSaveNumberTimer);
	}

	public saveStart() {
		this.disableAll();
		this.cancelSave();
		return this;
	}

	public saveSuccess() {
		const _this = this;
		this.valuesSavedHistory = extend(this.valuesSavedHistory, this.valuesToSave);
		this.valuesToSave = {};
		this.enableAll();
		_this._setSaveStatus(false);
		return this;
	}

	public saveFinally() {
		this.enableAll();
		return this;
	}

	public autoSave(callback: (value: T) => void) {
		if (this.fragmentOnInputAlready) {
			throw new Error('.autoSave() callback must be initialized before framentOnInput');
		}
		if (this.autoSaveCallbackAlready) {
			throw new Error(
				'.fragmentOnInput() is not reusable and cannot be initialized more than once'
			);
		}
		if (!this.opts.autosaveTimeout) {
			throw new Error(`.autoSave(), you need to specify a number for the option "autosaveTimeout"`);
		}
		this.autoSaveCallbackAlready = true;
		const [autoSaveDebounce, _clearAutoSaveDebounce] = debounce(
			callback,
			this.opts.autosaveTimeout
		);
		this.autoSaveCallback = autoSaveDebounce;
		this._clearAutoSaveDebounce = _clearAutoSaveDebounce;
	}

	public autoSaveTimer(callback: (timeRemaining: number) => void) {
		if (this.autoSaveTimerAlready) {
			throw new Error('.autoSaveTimer() is not reusable and cannot be initialized more than once');
		}
		this.autoSaveTimerAlready = true;
		this.autoSaveNumberTimerCallback = callback;
	}

	private _startAutosaveTimer() {
		this.autoSaveTimerCurrentNumber = this.autoSaveTimerStartNumber;
		const _this = this;
		const autoSaveNumberTimerCallback = _this.autoSaveNumberTimerCallback;
		if (autoSaveNumberTimerCallback) {
			autoSaveNumberTimerCallback(_this.autoSaveTimerCurrentNumber--);
			this.autoSaveNumberTimer = setInterval(function () {
				autoSaveNumberTimerCallback(_this.autoSaveTimerCurrentNumber--);
				if (_this.autoSaveTimerCurrentNumber === -1) {
					_this._cancelAutoSaveTimer();
				}
			}, 1000);
		}
		this._setSaveStatus(true);
	}

	private _commitToSaveValues(values: any) {
		this.valuesToSave = extend(this.valuesToSave, values);
		if (contains(this.valuesSavedHistory, this.valuesToSave)) {
			this.valuesToSave = {};
			this._setSaveStatus(false);
			this._clearAutoSaveDebounce();
		} //
		else if (this.autoSaveCallback) {
			this._startAutosaveTimer();
			this.autoSaveCallback(this.valuesToSave);
		} //
		else {
			this._setSaveStatus(true);
		}
	}

	public addEventListener(eventName: string, eventFunction: CallableFunction) {
		this.form.addEventListener(eventName as any, eventFunction as any);
		this.listeners.push([eventName, eventFunction]);
		return this;
	}

	public fragmentOnInput(callback: CallableFunction) {
		if (this.fragmentOnInputAlready) {
			throw new Error(
				'.fragmentOnInput() is not reusable and cannot be initialized more than once'
			);
		}
		this.fragmentOnInputAlready = true;
		const _this = this;
		let lastInput: any = null;
		const onInput = function (e: InputEvent) {
			_this._setSaveStatus(false);
			_this._cancelAutoSaveTimer();
			lastInput = e.target;
		};
		const _onInputDebounce = function (e: InputEvent) {
			const input = e.target as FormElement;
			const name = input?.name;
			if (!name) {
				return;
			}
			if (e.type === 'focusout') {
				if (input === lastInput) {
					clearDebounce();
				} else {
					return;
				}
			}
			lastInput = null;

			const data = formToJSON(
				_this.form.querySelectorAll(`[name="${name}"], ${alwaysSelectors(name)}`)
			);
			callback(data, function () {
				_this._commitToSaveValues(data);
			});
		};

		const [onInputDebounce, clearDebounce] = debounce(_onInputDebounce, _this.opts.debounceTimeout);

		this.addEventListener('input', onInput);
		this.addEventListener('input', onInputDebounce);
		this.addEventListener('focusout', _onInputDebounce);
	}

	public destroy() {
		this._cancelAutoSaveTimer();
		this._clearAutoSaveDebounce();
		for (let i = 0, iLen = this.listeners.length; i < iLen; i++) {
			this.form.removeEventListener(this.listeners[i][0] as any, this.listeners[i][1] as any);
		}
	}
}

// known issues
// attrs function SSR won't add value attribute to select option - issue lies with svelte
// 1. manually add value
// 2. OR run fill, but will only work if user has JS enabled
