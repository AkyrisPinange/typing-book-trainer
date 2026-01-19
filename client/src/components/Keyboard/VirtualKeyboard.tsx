import { useMemo } from 'react';
import { getKeyInfo, getKeyDisplay } from '@/lib/keyMapping';
import { useTypingStore } from '@/store/useTypingStore';
import { cn } from '@/lib/utils';

const KEYBOARD_LAYOUT = [
  ['`', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '='],
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '[', ']', '\\'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', "'"],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/'],
];

export default function VirtualKeyboard() {
  const { text, positionIndex } = useTypingStore();

  const nextKeyInfo = useMemo(() => {
    if (positionIndex >= text.length) return null;
    return getKeyInfo(text[positionIndex], text, positionIndex);
  }, [text, positionIndex]);

  const highlightedKey = nextKeyInfo?.key.toLowerCase();
  const needsShift = nextKeyInfo?.needsShift || false;
  const needsCapsLock = nextKeyInfo?.needsCapsLock || false;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex flex-col gap-2 w-full">
        {nextKeyInfo && (
          <div className="text-sm font-semibold text-muted-foreground text-center mb-1">
            Next: {getKeyDisplay(nextKeyInfo)}
          </div>
        )}
        {/* Shift/Caps Lock indicator */}
        {(needsShift || needsCapsLock) && (
          <div className="flex justify-center mb-1">
            <div className={cn(
              'px-4 py-2 rounded-md font-semibold text-sm',
              'bg-primary text-primary-foreground',
              'border-2 border-primary-foreground'
            )}>
              {needsCapsLock ? 'Caps Lock' : 'Shift'}
            </div>
          </div>
        )}

        {/* Main keyboard */}
        <div className="flex flex-col gap-1.5 p-3 bg-muted rounded-lg">
          {KEYBOARD_LAYOUT.map((row, rowIndex) => (
            <div key={rowIndex} className="flex justify-center gap-1.5">
              {row.map((key) => {
                const isHighlighted = key.toLowerCase() === highlightedKey;
                return (
                  <div
                    key={key}
                    className={cn(
                      'min-w-[2.5rem] h-10 flex items-center justify-center',
                      'rounded-md font-semibold text-sm',
                      'border-2 transition-all',
                      isHighlighted
                        ? 'bg-primary text-primary-foreground border-primary-foreground scale-110'
                        : 'bg-background border-border text-foreground'
                    )}
                  >
                    {key}
                  </div>
                );
              })}
            </div>
          ))}

          {/* Bottom row with Caps Lock, Space and special keys */}
          <div className="flex justify-center gap-1.5 mt-2">
            <div
              className={cn(
                'min-w-[5rem] h-10 flex items-center justify-center',
                'rounded-md font-semibold text-sm',
                'border-2 transition-all',
                needsCapsLock
                  ? 'bg-primary text-primary-foreground border-primary-foreground scale-110'
                  : 'bg-background border-border text-foreground'
              )}
            >
              Caps Lock
            </div>
            <div
              className={cn(
                'min-w-[12rem] h-10 flex items-center justify-center',
                'rounded-md font-semibold text-sm',
                'border-2 transition-all',
                highlightedKey === ' '
                  ? 'bg-primary text-primary-foreground border-primary-foreground scale-110'
                  : 'bg-background border-border text-foreground'
              )}
            >
              Space
            </div>
            <div
              className={cn(
                'min-w-[5rem] h-10 flex items-center justify-center',
                'rounded-md font-semibold text-sm',
                'border-2 transition-all',
                'bg-background border-border text-foreground'
              )}
            >
              Backspace
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

