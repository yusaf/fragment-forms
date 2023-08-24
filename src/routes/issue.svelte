<script lang="ts">
	export let issue: string | undefined;
</script>

{#if typeof issue === 'string' && issue.length}
	<span>{issue}</span><br />
{/if}

<style>
	span {
		color: red;
	}
</style>
