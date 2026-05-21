import { browser } from '$app/environment';

type Theme = 'light' | 'dark';
type Palette = 'lime' | 'cyan' | 'violet' | 'amber' | 'coral' | 'blue';

const KEY = {
	theme: 'kostos:theme',
	palette: 'kostos:palette',
	currentProject: 'kostos:current_project',
	currentMember: 'kostos:current_member'
} as const;

export type ProjectRef = {
	/** Short, human-readable room id shown in the UI (e.g. `prt-4f2k-9xba`). */
	roomId: string;
	/** Secret half of the token. Lives only in the URL fragment + localStorage; never sent to the server. */
	secret: string;
	/** Display name the user gave the project. */
	name: string;
};

function read(key: string): string | null {
	if (!browser) return null;
	try {
		return localStorage.getItem(key);
	} catch {
		return null;
	}
}

function write(key: string, value: string | null): void {
	if (!browser) return;
	try {
		if (value === null) localStorage.removeItem(key);
		else localStorage.setItem(key, value);
	} catch {
		// ignore quota errors and private-mode rejections
	}
}

export function getTheme(): Theme {
	return read(KEY.theme) === 'light' ? 'light' : 'dark';
}

export function setTheme(t: Theme): void {
	write(KEY.theme, t);
	if (browser) document.documentElement.setAttribute('data-theme', t);
}

export function getPalette(): Palette {
	const p = read(KEY.palette) as Palette | null;
	return p ?? 'lime';
}

export function setPalette(p: Palette): void {
	write(KEY.palette, p);
	if (browser) document.documentElement.setAttribute('data-palette', p);
}

export function getCurrentProject(): ProjectRef | null {
	const raw = read(KEY.currentProject);
	if (!raw) return null;
	try {
		const parsed = JSON.parse(raw);
		if (parsed && typeof parsed.roomId === 'string' && typeof parsed.secret === 'string') {
			return parsed as ProjectRef;
		}
	} catch {
		// corrupt payload; treat as no stored project
	}
	return null;
}

export function setCurrentProject(p: ProjectRef | null): void {
	write(KEY.currentProject, p ? JSON.stringify(p) : null);
}

export function getCurrentMember(): string | null {
	return read(KEY.currentMember);
}

export function setCurrentMember(memberId: string | null): void {
	write(KEY.currentMember, memberId);
}
