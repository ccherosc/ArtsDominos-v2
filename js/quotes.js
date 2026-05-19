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
    double:    ["TRUST ME BRO.", "DOUBLE! LET'S GO!", "I knew that was there.",
                "¡DOBLE! I called it bro!", "¡Toma! See what I did?"],
    roundWin:  ["WE BALL.", "I told you!", "Bro. I knew it.",
                "¡Se acabó! WE BALL bro.", "¡Dominó! Trust the chaos."],
    pass:      ["Nah I got nothing.", "Whatever, pass.", "I'll get you next tile.",
                "¡No hay nada! Whatever.", "Paso, bro. I'll come back."],
    lowTiles:  ["Two tiles! I'm cooking.", "Almost!",
                "¡Dos fichas! I'm cookin'!", "¡Me voy! Two left bro."],
    closeGame: ["Blocked? Still a win bro.",
                "¡Bloqueado! Still counts.", "¡Cierra! My count, trust me."],
  },

  poppy: {
    double:    ["Sit down, mijo.", "That hat's lucky.", "See that?",
                "¡Ahí está! Doble, mijo.", "¡Toma eso, mijo!",
                "¿Lo ves? El sombrero sabe."],
    roundWin:  ["That's how Poppy does it.", "Learn something.", "Every time, mijo.",
                "¡Dominó, mijo! Aprende.", "El que espera, alcanza.",
                "¡Así se hace, chico!"],
    pass:      ["No rush.", "Good things take time.", "I'll wait.",
                "No hay apuro, mijo.", "Paciencia. Yo espero.",
                "Todo a su tiempo."],
    lowTiles:  ["Two left. Pay attention now.", "Watch closely.",
                "¡Casi! Dos fichas, mijo.", "Cuidado ahora, mijo."],
    closeGame: ["Nobody moves. I win. As usual.",
                "¡Bloqueado! Mis pips, mijo.", "¡Cierra! El viejo gana."],
  },

  mawmaw: {
    double:    ["Oh how nice.", "Isn't that lovely.", "Right where I needed it.",
                "¡Qué lindo! A double, dear.", "Ay, right where I wanted it."],
    roundWin:  ["Bless your heart.", "That's okay, you'll learn.", "Just like your father.",
                "¡Dominó! Bless your heart.", "¡Se acabó, dear! Bless you.",
                "El pez por la boca muere."],
    pass:      ["That's alright, dear.", "No worries.", "Take your time.",
                "No hay apuro, sweetheart.", "Paciencia, dear. I'll wait."],
    lowTiles:  ["Almost done, sweetheart.", "Nearly there, dear.",
                "¡Casi! Almost done, honey.", "Dos fichas, dear. Watch now."],
    closeGame: ["Board's blocked, dear. My pips.",
                "¡Bloqueado! My pips, dear.", "Cierra. Mis fichas, sweetie."],
  },

  yve: {
    double:    ["Doble.", "Predictable.", "You already lost two moves ago.",
                "¿Lo ves? Doble.", "¡Toma. Así se hace.", "Ya sabía. Doble."],
    roundWin:  ["Called it.", "Did you think that would work?", "Every time.",
                "¡Se acabó. Como siempre.", "No puedes conmigo.",
                "¿Sorprendido? Nunca."],
    pass:      ["No moves? Thought so.", "I counted on that.", "As expected.",
                "¿No hay nada? Sabía.", "Como lo planeé.", "¡Exacto! Sin nada."],
    lowTiles:  ["Two tiles. It's over.", "Count down.",
                "Dos fichas. Ya terminó.", "¡Casi! Prepárate."],
    closeGame: ["Blocked. I won three moves ago.",
                "¡Bloqueado! Yo sabía.", "¿Sorprendido? No debería."],
  },

  manny: {
    double:    ["Fifty years of this.", "Doble.", "Right where I knew it would be.",
                "¿Lo ves? Cincuenta años.", "El tiempo siempre dirá.",
                "¡Doble! Como siempre, chico."],
    roundWin:  ["Patient game. I waited.", "Experience.", "It always comes back around.",
                "El que espera, alcanza.", "¡Se acabó! La paciencia.",
                "Cincuenta años no mienten."],
    pass:      ["No rush, take your time.", "I'll wait.", "Good things come.",
                "No hay apuro. Yo espero.", "La paciencia es virtud.",
                "Todo llega, chico."],
    lowTiles:  ["Two left. Been here before.", "Closing it out.",
                "Dos fichas. Como siempre.", "¡Casi! Cincuenta años saben."],
    closeGame: ["Blocked. My advantage, as planned.",
                "¡Bloqueado! El plan funciona.", "Cierra. Así lo planeé."],
  },

  yoli: {
    double:    ["Ay mijo...", "La reina.", "Just like that.",
                "¿Ves eso, mijo? Doble.", "¡La reina manda! Doble.",
                "¡Toma, mi amor! Doble."],
    roundWin:  ["Ay mijo... that was your move?", "Effortless.", "Every single time.",
                "¡Dominó! ¿Qué esperabas?", "La reina gana. Siempre.",
                "¡Se acabó, mi amor!"],
    pass:      ["No moves? That was the plan.", "Exactly what I needed.", "Patience pays.",
                "¿No hay nada? Perfecto.", "La paciencia es mi arma.",
                "¡Exactamente lo que quería!"],
    lowTiles:  ["Casi.", "Two left. Game over for you.",
                "Dos fichas. La reina cierra.", "¡Casi! Ya terminó, mijo."],
    closeGame: ["Blocked. Mi ventaja.",
                "¡Bloqueado! Mi victoria.", "¿Bloqueado? Qué lástima."],
  },

  art: {
    double:    ["DOBLE!", "Just go ahead and draw.", "That's how it's done.",
                "¡DOBLE! Toma eso, chico.", "¡Toma! ¿Qué tú tienes?",
                "¡DOBLE! Aquí mando yo."],
    roundWin:  ["Just go ahead and draw next time.", "Too easy.", "THAT'S IT.",
                "¡Se acabó! Tú no puedes.", "¡DOMINÓ! Ya te lo dije.",
                "¡Eso es mío! Siempre."],
    pass:      ["Nowhere to go?", "Stuck already?", "Draw then.",
                "¿No hay nada? Sabía.", "Tú no sabes jugar, chico.",
                "¡Cierra la boca y juega!"],
    lowTiles:  ["Two tiles. It's over.", "Come on now.",
                "¡Dos fichas! Ya acabé.", "¡Me voy, chico! Adiós."],
    closeGame: ["Board's dead. My house.",
                "¡Bloqueado! Aquí mando yo.", "¡Cierra! Mi casa, mis reglas."],
  },

  kat: {
    double:    ["Oh fun, a double!", "Ha! Look at that.", "Lucky me!"],
    roundWin:  ["Oh wait, I won?", "That was fun!", "Yay!"],
    pass:      ["No moves, that's okay.", "Pass! No big deal.", "I got nothing."],
    lowTiles:  ["Oh I'm almost out!", "Two left, haha!"],
    closeGame: ["Blocked? That counts, right?"],
  },

  stritch: {
    double:    ["Double. Let's go.", "That's the one.", "Game on."],
    roundWin:  ["Good game.", "That's how you do it.", "Hard work pays."],
    pass:      ["Can't force it.", "I'll come back.", "Skipping."],
    lowTiles:  ["Two tiles. Closing time.", "Almost done."],
    closeGame: ["Lowest count. That's me."],
  },

};
