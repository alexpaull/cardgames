# Card Games PWA

A Progressive Web Application for playing classic card games online. Play against the computer or with friends!

## Features

- 🃏 **5 Classic Card Games**
  - Solitaire (Klondike)
  - Blackjack
  - Texas Hold'em Poker
  - Hearts
  - President (Asshole)

- 📱 **PWA Support**
  - Install on any device
  - Works offline
  - Native app-like experience

- 🤖 **Smart AI**
  - Play against intelligent computer opponents
  - Challenging gameplay for all skill levels

- 🎨 **Modern UI**
  - Responsive design
  - Beautiful card animations
  - Server-side rendering

## Tech Stack

- **Framework**: Next.js 16 with App Router (SSR)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Real-time**: Socket.io (for multiplayer)
- **Testing**: Jest + React Testing Library

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/alexpaull/cardgames.git
cd cardgames

# Install dependencies
npm install

# Start development server
npm run dev
```

### Build for Production

```bash
npm run build
npm start
```

## Game Rules

### Solitaire
Classic Klondike solitaire. Build foundation piles from Ace to King by suit.

### Blackjack
Get as close to 21 as possible without going over. Beat the dealer!

### Texas Hold'em
Make the best 5-card hand using your 2 hole cards and 5 community cards.

### Hearts
Avoid taking hearts and the Queen of Spades. Lowest score wins!

### President
Be the first to get rid of all your cards to become President!

## Project Structure

```
src/
├── app/           # Next.js App Router pages
├── components/    # React components
│   ├── cards/     # Card display components
│   ├── games/     # Game-specific components
│   └── ui/        # Reusable UI components
├── lib/
│   ├── engine/    # Core card/deck logic
│   └── games/     # Game-specific logic
├── store/         # Zustand state management
├── types/         # TypeScript type definitions
└── hooks/         # Custom React hooks
```

## License

MIT License - feel free to use this project for learning or building your own games!
