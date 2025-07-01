// src/components/P2PControls/P2PControls.tsx
import React, { useState } from 'react';
import './P2PControls.css';

interface P2PControlsProps {
  peerId: string | null;
  onHost: () => void;
  onJoin: (hostId: string) => void;
  isConnected: boolean;
}

const P2PControls: React.FC<P2PControlsProps> = ({ peerId, onHost, onJoin, isConnected }) => {
  const [hostIdToJoin, setHostIdToJoin] = useState('');

  const handleJoinClick = () => {
    if (hostIdToJoin.trim()) {
      onJoin(hostIdToJoin.trim());
    }
  };

  return (
    <div className="p2p-controls">
      <h4>Multiplayer</h4>
      {peerId && !isConnected && (
        <div className="peer-id-section">
          Your Peer ID: <strong>{peerId}</strong>
        </div>
      )}
      {isConnected && <div className="connection-status">Connected</div>}

      {!isConnected && (
        <div className="connection-actions">
          <button onClick={onHost}>Host a Game</button>
          <div className="join-section">
            <input
              type="text"
              placeholder="Enter Host ID to Join"
              value={hostIdToJoin}
              onChange={(e) => setHostIdToJoin(e.target.value)}
            />
            <button onClick={handleJoinClick}>Join</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default P2PControls;