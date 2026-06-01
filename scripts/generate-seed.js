/* Generate a sample Kostos backup for local UI/UX testing.
 *
 * Produces a v2 ProjectArchive JSON in samples/. Drop it into /restore in dev
 * to spin up a populated group without clicking through the new-project flow.
 *
 * Dates are anchored to "now" at generation time so the data looks recent
 * across activity timelines and trip pickers. Re-run any time to refresh.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const outDir = resolve(root, 'samples');
const outPath = resolve(outDir, 'kostos-sample.json');

const now = Date.now();
const daysAgo = (d) => now - d * 24 * 60 * 60 * 1000;
const cents = (decimal) => Math.round(decimal * 100);

const members = [
	{ id: 'm-alice', name: 'Alice', createdAt: daysAgo(45) },
	{ id: 'm-bob', name: 'Bob', createdAt: daysAgo(45) },
	{ id: 'm-carol', name: 'Carol', createdAt: daysAgo(45) },
	{ id: 'm-dan', name: 'Dan', createdAt: daysAgo(40) }
];

const categories = [
	{ id: 'cat-groceries', name: 'Groceries', emoji: '🛒' },
	{ id: 'cat-restaurants', name: 'Restaurants', emoji: '🍽️' },
	{ id: 'cat-transport', name: 'Transport', emoji: '🚗' },
	{ id: 'cat-lodging', name: 'Lodging', emoji: '🛏️' },
	{ id: 'cat-activities', name: 'Activities', emoji: '🎉' },
	{ id: 'cat-other', name: 'Other', emoji: '📝' }
];

const paymentMethods = [
	{ id: 'pm-cash', name: 'Cash', emoji: '💵' },
	{ id: 'pm-card', name: 'Card', emoji: '💳' },
	{ id: 'pm-bank', name: 'Bank transfer', emoji: '🏦' },
	{ id: 'pm-other', name: 'Other', emoji: '📝' }
];

const trips = [
	{
		id: 'trip-lisbon',
		name: 'Lisbon weekend',
		emoji: '🏖️',
		startDate: daysAgo(30),
		endDate: daysAgo(27),
		closedAt: daysAgo(25),
		createdAt: daysAgo(31)
	},
	{
		id: 'trip-berlin',
		name: 'Berlin trip',
		emoji: '🍻',
		startDate: daysAgo(7),
		createdAt: daysAgo(8)
	}
];

const allFour = ['m-alice', 'm-bob', 'm-carol', 'm-dan'];

function expense({
	id,
	date,
	description,
	amount,
	payerId,
	payments,
	splitMode = 'even',
	splits,
	categoryId,
	paymentMethodId,
	tripId,
	notes,
	isSettlement,
	createdBy
}) {
	const finalPayments = payments ?? [{ memberId: payerId, amount }];
	return {
		id,
		payments: finalPayments,
		amount,
		currency: 'EUR',
		description,
		categoryId,
		paymentMethodId,
		tripId,
		date,
		splitMode,
		splits,
		notes,
		isSettlement,
		createdAt: date,
		createdBy: createdBy ?? finalPayments[0].memberId
	};
}

const even = (ids) => ids.map((id) => ({ memberId: id }));

const expenses = [
	expense({
		id: 'e-groceries-1',
		date: daysAgo(38),
		description: 'Weekly groceries',
		amount: cents(76.4),
		payerId: 'm-alice',
		splits: even(allFour),
		categoryId: 'cat-groceries',
		paymentMethodId: 'pm-card'
	}),
	expense({
		id: 'e-coffee',
		date: daysAgo(35),
		description: 'Coffee run',
		amount: cents(10.0),
		payerId: 'm-bob',
		splits: even(['m-alice', 'm-bob', 'm-carol']),
		categoryId: 'cat-restaurants',
		paymentMethodId: 'pm-cash'
	}),

	// Lisbon trip (closed): three expenses across split modes.
	expense({
		id: 'e-lisbon-dinner',
		date: daysAgo(29),
		description: 'Dinner, "Casa do Bacalhau"',
		amount: cents(124.8),
		payerId: 'm-carol',
		splits: even(allFour),
		categoryId: 'cat-restaurants',
		paymentMethodId: 'pm-card',
		tripId: 'trip-lisbon',
		notes: 'amazing fish\ntwo bottles of wine'
	}),
	expense({
		id: 'e-lisbon-hotel',
		date: daysAgo(28),
		description: 'Hotel, 2 nights',
		amount: cents(340.0),
		payerId: 'm-alice',
		splitMode: 'shares',
		splits: [
			{ memberId: 'm-alice', shares: 2 },
			{ memberId: 'm-bob', shares: 1 },
			{ memberId: 'm-carol', shares: 1 },
			{ memberId: 'm-dan', shares: 2 }
		],
		categoryId: 'cat-lodging',
		paymentMethodId: 'pm-card',
		tripId: 'trip-lisbon'
	}),
	expense({
		id: 'e-lisbon-tram',
		date: daysAgo(27),
		description: 'Tram + tickets',
		amount: cents(48.5),
		payerId: 'm-bob',
		splitMode: 'amount',
		splits: [
			{ memberId: 'm-alice', amount: cents(12.0) },
			{ memberId: 'm-bob', amount: cents(12.0) },
			{ memberId: 'm-carol', amount: cents(12.0) },
			{ memberId: 'm-dan', amount: cents(12.5) }
		],
		categoryId: 'cat-activities',
		paymentMethodId: 'pm-cash',
		tripId: 'trip-lisbon'
	}),

	// Berlin trip (open): multi-payer, partial group, no-category, settlement.
	expense({
		id: 'e-berlin-flight',
		date: daysAgo(7),
		description: 'Group flight tickets',
		amount: cents(480.0),
		payments: [
			{ memberId: 'm-alice', amount: cents(300.0) },
			{ memberId: 'm-carol', amount: cents(180.0) }
		],
		splits: even(allFour),
		categoryId: 'cat-transport',
		paymentMethodId: 'pm-card',
		tripId: 'trip-berlin'
	}),
	expense({
		id: 'e-berlin-snacks',
		date: daysAgo(5),
		description: 'Snacks at the station',
		amount: cents(18.75),
		payerId: 'm-dan',
		splits: even(['m-bob', 'm-carol', 'm-dan']),
		categoryId: 'cat-groceries',
		paymentMethodId: 'pm-cash',
		tripId: 'trip-berlin'
	}),
	expense({
		id: 'e-berlin-souvenirs',
		date: daysAgo(4),
		description: 'Souvenirs',
		amount: cents(33.0),
		payerId: 'm-carol',
		splits: even(['m-alice', 'm-carol']),
		tripId: 'trip-berlin'
	}),
	expense({
		id: 'e-berlin-airbnb',
		date: daysAgo(3),
		description: 'Airbnb 3 nights',
		amount: cents(556.0),
		payerId: 'm-dan',
		splitMode: 'shares',
		splits: [
			{ memberId: 'm-alice', shares: 1 },
			{ memberId: 'm-bob', shares: 1 },
			{ memberId: 'm-carol', shares: 1 },
			{ memberId: 'm-dan', shares: 1 }
		],
		categoryId: 'cat-lodging',
		paymentMethodId: 'pm-card',
		tripId: 'trip-berlin'
	}),

	// Settlement: Bob sends Alice 60.00 via bank transfer.
	expense({
		id: 'e-settle-bob-alice',
		date: daysAgo(2),
		description: 'Settle up',
		amount: cents(60.0),
		payerId: 'm-bob',
		splits: [{ memberId: 'm-alice' }],
		paymentMethodId: 'pm-bank',
		isSettlement: true
	}),

	expense({
		id: 'e-today-lunch',
		date: daysAgo(0),
		description: 'Lunch',
		amount: cents(42.0),
		payerId: 'm-alice',
		splits: even(['m-alice', 'm-bob']),
		categoryId: 'cat-restaurants',
		paymentMethodId: 'pm-card'
	})
];

const archive = {
	schemaVersion: 2,
	app: 'kostos',
	exportedAt: now,
	project: {
		name: 'Sample group',
		description: 'Seeded data for local UI/UX testing',
		emoji: '🧪',
		color: 'lime',
		currency: 'EUR',
		currencySymbol: '€',
		defaultSplit: 'even',
		categories,
		paymentMethods,
		trips,
		createdAt: daysAgo(45)
	},
	members,
	expenses
};

mkdirSync(outDir, { recursive: true });
writeFileSync(outPath, JSON.stringify(archive, null, 2) + '\n');
console.log(
	`[seed] wrote ${outPath} (${members.length} members, ${expenses.length} expenses, ${trips.length} trips)`
);
