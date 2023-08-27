import { formToJSON } from 'fragment-forms';
import { fail } from '@sveltejs/kit';
import schema from './schema.js';

export const actions = {
	default: async ({ cookies, request }) => {
		const formData = await request.formData();
		const data = formToJSON(formData);
		const zodParse = schema.safeParse(data);
		const issues = zodParse.success ? undefined : zodParse?.error?.issues;
		let error = undefined;

		if (!issues) {
			// database stuff here
			// might error so assign to error
		}

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
	}
};
