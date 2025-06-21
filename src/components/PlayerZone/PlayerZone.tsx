// src/components/PlayerZone/PlayerZone.tsx
import React, { useCallback } from 'react';
import type { PlayerState, Card as CardType, CardLocation } from '../../types';
import Card from '../Card/Card';
import cardBackUrl from '../../assets/card_back.png';
import './PlayerZone.css';

// --- NEW --- Props for the new renderer component
interface GameCardRendererProps {
  card: CardType;
  location: CardLocation;
  imageDirectoryHandle: FileSystemDirectoryHandle | null;
  onCardTap: (cardInstanceId: string) => void;
  onCardFlip: (cardInstanceId: string) => void;
  onCardContextMenu: (event: React.MouseEvent, card: CardType) => void;
  onCardDragStart: (card: CardType, source: CardLocation) => void;
}

// --- NEW --- A memoized component to render a single card.
// This prevents re-rendering cards that haven't changed and memoizes the onDragStart callback.
const GameCardRenderer = React.memo<GameCardRendererProps>(({ card, location, onCardDragStart, ...rest }) => {
  const handleDragStart = useCallback((event: React.DragEvent) => {
    event.stopPropagation();
    onCardDragStart(card, location);
  }, [card, location, onCardDragStart]);

  return (
    <Card
      card={card}
      imageDirectoryHandle={rest.imageDirectoryHandle}
      isTapped={card.isTapped}
      isFlipped={card.isFlipped}
      onTap={() => rest.onCardTap(card.instanceId!)}
      onFlip={() => rest.onCardFlip(card.instanceId!)}
      onContextMenu={(e) => rest.onCardContextMenu(e, card)}
      onDragStart={handleDragStart}
    />
  );
});

interface PlayerZoneProps {
  playerState: PlayerState;
  isFlipped: boolean;
  imagesDirectoryHandle: FileSystemDirectoryHandle | null;
  onCardTap: (cardInstanceId: string) => void;
  onCardFlip: (cardInstanceId: string) => void;
  onCardContextMenu: (event: React.MouseEvent, card: CardType) => void;
  onCardDragStart: (card: CardType, source: CardLocation) => void;
  onLibraryDragStart: (source: CardLocation) => void;
  onZoneDrop: (destination: CardLocation) => void;
  onZoneDragOver: (event: React.DragEvent, destination: CardLocation) => void;
  onZoneDragLeave: (event: React.DragEvent) => void;
  dropTarget: CardLocation | null;
}

const PlayerZone: React.FC<PlayerZoneProps> = ({ 
  playerState, 
  isFlipped, 
  imagesDirectoryHandle, 
  onCardTap, 
  onCardFlip, 
  onCardContextMenu,
  onCardDragStart,
  onLibraryDragStart,
  onZoneDrop,
  onZoneDragOver,
  onZoneDragLeave,
  dropTarget
}) => {
  const playerZoneClasses = `player-zone ${isFlipped ? 'flipped' : ''}`;
  const playerId = playerState.id;

  // --- MODIFIED --- Use the new renderer component
  const renderGameCard = (card: CardType, location: Omit<CardLocation, 'playerId'>) => {
    const source: CardLocation = { ...location, playerId };
    return (
      <GameCardRenderer
        key={`${location.zone}-${card.instanceId}`}
        card={card}
        location={source}
        imageDirectoryHandle={imagesDirectoryHandle}
        onCardTap={onCardTap}
        onCardFlip={onCardFlip}
        onCardContextMenu={onCardContextMenu}
        onCardDragStart={onCardDragStart}
      />
    );
  };
  
  const getZoneProps = (location: Omit<CardLocation, 'playerId'>) => {
    const destination: CardLocation = { ...location, playerId };
    const isTarget = dropTarget?.playerId === playerId && dropTarget.zone === location.zone && dropTarget.row === location.row;
    return {
      className: `zone ${location.zone}-zone ${isTarget ? 'drop-target' : ''}`,
      onDragOver: (e: React.DragEvent) => onZoneDragOver(e, destination),
      onDragLeave: onZoneDragLeave,
      onDrop: (e: React.DragEvent) => {
        e.stopPropagation();
        onZoneDrop(destination)
      },
    };
  };

  const numCommanders = playerState.commandZone.length;
  const commandZoneAspectRatio = `${63 * Math.max(1, numCommanders)} / 88`;

  const commandZoneJsx = (
      <div {...getZoneProps({ zone: 'commandZone' })} title="Command Zone" style={{ aspectRatio: commandZoneAspectRatio }}>
        <div className="cards-container">
            {playerState.commandZone.length > 0 ?
                playerState.commandZone.map((card) => renderGameCard(card, { zone: 'commandZone' })) :
                <div className="card-outline">
                    <span className="zone-label-full">Command</span>
                </div>
            }
        </div>
      </div>
  );

  const exileZoneJsx = (
      <div {...getZoneProps({ zone: 'exile' })} title="Exile">
        <div className="card-outline">
            {playerState.exile.length > 0 ? (
                <img src={cardBackUrl} alt="Card back" className="card-back-image" />
            ) : <span className="zone-label-full">Exile</span>}
            {playerState.exile.length > 0 && <span className="zone-count">{playerState.exile.length}</span>}
        </div>
      </div>
  );

  const graveyardZoneJsx = (
      <div {...getZoneProps({ zone: 'graveyard' })} title="Graveyard">
        <div className="card-outline">
            {playerState.graveyard.length > 0 ? (
                <img src={cardBackUrl} alt="Card back" className="card-back-image" />
            ) : <span className="zone-label-full">Graveyard</span>}
            {playerState.graveyard.length > 0 && <span className="zone-count">{playerState.graveyard.length}</span>}
        </div>
      </div>
  );

  const libraryZoneJsx = (
      <div 
        {...getZoneProps({ zone: 'library' })}
        title="Library"
        draggable={playerState.library.length > 0}
        onDragStart={(e) => {
          e.stopPropagation();
          onLibraryDragStart({ playerId, zone: 'library' });
        }}
      >
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
        {playerState.battlefield.map((row, index) => {
          const destination: CardLocation = { playerId, zone: 'battlefield', row: index };
          const isTarget = dropTarget?.playerId === playerId && dropTarget.zone === 'battlefield' && dropTarget.row === index;
          return (
            <div key={index} className="game-row">
                {zones[index]}
                <div 
                  className={`battlefield-row ${isTarget ? 'drop-target' : ''}`}
                  onDragOver={(e) => onZoneDragOver(e, destination)}
                  onDragLeave={onZoneDragLeave}
                  onDrop={(e) => { e.stopPropagation(); onZoneDrop(destination); }}
                >
                    {row.map((card) => renderGameCard(card, { zone: 'battlefield', row: index }))}
                </div>
            </div>
          )
        })}
      </div>
      <div 
        className={`hand ${dropTarget?.playerId === playerId && dropTarget?.zone === 'hand' ? 'drop-target' : ''}`}
        onDragOver={(e) => onZoneDragOver(e, { playerId, zone: 'hand' })}
        onDragLeave={onZoneDragLeave}
        onDrop={(e) => { e.stopPropagation(); onZoneDrop({ playerId, zone: 'hand' }); }}
      >
        {playerState.hand.map((card) => renderGameCard(card, { zone: 'hand' }))}
      </div>
    </div>
  );
};

export default React.memo(PlayerZone);