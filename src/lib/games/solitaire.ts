import { Card } from '@/types';
import { createDeck, shuffleDeck } from '@/lib/engine';

export interface SolitaireState {
  tableau: Card[][];  // 7 columns
  foundation: Card[][]; // 4 piles (one per suit)
  stock: Card[];       // Draw pile
  waste: Card[];       // Discard pile
  moves: number;
  startTime: Date;
  isWon: boolean;
}

export const createSolitaireGame = (): SolitaireState => {
  const deck = shuffleDeck(createDeck());
  let cardIndex = 0;
  
  // Create tableau (7 columns)
  const tableau: Card[][] = [];
  for (let col = 0; col < 7; col++) {
    const column: Card[] = [];
    for (let row = 0; row <= col; row++) {
      const card = deck.cards[cardIndex];
      // Only the top card is face up
      column.push({
        ...card,
        faceUp: row === col,
      });
      cardIndex++;
    }
    tableau.push(column);
  }
  
  // Remaining cards go to stock
  const stock = deck.cards.slice(cardIndex).map(card => ({
    ...card,
    faceUp: false,
  }));
  
  return {
    tableau,
    foundation: [[], [], [], []],
    stock,
    waste: [],
    moves: 0,
    startTime: new Date(),
    isWon: false,
  };
};

export const canMoveToFoundation = (card: Card, foundation: Card[]): boolean => {
  if (foundation.length === 0) {
    return card.rank === 'A';
  }
  
  const topCard = foundation[foundation.length - 1];
  return card.suit === topCard.suit && card.value === topCard.value + 1;
};

export const canMoveToTableau = (card: Card, column: Card[]): boolean => {
  if (column.length === 0) {
    return card.rank === 'K';
  }
  
  const topCard = column[column.length - 1];
  const isAlternatingColor = 
    (card.suit === 'hearts' || card.suit === 'diamonds') !==
    (topCard.suit === 'hearts' || topCard.suit === 'diamonds');
  
  return isAlternatingColor && card.value === topCard.value - 1;
};

export const drawFromStock = (state: SolitaireState): SolitaireState => {
  if (state.stock.length === 0) {
    // Recycle waste back to stock
    return {
      ...state,
      stock: state.waste.map(card => ({ ...card, faceUp: false })).reverse(),
      waste: [],
      moves: state.moves + 1,
    };
  }
  
  const card = state.stock[0];
  return {
    ...state,
    stock: state.stock.slice(1),
    waste: [...state.waste, { ...card, faceUp: true }],
    moves: state.moves + 1,
  };
};

export const moveToFoundation = (
  state: SolitaireState,
  source: 'waste' | 'tableau',
  columnIndex?: number
): SolitaireState | null => {
  let card: Card | undefined;
  let newState = { ...state };
  
  if (source === 'waste') {
    if (state.waste.length === 0) return null;
    card = state.waste[state.waste.length - 1];
  } else if (source === 'tableau' && columnIndex !== undefined) {
    const column = state.tableau[columnIndex];
    if (column.length === 0) return null;
    card = column[column.length - 1];
  }
  
  if (!card) return null;
  
  // Find correct foundation pile
  const foundationIndex = ['hearts', 'diamonds', 'clubs', 'spades'].indexOf(card.suit);
  if (!canMoveToFoundation(card, state.foundation[foundationIndex])) {
    return null;
  }
  
  // Make the move
  const newFoundation = [...state.foundation];
  newFoundation[foundationIndex] = [...newFoundation[foundationIndex], card];
  
  if (source === 'waste') {
    newState = {
      ...newState,
      waste: state.waste.slice(0, -1),
      foundation: newFoundation,
      moves: state.moves + 1,
    };
  } else if (columnIndex !== undefined) {
    const newTableau = [...state.tableau];
    const column = [...newTableau[columnIndex]];
    column.pop();
    
    // Flip the new top card if any
    if (column.length > 0 && !column[column.length - 1].faceUp) {
      column[column.length - 1] = { ...column[column.length - 1], faceUp: true };
    }
    newTableau[columnIndex] = column;
    
    newState = {
      ...newState,
      tableau: newTableau,
      foundation: newFoundation,
      moves: state.moves + 1,
    };
  }
  
  // Check win condition
  newState.isWon = newState.foundation.every(pile => pile.length === 13);
  
  return newState;
};

export const moveCardsInTableau = (
  state: SolitaireState,
  fromColumn: number,
  toColumn: number,
  cardIndex: number
): SolitaireState | null => {
  const sourceColumn = state.tableau[fromColumn];
  const targetColumn = state.tableau[toColumn];
  const cardsToMove = sourceColumn.slice(cardIndex);
  
  if (cardsToMove.length === 0) return null;
  
  const firstCard = cardsToMove[0];
  if (!firstCard.faceUp) return null;
  
  if (!canMoveToTableau(firstCard, targetColumn)) {
    return null;
  }
  
  const newTableau = [...state.tableau];
  const newSourceColumn = sourceColumn.slice(0, cardIndex);
  
  // Flip the new top card if any
  if (newSourceColumn.length > 0 && !newSourceColumn[newSourceColumn.length - 1].faceUp) {
    newSourceColumn[newSourceColumn.length - 1] = {
      ...newSourceColumn[newSourceColumn.length - 1],
      faceUp: true,
    };
  }
  
  newTableau[fromColumn] = newSourceColumn;
  newTableau[toColumn] = [...targetColumn, ...cardsToMove];
  
  return {
    ...state,
    tableau: newTableau,
    moves: state.moves + 1,
  };
};

export const moveWasteToTableau = (
  state: SolitaireState,
  toColumn: number
): SolitaireState | null => {
  if (state.waste.length === 0) return null;
  
  const card = state.waste[state.waste.length - 1];
  const targetColumn = state.tableau[toColumn];
  
  if (!canMoveToTableau(card, targetColumn)) {
    return null;
  }
  
  const newTableau = [...state.tableau];
  newTableau[toColumn] = [...targetColumn, card];
  
  return {
    ...state,
    tableau: newTableau,
    waste: state.waste.slice(0, -1),
    moves: state.moves + 1,
  };
};

export const checkAutoComplete = (state: SolitaireState): boolean => {
  // All cards in tableau are face up and stock/waste are empty
  const allFaceUp = state.tableau.every(column =>
    column.every(card => card.faceUp)
  );
  return allFaceUp && state.stock.length === 0 && state.waste.length === 0;
};

export const autoComplete = (state: SolitaireState): SolitaireState => {
  let currentState = { ...state };
  let moved = true;
  
  while (moved) {
    moved = false;
    
    // Try to move cards from tableau to foundation
    for (let col = 0; col < 7; col++) {
      const result = moveToFoundation(currentState, 'tableau', col);
      if (result) {
        currentState = result;
        moved = true;
        break;
      }
    }
  }
  
  return currentState;
};
