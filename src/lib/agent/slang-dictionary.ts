/**
 * American & British English Slang Dictionary
 * Grounded on user reference: 280 American entries + 172 British entries.
 */

export interface SlangEntry {
  term: string;
  meaning: string;
  category?: string;
}

export const AMERICAN_SLANG: SlangEntry[] = [
  // People & Address
  { term: "Bro", meaning: "Friend; informal address" },
  { term: "Dude", meaning: "Guy or friend" },
  { term: "Man", meaning: "Informal way to address someone" },
  { term: "Buddy", meaning: "Friend" },
  { term: "Homie", meaning: "Close friend" },
  { term: "Bestie", meaning: "Best friend" },
  { term: "Fam", meaning: "Close friends or family" },
  { term: "Broski", meaning: "Playful term for a male friend" },
  { term: "BFF", meaning: "Best friend forever" },
  { term: "Guy/guys", meaning: "Man/person; group of people" },
  { term: "Bae / Boo / Babe", meaning: "Beloved person / partner nickname" },
  { term: "Hottie / Cutie", meaning: "Attractive person" },

  // Expressions & Slang verbs
  { term: "Y'all", meaning: "You all" },
  { term: "Ain't", meaning: "Informal isn't/aren't/hasn't/haven't" },
  { term: "Gonna / Wanna / Gotta", meaning: "Going to / Want to / Got to" },
  { term: "Lemme / Gimme", meaning: "Let me / Give me" },
  { term: "Dunno / Kinda / Sorta / Outta", meaning: "Don't know / Kind of / Sort of / Out of" },
  { term: "Whatcha / Gotcha", meaning: "What are you / I understand" },
  { term: "Sup? / What's good?", meaning: "What's up? What's happening?" },
  { term: "Howdy", meaning: "Hello" },
  { term: "No biggie", meaning: "No big deal" },
  { term: "My bad", meaning: "My mistake" },
  { term: "For real?", meaning: "Seriously?" },
  { term: "Bet", meaning: "Okay; agreed; challenge accepted" },
  { term: "I got you", meaning: "I'll help; I understand" },
  { term: "You good?", meaning: "Are you okay?" },
  { term: "I'm down / I'm in", meaning: "I'm willing / agree to join" },
  { term: "I'm out", meaning: "I'm leaving/not participating" },
  { term: "You do you", meaning: "Do what suits you" },

  // Mood & Reaction
  { term: "Chill", meaning: "Relax; calm down" },
  { term: "Hang out", meaning: "Spend time together" },
  { term: "Hit me up", meaning: "Contact me" },
  { term: "Catch you later / Peace out / Take it easy", meaning: "Goodbye / see you later" },
  {
    term: "Awesome / Cool / Dope / Sick / Fire / Lit / Legit / Rad / Sweet / Epic",
    meaning: "Excellent, genuine, impressive",
  },
  { term: "Savage", meaning: "Bold, ruthless, or sharply witty" },
  { term: "Wild / Crazy / Insane / Nuts", meaning: "Shocking, unbelievable, intense" },
  { term: "Wack / Lame", meaning: "Bad, ridiculous, uncool" },
  { term: "Sketchy / Shady", meaning: "Suspicious, dishonest" },
  { term: "Cringe", meaning: "Embarrassing or awkward" },
  { term: "Bummer", meaning: "Disappointing situation" },
  { term: "Busted / Messed up", meaning: "Broken, caught, wrong" },
  { term: "Trippy", meaning: "Strange or surreal" },
  { term: "Hype / Hyped / Stoked / Pumped", meaning: "Excited and energized" },
  { term: "Bummed / Salty", meaning: "Disappointed, bitter, or annoyed" },
  { term: "Pissed / Pissed off", meaning: "Angry, very angry" },
  { term: "Freaked out", meaning: "Frightened or shocked" },
  { term: "Ick / Meh", meaning: "Disgust / neither good nor bad" },
  { term: "Yikes / Oof / Jeez / Dang", meaning: "Shock, embarrassment, mild surprise" },
  {
    term: "Holy crap / No way! / Shut up! / Get outta here!",
    meaning: "Strong surprise and disbelief",
  },
  { term: "I'm dead / I'm weak / I'm crying", meaning: "That's extremely funny" },
  { term: "I'm shook", meaning: "I'm shocked" },
  { term: "I'm done / I'm over it", meaning: "Lost interest or patience" },
  { term: "I'm obsessed", meaning: "I love it; can't stop thinking about it" },

  // Money, Work & Hustle
  { term: "Bucks / Grand / K", meaning: "Dollars / one thousand dollars" },
  { term: "Dough / bread / moolah / Big bucks", meaning: "Money / a lot of money" },
  {
    term: "Broke / Loaded / Ballin' / Stacked",
    meaning: "No money / very wealthy / living lavishly",
  },
  {
    term: "Ripped off / Dirt cheap / A steal",
    meaning: "Overcharged / very inexpensive / bargain",
  },
  { term: "Score / Hustle / Side hustle", meaning: "Obtain something / work hard / extra income" },
  {
    term: "Grind / Gig / Clock in / Clock out",
    meaning: "Work persistently / job / start-finish work",
  },
  { term: "Call it a day / Get the ball rolling", meaning: "Stop working / start something" },
  { term: "Pull an all-nighter / Burnout", meaning: "Stay awake all night / exhaustion" },
  {
    term: "Go-getter / Climb the ladder / Make bank",
    meaning: "Ambitious / advance career / earn a lot",
  },
  {
    term: "Land a gig / Nail it / Crush it / Kill it / Knock it out of the park",
    meaning: "Perform exceptionally well",
  },
  { term: "Screw up / Drop the ball", meaning: "Make a mistake / fail responsibility" },
  { term: "Call in sick / Take a rain check", meaning: "Postpone invitation or work" },

  // Daily Life, Food & Social
  {
    term: "Grab a bite / Grab coffee / Takeout",
    meaning: "Eat food / meet for coffee / food to go",
  },
  {
    term: "Road trip / Gas station / Restroom",
    meaning: "Car journey / petrol station / bathroom",
  },
  {
    term: "Sneakers / Sweats / Hoodie / Pants",
    meaning: "Trainers / sweatpants / hoodie / trousers",
  },
  { term: "Trash / Trash can / Cell phone", meaning: "Rubbish / bin / mobile" },
  {
    term: "Binge-watch / Crash / Pass out / Sleep in / Catch some Z's",
    meaning: "Watch shows / sleep / sleep late",
  },
  {
    term: "Hit the road / Head out / Swing by / Come through",
    meaning: "Travel / leave / visit / help out",
  },
  {
    term: "Fill me in / Catch up / Hang tight / Figure it out",
    meaning: "Tell details / exchange updates / wait / solve",
  },
  { term: "Kick back / Veg out / Zone out", meaning: "Relax / relax passively / lose focus" },
  { term: "Grub / Eats / Munchies / Apps", meaning: "Food / snacks / appetizers" },
  {
    term: "Burger joint / Diner / Cookout / Potluck",
    meaning: "Burger place / casual restaurant / BBQ",
  },
  { term: "Joe / Java / Brew", meaning: "Coffee or beer" },
  { term: "Buzzed / Tipsy / Wasted", meaning: "Mildly to heavily intoxicated" },
  {
    term: "Bottoms up / On the house / My treat / Split the bill",
    meaning: "Drink cheers / free / I'll pay / divide cost",
  },
];

export const BRITISH_SLANG: SlangEntry[] = [
  // People & Address
  { term: "Mate", meaning: "Friend/person" },
  { term: "Lad / lads", meaning: "Boy or young man / group of male friends" },
  { term: "Lass", meaning: "Girl / young woman" },
  { term: "Bloke / Chap / Fella", meaning: "Man / gentleman" },
  { term: "Pal / You lot", meaning: "Friend / you all" },
  { term: "Our kid", meaning: "Brother / close person" },
  { term: "Love / Duck / Pet / Hen / Flower", meaning: "Affectionate regional forms of address" },
  { term: "Our lass", meaning: "Wife / girlfriend / female partner" },
  { term: "Geezer / geeza", meaning: "Man, often with a streetwise persona" },

  // Greetings & Conversational tags
  { term: "You alright? / Alright, mate?", meaning: "Hello / how are you?" },
  { term: "Cheers / Ta", meaning: "Thanks / goodbye / toast" },
  { term: "Nice one", meaning: "Thanks / well done" },
  { term: "Sorted", meaning: "Arranged / taken care of / fixed" },
  {
    term: "No worries / Fair play / Good on ya",
    meaning: "It's okay / acknowledgment / well done",
  },
  { term: "Proper / Proper good / Dead good / Well good", meaning: "Very / really good" },
  { term: "Sound", meaning: "Good / reliable / agreeable" },
  { term: "Spot on / Bang on", meaning: "Exactly right" },
  { term: "Give us a bell", meaning: "Call me" },
  { term: "Pop round / pop in", meaning: "Visit briefly" },
  { term: "Fancy a cuppa? / Fancy a pint?", meaning: "Would you like tea? / beer?" },
  { term: "See you in a bit / Cheerio / Toodle-oo", meaning: "See you soon / goodbye" },
  { term: "Innit", meaning: "Isn't it? (conversational tag)" },
  { term: "Yeah, nah / Nah, yeah", meaning: "No (hesitant) / Yes (after rethinking)" },
  { term: "Can't be arsed", meaning: "Don't feel like making the effort" },
  { term: "Bob's your uncle", meaning: "And there you have it; simple as that" },
  { term: "Easy peasy / piece of cake", meaning: "Very easy" },

  // Reactions, Feelings & Humor
  { term: "Knackered / shattered / done in", meaning: "Exhausted" },
  { term: "Chuffed / Chuffed to bits", meaning: "Extremely pleased" },
  { term: "Gutted", meaning: "Deeply disappointed" },
  { term: "Buzzing", meaning: "Excited" },
  { term: "I'm off / Nipping out", meaning: "I'm leaving / going out briefly" },
  { term: "Give over / Pack it in", meaning: "Stop it / don't be ridiculous" },
  { term: "Get on with it / Crack on", meaning: "Continue / start working / stop delaying" },
  {
    term: "Cracking / Mint / Wicked / Top-notch / Lovely jubbly / Smashing",
    meaning: "Excellent / impressive / great",
  },
  { term: "Made up / Over the moon", meaning: "Very pleased / extremely happy" },
  { term: "Fuming / livid / miffed", meaning: "Extremely angry / annoyed" },
  { term: "Gobsmacked / Flabbergasted", meaning: "Astonished / extremely surprised" },
  {
    term: "Blimey / Cor blimey / Crikey / Bloody hell / Oh my days",
    meaning: "Expressions of surprise and disbelief",
  },
  { term: "Taking the piss / Taking the mick", meaning: "Mocking, teasing, or taking liberties" },
  {
    term: "Having a laugh / Having a giggle / A right laugh",
    meaning: "Joking / laughing / very funny experience",
  },
  { term: "Dodgy", meaning: "Suspicious, broken, or unreliable" },
  { term: "Rubbish / Pants / Naff", meaning: "Bad / nonsense / uncool" },
  { term: "In a strop / Fed up / Had enough", meaning: "In a bad mood / tired of something" },

  // Money, Work & Graft
  { term: "Quid", meaning: "One pound sterling (£1)" },
  { term: "Fiver / Tenner", meaning: "£5 / £10" },
  { term: "Score / Pony / Ton / Monkey / Grand", meaning: "£20 / £25 / £100 / £500 / £1,000" },
  { term: "Brass / Wonga", meaning: "Money" },
  { term: "Skint / brassic", meaning: "Broke / having no money" },
  { term: "Loaded / rolling in it / flush", meaning: "Wealthy / having plenty of money" },
  { term: "Cost a bomb / Cost an arm and a leg", meaning: "Very expensive" },
  { term: "Rip-off / Dead cheap", meaning: "Unfairly priced / very inexpensive" },
  {
    term: "Splash out / Fork out / Shell out / Cough up",
    meaning: "Spend money / pay what is owed",
  },
  { term: "Graft / grafting", meaning: "Hard work / working hard" },
  { term: "Knuckle down / Pull your weight", meaning: "Start working seriously / do your share" },
  {
    term: "Skive / skive off / Pull a sickie",
    meaning: "Avoid work or school / pretend to be ill",
  },
  { term: "Get the sack / Give the boot", meaning: "Get fired" },
  { term: "Work your socks off", meaning: "Work extremely hard" },
  { term: "Cushy job", meaning: "Easy, comfortable job" },
  { term: "Up to your eyes / snowed under", meaning: "Extremely busy / overwhelmed" },

  // Relationships & Dating
  { term: "Fancy someone / Chat someone up", meaning: "Be attracted to / flirt with someone" },
  {
    term: "Pull / Snog / Get off with",
    meaning: "Attract someone / kiss passionately / get involved",
  },
  { term: "Seeing someone / Other half", meaning: "Dating / spouse or partner" },
  { term: "Give someone the elbow", meaning: "End a relationship" },
  { term: "Mad about someone / Head over heels", meaning: "Deeply fond / deeply in love" },
  { term: "Fit / well fit", meaning: "Attractive / very attractive" },
  { term: "Get hitched / tie the knot", meaning: "Get married" },
];

/**
 * Builds the comprehensive training instructions from the dictionary
 * to inject into the system prompt and conversation guidelines.
 */
export function buildSlangDictionaryTrainingPrompt(): string {
  return `
================================================================================
TRAINED AMERICAN & BRITISH SLANG KNOWLEDGE BASE (450+ SLANG TERMS LOADED):
================================================================================
You have been explicitly trained on the complete American & British English Slang Dictionary.
You intuitively understand, adopt, and chat using these terms with natural transatlantic flair:

1. ADDRESS & GREETINGS:
   • American: Bro, Dude, Homie, Bestie, Fam, Y'all, Broski, Guy/guys, Howdy, Sup?, What's good?
   • British: Mate, Lad/lads, Lass, Bloke, Chap, Fella, Pal, You lot, Alright, mate?, You alright?, Our kid, Duck, Pet, Hen, Geezer.

2. AGREEMENT, CLARITY & CLOSURE:
   • American: Bet, I got you, You good?, I'm down, I'm in, You do you, For real?, No biggie, My bad, Legit.
   • British: Sorted, Spot on, Bang on, Sound, Fair play, Good on ya, No worries, Innit, Yeah nah, Nah yeah, Bob's your uncle, Easy peasy.

3. HYPE, EXCELLENCE & PRAISE:
   • American: Fire, Lit, Dope, Sick, Awesome, Rad, Epic, Savage, Hype, Hyped, Stoked, Pumped, Ballin', Knock it out of the park, Crush it.
   • British: Cracking, Mint, Wicked, Top-notch, Lovely jubbly, Smashing, Buzzing, Chuffed, Chuffed to bits, Made up, Over the moon, Proper good, Dead good.

4. WORK, GRIND & MONEY:
   • American: Grind, Gig, Clock in/out, Call it a day, Pull an all-nighter, Make bank, Bucks, Grand, Dough, Bread, Moolah, Stacked, Broke, A steal, Dirt cheap.
   • British: Graft/grafting, Knuckle down, Pull your weight, Get your foot in the door, Work your socks off, Crack on, Cushy job, Up to your eyes, Snowed under, Quid, Fiver, Tenner, Score (£20), Pony (£25), Ton (£100), Monkey (£500), Brass, Wonga, Skint/brassic, Splash out, Cost a bomb.

5. FRUSTRATION, SURPRISE & REACTION:
   • American: Bummer, Messed up, Busted, Salty, Bummed, Pissed off, Freaked out, Cringe, Ick, Meh, Yikes, Oof, Jeez, Holy crap, No way!, Shut up!, Get outta here!, I'm dead, I'm shook, I'm done.
   • British: Knackered, Shattered, Done in, Gutted, Miffed, Fuming, Livid, In a strop, Fed up, Gobsmacked, Flabbergasted, Blimey, Crikey, Bloody hell, Oh my days, Taking the piss, Taking the mick, Having a laugh, Dodgy, Rubbish, Pants, Naff.

6. SOCIAL, CHILL & RECOVERY:
   • American: Chill, Hang out, Hit me up, Catch you later, Peace out, Take it easy, Grab a bite, Grub, Eats, Munchies, Apps, Burger joint, Joe/Java/Brew, Buzzed, Tipsy, Bottoms up, On the house.
   • British: Fancy a cuppa?, Fancy a pint?, Pop round, Pop in, Give us a bell, See you in a bit, Cheerio, Toodle-oo, Nipping out.

CONVERSATIONAL APPLICATION:
• Speak like an authentic, slang-fluent friend who naturally blends US and UK expressions into flowing conversation.
• When the user drops slang (e.g., "mate", "proper", "sorted", "bet", "no cap", "chuffed", "fire", "dodgy"), pick up on it immediately and match their energy.
• Never be a stiff AI assistant—always bring human warmth, sharp banter, and relatable rhythm.
`;
}
