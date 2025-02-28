import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { FileText, Send, Users } from 'lucide-react';
import { PeerSelect } from './peer-select';
import { formatFileSize } from '@/lib/utils';

interface SendFileDialogProps {
  file?: File;
  open: boolean;
  onOpenChange: (open: boolean) => void;
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
  onSend: () => void;
}

export function SendFileDialog({
  file,
  open,
  onOpenChange,
  peers,
  selectedPeers,
  onPeerSelect,
  onSelectAll,
  onSend
}: SendFileDialogProps) {
  const connectedPeers = peers.filter(p => p.status === 'connected');

  if (!file) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send File</DialogTitle>
          <DialogDescription>
            Choose peers to send the file to
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
            <FileText className="h-5 w-5 text-gray-500 mt-1" />
            <div>
              <p className="text-sm font-medium text-gray-900">{file.name}</p>
              <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
            </div>
          </div>

          <PeerSelect
            peers={peers}
            selectedPeers={selectedPeers}
            onPeerSelect={onPeerSelect}
            onSelectAll={onSelectAll}
          />

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={onSend}
              disabled={selectedPeers.length === 0}
              className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
            >
              <Send className="h-4 w-4" />
              Send to {selectedPeers.length} {selectedPeers.length === 1 ? 'peer' : 'peers'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}