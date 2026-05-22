<script lang="ts">
	type Props = {
		value: string;
		maxLength?: number;
		placeholder?: string;
	};

	let { value = $bindable(), maxLength = 280, placeholder = 'Optional context' }: Props = $props();
</script>

<div class="card notes-card">
	<div class="row between notes-head">
		<div class="eyebrow">Note</div>
		<span class="dim mono note-count">{value.length} / {maxLength}</span>
	</div>
	<textarea
		class="input notes-input"
		bind:value
		maxlength={maxLength}
		{placeholder}
		rows="2"
	></textarea>
</div>

<style>
	.notes-card {
		margin-top: 10px;
	}

	.notes-head {
		margin-bottom: 8px;
	}

	.notes-input {
		padding: 12px;
		font-size: 13px;
		line-height: 1.45;
		resize: vertical;
		min-height: 60px;
		font-family: var(--font-sans);
	}

	.note-count {
		font-size: 11px;
	}
</style>
