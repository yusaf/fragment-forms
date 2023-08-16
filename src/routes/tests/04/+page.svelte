<script lang="ts">
	import superjson from 'superjson';
	import { FragmentForm } from 'fragment-forms';
	import { onDestroy, onMount } from 'svelte';
	import { writable } from 'svelte/store';
	export let form;
	export let data;

	let attrs = FragmentForm.attributes(form || data);

	let FF: FragmentForm;

	function save(fragment: any) {
		FF.saveStart();
		const response = fetch('/tests/04', {
			method: 'POST',
			body: superjson.stringify(fragment),
			headers: {
				'Content-Type': 'application/json'
			}
		});

		response.then(async function (response) {
			console.log(await response.json());
			FF.saveSuccess();
			FF.enableAll();
		});
	}

	const canSave = writable(false);
	const autoSaveCounter = writable(0);
	const saveButton = writable<any>(null);

	onMount(function () {
		FF = new FragmentForm(document.querySelector('form'), {
			autosaveTimeout: 4000
		});
		FF.autoSaveTimer(function (secondsRemaining) {
			autoSaveCounter.set(secondsRemaining);
		});
		FF.autoSave(function (fragment: any) {
			save(fragment);
		});
		FF.saveStatus(function (enabled) {
			canSave.set(enabled);
		});
		FF.fragmentOnInput(function (fragment: any, commit: CallableFunction) {
			if (true) {
				saveButton.set(() => save(fragment));
				commit();
			} else {
				FF.cancelSave();
			}
		});
	});
	onDestroy(function () {
		if (FF) {
			FF.destroy();
		}
	});
</script>

<form method="POST">
	<input {...attrs('_$id', 'hidden')} /><br />
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
	<select {...attrs('user.contact', 'select')}>
		<option {...attrs('user.contact', 'option', 'sms')} value="sms">SMS</option>
		<option {...attrs('user.contact', 'option', 'email')} value="email">E-mail</option>
		<option {...attrs('user.contact', 'option', 'letter')} value="letter">Letter</option>
	</select><br />
	<br />
	Consent to share details:<br />
	Yes:
	<input {...attrs('user.consent(boolean)', 'radio', true)} /><br />
	No:
	<input {...attrs('user.consent(boolean)', 'radio', false)} /><br />
	<input type="submit" />

	{#if $canSave}
		<input
			type="submit"
			on:click|preventDefault={$saveButton}
			value={$autoSaveCounter ? `Autosaving in ${$autoSaveCounter}` : `Save`}
		/>
	{:else}
		<input type="submit" disabled value="save" />
	{/if}
</form>
