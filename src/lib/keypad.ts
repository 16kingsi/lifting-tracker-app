export type PadKey = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '.' | 'back';

interface PadOptions {
  allowDecimal: boolean;
  // True until the first key is pressed in a field, so typing replaces the
  // pre-filled number instead of adding to the end of it.
  fresh: boolean;
}

const MAX_LENGTH = 6;
const MAX_DECIMALS = 2;

// Works out a field's new text after a key on the number pad is pressed.
export function applyPadKey(text: string, key: PadKey, { allowDecimal, fresh }: PadOptions): string {
  if (key === 'back') return text.slice(0, -1);

  const current = fresh ? '' : text;

  if (key === '.') {
    if (!allowDecimal || current.includes('.')) return current;
    return current === '' ? '0.' : `${current}.`;
  }

  if (current === '0') return key; // "0" then "5" is "5", not "05"
  if (current.length >= MAX_LENGTH) return current;

  const decimals = current.split('.')[1];
  if (decimals !== undefined && decimals.length >= MAX_DECIMALS) return current;

  return current + key;
}

// An empty field, or one left as "0.", counts as a plain number.
export function parsePadText(text: string): number {
  return Number(text) || 0;
}
