// src/components/Card.tsx
import React, { useState, useEffect } from 'react';
import type { Card as CardType } from '../types';
import { getAndCacheCardImageUrl } from '../utils/imageCaching';

interface CardProps {
  card: CardType;
  imageDirectoryHandle: FileSystemDirectoryHandle | null;
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
const Card: React.FC<CardProps> = ({ card, imageDirectoryHandle }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [frontImageUrl, setFrontImageUrl] = useState<string | null>(null);
  const [backImageUrl, setBackImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Define which layouts are flippable with a front and back face.
  const flippableLayouts = ['transform', 'modal_dfc', 'double_faced_token', 'art_series', 'reversible_card', 'meld'];
  const isFlippable = flippableLayouts.includes(card.layout || '');
  
  useEffect(() => {
    let isMounted = true;
    const loadedUrls: string[] = [];

    const loadImages = async () => {
      setIsLoading(true);
      
      // Get front image URL. This is always face 0 of the card object.
      const frontUrl = await getAndCacheCardImageUrl(card, imageDirectoryHandle, 0);
      if (isMounted) setFrontImageUrl(frontUrl);
      if (frontUrl.startsWith('blob:')) loadedUrls.push(frontUrl);

      // If the card is flippable, get the back image URL.
      if (isFlippable) {
        // For 'meld' layout, the back image comes from the separate `meld_result_card` object.
        const backCardSource = card.layout === 'meld' ? card.meld_result_card : card;
        
        // For standard double-faced cards, the back is face index 1.
        // For a meld result, it's a normal card, so we want its front face (index 0).
        const faceIndexForBack = card.layout === 'meld' ? 0 : 1;
        
        if (backCardSource) {
          const backUrl = await getAndCacheCardImageUrl(backCardSource, imageDirectoryHandle, faceIndexForBack);
          if (isMounted) setBackImageUrl(backUrl);
          if (backUrl.startsWith('blob:')) loadedUrls.push(backUrl);
        }
      }
      
      if(isMounted) setIsLoading(false);
    };

    loadImages();

    // Cleanup function to revoke blob URLs and prevent memory leaks.
    return () => {
      isMounted = false;
      loadedUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [card, imageDirectoryHandle, isFlippable]);

  // Toggles the flipped state only for flippable cards.
  const handleFlip = () => {
    if (isFlippable) {
      setIsFlipped(!isFlipped);
    }
  };

  // While images are loading, show a generic placeholder.
  if (isLoading) {
    // Using the flipper container ensures consistent sizing.
    return (
      <div className="card-flipper"> 
        <SingleCardView name={card.name} imageUrl={null} />
      </div>
    );
  }

  // If the card is flippable, render the two-sided component.
  if (isFlippable) {
    const frontName = card.card_faces?.[0]?.name || card.name;
    const backName = (card.layout === 'meld' ? card.meld_result_card?.name : card.card_faces?.[1]?.name) || 'Card Back';

    return (
      <div className="card-flipper" onClick={handleFlip} title={`Click to flip to ${isFlipped ? frontName : backName}`}>
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
  
  // For all other single-image cards (normal, split, adventure, etc.),
  // render just the front face in a non-flipping container.
  return (
    <div className="card-flipper">
        <SingleCardView name={card.name} imageUrl={frontImageUrl} />
    </div>
  );
};

export default Card;