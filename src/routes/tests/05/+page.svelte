<script lang="ts">
	import { FragmentForms } from 'fragment-forms';
	import { onMount } from 'svelte';
	import { schema } from './form';
	import { writable } from 'svelte/store';
	import Issue from '../../issue.svelte';

	export let form;

	const test = new FragmentForms({
		schema,
		data: form?.data
	});

	const saving = writable<typeof test.types.saving>(false);
	const saveSuccess = writable<typeof test.types.saveSuccess>(undefined);
	const submitting = writable<typeof test.types.submitting>(false);
	const submitSuccess = writable<typeof test.types.submitSuccess>(undefined);
	const issues = writable<typeof test.types.issues>(test.issues(form?.issues));
	const noPathIssues = writable<typeof test.types.noPathIssues>(test.noPathIssues());
	const canSave = writable<typeof test.types.canSave>(false);
	const autoSaveTimeLeft = writable<typeof test.types.autoSaveTimeLeft>(0);
	const error = writable<typeof test.types.error>(form?.error || false);

	test.listen('issues', (_issues) => issues.set(_issues));
	test.listen('noPathIssues', (_noPathIssues) => noPathIssues.set(_noPathIssues));
	test.listen('canSave', (_canSave) => canSave.set(_canSave));
	test.listen('autoSaveTimeLeft', (timeLeft) => autoSaveTimeLeft.set(timeLeft));
	test.listen('saving', (_saving) => saving.set(_saving));
	test.listen('submitting', (_submitting) => submitting.set(_submitting));
	test.listen('error', (_error) => error.set(_error));
	test.listen('saveSuccess', (_state) => saveSuccess.set(_state));
	test.listen('submitSuccess', (_state) => submitSuccess.set(_state));

	test.listen('submitFormData', function (formData) {
		test.submitStart();

		const response = fetch('/tests/05?submit=true', {
			method: 'POST',
			body: formData
		});

		response
			.then(async function (response) {
				console.log('SUCCESS', await response.json());
				test.submitSuccess();
			})
			.catch(function (error) {
				console.log('ERROR', error);
				test.submitFailed();
			});
	});

	test.listen('saveData', function (data) {
		console.log('e:saveData', data);
		test.saveStart();
		setTimeout(function () {
			test.saveSuccess();
		}, 3000);
	});

	onMount(function () {
		test.form(document.querySelector('form'));
	});

	const attrs = test.attributes();
</script>

03

{#if $saving}
	Saving...
{:else if $submitting}
	Submitting...
{/if}

{#if $saveSuccess === true}
	Save was successful!
{/if}

{#if $submitSuccess === true}
	Submission was successful!
{/if}

{#if $error}
	{$error}
{/if}

<form method="POST">
	<input {...attrs('_$id', 'hidden', 'random-id')} />
	Username:<br />
	<Issue issue={$issues?.username?._issue} />
	<input {...attrs('username', 'text')} /><br />
	Password:<br />
	<Issue issue={$issues?.password?._issue} />
	<input {...attrs('password', 'password', { 'data-no-save': true })} /><br />
	Confirm Password:<br />
	<Issue issue={$issues?.confirm_password?._issue} />
	<input {...attrs('confirm_password', 'password', { 'data-no-save': true })} /><br />
	<br />
	Agree:<br />
	<Issue issue={$issues?.do?.you?.agree?._issue} />
	<input {...attrs('do.you.agree(boolean)', 'checkbox', true)} /><br />

	<input type="submit" />
	<button disabled={!$canSave} on:click|preventDefault={test.manualSaveMake()}>
		{#if $autoSaveTimeLeft}
			Autosaving in {$autoSaveTimeLeft}
		{:else}
			Save
		{/if}
	</button>
</form>
