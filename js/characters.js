'use strict';

/*
  CHARACTER ROSTER — Cuban Double-Nine Dominos
  -----------------------------------------------
  Each NPC represents one difficulty level.
  Portraits go in assets/characters/ named by portraitFile.
  Add new characters by appending to this array.
  Levels 1–14 planned; slots beyond provided portraits show silhouette.

  aiStrategy values (matched in ai.js):
    'random'      - plays any valid tile randomly (Level 1–2)
    'greedy'      - plays tile with most pips to empty hand fast (Level 3–4)
    'defensive'   - limits opponent options (Level 5–7)
    'strategic'   - maximizes own future moves + pip management (Level 8–10)
    'expert'      - full lookahead + opponent hand inference (Level 11–14)
*/

const CHARACTERS = [
  {
    id: 'npc_01',
    name: 'TBD',              // Replace with real name
    level: 1,
    difficulty: 'beginner',
    portraitFile: 'npc_01.jpg',
    hometown: 'Havana',
    trait: 'Reckless',
    quote: 'I play with my heart, not my head.',
    bio: 'A cheerful beginner who plays whatever tile catches his eye.',
    aiStrategy: 'random',
  },
  {
    id: 'npc_02',
    name: 'TBD',              // Replace with real name
    level: 2,
    difficulty: 'beginner',
    portraitFile: 'npc_02.jpg',
    hometown: 'Trinidad, Cuba',
    trait: 'Carefree',
    quote: 'Every game is just a story waiting to be told.',
    bio: 'A warm soul who plays for fun, not glory.',
    aiStrategy: 'random',
  },
  {
    id: 'npc_03',
    name: 'TBD',
    level: 3,
    difficulty: 'easy',
    portraitFile: 'npc_03.jpg',
    hometown: 'Santiago de Cuba',
    trait: 'Impulsive',
    quote: 'The double-nine never stays in my hand for long.',
    bio: 'Plays fast and loose — good at shedding high pips early.',
    aiStrategy: 'greedy',
  },
  {
    id: 'npc_04',
    name: 'TBD',
    level: 4,
    difficulty: 'easy',
    portraitFile: 'npc_04.jpg',
    hometown: 'Camagüey',
    trait: 'Eager',
    quote: 'Speed is my strategy.',
    bio: 'Races to empty their hand at all costs.',
    aiStrategy: 'greedy',
  },
  {
    id: 'npc_05',
    name: 'TBD',
    level: 5,
    difficulty: 'medium',
    portraitFile: 'npc_05.jpg',
    hometown: 'Cienfuegos',
    trait: 'Cunning',
    quote: 'I close doors you didn\'t know were open.',
    bio: 'Starts thinking about your hand, not just their own.',
    aiStrategy: 'defensive',
  },
  {
    id: 'npc_06',
    name: 'TBD',
    level: 6,
    difficulty: 'medium',
    portraitFile: 'npc_06.jpg',
    hometown: 'Matanzas',
    trait: 'Patient',
    quote: 'The right tile at the right moment wins everything.',
    bio: 'Waits for the perfect play instead of rushing.',
    aiStrategy: 'defensive',
  },
  {
    id: 'npc_07',
    name: 'TBD',
    level: 7,
    difficulty: 'medium',
    portraitFile: 'npc_07.jpg',
    hometown: 'Holguín',
    trait: 'Tactical',
    quote: 'Control the board, control the game.',
    bio: 'Actively blocks opponents from playing their heavy tiles.',
    aiStrategy: 'defensive',
  },
  {
    id: 'npc_08',
    name: 'TBD',
    level: 8,
    difficulty: 'hard',
    portraitFile: 'npc_08.jpg',
    hometown: 'Havana',
    trait: 'Calculated',
    quote: 'Every tile tells me what you\'re holding.',
    bio: 'Begins tracking which tiles have been played.',
    aiStrategy: 'strategic',
  },
  {
    id: 'npc_09',
    name: 'TBD',
    level: 9,
    difficulty: 'hard',
    portraitFile: 'npc_09.jpg',
    hometown: 'Havana',
    trait: 'Sharp',
    quote: 'I don\'t play tiles. I play people.',
    bio: 'Reads opponent passing patterns to infer their hand.',
    aiStrategy: 'strategic',
  },
  {
    id: 'npc_10',
    name: 'TBD',
    level: 10,
    difficulty: 'hard',
    portraitFile: 'npc_10.jpg',
    hometown: 'Havana',
    trait: 'Composed',
    quote: 'The blocked game is where legends are made.',
    bio: 'Masters the art of the blocked board — always wins when stuck.',
    aiStrategy: 'strategic',
  },
  {
    id: 'npc_11',
    name: 'TBD',
    level: 11,
    difficulty: 'expert',
    portraitFile: 'npc_11.jpg',
    hometown: 'Havana',
    trait: 'Relentless',
    quote: 'I\'ve counted every tile you haven\'t played.',
    bio: 'Near-perfect tile tracking and probability math.',
    aiStrategy: 'expert',
  },
  {
    id: 'npc_12',
    name: 'TBD',
    level: 12,
    difficulty: 'expert',
    portraitFile: 'npc_12.jpg',
    hometown: 'Havana',
    trait: 'Ice-cold',
    quote: 'Emotions are for losing.',
    bio: 'Purely analytical — no patterns, no tells, no mercy.',
    aiStrategy: 'expert',
  },
  {
    id: 'npc_13',
    name: 'TBD',
    level: 13,
    difficulty: 'master',
    portraitFile: 'npc_13.jpg',
    hometown: 'Havana',
    trait: 'Legendary',
    quote: 'I\'ve never lost a hand I didn\'t choose to lose.',
    bio: 'The hall champion — knows the odds before the tiles are dealt.',
    aiStrategy: 'expert',
  },
  {
    id: 'npc_14',
    name: 'TBD',
    level: 14,
    difficulty: 'master',
    portraitFile: 'npc_14.jpg',
    hometown: 'Unknown',
    trait: 'Mythic',
    quote: '...',
    bio: 'No one knows where this player came from. No one has beaten them.',
    aiStrategy: 'expert',
  },
];

// Lookup helper
const CharacterDB = {
  getById(id) {
    return CHARACTERS.find(c => c.id === id) || null;
  },
  getAll() {
    return CHARACTERS;
  },
  difficultyOrder: ['beginner', 'easy', 'medium', 'hard', 'expert', 'master'],
};
