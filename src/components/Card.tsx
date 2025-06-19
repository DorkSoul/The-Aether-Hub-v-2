// src/components/Card.tsx
import React, { useState, useEffect } from 'react';
import type { Card as CardType, CardFace } from '../types';
import { getAndCacheCardImageUrl } from '../utils/imageCaching';

interface CardProps {
  card: CardType;
  imageDirectoryHandle: FileSystemDirectoryHandle | null;
}

interface SingleFaceProps {
  card: CardType;
  face?: CardFace;
  faceIndex?: number;
  imageDirectoryHandle: FileSystemDirectoryHandle | null;
}

/**
 * A component responsible for loading and displaying a single card face,
 * utilizing the local cache.
 */
const SingleCardFace: React.FC<SingleFaceProps> = ({ card, face, faceIndex, imageDirectoryHandle }) => {
    const [imageUrl, setImageUrl] = useState<string>(''); // Start empty

    useEffect(() => {
        let isMounted = true;

        const loadCardImage = async () => {
            const url = await getAndCacheCardImageUrl(card, imageDirectoryHandle, faceIndex);
            if (isMounted) {
                setImageUrl(url);
            }
        };

        loadCardImage();

        return () => {
            isMounted = false;
            // When the component unmounts, revoke the blob URL to prevent memory leaks
            if (imageUrl.startsWith('blob:')) {
                URL.revokeObjectURL(imageUrl);
            }
        };
    }, [card, face, faceIndex, imageDirectoryHandle]); // Rerun when card or directory changes

    // Display a loading state
    if (!imageUrl) {
        return (
            <div className="card card-placeholder">
                <p>{face ? face.name : card.name}</p>
                <p>(Loading...)</p>
            </div>
        );
    }
    
    return (
        <div className="card">
            <img src={imageUrl} alt={face ? face.name : card.name} />
        </div>
    );
};


/**
 * The main Card component. It determines if a card has multiple faces
 * and renders the appropriate SingleCardFace components.
 */
const Card: React.FC<CardProps> = ({ card, imageDirectoryHandle }) => {
  // If the card has multiple faces, render a SingleCardFace for each.
  if (card.card_faces) {
    return (
      <div className="card-container-multiface">
        {card.card_faces.map((face, index) => (
          <SingleCardFace
            key={index}
            card={card}
            face={face}
            faceIndex={index}
            imageDirectoryHandle={imageDirectoryHandle}
          />
        ))}
      </div>
    );
  }

  // Otherwise, render a single face.
  return <SingleCardFace card={card} imageDirectoryHandle={imageDirectoryHandle} />;
};

export default Card;