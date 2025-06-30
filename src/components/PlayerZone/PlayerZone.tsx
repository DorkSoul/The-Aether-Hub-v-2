// src/components/PlayerZone/PlayerZone.tsx

import React, { useCallback, useRef, useState, useMemo, useEffect } from 'react';
import type { PlayerState, Card as CardType, CardLocation } from '../../types';
import Card from '../Card/Card';
import cardBackUrl from '../../assets/card_back.png';
import { PlusIcon, MinusIcon } from '../Icons/icons';
import './PlayerZone.css';

interface GameCardRendererProps {
  card: CardType;
  location: CardLocation;
  isBoardRotated: boolean;
  imageDirectoryHandle: FileSystemDirectoryHandle | null;
  heldCounter: string | null;
  onCounterApply: (cardInstanceId: string, counterType: string) => void;
  onCustomCounterApply: (cardInstanceId: string, counterType: string) => void;
  onCounterRemove: (cardInstanceId: string, counterType: string) => void;
  onRemoveAllCounters: (cardInstanceId: string, counterType: string) => void;
  onCounterSelect: (counterType: string) => void;
  onCardTap: (cardInstanceId: string) => void;
  onCardFlip: (cardInstanceId: string) => void;
  onCardContextMenu: (event: React.MouseEvent, card: CardType) => void;
  onCardDragStart: (card: CardType, source: CardLocation, offset: {x: number, y: number}) => void;
  onCardHover: (card: CardType | null) => void;
  isHighlighted: boolean;
  style?: React.CSSProperties;
}

const GameCardRenderer = React.memo<GameCardRendererProps>(({ card, location, isBoardRotated, onCardDragStart, style, isHighlighted, heldCounter, onCounterApply, onCustomCounterApply, onCounterRemove, onRemoveAllCounters, onCounterSelect, ...rest }) => {
  const handleDragStart = useCallback((event: React.DragEvent) => {
    event.stopPropagation();
    
    const nodeToDrag = event.currentTarget;
    const clone = nodeToDrag.cloneNode(true) as HTMLElement;

    clone.style.position = 'absolute';
    clone.style.left = '-9999px';
    document.body.appendChild(clone);

    const rect = nodeToDrag.getBoundingClientRect();
    const offsetX = event.clientX - rect.left;
    const offsetY = event.clientY - rect.top;
    event.dataTransfer.setDragImage(clone, offsetX, offsetY);
    
    (nodeToDrag as HTMLElement).style.opacity = '0';

    requestAnimationFrame(() => {
        document.body.removeChild(clone);
    });

    const offset = { x: offsetX, y: offsetY };
    onCardDragStart(card, location, offset);
  }, [card, location, onCardDragStart]);

  const handleDragEnd = useCallback((event: React.DragEvent) => {
    (event.currentTarget as HTMLElement).style.opacity = '1';
  }, []);

  return (
    <Card
      card={card}
      imageDirectoryHandle={rest.imageDirectoryHandle}
      isTapped={card.isTapped}
      isFlipped={card.isFlipped}
      isBoardRotated={isBoardRotated}
      isHighlighted={isHighlighted}
      heldCounter={heldCounter}
      onCounterApply={onCounterApply}
      onCustomCounterApply={onCustomCounterApply}
      onCounterRemove={onCounterRemove}
      onRemoveAllCounters={onRemoveAllCounters}
      onCounterSelect={onCounterSelect}
      onTap={() => rest.onCardTap(card.instanceId!)}
      onFlip={() => rest.onCardFlip(card.instanceId!)}
      onContextMenu={(e) => rest.onCardContextMenu(e, card)}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onCardHover={rest.onCardHover} 
      style={style}
    />
  );
});

interface PlayerZoneProps {
  playerState: PlayerState;
  isFlipped: boolean;
  isViewRotated: boolean;
  imagesDirectoryHandle: FileSystemDirectoryHandle | null;
  playAreaLayout: 'rows' | 'freeform';
  freeformCardSizes: {[playerId: string]: number};
  handHeight: number;
  heldCounter: string | null;
  onCounterApply: (cardInstanceId: string, counterType: string) => void;
  onCustomCounterApply: (cardInstanceId: string, counterType: string) => void;
  onCounterRemove: (cardInstanceId: string, counterType: string) => void;
  onRemoveAllCounters: (cardInstanceId: string, counterType: string) => void;
  onCounterSelect: (counterType: string) => void;
  onCardTap: (cardInstanceId: string) => void;
  onCardFlip: (cardInstanceId: string) => void;
  onCardContextMenu: (event: React.MouseEvent, card: CardType) => void;
  onLibraryContextMenu: (event: React.MouseEvent, playerId: string) => void;
  onUpdateFreeformCardSize: (playerId: string, delta: number) => void;
  onHandResize: (deltaY: number) => void;
  onCardDragStart: (card: CardType, source: CardLocation, offset: {x: number, y: number}) => void;
  onLibraryDragStart: (source: CardLocation, offset: {x: number, y: number}) => void;
  onZoneDrop: (destination: CardLocation, event: React.DragEvent) => void;
  onZoneDragOver: (event: React.DragEvent, destination: CardLocation) => void;
  onZoneDragLeave: (event: React.DragEvent) => void;
  dropTarget: CardLocation | null;
  onCardHover: (card: CardType | null) => void;
  cardSize: number;
  hoveredStackCardId: string | null;
}

const PlayerZone: React.FC<PlayerZoneProps> = ({ 
  playerState, 
  isFlipped,
  isViewRotated,
  imagesDirectoryHandle, 
  playAreaLayout,
  freeformCardSizes,
  handHeight,
  onCardTap, 
  onCardFlip, 
  onCardContextMenu,
  onLibraryContextMenu,
  onUpdateFreeformCardSize,
  onHandResize,
  onCardDragStart,
  onLibraryDragStart,
  onZoneDrop,
  onZoneDragOver,
  onZoneDragLeave,
  dropTarget,
  onCardHover,
  hoveredStackCardId,
  heldCounter,
  onCounterApply,
  onCustomCounterApply,
  onCounterRemove,
  onRemoveAllCounters,
  onCounterSelect
}) => {
  const playerZoneClasses = `player-zone ${isFlipped ? 'flipped' : ''}`;
  const playerId = playerState.id;
  const isResizing = useRef(false);
  const lastY = useRef(0);
  const handRef = useRef<HTMLDivElement>(null);
  const commandZoneRef = useRef<HTMLDivElement>(null);
  const [handWidth, setHandWidth] = useState(0);
  const [commandZoneCardWidth, setCommandZoneCardWidth] = useState(0);

  const numCommanders = playerState.commandZone.length;

  useEffect(() => {
    const commandZoneElement = commandZoneRef.current;
    if (commandZoneElement && numCommanders > 0) {
      const resizeObserver = new ResizeObserver(() => {
        setCommandZoneCardWidth(commandZoneElement.offsetWidth / numCommanders);
      });
      resizeObserver.observe(commandZoneElement);
      return () => resizeObserver.disconnect();
    }
  }, [numCommanders, playAreaLayout]);

  useEffect(() => {
    if (handRef.current) {
        const resizeObserver = new ResizeObserver(entries => {
            for (let entry of entries) {
                setHandWidth(entry.contentRect.width);
            }
        });
        resizeObserver.observe(handRef.current);
        return () => resizeObserver.disconnect();
    }
  }, []);
  
  const { cardRows, handCardStyle } = useMemo(() => {
    const handCards = playerState.hand;
    if (!handWidth || handCards.length === 0 || handHeight <= 30) {
      return { cardRows: [handCards], handCardStyle: {} };
    }

    const cardAspectRatio = 63 / 88;
    const cardGap = 5;
    const containerPadding = 10;
    const containerWidth = handWidth;
    
    let numRows = 1;
    let finalCardHeight = 0;

    const singleRowShrunkWidth = (containerWidth - (handCards.length - 1) * cardGap) / handCards.length;
    const singleRowShrunkHeight = singleRowShrunkWidth / cardAspectRatio;

    if (singleRowShrunkHeight >= handHeight / 1.9 || handCards.length === 1) {
        numRows = 1;
        const idealFullHeight = handHeight - containerPadding;
        finalCardHeight = Math.min(singleRowShrunkHeight, idealFullHeight);
    } else {
        let calculatedNumRows = 2;
        for (let n = 2; n <= handCards.length; n++) {
            const rowHeight = handHeight / n;
            const cardHeightInRow = rowHeight - (containerPadding / n);

            if (cardHeightInRow <= 0) {
                calculatedNumRows = n;
                break;
            }

            const cardWidthInRow = cardHeightInRow * cardAspectRatio;
            const cardsThatFitPerRow = Math.floor((containerWidth + cardGap) / (cardWidthInRow + cardGap));

            if (cardsThatFitPerRow <= 0) {
                calculatedNumRows = n;
                break;
            }
            
            const neededRows = Math.ceil(handCards.length / cardsThatFitPerRow);
            
            if (neededRows <= n) {
                calculatedNumRows = n;
                break;
            }
        }
        
        numRows = calculatedNumRows;
        const finalRowHeight = handHeight / numRows;
        finalCardHeight = finalRowHeight - (containerPadding / numRows);
    }

    const style = {
        height: `${finalCardHeight}px`,
    };

    const cardsToDistribute = [...handCards];
    const rows: CardType[][] = [];
    if (numRows > 0) {
        const cardsPerRow = Math.ceil(cardsToDistribute.length / numRows);
        for (let i = 0; i < numRows; i++) {
            if (cardsToDistribute.length > 0) {
                rows.push(cardsToDistribute.splice(0, cardsPerRow));
            }
        }
    }
    
    return { cardRows: rows, handCardStyle: style };

  }, [handWidth, playerState.hand, handHeight]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    lastY.current = e.clientY;
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';

    const handleMouseMove = (event: MouseEvent) => {
      if (!isResizing.current) return;
      const deltaY = event.clientY - lastY.current;
      lastY.current = event.clientY;
      onHandResize(isFlipped ? deltaY : -deltaY);
    };

    const handleMouseUp = () => {
      isResizing.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [onHandResize, isFlipped]);

  const renderGameCard = (card: CardType, location: Omit<CardLocation, 'playerId'>) => {
    const source: CardLocation = { ...location, playerId };
    
    const isFreeformBattlefield = playAreaLayout === 'freeform' && location.zone === 'battlefield';
    const size = isFreeformBattlefield ? freeformCardSizes[playerId] : undefined;
    
    const cardStyle = (size && card.x !== undefined && card.y !== undefined)
      ? {
          position: 'absolute' as const,
          top: `${card.y}px`,
          width: `${size}px`,
          height: `${size * 1.4}px`,
          ...(isFlipped ? { right: `${card.x}px` } : { left: `${card.x}px` })
        }
      : {};
    
    const finalBoardRotation = isFlipped ? !isViewRotated : false;

    return (
      <GameCardRenderer
        key={`${location.zone}-${card.instanceId}`}
        card={card}
        location={source}
        isBoardRotated={finalBoardRotation}
        imageDirectoryHandle={imagesDirectoryHandle}
        heldCounter={heldCounter}
        onCounterApply={onCounterApply}
        onCustomCounterApply={onCustomCounterApply}
        onCounterRemove={onCounterRemove}
        onRemoveAllCounters={onRemoveAllCounters}
        onCounterSelect={onCounterSelect}
        onCardTap={onCardTap}
        onCardFlip={onCardFlip}
        onCardContextMenu={onCardContextMenu}
        onCardDragStart={onCardDragStart}
        onCardHover={onCardHover} 
        isHighlighted={!!(hoveredStackCardId && card.instanceId === hoveredStackCardId)}
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

  const commandZoneStyle: React.CSSProperties = {
    aspectRatio: `${63 * Math.max(1, numCommanders)} / 88`,
  };

  if (isFlipped && numCommanders > 1 && playAreaLayout === 'freeform') {
    const offset = commandZoneCardWidth * (numCommanders - 1);
    commandZoneStyle.left = `-${offset}px`;
  }

  const commandZoneJsx = (
      <div {...getZoneProps({ zone: 'commandZone' })} title="Command Zone" style={commandZoneStyle} ref={commandZoneRef}>
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
          const nodeToDrag = e.currentTarget;
          const clone = nodeToDrag.cloneNode(true) as HTMLElement;
          clone.style.position = 'absolute';
          clone.style.left = '-9999px';
          document.body.appendChild(clone);
          
          const rect = e.currentTarget.getBoundingClientRect();
          const offsetX = e.clientX - rect.left;
          const offsetY = e.clientY - rect.top;
          e.dataTransfer.setDragImage(clone, offsetX, offsetY);
          
          (nodeToDrag as HTMLElement).style.opacity = '0';

          requestAnimationFrame(() => {
              document.body.removeChild(clone);
          });
          
          const offset = { x: offsetX, y: offsetY };
          onLibraryDragStart({ playerId, zone: 'library' }, offset);
        }}
        onDragEnd={(e) => {
            (e.currentTarget as HTMLElement).style.opacity = '1';
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
            {playerState.library.length > 0 ? <img src={cardBackUrl} alt="Card back" className={`card-back-image ${(isFlipped && !isViewRotated) ? 'rotated' : ''}`} /> : <span className="zone-label-full">Library</span>}
            {playerState.library.length > 0 && <span className="zone-count">{playerState.library.length}</span>}
        </div>
      </div>
  );
  
  const zones = isFlipped 
    ? [libraryZoneJsx, graveyardZoneJsx, exileZoneJsx, commandZoneJsx] 
    : [commandZoneJsx, exileZoneJsx, graveyardZoneJsx, libraryZoneJsx];

  const playerCounters = playerState.counters ? Object.entries(playerState.counters).map(([type, amount]) => `${type}: ${amount}`).join(', ') : '';


  return (
    <div className={playerZoneClasses} style={{ '--player-color': playerState.color } as React.CSSProperties}>
      <div className="player-header">
        <h3>
            {playerState.name}: {playerState.life} Life
            {playerCounters && <span className="player-counters"> ({playerCounters})</span>}
        </h3>
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
        ref={handRef}
        className={`hand ${dropTarget?.playerId === playerId && dropTarget?.zone === 'hand' ? 'drop-target' : ''}`}
        style={{ height: `${handHeight}px` }}
        onDragOver={(e) => onZoneDragOver(e, { playerId, zone: 'hand' })}
        onDragLeave={onZoneDragLeave}
        onDrop={(e) => { e.stopPropagation(); onZoneDrop({ playerId, zone: 'hand' }, e); }}
      >
        <div className="hand-resizer" onMouseDown={handleMouseDown}></div>
        {cardRows.map((row, rowIndex) => (
            <div key={rowIndex} className="hand-row">
                {row.map((card) => {
                  const finalBoardRotation = isFlipped ? !isViewRotated : false;
                  return (
                    <GameCardRenderer
                      key={`hand-${card.instanceId}`}
                      card={card}
                      location={{ playerId, zone: 'hand' }}
                      isBoardRotated={finalBoardRotation}
                      imageDirectoryHandle={imagesDirectoryHandle}
                      heldCounter={heldCounter}
                      onCounterApply={onCounterApply}
                      onCustomCounterApply={onCustomCounterApply}
                      onCounterSelect={onCounterSelect}
                      onCounterRemove={onCounterRemove}
                      onRemoveAllCounters={onRemoveAllCounters}
                      onCardTap={onCardTap}
                      onCardFlip={onCardFlip}
                      onCardContextMenu={onCardContextMenu}
                      onCardDragStart={onCardDragStart}
                      onCardHover={onCardHover}
                      isHighlighted={!!(hoveredStackCardId && card.instanceId === hoveredStackCardId)}
                      style={handCardStyle}
                    />
                  );
                })}
            </div>
        ))}
      </div>
    </div>
  );
};

export default React.memo(PlayerZone);