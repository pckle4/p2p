import React from 'react';
import { Wifi, WifiOff } from 'lucide-react';

interface ConnectionStatusProps {
  status: string;
}

export function ConnectionStatus({ status }: ConnectionStatusProps) {
  const isConnected = status.includes('Connected');
  const isError = status.includes('Error');

  return (
    <div className="flex items-center gap-2">
      {isConnected ? (
        <Wifi className="h-4 w-4 text-green-500" />
      ) : (
        <WifiOff className="h-4 w-4 text-gray-400" />
      )}
      <span className={`text-sm ${
        isConnected ? 'text-green-600' :
        isError ? 'text-red-600' :
        'text-gray-600'
      }`}>
        {status}
      </span>
    </div>
  );
}
