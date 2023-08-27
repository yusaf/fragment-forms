import { SUBMIT } from './form.js';

export const POST = async function (event) {
	const isSubmit = event.url.searchParams.get('submit') === 'true';
	const isSave = isSubmit ? false : event.url.searchParams.get('save') === 'true';

	if (isSubmit) {
	}
	if (isSave) {
		console.log('is save');
	}
};
