'use strict';

/*
  CHARACTER ROSTER — Cuban Double-Nine Dominos
  -----------------------------------------------
  Real family characters replace TBD placeholders.
  Portraits go in assets/characters/ named by portraitFile.
  Silhouette fallback: assets/characters/silhouette.svg

  aiStrategy values (matched in ai.js):
    'random'    - plays any valid tile randomly          (Level 0–2)
    'greedy'    - sheds highest-pip tiles fast           (Level 3–4)
    'defensive' - limits opponent options                (Level 5–7)
    'strategic' - pip management + future-move scoring   (Level 8–10)
    'expert'    - full lookahead + hand inference        (Level 11+)
*/

const CHARACTERS = [
  {
    id: 'libby',
    name: 'Libby',
    level: 0,
    difficulty: 'tutorial',
    portraitFile: 'Libby.png',
    hometown: 'Miami, FL',
    archetype: 'Tutorial NPC',
    playstyle: 'Pure Innocence',
    trait: 'Chaotic Adorable',
    skills: [
      'Button mashing',
      'Smiling at critical moments',
      'Accidentally touching dominoes',
    ],
    specialAbility: {
      name: 'Chaos Gremlin',
      description: 'All players lose concentration when Libby enters the room.',
    },
    weakness: 'Snack distractions.',
    quote: 'I wanna play too!',
    bio: 'Libby is technically not a competitive player yet, but her presence changes the energy of the table completely. Future potential remains unknown.',
    aiStrategy: 'random',
  },
  {
    id: 'alex',
    name: 'Alex',
    level: 1,
    difficulty: 'beginner',
    portraitFile: 'Alex.png',
    hometown: 'Miami, FL',
    archetype: 'Confused Recruit',
    playstyle: 'Random Survival',
    trait: 'Accidentally dangerous',
    skills: [
      'Occasionally lucky',
      'Enthusiastic participation',
      'Learns slowly under pressure',
    ],
    specialAbility: {
      name: "Beginner's Luck",
      description: "Rare chance to accidentally ruin advanced players' setups.",
    },
    weakness: 'Everything.',
    quote: 'Wait… why was that bad?',
    bio: "Alex is still learning table etiquette, strategy, and rhythm. Veteran players simultaneously fear and pity him because randomness is surprisingly dangerous.",
    aiStrategy: 'random',
  },
  {
    id: 'bryson',
    name: 'Bryson',
    level: 2,
    difficulty: 'beginner',
    portraitFile: 'Bryson.png',
    hometown: 'Miami, FL',
    archetype: 'Reckless Rookie',
    playstyle: 'Emotional Aggressor',
    trait: 'Fearlessly chaotic',
    skills: [
      'Fearless plays',
      'Quick reactions',
      'Momentum-based confidence',
    ],
    specialAbility: {
      name: 'Send It',
      description: 'Bryson gains confidence after risky plays succeed.',
    },
    weakness: 'Predictable aggression.',
    quote: 'We ball.',
    bio: 'Bryson plays like someone trying to skip the tutorial. Bold, chaotic, and occasionally brilliant. He either crashes spectacularly or shocks everyone.',
    aiStrategy: 'random',
  },
  {
    id: 'jt',
    name: 'JT',
    level: 3,
    difficulty: 'easy',
    portraitFile: 'JT.png',
    hometown: 'Miami, FL',
    archetype: 'Young Gun',
    playstyle: 'Fast Instinct Learner',
    trait: 'Rising prodigy',
    skills: [
      'Learns patterns quickly',
      'Aggressive experimentation',
      'Good confidence',
      'Fast adaptation',
    ],
    specialAbility: {
      name: 'Hot Streak',
      description: 'JT becomes significantly stronger after consecutive wins.',
    },
    weakness: 'Impatience.',
    quote: 'Run it back.',
    bio: 'JT has future talent written all over him. Still rough around the edges, but dangerous because he mixes gaming mentality with natural instincts. Veterans are beginning to notice.',
    aiStrategy: 'greedy',
  },
  {
    id: 'john',
    name: 'John',
    level: 5,
    difficulty: 'medium',
    portraitFile: 'John.png',
    hometown: 'Miami, FL',
    archetype: 'Adaptive Hustler',
    playstyle: 'Strategic Opportunist',
    trait: 'Psychologically cunning',
    skills: [
      'Reads momentum well',
      'Good mid-game recovery',
      'Strong psychological banter',
      'Occasionally overcommits trying to outsmart the table',
    ],
    specialAbility: {
      name: 'Lo Siento',
      description: 'Once per match, John can force opponents to second-guess a confident move through pure table energy and distraction.',
    },
    weakness: 'Can get too experimental chasing a big-brain play.',
    quote: 'Lo siento… no habla español.',
    bio: "John is the player who studies people as much as dominoes. He enjoys the social warfare almost as much as winning. He's dangerous when underestimated and tends to evolve throughout a night of games. Not the strongest technical player, but one of the hardest to mentally lock down.",
    aiStrategy: 'defensive',
  },
  {
    id: 'robert',
    name: 'Robert',
    level: 5,
    difficulty: 'medium',
    portraitFile: 'Robert.png',
    hometown: 'Havana, Cuba',
    archetype: 'Old School Grinder',
    playstyle: 'Methodical Pressure',
    trait: 'Classically disciplined',
    skills: [
      'Strong fundamentals',
      'Excellent patience',
      'Efficient blocking',
      'Reliable consistency',
    ],
    specialAbility: {
      name: 'Veteran Presence',
      description: 'Less experienced players become nervous against Robert.',
    },
    weakness: 'Can struggle against hyper-chaotic players.',
    quote: 'Slow down. Think.',
    bio: 'Robert represents old-school domino discipline. Not flashy, not loud, just solid. He wins through positioning, patience, and forcing mistakes.',
    aiStrategy: 'defensive',
  },
  {
    id: 'emily',
    name: 'Emily',
    level: 6,
    difficulty: 'medium',
    portraitFile: 'Emily.png',
    hometown: 'Miami, FL',
    archetype: 'Social Predator',
    playstyle: 'Emotional Manipulator',
    trait: 'Socially weaponized',
    skills: [
      'Reads reactions well',
      'Strong conversational distraction',
      'Opportunistic finishing',
      'Good pressure handling',
    ],
    specialAbility: {
      name: 'Side Eye',
      description: 'Emily gains advantage whenever opponents start explaining themselves too much.',
    },
    weakness: 'Can lose focus if games drag too long.',
    quote: 'Oh NOW you wanna play smart?',
    bio: 'Emily weaponizes personality. She thrives in loud family games where emotions start overriding logic. Not the strongest pure strategist, but extremely dangerous socially.',
    aiStrategy: 'defensive',
  },
  {
    id: 'mikey',
    name: 'Mikey',
    level: 7,
    difficulty: 'hard',
    portraitFile: 'Mikey.png',
    hometown: 'Miami, FL',
    archetype: 'Chaos Engine',
    playstyle: 'Momentum Gambler',
    trait: 'Gloriously unpredictable',
    skills: [
      'High-risk clutch plays',
      'Natural luck',
      'Strong comeback energy',
      'Unpredictable sequencing',
    ],
    specialAbility: {
      name: 'Wildcard',
      description: 'Mikey occasionally makes objectively terrible moves that somehow work perfectly.',
    },
    weakness: 'Consistency.',
    quote: 'Trust me bro, I got this.',
    bio: "Nobody is ever fully comfortable playing Mikey because even Mikey doesn't know what Mikey is doing sometimes. Dangerous in casual games and emotionally fueled matches.",
    aiStrategy: 'strategic',
  },
  {
    id: 'yve',
    name: 'Yve',
    level: 9,
    difficulty: 'hard',
    portraitFile: 'Yve.png',
    hometown: 'Miami, FL',
    archetype: 'Silent Queen',
    playstyle: 'Precision Controller',
    trait: 'Ice-cold precision',
    skills: [
      'Elite memory tracking',
      'Calm under pressure',
      'Punishes mistakes instantly',
      'Reads team dynamics exceptionally well',
    ],
    specialAbility: {
      name: 'Cold Table',
      description: 'The longer the match goes, the stronger Yve becomes. Opponents slowly lose confidence and tempo.',
    },
    weakness: 'Occasionally too patient when an aggressive finish is available.',
    quote: 'You already lost two hands ago.',
    bio: "Yve rarely needs to talk trash because her gameplay does it for her. She quietly dismantles aggressive players and thrives in long, tactical matches. Many players realize too late they've been trapped three turns ago.",
    aiStrategy: 'strategic',
  },
  {
    id: 'art',
    name: 'Art',
    level: 10,
    difficulty: 'expert',
    portraitFile: 'Art.png',
    hometown: 'Miami, FL',
    archetype: 'Domino Warlord',
    playstyle: 'Aggressive Tactical Enforcer',
    trait: 'Absolutely feared',
    skills: [
      'Elite board control',
      'Intimidation pressure',
      'High-speed decision making',
      'Dominates weaker players psychologically',
    ],
    specialAbility: {
      name: 'Table Slam',
      description: 'Art forces the pace of the match so aggressively opponents begin reacting emotionally instead of strategically.',
    },
    weakness: 'Can become overconfident against disciplined defensive players.',
    quote: 'Just go ahead and draw.',
    bio: "Art is feared. Loud confidence, relentless pressure, and years of instinct make him one of the hardest players to survive against. He smells hesitation immediately.",
    aiStrategy: 'expert',
  },
  {
    id: 'yoli',
    name: 'Yoli',
    level: 10,
    difficulty: 'expert',
    portraitFile: 'Yoli.png',
    hometown: 'Havana, Cuba',
    archetype: 'The Matriarch',
    playstyle: 'Elegant Assassin',
    trait: 'Legendarily composed',
    skills: [
      'Master-level patience',
      'Team synchronization',
      'Emotional control',
      'Trap-setting expert',
    ],
    specialAbility: {
      name: 'La Reina',
      description: 'Yoli gains momentum whenever opponents become emotional or start arguing.',
    },
    weakness: 'Sometimes gives opponents too much respect early.',
    quote: 'Ay mijo… that was your move?',
    bio: 'Yoli carries legendary energy at the table. Calm, social, and smiling while quietly orchestrating absolute destruction. Her biggest strength is making difficult games look effortless.',
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
  difficultyOrder: ['tutorial', 'beginner', 'easy', 'medium', 'hard', 'expert', 'master'],
};
