import type {
	FormElement,
	FormElements,
	AllowedZSchema,
	FragmentFormsConstructorOpts,
	FragmentFormsOpts,
	AddEventListenerArgs,
	CEDTCB,
	CEDTD,
	FormattedIssues,
	CEDT
} from './types.js';
import { formDataStructure } from './types.js';

import {
	debounce,
	alwaysSelectors,
	toEntries,
	entriesToFormData,
	modifyEntries,
	modifiedEntriesToJSON,
	formatIssues,
	getSchemaObject,
	nameToPath,
	sliceCoerceTypeFromName,
	extend,
	extendUsingPath,
	contains,
	clearForm,
	fillForm,
	formToJSON,
	attributes
} from './utils.js';
import type { ZodIssue } from 'zod';

const isBrowser = typeof window !== 'undefined' && typeof window.document !== 'undefined';

class FragmentForms<ZSchema extends AllowedZSchema = typeof formDataStructure> {
	private _opts: FragmentFormsOpts = {
		schema: formDataStructure,
		saveSchema: null as any,
		debounce: 500,
		autoSaveTimeout: 0,
		save: false
	};

	private _formDisabled: boolean = false;

	private _onInputTimeout: any = noop;

	private _form: HTMLFormElement | null = null;

	private _waitingEventListeners: (AddEventListenerArgs | null)[] = [];
	private _addedEventListeners: AddEventListenerArgs[] = [];
	private _customEventListeners: Record<string, CallableFunction[]> = {};

	private _autoSaveTimerStartNumber: number = 0;
	private _autoSaveTimerCurrentNumber: number = 0;
	private _autoSaveNumberTimer: any = 0;

	private _noPathIssues: string[] = [];
	private _issues: any = {};

	private _values: any = {};
	private _valuesToSave: any = {};
	private _valuesSavedHistory: any = {};

	private _clearAutoSaveDebounce: () => void = () => {};

	public types: CEDT<ZSchema> = {} as CEDT<ZSchema>;

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
		if (this._opts.save) {
			if (this._opts.saveSchema === null) {
				const saveSchema = getSchemaObject(this._opts.schema);
				if (typeof saveSchema.deepPartial === 'function') {
					this._opts.saveSchema = saveSchema.deepPartial();
				} else {
					this._opts.saveSchema = saveSchema;
				}
			} else {
				this._opts.saveSchema = formDataStructure;
			}
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
		if (this._waitingEventListeners) {
			for (let i = 0, iLen = this._waitingEventListeners.length; i < iLen; i++) {
				this.addEventListener(...(this._waitingEventListeners[i] as AddEventListenerArgs));
				this._addedEventListeners.push(this._waitingEventListeners[i] as AddEventListenerArgs);
				this._waitingEventListeners[i] = null;
			}
		}
		this._onSubmit();
		if (this._opts.save) {
			this._onInput();
		}
		this._setSaveStatus(false);
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
	public cleanUp() {
		if (!isBrowser) {
			return this;
		}
		this._cancelAutoSaveTimer();
		this._clearAutoSaveDebounce();
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

	public listen(name: 'submitData', callback: CEDTCB<ZSchema>['submitData']): this;
	public listen(name: 'submitFormData', callback: CEDTCB<ZSchema>['submitFormData']): this;
	public listen(name: 'saveData', callback: CEDTCB<ZSchema>['saveData']): this;
	public listen(name: 'issues', callback: CEDTCB<ZSchema>['issues']): this;
	public listen(name: 'noPathIssues', callback: CEDTCB<ZSchema>['noPathIssues']): this;
	public listen(name: 'canSave', callback: CEDTCB<ZSchema>['canSave']): this;
	public listen(name: 'autoSaveTimeLeft', callback: CEDTCB<ZSchema>['autoSaveTimeLeft']): this;
	public listen(name: 'savedData', callback: CEDTCB<ZSchema>['savedData']): this;
	public listen(name: 'values', callback: CEDTCB<ZSchema>['values']): this;
	public listen(name: 'saving', detail: CEDTCB<ZSchema>['saving']): this;
	public listen(name: 'submitting', detail: CEDTCB<ZSchema>['submitting']): this;
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

	private _dispatch(name: 'submitData', detail: CEDTD<ZSchema>['submitData']): this;
	private _dispatch(name: 'submitFormData', detail: CEDTD<ZSchema>['submitFormData']): this;
	private _dispatch(name: 'saveData', detail: CEDTD<ZSchema>['saveData']): this;
	private _dispatch(name: 'issues', detail: CEDTD<ZSchema>['issues']): this;
	private _dispatch(name: 'noPathIssues', detail: CEDTD<ZSchema>['noPathIssues']): this;
	private _dispatch(name: 'canSave', detail: CEDTD<ZSchema>['canSave']): this;
	private _dispatch(name: 'autoSaveTimeLeft', detail: CEDTD<ZSchema>['autoSaveTimeLeft']): this;
	private _dispatch(name: 'savedData', detail: CEDTD<ZSchema>['savedData']): this;
	private _dispatch(name: 'values', detail: CEDTD<ZSchema>['values']): this;
	private _dispatch(name: 'saving', detail: CEDTD<ZSchema>['saving']): this;
	private _dispatch(name: 'submitting', detail: CEDTD<ZSchema>['submitting']): this;
	private _dispatch(name: string, detail: () => any): this {
		if (this._customEventListeners.hasOwnProperty(name)) {
			const _detail = detail();
			const listeners = this._customEventListeners[name];
			for (let i = 0, iLen = listeners.length; i < iLen; i++) {
				listeners[i](_detail);
			}
		}
		return this;
	}

	private _setIssues({ issues, noPathIssues }: FormattedIssues<ZSchema>) {
		this._issues = issues;
		this._noPathIssues = noPathIssues;
		this._dispatch('issues', () => issues);
		this._dispatch('noPathIssues', () => noPathIssues);
		return this;
	}

	private _onSubmit() {
		if (!this._form) {
			return;
		}
		if (this._formDisabled) {
			return;
		}
		const _this = this;
		this.addEventListener('submit', function (e) {
			e.preventDefault();
			const formData = new FormData(_this._form as HTMLFormElement);
			const entries = toEntries(formData);
			const data = modifiedEntriesToJSON(modifyEntries(entries));
			const zodIssues = _this._opts.schema.safeParse(data);
			if (zodIssues && 'error' in zodIssues) {
				_this._setIssues(formatIssues(zodIssues.error.issues));
			} else {
				_this._dispatch('submitData', () => data);
				_this._dispatch('submitFormData', () => entriesToFormData(entries));
			}
		});
	}

	private _onInput() {
		const _this = this;
		let lastInput: EventTarget | null = null;

		const onInput = function (e: InputEvent) {
			if (_this._formDisabled) {
				return;
			}
			_this._setSaveStatus(false);
			_this._cancelAutoSaveTimer();
			lastInput = e.target;
		};

		let lastWasError = false;
		const onInputDebounce = function (e: InputEvent) {
			if (_this._formDisabled) {
				return;
			}
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

			let inputIndex;

			if (input.nodeName.toLowerCase() === 'select') {
				inputIndex = 0;
			} else {
				const allInputs = (_this._form as HTMLFormElement).querySelectorAll(`[name="${name}"]`);
				inputIndex = [...allInputs].indexOf(input);
			}

			const entries = toEntries(
				(_this._form as HTMLFormElement).querySelectorAll(
					`[name="${name}"], ${alwaysSelectors(name)}`
				)
			);
			const _data = modifiedEntriesToJSON(modifyEntries(entries));
			const path = nameToPath(sliceCoerceTypeFromName(name)[0]);
			const data = extendUsingPath(path, _this._valuesToSave, _data);

			const isArray = path[path.length - 1] === '';
			lastWasError = false;
			const currentIssues = _this._issues;
			const zodIssues = _this._opts.saveSchema.safeParse(data);
			if (isArray) {
				path[path.length - 1] = inputIndex as any as string;
			}
			let foundIssue = isArray ? false : true;
			if ('error' in zodIssues) {
				lastWasError = true;
				const issues = zodIssues.error.issues;
				let issue: ZodIssue = issues[0];
				if (isArray) {
					for (let i = 0, iLen = issues.length; i < iLen; i++) {
						const _issue = issues[i];
						const lastInPath = _issue?.path[_issue?.path?.length - 1];
						if (lastInPath === inputIndex) {
							issue = _issue;
							foundIssue = true;
							break;
						}
					}
				}

				if (foundIssue) {
					let target: any = currentIssues;
					for (let i = 0, iLen = path.length; i < iLen; i++) {
						const last = i === iLen - 1;
						const secondToLast = i === iLen - 2;
						let currentTarget = target?.[path[i]] || {};
						if (secondToLast && isArray) {
							currentTarget._issue_in = issue.message;
						} else if (last) {
							currentTarget._issue = issue.message;
						}
						target[path[i]] = currentTarget;
						target = currentTarget;
					}
				} else {
					lastWasError = false;
				}
			}
			if (!lastWasError) {
				let target: any = currentIssues;
				for (let i = 0, iLen = path.length; i < iLen; i++) {
					const last = i === iLen - 1;
					const secondToLast = i === iLen - 2;
					if (secondToLast && isArray) {
						console.log('DATA', structuredClone(data));
						console.log('ISSUES', zodIssues);
						delete target?.[path[i]]?._issue;
						delete target?.[path[i]]?._issue_in;
					} else if (last) {
						delete target?.[path[i]];
						break;
					}
					target = target?.[path[i]];
				}
			}
			_this._dispatch('values', () => formToJSON(_this._form));
			_this._setIssues({ issues: currentIssues, noPathIssues: [] });
			if (!('error' in zodIssues)) {
				_this._commitToSaveValues(data);
			}
		};

		const [onInputDebounced, clearDebounce] = debounce(onInputDebounce, this._opts.debounce);

		this._onInputTimeout = clearDebounce;

		this.addEventListener('input', onInput as any);
		this.addEventListener('focusout', onInputDebounce as any);
		this.addEventListener('input', onInputDebounced as any);
		if (this._opts.autoSaveTimeout) {
			const [autoSaveDebounce, _clearAutoSaveDebounce] = debounce(function () {
				if (!lastWasError && Object.keys(_this._valuesToSave).length) {
					_this._dispatch('saveData', () => _this._valuesToSave);
				}
			}, this._opts.autoSaveTimeout);
			this._clearAutoSaveDebounce = _clearAutoSaveDebounce;
			this.addEventListener('input', autoSaveDebounce);
		}
	}

	private _commitToSaveValues(data: any) {
		this._valuesToSave = extend(this._valuesToSave, data);
		if (contains(this._valuesSavedHistory, this._valuesToSave)) {
			this._resetValuesToSave();
			this._setSaveStatus(false);
			this._clearAutoSaveDebounce();
		} //
		else if (this._opts.autoSaveTimeout) {
			this._startAutosaveTimer();
		} //
		else {
			this._setSaveStatus(true);
		}
	}

	private _resetValuesToSave() {
		this._valuesToSave = {};
		return this;
	}

	private _canSave: boolean | undefined;
	private _setSaveStatus(canSave: boolean) {
		if (canSave === this._canSave) {
			return this;
		}
		this._canSave = canSave;
		this._dispatch('canSave', () => canSave);
		return this;
	}

	private _startAutosaveTimer() {
		const _this = this;
		this._setSaveStatus(true);
		this._autoSaveTimerCurrentNumber = this._autoSaveTimerStartNumber;
		this._dispatch('autoSaveTimeLeft', () => this._autoSaveTimerCurrentNumber--);
		this._autoSaveNumberTimer = setInterval(function () {
			_this._dispatch('autoSaveTimeLeft', () => _this._autoSaveTimerCurrentNumber--);
			if (_this._autoSaveTimerCurrentNumber === -1) {
				_this._cancelAutoSaveTimer();
			}
		}, 1000);
	}
	private _cancelAutoSaveTimer() {
		this._autoSaveTimerCurrentNumber = 0;
		this._dispatch('autoSaveTimeLeft', () => 0);
		clearInterval(this._autoSaveNumberTimer);
		return this;
	}

	public static attributes = attributes;

	private _disable(disable: boolean) {
		if (!this._form) {
			return;
		}
		const inputs = this._form.querySelectorAll(
			'input, textarea, select, button'
		) as any as FormElements;
		for (let i = 0, iLen = inputs.length; i < iLen; i++) {
			const input = inputs[i];
			if (disable) {
				if (input.disabled) {
					input.dataset.FFAlreadyDisabled = 'true';
				}
			} else if (input.dataset.FFAlreadyDisabled) {
				delete input.dataset.FFAlreadyDisabled;
				continue;
			}
			input.disabled = disable;
		}
		return this;
	}

	public disableAll() {
		this._formDisabled = true;
		return this._disable(true);
	}
	public enableAll() {
		this._formDisabled = false;
		return this._disable(false);
	}

	private _setValuesSavedHistory(data: any) {
		this._valuesSavedHistory = data;
		this._dispatch('savedData', () => this._valuesSavedHistory);
		return this;
	}

	public clear(skip: boolean = false) {
		this._resetValuesToSave();
		this._clearAutoSaveDebounce();
		if (skip) {
			this._setValuesSavedHistory({});
		}
		this._setSaveStatus(false);
		clearForm(this._form);
		return this;
	}

	public fill(data: any) {
		this.clear(true);
		this._setValuesSavedHistory(data);
		fillForm(this._form, data);
		return this;
	}

	public cancelSave() {
		this._setSaveStatus(false);
		this._clearAutoSaveDebounce();
		this._cancelAutoSaveTimer();
		return this;
	}

	public saveStart() {
		this.disableAll();
		this.cancelSave();
		this._dispatch('saving', () => true);
		return this;
	}

	public saveSuccess() {
		const _this = this;
		this._setValuesSavedHistory(extend(this._valuesSavedHistory, this._valuesToSave));
		this._resetValuesToSave();
		this.enableAll();
		_this._setSaveStatus(false);
		this._dispatch('saving', () => false);
		return this;
	}

	public saveFinally() {
		this.enableAll();
		this._dispatch('saving', () => false);
		return this;
	}

	public submitStart() {
		this.disableAll();
		this.cancelSave();
		this._dispatch('submitting', () => true);
		return this;
	}

	public submitSuccess() {
		const _this = this;
		this._setValuesSavedHistory(formToJSON(this._form));
		this._resetValuesToSave();
		this.enableAll();
		_this._setSaveStatus(false);
		this._dispatch('submitting', () => false);
		return this;
	}

	public submitFinallyy() {
		this.enableAll();
		this._dispatch('submitting', () => false);
		return this;
	}

	public manualSave() {
		if (this._formDisabled) {
			return;
		}
		if (!Object.keys(this._valuesToSave).length) {
			return;
		}
		this.cancelSave();
		this._dispatch('saveData', () => this._valuesToSave);
		return this;
	}

	public manualSaveMake() {
		const _this = this;
		return function (e: any) {
			if (typeof e?.preventDefault === 'function') e?.preventDefault();
			_this.manualSave();
		};
	}
}

export { FragmentForms };

function noop() {}
