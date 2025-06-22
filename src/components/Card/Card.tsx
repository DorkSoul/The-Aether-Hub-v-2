// src/components/Card/Card.tsx
import React, { useState, useEffect } from 'react';
import type { Card as CardType } from '../../types';
import { getAndCacheCardImageUrl } from '../../utils/imageCaching';
import './Card.css';

interface CardProps {
  card: CardType;
  imageDirectoryHandle: FileSystemDirectoryHandle | null;
  onContextMenu?: (event: React.MouseEvent) => void;
  isTapped?: boolean;
  isFlipped?: boolean; // This prop dictates the flipped state when provided
  onFlip?: () => void;
  onTap?: () => void;
  onDragStart?: (event: React.DragEvent) => void;
  onCardHover?: (card: CardType | null) => void;
  style?: React.CSSProperties;
}

interface SingleCardViewProps {
  name: string;
  imageUrl: string | null;
}

const SingleCardView: React.FC<SingleCardViewProps> = ({ name, imageUrl }) => {
  if (!imageUrl) {
    return (
      <div className="card card-placeholder">
        <p>{name}</p>
        <p>(Loading...)</p>
      </div>
    );
  }
  return (
    <div className="card">
      <img src={imageUrl} alt={name} />
    </div>
  );
};

const Card: React.FC<CardProps> = ({ card, imageDirectoryHandle, onContextMenu, isTapped = false, isFlipped: isFlippedProp, onFlip, onTap, onDragStart, onCardHover, style }) => {
  const [isFlippedLocal, setIsFlippedLocal] = useState(false);
  const [frontImageUrl, setFrontImageUrl] = useState<string | null>(null);
  const [backImageUrl, setBackImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
    if (onContextMenu) {
      e.preventDefault();
      e.stopPropagation();
      onContextMenu(e);
    }
  };
  
  const flipperClasses = `card-flipper ${isTapped ? 'tapped' : ''}`;
  
  let title = card.name;
  if (onTap || onFlip) {
      title = "Click to Tap, Ctrl+Click to Flip, Drag to Move";
  } else if (isFlippable && !isFlipStateControlled) {
      title = "Click to Flip";
  }
      
  const clickHandler = (e: React.MouseEvent) => {
      e.stopPropagation();
      
      // --- MODIFIED --- This now correctly allows clicks for uncontrolled flippable cards.
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
    title: title,
    draggable: !!onDragStart,
    onDragStart: onDragStart,
    onMouseEnter: () => onCardHover?.(card),
  };
  
  if (isLoading) {
    return (
      <div {...baseDivProps}>
        <SingleCardView name={card.name} imageUrl={null} />
      </div>
    );
  }

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
            <SingleCardView name={frontName} imageUrl={frontImageUrl} />
          </div>
          <div className="card-back">
            <SingleCardView name={backName} imageUrl={backImageUrl} />
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
        <SingleCardView name={card.name} imageUrl={frontImageUrl} />
    </div>
  );
};

export default React.memo(Card);