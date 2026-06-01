import type { ProjectColor } from './types';

export const PROJECT_COLOR_VALUES: Record<ProjectColor, string> = {
	lime: '#c4ff4f',
	cyan: '#5eead4',
	violet: '#b29cff',
	amber: '#ffc457',
	coral: '#ff8a6b',
	blue: '#7eb0ff'
};

export const PROJECT_COLORS: ProjectColor[] = ['lime', 'cyan', 'violet', 'amber', 'coral', 'blue'];

export function tileBackground(color: ProjectColor): string {
	return `color-mix(in oklab, ${PROJECT_COLOR_VALUES[color]} 22%, transparent)`;
}

/** Member avatar palette. Wider than the project set so groups of a dozen still get
 *  distinct colours, which is what lets two same-initial names stay apart at a glance. */
export const MEMBER_COLOR_VALUES: Record<string, string> = {
	lime: '#c4ff4f',
	cyan: '#5eead4',
	violet: '#b29cff',
	amber: '#ffc457',
	coral: '#ff8a6b',
	blue: '#7eb0ff',
	rose: '#ff9ecb',
	teal: '#4fd6c0',
	gold: '#f5d76e',
	sky: '#9bd0ff'
};

export const MEMBER_COLOR_KEYS: string[] = Object.keys(MEMBER_COLOR_VALUES);

export function memberTint(key: string): string {
	const value = MEMBER_COLOR_VALUES[key] ?? MEMBER_COLOR_VALUES.lime;
	return `color-mix(in oklab, ${value} 22%, transparent)`;
}

export function memberInk(key: string): string {
	return MEMBER_COLOR_VALUES[key] ?? MEMBER_COLOR_VALUES.lime;
}
