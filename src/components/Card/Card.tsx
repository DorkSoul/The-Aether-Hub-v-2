// src/components/Card/Card.tsx
import React, { useState, useEffect, useMemo } from 'react';
import type { Card as CardType } from '../../types';
import { getAndCacheCardImageUrl } from '../../utils/imageCaching';
import './Card.css';

interface CardProps {
  card: CardType;
  imageDirectoryHandle: FileSystemDirectoryHandle | null;
  onContextMenu?: (event: React.MouseEvent) => void;
  isTapped?: boolean;
  isFlipped?: boolean; 
  isHighlighted?: boolean;
  heldCounter?: string | null;
  onCounterApply?: (cardInstanceId: string, counterType: string) => void;
  onCounterRemove?: (cardInstanceId: string, counterType: string) => void;
  onFlip?: () => void;
  onTap?: () => void;
  onDragStart?: (event: React.DragEvent) => void;
  onDragEnd?: (event: React.DragEvent) => void;
  onCardHover?: (card: CardType | null) => void;
  style?: React.CSSProperties;
}

interface SingleCardViewProps {
  name: string;
  imageUrl: string | null;
  power?: string;
  toughness?: string;
  counters?: { [key: string]: number };
}

const SingleCardView: React.FC<SingleCardViewProps> = ({ name, imageUrl, power, toughness, counters }) => {
    const calculateModifiedStats = () => {
        if (power === undefined || toughness === undefined) return null;

        let powerMod = 0;
        let toughnessMod = 0;
        
        if (counters) {
            for (const [type, count] of Object.entries(counters)) {
                const parts = type.split('/');
                powerMod += parseInt(parts[0], 10) * count;
                toughnessMod += parseInt(parts[1], 10) * count;
            }
        }
        
        const basePower = isNaN(parseInt(power, 10)) ? 0 : parseInt(power, 10);
        const baseToughness = isNaN(parseInt(toughness, 10)) ? 0 : parseInt(toughness, 10);

        if (powerMod === 0 && toughnessMod === 0) return null;

        return {
            power: basePower + powerMod,
            toughness: baseToughness + toughnessMod,
        };
    };

    const modifiedStats = calculateModifiedStats();

    return (
        <div className="card">
            <img src={imageUrl || ''} alt={name} />
            {modifiedStats && (
                <div className="pt-overlay">
                    <svg viewBox="0 0 50 20" preserveAspectRatio="xMidYMid meet">
                        <text
                            x="50%"
                            y="60%"
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fontSize="16"
                            fill="white"
                        >
                            {modifiedStats.power} / {modifiedStats.toughness}
                        </text>
                    </svg>
                </div>
            )}
        </div>
    );
};

const Card: React.FC<CardProps> = ({ card, imageDirectoryHandle, onContextMenu, isTapped = false, isFlipped: isFlippedProp, onFlip, onTap, onDragStart, onDragEnd, onCardHover, style, isHighlighted = false, heldCounter, onCounterApply, onCounterRemove }) => {
  const [isFlippedLocal, setIsFlippedLocal] = useState(false);
  const [frontImageUrl, setFrontImageUrl] = useState<string | null>(null);
  const [backImageUrl, setBackImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPinged, setIsPinged] = useState(false);

  const flippableLayouts = ['transform', 'modal_dfc', 'double_faced_token', 'art_series', 'reversible_card', 'meld'];
  const isFlippable = flippableLayouts.includes(card.layout || '');

  const isFlipStateControlled = isFlippedProp !== undefined;

  const isFlipped = isFlipStateControlled ? (isFlippedProp || false) : isFlippedLocal;

  useEffect(() => {
    let isMounted = true;
    const loadedUrls: string[] = [];

    const loadImages = async () => {
      if (!isMounted) return;
      setIsLoading(true);
      
      const frontUrl = await getAndCacheCardImageUrl(card, imageDirectoryHandle, 0);
      if (isMounted) setFrontImageUrl(frontUrl);
      if (frontUrl?.startsWith('blob:')) loadedUrls.push(frontUrl);

      if (isFlippable) {
        const backCardSource = card.layout === 'meld' ? card.meld_result_card : card;
        const faceIndexForBack = card.layout === 'meld' ? 0 : 1;
        
        if (backCardSource) {
          const backUrl = await getAndCacheCardImageUrl(backCardSource, imageDirectoryHandle, faceIndexForBack);
          if (isMounted) setBackImageUrl(backUrl);
          if (backUrl?.startsWith('blob:')) loadedUrls.push(backUrl);
        }
      }
      
      if(isMounted) setIsLoading(false);
    };

    loadImages();

    return () => {
      isMounted = false;
      loadedUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [card.id, card.layout, imageDirectoryHandle]);

  const handlePrimaryAction = () => { // Typically left-click
    if (onTap) {
      onTap();
    } else if (!isFlipStateControlled && isFlippable) {
      setIsFlippedLocal(f => !f);
    }
  };

  const handleSecondaryAction = () => { // Typically Ctrl+Click
    if (onFlip) {
      onFlip();
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (heldCounter && onCounterRemove) {
        onCounterRemove(card.instanceId!, heldCounter);
        return; 
    }

    if (onContextMenu) {
      onContextMenu(e);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1) { // Middle mouse button
        e.preventDefault();
        e.stopPropagation();
        setIsPinged(true);
        setTimeout(() => {
            setIsPinged(false);
        }, 1800); // Highlight for 3 animation cycles
    }
  };
  
  const flipperClasses = `card-flipper ${isTapped ? 'tapped' : ''} ${isHighlighted || isPinged ? 'highlight-attention' : ''}`;
  
  let title = card.name;
  if (onTap || onFlip) {
      title = "Click to Tap, Ctrl+Click to Flip, Drag to Move";
  } else if (isFlippable && !isFlipStateControlled) {
      title = "Click to Flip";
  }
      
  const clickHandler = (e: React.MouseEvent) => {
      e.stopPropagation();

      if (heldCounter && onCounterApply) {
        onCounterApply(card.instanceId!, heldCounter);
        return; 
      }
      
      const canBeInteractedWith = !!onTap || !!onFlip || (isFlippable && !isFlipStateControlled);
      if (!canBeInteractedWith) return;

      if (e.ctrlKey) {
          handleSecondaryAction();
      } else {
          handlePrimaryAction();
      }
  };
  
  const baseDivProps = {
    className: flipperClasses,
    style: style,
    onContextMenu: handleContextMenu,
    onMouseDown: handleMouseDown,
    title: title,
    draggable: !heldCounter && !!onDragStart,
    onDragStart: onDragStart,
    onDragEnd: onDragEnd,
    onMouseEnter: () => onCardHover?.(card),
  };
  
  if (isLoading) {
    return (
      <div {...baseDivProps}>
        <SingleCardView name={card.name} imageUrl={null} />
      </div>
    );
  }

  const { power, toughness, counters } = card;

  if (isFlippable) {
    const frontName = card.card_faces?.[0]?.name || card.name;
    const backName = (card.layout === 'meld' ? card.meld_result_card?.name : card.card_faces?.[1]?.name) || 'Card Back';

    return (
      <div 
        {...baseDivProps}
        onClick={clickHandler} 
      >
        <div className={`card-inner ${isFlipped ? 'flipped' : ''}`}>
          <div className="card-front">
            <SingleCardView name={frontName} imageUrl={frontImageUrl} power={card.card_faces?.[0]?.power || power} toughness={card.card_faces?.[0]?.toughness || toughness} counters={counters} />
          </div>
          <div className="card-back">
            <SingleCardView name={backName} imageUrl={backImageUrl} power={card.card_faces?.[1]?.power} toughness={card.card_faces?.[1]?.toughness} counters={counters} />
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div 
        {...baseDivProps}
        onClick={clickHandler} 
    >
        <SingleCardView name={card.name} imageUrl={frontImageUrl} power={power} toughness={toughness} counters={counters} />
    </div>
  );
};

export default React.memo(Card);