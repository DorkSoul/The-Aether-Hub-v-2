// src/hooks/useP2P.ts
import { useState, useEffect, useRef, useCallback } from 'react';
import Peer from 'peerjs';
import type { DataConnection } from 'peerjs';
import type { GameState } from '../types';

export const useP2P = (
    isHost: boolean, 
    hostIdToConnect: string | null, 
    onGameStateReceived: (gameState: GameState) => void
) => {
    const [peerId, setPeerId] = useState<string | null>(null);
    const [connections, setConnections] = useState<DataConnection[]>([]);
    const [connectedPeers, setConnectedPeers] = useState<string[]>([]);
    const peerInstance = useRef<Peer | null>(null);

    const disconnect = useCallback(() => {
        if (peerInstance.current) {
            peerInstance.current.destroy();
            peerInstance.current = null;
        }
        setConnections([]);
        setConnectedPeers([]);
        setPeerId(null);
    }, []);

    const kickPeer = useCallback((peerIdToKick: string) => {
        const connToKick = connections.find(c => c.peer === peerIdToKick);
        if (connToKick) {
            connToKick.close();
            setConnections(prev => prev.filter(c => c.peer !== peerIdToKick));
            setConnectedPeers(prev => prev.filter(p => p !== peerIdToKick));
        }
    }, [connections]);

    useEffect(() => {
        if (!isHost && !hostIdToConnect) {
            if (peerInstance.current) {
                peerInstance.current.destroy();
            }
            return;
        };

        try {
            const peer = new Peer();
            peerInstance.current = peer;

            const updateConnectedPeers = () => {
                const connectedIds = connections.map(c => c.peer).filter(id => id !== peer.id);
                setConnectedPeers(connectedIds);
            };

            peer.on('open', (id) => {
                setPeerId(id);
                if (isHost) {
                    console.log('P2P Host is ready with ID:', id);
                } else if (hostIdToConnect) {
                    console.log('Attempting to connect to host:', hostIdToConnect);
                    const conn = peer.connect(hostIdToConnect);
                    conn.on('open', () => {
                        console.log('Connected to host:', hostIdToConnect);
                        setConnections([conn]);
                        setConnectedPeers([conn.peer]);
                    });
                    conn.on('data', (data) => {
                        onGameStateReceived(data as GameState);
                    });
                    conn.on('error', (err) => {
                        console.error('P2P connection error:', err);
                    });
                    conn.on('close', () => {
                        setConnections(prev => prev.filter(c => c.peer !== conn.peer));
                        setConnectedPeers(prev => prev.filter(p => p !== conn.peer));
                    });
                }
            });

            if (isHost) {
                peer.on('connection', (conn) => {
                    console.log('New player connected:', conn.peer);
                    setConnections(prev => [...prev, conn]);
                    setConnectedPeers(prev => [...prev, conn.peer]);

                    conn.on('data', (data) => {
                        // Host would receive actions from clients and update the state
                        console.log('Received data from client:', data);
                    });
                    conn.on('close', () => {
                        setConnections(prev => prev.filter(c => c.peer !== conn.peer));
                        setConnectedPeers(prev => prev.filter(p => p !== conn.peer));
                    });
                });
            }
            
            peer.on('error', (err) => {
                console.error('PeerJS error:', err);
            });

            return () => {
                peer.destroy();
            };
        } catch (error) {
            console.error("Failed to initialize PeerJS:", error);
        }
    }, [isHost, hostIdToConnect, onGameStateReceived]);

    const broadcastGameState = (gameState: GameState) => {
        if (isHost) {
            connections.forEach(conn => {
                conn.send(gameState);
            });
        }
    };

    return { peerId, broadcastGameState, connectedPeers, disconnect, kickPeer };
};