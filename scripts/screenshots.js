/* Capture README screenshots via Playwright.
 *
 * Drives a fresh iPhone-emulated browser context against the running dev server
 * (default :5173), restores a deterministic sample project via the import flow,
 * then walks through the key screens. Outputs to docs/screenshots/.
 *
 * Run: npm run screenshots  (dev server must already be running on :5173)
 */

import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(HERE, '..', 'docs', 'screenshots');
const BASE_URL = process.env.SCREENSHOT_BASE_URL ?? 'http://localhost:5173';

const DAY_MS = 86_400_000;
const now = Date.now();
const day = (offsetDays) => now + offsetDays * DAY_MS;

const archive = {
	schemaVersion: 2,
	app: 'kostos',
	exportedAt: now,
	project: {
		name: 'Lisbon Crew',
		description: 'Friends & flatmates',
		emoji: '🏖',
		color: 'lime',
		currency: 'EUR',
		currencySymbol: '€',
		defaultSplit: 'even',
		createdAt: day(-180),
		categories: [
			{ id: 'cat-groceries', name: 'Groceries', emoji: '🛒' },
			{ id: 'cat-restaurants', name: 'Restaurants', emoji: '🍽️' },
			{ id: 'cat-transport', name: 'Transport', emoji: '🚗' },
			{ id: 'cat-lodging', name: 'Lodging', emoji: '🛏️' },
			{ id: 'cat-activities', name: 'Activities', emoji: '🎉' },
			{ id: 'cat-other', name: 'Other', emoji: '📝' }
		],
		paymentMethods: [
			{ id: 'pm-cash', name: 'Cash', emoji: '💵' },
			{ id: 'pm-card', name: 'Card', emoji: '💳' },
			{ id: 'pm-bank', name: 'Bank transfer', emoji: '🏦' }
		],
		trips: [
			{
				id: 'trip-lisbon',
				name: 'Lisbon weekend',
				emoji: '🏖',
				startDate: day(-5),
				endDate: day(-2),
				createdAt: day(-20)
			},
			{
				id: 'trip-flat',
				name: 'Flat costs',
				emoji: '🏠',
				startDate: day(-180),
				createdAt: day(-180)
			},
			{
				id: 'trip-ski',
				name: 'Ski trip',
				emoji: '⛷️',
				startDate: day(-90),
				endDate: day(-86),
				createdAt: day(-100)
			}
		]
	},
	members: [
		{ id: 'm-anna', name: 'Anna', createdAt: day(-180) },
		{ id: 'm-marco', name: 'Marco', createdAt: day(-180) },
		{ id: 'm-sofia', name: 'Sofia', createdAt: day(-180) }
	],
	expenses: [
		{
			id: 'e1',
			payments: [{ memberId: 'm-anna', amount: 12000 }],
			amount: 12000,
			currency: 'EUR',
			description: 'Hotel (Lisbon)',
			categoryId: 'cat-lodging',
			paymentMethodId: 'pm-card',
			tripId: 'trip-lisbon',
			date: day(-5),
			splitMode: 'even',
			splits: [{ memberId: 'm-anna' }, { memberId: 'm-marco' }, { memberId: 'm-sofia' }],
			createdAt: day(-5),
			createdBy: 'm-anna'
		},
		{
			id: 'e2',
			payments: [{ memberId: 'm-marco', amount: 8400 }],
			amount: 8400,
			currency: 'EUR',
			description: 'Seafood dinner',
			categoryId: 'cat-restaurants',
			paymentMethodId: 'pm-card',
			tripId: 'trip-lisbon',
			date: day(-4),
			splitMode: 'shares',
			splits: [
				{ memberId: 'm-anna', shares: 2 },
				{ memberId: 'm-marco', shares: 2 },
				{ memberId: 'm-sofia', shares: 1 }
			],
			notes: 'Sofia not very hungry',
			createdAt: day(-4),
			createdBy: 'm-marco'
		},
		{
			id: 'e3',
			payments: [{ memberId: 'm-sofia', amount: 3200 }],
			amount: 3200,
			currency: 'EUR',
			description: 'Tram tickets',
			categoryId: 'cat-transport',
			paymentMethodId: 'pm-cash',
			tripId: 'trip-lisbon',
			date: day(-3),
			splitMode: 'even',
			splits: [{ memberId: 'm-anna' }, { memberId: 'm-marco' }, { memberId: 'm-sofia' }],
			createdAt: day(-3),
			createdBy: 'm-sofia'
		},
		{
			id: 'e4',
			payments: [
				{ memberId: 'm-anna', amount: 4500 },
				{ memberId: 'm-marco', amount: 3000 }
			],
			amount: 7500,
			currency: 'EUR',
			description: 'Pastéis & coffee',
			categoryId: 'cat-restaurants',
			paymentMethodId: 'pm-card',
			tripId: 'trip-lisbon',
			date: day(-3),
			splitMode: 'even',
			splits: [{ memberId: 'm-anna' }, { memberId: 'm-marco' }, { memberId: 'm-sofia' }],
			createdAt: day(-3),
			createdBy: 'm-anna'
		},
		{
			id: 'e5',
			payments: [{ memberId: 'm-anna', amount: 9800 }],
			amount: 9800,
			currency: 'EUR',
			description: 'Groceries this week',
			categoryId: 'cat-groceries',
			paymentMethodId: 'pm-card',
			tripId: 'trip-flat',
			date: day(-1),
			splitMode: 'even',
			splits: [{ memberId: 'm-anna' }, { memberId: 'm-marco' }, { memberId: 'm-sofia' }],
			createdAt: day(-1),
			createdBy: 'm-anna'
		},
		{
			id: 'e6',
			payments: [{ memberId: 'm-sofia', amount: 6500 }],
			amount: 6500,
			currency: 'EUR',
			description: 'Internet bill',
			categoryId: 'cat-other',
			paymentMethodId: 'pm-bank',
			tripId: 'trip-flat',
			date: day(-2),
			splitMode: 'even',
			splits: [{ memberId: 'm-anna' }, { memberId: 'm-marco' }, { memberId: 'm-sofia' }],
			createdAt: day(-2),
			createdBy: 'm-sofia'
		},
		{
			id: 'e7',
			payments: [{ memberId: 'm-marco', amount: 18000 }],
			amount: 18000,
			currency: 'EUR',
			description: 'Lift passes',
			categoryId: 'cat-activities',
			paymentMethodId: 'pm-card',
			tripId: 'trip-ski',
			date: day(-90),
			splitMode: 'even',
			splits: [{ memberId: 'm-anna' }, { memberId: 'm-marco' }, { memberId: 'm-sofia' }],
			createdAt: day(-90),
			createdBy: 'm-marco'
		}
	]
};

async function main() {
	await mkdir(OUT_DIR, { recursive: true });

	const browser = await chromium.launch();
	const context = await browser.newContext({
		viewport: { width: 420, height: 900 },
		deviceScaleFactor: 2,
		isMobile: true,
		hasTouch: true,
		userAgent:
			'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
		colorScheme: 'dark',
		reducedMotion: 'reduce'
	});

	// Force dark theme and disable Vite HMR overlay noise before any script runs.
	await context.addInitScript(() => {
		try {
			localStorage.setItem('kostos:theme', 'dark');
		} catch {
			// private mode: ignore
		}
	});

	const page = await context.newPage();
	page.on('pageerror', (e) => console.error('[pageerror]', e.message));

	async function shot(name) {
		const path = `${OUT_DIR}/${name}.png`;
		await page.screenshot({ path });
		console.log(`  ✓ ${name}.png`);
	}

	console.log('Capturing screenshots…');

	// 1. Landing
	await page.goto(`${BASE_URL}/`);
	await page.waitForSelector('text=Create your first group');
	await shot('01-landing');

	// 2. Restore the seed archive
	await page.goto(`${BASE_URL}/restore`);
	await page.waitForSelector('input[type=file]');
	await page.setInputFiles('input[type=file]', {
		name: 'kostos-lisbon-crew.json',
		mimeType: 'application/json',
		buffer: Buffer.from(JSON.stringify(archive))
	});
	await page.waitForSelector('text=Restore on this device');
	// Anna is the first member; the picker preselects her.
	await page.click('text=Restore on this device');
	await page.waitForURL(/\/p\/PRT-/);
	await page.waitForSelector('.trip-strip');

	// 3. Project home (default: All)
	await page.waitForTimeout(300); // let animations settle
	await shot('02-home');

	// 4. Project home filtered to Lisbon
	await page.click('button:has-text("Lisbon weekend")');
	await page.waitForTimeout(300);
	await shot('03-home-lisbon');

	// 5. Add expense form
	await page.click('a[aria-label="Add expense"]');
	await page.waitForSelector('text=New expense');
	await page.waitForTimeout(200);
	await shot('04-add-expense');

	// 6. Amount input focused (math toolbar should appear)
	await page.fill('.amount-input', '50/3');
	await page.focus('.amount-input');
	await page.waitForTimeout(400);
	await shot('05-math-toolbar');

	// 7. Settle up page
	const roomUrl = page.url().replace(/\/add$/, '');
	await page.goto(`${roomUrl}/settle`);
	await page.waitForSelector('text=Settle up');
	await page.waitForTimeout(300);
	await shot('06-settle');

	// 8. Stats page (still scoped to Lisbon)
	await page.goto(`${roomUrl}/stats`);
	await page.waitForSelector('.tabs-pill');
	await page.waitForTimeout(400);
	await shot('07-stats');

	// 9. Manage trips screen
	await page.goto(`${roomUrl}/settings/trips`);
	await page.waitForSelector('.intro');
	await page.waitForTimeout(300);
	await shot('08-trips');

	// 10. Settings (data section)
	await page.goto(`${roomUrl}/settings`);
	await page.waitForSelector('text=Export backup (JSON)');
	// Scroll down to the Data section so it's centered.
	await page.evaluate(() => {
		document.querySelector('.data-card')?.scrollIntoView({ block: 'center' });
	});
	await page.waitForTimeout(300);
	await shot('09-data');

	await browser.close();
	console.log(`Done. ${OUT_DIR}`);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
