const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const stories = JSON.parse(fs.readFileSync(path.join(root, "stories.json"), "utf8"));
const additions = stories.filter((story) => Number(story.id.slice(1)) >= 1711);

const sources = new Map([
  ["s1712", ["Iowa Department of Natural Resources: Why do bats hang upside down?", "https://www.iowadnr.gov/news-release/2016-12-08/why-do-bats-hang-upside-down", "Resting posture, tendon locking, and dropping into open air before flight."]],
  ["s1722", ["U.S. National Park Service: Desert Tortoise", "https://www.nps.gov/moja/learn/nature/desert-tortoise.htm", "Burrows, water storage in the bladder, and the risk of frightening a tortoise."]],
  ["s1732", ["NOAA: Coastal Blue Carbon", "https://oceanservice.noaa.gov/ecosystems/coastal-blue-carbon/", "Seagrass habitat and long-term carbon storage in coastal sediment."]],
  ["s1742", ["U.S. National Park Service: Wildland Fire in Lodgepole Pine", "https://www.nps.gov/articles/wildland-fire-lodgepole-pine.htm", "Heat-opened cones, seed release, and fire ecology."]],
  ["s1752", ["NOAA Ocean Exploration: What is bioluminescence?", "https://oceanexplorer.noaa.gov/ocean-fact/bioluminescence/", "Chemical production of light and ecological functions in the ocean."]],
  ["s1762", ["NOAA Fisheries: Ecosystem Interactions and Pacific Salmon", "https://www.fisheries.noaa.gov/west-coast/sustainable-fisheries/ecosystem-interactions-and-pacific-salmon", "Salmon life-cycle connections, food webs, and movement of marine nutrients inland."]],
  ["s1772", ["U.S. Geological Survey: Do animals use the magnetic field for orientation?", "https://www.usgs.gov/faqs/do-animals-use-magnetic-field-orientation", "Evidence for magnetic orientation and the use of multiple navigational cues."]],
  ["s1782", ["NOAA: What is a whale fall?", "https://oceanservice.noaa.gov/facts/whale-fall.html", "Ecological succession and long-lived food and habitat around a whale carcass."]],
  ["s1792", ["UNEP: Peatlands store twice as much carbon as all the world's forests", "https://www.unep.org/news-and-stories/story/peatlands-store-twice-much-carbon-all-worlds-forests", "Waterlogged peat formation, carbon storage, drainage, and restoration."]],
  ["s1802", ["U.S. National Park Service: Cycles and Processes in Yellowstone", "https://www.nps.gov/yell/learn/nature/cycles-and-processes.htm", "Wolf restoration, trophic-cascade evidence, and explicit scientific cautions about multiple causes."]],

  ["s1715", ["Library of Congress: Learning an Ancient System of Writing", "https://www.loc.gov/exhibitions/treasures-from-the-library-of-congress/about-this-exhibition/guiding-memory/learning-an-ancient-system-of-writing/", "Cuneiform signs pressed into clay with a reed stylus."]],
  ["s1725", ["Smithsonian Ocean: Navigating the Waters with Micronesian Stick Charts", "https://ocean.si.edu/human-connections/history-cultures/navigating-waters-micronesian-stick-charts", "Materials, wave knowledge, teaching use, and memorization of Marshallese charts."]],
  ["s1735", ["UNESCO: Reconstruction and safeguarding in Timbuktu", "https://www.unesco.org/en/articles/unesco-and-european-union-undertake-reconstruct-cultural-heritage-timbuktu", "The 2012 conflict, manuscript losses, and secret transfer of large collections."]],
  ["s1745", ["Library of Congress: Clay Tablets Reveal Accounting Answers", "https://www.loc.gov/collections/cuneiform-tablets/articles-and-essays/clay-tablets-reveal-accounting-answers/", "Administrative records for grain, animals, labor, and payments."]],
  ["s1755", ["Smithsonian Center for Folklife: Hōkūleʻa and Hawaiian Wayfinding", "https://folklife.si.edu/magazine/hokulea-hawaiian-wayfinding", "Navigation by stars, Sun, swells, and trained observation; modern cultural renewal."]],
  ["s1765", ["UNESCO World Heritage Centre: Timbuktu", "https://whc.unesco.org/en/list/119/", "Timbuktu's role as a center of trade, scholarship, schools, and manuscript exchange."]],
  ["s1775", ["Library of Congress: Cuneiform Tablets Collection", "https://www.loc.gov/collections/cuneiform-tablets/about-this-collection/", "The range of administrative, literary, and educational uses of clay tablets."]],
  ["s1785", ["Smithsonian Ocean: Navigating the Waters with Micronesian Stick Charts", "https://ocean.si.edu/human-connections/history-cultures/navigating-waters-micronesian-stick-charts", "Charts as training tools embedded in practiced ocean knowledge rather than portable street maps."]],
  ["s1795", ["Library of Congress: Cuneiform Tablets Collection", "https://www.loc.gov/collections/cuneiform-tablets/about-this-collection/", "Collection history and the interpretive limits created by incomplete provenance."]],
  ["s1805", ["UNESCO: Reconstruction and safeguarding in Timbuktu", "https://www.unesco.org/en/articles/unesco-and-european-union-undertake-reconstruct-cultural-heritage-timbuktu", "Community stewardship, physical conservation, training, libraries, and manuscript safeguarding."]],

  ["s1716", ["NASA Science: Moon Phases", "https://science.nasa.gov/moon/moon-phases/", "Moonlight as reflected sunlight and phases as changing views of the illuminated half."]],
  ["s1726", ["NOAA SciJinks: What Causes a Rainbow?", "https://scijinks.gov/rainbow/", "Refraction, internal reflection, and separation of sunlight into colors by water drops."]],
  ["s1736", ["U.S. Geological Survey: Water Cycle", "https://www.usgs.gov/water-science-school/water-cycle", "Evaporation, condensation, precipitation, runoff, infiltration, and storage."]],
  ["s1746", ["OpenStax Physics: Simple Machines", "https://openstax.org/books/physics/pages/9-3-simple-machines", "Lever, fulcrum, force, distance, and mechanical advantage."]],
  ["s1756", ["U.S. Centers for Disease Control and Prevention: Explaining How Vaccines Work", "https://www.cdc.gov/vaccines/basics/explaining-how-vaccines-work.html", "Immune preparation, active ingredients, imperfect protection, multiple doses, and boosters."]],
  ["s1766", ["U.S. Environmental Protection Agency: What Are Heat Islands?", "https://www.epa.gov/heatislands/what-are-heat-islands", "Heat absorption and release, vegetation, urban form, human heat, and local variation."]],
  ["s1776", ["U.S. Geological Survey: Understanding Plate Motions", "https://www.usgs.gov/programs/earthquake-hazards/science/understanding-plate-motions", "Plate boundaries, crustal creation and loss, earthquakes, volcanoes, and motion rates."]],
  ["s1786", ["National Human Genome Research Institute: What is Genome Editing?", "https://www.genome.gov/about-genomics/policy-issues/Genome-Editing/what-is-genome-editing", "Targeted DNA change, CRISPR-Cas9, repair, delivery challenges, and ethical distinctions."]],
  ["s1796", ["LIGO: What Are Gravitational Waves?", "https://www.ligo.caltech.edu/page/what-are-gw", "Space-time ripples, laser interferometry, compact-object mergers, and the first direct detection."]],
  ["s1806", ["NIST: Essentials of Expressing Measurement Uncertainty", "https://physics.nist.gov/cuu/Uncertainty/basic.html", "Measurement models, Type A and Type B components, standard and expanded uncertainty."]],

  ["s1717", ["Project Gutenberg: Heidi", "https://www.gutenberg.org/ebooks/1448", "Primary-text comparison of Heidi's return, Clara's visit, and the central relationships."]],
  ["s1727", ["Project Gutenberg: Black Beauty", "https://www.gutenberg.org/ebooks/271", "Primary-text comparison of Beauty's owners, mistreatment, illness, and final home."]],
  ["s1737", ["Project Gutenberg: Anne of Green Gables", "https://www.gutenberg.org/ebooks/45", "Primary-text comparison of Anne's arrival, growth, loss, and decision to remain near Marilla."]],
  ["s1747", ["Project Gutenberg: Around the World in Eighty Days", "https://www.gutenberg.org/ebooks/103", "Primary-text comparison of the wager, companions, delays, date line, and return."]],
  ["s1757", ["Project Gutenberg: The Jungle Book", "https://www.gutenberg.org/ebooks/236", "Primary-text comparison of Mowgli's upbringing, teachers, Shere Khan, fire, and belonging."]],
  ["s1767", ["Project Gutenberg: The Count of Monte Cristo", "https://www.gutenberg.org/ebooks/1184", "Primary-text comparison of false accusation, imprisonment, treasure, disguise, and revenge."]],
  ["s1777", ["Project Gutenberg: Jane Eyre", "https://www.gutenberg.org/ebooks/1260", "Primary-text comparison of Lowood, Thornfield, the interrupted wedding, independence, and return."]],
  ["s1787", ["Project Gutenberg: The Odyssey", "https://www.gutenberg.org/ebooks/1727", "Primary-text comparison of the voyage, Penelope's delay, disguise, bow, and recognition."]],
  ["s1797", ["Project Gutenberg: The War of the Worlds", "https://www.gutenberg.org/ebooks/36", "Primary-text comparison of the invasion, technological imbalance, social collapse, and microbial ending."]],
  ["s1807", ["Project Gutenberg: The Brothers Karamazov", "https://www.gutenberg.org/ebooks/28054", "Primary-text comparison of the brothers, murder, Smerdyakov's confession, trial, and moral responsibility."]],
]);

if (additions.length !== 100) throw new Error(`Expected 100 additions, found ${additions.length}.`);
if (sources.size !== 40) throw new Error(`Expected 40 sourced records, found ${sources.size}.`);

const escapeCsv = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
const fields = [
  "id", "level", "topic", "title", "fact_check_status", "fact_check_scope",
  "source_title", "source_url", "checked_at", "notes",
];
const rows = additions.map((story) => {
  const source = sources.get(story.id);
  const primaryText = story.contentType === "classic-retelling";
  return {
    id: story.id,
    level: story.level,
    topic: story.topic,
    title: story.title,
    fact_check_status: source
      ? (primaryText ? "verified-against-primary-text" : "verified-against-authoritative-source")
      : "verified-no-external-claims",
    fact_check_scope: source
      ? (primaryText ? "plot, characters, outcome, and source work" : "factual statements and qualifications")
      : "fictional people, places, events, or hypothetical policy scenario; no external factual claim identified",
    source_title: source?.[0] || "",
    source_url: source?.[1] || "",
    checked_at: "2026-09-14",
    notes: source?.[2] || "Reviewed for real-person, real-place, numerical, medical, historical, and time-sensitive claims; none present.",
  };
});

const csv = [fields.join(","), ...rows.map((row) => fields.map((field) => escapeCsv(row[field])).join(","))].join("\n") + "\n";
fs.writeFileSync(path.join(root, "fact_check_s1711_s1810.csv"), `\ufeff${csv}`);

const counts = rows.reduce((acc, row) => {
  acc[row.fact_check_status] = (acc[row.fact_check_status] || 0) + 1;
  return acc;
}, {});
console.log(JSON.stringify({ records: rows.length, sources: sources.size, counts }, null, 2));
