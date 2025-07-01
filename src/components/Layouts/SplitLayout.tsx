// src/components/Layouts/SplitLayout.tsx
import React, { useState, useRef, useCallback, useEffect } from 'react';
import type { PlayerState, Card as CardType, CardLocation } from '../../types';
import PlayerZone from '../PlayerZone/PlayerZone';
import './Layouts.css';

interface SplitLayoutProps {
  playerStates: PlayerState[];
  imagesDirectoryHandle: FileSystemDirectoryHandle | null;
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
  onUpdateLife: (playerId: string, delta: number) => void;
}

const ResizableSection: React.FC<{
    players: PlayerState[];
    isFlipped: boolean;
    isViewRotated: boolean;
    commonProps: Omit<SplitLayoutProps, 'playerStates' | 'cardPreview' | 'stackPanel' | 'isTopRotated' | 'resetKey' | 'globalActions'>;
    resetKey: number;
}> = ({ players, isFlipped, isViewRotated, commonProps, resetKey }) => {
    const [widths, setWidths] = useState<number[]>([]);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (players.length > 0) {
            setWidths(Array(players.length).fill(100 / players.length));
        }
    }, [players.length, resetKey]);

    const createHorizontalResizeHandler = (index: number) => (e: React.MouseEvent<HTMLDivElement>) => {
        e.preventDefault();
        const resizer = e.currentTarget as HTMLElement;
        const leftElement = resizer.previousElementSibling as HTMLElement;
        const rightElement = resizer.nextElementSibling as HTMLElement;

        if (!leftElement || !rightElement) return;
        
        const startX = e.clientX;
        const startLeftWidth = leftElement.offsetWidth;
        const startRightWidth = rightElement.offsetWidth;

        const handleMouseMove = (moveEvent: MouseEvent) => {
            const deltaX = moveEvent.clientX - startX;
            const totalWidth = startLeftWidth + startRightWidth;
            
            let newLeftWidth = startLeftWidth + deltaX;
            let newRightWidth = startRightWidth - deltaX;

            const minWidth = totalWidth * 0.15; // Minimum 15% width
            if (newLeftWidth < minWidth) {
                newLeftWidth = minWidth;
                newRightWidth = totalWidth - newLeftWidth;
            }
            if (newRightWidth < minWidth) {
                newRightWidth = minWidth;
                newLeftWidth = totalWidth - newRightWidth;
            }

            const newWidths = [...widths];
            const totalPercentage = widths[index] + widths[index + 1];
            newWidths[index] = (newLeftWidth / totalWidth) * totalPercentage;
            newWidths[index + 1] = (newRightWidth / totalWidth) * totalPercentage;

            setWidths(newWidths);
        };

        const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    return (
        <div className="resizable-player-area" ref={containerRef}>
            {players.map((player, i) => (
                <React.Fragment key={player.id}>
                    <div style={{ width: `${widths[i]}%`, display: 'flex' }}>
                        <PlayerZone
                            playerState={player}
                            isFlipped={isFlipped}
                            isViewRotated={isViewRotated}
                            handHeight={commonProps.handHeights[player.id]}
                            onHandResize={(deltaY) => commonProps.onHandResize(player.id, deltaY)}
                            imagesDirectoryHandle={commonProps.imagesDirectoryHandle}
                            playAreaLayout={commonProps.playAreaLayout}
                            freeformCardSizes={commonProps.freeformCardSizes}
                            heldCounter={commonProps.heldCounter}
                            onCounterApply={commonProps.onCounterApply}
                            onCustomCounterApply={commonProps.onCustomCounterApply}
                            onCounterRemove={commonProps.onCounterRemove}
                            onRemoveAllCounters={commonProps.onRemoveAllCounters}
                            onCounterSelect={commonProps.onCounterSelect}
                            onCardTap={commonProps.onCardTap}
                            onCardFlip={commonProps.onCardFlip}
                            onCardContextMenu={commonProps.onCardContextMenu}
                            onLibraryContextMenu={commonProps.onLibraryContextMenu}
                            onUpdateFreeformCardSize={commonProps.onUpdateFreeformCardSize}
                            onCardDragStart={commonProps.onCardDragStart}
                            onLibraryDragStart={commonProps.onLibraryDragStart}
                            onZoneDrop={commonProps.onZoneDrop}
                            onZoneDragOver={commonProps.onZoneDragOver}
                            onZoneDragLeave={commonProps.onZoneDragLeave}
                            dropTarget={commonProps.dropTarget}
                            onCardHover={commonProps.onCardHover}
                            cardSize={commonProps.cardSize}
                            hoveredStackCardId={commonProps.hoveredStackCardId}
                            onPlayerCounterApply={commonProps.onPlayerCounterApply}
                            onPlayerCounterRemove={commonProps.onPlayerCounterRemove}
                            onRemoveAllPlayerCounters={commonProps.onRemoveAllPlayerCounters}
                            setHeldCounter={commonProps.setHeldCounter}
                            onUpdateLife={commonProps.onUpdateLife}
                        />
                    </div>
                    {i < players.length - 1 && (
                        <div className="layout-divider-horizontal" onMouseDown={createHorizontalResizeHandler(i)}></div>
                    )}
                </React.Fragment>
            ))}
        </div>
    );
};


const SplitLayout: React.FC<SplitLayoutProps> = (props) => {
  const [topSectionHeight, setTopSectionHeight] = useState(50);
  const layoutRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTopSectionHeight(50);
  }, [props.resetKey]);

  const handleVerticalMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
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
  
  const topPlayers = props.playerStates.filter((_, index) => index % 2 !== 0);
  const bottomPlayers = props.playerStates.filter((_, index) => index % 2 === 0);

  const { playerStates, cardPreview, stackPanel, isTopRotated, resetKey, globalActions, ...commonProps } = props;

  return (
    <div className="game-layout-split" ref={layoutRef}>
      <div className="top-players" style={{ height: `${topSectionHeight}%` }}>
        <ResizableSection players={topPlayers} isFlipped={true} isViewRotated={isTopRotated} commonProps={commonProps} resetKey={resetKey} />
        {stackPanel}
      </div>
      <div className="global-actions-bar">
        <div className="global-actions-bar-resizer top" onMouseDown={handleVerticalMouseDown}></div>
        {globalActions}
        <div className="global-actions-bar-resizer bottom" onMouseDown={handleVerticalMouseDown}></div>
      </div>
      <div className="bottom-players" style={{ height: `calc(100% - ${topSectionHeight}% - 34px)` }}>
        <ResizableSection players={bottomPlayers} isFlipped={false} isViewRotated={false} commonProps={commonProps} resetKey={resetKey} />
        {cardPreview}
      </div>
    </div>
  );
};

export default React.memo(SplitLayout);