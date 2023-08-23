import type { ZodIssue } from 'zod';

import type {
	FormElement,
	AllowedZSchema,
	FragmentFormsConstructorOpts,
	FragmentFormsOpts,
	AddEventListenerArgs,
	CEDT
} from './types.js';
import { formDataStructure } from './types.js';

import {
	debounce,
	alwaysSelectors,
	toEntries,
	entriesToFormData,
	modifyEntries,
	modifiedEntriesToJSON
} from './utils.js';
import schema from '../routes/tests/01/schema.js';

const isBrowser = typeof window !== 'undefined' && typeof window.document !== 'undefined';

class FragmentForms<ZSchema extends AllowedZSchema = typeof formDataStructure> {
	private _opts: FragmentFormsOpts = {
		schema: formDataStructure,
		debounce: 500,
		autoSaveTimeout: 0,
		save: false
	};

	private _onInputTimeout: any = noop;

	private _form: HTMLFormElement | null = null;

	private _waitingEventListeners: (AddEventListenerArgs | null)[] = [];
	private _addedEventListeners: AddEventListenerArgs[] = [];
	private _customEventListeners: Record<string, CallableFunction[]> = {};

	private _autoSaveTimerStartNumber: number = 0;

	private _issues = [];

	constructor(opts?: FragmentFormsConstructorOpts<ZSchema>) {
		this._opts = { ...this._opts, ...opts };
		if (this._opts.autoSaveTimeout) {
			this._opts.save = true;
			if (this._opts.autoSaveTimeout <= this._opts.debounce) {
				throw new Error(
					'Autosave timeout should be 0 (disabled) or a number greater than the debounce'
				);
			}
			this._autoSaveTimerStartNumber = Math.floor(this._opts.autoSaveTimeout / 1000);
		}
		return this;
	}

	public form(form: HTMLFormElement | null) {
		if (!form) {
			return this;
		}
		if (this._form) {
			throw new Error('Form already set');
		}
		this._form = form;
		if (!isBrowser) {
			return this;
		}
		this._onSubmit();
		if (this._opts.save) {
			this._onInput();
		}
		if (this._waitingEventListeners) {
			for (let i = 0, iLen = this._waitingEventListeners.length; i < iLen; i++) {
				this.addEventListener(...(this._waitingEventListeners[i] as AddEventListenerArgs));
				this._addedEventListeners.push(this._waitingEventListeners[i] as AddEventListenerArgs);
				this._waitingEventListeners[i] = null;
			}
		}
		return this;
	}

	public addEventListener(...args: AddEventListenerArgs) {
		if (!isBrowser) {
			return this;
		}
		if (this._form) {
			this._form.addEventListener(...args);
			this._addedEventListeners.push(args);
		} else {
			this._waitingEventListeners.push(args);
		}
		return this;
	}

	public listen(name: 'save', callback: (detail: CEDT<ZSchema>['save']) => void): this;
	public listen(name: 'fragment', callback: (detail: CEDT<ZSchema>['fragment']) => void): this;
	public listen(name: string, callback: (detail: any) => void): this {
		if (!isBrowser) {
			return this;
		}
		if (!this._customEventListeners.hasOwnProperty(name)) {
			this._customEventListeners[name] = [];
		}
		this._customEventListeners[name].push(callback);

		return this;
	}

	public cleanUp() {
		if (!isBrowser) {
			return this;
		}
		this._onInputTimeout();
		if (this._form) {
			for (let i = 0, iLen = this._addedEventListeners.length; i < iLen; i++) {
				this._form.removeEventListener(...this._addedEventListeners[i]);
			}
		}
		this._waitingEventListeners = [];
		this._addedEventListeners = [];
		this._customEventListeners = {};
		return this;
	}

	private _dispatch(name: 'save', detail: CEDT<ZSchema>['save']): this;
	private _dispatch(name: 'fragment', detail: CEDT<ZSchema>['fragment']): this;
	private _dispatch(name: string, detail: any): this {
		if (this._customEventListeners.hasOwnProperty(name)) {
			const listeners = this._customEventListeners[name];
			for (let i = 0, iLen = listeners.length; i < iLen; i++) {
				listeners[i](detail);
			}
		}
		return this;
	}

	private _onSubmit() {
		if (!this._form) {
			return;
		}
		const _this = this;
		this.addEventListener('submit', function (e) {
			e.preventDefault();
			const formData = new FormData(_this._form as HTMLFormElement);
			const entries = toEntries(formData);
			const data = modifiedEntriesToJSON(modifyEntries(entries));
			console.log(data);
			const zodIssues = schema.safeParse(data);
			if (zodIssues && 'error' in zodIssues) {
				console.log(formatIssues(zodIssues.error.issues));
				return;
			}
		});
	}

	private _onInput() {
		const _this = this;
		let lastInput: EventTarget | null = null;

		const onInput = function (e: InputEvent) {
			lastInput = e.target;
		};

		const onInputDebounce = function (e: InputEvent) {
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

			const entries = toEntries(
				(_this._form as HTMLFormElement).querySelectorAll(
					`[name="${name}"], ${alwaysSelectors(name)}`
				)
			);
			const data = modifiedEntriesToJSON(modifyEntries(entries));
		};

		const [onInputDebounced, clearDebounce] = debounce(onInputDebounce, this._opts.debounce);

		this._onInputTimeout = clearDebounce;

		this.addEventListener('input', onInput as any);
		this.addEventListener('focusout', onInputDebounce as any);
		this.addEventListener('input', onInputDebounced as any);
	}
}

export { FragmentForms };

function formatIssues(issues: any) {
	const done: any = {};
	const formattedIssues = {};
	const noPathIssues: string[] = [];
	for (let i = 0, iLen = issues.length; i < iLen; i++) {
		const issue = issues[i] as ZodIssue & { type?: string; expected?: string };
		const path = issue?.path;
		if (!path.length) {
			noPathIssues.push(issue.message);
			continue;
		}
		const key = path.join('-');
		if (done.hasOwnProperty(key)) {
			continue;
		}
		done[key] = true;
		let target: any = formattedIssues;
		for (let j = 0, jLen = path.length; j < jLen; j++) {
			const last = j === jLen - 1;
			let currentTarget = target?.[path[j]] || {};
			if (last) {
				if (issue?.type === 'array' || issue?.expected === 'array' || !isNaN(path[j] as number)) {
					currentTarget._error = issue.message;
				} else {
					currentTarget = issue.message;
				}
			}
			target[path[j]] = currentTarget;
			target = currentTarget;
		}
	}
	return [formattedIssues, noPathIssues];
}

function noop() {}
