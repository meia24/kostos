<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import ExpenseForm from '$lib/components/ExpenseForm.svelte';
	import { getCurrentMember } from '$lib/storage';
	import {
		addCategory,
		addPaymentMethod,
		generateId,
		openRoom,
		readExpenses,
		readMembers,
		readProject,
		updateExpense
	} from '$lib/sync/doc';
	import type { Category, Expense, Member, PaymentMethodItem, Project } from '$lib/types';

	const roomId = $derived(page.params.roomId ?? '');
	const expenseId = $derived(page.params.expenseId ?? '');
	const handle = $derived(openRoom(roomId));

	let project = $state<Project | null>(null);
	let members = $state<Member[]>([]);
	let initial = $state<Expense | null>(null);
	let notFound = $state(false);

	$effect(() => {
		const h = handle;
		const sync = () => {
			project = readProject(h);
			members = readMembers(h);
			const expense = readExpenses(h).find((e) => e.id === expenseId);
			if (expense) {
				if (!initial) initial = expense;
			} else if (project) {
				notFound = true;
			}
		};
		sync();
		h.project.observeDeep(sync);
		h.members.observeDeep(sync);
		h.expenses.observeDeep(sync);
		return () => {
			h.project.unobserveDeep(sync);
			h.members.unobserveDeep(sync);
			h.expenses.unobserveDeep(sync);
		};
	});

	const currentMemberId = $derived.by(() => getCurrentMember());

	async function onSave(expense: Expense) {
		updateExpense(handle, expense);
		await goto(`/p/${roomId}/expenses/${expense.id}`);
	}

	function onCancel() {
		goto(`/p/${roomId}/expenses/${expenseId}`);
	}
</script>

{#if notFound}
	<div class="screen empty-screen">
		<div class="card">
			<p class="muted">Expense not found.</p>
			<a href="/p/{roomId}/expenses" class="btn btn-block back-btn">Back to expenses</a>
		</div>
	</div>
{:else if project && members.length > 0 && initial}
	<ExpenseForm
		{project}
		{members}
		{currentMemberId}
		mode="edit"
		{initial}
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
	.loading-screen,
	.empty-screen {
		justify-content: center;
		align-items: center;
		padding: 24px;
	}

	.loading-pulse {
		width: 36px;
		height: 36px;
		border-radius: 999px;
		background: color-mix(in oklab, var(--accent) 30%, transparent);
		animation: pulse 1.4s ease-in-out infinite;
	}

	.back-btn {
		margin-top: 14px;
	}

	@keyframes pulse {
		0%, 100% { transform: scale(0.85); opacity: 0.6; }
		50% { transform: scale(1); opacity: 1; }
	}
</style>
