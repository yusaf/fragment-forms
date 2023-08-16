import equal from 'fast-deep-equal';
import structuredClone from '@ungap/structured-clone';
if (!('structuredClone' in globalThis)) {
	//@ts-ignore
	globalThis.structuredClone = structuredClone;
}
type Primitive = string | number | boolean | Date;
type FormElement = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
type FormElements = FormElement[];

type JSONData = {
	[key: string]: JSONDataInner;
};
type JSONDataInner = Primitive | JSONData | (Primitive | JSONData)[];

const isBrowser = typeof window !== 'undefined' && typeof window.document !== 'undefined';

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
					arraysCache[name] = current.map((item) => coerceTypeValue(item, coerceFrom));
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

type SetValue = {
	form: HTMLFormElement;
	data: JSONDataInner;
	path: string[];
	altNames: Record<string, Primitive>;
	coerceTypes: Record<string, Coercable>;
};
function setValues({ form, altNames, coerceTypes, data, path }: SetValue) {
	if (typeof data !== 'object' || data instanceof Date) {
		const name = pathToName(path);
		const altName = altNames[name as string];
		const coerceFrom = coerceTypes[name as string];
		const elements = form.querySelectorAll(
			`input[name="${altName}"], select[name="${altName}"] option, textarea[name="${altName}"]`
		) as any as FormElements;
		if (!elements?.length) {
			return;
		}
		const nodeName = elements?.[0]?.nodeName?.toLowerCase();
		const type = nodeName === 'input' ? elements[0]?.type || 'text' : nodeName;
		const isOption = nodeName === 'option';
		const isCheckbox = type === 'checkbox';
		const isRadio = type === 'radio';

		const value = coerceTypeValue(data, coerceFrom);

		if (isOption || isCheckbox || isRadio) {
			for (let j = 0, jLen = elements.length; j < jLen; j++) {
				const element = elements[j];
				if (element.value !== value) {
					continue;
				}
				if (isOption) {
					(element as any as HTMLOptionElement).selected = true;
				} else if (isCheckbox) {
					(element as HTMLInputElement).checked = true;
				} else if (isRadio) {
					(element as HTMLInputElement).checked = true;
				}
			}
		} else {
			elements[0].value = value;
		}
		return;
	}
	const isArray = Array.isArray(data);
	const name = isArray ? pathToName(path) + '[]' : false;
	const isUnindexedArray = name ? altNames.hasOwnProperty(name) : false;
	if (isArray && isUnindexedArray) {
		const altName = altNames[name as string];
		const coerceFrom = coerceTypes[name as string];
		const elements = form.querySelectorAll(
			`input[name="${altName}"], select[name="${altName}"] option, textarea[name="${altName}"]`
		) as any as FormElements;

		const nodeName = elements?.[0]?.nodeName?.toLowerCase();
		const type = nodeName === 'input' ? elements[0]?.type || 'text' : nodeName;

		const isOption = type === 'option';
		const isCheckbox = type === 'checkbox';
		const isRadio = type === 'radio';

		if (isOption || isCheckbox || isRadio) {
			for (let i = 0, iLen = data.length; i < iLen; i++) {
				const value = coerceTypeValue(data[i] as Primitive, coerceFrom);
				for (let j = 0, jLen = elements.length; j < jLen; j++) {
					const element = elements[j];
					if (element.value !== value) {
						continue;
					}
					if (isOption) {
						(element as any as HTMLOptionElement).selected = true;
					} else if (isCheckbox) {
						(element as HTMLInputElement).checked = true;
					} else if (isRadio) {
						(element as HTMLInputElement).checked = true;
					}
				}
			}
		} else {
			for (let i = 0, iLen = data.length; i < iLen; i++) {
				if (!elements?.[i]) {
					break;
				}
				const value = coerceTypeValue(data[i] as Primitive, coerceFrom);
				elements[i].value = value;
			}
		}
		return;
	}
	for (let key in data) {
		setValues({
			form,
			altNames,
			coerceTypes,
			//@ts-ignore
			data: data[key],
			path: [...path, key]
		});
	}
}

type ModifiedEntry = [string[], Primitive];
type ModifiedEntries = ModifiedEntry[];

function toEntries(
	element: FormData | HTMLFormElement | NodeListOf<Element> | null | undefined
): ModifiedEntries {
	let entries: [string, string][] = [];

	if (element instanceof FormData) {
		entries = [...element] as [string, string][];
	} //
	else if (element instanceof HTMLFormElement) {
		entries = [...new FormData(element)] as [string, string][];
		// elements = [
		// 	...element.querySelectorAll(`
		//         input[name]:not([name=""]):not(:disabled):not([type=checkbox]):not([type=radio]):not([type=submit]),
		//         input[name]:not([name=""])[type=checkbox]:not(:disabled):checked,
		//         input[name]:not([name=""])[type=radio]:not(:disabled):checked,
		//         select[name]:not([name=""]):not(:disabled):has(:checked:not(:disabled)),
		//         textarea[name]:not([name=""]):not(:disabled)
		//         `)
		// ] as FormElements;
	} //
	else if (element instanceof NodeList) {
		let elements = [...element] as FormElements;
		elements = elements.filter((element) => {
			if (element.disabled || !element?.name) {
				return false;
			}
			let add = true;

			const nodeName = element.nodeName.toLowerCase();
			const type = element?.type;
			if (nodeName === 'select') {
				add = !!element.querySelector('option:checked:not(:disabled)');
			} //
			else if (type === 'submit') {
				add = false;
			} //
			else if (type === 'checkbox') {
				add = (element as HTMLInputElement).checked;
			} //
			else if (type === 'radio') {
				add = (element as HTMLInputElement).checked;
			}
			return add;
		});
		for (let i = 0, iLen = elements.length; i < iLen; i++) {
			const element = elements[i];
			const name = element.name;
			const nodeName = element.nodeName.toLowerCase();
			if (nodeName === 'select') {
				const selected = ((element as HTMLSelectElement).multiple
					? element.querySelectorAll('option:checked:not(:disabled)')
					: [element.querySelector('option:checked:not(:disabled)')]) as any as HTMLOptionElement[];
				for (let j = 0, jLen = selected.length; j < jLen; j++) {
					entries.push([name, selected[j].value]);
				}
				continue;
			}
			entries.push([name, element.value]);
		}
	}

	return entries.map(([name, value]) => entryToPathAndCoercedType(name, value));
}

const coercables = ['string', 'number', 'boolean', 'date', 'dateTime'] as const;
type Coercable = (typeof coercables)[number];
function nameToPath(name: string): string[] {
	return name
		.replaceAll('_$[', '.')
		.replaceAll('[', '.')
		.replaceAll(']', '')
		.split('.')
		.map(function (name) {
			if (name.startsWith('_$')) {
				return name.slice(2, name.length);
			}
			return name;
		});
}
function sliceCoerceTypeFromName(name: string): [string, Coercable] {
	let coerceType = 'string' as Coercable;
	for (let i = 0, iLen = coercables.length; i < iLen; i++) {
		const coercable = coercables[i];
		const coercableBrackets = `(${coercables[i]})`;
		if (name.endsWith(coercableBrackets)) {
			coerceType = coercable;
			name = name.slice(0, name.lastIndexOf(coercableBrackets));
		}
	}
	return [name, coerceType];
}

function entryToPathAndCoercedType(name: string, value: string): ModifiedEntry {
	let coerceType: Coercable;
	[name, coerceType] = sliceCoerceTypeFromName(name);
	const path = nameToPath(name);
	return [path, coerceStringValue(value, coerceType)];
}

function pathToName(path: string[]) {
	let pathString = '';
	for (let j = 0, jLen = path.length; j < jLen; j++) {
		const isFirst = j === 0;
		const item = isNaN(path[j] as any as number) ? (isFirst ? '' : '.') + path[j] : `[${path[j]}]`;
		pathString += item;
	}
	return pathString;
}

function getAltNamesAndTypes(
	elements: FormElements
): [Record<string, string>, Record<string, Coercable>] {
	const doneNames: any = {};
	const altNames: Record<string, string> = {};
	const coerceTypes: Record<string, Coercable> = {};

	for (let i = 0, iLen = elements.length; i < iLen; i++) {
		const element = elements[i];
		let name = element.name;
		if (doneNames.hasOwnProperty(name)) continue;

		let [altName, coerceType] = sliceCoerceTypeFromName(name);
		const path = nameToPath(altName);
		const pathString = pathToName(path);
		altNames[pathString] = name;
		coerceTypes[pathString] = coerceType;
		doneNames[name] = true;
	}
	return [altNames, coerceTypes];
}

const coerceStringValues = {
	string: (value: string) => '' + value,
	number: (value: string) => (value === '' || isNaN(value as any as number) ? NaN : +value),
	boolean: (value: string) => (value === '0' ? false : true),
	date: (value: string) => new Date(value),
	dateTime: (value: string) => new Date(value)
};

function coerceStringValue(value: string, coerceTo: Coercable) {
	return coerceStringValues[coerceTo](value);
}
const coerceTypeValues = {
	string: (value: string) => '' + value,
	number: (value: number) => '' + (isNaN(value) ? '' : value),
	boolean: (value: boolean) => (value === false ? '0' : '1'),
	date: (value: Date) => {
		value = typeof value === 'string' ? new Date(value) : value;
		if (isNaN(+value)) {
			return '';
		}
		return value.toISOString().substring(0, 16).split('T')[0];
	},
	dateTime: (value: Date) => {
		value = typeof value === 'string' ? new Date(value) : value;
		if (isNaN(+value)) {
			return '';
		}
		return value.toISOString().substring(0, 16);
	}
};

function coerceTypeValue(value: Primitive, coerceFrom: Coercable): string {
	return coerceTypeValues[coerceFrom](value as never);
}

export function addCoercable<T>(
	name: string,
	methods: {
		toString(value: T): string;
		toType(value: string): T;
	}
) {
	//@ts-ignore
	coercables.push(name);
	//@ts-ignore
	coerceStringValues[name] = methods.toString;
	//@ts-ignore
	coerceTypeValues[name] = methods.toType;
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
	private valuesToSaveHistory: any = {};
	private valuesSavedHistory: any = {};

	private autoSaveTimerStartNumber: number = 0;
	private autoSaveTimerCurrentNumber: number = 0;
	private autoSaveNumberTimer: any;
	private autoSaveNumberTimerCallback?: (timeRemaining: number) => void;

	private autoSaveCallback?: (value: T) => void;
	private clearAutoSaveDebounce: () => void = () => {};

	private saveStatusCallback?: (enabled: boolean) => void;

	constructor(form: HTMLFormElement | null, opts?: FragmentFormArgOpts) {
		if (!(form instanceof HTMLFormElement)) {
			throw new Error('form argument must be a HTML Form element');
		}
		this.form = form;
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
				? Math.floor((this.opts.autosaveTimeout - this.opts.debounceTimeout) / 1000)
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
		this.valuesToSaveHistory = {};
		this.valuesSavedHistory = {};
		clearForm(this.form);
		this._setSaveStatus(false);
		return this;
	}

	public fill(data: any, clear = true) {
		if (clear) {
			this.clear();
		}
		this.valuesToSave = extend(this.valuesToSave, data);
		this.valuesToSaveHistory = extend(this.valuesToSaveHistory, data);
		this.valuesSavedHistory = extend(this.valuesSavedHistory, data);
		fillForm(this.form, data);
		return this;
	}

	public saveSuccess() {
		this.valuesSavedHistory = extend(this.valuesSavedHistory, this.valuesToSave);
		this.valuesToSave = {};
		this._setSaveStatus(false);
		this.enableAll();
		return this;
	}

	public saveFinally() {
		this.enableAll();
		return this;
	}

	public saveStatus(callback: (enabled: boolean) => void) {
		this.saveStatusCallback = callback;
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
		this.clearAutoSaveDebounce();
		return this;
	}

	private _cancelAutoSaveTimer() {
		this.autoSaveTimerCurrentNumber = this.autoSaveTimerStartNumber;
		clearInterval(this.autoSaveNumberTimer);
	}

	public saveStart() {
		this.disableAll();
		this.cancelSave();
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
		const [autoSaveDebounce, clearAutoSaveDebounce] = debounce(callback, this.opts.autosaveTimeout);
		this.autoSaveCallback = autoSaveDebounce;
		this.clearAutoSaveDebounce = clearAutoSaveDebounce;
	}

	public autoSaveTimer(callback: (timeRemaining: number) => void) {
		if (this.autoSaveTimerAlready) {
			throw new Error('.autoSaveTimer() is not reusable and cannot be initialized more than once');
		}
		this.autoSaveTimerAlready = true;
		this.autoSaveNumberTimerCallback = callback;
	}

	private _commitToSaveValues(values: any) {
		this.valuesToSave = extend(this.valuesToSave, values);
		this.valuesToSaveHistory = extend(this.valuesToSaveHistory, this.valuesToSave);
		if (equal(this.valuesSavedHistory, this.valuesToSaveHistory)) {
			this._setSaveStatus(false);
			this.clearAutoSaveDebounce();
			this.valuesToSave = {};
		} //
		else if (this.autoSaveCallback) {
			const _this = this;
			if (_this.autoSaveNumberTimerCallback) {
				this.autoSaveNumberTimer = setInterval(function () {
					_this.autoSaveNumberTimerCallback(_this.autoSaveTimerCurrentNumber--);
					if (_this.autoSaveTimerCurrentNumber === -1) {
						_this._cancelAutoSaveTimer();
					}
				}, 1000);
			}
			this.autoSaveCallback(this.valuesToSave);
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

			const path = nameToPath(name);

			const data = formToJSON(
				_this.form.querySelectorAll(`[name="${name}"], ${alwaysSelectors(path)}`)
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
		this.clearAutoSaveDebounce();
		for (let i = 0, iLen = this.listeners.length; i < iLen; i++) {
			this.form.removeEventListener(this.listeners[i][0] as any, this.listeners[i][1] as any);
		}
	}
}

function debounce(
	func: (...args: any) => any,
	timeout: number = 500
): [(...args: any) => void, () => void] {
	let timer: any;
	return [
		function (...args: any) {
			clearTimeout(timer);
			timer = setTimeout(() => {
				func(...args);
			}, timeout);
		},
		() => {
			clearTimeout(timer);
		}
	];
}

const alwaysPrefix = '_$';
function alwaysSelectors(path: string[]) {
	const selectors: string[] = [alwaysPrefix];
	let currentSelector = '';
	for (let i = 0, iLen = path.length; i < iLen; i++) {
		const last = i === iLen - 1;
		const secondToLast = i === iLen - 2;
		const key = path[i];
		if (last) {
			break;
		}
		if (secondToLast && path?.[i + 1] === '') {
			break;
		}
		if (isNaN(key as any as number)) {
			currentSelector += `${i === 0 ? '' : '.'}${key}`;
			selectors.push(`${currentSelector}.${alwaysPrefix}`);
		} else {
			selectors.push(`${currentSelector}_$[`);
			currentSelector += `[${key}]`;
			selectors.push(`${currentSelector}.${alwaysPrefix}`);
		}
	}
	return `[name^="` + selectors.join(`"], [name^="`) + `"]`;
}

function extend(target: any, source: any, first = true) {
	if (first) {
		target = structuredClone(target);
		source = structuredClone(source);
	}
	for (let key in source) {
		const sourceChild = source[key];

		if (!target.hasOwnProperty(key)) {
			target[key] = sourceChild;
			continue;
		}

		const isArray = Array.isArray(sourceChild);
		const allStringsArray = isArray ? sourceChild.every((s) => typeof s === 'string') : false;

		if (typeof sourceChild === 'object' && !allStringsArray) {
			target[key] = extend(target[key], sourceChild, false);
			continue;
		}

		target[key] = sourceChild;
	}
	return target;
}

// known issues
// attrs function SSR won't add value attribute to select option - issue lies with svelte
// 1. manually add value
// 2. OR run fill, but will only work if user has JS enabled
