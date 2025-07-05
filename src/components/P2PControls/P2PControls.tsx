// src/components/P2PControls/P2PControls.tsx
import React, { useState } from 'react';
import './P2PControls.css';

interface P2PControlsProps {
  peerId: string | null;
  onProceedToHostSetup: (username: string) => void;
  onJoin: (hostId: string, username: string) => void;
  onDisconnect: () => void;
  onStopHosting: () => void;
  isConnected: boolean;
  connectedPlayers: { id: string; username: string }[];
  kickPlayer: (peerId: string) => void;
  isHost: boolean;
  hostUsername: string;
}

const P2PControls: React.FC<P2PControlsProps> = ({ peerId, onProceedToHostSetup, onJoin, onDisconnect, onStopHosting, isConnected, connectedPlayers, kickPlayer, isHost, hostUsername }) => {
  const [hostIdToJoin, setHostIdToJoin] = useState('');
  const [username, setUsername] = useState('');
  const [copied, setCopied] = useState(false);

  const handleHostClick = () => {
    if (username.trim()) {
      onProceedToHostSetup(username.trim());
    }
  };
  
  const handleJoinClick = () => {
    if (hostIdToJoin.trim() && username.trim()) {
      onJoin(hostIdToJoin.trim(), username.trim());
    }
  };

  const handleCopyPeerId = () => {
    if (peerId) {
      navigator.clipboard.writeText(peerId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000); // Reset after 2 seconds
    }
  };

  return (
    <div className="p2p-controls">
      <h4>Multiplayer</h4>
      <div className="input-group">
        <label htmlFor="username-input">Username:</label>
        <input
          id="username-input"
          type="text"
          placeholder="Your name"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          disabled={isConnected}
          className="p2p-input"
        />
      </div>

      {peerId && !isConnected && (
         <div className="peer-id-section clickable" onClick={handleCopyPeerId}>
          Your Peer ID: <strong>{peerId}</strong> {copied && <span>Copied!</span>}
        </div>
      )}
      
      {isHost && isConnected && (
         <div className="peer-id-section clickable" onClick={handleCopyPeerId}>
          Your Peer ID: <strong>{peerId}</strong> {copied && <span>Copied!</span>}
        </div>
      )}

      {isConnected ? (
        <div>
          <div className="connection-status">
            {isHost ? 'Hosting Game' : `Connected to ${hostUsername}`}
          </div>
          {isHost ? (
             <button onClick={onStopHosting}>Stop Hosting</button>
          ) : (
            <button onClick={onDisconnect}>Disconnect</button>
          )}
        </div>
      ) : (
        <div className="connection-actions">
          <button onClick={handleHostClick} disabled={!username.trim()}>Host a Game</button>
          <div className="input-group join-section">
            <label htmlFor="host-id-input">Host ID:</label>
            <input
              id="host-id-input"
              type="text"
              placeholder="Enter Host ID"
              value={hostIdToJoin}
              onChange={(e) => setHostIdToJoin(e.target.value)}
              className="p2p-input"
            />
            <button onClick={handleJoinClick} disabled={!hostIdToJoin.trim() || !username.trim()}>Join</button>
          </div>
        </div>
      )}

      {isHost && isConnected && (
        <div className="connected-players">
          <h4>Connected Players:</h4>
          <ul>
            {connectedPlayers.map(player => (
              <li key={player.id}>
                <span>{player.username}</span>
                <button onClick={() => kickPlayer(player.id)} className="kick-button">Kick</button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default P2PControls;