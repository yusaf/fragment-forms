import { z } from 'zod';
import type {
	Primitive,
	FormElements,
	FormattedIssues,
	AllowedZSchema,
	FormDataStructure
} from './types.js';

type SetValue = {
	form: HTMLFormElement;
	data: FormDataStructure;
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

export function modifiedEntriesToJSON(entries: ModifiedEntries): FormDataStructure {
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
	boolean: (value: string) => (value === 'false' ? false : true),
	date: (value: string) => new Date(value),
	dateTime: (value: string) => new Date(value)
};

export function coerceStringValue(value: string, coerceTo: Coercable) {
	return coerceStringValues[coerceTo](value);
}
const coerceTypeValues = {
	string: (value: string) => '' + value,
	number: (value: number) => '' + (isNaN(value) ? '' : value),
	boolean: (value: boolean) => (value === false ? 'false' : 'true'),
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

export function extendUsingPath(path: string[], _target: any, source: any) {
	const data = extend(_target, source);
	const isArray = path[path.length - 1] === '';
	let sourceTarget = source;
	let target = data;
	for (let i = 0, iLen = path.length; i < iLen; i++) {
		const currentKey = path[i];
		const currentSourceTarget = sourceTarget?.[currentKey];
		const currentTarget = target?.[currentKey];
		const last = i === iLen - 1;
		const secondToLast = i === iLen - 2;
		if (secondToLast && isArray) {
			if (currentSourceTarget === undefined) {
				delete target[currentKey];
			} else {
				target[currentKey] = currentSourceTarget;
			}
			break;
		} //
		else if (last) {
			if (currentSourceTarget === undefined) {
				delete target[currentKey];
			} else {
				target[currentKey] = currentSourceTarget;
			}
			break;
		}
		sourceTarget[currentKey] = currentSourceTarget;
		target[currentKey] = currentTarget;
		sourceTarget = sourceTarget[currentKey];
		target = target[currentKey];
	}
	return clearEmpties(data);
}
function clearEmpties(o: any) {
	for (let k in o) {
		if (!o[k] || typeof o[k] !== 'object') {
			continue;
		}

		clearEmpties(o[k]);
		if (Object.keys(o[k]).length === 0) {
			delete o[k];
		}
	}
	return o;
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

// export function formatIssues<ZSchema extends AllowedZSchema>(
// 	issues: any
// ): FormattedIssues<ZSchema> {
// 	const done: any = {};
// 	const formattedIssues: any = {};
// 	const noPathIssues: string[] = [];
// 	for (let i = 0, iLen = issues.length; i < iLen; i++) {
// 		const issue = issues[i] as z.ZodIssue & { type?: string; expected?: string };
// 		const path = issue?.path;
// 		if (!path.length) {
// 			noPathIssues.push(issue.message);
// 			continue;
// 		}
// 		const key = path.join('-');
// 		if (done.hasOwnProperty(key)) {
// 			continue;
// 		}
// 		done[key] = true;
// 		let target: any = formattedIssues;
// 		for (let j = 0, jLen = path.length; j < jLen; j++) {
// 			const last = j === jLen - 1;
// 			let currentTarget = target?.[path[j]] || {};
// 			if (last) {
// 				currentTarget._issue = issue.message;
// 			}
// 			target[path[j]] = currentTarget;
// 			target = currentTarget;
// 		}
// 	}
// 	return {
// 		issues: formattedIssues,
// 		noPathIssues
// 	};
// }
export function formatIssues<ZSchema extends AllowedZSchema>(
	issues: any
): FormattedIssues<ZSchema> {
	const done: any = {};
	const formattedIssues: any = {};
	const noPathIssues: string[] = [];
	for (let i = 0, iLen = issues.length; i < iLen; i++) {
		const issue: z.ZodIssue = issues[i];
		const path = issue?.path;
		if (!path.length) {
			noPathIssues.push(issue.message);
			continue;
		}
		const key = path.join('-');
		if (done.hasOwnProperty(key)) {
			continue;
		} //
		done[key] = true;

		const isArray = !isNaN(path[path.length - 1] as number);
		let target: any = formattedIssues;
		for (let j = 0, jLen = path.length; j < jLen; j++) {
			const last = j === jLen - 1;
			const secondToLast = j === jLen - 2;
			let currentTarget = target?.[path[j]] || {};
			if (secondToLast && isArray) {
				currentTarget._issue_in = issue.message;
			} else if (last) {
				currentTarget._issue = issue.message;
			}
			target[path[j]] = currentTarget;
			target = currentTarget;
		}
	}
	return {
		issues: formattedIssues,
		noPathIssues
	};
}
export function getSchemaObject<Schema extends z.ZodTypeAny>(schema: Schema): z.AnyZodObject {
	let schemaObject = schema;
	while (
		schemaObject instanceof z.ZodObject ||
		schemaObject instanceof z.ZodRecord ||
		schemaObject instanceof z.ZodEffects
	) {
		if (schemaObject instanceof z.ZodEffects) {
			schemaObject = schemaObject._def.schema;
			continue;
		} else if (schemaObject instanceof z.ZodObject) {
			break;
		} else if (schemaObject instanceof z.ZodRecord) {
			break;
		}
	}
	return schemaObject as unknown as z.AnyZodObject;
}

export function containsErrors(object: any) {
	for (let key in object) {
		const item = object[key];
		if (!item) {
			delete object[key];
			continue;
		}
		if (typeof item === 'string' && item.length) {
			return true;
		}
		if (typeof item === 'object' && Object.keys(item).length) {
			if (containsErrors(item)) {
				return true;
			}
			delete object[key];
		}
	}
	return false;
}

const FormDataSelector = `
input[name]:not([name=""]):not(:disabled):not([type=checkbox]):not([type=radio]):not([type=submit]),
input[name]:not([name=""])[type=checkbox]:not(:disabled):checked,
input[name]:not([name=""])[type=radio]:not(:disabled):checked,
select[name]:not([name=""]):not(:disabled):has(:checked:not(:disabled)) option,
textarea[name]:not([name=""]):not(:disabled)
`;

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

export function fillForm(form: HTMLFormElement | null | undefined, data: FormDataStructure) {
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

export function formToJSON<T extends FormDataStructure>(
	element: FormData | NodeListOf<Element> | HTMLFormElement | null | undefined
): T {
	if (!element) {
		throw new Error(
			'The toJSON argument must be either be FormData, a  HTML form element, or a list of input, select or textarea elements.'
		);
		4;
	}

	const entries = toEntries(element);
	const data = modifiedEntriesToJSON(modifyEntries(entries));
	return data as T;
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

export function attributes(data: FormDataStructure | null = null) {
	const valueTracker: any = {};
	const arraysCache: any = {};
	return function (
		name: string,
		type: types = 'text',
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
		}
		if (type === 'option') {
			delete attrs['name'];
		}
		return attrs;
	};
}
