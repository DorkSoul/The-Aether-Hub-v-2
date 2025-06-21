// src/components/PlayerZone/PlayerZone.tsx
import React from 'react';
import type { PlayerState, Card as CardType } from '../../types';
import Card from '../Card/Card';
import cardBackUrl from '../../assets/card_back.png';
import './PlayerZone.css';

interface PlayerZoneProps {
  playerState: PlayerState;
  isFlipped: boolean;
  imagesDirectoryHandle: FileSystemDirectoryHandle | null;
  onCardTap: (cardInstanceId: string) => void;
  onCardFlip: (cardInstanceId: string) => void;
  onCardContextMenu: (event: React.MouseEvent, card: CardType) => void;
}

const PlayerZone: React.FC<PlayerZoneProps> = ({ playerState, isFlipped, imagesDirectoryHandle, onCardTap, onCardFlip, onCardContextMenu }) => {
  const playerZoneClasses = `player-zone ${isFlipped ? 'flipped' : ''}`;

  /**
   * Renders a Card component with all necessary props for in-game interaction.
   * @param card The card data to render.
   * @param location A string to help create a unique key for the component.
   */
  const renderGameCard = (card: CardType, location: string) => {
    return (
      <Card
        key={`${location}-${card.instanceId}`}
        card={card}
        imageDirectoryHandle={imagesDirectoryHandle}
        isTapped={card.isTapped}
        isFlipped={card.isFlipped}
        onTap={() => onCardTap(card.instanceId!)}
        onFlip={() => onCardFlip(card.instanceId!)}
        onContextMenu={(e) => onCardContextMenu(e, card)}
      />
    );
  };

  const numCommanders = playerState.commandZone.length;
  const commandZoneAspectRatio = `${63 * Math.max(1, numCommanders)} / 88`;

  const commandZoneJsx = (
      <div className="zone command-zone" title="Command Zone" style={{ aspectRatio: commandZoneAspectRatio }}>
        <div className="cards-container">
            {playerState.commandZone.length > 0 ?
                playerState.commandZone.map((card) => renderGameCard(card, 'command')) :
                <div className="card-outline">
                    <span className="zone-label-full">Command</span>
                </div>
            }
        </div>
      </div>
  );

  const exileZoneJsx = (
      <div className="zone" title="Exile">
        <div className="card-outline">
            {playerState.exile.length > 0 ? (
                <img src={cardBackUrl} alt="Card back" className="card-back-image" />
            ) : <span className="zone-label-full">Exile</span>}
            {playerState.exile.length > 0 && <span className="zone-count">{playerState.exile.length}</span>}
        </div>
      </div>
  );

  const graveyardZoneJsx = (
      <div className="zone" title="Graveyard">
        <div className="card-outline">
            {playerState.graveyard.length > 0 ? (
                <img src={cardBackUrl} alt="Card back" className="card-back-image" />
            ) : <span className="zone-label-full">Graveyard</span>}
            {playerState.graveyard.length > 0 && <span className="zone-count">{playerState.graveyard.length}</span>}
        </div>
      </div>
  );

  const libraryZoneJsx = (
      <div className="zone" title="Library">
        <div className="card-outline">
            {playerState.library.length > 0 ? <img src={cardBackUrl} alt="Card back" className="card-back-image" /> : <span className="zone-label-full">Library</span>}
            {playerState.library.length > 0 && <span className="zone-count">{playerState.library.length}</span>}
        </div>
      </div>
  );
  
  const zones = isFlipped 
    ? [libraryZoneJsx, graveyardZoneJsx, exileZoneJsx, commandZoneJsx] 
    : [commandZoneJsx, exileZoneJsx, graveyardZoneJsx, libraryZoneJsx];

  return (
    <div className={playerZoneClasses} style={{ '--player-color': playerState.color } as React.CSSProperties}>
      <div className="player-header">
        <h3>{playerState.name}: {playerState.life} Life</h3>
      </div>
      <div className="play-area">
        {playerState.battlefield.map((row, index) => (
            <div key={index} className="game-row">
                {zones[index]}
                <div className="battlefield-row">
                    {row.map((card) => renderGameCard(card, `battlefield-${index}`))}
                </div>
            </div>
        ))}
      </div>
      <div className="hand">
        {playerState.hand.map((card) => renderGameCard(card, 'hand'))}
      </div>
    </div>
  );
};

export default PlayerZone;