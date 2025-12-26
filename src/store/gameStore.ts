import { create } from 'zustand';
import { GameState, GameType, Player, Card } from '@/types';
import { createDeck, shuffleDeck } from '@/lib/engine';

interface GameStore {
  currentGame: GameState | null;
  games: GameState[];
  
  // Actions
  createGame: (type: GameType, players: Player[]) => GameState;
  joinGame: (gameId: string, player: Player) => void;
  leaveGame: (gameId: string, playerId: string) => void;
  updateGameState: (gameId: string, updates: Partial<GameState>) => void;
  endGame: (gameId: string, winnerId?: string) => void;
  setCurrentGame: (game: GameState | null) => void;
  
  // Player actions
  updatePlayer: (gameId: string, playerId: string, updates: Partial<Player>) => void;
  setPlayerHand: (gameId: string, playerId: string, hand: Card[]) => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  currentGame: null,
  games: [],
  
  createGame: (type: GameType, players: Player[]) => {
    const deck = shuffleDeck(createDeck());
    const game: GameState = {
      id: crypto.randomUUID ? crypto.randomUUID() : `game-${Date.now()}`,
      type,
      status: 'waiting',
      players,
      currentPlayerIndex: 0,
      deck,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    set(state => ({
      games: [...state.games, game],
      currentGame: game,
    }));
    
    return game;
  },
  
  joinGame: (gameId: string, player: Player) => {
    set(state => ({
      games: state.games.map(game =>
        game.id === gameId
          ? {
              ...game,
              players: [...game.players, player],
              updatedAt: new Date(),
            }
          : game
      ),
      currentGame:
        state.currentGame?.id === gameId
          ? {
              ...state.currentGame,
              players: [...state.currentGame.players, player],
              updatedAt: new Date(),
            }
          : state.currentGame,
    }));
  },
  
  leaveGame: (gameId: string, playerId: string) => {
    set(state => ({
      games: state.games.map(game =>
        game.id === gameId
          ? {
              ...game,
              players: game.players.filter(p => p.id !== playerId),
              updatedAt: new Date(),
            }
          : game
      ),
      currentGame:
        state.currentGame?.id === gameId
          ? {
              ...state.currentGame,
              players: state.currentGame.players.filter(p => p.id !== playerId),
              updatedAt: new Date(),
            }
          : state.currentGame,
    }));
  },
  
  updateGameState: (gameId: string, updates: Partial<GameState>) => {
    set(state => ({
      games: state.games.map(game =>
        game.id === gameId
          ? { ...game, ...updates, updatedAt: new Date() }
          : game
      ),
      currentGame:
        state.currentGame?.id === gameId
          ? { ...state.currentGame, ...updates, updatedAt: new Date() }
          : state.currentGame,
    }));
  },
  
  endGame: (gameId: string, winnerId?: string) => {
    set(state => ({
      games: state.games.map(game =>
        game.id === gameId
          ? {
              ...game,
              status: 'finished' as const,
              winner: winnerId,
              updatedAt: new Date(),
            }
          : game
      ),
      currentGame:
        state.currentGame?.id === gameId
          ? {
              ...state.currentGame,
              status: 'finished' as const,
              winner: winnerId,
              updatedAt: new Date(),
            }
          : state.currentGame,
    }));
  },
  
  setCurrentGame: (game: GameState | null) => {
    set({ currentGame: game });
  },
  
  updatePlayer: (gameId: string, playerId: string, updates: Partial<Player>) => {
    set(state => ({
      games: state.games.map(game =>
        game.id === gameId
          ? {
              ...game,
              players: game.players.map(p =>
                p.id === playerId ? { ...p, ...updates } : p
              ),
              updatedAt: new Date(),
            }
          : game
      ),
      currentGame:
        state.currentGame?.id === gameId
          ? {
              ...state.currentGame,
              players: state.currentGame.players.map(p =>
                p.id === playerId ? { ...p, ...updates } : p
              ),
              updatedAt: new Date(),
            }
          : state.currentGame,
    }));
  },
  
  setPlayerHand: (gameId: string, playerId: string, hand: Card[]) => {
    const { updatePlayer } = get();
    updatePlayer(gameId, playerId, { hand });
  },
}));
