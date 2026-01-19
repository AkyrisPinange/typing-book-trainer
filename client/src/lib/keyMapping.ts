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
// IMPORTANT: This should NOT skip spaces - spaces need to be typed!
function findNextChar(text: string, position: number): { char: string; position: number } | null {
  const next10CharsReadable = text.substring(position, position + 10).split('').map((c, i) => 
    `${position + i}:${c === '\n' ? '\\n' : c === ' ' ? '[SPACE]' : c}(${c.charCodeAt(0)})`
  ).join(' ');
  console.log('[DEBUG] findNextChar - Start:', { 
    position, 
    charAtPosition: text[position] === '\n' ? '\\n' : text[position] === ' ' ? '[SPACE]' : text[position],
    next10CharsReadable
  });
  for (let i = position; i < text.length; i++) {
    const char = text[i];
    console.log('[DEBUG] findNextChar - Checking index:', i, 'char:', char === '\n' ? '\\n' : char === ' ' ? '[SPACE]' : char, 'charCode:', char.charCodeAt(0));
    // Only skip newlines, NOT spaces - spaces must be typed!
    if (char !== '\n') {
      console.log('[DEBUG] findNextChar - Found:', { char: char === ' ' ? '[SPACE]' : char, position: i });
      return { char: text[i], position: i };
    }
  }
  console.log('[DEBUG] findNextChar - No non-newline found');
  return null;
}

// Check if newline is followed by a letter (needs implicit space)
function needsImplicitSpace(text: string, position: number): boolean {
  const next = findNextChar(text, position);
  if (!next) return false;
  // If next char is a letter (a-z, A-Z), we need an implicit space
  return /[a-zA-Z]/.test(next.char);
}

export function getKeyInfo(char: string, text?: string, position?: number): KeyInfo {
  console.log('[DEBUG] getKeyInfo - Called with:', {
    char: char === '\n' ? '\\n' : char === ' ' ? '[SPACE]' : char,
    charCode: char.charCodeAt(0),
    hasText: !!text,
    position
  });

  // Handle newlines: if followed by a letter, treat as space; otherwise skip
  if (char === '\n' && text && position !== undefined) {
    console.log('[DEBUG] getKeyInfo - Char is newline, checking if needs implicit space');
    if (needsImplicitSpace(text, position)) {
      console.log('[DEBUG] getKeyInfo - Newline followed by letter, treating as space');
      // Treat newline as space when followed by a letter
      return { key: ' ', needsShift: false, needsCapsLock: false, display: 'Space' };
    } else {
      // Skip newline and find next character (for cases like multiple newlines or end of text)
      console.log('[DEBUG] getKeyInfo - Newline not followed by letter, skipping');
      const next = findNextChar(text, position);
      if (next) {
        console.log('[DEBUG] getKeyInfo - Next char found, recursing:', {
          char: next.char === ' ' ? '[SPACE]' : next.char,
          position: next.position
        });
        return getKeyInfo(next.char, text, next.position);
      }
      // If no next character found, return a placeholder
      console.log('[DEBUG] getKeyInfo - No next char found, returning Enter placeholder');
      return { key: 'Enter', needsShift: false, needsCapsLock: false, display: 'Enter' };
    }
  }

  // Handle space
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

