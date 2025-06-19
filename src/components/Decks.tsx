// src/components/Decks.tsx
import React, { useState, useEffect, useCallback } from 'react';
import type { Card as CardType, CardIdentifier, CardFace } from '../types';
import { getCardsFromNames, getCardByUri, getCardByUrl, delay } from '../api/scryfall';
import { groupCardsByType } from '../utils/cardUtils';
import { parseDecklist } from '../utils/parsing';
import DeckImportModal from './DeckImportModal';
import Card from './Card';
import ContextMenu from './ContextMenu';

interface DecksProps {
  decksDirectoryHandle: FileSystemDirectoryHandle | null;
  imagesDirectoryHandle: FileSystemDirectoryHandle | null;
  isImportModalOpen: boolean;
  onCloseImportModal: () => void;
  cardSize: number;
  onDeckLoaded: (deckName: string, cardCount: number) => void;
}

interface DeckInfo {
    fileHandle: FileSystemFileHandle;
    name: string;
    cardCount: number;
}

interface CardContextMenuState {
    x: number;
    y: number;
    card: CardType;
    cardIndex: number;
}

// --- NEW --- Interface for the deck context menu state.
interface DeckContextMenuState {
    x: number;
    y: number;
    deckInfo: DeckInfo;
}

type GroupedCards = Record<string, CardType[]>;

const createCardFace = (card: CardType): CardFace => {
    if (card.card_faces && card.card_faces.length > 0) {
        return card.card_faces[0];
    }
    return {
        name: card.name,
        image_uris: card.image_uris,
        type_line: card.type_line,
        mana_cost: card.mana_cost,
        oracle_text: card.oracle_text,
    };
};

const Decks: React.FC<DecksProps> = ({ 
  decksDirectoryHandle,
  imagesDirectoryHandle,
  isImportModalOpen,
  onCloseImportModal,
  cardSize,
  onDeckLoaded
}) => {
  const [activeDeckFile, setActiveDeckFile] = useState<FileSystemFileHandle | null>(null);
  const [decks, setDecks] = useState<DeckInfo[]>([]);
  const [groupedCards, setGroupedCards] = useState<GroupedCards>({});
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState('');
  const [notification, setNotification] = useState('');
  const [cardContextMenu, setCardContextMenu] = useState<CardContextMenuState | null>(null);
  // --- NEW --- State to manage the deck context menu's visibility and position.
  const [deckContextMenu, setDeckContextMenu] = useState<DeckContextMenuState | null>(null);
  
  const refreshDeckList = useCallback(async (dirHandle: FileSystemDirectoryHandle) => {
      const newDecks: DeckInfo[] = [];
      for await (const entry of dirHandle.values()) {
          if (entry.kind === 'file' && entry.name.endsWith('.json')) {
              try {
                  const file = await entry.getFile();
                  const text = await file.text();
                  const deckData: { name: string; cards: CardType[] } = JSON.parse(text);
                  newDecks.push({
                      fileHandle: entry,
                      name: deckData.name,
                      cardCount: deckData.cards.length
                  });
              } catch(e) {
                  console.error(`Could not read or parse ${entry.name}`, e);
              }
          }
      }
      setDecks(newDecks);
  }, []);

  useEffect(() => {
    if (decksDirectoryHandle) {
        refreshDeckList(decksDirectoryHandle);
        setGroupedCards({});
        setActiveDeckFile(null);
        onDeckLoaded('', 0);
    }
  }, [decksDirectoryHandle, onDeckLoaded, refreshDeckList]);

  const saveCurrentDeck = async (updatedCards: CardType[]) => {
      if (!activeDeckFile || !decksDirectoryHandle) return;

      setNotification('Saving...');
      try {
          const file = await activeDeckFile.getFile();
          const text = await file.text();
          const deckData: { name: string; cards: CardType[] } = JSON.parse(text);

          deckData.cards = updatedCards;
          const deckJsonString = JSON.stringify(deckData, null, 2);

          const writable = await activeDeckFile.createWritable();
          await writable.write(deckJsonString);
          await writable.close();
          
          setNotification('Deck saved successfully!');
          refreshDeckList(decksDirectoryHandle);
          onDeckLoaded(deckData.name, updatedCards.length);
          
          setTimeout(() => setNotification(''), 3000);
      } catch (err) {
          console.error("Failed to save deck:", err);
          setError("Could not save the deck file.");
      }
  };

  const handleSaveDeck = async (deckName: string, decklistText: string) => {
    if (!decksDirectoryHandle) return;
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
        setLoadingMessage(`Fetching ${meldResultUrisToFetch.size} meld result cards...`);
        const meldResults = await Promise.all(
            Array.from(meldResultUrisToFetch).map(async (uri, i) => {
                await delay(i * 100);
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

      const fileHandle = await decksDirectoryHandle.getFileHandle(fileName, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(deckJsonString);
      await writable.close();

      refreshDeckList(decksDirectoryHandle);
      
      setGroupedCards(groupCardsByType(fullDeckCards));
      setActiveDeckFile(fileHandle);
      onDeckLoaded(deckName, fullDeckCards.length);

      setNotification('Deck imported! Card images are downloading for the first time. This may be slow, but future loads will be instant from your local cache.');

    } catch (err) {
      console.error("Error importing deck:", err);
      setError(err instanceof Error ? err.message : "Failed to import deck. Check console for details.");
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  };

  const handleDeckSelected = async (deckInfo: DeckInfo) => {
    setNotification('');
    setError('');
    setIsLoading(true);
    setLoadingMessage('Loading deck from local file...');
    setActiveDeckFile(deckInfo.fileHandle);

    try {
      const file = await deckInfo.fileHandle.getFile();
      const text = await file.text();
      const deckData: { name: string; cards: CardType[] } = JSON.parse(text);
      setGroupedCards(groupCardsByType(deckData.cards || []));
      onDeckLoaded(deckData.name, (deckData.cards || []).length);
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

  const handleCardRightClick = (event: React.MouseEvent, card: CardType, cardIndex: number) => {
    event.preventDefault();
    if(cardIndex > -1) {
        setCardContextMenu({ x: event.clientX, y: event.clientY, card, cardIndex });
    }
  };
  
  // --- NEW --- Handler to open the context menu for a deck.
  const handleDeckRightClick = (event: React.MouseEvent, deckInfo: DeckInfo) => {
      event.preventDefault();
      setDeckContextMenu({ x: event.clientX, y: event.clientY, deckInfo });
  };

  const handleAddCard = () => {
      if (!cardContextMenu) return;
      const { card, cardIndex } = cardContextMenu;
      const allCards = Object.values(groupedCards).flat();
      allCards.splice(cardIndex + 1, 0, card);
      setGroupedCards(groupCardsByType(allCards));
      saveCurrentDeck(allCards);
  };

  const handleRemoveCard = () => {
      if (!cardContextMenu) return;
      const { cardIndex } = cardContextMenu;
      const allCards = Object.values(groupedCards).flat();
      allCards.splice(cardIndex, 1);
      setGroupedCards(groupCardsByType(allCards));
      saveCurrentDeck(allCards);
  };
  
  const handleReplaceCard = async (faceToReplace: 0 | 1) => {
      if (!cardContextMenu) return;
      const { card: originalCard, cardIndex } = cardContextMenu;

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
          const existingFaces = originalCard.card_faces ? [...originalCard.card_faces] : [createCardFace(originalCard)];
          
          existingFaces[faceToReplace] = newFace;
          modifiedCard.card_faces = existingFaces;

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
      if (!cardContextMenu) return;
      const { card: frontCard, cardIndex } = cardContextMenu;

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

  const buildCardContextMenuOptions = (card: CardType) => {
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

  // --- NEW --- Function to delete a deck file.
  const handleDeleteDeck = async () => {
    if (!deckContextMenu || !decksDirectoryHandle) return;
    const { deckInfo } = deckContextMenu;

    if (window.confirm(`Are you sure you want to delete the deck "${deckInfo.name}"?`)) {
        try {
            await decksDirectoryHandle.removeEntry(deckInfo.fileHandle.name);

            setNotification(`Deck "${deckInfo.name}" deleted.`);
            setTimeout(() => setNotification(''), 3000);

            if (activeDeckFile?.name === deckInfo.fileHandle.name) {
                setActiveDeckFile(null);
                setGroupedCards({});
                onDeckLoaded('', 0);
            }
            
            refreshDeckList(decksDirectoryHandle);

        } catch (err) {
            console.error("Error deleting deck:", err);
            setError("Could not delete the deck file.");
        }
    }
  };

  // --- NEW --- Function to duplicate a deck file.
  const handleDuplicateDeck = async () => {
      if (!deckContextMenu || !decksDirectoryHandle) return;
      const { deckInfo } = deckContextMenu;

      const newDeckName = prompt(`Enter name for the duplicated deck:`, `${deckInfo.name} - Copy`);
      if (!newDeckName || newDeckName.trim() === '') return;

      try {
          setNotification('Duplicating deck...');
          
          const file = await deckInfo.fileHandle.getFile();
          const text = await file.text();
          const deckData = JSON.parse(text);

          deckData.name = newDeckName;
          const newDeckJsonString = JSON.stringify(deckData, null, 2);
          const newFileName = `${newDeckName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;

          const newFileHandle = await decksDirectoryHandle.getFileHandle(newFileName, { create: true });
          const writable = await newFileHandle.createWritable();
          await writable.write(newDeckJsonString);
          await writable.close();

          refreshDeckList(decksDirectoryHandle);
          setNotification(`Deck "${deckInfo.name}" duplicated as "${newDeckName}".`);
          setTimeout(() => setNotification(''), 3000);

      } catch (err) {
          console.error("Error duplicating deck:", err);
          setError("Could not duplicate the deck.");
      }
  };

  // --- NEW --- Function to rename a deck file.
  const handleRenameDeck = async () => {
      if (!deckContextMenu || !decksDirectoryHandle) return;
      const { deckInfo } = deckContextMenu;

      const newDeckName = prompt("Enter new name for the deck:", deckInfo.name);
      if (!newDeckName || newDeckName.trim() === '' || newDeckName === deckInfo.name) return;

      try {
          setNotification('Renaming deck...');

          const file = await deckInfo.fileHandle.getFile();
          const text = await file.text();
          const deckData = JSON.parse(text);

          deckData.name = newDeckName;
          const newDeckJsonString = JSON.stringify(deckData, null, 2);
          const newFileName = `${newDeckName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
          
          const newFileHandle = await decksDirectoryHandle.getFileHandle(newFileName, { create: true });
          const writable = await newFileHandle.createWritable();
          await writable.write(newDeckJsonString);
          await writable.close();

          await decksDirectoryHandle.removeEntry(deckInfo.fileHandle.name);

          if (activeDeckFile?.name === deckInfo.fileHandle.name) {
              setActiveDeckFile(newFileHandle);
              onDeckLoaded(newDeckName, deckData.cards.length);
          }

          refreshDeckList(decksDirectoryHandle);
          setNotification(`Deck renamed to "${newDeckName}".`);
          setTimeout(() => setNotification(''), 3000);

      } catch (err) {
          console.error("Error renaming deck:", err);
          setError("Could not rename the deck.");
      }
  };

  let cardCounter = 0;

  return (
    <>
      <DeckImportModal isOpen={isImportModalOpen} onClose={onCloseImportModal} onSave={handleSaveDeck} />
      {cardContextMenu && (
          <ContextMenu
              x={cardContextMenu.x}
              y={cardContextMenu.y}
              onClose={() => setCardContextMenu(null)}
              options={buildCardContextMenuOptions(cardContextMenu.card)}
          />
      )}
      {/* --- NEW --- Render the ContextMenu for decks */}
      {deckContextMenu && (
          <ContextMenu
              x={deckContextMenu.x}
              y={deckContextMenu.y}
              onClose={() => setDeckContextMenu(null)}
              options={[
                  { label: 'Rename', action: handleRenameDeck },
                  { label: 'Duplicate', action: handleDuplicateDeck },
                  { label: 'Delete', action: handleDeleteDeck },
              ]}
          />
      )}
      <div className="deck-builder">
        {!decksDirectoryHandle && (
            <div className="game-loading">
                <h2>Please select an app folder to begin.</h2>
                <p>This folder will be used to store your decks and cached card images.</p>
            </div>
        )}
        {decksDirectoryHandle && (
          <div className="deck-content">
            <div className="deck-list-pane">
              <h3>Decks</h3>
              {/* --- MODIFIED --- Added onContextMenu handler and card count display. */}
              <ul>{decks.map(deck => (
                  <li 
                    key={deck.fileHandle.name} 
                    onClick={() => handleDeckSelected(deck)} 
                    onContextMenu={(e) => handleDeckRightClick(e, deck)}
                    className="list-item"
                    title={deck.name}
                  >
                      {deck.name} ({deck.cardCount} cards)
                  </li>
              ))}</ul>
            </div>
            <div className="spoiler-view-pane">
              {notification && <p className="notification-message">{notification}</p>}
              {isLoading && <h2>{loadingMessage}</h2>}
              {error && <p className="error-message">{error}</p>}
              {!isLoading && Object.keys(groupedCards).length === 0 && (
                <div className="game-loading">
                    <p>Select a deck from the list, or import a new one.</p>
                </div>
              )}
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
                              imageDirectoryHandle={imagesDirectoryHandle}
                              size={cardSize}
                              onContextMenu={(e) => handleCardRightClick(e, card, currentIndex)}
                            />
                          );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Decks;