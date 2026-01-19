export interface KeyInfo {
  key: string;
  needsShift: boolean;
  needsCapsLock: boolean;
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

export const UPPER_CASE = /[A-Z]/;

// Check if we should use Caps Lock (3+ consecutive uppercase letters)
function shouldUseCapsLock(text: string, position: number): boolean {
  if (position >= text.length) return false;
  
  // Check next 3 characters
  let upperCount = 0;
  for (let i = position; i < Math.min(position + 3, text.length); i++) {
    if (UPPER_CASE.test(text[i])) {
      upperCount++;
    } else {
      break;
    }
  }
  
  return upperCount >= 3;
}

// Helper function to find the next non-newline character
function findNextChar(text: string, position: number): { char: string; position: number } | null {
  for (let i = position; i < text.length; i++) {
    if (text[i] !== '\n') {
      return { char: text[i], position: i };
    }
  }
  return null;
}

export function getKeyInfo(char: string, text?: string, position?: number): KeyInfo {
  // Skip newlines - find the next actual character to type
  // This is used for the virtual keyboard display to show what key to press next
  if (char === '\n' && text && position !== undefined) {
    const next = findNextChar(text, position);
    if (next) {
      // Recursively get info for the next non-newline character
      // This will correctly show space if next char is space, or letter if next char is letter
      return getKeyInfo(next.char, text, next.position);
    }
    // If no next character found, return a placeholder
    return { key: 'Enter', needsShift: false, needsCapsLock: false, display: 'Enter' };
  }

  // Handle space - spaces must be typed, they are not auto-advanced
  if (char === ' ') {
    return { key: ' ', needsShift: false, needsCapsLock: false, display: 'Space' };
  }

  // Handle uppercase letters
  if (UPPER_CASE.test(char)) {
    const useCapsLock = text && position !== undefined ? shouldUseCapsLock(text, position) : false;
    return { 
      key: char.toLowerCase(), 
      needsShift: !useCapsLock, 
      needsCapsLock: useCapsLock,
      display: char 
    };
  }

  // Handle shift characters
  if (SHIFT_CHARS[char]) {
    return { key: SHIFT_CHARS[char], needsShift: true, needsCapsLock: false, display: char };
  }

  // Regular character
  return { key: char, needsShift: false, needsCapsLock: false, display: char };
}

export function getKeyDisplay(keyInfo: KeyInfo): string {
  if (keyInfo.needsCapsLock) {
    return `Caps Lock + ${keyInfo.display}`;
  }
  if (keyInfo.needsShift) {
    return `Shift + ${keyInfo.display}`;
  }
  return keyInfo.display;
}

