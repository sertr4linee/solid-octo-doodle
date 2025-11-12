// Palette de couleurs pour Dither (valeurs RGB normalisées 0-1)

export const DITHER_COLORS = {
  // Couleurs Trello/Epitrello
  trelloBlue: [0.0, 0.47, 0.75] as [number, number, number],    // #0079BF
  trelloPurple: [0.32, 0.26, 0.67] as [number, number, number], // #5243AA
  trelloCyan: [0.0, 0.76, 0.88] as [number, number, number],    // #00C2E0
  
  // Variantes subtiles
  lightGray: [0.7, 0.7, 0.7] as [number, number, number],
  darkGray: [0.3, 0.3, 0.3] as [number, number, number],
  softBlue: [0.4, 0.6, 0.8] as [number, number, number],
  
  // Couleurs vives
  vibrantBlue: [0.0, 0.5, 1.0] as [number, number, number],
  vibrantPurple: [0.5, 0.0, 1.0] as [number, number, number],
  vibrantCyan: [0.0, 1.0, 1.0] as [number, number, number],
  
  // Teintes chaudes
  warmOrange: [1.0, 0.5, 0.0] as [number, number, number],
  warmRed: [1.0, 0.2, 0.2] as [number, number, number],
  
  // Teintes froides
  coolMint: [0.0, 0.8, 0.6] as [number, number, number],
  coolPurple: [0.4, 0.0, 0.8] as [number, number, number],
};

export const DITHER_PRESETS = {
  // Preset pour Hero Section
  hero: {
    waveColor: DITHER_COLORS.trelloBlue,
    colorNum: 6,
    pixelSize: 3,
    waveSpeed: 0.04,
    waveFrequency: 2.5,
    waveAmplitude: 0.25,
    enableMouseInteraction: true,
    mouseRadius: 0.3,
  },
  
  // Preset subtil pour backgrounds
  subtle: {
    waveColor: DITHER_COLORS.lightGray,
    colorNum: 4,
    pixelSize: 4,
    waveSpeed: 0.02,
    waveFrequency: 2,
    waveAmplitude: 0.15,
    enableMouseInteraction: false,
    mouseRadius: 0,
  },
  
  // Preset dynamique
  dynamic: {
    waveColor: DITHER_COLORS.vibrantBlue,
    colorNum: 8,
    pixelSize: 2,
    waveSpeed: 0.08,
    waveFrequency: 4,
    waveAmplitude: 0.35,
    enableMouseInteraction: true,
    mouseRadius: 0.5,
  },
  
  // Preset rétro
  retro: {
    waveColor: DITHER_COLORS.trelloPurple,
    colorNum: 4,
    pixelSize: 5,
    waveSpeed: 0.03,
    waveFrequency: 2,
    waveAmplitude: 0.2,
    enableMouseInteraction: true,
    mouseRadius: 0.25,
  },
};
