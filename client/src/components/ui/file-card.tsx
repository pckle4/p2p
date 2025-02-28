import React, { useState } from 'react';
import { 
  FileText, Trash2, Send, Download,
  Film, Image, Music, Archive, File,
  Info, ChevronDown, ChevronUp
} from 'lucide-react';
import { Button } from './button';
import { Progress } from './progress';
import { formatFileSize } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface FileMetadata {
  from?: string;
  extension?: string;
  type?: string;
}

interface FileCardProps {
  file: File;
  onRemove?: () => void;
  onSend?: (selectedPeers: string[]) => void;
  downloadUrl?: string;
  progress?: number;
  speed?: string;
  metadata?: FileMetadata;
  peers?: Array<{
    id: string;
    username: string;
    status: string;
    networkQuality: string;
    latency: number;
  }>;
}

export function FileCard({ 
  file, 
  onRemove, 
  onSend,
  downloadUrl,
  progress = 0,
  speed,
  metadata,
  peers = []
}: FileCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedPeers, setSelectedPeers] = useState<string[]>([]);

  const getFileIcon = () => {
    const type = file.type.split('/')[0];
    switch (type) {
      case 'video':
        return <Film className="h-8 w-8 text-purple-500" />;
      case 'image':
        return <Image className="h-8 w-8 text-blue-500" />;
      case 'audio':
        return <Music className="h-8 w-8 text-green-500" />;
      case 'application':
        return <Archive className="h-8 w-8 text-orange-500" />;
      default:
        return <File className="h-8 w-8 text-gray-500" />;
    }
  };

  const getFileExtension = () => {
    return metadata?.extension || file.name.split('.').pop() || '';
  };

  const handlePeerSelect = (peerId: string) => {
    setSelectedPeers(prev =>
      prev.includes(peerId)
        ? prev.filter(id => id !== peerId)
        : [...prev, peerId]
    );
  };

  const handleSelectAllPeers = () => {
    const connectedPeerIds = peers
      .filter(p => p.status === 'connected')
      .map(p => p.id);

    setSelectedPeers(prev =>
      prev.length === connectedPeerIds.length ? [] : connectedPeerIds
    );
  };

  const handleDownload = () => {
    if (downloadUrl) {
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="p-3 bg-white rounded-lg border shadow-sm hover:shadow-md transition-all duration-300">
      <div className="flex items-center gap-3">
        {getFileIcon()}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium truncate">{file.name}</p>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <Info className="h-4 w-4 text-gray-400" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-xs space-y-1">
                    <p>Size: {formatFileSize(file.size)}</p>
                    <p>Type: {file.type || 'Unknown'}</p>
                    <p>Extension: {getFileExtension()}</p>
                    {metadata?.from && <p>From: {metadata.from}</p>}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>{formatFileSize(file.size)}</span>
            <span>•</span>
            <span>{getFileExtension().toUpperCase()}</span>
            {metadata?.from && (
              <>
                <span>•</span>
                <span>From: {metadata.from}</span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onSend && !isExpanded && peers.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsExpanded(true)}
              className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200 hover:border-indigo-300 transition-colors gap-2"
            >
              <Send className="h-4 w-4" />
              <span className="hidden sm:inline">Send</span>
              <ChevronDown className="h-4 w-4 ml-1" />
            </Button>
          )}
          {downloadUrl && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleDownload}
              className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200 hover:border-green-300 transition-colors gap-2"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Download</span>
            </Button>
          )}
          {onRemove && (
            <Button
              size="sm"
              variant="outline"
              onClick={onRemove}
              className="hover:bg-red-50 hover:text-red-600"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {isExpanded && onSend && peers.length > 0 && (
        <div className="mt-4 border-t pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Select Peers</h4>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsExpanded(false)}
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="select-all"
                checked={selectedPeers.length === peers.filter(p => p.status === 'connected').length}
                onCheckedChange={handleSelectAllPeers}
              />
              <label
                htmlFor="select-all"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Select All
              </label>
            </div>
            {peers.map((peer) => (
              <div key={peer.id} className="flex items-center space-x-2">
                <Checkbox
                  id={peer.id}
                  checked={selectedPeers.includes(peer.id)}
                  onCheckedChange={() => handlePeerSelect(peer.id)}
                  disabled={peer.status !== 'connected'}
                />
                <label
                  htmlFor={peer.id}
                  className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2"
                >
                  <span>{peer.username}</span>
                  <span className="text-xs text-gray-500">({peer.latency}ms)</span>
                  {peer.status !== 'connected' && (
                    <span className="text-xs text-yellow-600">(Connecting...)</span>
                  )}
                </label>
              </div>
            ))}
            <div className="flex justify-end mt-3">
              <Button
                size="sm"
                disabled={selectedPeers.length === 0}
                onClick={() => {
                  onSend(selectedPeers);
                  setIsExpanded(false);
                  setSelectedPeers([]);
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                Send to {selectedPeers.length} {selectedPeers.length === 1 ? 'peer' : 'peers'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {progress > 0 && (
        <div className="mt-2">
          <Progress value={progress} className="h-1" />
          <div className="flex justify-between mt-1 text-xs text-gray-500">
            <span>{progress}%</span>
            {speed && <span>{speed}</span>}
          </div>
        </div>
      )}
    </div>
  );
}