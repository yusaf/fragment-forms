<script lang="ts">
	import { formToJSON, fillForm, clearForm, attributes as attr } from 'fragment-forms';
	import { onMount } from 'svelte';
	export let form;

	if (form) {
		console.log('FORM', form);
	}

	const attributes = attr({
		id: '',
		user: {
			name: {
				first: 'Yusaf',
				second: 'Khaliq'
			},
			sex: 'male',
			dob: new Date('1990-01-01T00:00:00.000Z'),
			interests: ['politics', 'finance'],
			contact: ['email'],
			consent: false
		}
	});

	console.log(attributes('user.interests[]', 'checkbox'));

	console.log(form);

	let formEl: HTMLFormElement;
	onMount(function () {
		formEl = document.querySelector('form') as HTMLFormElement;
	});

	function log() {
		console.log(formToJSON(formEl));
	}
	function fill() {
		fillForm(formEl, {
			id: '',
			user: {
				name: {
					first: 'Yusaf',
					second: 'Khaliq'
				},
				sex: 'male',
				dob: new Date('1990-01-01T00:00:00.000Z'),
				interests: ['politics', 'finance'],
				contact: ['email'],
				consent: false
			}
		});
	}
	function clear() {
		clearForm(formEl);
	}
</script>

<form method="POST">
	<input name="_$id" value="" type="hidden" /><br />
	<br />
	Name:<br />
	First: <input name="user.name.first" /><br />
	Second: <input name="user.name.second" /><br />
	<br />
	Sex:<br />
	Male: <input name="user.sex" type="radio" value="male" /><br />
	Female: <input name="user.sex" type="radio" value="female" /><br />
	<br />
	Date Of Birth:
	<input name="user.dob(date)" /><br />
	<br />
	Interests<br />
	Sports:<input name="user.interests[]" type="checkbox" value="sports" /><br />
	Politics:<input name="user.interests[]" type="checkbox" value="politics" /><br />
	Finance:<input name="user.interests[]" type="checkbox" value="finance" /><br />
	<br />
	Contact preferences<br />
	<select name="user.contact[](string)" multiple>
		<option disabled selected value />
		<option value="sms">SMS</option>
		<option value="email">email</option>
		<option value="letter">letter</option>
	</select><br />
	<br />
	Consent to share details:<br />
	Yes: <input name="user.consent(boolean)" type="radio" value="1" /><br />
	No: <input name="user.consent(boolean)" type="radio" value="" /><br />
	<br />
	<input type="submit" />
	<input type="submit" value="log" on:click|preventDefault={log} />
	<input type="submit" value="fill" on:click|preventDefault={fill} />
	<input type="submit" value="clear" on:click|preventDefault={clear} />
</form>
