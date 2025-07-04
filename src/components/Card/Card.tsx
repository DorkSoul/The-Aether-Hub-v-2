// src/components/Card/Card.tsx

import React, { useState, useEffect, useRef, forwardRef } from 'react';
import type { Card as CardType } from '../../types';
import { getAndCacheCardImageUrl } from '../../utils/imageCaching';
import { UpArrowIcon, DownArrowIcon, RemoveIcon } from '../Icons/icons';
import './Card.css';

interface CardProps {
  card: CardType;
  imageDirectoryHandle: FileSystemDirectoryHandle | null;
  onContextMenu?: (event: React.MouseEvent) => void;
  isTapped?: boolean;
  isFlipped?: boolean;
  isBoardRotated?: boolean;
  isHighlighted?: boolean;
  heldCounter?: string | null;
  onCounterApply?: (cardInstanceId: string, counterType: string) => void;
  onCustomCounterApply?: (cardInstanceId: string, counterType: string) => void;
  onCounterRemove?: (cardInstanceId: string, counterType: string) => void;
  onRemoveAllCounters?: (cardInstanceId: string, counterType: string) => void;
  onCounterSelect?: (counterType: string) => void;
  onFlip?: () => void;
  onTap?: () => void;
  onDragStart?: (event: React.DragEvent) => void;
  onDragEnd?: (event: React.DragEvent) => void;
  onCardHover?: (card: CardType | null) => void;
  style?: React.CSSProperties;
}

interface CounterDisplayProps {
    counters: { [key: string]: number };
    cardInstanceId: string;
    onCounterApply: (cardInstanceId: string, counterType: string) => void;
    onCounterRemove: (cardInstanceId: string, counterType: string) => void;
    onRemoveAllCounters: (cardInstanceId: string, counterType: string) => void;
    onCounterSelect: (counterType: string) => void;
}

const CounterDisplay = forwardRef<HTMLDivElement, CounterDisplayProps>(({ counters, cardInstanceId, onCounterApply, onCounterRemove, onRemoveAllCounters, onCounterSelect }, ref) => {
    return (
        <div className="counter-display" onClick={(e) => e.stopPropagation()} ref={ref}>
            <div className="counter-row header-row">
                <span className="header-label">#</span>
                <span className="header-label type-header">Type</span>
                <span className="header-label actions-header">Actions</span>
            </div>
            {Object.entries(counters).map(([type, count]) => (
                <div key={type} className="counter-row">
                    <span className="counter-amount">{count}</span>
                    <span className="counter-type clickable" onClick={() => onCounterSelect(type)}>{type}</span>
                    <div className="counter-actions">
                        <button onClick={() => onCounterApply(cardInstanceId, type)}><UpArrowIcon /></button>
                        <button onClick={() => onCounterRemove(cardInstanceId, type)}><DownArrowIcon /></button>
                        <button onClick={() => onRemoveAllCounters(cardInstanceId, type)}><RemoveIcon /></button>
                    </div>
                </div>
            ))}
        </div>
    );
});

const CustomCounterDisplay = forwardRef<HTMLDivElement, CounterDisplayProps>(({ counters, cardInstanceId, onCounterApply, onCounterRemove, onRemoveAllCounters, onCounterSelect }, ref) => {
    return (
        <div className="counter-display" style={{right: 'auto', left: '5.5%'}} onClick={(e) => e.stopPropagation()} ref={ref}>
            <div className="counter-row header-row">
                <span className="header-label">#</span>
                <span className="header-label type-header">Type</span>
                <span className="header-label actions-header">Actions</span>
            </div>
            {Object.entries(counters).map(([type, count]) => (
                <div key={type} className="counter-row">
                    <span className="counter-amount">{count}</span>
                    <span className="counter-type clickable" onClick={() => onCounterSelect(type)}>{type}</span>
                    <div className="counter-actions">
                        <button onClick={() => onCounterApply(cardInstanceId, type)}><UpArrowIcon /></button>
                        <button onClick={() => onCounterRemove(cardInstanceId, type)}><DownArrowIcon /></button>
                        <button onClick={() => onRemoveAllCounters(cardInstanceId, type)}><RemoveIcon /></button>
                    </div>
                </div>
            ))}
        </div>
    );
});

interface SingleCardViewProps {
  name: string;
  imageUrl: string | null;
  power?: string;
  toughness?: string;
  counters?: { [key: string]: number };
  customCounters?: { [key: string]: number };
  onCounterOverlayClick: (e: React.MouseEvent) => void;
  onCustomCounterOverlayClick: (e: React.MouseEvent) => void;
  cardWidth?: number;
  isLoading: boolean;
  error: string | null;
}

const SingleCardView: React.FC<SingleCardViewProps> = ({ name, imageUrl, power, toughness, counters, customCounters, onCounterOverlayClick, onCustomCounterOverlayClick, cardWidth, isLoading, error }) => {
    
    if (isLoading) {
        return (
            <div className="card-placeholder">
                <div className="dotted-border">
                    Loading...
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="card-placeholder error">
                <div className="dotted-border">
                    Error loading {name}:<br/>{error}
                </div>
            </div>
        );
    }
    
    const calculateModifiedStats = () => {
        if (power === undefined || toughness === undefined) return null;

        let powerMod = 0;
        let toughnessMod = 0;
        
        if (counters) {
            for (const [type, count] of Object.entries(counters)) {
                const parts = type.split('/');
                if (parts.length === 2 && !isNaN(parseInt(parts[0], 10)) && !isNaN(parseInt(parts[1], 10))) {
                    powerMod += parseInt(parts[0], 10) * count;
                    toughnessMod += parseInt(parts[1], 10) * count;
                }
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
    const hasCounters = counters && Object.keys(counters).length > 0;
    const hasCustomCounters = customCounters && Object.keys(customCounters).length > 0;
    const customCounterNames = hasCustomCounters ? Object.keys(customCounters).join(', ') : '';
    const baseFontSize = cardWidth ? cardWidth / 18 : 8;

    return (
        <div className="card">
            {imageUrl ? <img src={imageUrl} alt={name} /> : <div className="card-placeholder">{name}</div>}
            {modifiedStats && (
                <div className="pt-overlay" onClick={onCounterOverlayClick}>
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
            {hasCounters && !modifiedStats && (
                 <div className="pt-overlay" onClick={onCounterOverlayClick} style={{width: "auto", padding: "0 5px"}}>
                    <svg viewBox="0 0 50 20" preserveAspectRatio="xMidYMid meet">
                       <text
                            x="50%"
                            y="60%"
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fontSize="16"
                            fill="white"
                        >
                            Counters
                        </text>
                    </svg>
                </div>
            )}
            {hasCustomCounters && (
                 <div className="custom-counter-display-overlay" onClick={onCustomCounterOverlayClick} style={{ fontSize: `${baseFontSize}px` }}>
                    {customCounterNames}
                </div>
            )}
        </div>
    );
};

const Card: React.FC<CardProps> = ({ card, imageDirectoryHandle, onContextMenu, isTapped = false, isFlipped: isFlippedProp, isBoardRotated, onFlip, onTap, onDragStart, onDragEnd, onCardHover, style, isHighlighted = false, heldCounter, onCounterApply, onCustomCounterApply, onCounterRemove, onRemoveAllCounters, onCounterSelect }) => {
  const [isFlippedLocal, setIsFlippedLocal] = useState(false);
  const [frontImageUrl, setFrontImageUrl] = useState<string | null>(null);
  const [backImageUrl, setBackImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPinged, setIsPinged] = useState(false);
  const [showCounterDisplay, setShowCounterDisplay] = useState(false);
  const [showCustomCounterDisplay, setShowCustomCounterDisplay] = useState(false);
  const counterDisplayRef = useRef<HTMLDivElement>(null);
  const customCounterDisplayRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [actualCardWidth, setActualCardWidth] = useState<number | undefined>(undefined);

  useEffect(() => {
    const cardElement = cardRef.current;
    if (cardElement) {
      const resizeObserver = new ResizeObserver(entries => {
        for (let entry of entries) {
          setActualCardWidth(entry.contentRect.width);
        }
      });
      resizeObserver.observe(cardElement);
      return () => resizeObserver.disconnect();
    }
  }, []);

  const cardWidth = style?.width ? parseInt(String(style.width).replace('px', '')) : actualCardWidth;


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
        setError(null);

        try {
            const frontUrl = await getAndCacheCardImageUrl(card, imageDirectoryHandle, 0);
            if (isMounted) setFrontImageUrl(frontUrl);
            if (frontUrl?.startsWith('blob:')) loadedUrls.push(frontUrl);

            if (isFlippable) {
                const backCardSource = card.layout === 'meld' && card.meld_result_card ? card.meld_result_card : card;
                const faceIndexForBack = card.layout === 'meld' ? 0 : 1;

                if (backCardSource) {
                    const backUrl = await getAndCacheCardImageUrl(backCardSource, imageDirectoryHandle, faceIndexForBack);
                    if (isMounted) setBackImageUrl(backUrl);
                    if (backUrl?.startsWith('blob:')) loadedUrls.push(backUrl);
                }
            }
        } catch (err) {
            if (isMounted) {
                setError(err instanceof Error ? err.message : 'Unknown error');
            }
        } finally {
            if (isMounted) setIsLoading(false);
        }
    };

    loadImages();

    return () => {
      isMounted = false;
      loadedUrls.forEach(url => {
          if (url) URL.revokeObjectURL(url);
      });
    };
  }, [card.id, card.layout, card.meld_result_card, imageDirectoryHandle, isFlippable]);

  const handlePrimaryAction = () => { 
    if (onTap) {
      onTap();
    } else if (!isFlipStateControlled && isFlippable) {
      setIsFlippedLocal(f => !f);
    }
  };

  const handleSecondaryAction = () => { 
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
    if (e.button === 1) { 
        e.preventDefault();
        e.stopPropagation();
        setIsPinged(true);
        setTimeout(() => {
            setIsPinged(false);
        }, 1800); 
    }
  };
  
  const isOverlayActive = showCounterDisplay || showCustomCounterDisplay;
  const flipperClasses = `card-flipper ${isTapped ? 'tapped' : ''} ${isBoardRotated ? 'board-rotated' : ''} ${isHighlighted || isPinged ? 'highlight-attention' : ''} ${isOverlayActive ? 'overlay-active' : ''}`;
  
  let title = card.name;
  if (onTap || onFlip) {
      title = "Click to Tap, Ctrl+Click to Flip, Drag to Move";
  } else if (isFlippable && !isFlipStateControlled) {
      title = "Click to Flip";
  }
      
  const clickHandler = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (showCounterDisplay && counterDisplayRef.current && counterDisplayRef.current.contains(e.target as Node)) {
        return;
      }
       if (showCustomCounterDisplay && customCounterDisplayRef.current && customCounterDisplayRef.current.contains(e.target as Node)) {
        return;
      }


      if (heldCounter) {
        const isNumericCounter = /^[+-]?\d+\/[+-]?\d+$/.test(heldCounter)
        if (isNumericCounter && onCounterApply) {
            onCounterApply(card.instanceId!, heldCounter);
        } else if (!isNumericCounter && onCustomCounterApply) {
            onCustomCounterApply(card.instanceId!, heldCounter)
        }
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
    onMouseLeave: () => {
        setShowCounterDisplay(false);
        setShowCustomCounterDisplay(false);
    },
    ref: cardRef,
  };
  
  const { power, toughness, counters, customCounters } = card;
  const hasCounters = counters && Object.keys(counters).length > 0;
  const hasCustomCounters = customCounters && Object.keys(customCounters).length > 0;

  const handleCounterOverlayClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      if(hasCounters) {
          setShowCounterDisplay(prev => !prev);
      }
  }

  const handleCustomCounterOverlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if(hasCustomCounters) {
        setShowCustomCounterDisplay(prev => !prev);
    }
  }


  const singleCardViewProps = {
      onCounterOverlayClick: handleCounterOverlayClick,
      onCustomCounterOverlayClick: handleCustomCounterOverlayClick,
      counters,
      customCounters,
      cardWidth,
      isLoading,
      error,
  };


  if (isFlippable) {
    const frontName = card.card_faces?.[0]?.name || card.name;
    const backName = (card.layout === 'meld' && card.meld_result_card) ? card.meld_result_card.name : (card.card_faces?.[1]?.name || 'Card Back');
    
    const backPower = (card.layout === 'meld' && card.meld_result_card) ? card.meld_result_card.power : card.card_faces?.[1]?.power;
    const backToughness = (card.layout === 'meld' && card.meld_result_card) ? card.meld_result_card.toughness : card.card_faces?.[1]?.toughness;

    return (
      <div 
        {...baseDivProps}
        onClick={clickHandler} 
      >
        <div className={`card-inner ${isFlipped ? 'flipped' : ''}`}>
          <div className="card-front">
            <SingleCardView name={frontName} imageUrl={frontImageUrl} power={card.card_faces?.[0]?.power || power} toughness={card.card_faces?.[0]?.toughness || toughness} {...singleCardViewProps}/>
          </div>
          <div className="card-back">
            <SingleCardView name={backName} imageUrl={backImageUrl} power={backPower} toughness={backToughness} {...singleCardViewProps}/>
          </div>
        </div>
        {showCounterDisplay && hasCounters && onCounterApply && onCounterRemove && onRemoveAllCounters && onCounterSelect &&(
            <CounterDisplay ref={counterDisplayRef} counters={counters!} cardInstanceId={card.instanceId!} onCounterApply={onCounterApply} onCounterRemove={onCounterRemove} onRemoveAllCounters={onRemoveAllCounters} onCounterSelect={onCounterSelect}/>
        )}
         {showCustomCounterDisplay && hasCustomCounters && onCustomCounterApply && onCounterRemove && onRemoveAllCounters && onCounterSelect && (
            <CustomCounterDisplay ref={customCounterDisplayRef} counters={customCounters!} cardInstanceId={card.instanceId!} onCounterApply={onCustomCounterApply} onCounterRemove={onCounterRemove} onRemoveAllCounters={onRemoveAllCounters} onCounterSelect={onCounterSelect} />
        )}
      </div>
    );
  }
  
  return (
    <div 
        {...baseDivProps}
        onClick={clickHandler} 
    >
        <SingleCardView name={card.name} imageUrl={frontImageUrl} power={power} toughness={toughness} {...singleCardViewProps}/>
        {showCounterDisplay && hasCounters && onCounterApply && onCounterRemove && onRemoveAllCounters && onCounterSelect && (
            <CounterDisplay ref={counterDisplayRef} counters={counters!} cardInstanceId={card.instanceId!} onCounterApply={onCounterApply} onCounterRemove={onCounterRemove} onRemoveAllCounters={onRemoveAllCounters} onCounterSelect={onCounterSelect} />
        )}
        {showCustomCounterDisplay && hasCustomCounters && onCustomCounterApply && onCounterRemove && onRemoveAllCounters && onCounterSelect &&(
            <CustomCounterDisplay ref={customCounterDisplayRef} counters={customCounters!} cardInstanceId={card.instanceId!} onCounterApply={onCustomCounterApply} onCounterRemove={onCounterRemove} onRemoveAllCounters={onRemoveAllCounters} onCounterSelect={onCounterSelect} />
        )}
    </div>
  );
};

export default React.memo(Card);