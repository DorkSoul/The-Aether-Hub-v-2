// src/components/Card.tsx
import React, { useState, useEffect } from 'react';
import type { Card as CardType } from '../types';
import { getAndCacheCardImageUrl } from '../utils/imageCaching';

interface CardProps {
  card: CardType;
  imageDirectoryHandle: FileSystemDirectoryHandle | null;
  // Card size in pixels (width). Height will be calculated.
  size?: number;
  // Handler for right-click events
  onContextMenu?: (event: React.MouseEvent, card: CardType) => void;
}

interface SingleCardViewProps {
  name: string;
  imageUrl: string | null;
}

/**
 * A simple component that displays a single card image or a loading placeholder.
 */
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

/**
 * The main Card component. It handles different layouts (flippable, single-sided)
 * and manages fetching and displaying the correct card faces.
 */
const Card: React.FC<CardProps> = ({ card, imageDirectoryHandle, size, onContextMenu }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [frontImageUrl, setFrontImageUrl] = useState<string | null>(null);
  const [backImageUrl, setBackImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const flippableLayouts = ['transform', 'modal_dfc', 'double_faced_token', 'art_series', 'reversible_card', 'meld'];
  const isFlippable = flippableLayouts.includes(card.layout || '');
  
  useEffect(() => {
    let isMounted = true;
    const loadedUrls: string[] = [];

    const loadImages = async () => {
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

  const handleFlip = () => {
    if (isFlippable) {
      setIsFlipped(!isFlipped);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    if (onContextMenu) {
      e.preventDefault();
      onContextMenu(e, card);
    }
  };
  
  // Style object for dynamic card sizing
  const cardStyle = size ? {
    width: `${size}px`,
    height: `${size * 1.4}px`, // Maintain a standard card aspect ratio
  } : {};

  if (isLoading) {
    return (
      <div className="card-flipper" style={cardStyle} onContextMenu={handleContextMenu}>
        <SingleCardView name={card.name} imageUrl={null} />
      </div>
    );
  }

  // --- MODIFIED ---
  // The logic is now separated to avoid using a component-like variable inside the render function.
  // This ensures the animation works correctly.
  if (isFlippable) {
    const frontName = card.card_faces?.[0]?.name || card.name;
    const backName = (card.layout === 'meld' ? card.meld_result_card?.name : card.card_faces?.[1]?.name) || 'Card Back';

    return (
      <div 
        className="card-flipper" 
        style={cardStyle}
        onClick={handleFlip} 
        onContextMenu={handleContextMenu}
        title={`Click to flip to ${isFlipped ? frontName : backName}`}
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
  
  // For all other single-image cards (normal, split, adventure, etc.)
  return (
    <div className="card-flipper" style={cardStyle} onContextMenu={handleContextMenu}>
        <SingleCardView name={card.name} imageUrl={frontImageUrl} />
    </div>
  );
};

export default Card;