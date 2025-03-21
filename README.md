# Killer Queen 3D

A browser-based multiplayer 3D adaptation of the popular arcade game Killer Queen. This version brings the classic team-based strategy game into a 3D environment, while maintaining the core game mechanics and victory conditions.

## Game Overview

Killer Queen is a team-based competitive game where two teams (Blue and Gold) battle for victory through one of three possible win conditions:

1. **Economic Victory**: Collect 12 berries and return them to your hive
2. **Military Victory**: Kill the enemy queen three times
3. **Snail Victory**: Ride the snail to your team's goal

## Characters

Each team has three character types:

- **Queen**: Agile and powerful leader who can fly short distances
- **Worker**: Can collect berries and ride the snail
- **Soldier**: Can attack and eliminate opposing team members

## Technology Stack

- **Frontend**: React, TypeScript, Three.js (via React Three Fiber)
- **3D Physics**: Rapier physics engine 
- **Networking**: Socket.IO for real-time multiplayer communication
- **State Management**: Zustand

## Prerequisites

- Node.js (v14+)
- npm or yarn

## Setup and Installation

### Client

```bash
# Install dependencies
npm install

# Start the development server
npm run dev
```

### Server

```bash
# Navigate to server directory
cd server

# Install dependencies
npm install

# Start the development server
npm run dev
```

## How to Play

1. Open your browser and navigate to `http://localhost:5173`
2. Wait for the game to connect to the server
3. You'll be automatically assigned to a team and role
4. Use the following controls:
   - WASD: Movement
   - Space: Jump
   - Mouse: Look around
   
## Game Objectives

Depending on your role, you have different objectives:

### Queen
- Lead your team
- Avoid being killed by enemy soldiers

### Worker
- Collect berries from the field and bring them to your hive
- Ride the snail toward your goal

### Soldier
- Protect your queen and workers
- Eliminate enemy workers and queen

## Development

### Project Structure

```
/
├── src/                  # Client-side code
│   ├── components/       # React components
│   ├── game/             # Game-specific code
│   │   ├── models/       # 3D models and characters
│   │   ├── scenes/       # Game environments
│   │   └── utils/        # Utility functions
│   ├── networking/       # Socket.IO client implementation
│   └── store/            # State management
├── server/               # Server-side code
│   └── src/              # Server source code
├── public/               # Static assets
└── index.html            # HTML entry point
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- Original Killer Queen arcade game by BumbleBear Games
- Three.js and React Three Fiber communities for amazing 3D web tools
