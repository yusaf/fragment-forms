import { formToJSON } from 'fragment-forms';
export const actions = {
	default: async ({ cookies, request }) => {
		const formData = await request.formData();
		const data = formToJSON(formData);
		console.log(data);
		delete data.password;
		return data;
	}
};
