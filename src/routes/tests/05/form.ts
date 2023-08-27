import { z } from 'zod';
import { formToJSON } from 'fragment-forms';
import { fail } from '@sveltejs/kit';

const requiredString = z.string().nonempty('Required');

export const schema = z
	.object({
		id: requiredString,
		username: requiredString.min(3),
		password: requiredString.min(6),
		confirm_password: requiredString.min(6),
		do: z.object({
			you: z.object({
				agree: z.boolean()
			})
		})
	})
	.refine((data) => data.password === data.confirm_password, {
		message: 'Passwords do not match',
		path: ['confirm_password']
	});

const saveSchema = schema._def.schema.deepPartial();

export const SUBMIT = async function (request: Request) {
	const formData = await request.formData();
	const data = formToJSON(formData);
	const zodParse = schema.safeParse(data);
	const issues = zodParse.success ? undefined : zodParse?.error?.issues;
	let error = undefined;

	if (!issues) {
		// database stuff here
		// might error so assign to error
	}

	return fail(400, {
		success: false,
		data,
		issues,
		error: 'ERRROR'
	});

	delete data?.password;
	delete data?.confirm_password;
	if (issues || error) {
		return fail(400, {
			success: false,
			data,
			issues,
			error
		});
	} else {
		return {
			success: true
		};
	}
};
