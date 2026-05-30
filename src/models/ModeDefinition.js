/**
 * Static registry of all available game modes
 */
export const GAME_MODES = {
    banderaFlash:  { id: 'banderaFlash',  name: 'Bandera Flash',         icon: '🏴', category: 'team',       description: 'Adivina el país por su bandera' },
    capitalQuest:  { id: 'capitalQuest',  name: 'Búsqueda de Capitales', icon: '🏛️', category: 'team',       description: 'Adivina la capital del país' },
    flagRush:      { id: 'flagRush',      name: 'Carrera de Banderas',   icon: '🚩', category: 'individual', description: 'Elige el país correcto a contrarreloj' },
    capitalClash:  { id: 'capitalClash',  name: 'Duelo de Capitales',    icon: '⚔️', category: 'individual', description: 'Elige la capital correcta' },
    letrasEnCaida: { id: 'letrasEnCaida', name: 'Letras en Caída',       icon: '✏️', category: 'individual', description: 'Adivina antes de que caigan todas' },
    streakBlitz:   { id: 'streakBlitz',   name: 'Racha Relámpago',       icon: '⚡', category: 'individual', description: 'Mezcla banderas y capitales, elige tu desafío' },
    geoPuzzle:     { id: 'geoPuzzle',     name: 'Geo Pistas',            icon: '🧩', category: 'individual', description: 'Pistas progresivas, menos = más puntos' },
};
