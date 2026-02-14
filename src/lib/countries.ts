export const COUNTRIES = {
  US: {
    code: 'US' as const,
    name: 'United States',
    flag: '🇺🇸',
    currency: 'USD',
    currencySymbol: '$',
    dateFormat: 'MM/DD/YYYY',
    phoneCode: '+1',
    regulatory: {
      label: 'State License',
      example: 'RN - California #123456',
      body: 'State Board of Nursing',
    },
    terminology: { er: 'ER', icu: 'ICU', or: 'OR' },
    subdivisions: [
      'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
      'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
      'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
      'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
      'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY',
    ],
    subdivisionLabel: 'State',
  },
  GB: {
    code: 'GB' as const,
    name: 'United Kingdom',
    flag: '🇬🇧',
    currency: 'GBP',
    currencySymbol: '£',
    dateFormat: 'DD/MM/YYYY',
    phoneCode: '+44',
    regulatory: {
      label: 'NMC PIN',
      example: 'NMC PIN: 12A3456B',
      body: 'Nursing and Midwifery Council',
    },
    terminology: { er: 'A&E', icu: 'ITU', or: 'Theatre' },
    subdivisions: ['Band 5', 'Band 6', 'Band 7', 'Band 8a', 'Band 8b', 'Band 8c', 'Band 8d', 'Band 9'],
    subdivisionLabel: 'NHS Band',
  },
  CA: {
    code: 'CA' as const,
    name: 'Canada',
    flag: '🇨🇦',
    currency: 'CAD',
    currencySymbol: 'C$',
    dateFormat: 'MM/DD/YYYY',
    phoneCode: '+1',
    regulatory: {
      label: 'Provincial License',
      example: 'RN - Ontario (CNO #12345)',
      body: 'Provincial Nursing College',
    },
    terminology: { er: 'ER', icu: 'ICU', or: 'OR' },
    subdivisions: [
      'ON', 'BC', 'AB', 'QC', 'MB', 'SK', 'NS', 'NB', 'NL', 'PE', 'NT', 'YT', 'NU',
    ],
    subdivisionLabel: 'Province',
  },
  AU: {
    code: 'AU' as const,
    name: 'Australia',
    flag: '🇦🇺',
    currency: 'AUD',
    currencySymbol: 'A$',
    dateFormat: 'DD/MM/YYYY',
    phoneCode: '+61',
    regulatory: {
      label: 'AHPRA Registration',
      example: 'AHPRA: NMW1234567',
      body: 'Australian Health Practitioner Regulation Agency',
    },
    terminology: { er: 'ED', icu: 'ICU', or: 'Theatre' },
    subdivisions: ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'],
    subdivisionLabel: 'State/Territory',
  },
  AE: {
    code: 'AE' as const,
    name: 'United Arab Emirates',
    flag: '🇦🇪',
    currency: 'AED',
    currencySymbol: 'AED ',
    dateFormat: 'DD/MM/YYYY',
    phoneCode: '+971',
    regulatory: {
      label: 'DHA/DOH License',
      example: 'DHA License: 123456',
      body: 'Dubai Health Authority',
    },
    terminology: { er: 'ER', icu: 'ICU', or: 'OT' },
    subdivisions: ['Dubai (DHA)', 'Abu Dhabi (DOH)', 'Sharjah (MOH)', 'Ajman', 'Fujairah', 'Ras Al Khaimah', 'Umm Al Quwain'],
    subdivisionLabel: 'Emirate',
  },
} as const;

export type CountryCode = keyof typeof COUNTRIES;

export function getCurrencySymbol(countryCode: string): string {
  return COUNTRIES[countryCode as CountryCode]?.currencySymbol || '$';
}

export function getLicenseLabel(countryCode: string): string {
  return COUNTRIES[countryCode as CountryCode]?.regulatory.label || 'License';
}

export function getTerminology(countryCode: string): { er: string; icu: string; or: string } {
  return COUNTRIES[countryCode as CountryCode]?.terminology || COUNTRIES.US.terminology;
}

export function getCountryFlag(countryCode: string): string {
  return COUNTRIES[countryCode as CountryCode]?.flag || '';
}
