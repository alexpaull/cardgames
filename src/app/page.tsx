'use client';

import { useState } from 'react';
import { 
  SolitaireGame, 
  BlackjackGame, 
  HeartsGame, 
  PokerGame, 
  AssholeGame 
} from '@/components/games';
import { Button, UICard } from '@/components/ui';

type GameType = 'solitaire' | 'blackjack' | 'poker' | 'hearts' | 'asshole' | null;

interface GameInfo {
  id: GameType;
  name: string;
  description: string;
  players: string;
  icon: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
}

const games: GameInfo[] = [
  {
    id: 'solitaire',
    name: 'Solitaire',
    description: 'Classic Klondike solitaire. Arrange cards in ascending order by suit.',
    players: 'Single Player',
    icon: '🃏',
    difficulty: 'Easy',
  },
  {
    id: 'blackjack',
    name: 'Blackjack',
    description: 'Beat the dealer by getting closest to 21 without going over.',
    players: 'vs Computer',
    icon: '🎰',
    difficulty: 'Easy',
  },
  {
    id: 'poker',
    name: 'Texas Hold\'em',
    description: 'The most popular poker variant. Make the best 5-card hand.',
    players: '2-4 Players',
    icon: '♠️',
    difficulty: 'Hard',
  },
  {
    id: 'hearts',
    name: 'Hearts',
    description: 'Avoid hearts and the Queen of Spades. Lowest score wins!',
    players: '4 Players',
    icon: '♥️',
    difficulty: 'Medium',
  },
  {
    id: 'asshole',
    name: 'President',
    description: 'Get rid of all your cards first to become President!',
    players: '4+ Players',
    icon: '👑',
    difficulty: 'Medium',
  },
];

export default function Home() {
  const [selectedGame, setSelectedGame] = useState<GameType>(null);

  const handleBack = () => setSelectedGame(null);

  // Render selected game
  if (selectedGame) {
    switch (selectedGame) {
      case 'solitaire':
        return <SolitaireGame onBack={handleBack} />;
      case 'blackjack':
        return <BlackjackGame onBack={handleBack} />;
      case 'poker':
        return <PokerGame onBack={handleBack} />;
      case 'hearts':
        return <HeartsGame onBack={handleBack} />;
      case 'asshole':
        return <AssholeGame onBack={handleBack} />;
    }
  }

  // Home page with game selection
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-800 to-green-950">
      {/* Header */}
      <header className="py-8 px-4 text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
          🃏 Card Games
        </h1>
        <p className="text-green-200 text-lg">
          Play classic card games online or against the computer
        </p>
      </header>

      {/* Game Grid */}
      <main className="max-w-6xl mx-auto px-4 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {games.map((game) => (
            <UICard
              key={game.id}
              className="hover:scale-105 transition-transform cursor-pointer"
              onClick={() => setSelectedGame(game.id)}
            >
              <div className="text-center">
                <div className="text-6xl mb-4">{game.icon}</div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">
                  {game.name}
                </h2>
                <p className="text-gray-600 mb-4">
                  {game.description}
                </p>
                <div className="flex justify-between items-center text-sm">
                  <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full">
                    {game.players}
                  </span>
                  <span className={`px-3 py-1 rounded-full ${
                    game.difficulty === 'Easy' 
                      ? 'bg-blue-100 text-blue-800'
                      : game.difficulty === 'Medium'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {game.difficulty}
                  </span>
                </div>
              </div>
            </UICard>
          ))}
        </div>

        {/* Features Section */}
        <section className="mt-16 text-center text-white">
          <h2 className="text-3xl font-bold mb-8">Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white bg-opacity-10 rounded-xl p-6">
              <div className="text-4xl mb-4">📱</div>
              <h3 className="text-xl font-semibold mb-2">PWA Support</h3>
              <p className="text-green-200">
                Install on your device and play offline anytime
              </p>
            </div>
            <div className="bg-white bg-opacity-10 rounded-xl p-6">
              <div className="text-4xl mb-4">🤖</div>
              <h3 className="text-xl font-semibold mb-2">Smart AI</h3>
              <p className="text-green-200">
                Play against intelligent computer opponents
              </p>
            </div>
            <div className="bg-white bg-opacity-10 rounded-xl p-6">
              <div className="text-4xl mb-4">🌐</div>
              <h3 className="text-xl font-semibold mb-2">Multiplayer Ready</h3>
              <p className="text-green-200">
                Play with friends online in real-time
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="text-center py-8 text-green-300 text-sm">
        <p>© 2024 Card Games. All rights reserved.</p>
        <p className="mt-2">
          Built with Next.js, React, and TypeScript
        </p>
      </footer>
    </div>
  );
}
