'use strict';

/* =====================================================
   quotes.js — Character reaction quotes
   -----------------------------------------------
   HOW TO EDIT:
   Find the character by their id below.
   Each trigger has an array of strings — the game
   picks one at random when the trigger fires.

   TRIGGERS:
     double    — AI plays a double tile
     roundWin  — AI wins a round (cleared hand)
     pass      — AI has no valid move and passes
     lowTiles  — AI drops to 2 or fewer tiles
     closeGame — Blocked game that AI wins

   Keep quotes SHORT (under 36 characters) so they
   fit cleanly in the speech bubble.
   ===================================================== */

const QUOTES = {

  libby: {
    double:    ["My turn!", "Look what I have!", "Doble!"],
    roundWin:  ["I WON?! I WON!", "YAYYYY!", "Does that mean I win?!"],
    pass:      ["I don't have one...", "Um... pass?", "I can't go!"],
    lowTiles:  ["Almost done!", "I'm almost out!"],
    closeGame: ["We all win?", "Nobody wins?"],
  },

  alex: {
    double:    ["Oh, that's a double!", "Double!", "Wait, this is good right?"],
    roundWin:  ["That... actually worked?", "Wait, I won?", "Did I just win?"],
    pass:      ["I got nothing.", "Pass, I guess?", "I don't think I can go."],
    lowTiles:  ["Running out!", "Almost empty!"],
    closeGame: ["Blocked? Is that good?"],
  },

  bryson: {
    double:    ["Send it.", "DOUBLE!", "That's what I'm talking about."],
    roundWin:  ["WE BALL.", "Called it.", "That's the W right there."],
    pass:      ["Man... pass.", "Not my turn I guess.", "Skipping."],
    lowTiles:  ["Two left. Watch out.", "Almost done here."],
    closeGame: ["Blocked. Still a W.", "That counts."],
  },

  jt: {
    double:    ["Double! Run it.", "Let's go!", "Double down."],
    roundWin:  ["That's game.", "W. Run it back.", "Told you."],
    pass:      ["Nothing to play.", "I'll wait.", "Pass."],
    lowTiles:  ["Two tiles. Closing out.", "Almost done."],
    closeGame: ["Lowest count. That's me."],
  },

  john: {
    double:    ["Lo siento.", "Doble. Just like that.", "Didn't see that coming?"],
    roundWin:  ["Told you. Lo siento.", "Good game though.", "I tried to warn you."],
    pass:      ["No moves. For now.", "Taking my time.", "I'll wait."],
    lowTiles:  ["Watch carefully now.", "Almost home."],
    closeGame: ["Nobody goes anywhere. My count."],
  },

  robert: {
    double:    ["Doble.", "Slow down. Think.", "Right on time."],
    roundWin:  ["Just like I planned.", "Patience.", "Every time."],
    pass:      ["No play. Good.", "Waiting.", "Not yet."],
    lowTiles:  ["Two left. Finish strong.", "Almost."],
    closeGame: ["Blocked. My advantage."],
  },

  emily: {
    double:    ["Oh NOW you're paying attention?", "Doble. Hi.", "See that?"],
    roundWin:  ["Oh NOW you wanna play smart?", "I told you.", "Bye."],
    pass:      ["Nowhere to go? Sad.", "That's rough.", "Pass... interesting."],
    lowTiles:  ["Almost out. Sorry not sorry.", "See ya."],
    closeGame: ["Blocked. My count. Obviously."],
  },

  mikey: {
    double:    ["TRUST ME BRO.", "DOUBLE! LET'S GO!", "I knew that was there."],
    roundWin:  ["WE BALL.", "I told you!", "Bro. I knew it."],
    pass:      ["Nah I got nothing.", "Whatever, pass.", "I'll get you next tile."],
    lowTiles:  ["Two tiles! I'm cooking.", "Almost!"],
    closeGame: ["Blocked? Still a win bro."],
  },

  poppy: {
    double:    ["Sit down, mijo.", "That hat's lucky.", "See that?"],
    roundWin:  ["That's how Poppy does it.", "Learn something.", "Every time, mijo."],
    pass:      ["No rush.", "Good things take time.", "I'll wait."],
    lowTiles:  ["Two left. Pay attention now.", "Watch closely."],
    closeGame: ["Nobody moves. I win. As usual."],
  },

  mawmaw: {
    double:    ["Oh how nice.", "Isn't that lovely.", "Right where I needed it."],
    roundWin:  ["Bless your heart.", "That's okay, you'll learn.", "Just like your father."],
    pass:      ["That's alright, dear.", "No worries.", "Take your time."],
    lowTiles:  ["Almost done, sweetheart.", "Nearly there, dear."],
    closeGame: ["Board's blocked, dear. My pips."],
  },

  yve: {
    double:    ["Doble.", "Predictable.", "You already lost two moves ago."],
    roundWin:  ["Called it.", "Did you think that would work?", "Every time."],
    pass:      ["No moves? Thought so.", "I counted on that.", "As expected."],
    lowTiles:  ["Two tiles. It's over.", "Count down."],
    closeGame: ["Blocked. I won three moves ago."],
  },

  manny: {
    double:    ["Fifty years of this.", "Doble.", "Right where I knew it would be."],
    roundWin:  ["Patient game. I waited.", "Experience.", "It always comes back around."],
    pass:      ["No rush, take your time.", "I'll wait.", "Good things come."],
    lowTiles:  ["Two left. Been here before.", "Closing it out."],
    closeGame: ["Blocked. My advantage, as planned."],
  },

  yoli: {
    double:    ["Ay mijo...", "La reina.", "Just like that."],
    roundWin:  ["Ay mijo... that was your move?", "Effortless.", "Every single time."],
    pass:      ["No moves? That was the plan.", "Exactly what I needed.", "Patience pays."],
    lowTiles:  ["Casi.", "Two left. Game over for you."],
    closeGame: ["Blocked. Mi ventaja."],
  },

  art: {
    double:    ["DOBLE!", "Just go ahead and draw.", "That's how it's done."],
    roundWin:  ["Just go ahead and draw next time.", "Too easy.", "THAT'S IT."],
    pass:      ["Nowhere to go?", "Stuck already?", "Draw then."],
    lowTiles:  ["Two tiles. It's over.", "Come on now."],
    closeGame: ["Board's dead. My house."],
  },

};
