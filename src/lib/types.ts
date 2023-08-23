import { z } from 'zod';

export type DeepPartial<T> = T extends Date
	? T
	: T extends object
	? {
			[P in keyof T]?: DeepPartial<T[P]>;
	  }
	: T;

const primitive = z.union([z.string(), z.number(), z.boolean(), z.date()]);

const primitives = z.union([
	z.array(z.string()),
	z.array(z.number()),
	z.array(z.boolean()),
	z.array(z.date())
]);

const dataStructure: z.ZodType<DataStructure> = z.union([
	primitive,
	primitives,
	z.lazy(() => z.record(dataStructure)),
	z.lazy(() => z.array(z.record(dataStructure)))
]);

export const formDataStructure = z.record(dataStructure);

export type Primitive = z.infer<typeof primitive>;

export type Primitives = z.infer<typeof primitives>;

type DataStructure =
	| Primitive
	| Primitives
	| { [x: string]: DataStructure }
	| { [x: string]: DataStructure }[];

export type FormDataStructure = z.infer<typeof formDataStructure>;

/**
 * FRAGMENT FORM CLASS
 */

export type FormElement = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

export type FormElements = FormElement[];

export type AllowedZSchema = z.ZodRecord<any> | z.ZodObject<any> | z.ZodEffects<any> | z.ZodAny;

export type FragmentFormsConstructorOpts<ZSchema extends AllowedZSchema> = {
	schema?: ZSchema;
	saveSchema?: AllowedZSchema;
	debounce?: number;
	autoSaveTimeout?: number;
	save?: boolean;
};

export type FragmentFormsOpts = {
	schema: AllowedZSchema;
	saveSchema: AllowedZSchema;
	debounce: number;
	autoSaveTimeout: number;
	save: boolean;
};

export type AddEventListenerArgs = Parameters<HTMLFormElement['addEventListener']>;

//CustomEventDetailTypes
export type CEDT<ZSchema extends AllowedZSchema> = {
	submitData: z.infer<ZSchema>;
	submitFormData: FormData;
	saveData: z.infer<ZSchema>;
	issues: FormattedIssues<ZSchema>['issues'];
	noPathIssues: FormattedIssues<ZSchema>['noPathIssues'];
	canSave: boolean;
	autoSaveTimeLeft: number;
	savedData: z.infer<ZSchema>;
};

export type CEDTCB<ZSchema extends AllowedZSchema> = {
	[key in keyof CEDT<ZSchema>]: (detail: CEDT<ZSchema>[key]) => void;
};

type KeyValueObject = { [key: string]: any };

type SchemaArrayToIssues<Arr extends any[]> = Arr extends (infer Inner)[]
	? Inner extends Primitive
		? { [key: number]: string; _error: string }
		: Inner extends any[]
		? SchemaArrayToIssues<(Inner & { _error: string })[]>
		: Inner extends KeyValueObject
		? SchemaObjectToIssues<Inner & { _error: string }>[] & { _error: string }
		: never
	: never;

type SchemaObjectToIssues<Schema> = Schema extends KeyValueObject
	? {
			[key in keyof Schema]?: Schema[key] extends Primitive
				? { _error: string }
				: Schema[key] extends any[]
				? SchemaArrayToIssues<Schema[key]>
				: Schema[key] extends KeyValueObject
				? SchemaObjectToIssues<Schema[key] & { _error: string }>
				: never;
	  }
	: never;

type SchemaToIssues<Schema> = Schema extends KeyValueObject
	? SchemaObjectToIssues<Schema>
	: unknown;

export type FormattedIssues<ZSchema extends AllowedZSchema> = {
	issues: ZSchema extends z.ZodAny ? any : SchemaToIssues<z.infer<ZSchema>>;
	noPathIssues: string[];
};
