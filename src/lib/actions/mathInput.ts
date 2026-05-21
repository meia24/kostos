import type { Action } from 'svelte/action';
import { isAllowedMathChar, stripDisallowedMathChars } from '$lib/math';

/* `use:mathInput` confines an input field to the math-input alphabet.
 * Single-character keystrokes outside the alphabet are blocked at beforeinput.
 * Paste / drop / autofill payloads are stripped to allowed characters before insertion;
 * a pasted "$84.20" lands as "84.20" without breaking cursor position or `bind:value`.
 */
export const mathInput: Action<HTMLInputElement> = (node) => {
	function onBeforeInput(event: InputEvent) {
		const incoming = event.data;
		if (incoming == null) return;

		if (incoming.length === 1) {
			if (!isAllowedMathChar(incoming)) event.preventDefault();
			return;
		}

		const cleaned = stripDisallowedMathChars(incoming);
		if (cleaned === incoming) return;

		event.preventDefault();
		if (!cleaned) return;

		const start = node.selectionStart ?? node.value.length;
		const end = node.selectionEnd ?? node.value.length;
		const before = node.value.slice(0, start);
		const after = node.value.slice(end);
		node.value = before + cleaned + after;
		node.selectionStart = node.selectionEnd = start + cleaned.length;
		node.dispatchEvent(new Event('input', { bubbles: true }));
	}

	node.addEventListener('beforeinput', onBeforeInput);
	return {
		destroy() {
			node.removeEventListener('beforeinput', onBeforeInput);
		}
	};
};
