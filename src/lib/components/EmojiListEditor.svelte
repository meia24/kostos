<script lang="ts">
	export type EditorItem = { id: string; name: string; emoji: string };

	type Props = {
		items: EditorItem[];
		fallbackEmoji?: string;
		onUpdate: (id: string, updates: Partial<Omit<EditorItem, 'id'>>) => void;
		onRemove: (id: string) => void;
		onAdd: (item: Omit<EditorItem, 'id'>) => void;
	};

	let {
		items,
		fallbackEmoji = '📦',
		onUpdate,
		onRemove,
		onAdd
	}: Props = $props();

	let newEmoji = $state('');
	let newName = $state('');

	function commitName(id: string, value: string) {
		const trimmed = value.trim();
		if (!trimmed) return;
		onUpdate(id, { name: trimmed });
	}

	function commitEmoji(id: string, value: string) {
		const trimmed = value.trim();
		if (!trimmed) return;
		const single = Array.from(trimmed)[0] ?? fallbackEmoji;
		onUpdate(id, { emoji: single });
	}

	function commitAdd(event?: Event) {
		event?.preventDefault();
		const name = newName.trim();
		if (!name) return;
		const emoji = Array.from(newEmoji.trim())[0] ?? fallbackEmoji;
		onAdd({ name, emoji });
		newEmoji = '';
		newName = '';
	}
</script>

<ul class="editor-list">
	{#each items as item (item.id)}
		<li class="editor-row">
			<input
				class="input editor-emoji mono"
				value={item.emoji}
				maxlength="4"
				aria-label="{item.name} emoji"
				onblur={(e) => commitEmoji(item.id, e.currentTarget.value)}
			/>
			<input
				class="input editor-name"
				value={item.name}
				aria-label="{item.name} name"
				onblur={(e) => commitName(item.id, e.currentTarget.value)}
				autocomplete="off"
			/>
			<button
				class="icon-btn editor-remove"
				type="button"
				onclick={() => onRemove(item.id)}
				aria-label="Remove {item.name}"
			>
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M5 7h14M9 7V4h6v3M7 7l1 13h8l1-13" /></svg>
			</button>
		</li>
	{/each}
</ul>

<form class="editor-add" onsubmit={commitAdd}>
	<input
		class="input editor-emoji mono"
		bind:value={newEmoji}
		maxlength="4"
		placeholder={fallbackEmoji}
		aria-label="New emoji"
	/>
	<input
		class="input editor-name"
		bind:value={newName}
		placeholder="Add new"
		autocomplete="off"
		aria-label="New name"
	/>
	<button type="submit" class="btn btn-primary editor-add-btn" disabled={!newName.trim()}>
		Add
	</button>
</form>

<style>
	.editor-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
	}

	.editor-row {
		display: flex;
		gap: 6px;
		align-items: center;
		padding: 6px 0;
	}

	.editor-row + .editor-row {
		border-top: 1px solid var(--line);
	}

	.editor-emoji {
		width: 52px;
		padding: 8px 10px;
		font-size: 16px;
		text-align: center;
	}

	.editor-name {
		flex: 1;
		padding: 8px 12px;
		font-size: 13px;
	}

	.editor-remove {
		width: 30px;
		height: 30px;
		color: var(--owe);
	}

	.editor-remove svg {
		width: 14px;
		height: 14px;
	}

	.editor-add {
		display: flex;
		gap: 6px;
		align-items: stretch;
		padding-top: 10px;
		margin-top: 6px;
		border-top: 1px dashed var(--line);
	}

	.editor-add-btn {
		padding: 8px 14px;
		font-size: 13px;
	}

	.editor-add-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
