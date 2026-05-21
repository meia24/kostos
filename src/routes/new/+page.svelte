<script lang="ts">
	import { goto } from '$app/navigation';
	import { setCurrentMember, setCurrentProject } from '$lib/storage';
	import { generateRoomId, generateSecret } from '$lib/token';
	import { generateId, initProject, openRoom } from '$lib/sync/doc';
	import type { Member, Project } from '$lib/types';

	type DraftMember = { id: string; name: string };

	const roomId = generateRoomId();
	const secret = generateSecret();

	const presets: { code: string; sym: string; name: string }[] = [
		{ code: 'EUR', sym: '€', name: 'Euro' },
		{ code: 'USD', sym: '$', name: 'US Dollar' },
		{ code: 'GBP', sym: '£', name: 'Pound Sterling' },
		{ code: 'JPY', sym: '¥', name: 'Japanese Yen' }
	];

	let emoji = $state('🏖');
	let name = $state('');
	let description = $state('');
	let currencyCode = $state('EUR');
	let yourName = $state('');
	let others = $state<DraftMember[]>([
		{ id: generateId(), name: '' }
	]);
	let submitting = $state(false);

	const currentCurrency = $derived(presets.find((p) => p.code === currencyCode) ?? presets[0]);
	const canCreate = $derived(name.trim().length > 0 && yourName.trim().length > 0);

	function addAnother() {
		others = [...others, { id: generateId(), name: '' }];
	}

	function removeOther(id: string) {
		others = others.filter((m) => m.id !== id);
		if (others.length === 0) others = [{ id: generateId(), name: '' }];
	}

	async function onSubmit(event: SubmitEvent) {
		event.preventDefault();
		if (submitting || !canCreate) return;
		submitting = true;

		const creator: Member = {
			id: generateId(),
			name: yourName.trim(),
			createdAt: Date.now()
		};
		const otherMembers: Member[] = others
			.map((m) => m.name.trim())
			.filter((n) => n.length > 0)
			.map((n) => ({ id: generateId(), name: n, createdAt: Date.now() }));

		const project: Project = {
			id: roomId,
			name: name.trim(),
			description: description.trim() || undefined,
			emoji,
			currency: currentCurrency.code,
			currencySymbol: currentCurrency.sym,
			defaultSplit: 'even',
			createdAt: Date.now()
		};

		const handle = openRoom(roomId);
		await handle.ready;
		initProject(handle, project, [creator, ...otherMembers]);

		setCurrentProject({ roomId, secret, name: project.name });
		setCurrentMember(creator.id);

		await goto(`/p/${roomId}`);
	}

	function onCancel() {
		goto('/');
	}
</script>

<svelte:head>
	<title>New group · Kostos</title>
</svelte:head>

<div class="screen" data-page="new">
	<header class="app-bar">
		<div class="row gap-8" style="flex: 1;">
			<button class="icon-btn" aria-label="Cancel" onclick={onCancel}>
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">
					<path d="M6 6l12 12M18 6L6 18" />
				</svg>
			</button>
		</div>
		<div class="app-bar-title">New group</div>
		<div class="row gap-6" style="flex: 1; justify-content: flex-end;">
			<button
				class="btn btn-primary"
				style="padding: 8px 14px; font-size: 13px;"
				disabled={!canCreate || submitting}
				onclick={(e) => onSubmit(e as unknown as SubmitEvent)}
			>
				Create
			</button>
		</div>
	</header>

	<form class="scroll" onsubmit={onSubmit} style="padding-top: 8px;">
		<div class="col emoji-block">
			<button type="button" class="emoji-mark" aria-label="Change icon">
				<span>{emoji}</span>
			</button>
		</div>

		<input
			class="input"
			placeholder="Group name"
			bind:value={name}
			style="font-size: 17px; font-weight: 600; text-align: center; padding: 16px; margin-bottom: 8px;"
		/>
		<input
			class="input"
			placeholder="Description (optional)"
			bind:value={description}
			style="font-size: 13px; text-align: center; padding: 12px; color: var(--ink-2);"
		/>

		<div class="card field-card" style="margin-top: 18px;">
			<label class="field">
				<span class="field-icon num" style="font-weight: 700; color: var(--accent);"
					>{currentCurrency.sym}</span
				>
				<span class="col" style="flex: 1;">
					<span class="field-label">Default currency</span>
					<select class="field-value" bind:value={currencyCode}>
						{#each presets as p (p.code)}
							<option value={p.code}>{p.code} · {p.name}</option>
						{/each}
					</select>
				</span>
			</label>
			<hr class="hairline" />
			<div class="field">
				<span class="cat-tile field-tile">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
						<path d="M13 3L5 14h6l-1 7 8-11h-6l1-7z" />
					</svg>
				</span>
				<span class="col" style="flex: 1;">
					<span class="field-label">Default split</span>
					<span class="field-value-static">Evenly between all</span>
				</span>
			</div>
		</div>

		<div class="section-head">
			<div class="eyebrow">Add members</div>
			<span class="dim mono members-count">YOU + {others.filter((m) => m.name.trim()).length} OTHERS</span>
		</div>

		<div class="card members-card">
			<div class="list-item member-row">
				<div class="av av-you">{(yourName.trim()[0] ?? '?').toUpperCase()}</div>
				<input
					class="input member-input"
					bind:value={yourName}
					placeholder="Your name"
					autocomplete="off"
				/>
				<span class="sticker sticker-on you-tag">YOU</span>
			</div>
			{#each others as m, i (m.id)}
				<hr class="hairline" style="margin-left: 56px;" />
				<div class="list-item member-row">
					<div class="av av-them">{(m.name.trim()[0] ?? '?').toUpperCase()}</div>
					<input
						class="input member-input"
						bind:value={others[i].name}
						placeholder="Member name"
						autocomplete="off"
					/>
					<button
						type="button"
						class="icon-btn"
						aria-label="Remove member"
						onclick={() => removeOther(m.id)}
					>
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">
							<path d="M6 6l12 12M18 6L6 18" />
						</svg>
					</button>
				</div>
			{/each}
			<hr class="hairline" style="margin-left: 56px;" />
			<button type="button" class="list-item add-row" onclick={addAnother}>
				<div class="av av-sm add-bubble">+</div>
				<span class="add-label">Add another</span>
			</button>
		</div>

		<div class="card token-card">
			<div class="eyebrow" style="margin-bottom: 8px;">Your share token will be</div>
			<span class="token-pill">{roomId}</span>
			<p class="dim token-hint">Generated locally; can be regenerated later.</p>
		</div>

		<button
			type="submit"
			class="btn btn-primary btn-block submit-btn"
			disabled={!canCreate || submitting}
		>
			{submitting ? 'Creating…' : 'Create group'}
		</button>
	</form>
</div>

<style>
	.emoji-block {
		align-items: center;
		padding: 10px 0 22px;
	}

	.emoji-mark {
		width: 72px;
		height: 72px;
		border-radius: 22px;
		background: color-mix(in oklab, var(--accent) 22%, transparent);
		display: grid;
		place-items: center;
		font-size: 32px;
		border: 0;
		cursor: pointer;
		color: var(--ink);
	}

	.field-card {
		padding: 4px;
	}

	.field {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 14px 12px;
	}

	.field-icon {
		font-family: var(--font-mono);
		font-size: 18px;
		width: 40px;
		text-align: center;
	}

	.field-tile {
		color: var(--ink);
	}

	.field-label {
		font-family: var(--font-mono);
		font-size: 10px;
		color: var(--ink-2);
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}

	.field-value {
		background: transparent;
		border: 0;
		font-size: 14px;
		color: var(--ink);
		padding: 4px 0 0;
		outline: none;
		appearance: none;
		cursor: pointer;
	}

	.field-value-static {
		font-size: 14px;
		color: var(--ink);
		padding: 4px 0 0;
	}

	.members-card {
		padding: 4px;
	}

	.members-count {
		font-size: 11px;
	}

	.member-row {
		padding: 12px;
	}

	.member-input {
		flex: 1;
		background: transparent;
		border: 0;
		padding: 8px 10px;
		font-size: 14px;
		font-weight: 500;
	}

	.av-you {
		background: color-mix(in oklab, var(--accent) 35%, transparent);
		color: var(--accent);
	}

	.av-them {
		background: color-mix(in oklab, var(--ink) 12%, transparent);
		color: var(--ink);
	}

	.you-tag {
		padding: 2px 8px;
		font-size: 10px;
	}

	.add-row {
		padding: 12px;
		width: 100%;
		background: transparent;
		border: 0;
		text-align: left;
		cursor: pointer;
		color: var(--ink-2);
	}

	.add-bubble {
		background: transparent;
		border: 1px dashed var(--line-2);
		color: var(--ink-3);
		width: 32px;
		height: 32px;
		font-size: 14px;
	}

	.add-label {
		font-size: 14px;
		font-weight: 500;
	}

	.token-card {
		margin-top: 14px;
		background: transparent;
		border: 1px dashed var(--line-2);
	}

	.token-hint {
		font-size: 11px;
		font-family: var(--font-mono);
		margin: 8px 0 0;
	}

	.submit-btn {
		margin-top: 22px;
	}

	.submit-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
