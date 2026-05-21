<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { PROJECT_COLORS, PROJECT_COLOR_VALUES, tileBackground } from '$lib/colors';
	import CurrencyPicker from '$lib/components/CurrencyPicker.svelte';
	import EmojiListEditor from '$lib/components/EmojiListEditor.svelte';
	import type { EditorItem } from '$lib/components/EmojiListEditor.svelte';
	import { setCurrentMember, setCurrentProject } from '$lib/storage';
	import {
		addCategory,
		addPaymentMethod,
		generateId,
		openRoom,
		readMembers,
		readProject,
		removeCategory,
		removePaymentMethod,
		updateCategory,
		updatePaymentMethod,
		updateProject
	} from '$lib/sync/doc';
	import type { Category, Member, PaymentMethodItem, Project, ProjectColor } from '$lib/types';

	const roomId = $derived(page.params.roomId ?? '');
	const handle = $derived(openRoom(roomId));

	let project = $state<Project | null>(null);
	let members = $state<Member[]>([]);

	$effect(() => {
		const h = handle;
		const sync = () => {
			project = readProject(h);
			members = readMembers(h);
		};
		sync();
		h.project.observeDeep(sync);
		h.members.observeDeep(sync);
		return () => {
			h.project.unobserveDeep(sync);
			h.members.unobserveDeep(sync);
		};
	});

	let signingOut = $state(false);

	function commitName(value: string) {
		const trimmed = value.trim();
		if (!project || !trimmed || trimmed === project.name) return;
		updateProject(handle, { name: trimmed });
	}

	function commitDescription(value: string) {
		if (!project) return;
		const trimmed = value.trim();
		if (trimmed === (project.description ?? '')) return;
		updateProject(handle, { description: trimmed });
	}

	function commitEmoji(value: string) {
		if (!project) return;
		const emoji = Array.from(value.trim())[0];
		if (!emoji || emoji === project.emoji) return;
		updateProject(handle, { emoji });
	}

	function setColor(color: ProjectColor) {
		if (!project || project.color === color) return;
		updateProject(handle, { color });
	}

	function pickCurrency(p: { code: string; sym: string }) {
		updateProject(handle, { currency: p.code, currencySymbol: p.sym });
	}

	function customCurrency(sym: string) {
		updateProject(handle, { currency: '—', currencySymbol: sym });
	}

	function onAddCategory(input: Omit<EditorItem, 'id'>) {
		const cat: Category = { id: generateId(), name: input.name, emoji: input.emoji };
		addCategory(handle, cat);
	}

	function onUpdateCategory(id: string, updates: Partial<Omit<EditorItem, 'id'>>) {
		updateCategory(handle, id, updates);
	}

	function onRemoveCategory(id: string) {
		removeCategory(handle, id);
	}

	function onAddMethod(input: Omit<EditorItem, 'id'>) {
		const m: PaymentMethodItem = { id: generateId(), name: input.name, emoji: input.emoji };
		addPaymentMethod(handle, m);
	}

	function onUpdateMethod(id: string, updates: Partial<Omit<EditorItem, 'id'>>) {
		updatePaymentMethod(handle, id, updates);
	}

	function onRemoveMethod(id: string) {
		removePaymentMethod(handle, id);
	}

	function signOut() {
		if (signingOut) return;
		signingOut = true;
		setCurrentProject(null);
		setCurrentMember(null);
		goto('/', { replaceState: true });
	}
</script>

<svelte:head>
	<title>Settings · {project?.name ?? 'Kostos'}</title>
</svelte:head>

<div class="screen" data-page="settings">
	<header class="app-bar">
		<div class="row gap-8" style="flex: 1; align-items: center;">
			<a class="icon-btn" href="/p/{roomId}" aria-label="Back">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M14 6l-6 6 6 6" /></svg>
			</a>
		</div>
		<div class="app-bar-title">Settings</div>
		<div class="row gap-6" style="flex: 1;"></div>
	</header>

	{#if project}
		<div class="scroll">
			<section class="project-block">
				<div class="emoji-row">
					<label class="emoji-tile" style="background: {tileBackground(project.color)};">
						<span class="emoji-glyph">{project.emoji}</span>
						<input
							class="emoji-input"
							value={project.emoji}
							maxlength="4"
							aria-label="Project emoji"
							onblur={(e) => commitEmoji(e.currentTarget.value)}
						/>
					</label>
				</div>

				<div class="swatch-row" role="radiogroup" aria-label="Project color">
					{#each PROJECT_COLORS as c (c)}
						<button
							type="button"
							class="swatch"
							class:on={project.color === c}
							role="radio"
							aria-checked={project.color === c}
							aria-label={c}
							style="--swatch: {PROJECT_COLOR_VALUES[c]};"
							onclick={() => setColor(c)}
						></button>
					{/each}
				</div>

				<input
					class="input project-name"
					value={project.name}
					placeholder="Group name"
					onblur={(e) => commitName(e.currentTarget.value)}
				/>
				<input
					class="input project-description"
					value={project.description ?? ''}
					placeholder="Description (optional)"
					onblur={(e) => commitDescription(e.currentTarget.value)}
				/>
			</section>

			<div class="section-head">
				<div class="eyebrow">Currency</div>
			</div>
			<div class="card field-card">
				<CurrencyPicker
					code={project.currency}
					symbol={project.currencySymbol}
					onSelect={pickCurrency}
					onCustom={customCurrency}
				/>
			</div>

			<div class="section-head">
				<div class="eyebrow">Categories</div>
				<span class="dim mono section-count">{project.categories.length}</span>
			</div>
			<div class="card editor-card">
				<EmojiListEditor
					items={project.categories}
					fallbackEmoji="📦"
					onUpdate={onUpdateCategory}
					onRemove={onRemoveCategory}
					onAdd={onAddCategory}
				/>
			</div>

			<div class="section-head">
				<div class="eyebrow">Payment methods</div>
				<span class="dim mono section-count">{project.paymentMethods.length}</span>
			</div>
			<div class="card editor-card">
				<EmojiListEditor
					items={project.paymentMethods}
					fallbackEmoji="💳"
					onUpdate={onUpdateMethod}
					onRemove={onRemoveMethod}
					onAdd={onAddMethod}
				/>
			</div>

			<div class="section-head">
				<div class="eyebrow">Members</div>
				<span class="dim mono section-count">{members.length}</span>
			</div>
			<a class="btn btn-block members-link" href="/p/{roomId}/people">
				<span>Manage members</span>
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
			</a>

			<button class="btn btn-block sign-out-btn" type="button" onclick={signOut} disabled={signingOut}>
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M9 7V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2v-2M4 12h11M11 8l-3 4 3 4" /></svg>
				<span>Forget this project on this device</span>
			</button>
			<p class="dim sign-out-hint">
				Your data stays in the group. Joining again with the token restores everything.
			</p>
		</div>
	{:else}
		<div class="scroll empty-screen">
			<div class="card">
				<p class="muted">Loading…</p>
			</div>
		</div>
	{/if}
</div>

<style>
	.project-block {
		display: flex;
		flex-direction: column;
		align-items: stretch;
		gap: 12px;
		padding: 16px 0 18px;
	}

	.emoji-row {
		display: flex;
		justify-content: center;
	}

	.emoji-tile {
		width: 72px;
		height: 72px;
		border-radius: 22px;
		display: grid;
		place-items: center;
		position: relative;
		cursor: text;
	}

	.emoji-glyph {
		font-size: 36px;
		pointer-events: none;
	}

	.emoji-input {
		position: absolute;
		inset: 0;
		opacity: 0;
		background: transparent;
		border: 0;
		outline: none;
		text-align: center;
		font-size: 36px;
		color: transparent;
		caret-color: var(--ink);
	}

	.emoji-tile:has(.emoji-input:focus) .emoji-glyph {
		opacity: 0.4;
	}

	.swatch-row {
		display: flex;
		justify-content: center;
		gap: 10px;
	}

	.swatch {
		width: 24px;
		height: 24px;
		border-radius: 999px;
		background: var(--swatch);
		border: 2px solid transparent;
		cursor: pointer;
		padding: 0;
		transition: transform 0.12s ease;
	}

	.swatch:hover {
		transform: scale(1.08);
	}

	.swatch.on {
		border-color: var(--ink);
		box-shadow: 0 0 0 2px var(--bg);
	}

	.project-name {
		font-size: 17px;
		font-weight: 600;
		text-align: center;
		padding: 14px;
	}

	.project-description {
		font-size: 13px;
		text-align: center;
		padding: 12px;
		color: var(--ink-2);
	}

	.section-count {
		font-size: 11px;
	}

	.field-card {
		padding: 4px;
	}

	.editor-card {
		padding: 10px 14px;
	}

	.members-link {
		justify-content: space-between;
		padding: 14px;
		margin-top: 6px;
	}

	.members-link svg {
		width: 18px;
		height: 18px;
	}

	.sign-out-btn {
		margin-top: 24px;
		color: var(--owe);
		border-color: color-mix(in oklab, var(--owe) 30%, var(--line));
	}

	.sign-out-btn svg {
		width: 18px;
		height: 18px;
	}

	.sign-out-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.sign-out-hint {
		font-size: 11px;
		font-family: var(--font-mono);
		text-align: center;
		margin: 8px 0 0;
		line-height: 1.5;
	}

	.empty-screen {
		padding-top: 24px;
	}
</style>
