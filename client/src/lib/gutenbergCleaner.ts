export interface CleanedBook {
  text: string;
  title?: string;
  author?: string;
}

export function cleanGutenbergText(rawText: string): CleanedBook {
  let text = rawText;

  // Normalize line endings
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Normalize tabs
  text = text.replace(/\t/g, '  ');

  // Find start marker
  const startMarker = /^\*\*\* START OF (?:THIS|THE) PROJECT GUTENBERG EBOOK .+ \*\*\*/m;
  const startMatch = text.match(startMarker);
  const startIndex = startMatch ? startMatch.index! + startMatch[0].length : 0;

  // Find end marker
  const endMarker = /^\*\*\* END OF (?:THIS|THE) PROJECT GUTENBERG EBOOK .+ \*\*\*/m;
  const endMatch = text.match(endMarker);
  const endIndex = endMatch ? endMatch.index! : text.length;

  // Extract content between markers
  text = text.substring(startIndex, endIndex).trim();

  // Fallback: if no markers found, try to remove common Gutenberg boilerplate
  if (!startMatch || !endMatch) {
    // Remove common license/legal text at the end
    text = text.replace(/\n\n\s*End of (?:the )?Project Gutenberg.*$/is, '');
    text = text.replace(/\n\n\s*End of this Project Gutenberg.*$/is, '');
    
    // Remove common header patterns
    text = text.replace(/^.*?Project Gutenberg.*?\n\n/ims, '');
  }

  // Extract metadata heuristics
  let title: string | undefined;
  let author: string | undefined;

  const lines = text.split('\n').slice(0, 20);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Look for title patterns
    if (!title && line.length > 10 && line.length < 100 && /^[A-Z]/.test(line)) {
      if (!line.includes('Project Gutenberg') && !line.includes('Copyright')) {
        title = line;
      }
    }
    
    // Look for author patterns
    if (!author && (line.includes('by ') || line.match(/^[A-Z][a-z]+ [A-Z][a-z]+$/))) {
      author = line.replace(/^by\s+/i, '');
    }
  }

  return {
    text: text.trim(),
    title,
    author,
  };
}

export async function generateBookId(text: string, title?: string): Promise<string> {
  const data = title ? `${title}:${text}` : text;
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex.substring(0, 32); // Use first 32 chars as bookId
}

