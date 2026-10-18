/**
 * Removes personal data from any text before it is sent to the LLM.
 * Detected items are replaced with neutral placeholders so the sentence stays readable.
 */

export const PLACEHOLDERS = {
  email: '[EMAIL]',
  phone: '[TELEPHONE]',
  plate: '[PLAQUE]',
  address: '[ADRESSE]',
  name: '[NOM]',
} as const;

export type PiiKind = keyof typeof PLACEHOLDERS;

export interface AnonymizeOptions {
  /** Names of known users (current user, provider owners...) to mask. */
  knownNames?: string[];
}

export interface AnonymizeResult {
  text: string;
  counts: Record<PiiKind, number>;
}

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;

// Tunisian plates: "123 TU 4567", "123TU4567", "123-TN-4567", "123 تونس 4567", "RS 123456" (régime suspendu)
const PLATE_RE = /(?<!\d)\d{1,3}\s*-?\s*(?:TUN|TU|TN|تونس)\s*-?\s*\d{1,4}(?!\d)|\bRS\s*-?\s*\d{3,6}(?!\d)/giu;

// Tunisian phone numbers: optional +216 / 00216 prefix, then 8 digits starting with 2-9,
// in any grouping ("98 765 432", "98.765.432", "+216 25 123 456", "71123456").
const PHONE_RE = /(?<![\d+])(?:(?:\+|00)\s?216[\s.-]?)?[2-9]\d(?:[\s.-]?\d){6}(?!\d)/g;

// Street-level addresses ("12 rue de Marseille", "Avenue Habib Bourguiba", "Cité El Ghazela").
// The keyword must be followed by a capitalised word or a number, to avoid matching
// sentences such as "sur la rue" without a name.
const ADDRESS_RE =
  /(?:\b\d{1,4}\s*,?\s*)?(?:[Rr]ue|[Aa]venue|[Aa]v\.|[Bb]oulevard|[Ii]mpasse|[Cc]ité|[Rr]ésidence|[Ii]mmeuble)\s+(?:(?:de|du|des|d['’]|el|ibn)\s*)?[A-ZÀ-Ý0-9][^,.;\n]{0,40}/gu;

// Name particles that are too common to be masked on their own.
const NAME_PARTICLES = new Set(['ben', 'bin', 'ibn', 'bel', 'el', 'al', 'abd', 'de', 'du', 'la', 'le']);

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Builds the list of name variants to mask: full names first, then each part (>= 3 letters). */
function nameVariants(names: string[]): string[] {
  const variants = new Set<string>();
  for (const raw of names) {
    const name = raw.trim();
    if (name.length < 3) continue;
    variants.add(name);
    for (const part of name.split(/\s+/)) {
      if (part.length >= 3 && !NAME_PARTICLES.has(part.toLowerCase())) variants.add(part);
    }
  }
  return [...variants].sort((a, b) => b.length - a.length);
}

function replaceCounting(text: string, re: RegExp, placeholder: string): [string, number] {
  let count = 0;
  const out = text.replace(re, () => {
    count++;
    return placeholder;
  });
  return [out, count];
}

/** Anonymizes a text and reports how many items of each kind were masked. */
export function anonymize(input: string, options: AnonymizeOptions = {}): AnonymizeResult {
  const counts: Record<PiiKind, number> = { email: 0, phone: 0, plate: 0, address: 0, name: 0 };
  let text = input;
  let n: number;

  // Order matters: emails and plates contain digits that could look like phone numbers.
  [text, n] = replaceCounting(text, EMAIL_RE, PLACEHOLDERS.email);
  counts.email = n;
  [text, n] = replaceCounting(text, PLATE_RE, PLACEHOLDERS.plate);
  counts.plate = n;
  [text, n] = replaceCounting(text, PHONE_RE, PLACEHOLDERS.phone);
  counts.phone = n;
  [text, n] = replaceCounting(text, ADDRESS_RE, PLACEHOLDERS.address);
  counts.address = n;

  for (const variant of nameVariants(options.knownNames ?? [])) {
    const re = new RegExp(`(?<!\\p{L})${escapeRegExp(variant)}(?!\\p{L})`, 'giu');
    [text, n] = replaceCounting(text, re, PLACEHOLDERS.name);
    counts.name += n;
  }

  return { text, counts };
}

/** Shortcut returning only the anonymized text. */
export function anonymizeText(input: string, options: AnonymizeOptions = {}): string {
  return anonymize(input, options).text;
}
