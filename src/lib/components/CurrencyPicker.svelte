<script lang="ts">
	import { CURRENCY_PRESETS, type CurrencyPreset } from '$lib/currencies';

	type Props = {
		code: string;
		symbol: string;
		onSelect: (preset: CurrencyPreset) => void;
		onCustom: (symbol: string) => void;
		variant?: 'card' | 'inline';
	};

	let { code, symbol, onSelect, onCustom, variant = 'card' }: Props = $props();

	let open = $state(false);
	let customSym = $state('');

	const currentName = $derived.by(() => {
		if (code === '—') return 'Custom';
		return CURRENCY_PRESETS.find((p) => p.code === code)?.name ?? code;
	});

	function commitCustom() {
		const cleaned = customSym.trim().slice(0, 4);
		if (!cleaned) return;
		onCustom(cleaned);
		customSym = '';
		open = false;
	}

	function selectPreset(p: CurrencyPreset) {
		onSelect(p);
		open = false;
	}
</script>

<div class="currency-picker" data-variant={variant}>
	<button
		type="button"
		class="field field-button"
		aria-expanded={open}
		onclick={() => (open = !open)}
	>
		<span class="field-icon num">{symbol}</span>
		<span class="col field-text">
			<span class="field-label">Default currency</span>
			<span class="field-value-static">{code === '—' ? 'Custom' : code} · {currentName}</span>
		</span>
		<span class="field-chevron" aria-hidden="true">
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
				<path d="M6 9l6 6 6-6" />
			</svg>
		</span>
	</button>
	{#if open}
		<ul class="currency-list">
			{#each CURRENCY_PRESETS as p (p.code)}
				<li>
					<button
						type="button"
						class="currency-row"
						class:on={p.code === code}
						onclick={() => selectPreset(p)}
					>
						<span class="currency-sym num">{p.sym}</span>
						<span class="col currency-text">
							<span class="currency-code">{p.code}</span>
							<span class="dim currency-name">{p.name}</span>
						</span>
						{#if p.code === code}
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="currency-check"><path d="M5 12l5 5L20 7" /></svg>
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
					onclick={commitCustom}
					disabled={!customSym.trim()}
				>
					Use
				</button>
			</div>
			<p class="dim picker-hint">Up to 4 characters.</p>
		</div>
	{/if}
</div>

<style>
	.currency-picker {
		display: flex;
		flex-direction: column;
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
		font: inherit;
	}

	.field-icon {
		font-family: var(--font-mono);
		font-size: 18px;
		width: 40px;
		text-align: center;
		font-weight: 700;
		color: var(--accent);
	}

	.field-text {
		flex: 1;
		align-items: flex-start;
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

	.currency-list {
		list-style: none;
		margin: 0;
		padding: 8px;
		max-height: 280px;
		overflow-y: auto;
		border-top: 1px solid var(--line);
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
		font: inherit;
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

	.picker-custom {
		padding: 12px 10px 14px;
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
</style>
