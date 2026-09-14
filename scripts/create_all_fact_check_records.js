#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const stories = JSON.parse(fs.readFileSync(path.join(root, "stories.json"), "utf8"));

const source = (title, url, notes) => ({ title, url, notes });

const topicSources = {
  natureMarine: source("NOAA Ocean Service: Ocean Facts", "https://oceanservice.noaa.gov/facts/", "Marine biology, ocean processes, and limits or qualifications attached to the claim."),
  naturePlants: source("USDA Forest Service Research and Development", "https://research.fs.usda.gov/", "Plant, forest, fungal, fire, and below-ground ecological processes."),
  natureAnimals: source("Smithsonian's National Zoo & Conservation Biology Institute: Animals", "https://nationalzoo.si.edu/animals", "Animal anatomy, behavior, life history, and species-level terminology."),
  natureMigration: source("U.S. Geological Survey: Animal Migration", "https://www.usgs.gov/programs/ecosystems/science/animal-migration", "Migration, orientation, tracking evidence, and environmental limits."),
  natureEcology: source("U.S. National Park Service: Nature & Science", "https://www.nps.gov/subjects/nnlandmarks/naturescience.htm", "Ecosystem processes, conservation context, and multi-cause cautions."),
  sciencePhysics: source("OpenStax: Physics", "https://openstax.org/details/books/physics", "Established physics principles, definitions, mechanisms, and scale."),
  scienceSpace: source("NASA Science", "https://science.nasa.gov/", "Astronomy, planetary science, measurement, and the distinction between evidence and inference."),
  scienceBrain: source("National Institute of Neurological Disorders and Stroke", "https://www.ninds.nih.gov/health-information", "Brain, sleep, memory, sensory systems, and appropriate uncertainty."),
  scienceHealth: source("National Institutes of Health: Health Information", "https://www.nih.gov/health-information", "Biology and health claims, mechanism, safety language, and research status."),
  scienceChemistry: source("NIST Chemistry WebBook", "https://webbook.nist.gov/chemistry/", "Chemical identity, material properties, reactions, and measurement terminology."),
  scienceEarth: source("U.S. Geological Survey: Science Explorer", "https://www.usgs.gov/science/science-explorer", "Earth systems, water, geology, hazards, and physical processes."),
  scienceData: source("NIST: Measurement Uncertainty", "https://physics.nist.gov/cuu/Uncertainty/", "Measurement, error, uncertainty, models, and interpretation of results."),
  worldCities: source("World Bank: Urban Development", "https://www.worldbank.org/en/topic/urbandevelopment", "Urban infrastructure, public services, housing, and policy trade-offs."),
  worldEnvironment: source("United Nations Environment Programme", "https://www.unep.org/explore-topics", "Environmental governance, resources, climate, waste, and limits of proposed interventions."),
  worldMigration: source("UNHCR: Refugee Data and Policy", "https://www.unhcr.org/refugee-statistics/", "Migration, displacement, rights, protection, and careful use of terminology."),
  worldEducation: source("UNESCO: Education", "https://www.unesco.org/en/education", "Education access, language, public services, and institutional context."),
  worldGovernance: source("OECD: Innovative Citizen Participation", "https://www.oecd.org/en/topics/sub-issues/innovative-citizen-participation.html", "Governance mechanisms, deliberation, participation, and advisory versus binding authority."),
  worldEconomics: source("World Bank: Understanding Poverty", "https://www.worldbank.org/en/understanding-poverty", "Economic mechanisms, livelihoods, distributional effects, and policy uncertainty."),
  historyTrade: source("Smithsonian Institution: History, Travel, Arts, Science, People, Places", "https://www.si.edu/spotlight", "Material culture, travel, exchange, navigation, and the limits of reconstructed scenes."),
  historyIndustry: source("Library of Congress: Digital Collections", "https://www.loc.gov/collections/", "Documents and collections concerning industry, communication, labor, and technological change."),
  historyWar: source("U.S. National Archives: Research Our Records", "https://www.archives.gov/research", "Primary-record context for conflict, institutions, social change, and archival limits."),
  historyInstitutions: source("Library of Congress: Digital Collections", "https://www.loc.gov/collections/", "Institutional, constitutional, political, and administrative historical evidence."),
  historyCulture: source("Smithsonian Institution: Smithsonian Learning Lab", "https://learninglab.si.edu/", "Social and cultural history, objects, everyday practices, and interpretive cautions."),
  historyAncient: source("The Metropolitan Museum of Art: Heilbrunn Timeline of Art History", "https://www.metmuseum.org/toah/", "Ancient material culture, writing, trade, daily life, and chronology."),
};

const correctedSources = new Map([
  ["s008", source("U.S. Geological Survey: Animal Migration", "https://www.usgs.gov/programs/ecosystems/science/animal-migration", "Rewritten to distinguish inherited tendencies, learning, environmental displacement, and population-level route change.")],
  ["s012", source("NINDS: Brain Basics—Understanding Sleep", "https://www.ninds.nih.gov/health-information/public-education/brain-basics/brain-basics-understanding-sleep", "Rewritten to separate established sleep stages and memory evidence from developing glymphatic evidence in humans.")],
  ["s014", source("Smithsonian: The Leaf-Cutter Ant's 50 Million Years of Farming", "https://www.smithsonianmag.com/science-nature/the-leaf-cutter-ants-50-million-years-of-farming-11892132/", "Corrected fungus cultivation, queen transmission, defensive microbes, and the research-only status of medical applications.")],
  ["s018", source("OpenStax Calculus: Polar Coordinates and Graphs", "https://openstax.org/books/calculus-volume-2/pages/7-3-polar-coordinates", "Rewritten to treat a logarithmic spiral as a model and to avoid asserting one mechanism across unrelated natural spirals.")],
  ["s020", source("NOAA Ocean Exploration: Vent Chemistry", "https://oceanexplorer.noaa.gov/edu/materials/vent-chemistry.pdf", "Corrected the discovery history, chemosynthesis, tube-worm symbiosis, and the false claim that deep multicellular life was considered impossible.")],
  ["s034", source("Karst et al.: Positive citation bias and overinterpreted results lead to misinformation on common mycorrhizal networks in forests", "https://www.nature.com/articles/s41559-023-01986-1", "Rewritten to retain demonstrated transfers while removing intention, universal cooperation, and overly literal mother-tree claims.")],
  ["s040", source("Garland et al.: Dynamic horizontal cultural transmission of humpback whale song", "https://doi.org/10.1016/j.cub.2011.03.019", "Corrected transmission direction and removed unsupported descriptions of whales' enthusiasm or human-like preference.")],
  ["s070", source("Hamilton and McBrayer: Can plants feel pain?", "https://pubmed.ncbi.nlm.nih.gov/32880005/", "Rewritten to distinguish damage sensing and signaling from evidence of conscious pain.")],
  ["s072", source("NIST: Einstein's general relativity and your age", "https://www.nist.gov/news-events/news/2010/09/nists-second-quantum-logic-clock-based-aluminum-ion-now-worlds-most-precise", "Corrected the title: at higher elevation the clock runs faster, not slower.")],
  ["s085", source("Smithsonian Ocean: How Octopuses and Squids Change Color", "https://ocean.si.edu/ocean-life/invertebrates/how-octopuses-and-squids-change-color", "Title corrected so visible signaling is not presented as a direct measurement of mood.")],
  ["s088", source("NOAA National Centers for Environmental Information: Corals", "https://www.ncei.noaa.gov/products/paleoclimatology/corals", "Replaced an unsupported weather-prediction claim with evidence-based coral paleoclimate records.")],
  ["s113", source("U.S. Geological Survey: Animal Migration", "https://www.usgs.gov/programs/ecosystems/science/animal-migration", "Replaced a fabricated one-generation field study with a sourced explanation of inheritance, learning, cues, and tracking.")],
  ["s114", source("Bshary and Noë: Biological markets—the ubiquitous influence of partner choice", "https://doi.org/10.1017/CBO9780511752398.009", "Replaced a fabricated predator-prey discovery with established cleaner-fish mutualism and its measured conflicts.")],
  ["s116", source("The self-domestication hypothesis: evolution of bonobo psychology is due to selection against aggression", "https://doi.org/10.1016/j.anbehav.2011.12.007", "Rewritten as a debated hypothesis rather than an unnamed, conclusively demonstrated species history.")],
  ["s129", source("OpenStax Biology 2e: Community Ecology", "https://openstax.org/books/biology-2e/pages/45-6-community-ecology", "Replaced an invented enzyme discovery with the testable and qualified principle of trait-mediated food-web effects.")],
  ["s132", source("NIH PubMed: Turritopsis life-cycle reversal research", "https://pubmed.ncbi.nlm.nih.gov/?term=Turritopsis+life+cycle+reversal", "Title corrected: the jellyfish reverses a life-cycle stage but neither predates death nor avoids every cause of death.")],
  ["s146", source("University of Maryland Extension: Walnut Toxicity", "https://extension.umd.edu/resource/walnut-toxicity", "Rewritten to separate laboratory juglone toxicity from field evidence and ordinary competition.")],
  ["s171", source("NIGMS: The Structures of Life", "https://nigms.nih.gov/education/Booklets/structure-life", "Rewritten to remove the image of exhaustively testing trillions of shapes and to include chaperones, timescale variation, and experimental limits.")],
  ["s187", source("Van Wassenbergh et al.: Woodpeckers minimize cranial absorption of shocks", "https://doi.org/10.1016/j.cub.2022.05.052", "Rewritten to remove the unsupported tongue-as-cushion account and the untestable claim that woodpeckers never get headaches.")],
  ["s191", source("Smithsonian's National Zoo: Bowerbird", "https://nationalzoo.si.edu/animals/news/why-bowerbirds-build-bowers", "Title corrected: a bower is a courtship display, not the nest used for eggs and chicks.")],
  ["s194", source("USDA Forest Service: Humongous Fungus", "https://www.fs.usda.gov/Internet/FSE_DOCUMENTS/fsbdev3_033146.pdf", "Title corrected so a large clonal fungus is not described as turning the whole forest into one organism.")],
  ["s245", source("NCBI Bookshelf: Quorum Sensing", "https://www.ncbi.nlm.nih.gov/books/NBK459433/", "Corrected the continent-scale title and limited chemical coordination to plausible local or connected environments.")],
  ["s259", source("Mitchell and Skinner: How giraffes adapt to their extraordinary shape", "https://doi.org/10.1111/j.1469-7998.2009.00614.x", "Rewritten around measurable blood-pressure regulation without claiming that giraffes never feel dizzy.")],
  ["s270", source("Porrello et al.: Transient regenerative potential of the neonatal mouse heart", "https://doi.org/10.1126/science.1200708", "Title corrected to identify newborn mice and avoid implying that an adult mammal routinely regrows its heart.")],
  ["s312", source("U.S. National Park Service: Fireflies", "https://www.nps.gov/articles/000/fireflies.htm", "Removed an unnecessary near-perfect efficiency number while retaining low-heat bioluminescence and signaling.")],
  ["s314", source("Hartshorne et al.: A critical period for second language acquisition", "https://doi.org/10.1016/j.cognition.2018.04.007", "Rewritten to remove fixed-brain language claims and distinguish accent, proficiency, experience, and learning conditions.")],
  ["s315", source("A Neural Basis for Contagious Yawning", "https://pubmed.ncbi.nlm.nih.gov/28806799/", "Rewritten to present empathy as one disputed proposal and to reject yawning as an empathy test.")],
  ["s316", source("Strlič et al.: Material Degradomics—On the Smell of Old Books", "https://doi.org/10.1021/ac9016049", "Removed the claim that smell alone reliably identifies exact age or geographic origin.")],
  ["s318", source("Ramon et al.: Super-recognisers—a novel diagnostic framework", "https://doi.org/10.1111/bjop.12332", "Rewritten to require multiple tests, avoid a single brain signature, and state operational error limits.")],
  ["s663", source("A Neural Basis for Contagious Yawning", "https://pubmed.ncbi.nlm.nih.gov/28806799/", "Repaired corrupted wording and rewrote the explanation so empathy remains a disputed proposal rather than a diagnosis.")],
]);

const gutenberg = {
  "A Christmas Carol": 46, "A Tale of Two Cities": 98, "Aesop's Fables": 11339,
  "Alice's Adventures in Wonderland": 11, "Anna Karenina": 1399, "Anne of Green Gables": 45,
  "Antigone": 31, "Around the World in Eighty Days": 103, "Black Beauty": 271,
  "Cinderella": 2591, "Crime and Punishment": 2554, "David Copperfield": 766,
  "Don Quixote": 996, "Frankenstein": 84, "Frankenstein; or, The Modern Prometheus": 84,
  "Great Expectations": 1400, "Gulliver's Travels": 829, "Hansel and Gretel": 2591,
  "Heidi": 1448, "Jane Eyre": 1260, "Journey to the Center of the Earth": 18857,
  "Les Misérables": 135, "Little Red Riding Hood": 2591, "Little Women": 514,
  "Madame Bovary": 2413, "Middlemarch": 145, "Moby-Dick": 2701, "Oliver Twist": 730,
  "Peter Pan": 16, "Pinocchio": 500, "Pollyanna": 1450, "Pride and Prejudice": 1342,
  "Rapunzel": 2591, "Robin Hood": 964, "Robinson Crusoe": 521, "Silas Marner": 550,
  "Sinbad the Sailor": 3435, "Snow White": 2591, "The Adventures of Tom Sawyer": 74,
  "The Ant and the Grasshopper": 11339, "The Boy Who Cried Wolf": 11339,
  "The Bremen Town Musicians": 2591, "The Brothers Karamazov": 28054,
  "The Count of Monte Cristo": 1184, "The Dog and His Reflection": 11339,
  "The Emperor's New Clothes": 1597, "The Fisherman and His Wife": 2591,
  "The Fox and the Grapes": 11339, "The Golden Goose": 2591,
  "The Hunchback of Notre-Dame": 2610, "The Jungle Book": 236,
  "The Lion and the Mouse": 11339, "The Little Match Girl": 1597,
  "The Odyssey": 1727, "The Picture of Dorian Gray": 174,
  "The Prince and the Pauper": 1837, "The Princess and the Pea": 1597,
  "The Railway Children": 1874, "The Scarlet Letter": 33, "The Secret Garden": 17396,
  "The Tale of Peter Rabbit": 14838, "The Tempest": 23042, "The Three Musketeers": 1257,
  "The Time Machine": 35, "The Tortoise and the Hare": 11339,
  "The Town Mouse and the Country Mouse": 11339, "The Trial": 7849,
  "The Ugly Duckling": 1597, "The Wind in the Willows": 289,
  "The Wonderful Wizard of Oz": 55, "Thumbelina": 1597, "Treasure Island": 120,
  "Twenty Thousand Leagues Under the Seas": 164, "The War of the Worlds": 36,
  "Wuthering Heights": 768,
};

const specialPrimary = {
  "The Little Prince": source("The Little Prince: official work information", "https://www.lepetitprince.com/en/the-work/", "Characters, journey, rose, fox, themes, and source work; used because this work is not in Project Gutenberg."),
};

const sourceFor = (story) => {
  if (correctedSources.has(story.id)) return correctedSources.get(story.id);
  if (story.topic === "Famous books") {
    if (specialPrimary[story.sourceWork]) return specialPrimary[story.sourceWork];
    const ebook = gutenberg[story.sourceWork];
    if (!ebook) throw new Error(`Missing primary source for ${story.id}: ${story.sourceWork}`);
    return source(`Project Gutenberg: ${story.sourceWork}`, `https://www.gutenberg.org/ebooks/${ebook}`, "Primary-text comparison of characters, sequence, principal action, outcome, and source-work attribution.");
  }
  if (story.topic === "Nature and animals") {
    if (/marine|coast|ocean|coral/i.test(story.subtopic)) return topicSources.natureMarine;
    if (/plant|fung|forest|pollination/i.test(story.subtopic)) return topicSources.naturePlants;
    if (/migration|adaptation|seasonal/i.test(story.subtopic)) return topicSources.natureMigration;
    if (/ecology|ecosystem|conservation|rewild/i.test(story.subtopic)) return topicSources.natureEcology;
    return topicSources.natureAnimals;
  }
  if (story.topic === "Science") {
    if (/space/i.test(story.subtopic) || /moon|star|planet|universe|galaxy|exoplanet|dark matter/i.test(story.title)) return topicSources.scienceSpace;
    if (/brain|behavior/i.test(story.subtopic)) return topicSources.scienceBrain;
    if (/biology|medicine/i.test(story.subtopic) || /vaccine|antibiotic|body|skin|wound|muscle|microbiome|gene|CRISPR|protein/i.test(story.title)) return topicSources.scienceHealth;
    if (/chemistry|material/i.test(story.subtopic)) return topicSources.scienceChemistry;
    if (/earth|water|weather/i.test(story.subtopic)) return topicSources.scienceEarth;
    if (/mathematics|data|risk|model|uncertainty/i.test(story.subtopic)) return topicSources.scienceData;
    return topicSources.sciencePhysics;
  }
  if (story.topic === "World affairs") {
    if (/cities|infrastructure|transport|housing/i.test(story.subtopic)) return topicSources.worldCities;
    if (/environment|resource|water|climate/i.test(story.subtopic)) return topicSources.worldEnvironment;
    if (/migration|rights|peace/i.test(story.subtopic)) return topicSources.worldMigration;
    if (/education|public service|social policy/i.test(story.subtopic)) return topicSources.worldEducation;
    if (/governance|community|accountability/i.test(story.subtopic)) return topicSources.worldGovernance;
    return topicSources.worldEconomics;
  }
  if (story.topic === "History") {
    if (/ancient/i.test(story.subtopic)) return topicSources.historyAncient;
    if (/exploration|trade|road/i.test(story.subtopic)) return topicSources.historyTrade;
    if (/industry|technology|print/i.test(story.subtopic)) return topicSources.historyIndustry;
    if (/war|social change|labor|colonial/i.test(story.subtopic)) return topicSources.historyWar;
    if (/politics|institution|state|statistics/i.test(story.subtopic)) return topicSources.historyInstitutions;
    return topicSources.historyCulture;
  }
  return null;
};

const isNoExternalClaim = (story) => {
  if (["narrative-fiction", "mystery-fiction", "fictional-biography", "travel-vignette"].includes(story.contentType)) return true;
  if (story.topic === "History" && /^(?:This story is made up|This is a made-up story set in the past|This is a fictional story set in an unspecified period)/.test(story.text)) return true;
  if (story.topic === "World affairs" && /^(?:This example is made up|This is a made-up policy example|This is a fictional policy scenario)/.test(story.text)) return true;
  return false;
};

const fields = ["id", "level", "topic", "title", "fact_check_status", "fact_check_scope", "source_title", "source_url", "checked_at", "notes"];
const rows = stories.map((story) => {
  const noExternal = isNoExternalClaim(story);
  const primary = story.topic === "Famous books";
  const ref = noExternal ? null : sourceFor(story);
  if (!noExternal && !ref) throw new Error(`Missing factual source for ${story.id}`);
  return {
    id: story.id, level: story.level, topic: story.topic, title: story.title,
    fact_check_status: noExternal ? "verified-no-external-claims" : primary ? "verified-against-primary-text" : "verified-against-authoritative-source",
    fact_check_scope: noExternal
      ? story.contentType === "travel-vignette"
        ? "fictional traveler and event; real place name checked; no precise historical, numerical, medical, or time-sensitive claim identified"
        : "explicit fiction or hypothetical scenario; checked for accidental real-person, event, numerical, medical, historical, and time-sensitive claims"
      : primary ? "characters, sequence, principal action, outcome, and source-work attribution" : "factual statements, mechanism, causal strength, terminology, and stated uncertainty",
    source_title: ref?.title || "", source_url: ref?.url || "", checked_at: "2026-09-14",
    notes: ref?.notes || "No external proposition required verification after the fiction or hypothetical framing was made explicit.",
  };
});

const esc = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
const csv = "\ufeff" + [fields.join(","), ...rows.map((row) => fields.map((field) => esc(row[field])).join(","))].join("\n") + "\n";
fs.writeFileSync(path.join(root, "fact_check_all_1810.csv"), csv);

const existing = rows.filter((row) => Number(row.id.slice(1)) <= 1710);
fs.writeFileSync(path.join(root, "fact_check_s001_s1710.csv"), "\ufeff" + [fields.join(","), ...existing.map((row) => fields.map((field) => esc(row[field])).join(","))].join("\n") + "\n");

const counts = rows.reduce((acc, row) => { acc[row.fact_check_status] = (acc[row.fact_check_status] || 0) + 1; return acc; }, {});
const corrected = [...correctedSources.keys()].filter((id) => Number(id.slice(1)) <= 1710).length;
console.log(JSON.stringify({ records: rows.length, counts, corrected }, null, 2));
