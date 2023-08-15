<script lang="ts">
	import { FragmentForm } from 'fragment-forms';
	import { onMount } from 'svelte';
	export let form;

	let attrs = FragmentForm.attributes(form);

	onMount(function () {
		const fragment = new FragmentForm(document.querySelector('form'));
		fragment.fragmentOnInput(function (value: any) {
			console.log(value);
		});
	});
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
	Label 3:<input {...attrs('labels[]', 'text')} /><br />
	Mode<br />
	<select {...attrs('mode', 'select')}>
		<option disabled selected value />
		<option {...attrs('mode', 'option', 'dark')} value="dark">Dark</option>
		<option {...attrs('mode', 'option', 'light')} value="light">Light</option>
	</select><br />
	Agree:<input {...attrs('do.you.agree(boolean)', 'checkbox', true)} /><br />

	<input {...attrs('one._$id', 'hidden', 'helllo')} /><br />
	<input {...attrs('one[1]._$id', 'hidden', 'helllo 2')} /><br />
	<br /><br />
	Labels<br />
	Label 1:<input {...attrs('one[1].value[]', 'text')} /><br />
	Label 2:<input {...attrs('one[1].value[]', 'text')} /><br />
	Label 3:<input {...attrs('one[1].value[]', 'text')} /><br />
	<input type="submit" />
</form>
