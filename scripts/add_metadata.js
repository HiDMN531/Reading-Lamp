#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");
const storiesPath = path.join(projectRoot, "stories.json");
const reviewedAt = "2026-09-13";
const editorialStatuses = new Set(["draft", "reviewed", "published", "archived"]);

const contentTypeByTopic = {
  "Fantasy/stories": "narrative-fiction",
  "Nature and animals": "explanatory-nonfiction",
  "World affairs": "explanatory-nonfiction",
  "Everyday life": "narrative-fiction",
  History: "historical-narrative",
  Science: "explanatory-nonfiction",
  "Famous books": "classic-retelling",
  "Mystery and adventure": "mystery-fiction",
  "Travel and culture": "travel-vignette",
  "People and biography": "fictional-biography",
};

const sourceRules = [
  ["A Christmas Carol", /scrooge|marley|cratchit|christmas morning|second spirit/],
  ["Pride and Prejudice", /elizabeth|darcy|lydia|pride and prejudice/],
  ["Great Expectations", /\bpip\b|miss havisham|convict|great expectations|gentleman/],
  ["A Tale of Two Cities", /a tale of two cities|doctor manette|carton and darnay|sydney carton|revolution and justice/],
  ["Frankenstein", /frankenstein|victor|the creature/],
  ["Gulliver's Travels", /gulliver|lilliput|houyhnhnms/],
  ["Les Misérables", /valjean|fantine|barricade|bishop and the candlesticks|les misérables/],
  ["Moby-Dick", /moby|ahab|ishmael|queequeg|pequod|white whale|final chase/],
  ["Treasure Island", /treasure island|jim hawkins|ben gunn|long john silver|treasure map|mutiny begins/],
  ["Around the World in Eighty Days", /phileas fogg|aouda|strange bet|rescue during the journey/],
  ["Journey to the Center of the Earth", /journey down the volcano|underground sea|beneath the earth/],
  ["Oliver Twist", /oliver|fagin|nancy makes her choice/],
  ["The Scarlet Letter", /hester|dimmesdale|scarlet letter|final confession/],
  ["The Count of Monte Cristo", /edmond dantès|château d'if|count of monte cristo|count returns|count begins|count learns|treasure of monte cristo|count builds/],
  ["Little Women", /\bjo sells|\bbeth\b|little women/],
  ["The Picture of Dorian Gray", /dorian|portrait begins/],
  ["Robinson Crusoe", /robinson crusoe|footprint in the sand/],
  ["The Three Musketeers", /d'artagnan|queen's diamonds/],
  ["Twenty Thousand Leagues Under the Seas", /captain nemo|giant squid/],
  ["Alice's Adventures in Wonderland", /\balice\b|cheshire cat|mad tea party|plays croquet/],
  ["The Wonderful Wizard of Oz", /dorothy|scarecrow|cowardly lion|follows the road/],
  ["The Adventures of Tom Sawyer", /tom sawyer|tom and huck/],
  ["David Copperfield", /david copperfield|micawber/],
  ["Jane Eyre", /jane eyre|mr rochester|lowood/],
  ["Silas Marner", /silas marner/],
  ["The Hunchback of Notre-Dame", /quasimodo|notre-dame/],
  ["Wuthering Heights", /wuthering heights|catherine and heathcliff/],
  ["Crime and Punishment", /raskolnikov|crime and punishment/],
  ["Middlemarch", /middlemarch|dorothea/],
  ["The Brothers Karamazov", /brothers karamazov|ivan's question/],
  ["Madame Bovary", /madame bovary/],
  ["Heidi", /\bheidi\b/],
  ["The Secret Garden", /secret garden/],
  ["Pinocchio", /pinocchio|talking cricket|fox and the cat/],
  ["Black Beauty", /black beauty/],
  ["Peter Pan", /peter pan/],
  ["The Prince and the Pauper", /prince and the pauper/],
  ["Anne of Green Gables", /anne's first friend/],
  ["Pollyanna", /pollyanna/],
  ["The Railway Children", /railway children/],
  ["The Jungle Book", /mowgli/],
  ["The Little Prince", /little prince/],
  ["The Odyssey", /odysseus|sirens/],
  ["Anna Karenina", /anna karenina/],
  ["Don Quixote", /don quixote/],
  ["The Tempest", /the tempest|miranda sees the ship/],
  ["The Wind in the Willows", /wind in the willows|mole leaves home/],
  ["Antigone", /antigone/],
  ["The Trial", /the trial|josef k/],
  ["Cinderella", /cinderella/],
  ["Rapunzel", /rapunzel/],
  ["Snow White", /snow white/],
  ["Hansel and Gretel", /hansel and gretel/],
  ["Little Red Riding Hood", /little red riding hood/],
  ["The Emperor's New Clothes", /emperor's new clothes/],
  ["Thumbelina", /thumbelina/],
  ["The Ugly Duckling", /ugly duckling/],
  ["The Princess and the Pea", /princess and the pea/],
  ["The Bremen Town Musicians", /bremen/],
  ["The Golden Goose", /golden goose/],
  ["The Fisherman and His Wife", /fisherman and his wife|fisherman and the talking fish/],
  ["The Little Match Girl", /little match girl/],
  ["The Lion and the Mouse", /lion and the mouse/],
  ["The Tortoise and the Hare", /tortoise and the hare/],
  ["The Boy Who Cried Wolf", /boy who cried wolf/],
  ["The Ant and the Grasshopper", /ant and the grasshopper/],
  ["The Town Mouse and the Country Mouse", /town mouse and the country mouse/],
  ["The Fox and the Grapes", /fox and the grapes/],
  ["The Dog and His Reflection", /dog and his reflection/],
  ["Sinbad the Sailor", /sinbad/],
  ["Robin Hood", /robin hood/],
];

const classicGroups = {
  fable: new Set([
    "The Lion and the Mouse", "The Tortoise and the Hare", "The Boy Who Cried Wolf",
    "The Ant and the Grasshopper", "The Town Mouse and the Country Mouse",
    "The Fox and the Grapes", "The Dog and His Reflection",
  ]),
  "fairy tale": new Set([
    "Cinderella", "Rapunzel", "Snow White", "Hansel and Gretel", "Little Red Riding Hood",
    "The Emperor's New Clothes", "Thumbelina", "The Ugly Duckling", "The Princess and the Pea",
    "The Bremen Town Musicians", "The Golden Goose", "The Fisherman and His Wife", "The Little Match Girl",
  ]),
  "children's classic": new Set([
    "Alice's Adventures in Wonderland", "The Wonderful Wizard of Oz", "The Adventures of Tom Sawyer",
    "Little Women", "Heidi", "The Secret Garden", "Pinocchio", "Black Beauty", "Peter Pan",
    "The Prince and the Pauper", "Anne of Green Gables", "Pollyanna", "The Railway Children",
    "The Jungle Book", "The Little Prince", "The Wind in the Willows",
  ]),
  "adventure classic": new Set([
    "Moby-Dick", "Treasure Island", "Around the World in Eighty Days", "Journey to the Center of the Earth",
    "Robinson Crusoe", "The Three Musketeers", "Twenty Thousand Leagues Under the Seas",
    "The Odyssey", "Don Quixote", "Sinbad the Sailor", "Robin Hood",
  ]),
  "gothic and psychological novel": new Set([
    "Frankenstein", "The Picture of Dorian Gray", "Wuthering Heights", "Crime and Punishment", "The Trial",
  ]),
  "drama and moral conflict": new Set(["The Tempest", "Antigone", "The Brothers Karamazov"]),
};

// A few titles use language that also appears in another classic's opening
// paragraphs, so keep explicit IDs for an unambiguous, stable source link.
const sourceOverrides = {
  s108: "A Tale of Two Cities",
  s228: "Around the World in Eighty Days",
  s777: "Jane Eyre",
  s893: "The Jungle Book",
};

function sourceWork(story) {
  if (sourceOverrides[story.id]) return sourceOverrides[story.id];
  const haystack = `${story.title} ${story.text.slice(0, 500)}`.toLowerCase();
  const match = sourceRules.find(([, pattern]) => pattern.test(haystack));
  return match ? match[0] : null;
}

function classicSubtopic(work) {
  for (const [subtopic, works] of Object.entries(classicGroups)) {
    if (works.has(work)) return subtopic;
  }
  return "social and literary classic";
}

function includesAny(text, words) {
  return words.some((word) => text.includes(word));
}

function subtopicFor(story, work) {
  const text = `${story.title} ${story.text.slice(0, 900)}`.toLowerCase();
  if (story.topic === "Famous books") return classicSubtopic(work);

  if (story.topic === "Nature and animals") {
    if (includesAny(text, ["ocean", "sea ", "coral", "reef", "octopus", "whale", "fish", "marine", "coast", "tide"])) return "marine biology";
    if (includesAny(text, ["tree", "plant", "flower", "seed", "forest", "fungus", "mushroom", "root"])) return "plants and fungi";
    if (includesAny(text, ["habitat", "ecosystem", "food chain", "conservation", "climate", "pollution", "endangered"])) return "ecology and conservation";
    if (includesAny(text, ["migration", "adapt", "evolution", "camouflage", "color", "survive"])) return "adaptation and migration";
    return "animal behavior";
  }

  if (story.topic === "Science") {
    if (includesAny(text, ["brain", "memory", "sleep", "mind", "neuron", "psychology", "dream"])) return "brain and behavior";
    if (includesAny(text, ["star", "planet", "moon", "space", "universe", "gravity", "quantum", "light", "physics"])) return "physics and space";
    if (includesAny(text, ["cell", "gene", "bacteria", "virus", "vaccine", "body", "blood", "biology", "disease"])) return "biology and medicine";
    if (includesAny(text, ["chemical", "chemistry", "metal", "material", "plastic", "molecule", "carbon", "soap"])) return "chemistry and materials";
    if (includesAny(text, ["computer", "robot", "machine", "engineer", "technology", "electric", "energy"])) return "technology and engineering";
    if (includesAny(text, ["number", "math", "pattern", "probability", "data"])) return "mathematics and data";
    return "earth and everyday science";
  }

  if (story.topic === "World affairs") {
    if (includesAny(text, ["climate", "water", "river", "energy", "waste", "forest", "fishing"])) return "environment and resources";
    if (includesAny(text, ["school", "library", "hospital", "health", "education", "public service"])) return "education and public services";
    if (includesAny(text, ["border", "refugee", "migration", "migrant", "war", "peace", "conflict", "human rights"])) return "migration, rights, and peace";
    if (includesAny(text, ["market", "trade", "currency", "money", "job", "business", "economy", "tax"])) return "economics and livelihoods";
    if (includesAny(text, ["city", "transport", "road", "housing", "rooftop", "urban"])) return "cities and infrastructure";
    return "governance and community";
  }

  if (story.topic === "History") {
    if (includesAny(text, ["ancient", "rome", "roman", "egypt", "greek", "empire", "archaeolog"])) return "ancient history";
    if (includesAny(text, ["war", "battle", "army", "soldier", "revolution", "resistance"])) return "war and social change";
    if (includesAny(text, ["ship", "voyage", "map", "explor", "merchant", "route", "navigation"])) return "exploration and trade";
    if (includesAny(text, ["factory", "railway", "telegraph", "machine", "industrial", "invention"])) return "industry and technology";
    if (includesAny(text, ["king", "queen", "government", "law", "parliament", "diplomat", "treaty"])) return "politics and institutions";
    return "social and cultural history";
  }

  if (story.topic === "Travel and culture") {
    if (includesAny(text, ["kyoto", "seoul", "taipei", "hanoi", "chiang mai", "singapore", "ulaanbaatar", "tokyo", "beijing"])) return "East and Southeast Asia";
    if (includesAny(text, ["delhi", "kathmandu", "mumbai", "sri lanka", "nepal", "india"])) return "South Asia";
    if (includesAny(text, ["istanbul", "marrakech", "cairo", "dubai", "amman", "middle east"])) return "Middle East and North Africa";
    if (includesAny(text, ["nairobi", "cape town", "accra", "lagos", "africa"])) return "Sub-Saharan Africa";
    if (includesAny(text, ["mexico", "lima", "buenos aires", "vancouver", "new orleans", "brazil", "america"])) return "the Americas";
    if (includesAny(text, ["sydney", "auckland", "melbourne", "oceania", "pacific island"])) return "Oceania and the Pacific";
    return "Europe";
  }

  if (story.topic === "People and biography") {
    if (includesAny(text, ["doctor", "health", "hospital", "scientist", "research", "river map", "engineer"])) return "science, health, and engineering";
    if (includesAny(text, ["artist", "writer", "music", "theater", "museum", "design", "photograph"])) return "arts and culture";
    if (includesAny(text, ["teacher", "school", "library", "community", "public", "rights"])) return "education and community service";
    if (includesAny(text, ["farm", "forest", "water", "environment", "garden", "food"])) return "environment and food systems";
    if (includesAny(text, ["athlete", "sport", "climb", "runner", "coach", "expedition"])) return "sports and exploration";
    return "craft, business, and technology";
  }

  if (story.topic === "Mystery and adventure") {
    if (includesAny(text, ["code", "cipher", "message", "letter", "map", "symbol", "riddle"])) return "codes and hidden messages";
    if (includesAny(text, ["museum", "library", "archive", "old", "ancient", "history"])) return "historical mystery";
    if (includesAny(text, ["forest", "mountain", "island", "cave", "storm", "river", "rescue", "survive"])) return "outdoor adventure";
    if (includesAny(text, ["treasure", "gold", "silver", "jewel", "crown", "coin"])) return "treasure mystery";
    return "everyday investigation";
  }

  if (story.topic === "Everyday life") {
    if (includesAny(text, ["family", "mother", "father", "sister", "brother", "grandmother", "inheritance"])) return "family and generations";
    if (includesAny(text, ["friend", "neighbor", "stranger", "community", "shared"])) return "friendship and community";
    if (includesAny(text, ["work", "job", "office", "shop", "career", "business"])) return "work and responsibility";
    if (includesAny(text, ["cook", "meal", "dinner", "bread", "recipe", "kitchen", "food"])) return "food and home";
    if (includesAny(text, ["train", "bus", "bike", "walk", "journey", "trip", "travel"])) return "mobility and routines";
    return "personal growth and choices";
  }

  if (story.topic === "Fantasy/stories") {
    if (includesAny(text, ["dragon", "bird", "wolf", "cat", "fish", "animal", "creature"])) return "magical creatures";
    if (includesAny(text, ["clock", "time", "dream", "memory", "forgotten", "second chance"])) return "time, dreams, and memory";
    if (includesAny(text, ["journey", "map", "road", "bridge", "island", "forest", "quest"])) return "quests and enchanted places";
    if (includesAny(text, ["village", "town", "baker", "shop", "library", "garden", "neighbor"])) return "everyday magic";
    return "magical objects and transformations";
  }

  throw new Error(`Unknown topic: ${story.topic}`);
}

const stories = JSON.parse(fs.readFileSync(storiesPath, "utf8"));
if (!Array.isArray(stories) || stories.length !== 1610) {
  throw new Error(`Expected 1610 stories, received ${Array.isArray(stories) ? stories.length : "non-array"}`);
}

const updated = stories.map((story) => {
  const inferredContentType = contentTypeByTopic[story.topic];
  if (!inferredContentType) throw new Error(`No content type for ${story.id}: ${story.topic}`);
  const work = story.topic === "Famous books"
    ? (typeof story.sourceWork === "string" && story.sourceWork.trim() ? story.sourceWork.trim() : sourceWork(story))
    : null;
  if (story.topic === "Famous books" && !work) throw new Error(`No source work for ${story.id}: ${story.title}`);
  return {
    ...story,
    subtopic: typeof story.subtopic === "string" && story.subtopic.trim() ? story.subtopic.trim() : subtopicFor(story, work),
    contentType: typeof story.contentType === "string" && story.contentType.trim() ? story.contentType.trim() : inferredContentType,
    editorialStatus: editorialStatuses.has(story.editorialStatus) ? story.editorialStatus : "published",
    factChecked: typeof story.factChecked === "boolean" ? story.factChecked : false,
    reviewedAt: typeof story.reviewedAt === "string" && /^\d{4}-\d{2}-\d{2}$/.test(story.reviewedAt) ? story.reviewedAt : reviewedAt,
    sourceWork: work,
    vocabularyVersion: typeof story.vocabularyVersion === "string" && story.vocabularyVersion.trim()
      ? story.vocabularyVersion.trim()
      : "v2",
  };
});

fs.writeFileSync(storiesPath, `${JSON.stringify(updated, null, 2)}\n`);

const byField = (field) => Object.entries(updated.reduce((counts, story) => {
  const value = story[field] === null ? "null" : String(story[field]);
  counts[value] = (counts[value] || 0) + 1;
  return counts;
}, {})).sort((a, b) => b[1] - a[1]);

console.log(JSON.stringify({
  stories: updated.length,
  editorialStatus: byField("editorialStatus"),
  contentTypes: byField("contentType"),
  subtopics: byField("subtopic"),
  sourceWorks: new Set(updated.map((story) => story.sourceWork).filter(Boolean)).size,
}, null, 2));
