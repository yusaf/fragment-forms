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
		const formData = await request.formData();
		const data = formToJSON(formData);
		console.log('HERE SUBMIT');
		return data;
	}
};
export const load = (async () => {
	return saved;
}) satisfies PageServerLoad;
