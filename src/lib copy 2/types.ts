import { z } from 'zod';

type DeepPartial<T> = T extends Date
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
	z.lazy(() => z.record(dataStructure))
]);

export const formDataStructure = z.record(dataStructure);

export type Primitive = z.infer<typeof primitive>;

export type Primitives = z.infer<typeof primitives>;

type DataStructure = Primitive | Primitives | { [x: string]: DataStructure };

export type FormDataStructure = z.infer<typeof formDataStructure>;

/**
 * FRAGMENT FORM CLASS
 */

export type FormElement = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

export type FormElements = FormElement[];

export type AllowedZSchema = z.ZodRecord<any> | z.ZodObject<any> | z.ZodEffects<any> | z.ZodAny;

export type FragmentFormsConstructorOpts<ZSchema extends AllowedZSchema> = {
	schema?: ZSchema;
	debounce?: number;
	autoSaveTimeout?: number;
	save?: boolean;
};

export type FragmentFormsOpts = {
	schema: AllowedZSchema;
	debounce: number;
	autoSaveTimeout: number;
	save: boolean | 'fragment' | 'form';
};

export type AddEventListenerArgs = Parameters<HTMLFormElement['addEventListener']>;

//CustomEventDetailTypes
export type CEDT<ZSchema extends AllowedZSchema> = {
	save: boolean;
	fragment: DeepPartial<z.infer<ZSchema>>;
};
