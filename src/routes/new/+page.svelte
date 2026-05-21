<script lang="ts">
	import { goto } from '$app/navigation';
	import { PROJECT_COLORS, PROJECT_COLOR_VALUES, tileBackground } from '$lib/colors';
	import { setCurrentMember, setCurrentProject } from '$lib/storage';
	import { generateId, initProject, openRoom } from '$lib/sync/doc';
	import { generateRoomId, generateSecret } from '$lib/token';
	import {
		DEFAULT_CATEGORIES,
		DEFAULT_PAYMENT_METHODS,
		type Member,
		type Project,
		type ProjectColor
	} from '$lib/types';

	type DraftMember = { id: string; name: string };
	type Picker = null | 'emoji' | 'currency';

	const EMOJI_PRESETS = [
		'🏖',
		'🏠',
		'🏝',
		'⛰',
		'⛺',
		'🏨',
		'✈️',
		'🚗',
		'🚐',
		'⛵',
		'🍕',
		'🍻',
		'☕',
		'🎉',
		'🎂',
		'🎸',
		'🎮',
		'⚽',
		'🛒',
		'💼',
		'🎓',
		'🐶',
		'👨‍👩‍👧',
		'❤️'
	];

	const CURRENCY_PRESETS: { code: string; sym: string; name: string }[] = [
		{ code: 'EUR', sym: '€', name: 'Euro' },
		{ code: 'USD', sym: '$', name: 'US Dollar' },
		{ code: 'GBP', sym: '£', name: 'British Pound' },
		{ code: 'JPY', sym: '¥', name: 'Japanese Yen' },
		{ code: 'CHF', sym: 'Fr', name: 'Swiss Franc' },
		{ code: 'CAD', sym: 'C$', name: 'Canadian Dollar' },
		{ code: 'AUD', sym: 'A$', name: 'Australian Dollar' },
		{ code: 'BRL', sym: 'R$', name: 'Brazilian Real' },
		{ code: 'MXN', sym: 'Mex$', name: 'Mexican Peso' },
		{ code: 'INR', sym: '₹', name: 'Indian Rupee' },
		{ code: 'CNY', sym: '¥', name: 'Chinese Yuan' },
		{ code: 'KRW', sym: '₩', name: 'South Korean Won' },
		{ code: 'SEK', sym: 'kr', name: 'Swedish Krona' },
		{ code: 'NOK', sym: 'kr', name: 'Norwegian Krone' },
		{ code: 'PLN', sym: 'zł', name: 'Polish Złoty' },
		{ code: 'TRY', sym: '₺', name: 'Turkish Lira' }
	];

	const roomId = generateRoomId();
	const secret = generateSecret();

	let emoji = $state('🏖');
	let emojiCustom = $state('');
	let color = $state<ProjectColor>('lime');
	let name = $state('');
	let description = $state('');
	let currencyCode = $state('EUR');
	let currencySym = $state('€');
	let currencyName = $state('Euro');
	let customSym = $state('');
	let yourName = $state('');
	let others = $state<DraftMember[]>([{ id: generateId(), name: '' }]);
	let picker = $state<Picker>(null);
	let submitting = $state(false);

	const filledOthers = $derived(others.filter((m) => m.name.trim().length > 0));
	const canCreate = $derived(name.trim().length > 0 && yourName.trim().length > 0);

	function pickEmoji(value: string) {
		emoji = value;
		emojiCustom = '';
		picker = null;
	}

	function commitCustomEmoji() {
		const cleaned = emojiCustom.trim();
		if (!cleaned) return;
		emoji = Array.from(cleaned)[0] ?? emoji;
		emojiCustom = '';
		picker = null;
	}

	function pickCurrency(p: { code: string; sym: string; name: string }) {
		currencyCode = p.code;
		currencySym = p.sym;
		currencyName = p.name;
		customSym = '';
		picker = null;
	}

	function commitCustomCurrency() {
		const cleaned = customSym.trim().slice(0, 4);
		if (!cleaned) return;
		currencyCode = '—';
		currencySym = cleaned;
		currencyName = 'Custom';
		picker = null;
	}

	function addAnother() {
		others = [...others, { id: generateId(), name: '' }];
	}

	function removeOther(id: string) {
		others = others.filter((m) => m.id !== id);
		if (others.length === 0) others = [{ id: generateId(), name: '' }];
	}

	async function onSubmit(event?: Event) {
		event?.preventDefault();
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
			color,
			currency: currencyCode,
			currencySymbol: currencySym,
			defaultSplit: 'even',
			categories: DEFAULT_CATEGORIES,
			paymentMethods: DEFAULT_PAYMENT_METHODS,
			createdAt: Date.now()
		};

		const handle = openRoom(roomId);
		await handle.ready;
		initProject(handle, project, [creator, ...otherMembers]);

		setCurrentProject({ roomId, secret, name: project.name });
		setCurrentMember(creator.id);

		await goto(`/p/${roomId}`);
	}
</script>

<svelte:head>
	<title>New group · Kostos</title>
</svelte:head>

<div class="screen" data-page="new">
	<header class="app-bar">
		<div class="row gap-8" style="flex: 1;">
			<button class="icon-btn" aria-label="Cancel" onclick={() => goto('/')}>
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">
					<path d="M6 6l12 12M18 6L6 18" />
				</svg>
			</button>
		</div>
		<div class="app-bar-title">New group</div>
		<div class="row gap-6" style="flex: 1; justify-content: flex-end;">
			<button
				type="button"
				class="btn btn-primary"
				style="padding: 8px 14px; font-size: 13px;"
				disabled={!canCreate || submitting}
				onclick={() => onSubmit()}
			>
				Create
			</button>
		</div>
	</header>

	<form class="scroll" onsubmit={onSubmit} style="padding-top: 8px;">
		<div class="col emoji-block">
			<button
				type="button"
				class="emoji-mark"
				style="background: {tileBackground(color)};"
				aria-label="Change icon"
				aria-expanded={picker === 'emoji'}
				onclick={() => (picker = picker === 'emoji' ? null : 'emoji')}
			>
				<span>{emoji}</span>
				<span class="emoji-pencil" aria-hidden="true">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
						<path d="M4 20h4l11-11-4-4L4 16v4zM14 6l4 4" />
					</svg>
				</span>
			</button>

			<div class="swatch-row" role="radiogroup" aria-label="Group color">
				{#each PROJECT_COLORS as c (c)}
					<button
						type="button"
						class="swatch"
						class:on={color === c}
						role="radio"
						aria-checked={color === c}
						aria-label={c}
						style="--swatch: {PROJECT_COLOR_VALUES[c]};"
						onclick={() => (color = c)}
					></button>
				{/each}
			</div>

			{#if picker === 'emoji'}
				<div class="picker-panel">
					<div class="emoji-grid">
						{#each EMOJI_PRESETS as e (e)}
							<button
								type="button"
								class="emoji-cell"
								class:on={e === emoji}
								onclick={() => pickEmoji(e)}
							>
								{e}
							</button>
						{/each}
					</div>
					<div class="picker-custom">
						<label class="picker-custom-label" for="emoji-custom-input">Or type your own</label>
						<div class="row gap-6">
							<input
								id="emoji-custom-input"
								class="input picker-input"
								bind:value={emojiCustom}
								maxlength="6"
								placeholder="Paste emoji"
								autocomplete="off"
							/>
							<button
								type="button"
								class="btn btn-primary picker-apply"
								onclick={commitCustomEmoji}
								disabled={!emojiCustom.trim()}
							>
								Use
							</button>
						</div>
					</div>
				</div>
			{/if}
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
			<button
				type="button"
				class="field field-button"
				aria-expanded={picker === 'currency'}
				onclick={() => (picker = picker === 'currency' ? null : 'currency')}
			>
				<span class="field-icon num">{currencySym}</span>
				<span class="col" style="flex: 1; align-items: flex-start;">
					<span class="field-label">Default currency</span>
					<span class="field-value-static">{currencyCode === '—' ? 'Custom' : currencyCode} · {currencyName}</span>
				</span>
				<span class="field-chevron" aria-hidden="true">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
						<path d="M6 9l6 6 6-6" />
					</svg>
				</span>
			</button>
			{#if picker === 'currency'}
				<div class="picker-panel currency-panel">
					<ul class="currency-list">
						{#each CURRENCY_PRESETS as p (p.code)}
							<li>
								<button
									type="button"
									class="currency-row"
									class:on={p.code === currencyCode}
									onclick={() => pickCurrency(p)}
								>
									<span class="currency-sym num">{p.sym}</span>
									<span class="col currency-text">
										<span class="currency-code">{p.code}</span>
										<span class="dim currency-name">{p.name}</span>
									</span>
									{#if p.code === currencyCode}
										<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="currency-check">
											<path d="M5 12l5 5L20 7" />
										</svg>
									{/if}
								</button>
							</li>
						{/each}
					</ul>
					<div class="picker-custom">
						<label class="picker-custom-label" for="currency-custom-input">Or use a custom symbol</label>
						<div class="row gap-6">
							<input
								id="currency-custom-input"
								class="input picker-input mono"
								bind:value={customSym}
								maxlength="4"
								placeholder="e.g. ₿ or kr"
								autocomplete="off"
							/>
							<button
								type="button"
								class="btn btn-primary picker-apply"
								onclick={commitCustomCurrency}
								disabled={!customSym.trim()}
							>
								Use
							</button>
						</div>
						<p class="dim picker-hint">Up to 4 characters.</p>
					</div>
				</div>
			{/if}
		</div>

		<div class="section-head">
			<div class="eyebrow">Add members</div>
			<span class="dim mono members-count">YOU + {filledOthers.length} OTHERS</span>
		</div>

		<div class="card members-card">
			<div class="list-item member-row">
				<div class="av av-you" style="background: {tileBackground(color)}; color: {PROJECT_COLOR_VALUES[color]};">
					{(yourName.trim()[0] ?? '?').toUpperCase()}
				</div>
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
		gap: 12px;
	}

	.emoji-mark {
		width: 72px;
		height: 72px;
		border-radius: 22px;
		display: grid;
		place-items: center;
		font-size: 36px;
		border: 0;
		cursor: pointer;
		color: var(--ink);
		position: relative;
		transition: transform 0.12s ease;
	}

	.emoji-mark:active {
		transform: scale(0.97);
	}

	.emoji-pencil {
		position: absolute;
		bottom: -6px;
		right: -6px;
		width: 28px;
		height: 28px;
		border-radius: 999px;
		background: var(--bg-2);
		border: 1px solid var(--line);
		display: grid;
		place-items: center;
		color: var(--ink);
	}

	.emoji-pencil svg {
		width: 14px;
		height: 14px;
	}

	.swatch-row {
		display: flex;
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

	.picker-panel {
		width: 100%;
		background: var(--bg-2);
		border: 1px solid var(--line);
		border-radius: var(--radius-lg);
		padding: 14px;
		margin-top: 6px;
	}

	.emoji-grid {
		display: grid;
		grid-template-columns: repeat(6, 1fr);
		gap: 6px;
	}

	.emoji-cell {
		aspect-ratio: 1;
		font-size: 22px;
		border: 0;
		border-radius: 12px;
		background: transparent;
		cursor: pointer;
		display: grid;
		place-items: center;
		color: var(--ink);
		transition: background 0.12s ease, transform 0.12s ease;
	}

	.emoji-cell:hover {
		background: color-mix(in oklab, var(--ink) 6%, transparent);
	}

	.emoji-cell.on {
		background: color-mix(in oklab, var(--accent) 22%, transparent);
		outline: 1px solid var(--accent);
	}

	.picker-custom {
		margin-top: 14px;
		padding-top: 14px;
		border-top: 1px solid var(--line);
	}

	.picker-custom-label {
		display: block;
		font-family: var(--font-mono);
		font-size: 10px;
		color: var(--ink-2);
		text-transform: uppercase;
		letter-spacing: 0.06em;
		margin-bottom: 8px;
	}

	.picker-input {
		flex: 1;
		padding: 10px 12px;
		font-size: 14px;
	}

	.picker-apply {
		padding: 8px 16px;
		font-size: 13px;
	}

	.picker-apply:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.picker-hint {
		font-size: 11px;
		font-family: var(--font-mono);
		margin: 8px 0 0;
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

	.field-button {
		width: 100%;
		background: transparent;
		border: 0;
		color: inherit;
		cursor: pointer;
		text-align: left;
	}

	.field-icon {
		font-family: var(--font-mono);
		font-size: 18px;
		width: 40px;
		text-align: center;
		font-weight: 700;
		color: var(--accent);
	}

	.field-label {
		font-family: var(--font-mono);
		font-size: 10px;
		color: var(--ink-2);
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}

	.field-value-static {
		font-size: 14px;
		color: var(--ink);
		padding-top: 4px;
	}

	.field-chevron {
		color: var(--ink-3);
		display: grid;
		place-items: center;
	}

	.field-chevron svg {
		width: 18px;
		height: 18px;
	}

	.currency-panel {
		margin-top: 0;
		border-top-left-radius: 0;
		border-top-right-radius: 0;
		border-top: 0;
	}

	.currency-list {
		list-style: none;
		margin: 0;
		padding: 0;
		max-height: 280px;
		overflow-y: auto;
	}

	.currency-list li + li {
		border-top: 1px solid var(--line);
	}

	.currency-row {
		width: 100%;
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 10px 4px;
		background: transparent;
		border: 0;
		color: inherit;
		cursor: pointer;
		text-align: left;
	}

	.currency-sym {
		width: 36px;
		text-align: center;
		font-size: 16px;
		font-weight: 600;
		color: var(--accent);
	}

	.currency-text {
		flex: 1;
		gap: 2px;
	}

	.currency-code {
		font-size: 14px;
		font-weight: 600;
	}

	.currency-name {
		font-size: 11px;
		font-family: var(--font-mono);
	}

	.currency-check {
		width: 18px;
		height: 18px;
		color: var(--accent);
	}

	.currency-row.on .currency-code {
		color: var(--accent);
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
