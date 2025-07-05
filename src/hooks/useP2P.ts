// src/hooks/useP2P.ts
import { useState, useRef, useCallback } from 'react';
import Peer from 'peerjs';
import type { DataConnection } from 'peerjs';
import type { GameState, PeerInfo } from '../types';

export const useP2P = (
    onGameStateReceived: (gameState: GameState) => void,
    onPlayerConnected: (peerInfo: PeerInfo) => void,
    onPlayerDisconnected: (peerId: string) => void,
    onKicked: () => void,
    onConnect: () => void,
) => {
    const [peerId, setPeerId] = useState<string | null>(null);
    const [connections, setConnections] = useState<DataConnection[]>([]);
    const peerInstance = useRef<Peer | null>(null);
    const [hostUsername, setHostUsername] = useState('');
    const [isHost, setIsHost] = useState(false);

    const disconnect = useCallback(() => {
        if (peerInstance.current) {
            if (isHost) {
                connections.forEach(conn => {
                    conn.send({ type: 'kicked' }); 
                    setTimeout(() => conn.close(), 500);
                });
            }
            peerInstance.current.destroy();
        }
        setPeerId(null);
        setConnections([]);
        setHostUsername('');
        setIsHost(false);
    }, [connections, isHost]);

    const setupPeer = (id?: string) => {
        if (peerInstance.current) {
            peerInstance.current.destroy();
        }

        const peer = id ? new Peer(id) : new Peer();
        peerInstance.current = peer;

        peer.on('error', (err) => {
            console.error('PeerJS error:', err);
        });

        return peer;
    }

    const startHosting = (username: string) => {
        const peer = setupPeer();
        setIsHost(true);

        peer.on('open', (id) => {
            setPeerId(id);
            console.log('P2P Host is ready with ID:', id);
        });

        peer.on('connection', (conn) => {
            conn.on('open', () => {
                console.log('New player connected:', conn.peer, 'with username:', conn.metadata.username);
                setConnections(prev => [...prev, conn]);
                onPlayerConnected({ id: conn.peer, username: conn.metadata.username });
                conn.send({ type: 'host-username', payload: username });

                conn.on('data', (data) => {
                    console.log('Received data from client:', data);
                });
                conn.on('close', () => {
                    console.log('Player disconnected:', conn.peer);
                    onPlayerDisconnected(conn.peer);
                    setConnections(prev => prev.filter(c => c.peer !== conn.peer));
                });
            });
        });
    }

    const startConnecting = (username: string, hostId: string) => {
        const peer = setupPeer();
        setIsHost(false);
        peer.on('open', (id) => {
            setPeerId(id);
            console.log('Attempting to connect to host:', hostId);
            const conn = peer.connect(hostId, { metadata: { username } });
            conn.on('open', () => {
                console.log('Connected to host:', hostId);
                onConnect();
                setConnections([conn]);
                conn.on('data', (data: any) => {
                    if (data.type === 'game-state') {
                        onGameStateReceived(data.payload as GameState);
                    } else if (data.type === 'host-username') {
                        setHostUsername(data.payload);
                    } else if (data.type === 'kicked') {
                        onKicked();
                        conn.close();
                    }
                });
                 conn.on('close', () => {
                    console.log('Connection to host closed.');
                    onKicked();
                });
            });
            conn.on('error', (err) => {
                console.error('P2P connection error:', err);
            });
        });
    }

    const broadcastGameState = (gameState: GameState) => {
        if (isHost) {
            connections.forEach(conn => {
                conn.send({ type: 'game-state', payload: gameState });
            });
        }
    };

    const kickPlayer = (peerIdToKick: string) => {
        const connToKick = connections.find(c => c.peer === peerIdToKick);
        if (connToKick) {
            connToKick.send({ type: 'kicked' });
            setTimeout(() => {
                connToKick.close();
            }, 500);
        }
    };

    return { peerId, isHost, hostUsername, connections, startHosting, startConnecting, broadcastGameState, kickPlayer, disconnect };
};