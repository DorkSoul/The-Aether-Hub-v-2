// src/components/PlayerZone.tsx
import React from 'react';
import type { PlayerState, Card as CardType } from '../types';
import Card from './Card.tsx';

interface PlayerZoneProps {
  player: string;
  playerState: PlayerState;
}

const PlayerZone: React.FC<PlayerZoneProps> = ({ player, playerState }) => {
  return (
    <div className="player-zone">
      <h2>{player}: {playerState.life} Life</h2>
      <div className="play-area">
        <div className="battlefield">
          <h3>Battlefield</h3>
          <div className="cards-container">
            {playerState.battlefield.map((card: CardType) => <Card key={card.id} card={card} imageDirectoryHandle={null} />)}
          </div>
        </div>
        <div className="library-graveyard">
          <div className="library">
            <h3>Library</h3>
            <div className="card-pile">{playerState.library.length}</div>
          </div>
          <div className="graveyard">
            <h3>Graveyard</h3>
            <div className="card-pile">{playerState.graveyard.length}</div>
          </div>
        </div>
      </div>
      <div className="hand">
        <h3>Hand</h3>
        <div className="cards-container">
          {playerState.hand.map((card: CardType) => <Card key={card.id} card={card} imageDirectoryHandle={null} />)}
        </div>
      </div>
    </div>
  );
};

export default PlayerZone;