export interface KeyInfo {
  key: string;
  needsShift: boolean;
  display: string;
}

const SHIFT_CHARS: Record<string, string> = {
  '!': '1',
  '@': '2',
  '#': '3',
  '$': '4',
  '%': '5',
  '^': '6',
  '&': '7',
  '*': '8',
  '(': '9',
  ')': '0',
  '_': '-',
  '+': '=',
  '{': '[',
  '}': ']',
  '|': '\\',
  ':': ';',
  '"': "'",
  '<': ',',
  '>': '.',
  '?': '/',
};

const UPPER_CASE = /[A-Z]/;

export function getKeyInfo(char: string): KeyInfo {
  // Handle newline
  if (char === '\n') {
    return { key: 'Enter', needsShift: false, display: 'Enter' };
  }

  // Handle space
  if (char === ' ') {
    return { key: ' ', needsShift: false, display: 'Space' };
  }

  // Handle uppercase letters
  if (UPPER_CASE.test(char)) {
    return { key: char.toLowerCase(), needsShift: true, display: char };
  }

  // Handle shift characters
  if (SHIFT_CHARS[char]) {
    return { key: SHIFT_CHARS[char], needsShift: true, display: char };
  }

  // Regular character
  return { key: char, needsShift: false, display: char };
}

export function getKeyDisplay(keyInfo: KeyInfo): string {
  if (keyInfo.needsShift) {
    return `Shift + ${keyInfo.display}`;
  }
  return keyInfo.display;
}

