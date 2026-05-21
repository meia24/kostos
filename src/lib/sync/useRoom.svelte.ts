/* Reactive accessor for a room's state.
 *
 * Every route under /p/[roomId] needs the same boilerplate: open the room, observe the
 * project/members/expenses Y collections, and re-sync local $state when anything changes.
 * `useRoom(roomId)` returns a reactive container with `.project`, `.members`, `.expenses`,
 * plus the underlying `handle` (for mutators that need it). The caller wires lifecycle
 * via `$effect(() => room.observe())` so cleanup happens naturally on unmount.
 */

import { openRoom, readExpenses, readMembers, readProject, type RoomHandle } from './doc';
import type { Category, Expense, Member, PaymentMethodItem, Project } from '$lib/types';

export class RoomState {
	handle: RoomHandle;
	project = $state<Project | null>(null);
	members = $state<Member[]>([]);
	expenses = $state<Expense[]>([]);

	// Lookup maps + display helpers that every route ends up rebuilding. Keeping them on
	// the room itself means each component just consumes them; no per-route boilerplate.
	membersById = $derived(new Map(this.members.map((m) => [m.id, m])));
	categoryById = $derived<Map<string, Category>>(
		new Map((this.project?.categories ?? []).map((c) => [c.id, c]))
	);
	methodById = $derived<Map<string, PaymentMethodItem>>(
		new Map((this.project?.paymentMethods ?? []).map((m) => [m.id, m]))
	);
	currencySymbol = $derived(this.project?.currencySymbol ?? '€');

	constructor(handle: RoomHandle) {
		this.handle = handle;
		this.refresh();
	}

	private refresh = () => {
		this.project = readProject(this.handle);
		this.members = readMembers(this.handle);
		this.expenses = readExpenses(this.handle);
	};

	/** Attach Yjs observers + return a teardown function suitable for $effect cleanup. */
	observe(): () => void {
		this.handle.project.observeDeep(this.refresh);
		this.handle.members.observeDeep(this.refresh);
		this.handle.expenses.observeDeep(this.refresh);
		return () => {
			this.handle.project.unobserveDeep(this.refresh);
			this.handle.members.unobserveDeep(this.refresh);
			this.handle.expenses.unobserveDeep(this.refresh);
		};
	}
}

export function useRoom(roomId: string): RoomState {
	return new RoomState(openRoom(roomId));
}
