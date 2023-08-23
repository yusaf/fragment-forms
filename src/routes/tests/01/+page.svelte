<script lang="ts">
	import { FragmentForms } from 'fragment-forms';
	import { onMount } from 'svelte';
	import schema from './schema';

	const test = new FragmentForms({
		schema,
		save: true,
		autoSaveTimeout: 5000
	});

	test.addEventListener('submit', () => console.clear());

	test.listen('issues', function (issues) {
		console.log('e:issues', issues);
	});

	test.listen('noPathIssues', function (issues) {
		console.log('e:noPathIssues', issues);
	});

	test.listen('submitData', function (data) {
		console.log('e:submitData', data);
	});

	test.listen('submitFormData', function (formData) {
		console.log('e:submitFormData', [...formData]);
	});

	test.listen('saveData', function (data) {
		console.log('e:saveData', data);
	});

	test.listen('saveFormData', function (formData) {
		console.log('e:saveFormData', [...formData]);
	});

	test.listen('canSave', function (canSave) {
		console.log('e:canSave', canSave);
	});

	test.listen('autoSaveTimeLeft', function (timeLeft) {
		console.log('e:autoSaveTimeLeft', timeLeft);
	});

	onMount(function () {
		test.form(document.querySelector('form'));
	});
</script>

01

<form method="POST">
	First name:<input type="text" name="name.first" /><br />
	Last name:<input type="text" name="name.last" /><br />

	Child 1<br />
	Name:<input type="text" name="children[0].name" /><br />

	Child 2<br />
	Name:<input type="text" name="children[1].name" /><br />

	Agree:<br />
	Yes:<input type="radio" name="agree(boolean)" value="true" />
	No:<input type="radio" name="agree(boolean)" value="false" />

	<br />
	<input type="submit" />
</form>
