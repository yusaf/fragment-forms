<script lang="ts">
	import superjson from 'superjson';
	import { FragmentForm } from 'fragment-forms';
	import { onDestroy, onMount } from 'svelte';
	import { writable } from 'svelte/store';
	export let form;
	export let data;

	let saveEl: HTMLInputElement;
	let attrs = FragmentForm.attributes(form || data);

	let FF: FragmentForm;

	function save(fragment: FormData) {
		FF.saveStart();

		const response = fetch('/tests/04.1', {
			method: 'POST',
			body: fragment
		});

		response
			.then(async function (response) {
				console.log(await response.json());
				FF.saveSuccess();
			})
			.catch(function () {
				FF.saveFinally();
			});
	}

	const autoSaveCounter = writable(0);
	const saveButton = writable<any>(null);

	onMount(function () {
		FF = new FragmentForm(document.querySelector('form'), {
			autosaveTimeout: 4000
		});
		FF.autoSaveTimer(function (secondsRemaining) {
			autoSaveCounter.set(secondsRemaining);
		});
		FF.autoSave(function ({ formData }) {
			save(formData);
		});
		FF.saveStatus(function (enabled) {
			saveEl.disabled = !enabled;
		});
		FF.fragmentOnInput(function ({ formData }, commit) {
			if (true) {
				saveButton.set(() => save(formData));
				commit();
			} else {
				saveButton.set(() => {});
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
	<input {...attrs('olabels[0]._$id', 'hidden', 'labels 1')} /><br />
	Label 1:<input {...attrs('olabels[0].value[]', 'text')} /><br />
	Label 2:<input {...attrs('olabels[0].value[]', 'text')} /><br />
	Label 3:<input {...attrs('olabels[0].value[]', 'text')} /><br />
	Labels 2<br />
	<input {...attrs('olabels[1]._$id', 'hidden', 'labels 2')} /><br />
	Label 2.1:<input {...attrs('olabels[1].value[]', 'text')} /><br />
	Label 2.2:<input {...attrs('olabels[1].value[]', 'text')} /><br />
	Label 2.3:<input {...attrs('olabels[1].value[]', 'text')} /><br />
	<input type="submit" />

	<input
		type="submit"
		on:click|preventDefault={$saveButton}
		value={$autoSaveCounter ? `Autosaving in ${$autoSaveCounter}` : `Save`}
		bind:this={saveEl}
	/>
</form>

<style>
	.disabled {
		pointer-events: none;
	}
</style>
