import { writable } from 'svelte/store';

/* Shared pointer to the currently focused math-enabled input. The `mathInput` action
 * publishes its node on focus and clears it on blur; the singleton `MathToolbar`
 * subscribes so it can inject operators into whichever amount field the user is editing. */
export const mathInputTarget = writable<HTMLInputElement | null>(null);
