// src/components/Layouts/LayoutTwo.tsx
import React, { useState, useRef, useCallback } from 'react';
import type { PlayerState, Card as CardType, CardLocation, ManaType } from '../../types';
import PlayerZone from '../PlayerZone/PlayerZone';
import './Layouts.css';

interface LayoutTwoProps {
  playerStates: PlayerState[];
  imagesDirectoryHandle: FileSystemDirectoryHandle | null;
  playAreaLayout: 'rows' | 'freeform';
  freeformCardSizes: {[playerId: string]: number};
  handHeights: {[playerId: string]: number};
  heldCounter: string | null;
  setHeldCounter: (counter: string | null) => void;
  onCounterApply: (cardInstanceId: string, counterType: string) => void;
  onCustomCounterApply: (cardInstanceId: string, counterType: string) => void;
  onPlayerCounterApply: (playerId: string, counterType: string) => void;
  onCounterRemove: (cardInstanceId: string, counterType: string) => void;
  onRemoveAllCounters: (cardInstanceId: string, counterType: string) => void;
  onCardTap: (cardInstanceId: string) => void;
  onCardFlip: (cardInstanceId: string) => void;
  onCardContextMenu: (event: React.MouseEvent, card: CardType) => void;
  onLibraryContextMenu: (event: React.MouseEvent, playerId: string) => void;
  onUpdateFreeformCardSize: (playerId: string, delta: number) => void;
  onHandResize: (playerId: string, deltaY: number) => void;
  onCardDragStart: (card: CardType, source: CardLocation, offset: {x: number, y: number}) => void;
  onLibraryDragStart: (source: CardLocation, offset: {x: number, y: number}) => void;
  onZoneDrop: (destination: CardLocation, event: React.DragEvent) => void;
  onZoneDragOver: (event: React.DragEvent, destination: CardLocation) => void;
  onZoneDragLeave: (event: React.DragEvent) => void;
  dropTarget: CardLocation | null;
  onCardHover: (card: CardType | null) => void;
  cardPreview: React.ReactNode;
  stackPanel: React.ReactNode;
  cardSize: number;
  hoveredStackCardId: string | null;
  onUpdateMana: (playerId: string, manaType: ManaType, delta: number) => void;
  onResetMana: (playerId: string) => void;
}

const LayoutTwo: React.FC<LayoutTwoProps> = ({ playerStates, imagesDirectoryHandle, cardPreview, stackPanel, handHeights, onHandResize, hoveredStackCardId, onUpdateMana, onResetMana, heldCounter, setHeldCounter, onCounterApply, onCustomCounterApply, onPlayerCounterApply, onCounterRemove, onRemoveAllCounters, ...interactionProps }) => {
  const topPlayers: PlayerState[] = [];
  const bottomPlayers: PlayerState[] = [];
  const [topSectionHeight, setTopSectionHeight] = useState(50);
  const layoutRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const startY = e.clientY;
    const startHeight = topSectionHeight;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = moveEvent.clientY - startY;
      if (layoutRef.current) {
        const newHeight = startHeight + (deltaY / layoutRef.current.clientHeight) * 100;
        setTopSectionHeight(Math.max(20, Math.min(80, newHeight)));
      }
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [topSectionHeight]);


  playerStates.forEach((player, index) => {
    if (index % 2 === 0) { 
      bottomPlayers.push(player);
    } else { 
      topPlayers.push(player);
    }
  });

  return (
    <div className="game-layout-split" ref={layoutRef}>
      <div className="top-players" style={{ height: `${topSectionHeight}%` }}>
        {topPlayers.map(player => (
          <PlayerZone
            key={player.id}
            playerState={player}
            isFlipped={true}
            imagesDirectoryHandle={imagesDirectoryHandle}
            handHeight={handHeights[player.id]}
            onHandResize={(deltaY) => onHandResize(player.id, deltaY)}
            hoveredStackCardId={hoveredStackCardId}
            onUpdateMana={onUpdateMana}
            onResetMana={onResetMana}
            heldCounter={heldCounter}
            setHeldCounter={setHeldCounter}
            onCounterApply={onCounterApply}
            onCustomCounterApply={onCustomCounterApply}
            onPlayerCounterApply={onPlayerCounterApply}
            onCounterRemove={onCounterRemove}
            onRemoveAllCounters={onRemoveAllCounters}
            {...interactionProps}
          />
        ))}
        {stackPanel}
      </div>
      <div className="layout-divider" onMouseDown={handleMouseDown}></div>
      <div className="bottom-players" style={{ height: `calc(100% - ${topSectionHeight}% - 2px)` }}>
        {bottomPlayers.map(player => (
          <PlayerZone
            key={player.id}
            playerState={player}
            isFlipped={false}
            imagesDirectoryHandle={imagesDirectoryHandle}
            handHeight={handHeights[player.id]}
            onHandResize={(deltaY) => onHandResize(player.id, deltaY)}
            hoveredStackCardId={hoveredStackCardId}
            onUpdateMana={onUpdateMana}
            onResetMana={onResetMana}
            heldCounter={heldCounter}
            setHeldCounter={setHeldCounter}
            onCounterApply={onCounterApply}
            onCustomCounterApply={onCustomCounterApply}
            onPlayerCounterApply={onPlayerCounterApply}
            onCounterRemove={onCounterRemove}
            onRemoveAllCounters={onRemoveAllCounters}
            {...interactionProps}
          />
        ))}
        {cardPreview}
      </div>
    </div>
  );
};

export default React.memo(LayoutTwo);