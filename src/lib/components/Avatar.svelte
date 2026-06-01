<script lang="ts">
	import { memberAvatar, type AvatarMember } from '$lib/avatar';

	type Props = {
		member: AvatarMember | null | undefined;
		size?: 'xs' | 'sm' | 'md' | 'lg' | '';
		class?: string;
		active?: boolean;
	};

	let { member, size = '', class: extra = '', active = false }: Props = $props();

	const av = $derived(memberAvatar(member));
</script>

<span
	class="av {size ? `av-${size}` : ''} {extra}"
	class:is-emoji={av.isEmoji}
	class:is-active={active}
	style="background: {av.tint}; color: {av.ink};"
>
	{av.glyph}
</span>

<style>
	/* size the emoji to fill the circle without spilling past its edge (per avatar size) */
	.av.is-emoji {
		line-height: 1;
		font-size: 19px;
	}
	.av-lg.is-emoji {
		font-size: 28px;
	}
	.av-md.is-emoji {
		font-size: 23px;
	}
	.av-sm.is-emoji {
		font-size: 14px;
	}
	.av-xs.is-emoji {
		font-size: 12px;
	}

	.av.is-active {
		box-shadow: 0 0 0 2px var(--accent);
	}
</style>
