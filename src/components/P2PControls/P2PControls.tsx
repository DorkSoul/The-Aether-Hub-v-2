// src/components/P2PControls/P2PControls.tsx
import React, { useState } from 'react';
import './P2PControls.css';

interface P2PControlsProps {
  peerId: string | null;
  onHost: () => void;
  onJoin: (hostId: string) => void;
  onLeave: () => void;
  onKick: (peerId: string) => void;
  isConnected: boolean;
  isHost: boolean;
  connectedPeers: string[];
}

const P2PControls: React.FC<P2PControlsProps> = ({ peerId, onHost, onJoin, onLeave, onKick, isConnected, isHost, connectedPeers }) => {
  const [hostIdToJoin, setHostIdToJoin] = useState('');

  const handleJoinClick = () => {
    if (hostIdToJoin.trim()) {
      onJoin(hostIdToJoin.trim());
    }
  };

  if (!peerId && !isConnected) {
    return (
      <div className="p2p-controls">
        <h4>Multiplayer</h4>
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
      </div>
    )
  }

  return (
    <div className="p2p-controls">
      <h4>Multiplayer</h4>
      {isHost ? (
        <>
          <div className="peer-id-section">
            Your Peer ID: <strong>{peerId}</strong>
          </div>
          <div className="connected-players">
            <strong>Connected Players:</strong>
            {connectedPeers.length > 0 ? (
              <ul>
                {connectedPeers.map(peer => (
                  <li key={peer}>
                    {peer}
                    <button onClick={() => onKick(peer)} className="kick-button">Kick</button>
                  </li>
                ))}
              </ul>
            ) : <p>No players connected.</p>}
          </div>
          <button onClick={onLeave} className="stop-hosting-btn">Stop Hosting</button>
        </>
      ) : isConnected ? (
        <>
          <div className="connection-status">Connected to Host</div>
          <button onClick={onLeave} className="leave-game-btn">Leave Game</button>
        </>
      ) : (
        <div className="connection-actions">
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