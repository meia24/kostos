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
