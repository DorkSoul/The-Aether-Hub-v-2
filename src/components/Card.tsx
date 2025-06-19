// src/components/Card.tsx
import React from 'react';
import type { Card as CardType } from '../types';

interface CardProps {
  card: CardType;
}

const Card: React.FC<CardProps> = ({ card }) => {
  return (
    <div className="card">
      <img src={card.image_uris.small} alt={card.name} />
    </div>
  );
};

export default Card;