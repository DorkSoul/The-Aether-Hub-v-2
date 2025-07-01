// src/hooks/useP2P.ts
import { useState, useEffect, useRef } from 'react';
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
    const peerInstance = useRef<Peer | null>(null);

    useEffect(() => {
        try {
            const peer = new Peer();
            peerInstance.current = peer;

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
                    });
                    conn.on('data', (data) => {
                        onGameStateReceived(data as GameState);
                    });
                    conn.on('error', (err) => {
                        console.error('P2P connection error:', err);
                    });
                }
            });

            if (isHost) {
                peer.on('connection', (conn) => {
                    console.log('New player connected:', conn.peer);
                    setConnections(prev => [...prev, conn]);
                    conn.on('data', (data) => {
                        // Host would receive actions from clients and update the state
                        console.log('Received data from client:', data);
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

    return { peerId, broadcastGameState };
};