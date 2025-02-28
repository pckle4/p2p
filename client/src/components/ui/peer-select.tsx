import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Signal, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PeerSelectProps {
  peers: {
    id: string;
    username: string;
    status: string;
    networkQuality: string;
    latency: number;
  }[];
  selectedPeers: string[];
  onPeerSelect: (peerId: string) => void;
  onSelectAll: () => void;
}

export function PeerSelect({ peers, selectedPeers, onPeerSelect, onSelectAll }: PeerSelectProps) {
  const connectedPeers = peers.filter(p => p.status === 'connected');

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 p-2 rounded-lg bg-indigo-50">
        <Checkbox
          id="select-all"
          checked={selectedPeers.length === connectedPeers.length}
          onCheckedChange={onSelectAll}
        />
        <label htmlFor="select-all" className="text-sm font-medium text-indigo-700 flex items-center gap-2">
          <Users className="h-4 w-4" />
          Select All Peers ({connectedPeers.length})
        </label>
      </div>
      
      <div className="space-y-2">
        {connectedPeers.map((peer) => (
          <div 
            key={peer.id}
            className={cn(
              "flex items-center gap-2 p-2 rounded-lg transition-colors",
              selectedPeers.includes(peer.id) ? "bg-indigo-50" : "hover:bg-gray-50"
            )}
          >
            <Checkbox
              id={peer.id}
              checked={selectedPeers.includes(peer.id)}
              onCheckedChange={() => onPeerSelect(peer.id)}
            />
            <label htmlFor={peer.id} className="flex-1 flex items-center justify-between cursor-pointer">
              <span className="text-sm font-medium">
                {peer.username}
              </span>
              <div className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-full text-xs",
                peer.networkQuality === 'excellent' ? "bg-green-100 text-green-700" :
                peer.networkQuality === 'good' ? "bg-yellow-100 text-yellow-700" :
                "bg-red-100 text-red-700"
              )}>
                <Signal className="h-3 w-3" />
                <span>{peer.latency}ms</span>
              </div>
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}
