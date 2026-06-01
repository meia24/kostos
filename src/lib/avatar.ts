import { MEMBER_COLOR_KEYS, memberInk, memberTint } from './colors';
import { ANIMAL_EMOJIS } from './emojis';

/** The minimal shape an avatar needs. Full `Member` objects satisfy it, as do the lighter
 *  row objects some views build (e.g. stats contributions). */
export type AvatarMember = { id: string; name: string; color?: string; emoji?: string };

function hashId(id: string): number {
	let h = 5381;
	for (let i = 0; i < id.length; i++) h = ((h << 5) + h + id.charCodeAt(i)) >>> 0;
	return h;
}

/** A member's colour key: their stored choice, else a stable one derived from the id so
 *  pre-existing groups get colours with no migration. */
export function memberColorKey(member: AvatarMember): string {
	if (member.color && MEMBER_COLOR_KEYS.includes(member.color)) return member.color;
	return MEMBER_COLOR_KEYS[hashId(member.id) % MEMBER_COLOR_KEYS.length];
}

/** Random colour not already used by `existing` (falls back to any when all are taken). */
export function pickMemberColor(existing: AvatarMember[]): string {
	const used = new Set(existing.map((m) => m.color).filter(Boolean));
	const free = MEMBER_COLOR_KEYS.filter((k) => !used.has(k));
	const pool = free.length > 0 ? free : MEMBER_COLOR_KEYS;
	return pool[Math.floor(Math.random() * pool.length)];
}

/** Random animal emoji not already used by `existing` (falls back to any when all taken). */
export function pickMemberEmoji(existing: AvatarMember[]): string {
	const used = new Set(existing.map((m) => m.emoji).filter(Boolean));
	const free = ANIMAL_EMOJIS.filter((e) => !used.has(e));
	const pool = free.length > 0 ? free : ANIMAL_EMOJIS;
	return pool[Math.floor(Math.random() * pool.length)];
}

export type Avatar = { glyph: string; tint: string; ink: string; isEmoji: boolean };

export function memberAvatar(member: AvatarMember | null | undefined): Avatar {
	const emoji = member?.emoji?.trim();
	const key = member ? memberColorKey(member) : MEMBER_COLOR_KEYS[0];
	return {
		glyph: emoji || (member?.name?.[0] ?? '?').toUpperCase(),
		tint: memberTint(key),
		ink: memberInk(key),
		isEmoji: !!emoji
	};
}
