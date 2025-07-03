// src/hooks/useP2P.ts
import { useState, useEffect, useRef } from 'react';
import Peer from 'peerjs';
import type { DataConnection } from 'peerjs';
import type { GameState, PeerInfo } from '../types';

export const useP2P = (
    username: string,
    isHost: boolean,
    hostIdToConnect: string | null,
    onGameStateReceived: (gameState: GameState) => void,
    onPlayerConnected: (peerInfo: PeerInfo) => void,
    onPlayerDisconnected: (peerId: string) => void,
    onKicked: () => void,
) => {
    const [peerId, setPeerId] = useState<string | null>(null);
    const [connections, setConnections] = useState<DataConnection[]>([]);
    const peerInstance = useRef<Peer | null>(null);
    const [hostUsername, setHostUsername] = useState('');


    useEffect(() => {
        if (!username) return;

        const peer = new Peer();
        peerInstance.current = peer;

        peer.on('open', (id) => {
            setPeerId(id);
            if (isHost) {
                console.log('P2P Host is ready with ID:', id);
            } else if (hostIdToConnect) {
                console.log('Attempting to connect to host:', hostIdToConnect);
                const conn = peer.connect(hostIdToConnect, { metadata: { username } });
                conn.on('open', () => {
                    console.log('Connected to host:', hostIdToConnect);
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
                        // The onKicked is now handled by the 'kicked' message.
                        // This prevents a double notification. The user will be
                        // returned to the setup screen regardless.
                        console.log('Connection to host closed.');
                    });
                });
                conn.on('error', (err) => {
                    console.error('P2P connection error:', err);
                });
            }
        });

        if (isHost) {
            peer.on('connection', (conn) => {
                conn.on('open', () => {
                    console.log('New player connected:', conn.peer, 'with username:', conn.metadata.username);
                    setConnections(prev => [...prev, conn]);
                    onPlayerConnected({ id: conn.peer, username: conn.metadata.username });
                    conn.send({ type: 'host-username', payload: username });

                    conn.on('data', (data) => {
                        // Host would receive actions from clients and update the state
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

        peer.on('error', (err) => {
            console.error('PeerJS error:', err);
        });

        return () => {
            peer.destroy();
        };
    }, [isHost, hostIdToConnect, onGameStateReceived, onPlayerConnected, onPlayerDisconnected, onKicked, username]);

    const broadcastGameState = (gameState: GameState) => {
        if (isHost) {
            connections.forEach(conn => {
                conn.send({ type: 'game-state', payload: gameState });
            });
        }
    };

    const kickPlayer = (peerId: string) => {
        const connToKick = connections.find(c => c.peer === peerId);
        if (connToKick) {
            connToKick.send({ type: 'kicked' });
            setTimeout(() => {
                connToKick.close();
            }, 500);
        }
    };

    return { peerId, broadcastGameState, kickPlayer, hostUsername, connections };
};