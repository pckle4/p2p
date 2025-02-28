import React, { useState, useEffect, useRef } from 'react';
import { Peer, DataConnection } from 'peerjs';
import { Dropzone } from '@/components/ui/dropzone';
import { FileCard } from '@/components/ui/file-card';
import { ConnectionStatus } from '@/components/ui/connection-status';
import { TransferProgress } from '@/components/ui/transfer-progress';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Share2, X, Clock, FileText, Shield, Zap,
  Upload, Download, Trash2, AlertTriangle, Users,
  Network, Signal, Activity, Globe, Cpu, RefreshCw,
  Wifi, Database, BarChart, Layers, Lock, Heart
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface PeerConnection {
  id: string;
  username: string;
  connection: DataConnection;
  latency: number;
  lastPing: number;
  bytesTransferred: number;
  status: 'connecting' | 'connected' | 'disconnected';
  networkQuality: 'excellent' | 'good' | 'poor';
  uptime: number;
  connectionStartTime: number;
  encryptionEnabled: boolean;
}

interface FileInfo {
  id: string;
  name: string;
  type: string;
  size: number;
  extension: string;
  url: string;
  from: string;
  fromUsername: string;
}

function generateUsername(): string {
  const adjectives = ['Swift', 'Bright', 'Quick', 'Smart', 'Cool', 'Fast'];
  const nouns = ['Peer', 'Node', 'Link', 'User', 'Friend', 'Star'];
  const randomNum = Math.floor(Math.random() * 1000);
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  return `${adj}${noun}${randomNum}`;
}

function getNetworkQuality(latency: number): 'excellent' | 'good' | 'poor' {
  if (latency < 100) return 'excellent';
  if (latency < 300) return 'good';
  return 'poor';
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
  return `${(bytes / 1073741824).toFixed(1)} GB`;
};

export default function Home() {
  const [myPeerId, setMyPeerId] = useState<string>('');
  const [myUsername, setMyUsername] = useState<string>('');
  const [remotePeerId, setRemotePeerId] = useState<string>('');
  const [peerConnections, setPeerConnections] = useState<PeerConnection[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [receivedFiles, setReceivedFiles] = useState<FileInfo[]>([]);
  const [transferProgress, setTransferProgress] = useState<{[key: string]: number}>({});
  const [transferSpeed, setTransferSpeed] = useState<{[key: string]: string}>({});
  const [totalBytesTransferred, setTotalBytesTransferred] = useState<number>(0);
  const [selectedPeerId, setSelectedPeerId] = useState<string | null>(null);
  const peerRef = useRef<Peer | null>(null);
  const { toast } = useToast();
  const pingIntervals = useRef<{[key: string]: NodeJS.Timeout}>({});

  // Update peer uptimes
  useEffect(() => {
    const interval = setInterval(() => {
      setPeerConnections(prev => prev.map(p => ({
        ...p,
        uptime: Date.now() - p.connectionStartTime
      })));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Initialize Peer
  useEffect(() => {
    const username = generateUsername();
    setMyUsername(username);

    const peer = new Peer({
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:global.stun.twilio.com:3478' }
        ]
      }
    });

    peer.on('open', (id) => {
      setMyPeerId(id);
      toast({
        title: "Ready to Connect",
        description: `Your ID: ${id.slice(0, 8)}... (${username})`,
      });
    });

    peer.on('connection', handleConnection);
    peer.on('error', handleError);

    peerRef.current = peer;

    return () => {
      Object.values(pingIntervals.current).forEach(clearInterval);
      peer.destroy();
    };
  }, []);

  const measureLatency = async (conn: DataConnection): Promise<number> => {
    const start = Date.now();
    let attempts = 3;
    let totalLatency = 0;

    for (let i = 0; i < attempts; i++) {
      const latency = await new Promise<number>((resolve) => {
        conn.send({ type: 'ping', timestamp: start + i });
        const timeout = setTimeout(() => resolve(999), 2000);

        const onPong = (data: any) => {
          if (data.type === 'pong' && data.timestamp === start + i) {
            clearTimeout(timeout);
            conn.off('data', onPong);
            resolve(Date.now() - (start + i));
          }
        };

        conn.on('data', onPong);
      });

      if (latency < 999) {
        totalLatency += latency;
      } else {
        attempts--;
      }
    }

    return attempts > 0 ? Math.round(totalLatency / attempts) : 999;
  };

  const startPingInterval = (conn: DataConnection, peerId: string) => {
    // Clear existing interval if any
    if (pingIntervals.current[peerId]) {
      clearInterval(pingIntervals.current[peerId]);
    }

    const interval = setInterval(async () => {
      const latency = await measureLatency(conn);
      setPeerConnections(prev => prev.map(p =>
        p.id === peerId ? {
          ...p,
          latency,
          lastPing: Date.now(),
          networkQuality: getNetworkQuality(latency)
        } : p
      ));
    }, 5000);

    pingIntervals.current[peerId] = interval;
  };

  const handleConnection = (conn: DataConnection) => {
    // Remove any existing connection with the same ID
    setPeerConnections(prev => prev.filter(p => p.id !== conn.peer));

    conn.on('data', handleReceiveData);

    const newPeerConnection: PeerConnection = {
      id: conn.peer,
      username: '',
      connection: conn,
      latency: 0,
      lastPing: Date.now(),
      bytesTransferred: 0,
      status: 'connected',
      networkQuality: 'good',
      uptime: 0,
      connectionStartTime: Date.now(),
      encryptionEnabled: false
    };

    setPeerConnections(prev => [...prev, newPeerConnection]);

    conn.send({
      type: 'username',
      username: myUsername,
      peerId: conn.peer
    });

    startPingInterval(conn, conn.peer);

    toast({
      title: "Peer Connected",
      description: `Connected to ${conn.peer.slice(0, 8)}...`,
      duration: 3000,
    });

    conn.on('close', () => {
      setPeerConnections(prev =>
        prev.map(p => p.id === conn.peer ? { ...p, status: 'disconnected' } : p)
      );
      // Clear ping interval
      if (pingIntervals.current[conn.peer]) {
        clearInterval(pingIntervals.current[conn.peer]);
        delete pingIntervals.current[conn.peer];
      }
      toast({
        variant: "destructive",
        title: "Peer Disconnected",
        description: `Lost connection to ${conn.peer.slice(0, 8)}...`,
        duration: 5000,
      });
    });
  };

  const connectToPeer = () => {
    if (!peerRef.current || !remotePeerId) return;

    // Check if already connected
    if (peerConnections.some(p => p.id === remotePeerId && p.status === 'connected')) {
      toast({
        variant: "destructive",
        title: "Already Connected",
        description: "You are already connected to this peer.",
      });
      return;
    }

    try {
      const conn = peerRef.current.connect(remotePeerId);
      setPeerConnections(prev => [...prev.filter(p => p.id !== remotePeerId), {
        id: remotePeerId,
        username: '',
        connection: conn,
        latency: 0,
        lastPing: Date.now(),
        bytesTransferred: 0,
        status: 'connecting',
        networkQuality: 'good',
        uptime: 0,
        connectionStartTime: Date.now(),
        encryptionEnabled: false
      }]);

      conn.on('open', () => handleConnection(conn));
    } catch (err) {
      handleError(err as Error);
    }
  };

  const handleReceiveData = async (data: any) => {
    if (data.type === 'username') {
      setPeerConnections(prev => prev.map(p =>
        p.id === data.peerId ? { ...p, username: data.username } : p
      ));
      return;
    }

    if (data.type === 'ping') {
      const conn = peerConnections.find(p => p.id === data.peerId)?.connection;
      conn?.send({ type: 'pong', timestamp: data.timestamp });
      return;
    }

    if (data.type === 'file-start') {
      setTransferProgress(prev => ({ ...prev, [data.fileId]: 0 }));
      toast({
        title: "Receiving File",
        description: `${data.fileName} from ${data.peerUsername}`,
      });
    } else if (data.type === 'file-chunk') {
      setTransferProgress(prev => ({
        ...prev,
        [data.fileId]: Math.round((data.chunkIndex / data.totalChunks) * 100)
      }));
      setTransferSpeed(prev => ({
        ...prev,
        [data.fileId]: formatSpeed(data.speed)
      }));
      setPeerConnections(prev => prev.map(p =>
        p.id === data.peerId ? {
          ...p,
          bytesTransferred: p.bytesTransferred + data.chunk.byteLength
        } : p
      ));
      setTotalBytesTransferred(prev => prev + data.chunk.byteLength);
    } else if (data.type === 'file-complete') {
      const file = new File([data.fileData], data.fileName, { type: data.fileType });
      const fileUrl = URL.createObjectURL(file);
      const extension = data.fileName.split('.').pop() || '';

      setReceivedFiles(prev => [...prev, {
        id: data.fileId,
        name: data.fileName,
        type: data.fileType,
        size: data.fileSize,
        extension,
        url: fileUrl,
        from: data.peerId,
        fromUsername: data.peerUsername
      }]);

      toast({
        title: "File Received",
        description: `${data.fileName} from ${data.peerUsername}`,
        duration: 3000,
      });
    }
  };

  const handleFileSelect = (files: File[]) => {
    setSelectedFiles(prev => [...prev, ...files]);
  };

  const removeSelectedFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const sendFile = async (file: File, targetPeerIds: string[]) => {
    const connectedPeers = peerConnections.filter(p =>
      p.status === 'connected' && targetPeerIds.includes(p.id)
    );

    if (connectedPeers.length === 0) {
      toast({
        variant: "destructive",
        title: "No Connected Peers",
        description: "Select at least one connected peer to send files.",
      });
      return;
    }

    const fileId = `file-${Date.now()}`;
    const chunkSize = 16384;
    const totalChunks = Math.ceil(file.size / chunkSize);

    connectedPeers.forEach(peer => {
      const conn = peer.connection;

      conn.send({
        type: 'file-start',
        fileId,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        totalChunks,
        peerId: myPeerId,
        peerUsername: myUsername
      });

      const fileReader = new FileReader();
      let offset = 0;

      fileReader.onload = (e) => {
        const chunk = e.target?.result;
        if (!chunk) return;

        conn.send({
          type: 'file-chunk',
          fileId,
          chunk,
          chunkIndex: Math.floor(offset / chunkSize),
          totalChunks,
          speed: file.size / totalChunks,
          peerId: myPeerId,
          peerUsername: myUsername
        });

        offset += chunkSize;

        if (offset < file.size) {
          readNextChunk();
        } else {
          conn.send({
            type: 'file-complete',
            fileId,
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            fileData: fileReader.result,
            peerId: myPeerId,
            peerUsername: myUsername
          });
        }
      };

      const readNextChunk = () => {
        const slice = file.slice(offset, offset + chunkSize);
        fileReader.readAsArrayBuffer(slice);
      };

      readNextChunk();
    });
  };

  const handlePeerSelect = (peerId: string) => {
    //This function remains unchanged.
  };


  const handleSelectAllPeers = () => {
    //This function remains unchanged.
  };

  const formatSpeed = (bytesPerSecond: number): string => {
    if (bytesPerSecond < 1024) return `${bytesPerSecond.toFixed(0)} B/s`;
    if (bytesPerSecond < 1048576) return `${(bytesPerSecond / 1024).toFixed(1)} KB/s`;
    return `${(bytesPerSecond / 1048576).toFixed(1)} MB/s`;
  };

  const handleError = (err: Error) => {
    console.error('PeerJS error:', err);
    toast({
      variant: "destructive",
      title: "Connection Error",
      description: err.message,
      duration: 5000,
    });
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 p-4 animate-gradient-shift">
      <div className="max-w-4xl mx-auto space-y-4">
        <Card className="border-2 border-indigo-100 hover:shadow-xl transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 rounded-lg animate-bounce-subtle">
                  <Share2 className="h-6 w-6 text-indigo-600" />
                </div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-cyan-600 bg-clip-text text-transparent animate-gradient-shift">
                  P2P File Transfer
                </h1>
              </div>
              <div className="flex items-center gap-4">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-3 bg-indigo-50 px-4 py-2 rounded-full cursor-help hover:bg-indigo-100 transition-colors">
                        <Users className="h-5 w-5 text-indigo-600" />
                        <span className="text-sm font-medium text-indigo-700">
                          {peerConnections.filter(p => p.status === 'connected').length} Connected
                        </span>
                        <div className="flex -space-x-2">
                          {peerConnections
                            .filter(p => p.status === 'connected')
                            .map((peer) => (
                              <div
                                key={peer.id}
                                className="w-6 h-6 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs font-medium ring-2 ring-white"
                              >
                                {peer.username?.[0] || 'P'}
                              </div>
                            ))}
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="bg-white p-4 shadow-xl rounded-lg space-y-2">
                      <h3 className="font-medium">Network Statistics</h3>
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center gap-2">
                          <Database className="h-4 w-4" />
                          <span>Total Data: {formatFileSize(totalBytesTransferred)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <BarChart className="h-4 w-4" />
                          <span>Active Transfers: {Object.keys(transferProgress).length}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Layers className="h-4 w-4" />
                          <span>Your ID: {myUsername}</span>
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h2 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Shield className="h-4 w-4 text-indigo-600" />
                  Your ID
                </h2>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input value={myPeerId} readOnly className="pr-24 font-mono text-sm" />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-indigo-100 rounded text-xs font-medium text-indigo-700">
                      {myUsername}
                    </div>
                  </div>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          onClick={() => {
                            navigator.clipboard.writeText(myPeerId);
                            toast({ description: "ID copied to clipboard" });
                          }}
                          className="bg-indigo-600 hover:bg-indigo-700 hover:shadow-lg transition-shadow duration-300"
                        >
                          Copy
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Copy your ID to share</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>

              <div>
                <h2 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Network className="h-4 w-4 text-indigo-600" />
                  Connect to Peer
                </h2>
                <div className="flex gap-2">
                  <Input
                    value={remotePeerId}
                    onChange={(e) => setRemotePeerId(e.target.value)}
                    placeholder="Enter peer ID"
                    className="font-mono text-sm"
                  />
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          onClick={connectToPeer}
                          className="bg-indigo-600 hover:bg-indigo-700 hover:shadow-lg transition-shadow duration-300"
                        >
                          Connect
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Connect to another peer</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            </div>

            {peerConnections.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Globe className="h-4 w-4 text-indigo-600" />
                  Connected Peers
                </h3>
                <div className="space-y-3">
                  {peerConnections
                    .filter(peer => peer.status !== 'disconnected')
                    .map((peer) => (
                      <div
                        key={peer.id}
                        className="bg-white rounded-xl border-2 border-indigo-100 p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer hover:border-indigo-200"
                        onClick={() => setSelectedPeerId(peer.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-indigo-50">
                              <div className={cn(
                                "absolute w-2.5 h-2.5 rounded-full",
                                peer.status === 'connected' ? "bg-green-500" : "bg-yellow-500"
                              )} />
                              {peer.status === 'connected' && (
                                <div className="absolute w-2.5 h-2.5 rounded-full bg-green-500 animate-ping opacity-75" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <div className="px-2 py-1 bg-indigo-50 rounded-md">
                                  <span className="text-sm font-medium text-indigo-700">
                                    {peer.username || peer.id.slice(0, 8)}
                                  </span>
                                </div>
                                {peer.encryptionEnabled && (
                                  <Lock className="h-4 w-4 text-green-500" />
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-xs text-gray-500">
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  <span>{formatDuration(peer.uptime)}</span>
                                </div>
                                <div className={cn(
                                  "flex items-center gap-1 px-1.5 py-0.5 rounded-full",
                                  peer.networkQuality === 'excellent' ? "bg-green-50 text-green-700" :
                                    peer.networkQuality === 'good' ? "bg-yellow-50 text-yellow-700" :
                                      "bg-red-50 text-red-700"
                                )}>
                                  <Signal className="h-3 w-3" />
                                  <span>{peer.latency}ms</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Database className="h-3 w-3" />
                                  <span>{formatFileSize(peer.bytesTransferred)}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="hover:bg-red-50 hover:text-red-600 transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                peer.connection.close();
                                setPeerConnections(prev =>
                                  prev.filter(p => p.id !== peer.id)
                                );
                                if (pingIntervals.current[peer.id]) {
                                  clearInterval(pingIntervals.current[peer.id]);
                                  delete pingIntervals.current[peer.id];
                                }
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-4">
          <Card className="border-2 border-indigo-100 hover:shadow-lg transition-shadow duration-300">
            <CardContent className="p-6">
              <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
                <Upload className="h-5 w-5 text-indigo-600" />
                Send Files
              </h2>

              <Dropzone
                onFilesDrop={handleFileSelect}
                className="mb-4 hover:border-indigo-400 transition-colors"
              />

              <div className="space-y-3">
                {selectedFiles.map((file, index) => (
                  <FileCard
                    key={index}
                    file={file}
                    onRemove={() => removeSelectedFile(index)}
                    onSend={(selectedPeers) => sendFile(file, selectedPeers)}
                    progress={transferProgress[`file-${file.name}`]}
                    speed={transferSpeed[`file-${file.name}`]}
                    peers={peerConnections.map(p => ({
                      id: p.id,
                      username: p.username,
                      status: p.status,
                      networkQuality: p.networkQuality,
                      latency: p.latency
                    }))}
                  />
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-indigo-100 hover:shadow-lg transition-shadow duration-300">
            <CardContent className="p-6">
              <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
                <Download className="h-5 w-5 text-indigo-600" />
                Received Files
              </h2>

              <div className="space-y-3">
                {receivedFiles.map((file) => (
                  <FileCard
                    key={file.id}
                    file={{
                      name: file.name,
                      type: file.type,
                      size: file.size
                    } as File}
                    downloadUrl={file.url}
                    progress={100}
                    metadata={{
                      from: file.fromUsername || file.from.slice(0, 8) + '...',
                      extension: file.extension,
                      type: file.type
                    }}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <Dialog open={!!selectedPeerId} onOpenChange={() => setSelectedPeerId(null)}>
          <DialogContent className="sm:max-w-lg">
            {selectedPeerId && (() => {
              const peer = peerConnections.find(p => p.id === selectedPeerId);
              if (!peer) return null;

              return (
                <>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <span>Peer Details</span>
                      {peer.encryptionEnabled && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <Lock className="h-4 w-4 text-green-500" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">End-to-end encrypted connection</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </DialogTitle>
                    <DialogDescription>
                      Connection statistics and details
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium">Identity</h4>
                        <div className="text-sm">
                          <p><strong>Username:</strong> {peer.username}</p>
                          <p><strong>Peer ID:</strong> {peer.id}</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium">Connection</h4>
                        <div className="text-sm">
                          <p><strong>Status:</strong> {peer.status}</p>
                          <p><strong>Connected for:</strong> {formatDuration(peer.uptime)}</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Performance</h4>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-xs text-gray-500">Latency</p>
                          <p className="text-lg font-medium">{peer.latency}ms</p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-xs text-gray-500">Quality</p>
                          <p className="text-lg font-medium capitalize">{peer.networkQuality}</p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-xs text-gray-500">Data Transferred</p>
                          <p className="text-lg font-medium">{formatFileSize(peer.bytesTransferred)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              );
            })()}
          </DialogContent>
        </Dialog>

        <div className="text-center text-sm text-gray-500 mt-8">
          Made with <Heart className="h-4 w-4 inline text-red-500 animate-pulse" /> by Ansh
        </div>
      </div>
    </div>
  );
}