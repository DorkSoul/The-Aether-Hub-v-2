// src/components/P2PControls/P2PControls.tsx
import React, { useState } from 'react';
import './P2PControls.css';

interface P2PControlsProps {
  peerId: string | null;
  onHost: (username: string) => void;
  onJoin: (hostId: string, username: string) => void;
  onLeave: () => void;
  onKick: (peerId: string) => void;
  isConnected: boolean;
  isHost: boolean;
  connectedPeers: { id: string; username: string }[];
  hostUsername: string | null;
}

const P2PControls: React.FC<P2PControlsProps> = ({ 
  peerId, 
  onHost, 
  onJoin, 
  onLeave, 
  onKick, 
  isConnected, 
  isHost, 
  connectedPeers,
  hostUsername
}) => {
  const [hostIdToJoin, setHostIdToJoin] = useState('');
  const [username, setUsername] = useState('');

  const handleJoinClick = () => {
    if (hostIdToJoin.trim() && username.trim()) {
      onJoin(hostIdToJoin.trim(), username.trim());
    }
  };
  
  const handleHostClick = () => {
      if (username.trim()) {
          onHost(username.trim());
      }
  };

  return (
    <div className="p2p-controls">
      <h4>Multiplayer</h4>
      <div className="username-section">
        <input
          type="text"
          placeholder="Enter Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="username-input"
          disabled={isConnected || isHost}
        />
      </div>

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
                  <li key={peer.id}>
                    {peer.username}
                    <button onClick={() => onKick(peer.id)} className="kick-button">Kick</button>
                  </li>
                ))}
              </ul>
            ) : <p>No players connected.</p>}
          </div>
          <button onClick={onLeave} className="stop-hosting-btn">Stop Hosting</button>
        </>
      ) : isConnected ? (
        <>
          <div className="connection-status">Connected to {hostUsername || 'Host'}</div>
          <button onClick={onLeave} className="leave-game-btn">Leave Game</button>
        </>
      ) : (
        <div className="connection-actions">
           <button onClick={handleHostClick} disabled={!username.trim()}>Host a Game</button>
          <div className="join-section">
            <input
              type="text"
              placeholder="Enter Host ID to Join"
              value={hostIdToJoin}
              onChange={(e) => setHostIdToJoin(e.target.value)}
            />
            <button onClick={handleJoinClick} disabled={!username.trim() || !hostIdToJoin.trim()}>Join</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default P2PControls;