/**
 * Mini-projet rule: "jamais de données personnelles brutes envoyées telles
 * quelles au LLM". Everything that goes to OpenRouter passes through here.
 */
export function redactPII(text: string, maxLength = 500): string {
  return text
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[email]')
    .replace(/https?:\/\/\S+/gi, '[lien]')
    .replace(/\b\d{1,4}\s?(?:TUN|تونس)\s?\d{1,4}\b/gi, '[immatriculation]')
    .replace(/(?:\+|00)?\d[\d\s.-]{6,}\d/g, '[téléphone]')
    // prevent a user text from closing our <avis>/<message> delimiters
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}
