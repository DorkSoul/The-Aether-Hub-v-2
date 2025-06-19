// src/components/Decks.tsx
import React, { useState } from 'react';
import type { Card as CardType, CardIdentifier, CardFace } from '../types';
import { getCardsFromNames, getCardByUri, getCardByUrl, delay } from '../api/scryfall';
import { groupCardsByType } from '../utils/cardUtils';
import { parseDecklist } from '../utils/parsing';
import DeckImportModal from './DeckImportModal';
import Card from './Card';
import ContextMenu from './ContextMenu';
import { PlusIcon, MinusIcon } from './icons';

interface DecksProps {
  imageDirectoryHandle: FileSystemDirectoryHandle | null;
}

interface ContextMenuState {
    x: number;
    y: number;
    card: CardType;
    cardIndex: number;
}

type GroupedCards = Record<string, CardType[]>;

// Helper function to create a CardFace from a full Card object
const createCardFace = (card: CardType): CardFace => {
    // If the source card is a DFC, use its front face data
    if (card.card_faces && card.card_faces.length > 0) {
        return card.card_faces[0];
    }
    // Otherwise, it's a single-faced card
    return {
        name: card.name,
        image_uris: card.image_uris,
        type_line: card.type_line,
        mana_cost: card.mana_cost,
        oracle_text: card.oracle_text,
    };
};


const Decks: React.FC<DecksProps> = ({ imageDirectoryHandle }) => {
  const [directoryHandle, setDirectoryHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [activeDeckFile, setActiveDeckFile] = useState<FileSystemFileHandle | null>(null);
  const [deckFiles, setDeckFiles] = useState<FileSystemFileHandle[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [groupedCards, setGroupedCards] = useState<GroupedCards>({});
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState('');
  const [notification, setNotification] = useState('');
  const [cardSize, setCardSize] = useState(150);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  
  const zoomIn = () => setCardSize(s => Math.min(s + 20, 300));
  const zoomOut = () => setCardSize(s => Math.max(s - 20, 80));

  const refreshDeckList = async (dirHandle: FileSystemDirectoryHandle) => {
    const files = [];
    for await (const entry of dirHandle.values()) {
      if (entry.kind === 'file' && entry.name.endsWith('.json')) {
        files.push(entry);
      }
    }
    setDeckFiles(files);
  };

  const handleSelectFolder = async () => {
    try {
      const dirHandle = await window.showDirectoryPicker();
      setDirectoryHandle(dirHandle);
      await refreshDeckList(dirHandle);
      setGroupedCards({});
      setActiveDeckFile(null);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        console.info("User cancelled the folder selection dialog.");
      } else {
        console.error("Error selecting folder:", err);
      }
    }
  };

  const saveCurrentDeck = async (updatedCards: CardType[]) => {
      if (!activeDeckFile) return;

      setNotification('Saving...');
      try {
          const deckDataToSave = { name: activeDeckFile.name.replace('.json', ''), cards: updatedCards };
          const deckJsonString = JSON.stringify(deckDataToSave, null, 2);

          const writable = await activeDeckFile.createWritable();
          await writable.write(deckJsonString);
          await writable.close();
          setNotification('Deck saved successfully!');
          setTimeout(() => setNotification(''), 3000);
      } catch (err) {
          console.error("Failed to save deck:", err);
          setError("Could not save the deck file.");
      }
  };


  const handleSaveDeck = async (deckName: string, decklistText: string) => {
    if (!directoryHandle) return;
    setNotification('');
    setError('');
    setIsLoading(true);
    setLoadingMessage('Importing deck...');

    try {
      const decklistIdentifiers = parseDecklist(decklistText);
      const uniqueIdentifiers = [...new Set(decklistIdentifiers.map(id => JSON.stringify(id)))].map(s => JSON.parse(s) as CardIdentifier);

      setLoadingMessage(`Fetching ${uniqueIdentifiers.length} unique cards...`);
      const fetchedCards: CardType[] = await getCardsFromNames(uniqueIdentifiers);
      
      const meldResultUrisToFetch = new Set<string>();
      fetchedCards.forEach(card => {
        if (card.layout === 'meld' && card.all_parts) {
          const meldPart = card.all_parts.find(p => p.component === 'meld_result');
          if (meldPart?.uri) meldResultUrisToFetch.add(meldPart.uri);
        }
      });

      if (meldResultUrisToFetch.size > 0) {
        setLoadingMessage(`Fetching ${meldResultUrisToFetch.size} meld result cards (1 per second)...`);
        const meldResults = await Promise.all(
            Array.from(meldResultUrisToFetch).map(async (uri, i) => {
                await delay(i * 1000);
                return getCardByUri(uri).catch(err => {
                    console.error(`Failed to fetch meld card from ${uri}`, err);
                    return null;
                });
            })
        );
        const meldResultMap = new Map(meldResults.filter((c): c is CardType => !!c).map(c => [c.id, c]));
        fetchedCards.forEach(card => {
            if (card.layout === 'meld' && card.all_parts) {
                const meldPart = card.all_parts.find(p => p.component === 'meld_result');
                if (meldPart && meldResultMap.has(meldPart.id)) {
                    card.meld_result_card = meldResultMap.get(meldPart.id);
                }
            }
        });
      }
      
      const cardApiDataBySetAndNumber = new Map<string, CardType>();
      const cardApiDataByName = new Map<string, CardType>();
      fetchedCards.forEach(card => {
        cardApiDataBySetAndNumber.set(`${card.set}|${card.collector_number}`, card);
        cardApiDataByName.set((card.name.split('//')[0].trim()).toLowerCase(), card);
      });

      const fullDeckCards: CardType[] = decklistIdentifiers.map(id => {
        if (id.set && id.collector_number) {
          return cardApiDataBySetAndNumber.get(`${id.set}|${id.collector_number}`);
        } else if (id.name) {
          return cardApiDataByName.get(id.name.toLowerCase());
        }
        return undefined;
      }).filter((c): c is CardType => c !== undefined);

      if (fullDeckCards.length !== decklistIdentifiers.length) {
        setError("Warning: Some cards could not be found and were not included in the saved deck.");
      }
      
      setLoadingMessage('Saving deck file...');
      const deckDataToSave = { name: deckName, cards: fullDeckCards };
      const deckJsonString = JSON.stringify(deckDataToSave, null, 2);
      const fileName = `${deckName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;

      const fileHandle = await directoryHandle.getFileHandle(fileName, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(deckJsonString);
      await writable.close();

      await refreshDeckList(directoryHandle);
      
      setGroupedCards(groupCardsByType(fullDeckCards));
      setActiveDeckFile(fileHandle);

      setNotification('Deck imported! Card images are downloading for the first time. This may be slow, but future loads will be instant from your local cache.');

    } catch (err) {
      console.error("Error importing deck:", err);
      setError(err instanceof Error ? err.message : "Failed to import deck. Check console for details.");
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  };

  const handleDeckSelected = async (fileHandle: FileSystemFileHandle) => {
    setNotification('');
    setError('');
    setIsLoading(true);
    setLoadingMessage('Loading deck from local file...');
    setGroupedCards({});
    setActiveDeckFile(fileHandle);

    try {
      const file = await fileHandle.getFile();
      const text = await file.text();
      const deckData: { name: string; cards: CardType[] } = JSON.parse(text);
      setGroupedCards(groupCardsByType(deckData.cards || []));
    } catch (err) {
      console.error("Error loading deck from JSON:", err);
      setError(err instanceof Error ? err.message : "Failed to load deck file. The file might be corrupted.");
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  };

  const toggleSection = (sectionName: string) => {
    setCollapsedSections(prev => ({ ...prev, [sectionName]: !prev[sectionName] }));
  };

  const handleRightClick = (event: React.MouseEvent, card: CardType, cardIndex: number) => {
    event.preventDefault();
    if(cardIndex > -1) {
        setContextMenu({ x: event.clientX, y: event.clientY, card, cardIndex });
    }
  };
  
  const handleAddCard = () => {
      if (!contextMenu) return;
      const { card, cardIndex } = contextMenu;
      const allCards = Object.values(groupedCards).flat();
      allCards.splice(cardIndex + 1, 0, card);
      setGroupedCards(groupCardsByType(allCards));
      saveCurrentDeck(allCards);
  };

  const handleRemoveCard = () => {
      if (!contextMenu) return;
      const { cardIndex } = contextMenu;
      const allCards = Object.values(groupedCards).flat();
      allCards.splice(cardIndex, 1);
      setGroupedCards(groupCardsByType(allCards));
      saveCurrentDeck(allCards);
  };

    // --- MODIFIED --- This function is now type-safe.
    const handleReplaceCard = async (faceToReplace: 0 | 1) => {
        if (!contextMenu) return;
        const { card: originalCard, cardIndex } = contextMenu;

        const url = prompt(`Enter Scryfall URL for the new ${faceToReplace === 0 ? 'front' : 'back'} face:`);
        if (!url) return;

        setIsLoading(true);
        setLoadingMessage('Fetching replacement card...');
        try {
            const newCardData = await getCardByUrl(url);
            if (!newCardData) throw new Error("Card not found at URL.");

            const allCards = Object.values(groupedCards).flat();
            const newFace = createCardFace(newCardData);
            
            const modifiedCard = { ...originalCard };

            // Safely create or clone the card_faces array
            const existingFaces = originalCard.card_faces ? [...originalCard.card_faces] : [createCardFace(originalCard)];
            
            // Place the new face at the correct index
            existingFaces[faceToReplace] = newFace;

            // Assign the updated array back to the card. Now it's guaranteed to be defined.
            modifiedCard.card_faces = existingFaces;

            // Update top-level properties based on which face was replaced
            if (faceToReplace === 0) {
                modifiedCard.name = `${newFace.name} // ${modifiedCard.card_faces[1]?.name || 'Back'}`;
                modifiedCard.type_line = newFace.type_line;
            } else {
                modifiedCard.name = `${modifiedCard.card_faces[0]?.name || 'Front'} // ${newFace.name}`;
            }

            modifiedCard.id = crypto.randomUUID();
            modifiedCard.is_custom = true;
            modifiedCard.layout = 'transform';
            
            allCards[cardIndex] = modifiedCard;
            setGroupedCards(groupCardsByType(allCards));
            await saveCurrentDeck(allCards);

        } catch (err) {
            console.error("Error replacing card face:", err);
            setError(err instanceof Error ? err.message : "An error occurred.");
        } finally {
            setIsLoading(false);
            setLoadingMessage('');
        }
    };

    const handleAddBackFace = async () => {
        if (!contextMenu) return;
        const { card: frontCard, cardIndex } = contextMenu;

        const url = prompt("Enter Scryfall URL for the new back face:");
        if (!url) return;
        
        setIsLoading(true);
        setLoadingMessage('Fetching back face card...');
        try {
            const backCardData = await getCardByUrl(url);
            if (!backCardData) throw new Error("Card not found at URL.");

            const allCards = Object.values(groupedCards).flat();
            
            const frontFace = createCardFace(frontCard);
            const backFace = createCardFace(backCardData);

            const newDfc: CardType = {
                ...frontCard,
                id: crypto.randomUUID(),
                layout: 'transform',
                is_custom: true,
                name: `${frontFace.name} // ${backFace.name}`,
                type_line: `${frontFace.type_line} // ${backFace.type_line}`,
                image_uris: undefined,
                card_faces: [frontFace, backFace],
            };
            
            allCards[cardIndex] = newDfc;
            setGroupedCards(groupCardsByType(allCards));
            await saveCurrentDeck(allCards);

        } catch (err) {
            console.error("Error adding back face:", err);
            setError(err instanceof Error ? err.message : "An error occurred.");
        } finally {
            setIsLoading(false);
            setLoadingMessage('');
        }
    };
  
    const buildContextMenuOptions = (card: CardType) => {
        const options = [
            { label: 'Add another copy', action: handleAddCard },
            { label: 'Remove a copy', action: handleRemoveCard }
        ];

        const isDfc = card.card_faces && card.card_faces.length > 0;

        if (isDfc) {
            options.push({ label: 'Replace Front Face from URL...', action: () => handleReplaceCard(0) });
            if (card.card_faces && card.card_faces.length > 1) {
                options.push({ label: 'Replace Back Face from URL...', action: () => handleReplaceCard(1) });
            } else {
                options.push({ label: 'Add Back Face from URL...', action: () => handleReplaceCard(1) });
            }
        } else {
            options.push({ label: 'Replace Card from URL...', action: () => handleReplaceCard(0) });
            options.push({ label: 'Add Back Face from URL...', action: () => handleAddBackFace() });
        }
        return options;
    }

  let cardCounter = 0;

  return (
    <>
      <DeckImportModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSaveDeck} />
      {contextMenu && (
          <ContextMenu
              x={contextMenu.x}
              y={contextMenu.y}
              onClose={() => setContextMenu(null)}
              options={buildContextMenuOptions(contextMenu.card)}
          />
      )}
      <div className="deck-builder">
        <div className="deck-controls">
          <button onClick={handleSelectFolder}>Load Decks Folder</button>
          <button onClick={() => setIsModalOpen(true)} disabled={!directoryHandle}>
            Import New Deck
          </button>
        </div>
        <div className="deck-content">
          <div className="deck-list-pane">
            <h3>Decks</h3>
            <ul>{deckFiles.map(file => (<li key={file.name} onClick={() => handleDeckSelected(file)} className="list-item">{file.name.replace('.json', '')}</li>))}</ul>
          </div>
          <div className="spoiler-view-pane">
            <div className="spoiler-view-controls">
                <button onClick={zoomOut} title="Decrease card size"><MinusIcon /></button>
                <span>Card Size</span>
                <button onClick={zoomIn} title="Increase card size"><PlusIcon /></button>
            </div>
            {notification && <p className="notification-message">{notification}</p>}
            {isLoading && <h2>{loadingMessage}</h2>}
            {error && <p className="error-message">{error}</p>}
            {!isLoading && Object.entries(groupedCards).map(([type, cards]) => (
              <div key={type} className="card-type-section">
                <h3 className="section-header" onClick={() => toggleSection(type)}>
                  {type} ({cards.length})<span>{collapsedSections[type] ? ' (Click to expand)' : ''}</span>
                </h3>
                {!collapsedSections[type] && (
                  <div className="cards-container deck-view-cards">
                    {cards.map((card) => {
                        const currentIndex = cardCounter;
                        cardCounter++;
                        return (
                          <Card 
                            key={`${card.id}-${currentIndex}`} 
                            card={card} 
                            imageDirectoryHandle={imageDirectoryHandle}
                            size={cardSize}
                            onContextMenu={(e) => handleRightClick(e, card, currentIndex)}
                          />
                        );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default Decks;