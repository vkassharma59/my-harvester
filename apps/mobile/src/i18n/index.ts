import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { en } from './locales/en';
import { hi } from './locales/hi';
import { pa } from './locales/pa';
import { part as authDashboard } from './parts/authDashboard';
import { part as customers } from './parts/customers';
import { part as expenses } from './parts/expenses';
import { part as harvests } from './parts/harvests';
import { part as labourHarvesters } from './parts/labourHarvesters';
import { part as adminsMore } from './parts/adminsMore';
import { part as agents } from './parts/agents';
import { part as attachment } from './parts/attachment';
import { part as attendance } from './parts/attendance';
import { part as fuelPumps } from './parts/fuelPumps';
import { part as offline } from './parts/offline';
import { part as subscription } from './parts/subscription';

// Each part contributes its own distinct top-level namespaces, so a shallow
// merge per language is sufficient (no namespace collisions across parts).
const PARTS = [authDashboard, customers, expenses, harvests, labourHarvesters, adminsMore, agents, fuelPumps, attendance, offline, attachment, subscription];
const bundle = (core: object, pick: (p: (typeof PARTS)[number]) => object) =>
  Object.assign({}, core, ...PARTS.map(pick));

export const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिंदी' },
  { code: 'pa', label: 'ਪੰਜਾਬੀ' },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]['code'];

const STORAGE_KEY = 'app.language';

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: bundle(en, (p) => p.en) },
    hi: { translation: bundle(hi, (p) => p.hi) },
    pa: { translation: bundle(pa, (p) => p.pa) },
  },
  lng: 'en',
  fallbackLng: 'en',
  // Hermes has no Intl.PluralRules; v3 uses i18next's built-in plural rules and
  // avoids the runtime probe (we don't use plural keys, so this is purely to
  // silence the startup warning).
  compatibilityJSON: 'v3',
  interpolation: { escapeValue: false },
  returnNull: false,
});

const SUPPORTED = new Set<string>(LANGUAGES.map((l) => l.code));

/**
 * The first device-preferred language we support (e.g. phone set to Hindi →
 * 'hi'), or null if none match. Used only on first launch.
 */
function deviceLanguage(): LanguageCode | null {
  try {
    for (const loc of getLocales()) {
      const code = loc.languageCode;
      if (code && SUPPORTED.has(code)) return code as LanguageCode;
    }
  } catch {
    // getLocales can throw on some platforms — fall through to default
  }
  return null;
}

/**
 * Apply the language at app startup. An explicit choice saved in Settings always
 * wins; otherwise (first launch) follow the device language if we support it,
 * else fall back to English. The auto-detected value is NOT persisted, so the
 * app keeps following the device until the user picks a language in Settings.
 */
export async function loadStoredLanguage(): Promise<void> {
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEY);
    const target = saved ?? deviceLanguage();
    if (target && target !== i18n.language) await i18n.changeLanguage(target);
  } catch {
    // ignore — keep the default language
  }
}

/** Change the active language and persist the choice. */
export async function setLanguage(code: LanguageCode): Promise<void> {
  await i18n.changeLanguage(code);
  try {
    await AsyncStorage.setItem(STORAGE_KEY, code);
  } catch {
    // ignore persistence errors — the in-memory change still applies
  }
}

/**
 * Translate an enum value (e.g. ExpenseType.DIESEL) via `enums.<group>.<VALUE>`,
 * falling back to the raw key humanised if a translation is missing.
 */
export function tEnum(group: string, value: string): string {
  return i18n.t(`enums.${group}.${value}`, {
    defaultValue: value
      .toLowerCase()
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' '),
  });
}

export default i18n;
