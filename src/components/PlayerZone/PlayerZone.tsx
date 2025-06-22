// src/components/PlayerZone/PlayerZone.tsx
import React, { useCallback } from 'react';
import type { PlayerState, Card as CardType, CardLocation, ManaType } from '../../types';
import Card from '../Card/Card';
import cardBackUrl from '../../assets/card_back.png';
import { WhiteManaIcon, BlueManaIcon, BlackManaIcon, RedManaIcon, GreenManaIcon, ColorlessManaIcon, PlusIcon, MinusIcon } from '../Icons/icons';
import './PlayerZone.css';

const ManaCounter: React.FC<{ type: ManaType; count: number }> = ({ type, count }) => {
  const Icon = {
    white: WhiteManaIcon,
    blue: BlueManaIcon,
    black: BlackManaIcon,
    red: RedManaIcon,
    green: GreenManaIcon,
    colorless: ColorlessManaIcon,
  }[type];

  return (
    <div className="mana-counter" title={`${count} ${type} mana`}>
      <Icon />
      <span className="mana-count">{count}</span>
    </div>
  );
};

interface GameCardRendererProps {
  card: CardType;
  location: CardLocation;
  imageDirectoryHandle: FileSystemDirectoryHandle | null;
  onCardTap: (cardInstanceId: string) => void;
  onCardFlip: (cardInstanceId: string) => void;
  onCardContextMenu: (event: React.MouseEvent, card: CardType) => void;
  onCardDragStart: (card: CardType, source: CardLocation, offset: {x: number, y: number}) => void;
  onCardHover: (card: CardType | null) => void; 
  style?: React.CSSProperties;
}

const GameCardRenderer = React.memo<GameCardRendererProps>(({ card, location, onCardDragStart, style, ...rest }) => {
  const handleDragStart = useCallback((event: React.DragEvent) => {
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    const offset = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    onCardDragStart(card, location, offset);
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
      onCardHover={rest.onCardHover} 
      style={style}
    />
  );
});

interface PlayerZoneProps {
  playerState: PlayerState;
  isFlipped: boolean;
  imagesDirectoryHandle: FileSystemDirectoryHandle | null;
  playAreaLayout: 'rows' | 'freeform';
  freeformCardSizes: {[playerId: string]: number};
  onCardTap: (cardInstanceId: string) => void;
  onCardFlip: (cardInstanceId: string) => void;
  onCardContextMenu: (event: React.MouseEvent, card: CardType) => void;
  onLibraryContextMenu: (event: React.MouseEvent, playerId: string) => void;
  onUpdateFreeformCardSize: (playerId: string, delta: number) => void;
  onCardDragStart: (card: CardType, source: CardLocation, offset: {x: number, y: number}) => void;
  onLibraryDragStart: (source: CardLocation, offset: {x: number, y: number}) => void;
  onZoneDrop: (destination: CardLocation, event: React.DragEvent) => void;
  onZoneDragOver: (event: React.DragEvent, destination: CardLocation) => void;
  onZoneDragLeave: (event: React.DragEvent) => void;
  dropTarget: CardLocation | null;
  onCardHover: (card: CardType | null) => void; 
}

const PlayerZone: React.FC<PlayerZoneProps> = ({ 
  playerState, 
  isFlipped, 
  imagesDirectoryHandle, 
  playAreaLayout,
  freeformCardSizes,
  onCardTap, 
  onCardFlip, 
  onCardContextMenu,
  onLibraryContextMenu,
  onUpdateFreeformCardSize,
  onCardDragStart,
  onLibraryDragStart,
  onZoneDrop,
  onZoneDragOver,
  onZoneDragLeave,
  dropTarget,
  onCardHover, 
}) => {
  const playerZoneClasses = `player-zone ${isFlipped ? 'flipped' : ''}`;
  const playerId = playerState.id;

  const renderGameCard = (card: CardType, location: Omit<CardLocation, 'playerId'>) => {
    const source: CardLocation = { ...location, playerId };
    
    const isFreeformBattlefield = playAreaLayout === 'freeform' && location.zone === 'battlefield';
    const size = isFreeformBattlefield ? freeformCardSizes[playerId] : undefined;
    
    const cardStyle = (size && card.x !== undefined && card.y !== undefined)
        ? { position: 'absolute' as const, left: `${card.x}px`, top: `${card.y}px`, width: `${size}px`, height: `${size * 1.4}px` }
        : {};

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
        onCardHover={onCardHover} 
        style={cardStyle}
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
        onZoneDrop(destination, e)
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
                renderGameCard(playerState.exile[playerState.exile.length - 1], { zone: 'exile' })
            ) : <span className="zone-label-full">Exile</span>}
            {playerState.exile.length > 0 && <span className="zone-count">{playerState.exile.length}</span>}
        </div>
      </div>
  );

  const graveyardZoneJsx = (
      <div {...getZoneProps({ zone: 'graveyard' })} title="Graveyard">
        <div className="card-outline">
            {playerState.graveyard.length > 0 ? (
                renderGameCard(playerState.graveyard[playerState.graveyard.length - 1], { zone: 'graveyard' })
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
          const rect = e.currentTarget.getBoundingClientRect();
          const offset = { x: e.clientX - rect.left, y: e.clientY - rect.top };
          onLibraryDragStart({ playerId, zone: 'library' }, offset);
        }}
        onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (playerState.library.length > 0) {
                onLibraryContextMenu(e, playerId);
            }
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
        <div className="mana-pool">
          {(Object.keys(playerState.mana) as ManaType[]).map(manaType => (
            <ManaCounter
              key={manaType}
              type={manaType}
              count={playerState.mana[manaType]}
            />
          ))}
        </div>
        <h3>{playerState.name}: {playerState.life} Life</h3>
        {playAreaLayout === 'freeform' && (
          <div className="freeform-controls">
            <button onClick={() => onUpdateFreeformCardSize(playerId, -10)} title="Decrease Card Size"><MinusIcon /></button>
            <button onClick={() => onUpdateFreeformCardSize(playerId, 10)} title="Increase Card Size"><PlusIcon /></button>
          </div>
        )}
      </div>
      <div className={`play-area ${playAreaLayout}`}>
        {playAreaLayout === 'rows' ? (
          playerState.battlefield.map((row, index) => {
            const destination: CardLocation = { playerId, zone: 'battlefield', row: index };
            const isTarget = dropTarget?.playerId === playerId && dropTarget.zone === 'battlefield' && dropTarget.row === index;
            return (
              <div key={index} className="game-row">
                  {zones[index]}
                  <div 
                    className={`battlefield-row ${isTarget ? 'drop-target' : ''}`}
                    onDragOver={(e) => onZoneDragOver(e, destination)}
                    onDragLeave={onZoneDragLeave}
                    onDrop={(e) => { e.stopPropagation(); onZoneDrop(destination, e); }}
                  >
                      {row.map((card) => renderGameCard(card, { zone: 'battlefield', row: index }))}
                  </div>
              </div>
            )
          })
        ) : (
          <>
            <div className="side-zones-container">
                {zones.map((zone, index) => <div key={index} className="side-zone-wrapper">{zone}</div>)}
            </div>
            <div 
              className={`battlefield-freeform ${dropTarget?.playerId === playerId && dropTarget.zone === 'battlefield' ? 'drop-target' : ''}`}
              onDragOver={(e) => onZoneDragOver(e, { playerId, zone: 'battlefield', row: 0 })}
              onDragLeave={onZoneDragLeave}
              onDrop={(e) => { e.stopPropagation(); onZoneDrop({ playerId, zone: 'battlefield', row: 0 }, e); }}
            >
              {playerState.battlefield.flat().map((card) => renderGameCard(card, { zone: 'battlefield', row: 0 }))}
            </div>
          </>
        )}
      </div>
      <div 
        className={`hand ${dropTarget?.playerId === playerId && dropTarget?.zone === 'hand' ? 'drop-target' : ''}`}
        onDragOver={(e) => onZoneDragOver(e, { playerId, zone: 'hand' })}
        onDragLeave={onZoneDragLeave}
        onDrop={(e) => { e.stopPropagation(); onZoneDrop({ playerId, zone: 'hand' }, e); }}
      >
        {playerState.hand.map((card) => renderGameCard(card, { zone: 'hand' }))}
      </div>
    </div>
  );
};

export default React.memo(PlayerZone);