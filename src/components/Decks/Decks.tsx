// src/components/Decks.tsx
import React, { useState, useEffect, useCallback } from 'react';
import type { Card as CardType, CardIdentifier, CardFace } from '../../types';
import { getCardsFromNames, getCardByUri, getCardByUrl, delay } from '../../api/scryfall';
import { groupCardsByType } from '../../utils/cardUtils';
import { parseDecklist } from '../../utils/parsing';
import DeckImportModal from '../DeckImportModal/DeckImportModal';
import Card from '../Card/Card';
import ContextMenu from '../ContextMenu/ContextMenu';
import { saveCardsToDB } from '../../utils/db';
import './Decks.css';

interface DecksProps {
  decksDirectoryHandle: FileSystemDirectoryHandle | null;
  imagesDirectoryHandle: FileSystemDirectoryHandle | null;
  isImportModalOpen: boolean;
  onCloseImportModal: () => void;
  cardSize: number;
  onDeckLoaded: (deckName: string, cardCount: number) => void;
  onCardHover: (card: CardType | null) => void;
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
    isCommander: boolean;
}

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
  onDeckLoaded,
  onCardHover,
}) => {
  const [activeDeckFile, setActiveDeckFile] = useState<FileSystemFileHandle | null>(null);
  const [decks, setDecks] = useState<DeckInfo[]>([]);
  const [groupedCards, setGroupedCards] = useState<GroupedCards>({});
  const [commanders, setCommanders] = useState<CardType[]>([]);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState('');
  const [notification, setNotification] = useState('');
  const [cardContextMenu, setCardContextMenu] = useState<CardContextMenuState | null>(null);
  const [deckContextMenu, setDeckContextMenu] = useState<DeckContextMenuState | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<DeckInfo | null>(null);
  
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
        setCommanders([]);
        setActiveDeckFile(null);
        onDeckLoaded('', 0);
    }
  }, [decksDirectoryHandle, onDeckLoaded, refreshDeckList]);

  const saveDeck = async (commandersToSave: CardType[], mainDeckToSave: CardType[]) => {
      if (!activeDeckFile || !decksDirectoryHandle) return;

      setNotification('Saving...');
      try {
          const file = await activeDeckFile.getFile();
          const currentDeckData: { name: string } = JSON.parse(await file.text());

          const allCards = [...commandersToSave, ...mainDeckToSave];
          const commanderIds = commandersToSave.map(c => c.instanceId!);

          const deckDataToSave = { name: currentDeckData.name, cards: allCards, commanders: commanderIds };
          const deckJsonString = JSON.stringify(deckDataToSave, null, 2);

          const writable = await activeDeckFile.createWritable();
          await writable.write(deckJsonString);
          await writable.close();
          
          setNotification('Deck saved successfully!');
          await refreshDeckList(decksDirectoryHandle);
          onDeckLoaded(deckDataToSave.name, allCards.length);
          
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
      
      setLoadingMessage('Saving cards to local database...');
      await saveCardsToDB(fetchedCards);
      
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
      const cardsWithInstanceIds = fullDeckCards.map(card => ({ ...card, instanceId: crypto.randomUUID() }));
      
      const importedCommanders: CardType[] = [];
      const importedCommanderIds: string[] = [];
      const mainDeckCards = cardsWithInstanceIds;

      const deckDataToSave = { name: deckName, cards: cardsWithInstanceIds, commanders: importedCommanderIds };
      const deckJsonString = JSON.stringify(deckDataToSave, null, 2);
      const fileName = `${deckName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;

      const fileHandle = await decksDirectoryHandle.getFileHandle(fileName, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(deckJsonString);
      await writable.close();

      await refreshDeckList(decksDirectoryHandle);
      
      setCommanders(importedCommanders);
      setGroupedCards(groupCardsByType(mainDeckCards));
      setActiveDeckFile(fileHandle);
      onDeckLoaded(deckName, cardsWithInstanceIds.length);

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
      const deckData: { name: string; cards: CardType[]; commanders?: string[] } = JSON.parse(text);

      const cardsWithInstanceIds = deckData.cards.map(c => c.instanceId ? c : { ...c, instanceId: crypto.randomUUID() });
      const commanderInstanceIds = new Set(deckData.commanders || []);

      const loadedCommanders = cardsWithInstanceIds.filter(c => c.instanceId && commanderInstanceIds.has(c.instanceId));
      const mainDeckCards = cardsWithInstanceIds.filter(c => !c.instanceId || !commanderInstanceIds.has(c.instanceId));

      if (deckData.cards.length > 0 && (!deckData.cards[0].instanceId || (deckData.commanders && deckData.commanders.length > 0 && !deckData.cards.find(c => c.instanceId === deckData.commanders![0])))) {
          const deckToSave = {
              name: deckData.name,
              cards: cardsWithInstanceIds,
              commanders: loadedCommanders.map(c => c.instanceId!)
          };
          const writable = await deckInfo.fileHandle.createWritable();
          await writable.write(JSON.stringify(deckToSave, null, 2));
          await writable.close();
      }

      setCommanders(loadedCommanders);
      setGroupedCards(groupCardsByType(mainDeckCards));
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

  const handleCardRightClick = (event: React.MouseEvent, card: CardType, cardIndex: number, isCommander: boolean) => {
    event.preventDefault();
    setCardContextMenu({ x: event.clientX, y: event.clientY, card, cardIndex, isCommander });
  };
  
  const handleDeckRightClick = (event: React.MouseEvent, deckInfo: DeckInfo) => {
      event.preventDefault();
      setDeckContextMenu({ x: event.clientX, y: event.clientY, deckInfo });
  };

  const handleSetAsCommander = async () => {
    if (!cardContextMenu) return;
    const { cardIndex } = cardContextMenu;
    const allCards = Object.values(groupedCards).flat();
    const cardToMove = allCards[cardIndex];

    if (cardToMove) {
        const newMainDeck = allCards.filter((_, i) => i !== cardIndex);
        const newCommanders = [...commanders, cardToMove];
        setCommanders(newCommanders);
        setGroupedCards(groupCardsByType(newMainDeck));
        await saveDeck(newCommanders, newMainDeck);
    }
  };

  const handleRemoveAsCommander = async () => {
    if (!cardContextMenu) return;
    const { cardIndex } = cardContextMenu;
    const cardToMove = commanders[cardIndex];

    if (cardToMove) {
        const newCommanders = commanders.filter((_, i) => i !== cardIndex);
        const allCards = Object.values(groupedCards).flat();
        const newMainDeck = [...allCards, cardToMove];
        setCommanders(newCommanders);
        setGroupedCards(groupCardsByType(newMainDeck));
        await saveDeck(newCommanders, newMainDeck);
    }
  };
  
  const handleAddCard = () => {
      if (!cardContextMenu) return;
      const { card, cardIndex, isCommander } = cardContextMenu;

      let allCards;
      if (isCommander) {
          allCards = [...commanders];
          const newCard = { ...card, instanceId: crypto.randomUUID() };
          allCards.splice(cardIndex + 1, 0, newCard);
          setCommanders(allCards);
          saveDeck(allCards, Object.values(groupedCards).flat());
      } else {
          allCards = Object.values(groupedCards).flat();
          const newCard = { ...card, instanceId: crypto.randomUUID() };
          allCards.splice(cardIndex + 1, 0, newCard);
          setGroupedCards(groupCardsByType(allCards));
          saveDeck(commanders, allCards);
      }
  };

  const handleRemoveCard = () => {
      if (!cardContextMenu) return;
      const { cardIndex, isCommander } = cardContextMenu;
      
      if (isCommander) {
          const newCommanders = commanders.filter((_, i) => i !== cardIndex);
          setCommanders(newCommanders);
          saveDeck(newCommanders, Object.values(groupedCards).flat());
      } else {
          const allCards = Object.values(groupedCards).flat();
          const newMainDeck = allCards.filter((_, i) => i !== cardIndex);
          setGroupedCards(groupCardsByType(newMainDeck));
          saveDeck(commanders, newMainDeck);
      }
  };
  
  const handleReplaceCard = async (faceToReplace: 0 | 1) => {
      if (!cardContextMenu) return;
      const { card: originalCard, cardIndex, isCommander } = cardContextMenu;

      const url = prompt(`Enter Scryfall URL for the new ${faceToReplace === 0 ? 'front' : 'back'} face:`);
      if (!url) return;

      setIsLoading(true);
      setLoadingMessage('Fetching replacement card...');
      try {
          const newCardData = await getCardByUrl(url);
          if (!newCardData) throw new Error("Card not found at URL.");
          
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
          
          if(isCommander) {
              const newCommanders = [...commanders];
              newCommanders[cardIndex] = modifiedCard;
              setCommanders(newCommanders);
              await saveDeck(newCommanders, Object.values(groupedCards).flat());
          } else {
              const allCards = Object.values(groupedCards).flat();
              allCards[cardIndex] = modifiedCard;
              setGroupedCards(groupCardsByType(allCards));
              await saveDeck(commanders, allCards);
          }

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
      const { card: frontCard, cardIndex, isCommander } = cardContextMenu;

      const url = prompt("Enter Scryfall URL for the new back face:");
      if (!url) return;
      
      setIsLoading(true);
      setLoadingMessage('Fetching back face card...');
      try {
          const backCardData = await getCardByUrl(url);
          if (!backCardData) throw new Error("Card not found at URL.");

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
          
          if(isCommander) {
              const newCommanders = [...commanders];
              newCommanders[cardIndex] = newDfc;
              setCommanders(newCommanders);
              await saveDeck(newCommanders, Object.values(groupedCards).flat());
          } else {
              const allCards = Object.values(groupedCards).flat();
              allCards[cardIndex] = newDfc;
              setGroupedCards(groupCardsByType(allCards));
              await saveDeck(commanders, allCards);
          }

      } catch (err) {
          console.error("Error adding back face:", err);
          setError(err instanceof Error ? err.message : "An error occurred.");
      } finally {
          setIsLoading(false);
          setLoadingMessage('');
      }
  };

  const buildCardContextMenuOptions = (context: CardContextMenuState) => {
      const { card, isCommander } = context;
      const baseOptions = [
          { label: 'Add another copy', action: handleAddCard },
          { label: 'Remove this copy', action: handleRemoveCard }
      ];

      if (isCommander) {
          baseOptions.unshift({ label: 'Remove as Commander', action: handleRemoveAsCommander });
      } else {
          baseOptions.unshift({ label: 'Set as Commander', action: handleSetAsCommander });
      }

      const isDfc = card.card_faces && card.card_faces.length > 0;
      if (isDfc) {
          baseOptions.push({ label: 'Replace Front Face from URL...', action: () => handleReplaceCard(0) });
          if (card.card_faces && card.card_faces.length > 1) {
              baseOptions.push({ label: 'Replace Back Face from URL...', action: () => handleReplaceCard(1) });
          } else {
              baseOptions.push({ label: 'Add Back Face from URL...', action: () => handleReplaceCard(1) });
          }
      } else {
          baseOptions.push({ label: 'Replace Card from URL...', action: () => handleReplaceCard(0) });
          baseOptions.push({ label: 'Add Back Face from URL...', action: () => handleAddBackFace() });
      }
      return baseOptions;
  }

  const handleDeleteDeckRequest = () => {
    if (!deckContextMenu) return;
    setDeleteConfirmation(deckContextMenu.deckInfo);
    setDeckContextMenu(null);
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmation || !decksDirectoryHandle) return;
    
    try {
        await decksDirectoryHandle.removeEntry(deleteConfirmation.fileHandle.name);

        setNotification(`Deck "${deleteConfirmation.name}" deleted.`);
        setTimeout(() => setNotification(''), 3000);

        if (activeDeckFile?.name === deleteConfirmation.fileHandle.name) {
            setActiveDeckFile(null);
            setGroupedCards({});
            setCommanders([]);
            onDeckLoaded('', 0);
        }
        
        await refreshDeckList(decksDirectoryHandle);

    } catch (err) {
        console.error("Error deleting deck:", err);
        setError("Could not delete the deck file.");
    } finally {
        setDeleteConfirmation(null);
    }
  };

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

          await refreshDeckList(decksDirectoryHandle);
          setNotification(`Deck "${deckInfo.name}" duplicated as "${newDeckName}".`);
          setTimeout(() => setNotification(''), 3000);

      } catch (err) {
          console.error("Error duplicating deck:", err);
          setError("Could not duplicate the deck.");
      }
  };

  const handleRenameDeck = async () => {
    if (!deckContextMenu || !decksDirectoryHandle) return;
    const { deckInfo } = deckContextMenu;
    const originalFileHandle = deckInfo.fileHandle;

    const newDeckName = prompt("Enter new name for the deck:", deckInfo.name);
    if (!newDeckName || newDeckName.trim() === '' || newDeckName === deckInfo.name) return;

    try {
        setNotification('Renaming deck...');

        const file = await originalFileHandle.getFile();
        const text = await file.text();
        const deckData = JSON.parse(text);

        deckData.name = newDeckName;
        const newDeckJsonString = JSON.stringify(deckData, null, 2);
        const newFileName = `${newDeckName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
        
        const newFileHandle = await decksDirectoryHandle.getFileHandle(newFileName, { create: true });
        const writable = await newFileHandle.createWritable();
        await writable.write(newDeckJsonString);
        await writable.close();

        await decksDirectoryHandle.removeEntry(originalFileHandle.name);
        
        if (activeDeckFile?.name === originalFileHandle.name) {
            setActiveDeckFile(newFileHandle);
            onDeckLoaded(newDeckName, deckData.cards.length);
        }

        await refreshDeckList(decksDirectoryHandle);
        setNotification(`Deck renamed to "${newDeckName}".`);
        setTimeout(() => setNotification(''), 3000);

    } catch (err) {
        console.error("Error renaming deck:", err);
        setError("Could not rename the deck.");
    }
  };

  const handleAddCardByUrl = async () => {
    if (!deckContextMenu || !decksDirectoryHandle) return;
    const { deckInfo } = deckContextMenu;

    const url = prompt(`Enter Scryfall URL of the card to add to "${deckInfo.name}":`);
    if (!url) return;

    setIsLoading(true);
    setLoadingMessage('Fetching card data...');
    try {
        const newCardData = await getCardByUrl(url);
        if (!newCardData) {
            throw new Error("Card not found at the provided URL.");
        }

        setLoadingMessage('Adding card to deck file...');
        
        const file = await deckInfo.fileHandle.getFile();
        const text = await file.text();
        const deckData: { name: string; cards: CardType[]; commanders?: string[] } = JSON.parse(text);

        const newCardWithInstanceId = { ...newCardData, instanceId: crypto.randomUUID() };
        const updatedCards = [...deckData.cards, newCardWithInstanceId];
        
        const deckDataToSave = { ...deckData, cards: updatedCards };
        const deckJsonString = JSON.stringify(deckDataToSave, null, 2);

        const writable = await deckInfo.fileHandle.createWritable();
        await writable.write(deckJsonString);
        await writable.close();

        setNotification(`Card "${newCardData.name}" added to "${deckInfo.name}".`);
        setTimeout(() => setNotification(''), 3000);

        await refreshDeckList(decksDirectoryHandle);

        if (activeDeckFile?.name === deckInfo.fileHandle.name) {
            const commanderInstanceIds = new Set(deckDataToSave.commanders || []);
            const loadedCommanders = updatedCards.filter(c => c.instanceId && commanderInstanceIds.has(c.instanceId));
            const mainDeckCards = updatedCards.filter(c => !c.instanceId || !commanderInstanceIds.has(c.instanceId));
            
            setCommanders(loadedCommanders);
            setGroupedCards(groupCardsByType(mainDeckCards));
            onDeckLoaded(deckDataToSave.name, updatedCards.length);
        }

    } catch (err) {
        console.error("Error adding card from URL:", err);
        setError(err instanceof Error ? err.message : "An error occurred while adding the card.");
    } finally {
        setIsLoading(false);
        setLoadingMessage('');
    }
  };

  let cardCounter = 0;

  return (
    <>
      <DeckImportModal isOpen={isImportModalOpen} onClose={onCloseImportModal} onSave={handleSaveDeck} />
      {deleteConfirmation && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <h2>Delete Deck</h2>
            <p>Are you sure you want to delete the deck "{deleteConfirmation.name}"?</p>
            <div className="modal-actions">
              <button onClick={handleConfirmDelete}>Delete</button>
              <button onClick={() => setDeleteConfirmation(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      {cardContextMenu && (
          <ContextMenu
              x={cardContextMenu.x}
              y={cardContextMenu.y}
              onClose={() => setCardContextMenu(null)}
              options={buildCardContextMenuOptions(cardContextMenu)}
          />
      )}
      {deckContextMenu && (
          <ContextMenu
              x={deckContextMenu.x}
              y={deckContextMenu.y}
              onClose={() => setDeckContextMenu(null)}
              options={[
                  { label: 'Rename', action: handleRenameDeck },
                  { label: 'Duplicate', action: handleDuplicateDeck },
                  { label: 'Add Card from URL...', action: handleAddCardByUrl },
                  { label: 'Delete', action: handleDeleteDeckRequest },
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
              
              {!isLoading && commanders.length > 0 && (
                  <div className="card-type-section">
                      <h3 className="section-header" onClick={() => toggleSection('Commanders')}>
                          Commanders ({commanders.length})
                          <span>{collapsedSections['Commanders'] ? ' (Click to expand)' : ''}</span>
                      </h3>
                      {!collapsedSections['Commanders'] && (
                          <div className="cards-container deck-view-cards">
                              {commanders.map((card, index) => (
                                  <Card
                                      key={card.instanceId || `${card.id}-${index}`}
                                      card={card}
                                      imageDirectoryHandle={imagesDirectoryHandle}
                                      style={{ width: `${cardSize}px`, height: `${cardSize * 1.4}px` }}
                                      onContextMenu={(e) => handleCardRightClick(e, card, index, true)}
                                      onCardHover={onCardHover}
                                  />
                              ))}
                          </div>
                      )}
                  </div>
              )}

              {!isLoading && Object.keys(groupedCards).length === 0 && commanders.length === 0 && (
                <div className="game-loading">
                    <p>Select a deck from the list, or import a new one.</p>
                </div>
              )}
              {!isLoading && Object.entries(groupedCards).map(([type, cards]) => {
                  const baseIndex = cardCounter;
                  cardCounter += cards.length;
                  return (
                      <div key={type} className="card-type-section">
                          <h3 className="section-header" onClick={() => toggleSection(type)}>
                              {type} ({cards.length})<span>{collapsedSections[type] ? ' (Click to expand)' : ''}</span>
                          </h3>
                          {!collapsedSections[type] && (
                              <div className="cards-container deck-view-cards">
                                  {cards.map((card, index) => {
                                      const currentIndex = baseIndex + index;
                                      return (
                                          <Card
                                              key={card.instanceId || `${card.id}-${currentIndex}`}
                                              card={card}
                                              imageDirectoryHandle={imagesDirectoryHandle}
                                              style={{ width: `${cardSize}px`, height: `${cardSize * 1.4}px` }}
                                              onContextMenu={(e) => handleCardRightClick(e, card, currentIndex, false)}
                                              onCardHover={onCardHover}
                                          />
                                      );
                                  })}
                              </div>
                          )}
                      </div>
                  );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Decks;