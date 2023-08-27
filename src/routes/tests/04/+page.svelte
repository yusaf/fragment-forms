<script lang="ts">
	import { FragmentForms } from 'fragment-forms';
	import { onMount } from 'svelte';
	import schema from './schema';
	import { writable } from 'svelte/store';
	import Issue from '../../issue.svelte';

	export let form;

	const test = new FragmentForms({
		schema,
		// save: true
		autoSaveTimeout: 2000,
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

	test.listen('submitData', function (data) {
		// console.log('e:submitData', data);
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

	// $: console.log($issues);

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
	Secret words:<br />
	<Issue issue={$issues?.secrets?._issue} />
	{#each { length: 3 } as _, index}
		<Issue issue={$issues?.secrets?.[index]?._issue} />
		Secret {index + 1}: <input {...attrs('secrets[]')} /><br />
	{/each}
	<br />
	Name:
	<input {...attrs('user.name._$id', 'hidden', 'random-user-name-id')} /><br />
	<Issue issue={$issues?.user?.name?.first?._issue} />
	First: <input {...attrs('user.name.first', 'text')} /><br />
	<Issue issue={$issues?.user?.name?.last?._issue} />
	Last: <input {...attrs('user.name.last', 'text')} /><br />
	<br />
	Sex:<br />
	<Issue issue={$issues?.user?.sex?._issue} />
	Male: <input {...attrs('user.sex', 'radio', 'male')} /><br />
	Female: <input {...attrs('user.sex', 'radio', 'female')} /><br />
	<br />
	Date Of Birth:
	<Issue issue={$issues?.user?.dob?._issue} />
	<input {...attrs('user.dob(date)', 'date')} /><br />
	<br />
	Interests<br />
	<Issue issue={$issues?.user?.interests?._issue} />
	Sports:<input {...attrs('user.interests[]', 'checkbox', 'sports')} /><br />
	Politics:<input {...attrs('user.interests[]', 'checkbox', 'politics')} /><br />
	Finance:<input {...attrs('user.interests[]', 'checkbox', 'finance')} /><br />
	<br />
	Contact preferences:<br />
	<Issue issue={$issues?.user?.contact?._issue} />
	<Issue issue={$issues?.user?.contact?._issue_in} />
	<select {...attrs('user.contact[]', 'select')}>
		<option {...attrs('user.contact[]', 'option', 'sms')} value="sms">SMS</option>
		<option {...attrs('user.contact[]', 'option', 'email')} value="email">E-mail</option>
		<option {...attrs('user.contact[]', 'option', 'letter')} value="Letter">Letter</option>
	</select><br />
	<br />

	Children<br />

	{#each { length: 3 } as _, index}
		Name:
		<input {...attrs(`children[${index}]._$id`, 'hidden', `random-child-id-${index}`)} /><br />
		<Issue issue={$issues?.children?.[index]?.name?.first?._issue} />
		First: <input {...attrs(`children[${index}].name.first`, 'text')} /><br />
		<Issue issue={$issues?.children?.[index]?.name?.last?._issue} />
		Last: <input {...attrs(`children[${index}].name._$last`, 'text')} /><br />
		<br />
	{/each}

	Consent to share details:<br />
	<Issue issue={$issues?.user?.consent?._issue} />
	Yes:
	<input {...attrs('user.consent(boolean)', 'radio', true)} /><br />
	No:
	<input {...attrs('user.consent(boolean)', 'radio', false)} /><br />
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
