import React from 'react';
import { Progress } from './progress';
import { Clock, Zap, CheckCircle, Loader } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TransferProgressProps {
  progress: number;
  speed?: string;
  timeElapsed?: string;
  status?: 'idle' | 'transferring' | 'complete' | 'error';
  className?: string;
}

export function TransferProgress({
  progress,
  speed = '0 KB/s',
  timeElapsed = '0s',
  status = 'idle',
  className
}: TransferProgressProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="relative">
        <Progress 
          value={progress} 
          className={cn(
            "h-2 transition-all duration-300",
            status === 'error' ? "bg-red-100" : "bg-blue-100"
          )}
        >
          <div 
            className={cn(
              "absolute inset-0 h-full rounded-full transition-all duration-300",
              status === 'transferring' && "animate-progress-pulse",
              status === 'complete' ? "bg-green-500" : 
              status === 'error' ? "bg-red-500" : 
              "bg-blue-500"
            )}
            style={{ width: `${progress}%` }}
          />
        </Progress>
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center gap-2">
          {status === 'transferring' ? (
            <Loader className="h-3 w-3 animate-spin" />
          ) : status === 'complete' ? (
            <CheckCircle className="h-3 w-3 text-green-500" />
          ) : null}
          <span>{progress}%</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{timeElapsed}</span>
          </div>
          <div className="flex items-center gap-1">
            <Zap className="h-3 w-3" />
            <span>{speed}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
