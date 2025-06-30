// src/components/Layouts/LayoutOne.tsx
import React, { useState, useCallback, useEffect, useRef } from 'react';
import type { PlayerState, Card as CardType, CardLocation, ManaType } from '../../types';
import PlayerZone from '../PlayerZone/PlayerZone';
import './Layouts.css';

interface LayoutOneProps {
  playerStates: PlayerState[];
  imagesDirectoryHandle: FileSystemDirectoryHandle | null;
  activeOpponentId: string | null;
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
  isTopRotated: boolean;
  resetKey: number;
}

const LayoutOne: React.FC<LayoutOneProps> = ({ playerStates, imagesDirectoryHandle, activeOpponentId, handHeights, onHandResize, cardPreview, stackPanel, hoveredStackCardId, onUpdateMana, onResetMana, heldCounter, setHeldCounter, onCounterApply, onCustomCounterApply, onPlayerCounterApply, onCounterRemove, onRemoveAllCounters, isTopRotated, resetKey, ...interactionProps }) => {
  const localPlayer = playerStates[0];
  const opponents = playerStates.slice(1);
  const activeOpponent = opponents.find(p => p.id === activeOpponentId);
  const [topSectionHeight, setTopSectionHeight] = useState(50);
  const layoutRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTopSectionHeight(50);
  }, [resetKey]);

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

  return (
    <div className="game-layout-1vAll" ref={layoutRef}>
      <div className="top-section" style={{ height: `${topSectionHeight}%` }}>
        {activeOpponent ? (
          <PlayerZone
            playerState={activeOpponent}
            isFlipped={true}
            isViewRotated={isTopRotated}
            imagesDirectoryHandle={imagesDirectoryHandle}
            handHeight={handHeights[activeOpponent.id]}
            onHandResize={(deltaY) => onHandResize(activeOpponent.id, deltaY)}
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
        ) : (
          <div className="game-loading">
            <p>No opponent to display.</p>
          </div>
        )}
        {stackPanel}
      </div>
      <div className="layout-divider" onMouseDown={handleMouseDown}></div>
      <div className="bottom-section" style={{ height: `calc(100% - ${topSectionHeight}% - 2px)` }}>
        <PlayerZone
          playerState={localPlayer}
          isFlipped={false}
          isViewRotated={false}
          imagesDirectoryHandle={imagesDirectoryHandle}
          handHeight={handHeights[localPlayer.id]}
          onHandResize={(deltaY) => onHandResize(localPlayer.id, deltaY)}
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
        {cardPreview}
      </div>
    </div>
  );
};

export default React.memo(LayoutOne);