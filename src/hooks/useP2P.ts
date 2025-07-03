// src/hooks/useP2P.ts
import { useState, useEffect, useRef, useCallback } from 'react';
import Peer, { type DataConnection } from 'peerjs';
import type { GameState } from '../types';

export const useP2P = (
    username: string,
    isHost: boolean,
    hostIdToConnect: string | null,
    onGameStateReceived: (gameState: GameState) => void,
    onKicked: () => void,
    onConnected: (hostUsername: string) => void
) => {
    const [peerId, setPeerId] = useState<string | null>(null);
    const [connections, setConnections] = useState<DataConnection[]>([]);
    const [connectedPeers, setConnectedPeers] = useState<{ id: string; username: string }[]>([]);
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
            connToKick.send({ type: 'KICK' });
            connToKick.close();
            setConnections(prev => prev.filter(c => c.peer !== peerIdToKick));
            setConnectedPeers(prev => prev.filter(p => p.id !== peerIdToKick));
        }
    }, [connections]);

    useEffect(() => {
        if (!username || (!isHost && !hostIdToConnect)) {
            if (peerInstance.current) {
                disconnect();
            }
            return;
        };

        try {
            const peer = new Peer();
            peerInstance.current = peer;

            peer.on('open', (id) => {
                setPeerId(id);
                if (isHost) {
                    console.log('P2P Host is ready with ID:', id);
                } else if (hostIdToConnect) {
                    console.log('Attempting to connect to host:', hostIdToConnect);
                    const conn = peer.connect(hostIdToConnect, { metadata: { username } });
                    
                    let isDisconnected = false;
                    const handleDisconnection = () => {
                        if (!isDisconnected) {
                            isDisconnected = true;
                            onKicked();
                        }
                    };

                    conn.on('open', () => {
                        setConnections([conn]);
                    });
                    conn.on('data', (data: any) => {
                        if (data.type === 'KICK') {
                            handleDisconnection();
                        } else if (data.type === 'HOST_USERNAME') {
                            onConnected(data.username);
                        } 
                        else {
                            onGameStateReceived(data as GameState);
                        }
                    });
                    conn.on('error', (err) => {
                        console.error('P2P connection error:', err);
                        handleDisconnection();
                    });
                    conn.on('close', () => {
                        handleDisconnection();
                    });
                }
            });

            if (isHost) {
                peer.on('connection', (conn) => {
                    conn.on('open', () => {
                        console.log('New player connected:', conn.peer, 'Username:', conn.metadata.username);
                        setConnections(prev => [...prev, conn]);
                        setConnectedPeers(prev => [...prev, { id: conn.peer, username: conn.metadata.username }]);
                        conn.send({ type: 'HOST_USERNAME', username });
                    });

                    conn.on('data', (data) => {
                        // Host would receive actions from clients and update the state
                        console.log('Received data from client:', data);
                    });
                    conn.on('close', () => {
                        setConnections(prev => prev.filter(c => c.peer !== conn.peer));
                        setConnectedPeers(prev => prev.filter(p => p.id !== conn.peer));
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
    }, [isHost, hostIdToConnect, username, onGameStateReceived, onKicked, onConnected, disconnect]);

    const broadcastGameState = (gameState: GameState) => {
        if (isHost) {
            connections.forEach(conn => {
                conn.send(gameState);
            });
        }
    };

    return { peerId, broadcastGameState, connectedPeers, disconnect, kickPeer };
};