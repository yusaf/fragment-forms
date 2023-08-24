<script lang="ts">
	import { FragmentForms } from 'fragment-forms';
	import { onMount } from 'svelte';
	import schema from './schema';
	import { writable } from 'svelte/store';
	import Issue from '../../issue.svelte';

	export let form;

	const test = new FragmentForms({
		schema,
		save: true,
		autoSaveTimeout: 5000
	});

	const saving = writable<typeof test.types.saving>(false);
	const submitting = writable<typeof test.types.submitting>(false);
	const issues = writable<typeof test.types.issues>({});
	const noPathIssues = writable<typeof test.types.noPathIssues>([]);
	const canSave = writable<typeof test.types.canSave>(false);
	const autoSaveTimeLeft = writable<typeof test.types.autoSaveTimeLeft>(0);

	const attrs = FragmentForms.attributes(form);

	test.addEventListener('submit', () => console.clear());

	test.listen('issues', (_issues) => issues.set(_issues));
	test.listen('noPathIssues', (_noPathIssues) => noPathIssues.set(_noPathIssues));
	test.listen('canSave', (_canSave) => canSave.set(_canSave));
	test.listen('autoSaveTimeLeft', (timeLeft) => autoSaveTimeLeft.set(timeLeft));
	test.listen('saving', (_saving) => saving.set(_saving));
	test.listen('submitting', (_submitting) => submitting.set(_submitting));

	test.listen('submitData', function (data) {
		// console.log('e:submitData', data);
	});

	test.listen('saveData', function (data) {
		// console.log('e:saveData', data);
	});

	onMount(function () {
		test.form(document.querySelector('form'));
	});

	$: console.log($issues);
</script>

02

{#if $saving}
	Saving...
{:else if $submitting}
	Submitting...
{/if}

<form method="POST">
	<Issue issue={$issues?.name?.first?._issue} />
	First name:<input {...attrs('name.first')} /><br />
	<Issue issue={$issues?.name?.last?._issue} />
	Last name:<input {...attrs('name.last')} /><br />

	Child 1<br />
	<Issue issue={$issues?.children?.[0]?.name?._issue} />
	Name:<input {...attrs('children[0].name')} /><br />

	Child 2<br />
	<Issue issue={$issues?.children?.[1]?.name?._issue} />
	Name:<input {...attrs('children[1].name')} /><br />

	Agree:<br />
	<Issue issue={$issues?.agree?._issue} />
	Yes:<input {...attrs('agree(boolean)', 'radio', true)} />
	No:<input {...attrs('agree(boolean)', 'radio', false)} />

	<br />
	<input type="submit" />
	<button disabled={!$canSave} on:click|preventDefault={test.manualSaveMake()}>
		{#if $autoSaveTimeLeft}
			Saving in {$autoSaveTimeLeft}
		{:else}
			Save
		{/if}
	</button>
</form>
