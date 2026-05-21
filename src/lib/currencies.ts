export type CurrencyPreset = { code: string; sym: string; name: string };

const ZERO_DECIMAL_CURRENCIES = new Set([
	'JPY',
	'KRW',
	'VND',
	'ISK',
	'CLP',
	'PYG',
	'UGX',
	'XAF',
	'XOF',
	'XPF',
	'BIF',
	'DJF',
	'GNF',
	'KMF',
	'RWF'
]);

export function currencyDecimals(code: string | undefined | null): number {
	if (!code) return 2;
	return ZERO_DECIMAL_CURRENCIES.has(code.toUpperCase()) ? 0 : 2;
}

export const CURRENCY_PRESETS: CurrencyPreset[] = [
	{ code: 'EUR', sym: '€', name: 'Euro' },
	{ code: 'USD', sym: '$', name: 'US Dollar' },
	{ code: 'GBP', sym: '£', name: 'British Pound' },
	{ code: 'JPY', sym: '¥', name: 'Japanese Yen' },
	{ code: 'CHF', sym: 'Fr', name: 'Swiss Franc' },
	{ code: 'CAD', sym: 'C$', name: 'Canadian Dollar' },
	{ code: 'AUD', sym: 'A$', name: 'Australian Dollar' },
	{ code: 'BRL', sym: 'R$', name: 'Brazilian Real' },
	{ code: 'MXN', sym: 'Mex$', name: 'Mexican Peso' },
	{ code: 'INR', sym: '₹', name: 'Indian Rupee' },
	{ code: 'CNY', sym: '¥', name: 'Chinese Yuan' },
	{ code: 'KRW', sym: '₩', name: 'South Korean Won' },
	{ code: 'SEK', sym: 'kr', name: 'Swedish Krona' },
	{ code: 'NOK', sym: 'kr', name: 'Norwegian Krone' },
	{ code: 'PLN', sym: 'zł', name: 'Polish Złoty' },
	{ code: 'TRY', sym: '₺', name: 'Turkish Lira' }
];
