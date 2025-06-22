// src/components/ScryModal/ScryModal.tsx
import React, { useState, useEffect } from 'react';
import type { Card as CardType } from '../../types';
import Card from '../Card/Card';
import './ScryModal.css';

interface ScryModalProps {
    isOpen: boolean;
    cards: CardType[];
    imageDirectoryHandle: FileSystemDirectoryHandle | null;
    onClose: (toTop: CardType[], toBottom: CardType[]) => void;
}

const ScryModal: React.FC<ScryModalProps> = ({ isOpen, cards, imageDirectoryHandle, onClose }) => {
    const [topCards, setTopCards] = useState<CardType[]>([]);
    const [bottomCards, setBottomCards] = useState<CardType[]>([]);
    const [remainingCards, setRemainingCards] = useState<CardType[]>([]);

    // Reset the modal's state whenever it's opened with a new set of cards
    useEffect(() => {
        if (isOpen) {
            setRemainingCards(cards);
            setTopCards([]);
            setBottomCards([]);
        }
    }, [isOpen, cards]);

    if (!isOpen) return null;

    // Handles moving a card to the 'top' or 'bottom' pile
    const handleDecision = (card: CardType, destination: 'top' | 'bottom') => {
        if (destination === 'top') {
            setTopCards(prev => [...prev, card]);
        } else {
            setBottomCards(prev => [...prev, card]);
        }
        setRemainingCards(prev => prev.filter(c => c.instanceId !== card.instanceId));
    };

    // Finishes the scry action and closes the modal
    const handleFinish = () => {
        // If there are undecided cards, prompt the user to place them on top by default
        if (remainingCards.length > 0) {
            if (window.confirm(`You have not made a decision for ${remainingCards.length} card(s). Place the rest on top of the library?`)) {
                onClose([...topCards, ...remainingCards], bottomCards);
            } else {
                return; // User cancelled, do not close modal yet
            }
        } else {
            onClose(topCards, bottomCards);
        }
    };
    
    return (
        <div className="modal-backdrop">
            <div className="scry-modal-content">
                <h2>Scry</h2>
                <div className="scry-cards-container">
                    {remainingCards.map(card => (
                        <div key={card.instanceId} className="scry-card-wrapper">
                            <Card 
                                card={card} 
                                imageDirectoryHandle={imageDirectoryHandle} 
                                style={{ width: '200px', height: `${200 * 1.4}px` }}
                            />
                            <div className="scry-buttons">
                                <button onClick={() => handleDecision(card, 'top')}>Top of Deck</button>
                                <button onClick={() => handleDecision(card, 'bottom')}>Bottom of Deck</button>
                            </div>
                        </div>
                    ))}
                    {remainingCards.length === 0 && <p>All cards have been sorted.</p>}
                </div>
                 <div className="scry-summary">
                    <p>To Top: {topCards.length}</p>
                    <p>To Bottom: {bottomCards.length}</p>
                </div>
                <button onClick={handleFinish} className="finish-scry-btn">Finish</button>
            </div>
        </div>
    );
};
export default ScryModal;