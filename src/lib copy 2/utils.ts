import type { Primitive, FormElement, FormElements } from './types.js';

type SetValue = {
	form: HTMLFormElement;
	data: JSONDataInner;
	path: string[];
	altNames: Record<string, Primitive>;
	coerceTypes: Record<string, Coercable>;
};
export function setValues({ form, altNames, coerceTypes, data, path }: SetValue) {
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

type Entry = [string, string];
type ModifiedEntry = [string[], Primitive];
type ModifiedEntries = ModifiedEntry[];

export function toEntries(
	element: FormData | HTMLFormElement | NodeListOf<Element> | null | undefined
): Entry[] {
	let entries: Entry[] = [];

	if (element instanceof FormData) {
		entries = [...element] as Entry[];
	} //
	else if (element instanceof HTMLFormElement) {
		entries = [...new FormData(element)] as Entry[];
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
	return entries;
}

export function modifyEntries(entries: Entry[]): ModifiedEntries {
	return entries.map(([name, value]) => entryToPathAndCoercedType(name, value));
}

export function modifiedEntriesToJSON(entries: ModifiedEntries): JSONData {
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
export function entriesToFormData(entries: Entry[]) {
	const formData = new FormData();
	for (let i = 0, iLen = entries.length; i < iLen; i++) {
		const [name, value] = entries[i];
		formData.append(name, value);
	}
	return formData;
}
const coercables = ['string', 'number', 'boolean', 'date', 'dateTime'] as const;
type Coercable = (typeof coercables)[number];
export function nameToPath(name: string): string[] {
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
export function sliceCoerceTypeFromName(name: string): [string, Coercable] {
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

export function entryToPathAndCoercedType(name: string, value: string): ModifiedEntry {
	let coerceType: Coercable;
	[name, coerceType] = sliceCoerceTypeFromName(name);
	const path = nameToPath(name);
	return [path, coerceStringValue(value, coerceType)];
}

export function pathToName(path: string[]) {
	let pathString = '';
	for (let j = 0, jLen = path.length; j < jLen; j++) {
		const isFirst = j === 0;
		const item = isNaN(path[j] as any as number) ? (isFirst ? '' : '.') + path[j] : `[${path[j]}]`;
		pathString += item;
	}
	return pathString;
}

export function getAltNamesAndTypes(
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

export function coerceStringValue(value: string, coerceTo: Coercable) {
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

export function coerceTypeValue(value: Primitive, coerceFrom: Coercable): string {
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

/**
 * for class
 */

export function narrowTypeof(v: any) {
	if (Array.isArray(v)) {
		return 'array';
	}
	if (v instanceof Date) {
		return 'date';
	}
	if (v === null) {
		return 'null';
	}
	return typeof v;
}

export function contains(target: any, source: any) {
	if (target === source) {
		return true;
	}
	const targetType = narrowTypeof(target);
	const sourceType = narrowTypeof(target);
	if (targetType !== sourceType) {
		return false;
	}
	if (sourceType === 'string') {
		if (target.replace(/\s+/g, '') !== source.replace(/\s+/g, '')) {
			return false;
		}
		return true;
	}
	if (sourceType === 'date') {
		if (target.valueOf() !== source.valueOf()) {
			return false;
		}
		return true;
	}
	if (sourceType === 'boolean' || sourceType === 'number') {
		return target === source;
	}

	if (sourceType === 'array') {
		if (target.length < source.length) {
			return false;
		}
		const indexes = Object.keys(source);
		for (let i = 0, iLen = indexes.length; i < iLen; i++) {
			const index = indexes[i];
			if (!contains(target?.[index], source[index])) {
				return false;
			}
		}
		return true;
	}
	if (sourceType === 'object') {
		const sourceKeys = Object.keys(source);
		for (let i = 0, iLen = sourceKeys.length; i < iLen; i++) {
			if (!target.hasOwnProperty(sourceKeys[i])) {
				return false;
			}
		}
		for (let i = 0, iLen = sourceKeys.length; i < iLen; i++) {
			if (!contains(target[sourceKeys[i]], source[sourceKeys[i]])) {
				return false;
			}
		}
		return true;
	}
	throw new Error(`Unsupported type ${targetType} in contains`);
}

export function extend(target: any, source: any, first = true) {
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

		const isDate = sourceChild instanceof Date;
		const isArray = isDate ? false : Array.isArray(sourceChild);
		const allPrimitiveArray = isArray
			? sourceChild.every((s: unknown) => {
					if (typeof s === 'object' && !(s instanceof Date)) {
						return false;
					}
					return true;
			  })
			: false;

		if (typeof sourceChild === 'object' && !isDate && !allPrimitiveArray) {
			target[key] = extend(target[key], sourceChild, false);
			continue;
		}

		target[key] = sourceChild;
	}
	return target;
}
const alwaysPrefix = '_$';
export function alwaysSelectors(name: string) {
	const path = nameToPath(name);
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

export function debounce(
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
