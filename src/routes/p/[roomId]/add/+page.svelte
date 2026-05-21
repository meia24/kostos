<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import ExpenseForm from '$lib/components/ExpenseForm.svelte';
	import { getCurrentMember } from '$lib/storage';
	import {
		addCategory,
		addExpense,
		addPaymentMethod,
		generateId,
		openRoom,
		readMembers,
		readProject
	} from '$lib/sync/doc';
	import type { Category, Expense, Member, PaymentMethodItem, Project } from '$lib/types';

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

	const currentMemberId = $derived.by(() => getCurrentMember());

	async function onSave(expense: Expense) {
		addExpense(handle, expense);
		await goto(`/p/${roomId}`);
	}

	function onCancel() {
		goto(`/p/${roomId}`);
	}
</script>

{#if project && members.length > 0}
	<ExpenseForm
		{project}
		{members}
		{currentMemberId}
		mode="create"
		{onSave}
		{onCancel}
		onAddCategory={(cat: Category) => addCategory(handle, cat)}
		onAddPaymentMethod={(m: PaymentMethodItem) => addPaymentMethod(handle, m)}
		{generateId}
	/>
{:else}
	<div class="screen loading-screen">
		<div class="loading-pulse" aria-hidden="true"></div>
	</div>
{/if}

<style>
	.loading-screen {
		justify-content: center;
		align-items: center;
	}

	.loading-pulse {
		width: 36px;
		height: 36px;
		border-radius: 999px;
		background: color-mix(in oklab, var(--accent) 30%, transparent);
		animation: pulse 1.4s ease-in-out infinite;
	}

	@keyframes pulse {
		0%, 100% { transform: scale(0.85); opacity: 0.6; }
		50% { transform: scale(1); opacity: 1; }
	}
</style>
