import { useEffect, useRef } from 'react';
import { useTypingStore } from '@/store/useTypingStore';
import { cn } from '@/lib/utils';

const WINDOW_SIZE = 400;
const CURSOR_OFFSET = 200;

interface TextReaderProps {
  fontSize?: number;
}

export default function TextReader({ fontSize = 1 }: TextReaderProps) {
  const { text, positionIndex, typedChars } = useTypingStore();
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate window bounds
  const startIndex = Math.max(0, positionIndex - CURSOR_OFFSET);
  const endIndex = Math.min(text.length, startIndex + WINDOW_SIZE);
  const visibleText = text.substring(startIndex, endIndex);

  // Scroll to cursor
  useEffect(() => {
    if (containerRef.current) {
      const cursorElement = containerRef.current.querySelector(`[data-index="${positionIndex}"]`);
      if (cursorElement) {
        cursorElement.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
      }
    }
  }, [positionIndex]);

  const renderChar = (char: string, index: number) => {
    const globalIndex = startIndex + index;
    const status = typedChars.get(globalIndex);
    const isCurrent = globalIndex === positionIndex;
    const isPast = globalIndex < positionIndex;

    // Handle newline character - show ↵ and break line
    if (char === '\n') {
      return (
        <span key={globalIndex} data-index={globalIndex}>
          <span
            className={cn(
              'inline-block mx-1',
              {
                'text-green-600 dark:text-green-400': status === 'correct',
                'text-red-600 dark:text-red-400': status === 'incorrect',
                'text-primary border-2 border-primary animate-pulse': isCurrent,
                'text-muted-foreground': !isPast && !isCurrent,
              }
            )}
          >
            ↵
          </span>
          <br />
        </span>
      );
    }

    // Handle space character
    if (char === ' ') {
      return (
        <span
          key={globalIndex}
          data-index={globalIndex}
          className={cn(
            'inline-block',
            {
              'text-green-600 dark:text-green-400': status === 'correct',
              'text-red-600 dark:text-red-400': status === 'incorrect',
              'border-b-2 border-primary animate-pulse': isCurrent,
              'text-muted-foreground': !isPast && !isCurrent,
            }
          )}
        >
          {'\u00A0'}
        </span>
      );
    }

    // Regular character
    return (
      <span
        key={globalIndex}
        data-index={globalIndex}
        className={cn(
          'inline-block',
          {
            'text-green-600 dark:text-green-400': status === 'correct',
            'text-red-600 dark:text-red-400': status === 'incorrect',
            'border-b-2 border-primary animate-pulse': isCurrent,
            'text-muted-foreground': !isPast && !isCurrent,
          }
        )}
      >
        {char}
      </span>
    );
  };

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-auto p-2 bg-card rounded-lg border"
      style={{ 
        fontFamily: 'monospace', 
        fontSize: `${fontSize}rem`, 
        lineHeight: '1.5' 
      }}
    >
      {visibleText.split('').map((char, index) => renderChar(char, index))}
    </div>
  );
}

