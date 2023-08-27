import { SUBMIT } from './form.js';

export const actions = {
	default: async ({ cookies, request }) => {
		return SUBMIT(request);
	}
};
