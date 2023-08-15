<script lang="ts">
	import { browser } from '$app/environment';
	import { formToJSON, fillForm, clearForm, attributes } from 'fragment-forms';
	import { onMount } from 'svelte';
	export let form;

	// const attrs = attr({
	// 	id: '',
	// 	user: {
	// 		name: {
	// 			first: 'Yusaf',
	// 			second: 'Khaliq'
	// 		},
	// 		sex: 'male',
	// 		dob: new Date('1990-01-01T00:00:00.000Z'),
	// 		interests: ['politics', 'finance'],
	// 		contact: ['E-Mail'],
	// 		consent: false
	// 	}
	// });

	let formEl: HTMLFormElement;

	let attrs = attributes(form);
</script>

<form method="POST">
	<input {...attrs('_$id', 'hidden')} /><br />
	<br />
	Username:<br />
	<input {...attrs('username', 'text')} /><br />
	<br />
	Password:<br />
	<input {...attrs('password', 'password')} /><br />
	<br />
	Name:<br />
	First: <input {...attrs('user.name.first', 'text')} /><br />
	Second: <input {...attrs('user.name.second', 'text')} /><br />
	<br />
	Sex:<br />
	Male: <input {...attrs('user.sex', 'radio', 'male')} /><br />
	Female: <input {...attrs('user.sex', 'radio', 'female')} /><br />
	<br />
	Date Of Birth:
	<input {...attrs('user.dob(date)', 'date')} /><br />
	<br />
	Interests<br />
	Sports:<input {...attrs('user.interests[]', 'checkbox', 'sports')} /><br />
	Politics:<input {...attrs('user.interests[]', 'checkbox', 'politics')} /><br />
	Finance:<input {...attrs('user.interests[]', 'checkbox', 'finance')} /><br />
	<br />
	Contact preferences:<br />
	<select {...attrs('user.contact[]', 'select')}>
		<option disabled selected value />
		<option {...attrs('user.contact[]', 'option', 'sms')} value="sms">SMS</option>
		<option {...attrs('user.contact[]', 'option', 'email')} value="email">E-mail</option>
		<option {...attrs('user.contact[]', 'option', 'letter')} value="letter">Letter</option>
	</select><br />
	<br />
	Consent to share details:<br />
	Yes:
	<input {...attrs('user.consent(boolean)', 'radio', true)} /><br />
	No:
	<input {...attrs('user.consent(boolean)', 'radio', false)} /><br />
	<br />
	Labels<br />
	Label 1:<input {...attrs('labels[]', 'text')} /><br />
	Label 2:<input {...attrs('labels[]', 'text')} /><br />
	Label 3:<input {...attrs('labels[]', 'text', '')} /><br />
	Mode<br />
	<select {...attrs('mode', 'select')}>
		<option disabled selected value />
		<option {...attrs('mode', 'option', 'dark')} value="dark">Dark</option>
		<option {...attrs('mode', 'option', 'light')} value="light">Light</option>
	</select><br />
	Agree:<input {...attrs('do.you.agree(boolean)', 'checkbox', true)} /><br />
	<input type="submit" />
	<input type="submit" value="log" on:click|preventDefault={log} />
	<input type="submit" value="fill" on:click|preventDefault={fill} />
	<input type="submit" value="clear" on:click|preventDefault={clear} />
</form>
