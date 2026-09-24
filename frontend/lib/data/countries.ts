/**
 * Country dialling codes for the phone field.
 *
 * Only the ISO code and the dial code are stored: country names are
 * produced at render time with Intl.DisplayNames, so they appear in the
 * visitor's own language without shipping a translated name list.
 */

export interface Country {
  iso: string;
  dial: string;
}

export const DEFAULT_COUNTRY_ISO = 'EG';

/** Digits allowed in the national part, per country. */
export const NATIONAL_NUMBER_LENGTHS: Record<string, number[]> = {
  // Egyptian mobiles are 10 digits, or 11 written with the leading 0.
  EG: [10, 11],
};
export const DEFAULT_NATIONAL_LENGTH = { min: 6, max: 15 };

export const COUNTRIES: Country[] = [
  { iso: 'EG', dial: '+20' },
  { iso: 'SA', dial: '+966' },
  { iso: 'AE', dial: '+971' },
  { iso: 'KW', dial: '+965' },
  { iso: 'QA', dial: '+974' },
  { iso: 'BH', dial: '+973' },
  { iso: 'OM', dial: '+968' },
  { iso: 'JO', dial: '+962' },
  { iso: 'LB', dial: '+961' },
  { iso: 'PS', dial: '+970' },
  { iso: 'SY', dial: '+963' },
  { iso: 'IQ', dial: '+964' },
  { iso: 'YE', dial: '+967' },
  { iso: 'SD', dial: '+249' },
  { iso: 'LY', dial: '+218' },
  { iso: 'TN', dial: '+216' },
  { iso: 'DZ', dial: '+213' },
  { iso: 'MA', dial: '+212' },
  { iso: 'MR', dial: '+222' },
  { iso: 'SO', dial: '+252' },
  { iso: 'DJ', dial: '+253' },
  { iso: 'KM', dial: '+269' },
  { iso: 'TR', dial: '+90' },
  { iso: 'GB', dial: '+44' },
  { iso: 'US', dial: '+1' },
  { iso: 'CA', dial: '+1' },
  { iso: 'DE', dial: '+49' },
  { iso: 'FR', dial: '+33' },
  { iso: 'IT', dial: '+39' },
  { iso: 'ES', dial: '+34' },
  { iso: 'PT', dial: '+351' },
  { iso: 'NL', dial: '+31' },
  { iso: 'BE', dial: '+32' },
  { iso: 'CH', dial: '+41' },
  { iso: 'AT', dial: '+43' },
  { iso: 'SE', dial: '+46' },
  { iso: 'NO', dial: '+47' },
  { iso: 'DK', dial: '+45' },
  { iso: 'FI', dial: '+358' },
  { iso: 'IE', dial: '+353' },
  { iso: 'PL', dial: '+48' },
  { iso: 'CZ', dial: '+420' },
  { iso: 'SK', dial: '+421' },
  { iso: 'HU', dial: '+36' },
  { iso: 'RO', dial: '+40' },
  { iso: 'BG', dial: '+359' },
  { iso: 'GR', dial: '+30' },
  { iso: 'CY', dial: '+357' },
  { iso: 'MT', dial: '+356' },
  { iso: 'HR', dial: '+385' },
  { iso: 'SI', dial: '+386' },
  { iso: 'RS', dial: '+381' },
  { iso: 'BA', dial: '+387' },
  { iso: 'ME', dial: '+382' },
  { iso: 'MK', dial: '+389' },
  { iso: 'AL', dial: '+355' },
  { iso: 'UA', dial: '+380' },
  { iso: 'BY', dial: '+375' },
  { iso: 'MD', dial: '+373' },
  { iso: 'RU', dial: '+7' },
  { iso: 'KZ', dial: '+7' },
  { iso: 'GE', dial: '+995' },
  { iso: 'AM', dial: '+374' },
  { iso: 'AZ', dial: '+994' },
  { iso: 'IL', dial: '+972' },
  { iso: 'IR', dial: '+98' },
  { iso: 'AF', dial: '+93' },
  { iso: 'PK', dial: '+92' },
  { iso: 'IN', dial: '+91' },
  { iso: 'BD', dial: '+880' },
  { iso: 'LK', dial: '+94' },
  { iso: 'NP', dial: '+977' },
  { iso: 'MV', dial: '+960' },
  { iso: 'CN', dial: '+86' },
  { iso: 'JP', dial: '+81' },
  { iso: 'KR', dial: '+82' },
  { iso: 'HK', dial: '+852' },
  { iso: 'MO', dial: '+853' },
  { iso: 'TW', dial: '+886' },
  { iso: 'SG', dial: '+65' },
  { iso: 'MY', dial: '+60' },
  { iso: 'ID', dial: '+62' },
  { iso: 'TH', dial: '+66' },
  { iso: 'VN', dial: '+84' },
  { iso: 'PH', dial: '+63' },
  { iso: 'KH', dial: '+855' },
  { iso: 'LA', dial: '+856' },
  { iso: 'MM', dial: '+95' },
  { iso: 'BN', dial: '+673' },
  { iso: 'MN', dial: '+976' },
  { iso: 'UZ', dial: '+998' },
  { iso: 'TM', dial: '+993' },
  { iso: 'TJ', dial: '+992' },
  { iso: 'KG', dial: '+996' },
  { iso: 'AU', dial: '+61' },
  { iso: 'NZ', dial: '+64' },
  { iso: 'FJ', dial: '+679' },
  { iso: 'PG', dial: '+675' },
  { iso: 'ZA', dial: '+27' },
  { iso: 'NG', dial: '+234' },
  { iso: 'KE', dial: '+254' },
  { iso: 'ET', dial: '+251' },
  { iso: 'ER', dial: '+291' },
  { iso: 'SS', dial: '+211' },
  { iso: 'TZ', dial: '+255' },
  { iso: 'UG', dial: '+256' },
  { iso: 'RW', dial: '+250' },
  { iso: 'BI', dial: '+257' },
  { iso: 'GH', dial: '+233' },
  { iso: 'CI', dial: '+225' },
  { iso: 'SN', dial: '+221' },
  { iso: 'ML', dial: '+223' },
  { iso: 'BF', dial: '+226' },
  { iso: 'NE', dial: '+227' },
  { iso: 'TD', dial: '+235' },
  { iso: 'CM', dial: '+237' },
  { iso: 'CF', dial: '+236' },
  { iso: 'GA', dial: '+241' },
  { iso: 'CG', dial: '+242' },
  { iso: 'CD', dial: '+243' },
  { iso: 'AO', dial: '+244' },
  { iso: 'ZM', dial: '+260' },
  { iso: 'ZW', dial: '+263' },
  { iso: 'MW', dial: '+265' },
  { iso: 'MZ', dial: '+258' },
  { iso: 'BW', dial: '+267' },
  { iso: 'NA', dial: '+264' },
  { iso: 'LS', dial: '+266' },
  { iso: 'SZ', dial: '+268' },
  { iso: 'MG', dial: '+261' },
  { iso: 'MU', dial: '+230' },
  { iso: 'SC', dial: '+248' },
  { iso: 'GM', dial: '+220' },
  { iso: 'GN', dial: '+224' },
  { iso: 'GW', dial: '+245' },
  { iso: 'SL', dial: '+232' },
  { iso: 'LR', dial: '+231' },
  { iso: 'TG', dial: '+228' },
  { iso: 'BJ', dial: '+229' },
  { iso: 'CV', dial: '+238' },
  { iso: 'ST', dial: '+239' },
  { iso: 'GQ', dial: '+240' },
  { iso: 'BR', dial: '+55' },
  { iso: 'AR', dial: '+54' },
  { iso: 'CL', dial: '+56' },
  { iso: 'CO', dial: '+57' },
  { iso: 'PE', dial: '+51' },
  { iso: 'VE', dial: '+58' },
  { iso: 'EC', dial: '+593' },
  { iso: 'BO', dial: '+591' },
  { iso: 'PY', dial: '+595' },
  { iso: 'UY', dial: '+598' },
  { iso: 'GY', dial: '+592' },
  { iso: 'SR', dial: '+597' },
  { iso: 'MX', dial: '+52' },
  { iso: 'GT', dial: '+502' },
  { iso: 'SV', dial: '+503' },
  { iso: 'HN', dial: '+504' },
  { iso: 'NI', dial: '+505' },
  { iso: 'CR', dial: '+506' },
  { iso: 'PA', dial: '+507' },
  { iso: 'CU', dial: '+53' },
  { iso: 'DO', dial: '+1' },
  { iso: 'HT', dial: '+509' },
  { iso: 'JM', dial: '+1' },
  { iso: 'TT', dial: '+1' },
  { iso: 'BS', dial: '+1' },
  { iso: 'BB', dial: '+1' },
  { iso: 'IS', dial: '+354' },
  { iso: 'LU', dial: '+352' },
  { iso: 'MC', dial: '+377' },
  { iso: 'AD', dial: '+376' },
  { iso: 'SM', dial: '+378' },
  { iso: 'LI', dial: '+423' },
  { iso: 'EE', dial: '+372' },
  { iso: 'LV', dial: '+371' },
  { iso: 'LT', dial: '+370' },
];

export function findCountry(iso: string): Country | undefined {
  return COUNTRIES.find((country) => country.iso === iso);
}

/**
 * Regional indicator emoji for a two-letter ISO country code, e.g. "EG" -> "🇪🇬".
 * Uses the standard Unicode flag formula: 127462 + (A..Z offset), not a custom
 * offset that can drift across regions or produce mismatched output.
 */
export function flagEmoji(iso: string): string {
  const normalized = iso?.trim().toUpperCase();
  if (!normalized || !/^[A-Z]{2}$/.test(normalized)) {
    return '';
  }

  const regionalIndicatorOffset = 0x1f1e6 - 'A'.charCodeAt(0);
  return String.fromCodePoint(
    ...[...normalized].map((character) => character.charCodeAt(0) + regionalIndicatorOffset)
  );
}

/** Digits only, and for Egypt the leading 0 is dropped (0100… → 100…). */
export function normalizeNationalNumber(iso: string, value: string): string {
  const digits = value.replace(/\D/g, '');
  return iso === 'EG' ? digits.replace(/^0+/, '') : digits;
}

export function isValidNationalNumber(iso: string, value: string): boolean {
  const digits = value.replace(/\D/g, '');
  const allowed = NATIONAL_NUMBER_LENGTHS[iso];
  if (allowed) return allowed.includes(digits.length);
  return digits.length >= DEFAULT_NATIONAL_LENGTH.min && digits.length <= DEFAULT_NATIONAL_LENGTH.max;
}
