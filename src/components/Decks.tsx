import React, { useState } from 'react';
import type { Card as CardType, CardIdentifier } from '../types';
import { getCardsFromNames } from '../api/scryfall';
import { groupCardsByType } from '../utils/cardUtils';
import { parseDecklist } from '../utils/parsing';
import { saveCardsToDB } from '../utils/db';
import DeckImportModal from './DeckImportModal';
import Card from './Card';

// Define the props for this component, including the new directory handle
interface DecksProps {
  imageDirectoryHandle: FileSystemDirectoryHandle | null;
}

// Define a type alias for the grouped cards state
type GroupedCards = Record<string, CardType[]>;

const Decks: React.FC<DecksProps> = ({ imageDirectoryHandle }) => {
  const [directoryHandle, setDirectoryHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [deckFiles, setDeckFiles] = useState<FileSystemFileHandle[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [groupedCards, setGroupedCards] = useState<GroupedCards>({});
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState('');

  /**
   * Scans the selected directory for .txt files and updates the deck list.
   */
  const refreshDeckList = async (dirHandle: FileSystemDirectoryHandle) => {
    const files = [];
    for await (const entry of dirHandle.values()) {
      if (entry.kind === 'file' && entry.name.endsWith('.txt')) {
        files.push(entry);
      }
    }
    setDeckFiles(files);
  };

  /**
   * Opens a directory picker for the user to select their main decks folder.
   */
  const handleSelectFolder = async () => {
    try {
      const dirHandle = await window.showDirectoryPicker();
      setDirectoryHandle(dirHandle);
      await refreshDeckList(dirHandle);
      setGroupedCards({});
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        console.info("User cancelled the folder selection dialog.");
      } else {
        console.error("Error selecting folder:", err);
      }
    }
  };

  /**
   * Saves a new deck by fetching card data, caching it, and saving the decklist as a .txt file.
   */
  const handleSaveDeck = async (deckName: string, decklistText: string) => {
    if (!directoryHandle) return;

    setIsLoading(true);
    setError('');

    try {
      const allCardIdentifiers = parseDecklist(decklistText);
      const uniqueIdentifierStrings = [...new Set(allCardIdentifiers.map(id => JSON.stringify(id)))];
      const uniqueIdentifiers = uniqueIdentifierStrings.map(s => JSON.parse(s) as CardIdentifier);

      setLoadingMessage(`Fetching ${uniqueIdentifiers.length} unique cards from Scryfall...`);
      const cardsFromApi = await getCardsFromNames(uniqueIdentifiers);

      setLoadingMessage('Saving cards to local database...');
      await saveCardsToDB(cardsFromApi);

      setLoadingMessage('Saving deck file...');
      const fileName = deckName.endsWith('.txt') ? deckName : `${deckName}.txt`;
      const fileHandle = await directoryHandle.getFileHandle(fileName, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(decklistText);
      await writable.close();

      await refreshDeckList(directoryHandle);

    } catch (err) {
      console.error("Error importing deck:", err);
      setError(err instanceof Error ? err.message : "Failed to import deck. Check console for details.");
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  };

  /**
   * Loads a selected deck, fetches card data, and reconstructs the full list for display.
   */
  const handleDeckSelected = async (fileHandle: FileSystemFileHandle) => {
    setIsLoading(true);
    setLoadingMessage('Loading deck...');
    setError('');
    setGroupedCards({});

    try {
      const file = await fileHandle.getFile();
      const text = await file.text();
      const decklistIdentifiers = parseDecklist(text);

      if (decklistIdentifiers.length === 0) {
        setIsLoading(false);
        return;
      }

      const uniqueIdentifierStrings = [...new Set(decklistIdentifiers.map(id => JSON.stringify(id)))];
      const uniqueIdentifiers = uniqueIdentifierStrings.map(s => JSON.parse(s) as CardIdentifier);
      
      setLoadingMessage(`Fetching data for ${uniqueIdentifiers.length} unique cards...`);
      const fetchedCards: CardType[] = await getCardsFromNames(uniqueIdentifiers);
      
      const cardLookup = new Map<string, CardType>();
      fetchedCards.forEach((card: CardType) => {
        const nameKey = card.name.toLowerCase();
        const specificKey = `${nameKey}|${card.set}|${card.collector_number}`;
        cardLookup.set(specificKey, card);
        if (!cardLookup.has(nameKey)) {
            cardLookup.set(nameKey, card);
        }
      });
      
      const notFoundIdentifiers: CardIdentifier[] = [];
      const fullDeckCards: CardType[] = [];

      decklistIdentifiers.forEach(id => {
        const nameKey = id.name.toLowerCase();
        let foundCard: CardType | undefined;

        if (id.set && id.collector_number) {
            const specificKey = `${nameKey}|${id.set}|${id.collector_number}`;
            foundCard = cardLookup.get(specificKey);
        }
        
        if (!foundCard) {
            foundCard = Array.from(cardLookup.values()).find(c => c.name.toLowerCase() === nameKey);
        }
        
        if (foundCard) {
            fullDeckCards.push(foundCard);
        } else {
            notFoundIdentifiers.push(id);
        }
      });
      
      if (notFoundIdentifiers.length > 0) {
           console.warn("Could not find a match for the following card identifiers:", notFoundIdentifiers);
           setError(`Could not find all cards (${notFoundIdentifiers.length} missing). Check the console (F12) for details.`);
      }

      setGroupedCards(groupCardsByType(fullDeckCards));

    } catch (err) {
      console.error("Error loading deck:", err);
      setError(err instanceof Error ? err.message : "Failed to load deck. The file might be corrupted or cards not found.");
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  };

  /**
   * Toggles the collapsed state of a card type section.
   */
  const toggleSection = (sectionName: string) => {
    setCollapsedSections(prev => ({ ...prev, [sectionName]: !prev[sectionName] }));
  };

  return (
    <>
      <DeckImportModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSaveDeck} />
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
            <ul>{deckFiles.map(file => (<li key={file.name} onClick={() => handleDeckSelected(file)} className="list-item">{file.name}</li>))}</ul>
          </div>
          <div className="spoiler-view-pane">
            {isLoading && <h2>{loadingMessage}</h2>}
            {error && <p className="error-message">{error}</p>}
            {!isLoading && Object.entries(groupedCards).map(([type, cards]) => (
              <div key={type} className="card-type-section">
                <h3 className="section-header" onClick={() => toggleSection(type)}>
                  {type} ({cards.length})<span>{collapsedSections[type] ? ' (Click to expand)' : ''}</span>
                </h3>
                {!collapsedSections[type] && (
                  <div className="cards-container">
                    {cards.map((card, index) => (
                      <Card key={`${card.id}-${index}`} card={card} imageDirectoryHandle={imageDirectoryHandle} />
                    ))}
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