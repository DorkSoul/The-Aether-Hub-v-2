// src/components/Layouts/TabsLayout.tsx
import React, { useState, useCallback, useEffect, useRef } from 'react';
import type { PlayerState, Card as CardType, CardLocation } from '../../types';
import PlayerZone from '../PlayerZone/PlayerZone';
import './Layouts.css';

interface TabsLayoutProps {
  playerStates: PlayerState[];
  imagesDirectoryHandle: FileSystemDirectoryHandle | null;
  activeOpponentId: string | null;
  playAreaLayout: 'rows' | 'freeform';
  freeformCardSizes: {[playerId: string]: number};
  handHeights: {[playerId: string]: number};
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
  isTopRotated: boolean;
  resetKey: number;
  globalActions: React.ReactNode;
  onPlayerCounterApply: (playerId: string, counterType: string) => void;
  onPlayerCounterRemove: (playerId: string, counterType: string) => void;
  onRemoveAllPlayerCounters: (playerId: string, counterType: string) => void;
  setHeldCounter: (counter: string | null) => void;
}

const TabsLayout: React.FC<TabsLayoutProps> = ({ playerStates, imagesDirectoryHandle, activeOpponentId, handHeights, onHandResize, cardPreview, stackPanel, hoveredStackCardId, isTopRotated, resetKey, globalActions, ...interactionProps }) => {
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
    <div className="game-layout-tabs" ref={layoutRef}>
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
            {...interactionProps}
          />
        ) : (
          <div className="game-loading">
            <p>No opponent to display.</p>
          </div>
        )}
        {stackPanel}
      </div>
      <div className="global-actions-bar">
        <div className="global-actions-bar-resizer top" onMouseDown={handleMouseDown}></div>
        {globalActions}
        <div className="global-actions-bar-resizer bottom" onMouseDown={handleMouseDown}></div>
      </div>
      <div className="bottom-section" style={{ height: `calc(100% - ${topSectionHeight}% - 34px)` }}>
        <PlayerZone
          playerState={localPlayer}
          isFlipped={false}
          isViewRotated={false}
          imagesDirectoryHandle={imagesDirectoryHandle}
          handHeight={handHeights[localPlayer.id]}
          onHandResize={(deltaY) => onHandResize(localPlayer.id, deltaY)}
          hoveredStackCardId={hoveredStackCardId}
          {...interactionProps}
        />
        {cardPreview}
      </div>
    </div>
  );
};

export default React.memo(TabsLayout);