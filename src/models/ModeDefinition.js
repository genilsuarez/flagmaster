/**
 * Static registry of all available game modes
 */
export const GAME_MODES = {
    banderaFlash:  { id: 'banderaFlash',  name: 'Bandera Flash',   icon: '🏴', category: 'team',       description: 'Adivina el país por su bandera' },
    capitalQuest:  { id: 'capitalQuest',  name: 'Capital Quest',   icon: '🏛️', category: 'team',       description: 'Adivina la capital del país' },
    letrasEnCaida: { id: 'letrasEnCaida', name: 'Letras en Caída', icon: '✏️', category: 'individual', description: 'Adivina antes de que caigan todas' },
    flagRush:      { id: 'flagRush',      name: 'Flag Rush',       icon: '🚩', category: 'individual', description: 'Elige el país correcto a contrarreloj' },
    capitalClash:  { id: 'capitalClash',  name: 'Capital Clash',   icon: '⚔️', category: 'individual', description: 'Elige la capital correcta' },
    streakBlitz:   { id: 'streakBlitz',   name: 'Streak Blitz',    icon: '⚡', category: 'individual', description: 'Mezcla banderas y capitales, elige tu desafío' },
    geoPuzzle:     { id: 'geoPuzzle',     name: 'Geo Puzzle',      icon: '🧩', category: 'individual', description: 'Pistas progresivas, menos = más puntos' },
};
