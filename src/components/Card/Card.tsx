// src/components/Card/Card.tsx
import React, { useState, useEffect } from 'react';
import type { Card as CardType } from '../../types';
import { getAndCacheCardImageUrl } from '../../utils/imageCaching';
import './Card.css';

interface CardProps {
  card: CardType;
  imageDirectoryHandle: FileSystemDirectoryHandle | null;
  size?: number;
  onContextMenu?: (event: React.MouseEvent) => void;
  isTapped?: boolean;
  isFlipped?: boolean;
  onFlip?: () => void;
  onTap?: () => void;
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

const Card: React.FC<CardProps> = ({ card, imageDirectoryHandle, size, onContextMenu, isTapped = false, isFlipped: isFlippedProp, onFlip, onTap }) => {
  const [isFlippedLocal, setIsFlippedLocal] = useState(false);
  const [frontImageUrl, setFrontImageUrl] = useState<string | null>(null);
  const [backImageUrl, setBackImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const flippableLayouts = ['transform', 'modal_dfc', 'double_faced_token', 'art_series', 'reversible_card', 'meld'];
  const isFlippable = flippableLayouts.includes(card.layout || '');
  
  const isControlled = onFlip !== undefined || onTap !== undefined;
  const isFlipped = isControlled ? (isFlippedProp || false) : isFlippedLocal;

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
  }, [card, imageDirectoryHandle, isFlippable]);

  const handlePrimaryAction = () => { // Typically left-click
    if (isControlled) {
      if (onTap) onTap();
    } else {
      if (isFlippable) setIsFlippedLocal(f => !f);
    }
  };

  const handleSecondaryAction = () => { // Typically Ctrl+Click
      if (isFlippable) {
        if (isControlled) {
            if (onFlip) onFlip();
        } else {
            setIsFlippedLocal(f => !f);
        }
      }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    if (onContextMenu) {
      e.preventDefault();
      e.stopPropagation();
      onContextMenu(e);
    }
  };
  
  const cardStyle = size ? { width: `${size}px`, height: `${size * 1.4}px` } : {};
  const flipperClasses = `card-flipper ${isTapped ? 'tapped' : ''}`;
  const title = isControlled
      ? "Click to Tap, Ctrl+Click to Flip"
      : isFlippable ? "Click to Flip" : card.name;
      
  const clickHandler = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (e.ctrlKey) {
          handleSecondaryAction();
      } else {
          handlePrimaryAction();
      }
  };
  
  if (isLoading) {
    return (
      <div className={flipperClasses} style={cardStyle} onContextMenu={handleContextMenu}>
        <SingleCardView name={card.name} imageUrl={null} />
      </div>
    );
  }

  if (isFlippable) {
    const frontName = card.card_faces?.[0]?.name || card.name;
    const backName = (card.layout === 'meld' ? card.meld_result_card?.name : card.card_faces?.[1]?.name) || 'Card Back';

    return (
      <div 
        className={flipperClasses}
        style={cardStyle}
        onClick={clickHandler} 
        onContextMenu={handleContextMenu}
        title={title}
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
        className={flipperClasses} 
        style={cardStyle} 
        onClick={clickHandler} 
        onContextMenu={handleContextMenu}
        title={title}
    >
        <SingleCardView name={card.name} imageUrl={frontImageUrl} />
    </div>
  );
};

export default Card;