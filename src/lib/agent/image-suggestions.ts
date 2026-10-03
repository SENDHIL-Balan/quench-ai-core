/**
 * Context-Aware Creative Prompt Suggestions
 *
 * Suggests creative, thematic next prompts based on what the user previously generated
 * (e.g., Dinosaur -> Dragon, Mythical Beasts, Prehistoric Worlds).
 */

interface ThemeSuggestionRule {
  keywords: string[];
  suggestions: string[];
}

const THEME_RULES: ThemeSuggestionRule[] = [
  {
    // Dinosaurs -> Dragons & Prehistoric
    keywords: [
      "dinosaur",
      "t-rex",
      "tyrannosaurus",
      "raptor",
      "velociraptor",
      "triceratops",
      "jurassic",
      "pterodactyl",
      "brontosaurus",
      "fossil",
    ],
    suggestions: [
      "Create a mythical fire-breathing dragon soaring over volcanic peaks",
      "A cybernetically armored velociraptor hunting in a neon-lit futuristic metropolis",
      "A tranquil prehistoric valley with giant bioluminescent flora under a starry night",
    ],
  },
  {
    // Dragons & Mythical Creatures
    keywords: [
      "dragon",
      "wyvern",
      "drake",
      "phoenix",
      "griffin",
      "gryphon",
      "chimera",
      "hydra",
      "leviathan",
      "kraken",
    ],
    suggestions: [
      "A colossal armored sea leviathan emerging from stormy moonlit ocean waves",
      "An ethereal frost dragon perched atop an icy crystalline mountain fortress",
      "A radiant gold phoenix rising from burning embers with glowing sacred flames",
    ],
  },
  {
    // Cats & Felines
    keywords: [
      "cat",
      "kitten",
      "kitty",
      "feline",
      "panther",
      "tiger",
      "lion",
      "leopard",
      "cheetah",
    ],
    suggestions: [
      "A celestial galaxy cat with starry nebula fur floating gracefully across deep space",
      "A steampunk mechanical clockwork tiger with brass gears and glowing amber eyes",
      "A mystical snow leopard with glowing blue arcane runes resting in a sacred mountain temple",
    ],
  },
  {
    // Dogs & Canines
    keywords: ["dog", "puppy", "canine", "wolf", "husky", "retriever", "corgi", "fox"],
    suggestions: [
      "An ethereal spirit wolf howling under an aurora borealis across a frozen tundra",
      "A cyber-hound companion equipped with neon tactical gear in a cyberpunk city",
      "A playful corgi wearing an astronaut helmet floating outside the International Space Station",
    ],
  },
  {
    // Cars & Vehicles
    keywords: [
      "car",
      "automobile",
      "convertible",
      "sports car",
      "supercar",
      "hypercar",
      "race car",
      "vehicle",
      "ferrari",
      "porsche",
      "lamborghini",
    ],
    suggestions: [
      "A futuristic cyber-concept hypercar drifting along a rain-slicked Tokyo expressway at dusk",
      "A retro-futuristic flying sports car hovering through a 1980s synthwave sunset",
      "A rugged post-apocalyptic all-terrain vehicle tearing through a desert dust storm",
    ],
  },
  {
    // Motorcycles & Bikes
    keywords: ["motorcycle", "bike", "chopper", "motorbike", "scooter"],
    suggestions: [
      "A glowing neon light-cycle speeding across a digital holographic grid",
      "A vintage 1970s cafe racer parked in front of a rustic rainy Parisian cafe",
      "A heavy armored futuristic combat motorcycle navigating rocky alien terrain",
    ],
  },
  {
    // Anime & Manga Characters
    keywords: [
      "anime",
      "naruto",
      "sasuke",
      "goku",
      "luffy",
      "manga",
      "ninja",
      "samurai",
      "shinobi",
      "otaku",
    ],
    suggestions: [
      "Sage mode anime warrior surrounded by swirling golden chakra in a thunderstorm",
      "A cyber-samurai with dual glowing plasma katanas standing in a rainy neo-Tokyo street",
      "An ethereal anime sorceress summoning crystal butterflies in a sacred glowing blossom shrine",
    ],
  },
  {
    // Robots, Mechs & Cyberpunk
    keywords: ["robot", "mech", "mecha", "cyborg", "android", "cyberpunk", "gundam", "automaton"],
    suggestions: [
      "A colossal mechanized titan standing sentinel over a misty mountain fortress",
      "A sleek companion android discovering a solitary blooming flower in an overgrown ruined city",
      "A deep-space industrial mech mining floating asteroid crystals near Saturn's rings",
    ],
  },
  {
    // Space, Sci-Fi & Cosmic
    keywords: [
      "space",
      "galaxy",
      "nebula",
      "astronaut",
      "spaceship",
      "planet",
      "alien",
      "cosmos",
      "starship",
      "black hole",
    ],
    suggestions: [
      "An interstellar explorer discovering a glowing crystalline alien pyramid on a purple planet",
      "A massive starship fleet orbiting a ringed gas giant during a solar eclipse",
      "A tranquil celestial greenhouse floating in the orbit of an iridescent nebula",
    ],
  },
  {
    // Fantasy, Castles & Landscapes
    keywords: [
      "castle",
      "palace",
      "kingdom",
      "fortress",
      "mountain",
      "forest",
      "nature",
      "landscape",
      "waterfall",
      "river",
    ],
    suggestions: [
      "A floating medieval citadel connected by glowing light bridges high above the clouds",
      "An ancient enchanted forest with hollow glowing trees and spiraling magical mists",
      "A majestic crystalline city carved into the side of a colossal glacial fjord",
    ],
  },
  {
    // Ocean, Marine & Underwater
    keywords: [
      "ocean",
      "sea",
      "underwater",
      "fish",
      "shark",
      "whale",
      "coral",
      "reef",
      "dolphin",
      "submarine",
    ],
    suggestions: [
      "A bioluminescent sunken Atlantis illuminated by glowing deep-sea jellyfish",
      "A colossal cosmic space whale swimming through interstellar aurora clouds",
      "A futuristic glass underwater research metropolis nestled inside a giant coral reef",
    ],
  },
];

/**
 * Returns 3 creative prompt suggestions based on user prompt context.
 */
export function getPromptSuggestions(userPrompt: string): string[] {
  const normalized = (userPrompt || "").toLowerCase().trim();

  // 1. Check matching theme rules
  for (const rule of THEME_RULES) {
    if (rule.keywords.some((kw) => normalized.includes(kw))) {
      return rule.suggestions;
    }
  }

  // 2. Dynamic concept extraction fallback
  const cleanSubject = extractCoreSubject(userPrompt);

  return [
    `Create an epic mythical fantasy version of ${cleanSubject} with glowing elemental magic`,
    `A futuristic cyberpunk edition of ${cleanSubject} in a neon-lit rain-slicked metropolis`,
    `A cinematic 8K studio masterpiece of ${cleanSubject} under dramatic twilight lighting`,
  ];
}

/**
 * Extracts a readable core subject from conversational phrasing.
 */
function extractCoreSubject(prompt: string): string {
  let cleaned = prompt
    .replace(
      /\b(create|generate|make|draw|paint|picture|image|of|an|a|the|with|in|and|please|show|render)\b/gi,
      " ",
    )
    .replace(/[^\w\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned || cleaned.length < 2) {
    cleaned = "a majestic mythical creature";
  }

  return cleaned.slice(0, 40);
}
