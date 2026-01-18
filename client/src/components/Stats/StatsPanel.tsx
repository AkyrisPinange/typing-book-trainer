import { useTypingStore } from '@/store/useTypingStore';
import { Card, CardContent } from '../ui/Card';

export default function StatsPanel() {
  const { text, positionIndex, stats } = useTypingStore();

  const progress = text.length > 0 ? (positionIndex / text.length) * 100 : 0;

  return (
    <Card>
      <CardContent className="p-3">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 items-center">
          {/* Progress */}
          <div className="col-span-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">Progress</span>
              <span className="text-xs font-semibold">{progress.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-1.5">
              <div
                className="bg-primary h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {positionIndex.toLocaleString()} / {text.length.toLocaleString()}
            </div>
          </div>

          {/* Statistics */}
          <div>
            <div className="text-xs text-muted-foreground">WPM</div>
            <div className="text-lg font-bold">{stats.wpm}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Accuracy</div>
            <div className="text-lg font-bold">{stats.accuracy}%</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Typed</div>
            <div className="text-lg font-bold">{stats.totalTyped.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Errors</div>
            <div className="text-lg font-bold text-destructive">{stats.totalErrors.toLocaleString()}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

