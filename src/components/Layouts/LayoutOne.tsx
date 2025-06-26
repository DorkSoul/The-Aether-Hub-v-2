// src/components/Layouts/LayoutOne.tsx
import React from 'react';
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
}

const LayoutOne: React.FC<LayoutOneProps> = ({ playerStates, imagesDirectoryHandle, activeOpponentId, handHeights, onHandResize, cardPreview, stackPanel, hoveredStackCardId, onUpdateMana, ...interactionProps }) => {
  const localPlayer = playerStates[0];
  const opponents = playerStates.slice(1);
  const activeOpponent = opponents.find(p => p.id === activeOpponentId);

  return (
    <div className="game-layout-1vAll">
      <div className="top-section">
        {activeOpponent ? (
          <PlayerZone
            playerState={activeOpponent}
            isFlipped={true}
            imagesDirectoryHandle={imagesDirectoryHandle}
            handHeight={handHeights[activeOpponent.id]}
            onHandResize={(deltaY) => onHandResize(activeOpponent.id, deltaY)}
            hoveredStackCardId={hoveredStackCardId}
            onUpdateMana={onUpdateMana}
            {...interactionProps}
          />
        ) : (
          <div className="game-loading">
            <p>No opponent to display.</p>
          </div>
        )}
        {stackPanel}
      </div>
      <div className="bottom-section">
        <PlayerZone
          playerState={localPlayer}
          isFlipped={false}
          imagesDirectoryHandle={imagesDirectoryHandle}
          handHeight={handHeights[localPlayer.id]}
          onHandResize={(deltaY) => onHandResize(localPlayer.id, deltaY)}
          hoveredStackCardId={hoveredStackCardId}
          onUpdateMana={onUpdateMana}
          {...interactionProps}
        />
        {cardPreview}
      </div>
    </div>
  );
};

export default React.memo(LayoutOne);