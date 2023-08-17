import type { PageServerLoad } from './$types';
import { formToJSON } from 'fragment-forms';

let saved = {
	id: 'some-random-id',
	user: {
		name: {
			first: 'Yusaf',
			second: 'Khaliq'
		},
		sex: 'male',
		dob: new Date('1990-01-01'),
		interests: ['sports', 'finance'],
		contact: 'letter',
		consent: true
	}
};

export const actions = {
	default: async ({ request }) => {
		console.log(request);
		console.log('HERE DEFAULT');
		const formData = await request.formData();
		const data = formToJSON(formData);
		delete data.password;
		return data;
	}
};
export const load = (async () => {
	return saved;
}) satisfies PageServerLoad;
