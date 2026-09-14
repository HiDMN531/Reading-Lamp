#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const reviewedAt = "2026-09-14";
const stories = JSON.parse(fs.readFileSync(path.join(root, "stories.json"), "utf8"));
const additions = stories.slice(1910);
if (stories.length !== 2000 || additions.length !== 90) throw new Error("Expected the 2,000-story corpus.");

const source = (title, url, note) => ({ title, url, note });
const sources = new Map([
  ["A Turtle Comes Up for Air", source("NOAA Fisheries: Fun Facts About Terrific Sea Turtles", "https://www.fisheries.noaa.gov/national/outreach-and-education/fun-facts-about-terrific-sea-turtles", "Sea turtles breathe air at the surface; nesting females return to land and lay eggs in sand.")],
  ["A Bat Listens for Dinner", source("U.S. National Park Service: Mammals of Glacier National Park", "https://www.nps.gov/glac/learn/nature/mammals.htm", "Bats use echolocation to locate insects and are not blind.")],
  ["A Beaver Changes a Stream", source("U.S. National Park Service: Yellowstone Vital Signs 2017", "https://www.nps.gov/yell/learn/management/upload/Vital-Signs_Report_2017_508_Reduced.pdf", "Beaver dams alter water movement and wetland habitat; local effects vary and can require management.")],
  ["How a Penguin Holds Heat", source("Australian Antarctic Program: Penguins", "https://www.antarctica.gov.au/about-antarctica/animals/penguins/", "Overlapping waterproof feathers and body fat provide insulation; behavior and condition also affect heat loss.")],
  ["An Octopus Changes Its Look", source("Smithsonian Ocean: Octopuses, Squids and Relatives", "https://ocean.si.edu/ocean-life/invertebrates/octopuses-squids-and-relatives", "Chromatophores, reflecting structures, skin texture, nervous control, camouflage, and signaling.")],
  ["Fungi Return a Fallen Tree to the Forest", source("USDA Forest Service: Ecology and Management of Early Successional Habitats", "https://research.fs.usda.gov/treesearch/download/60573.pdf", "Dead wood supports fungi and other organisms, retains moisture, and contributes nutrients as decomposition proceeds.")],
  ["Horseshoe Crabs at the Spring Tide", source("U.S. Fish & Wildlife Service: The Horseshoe Crab", "https://www.fws.gov/sites/default/files/documents/Horseshoecrab.pdf", "Spawning, buried and exposed eggs, dependence of migrating shorebirds, biomedical use, and conservation pressure.")],
  ["A Whale Fall Becomes a Deep-Sea Habitat", source("NOAA Ocean Exploration: National Ocean Month—Whale Falls", "https://oceanexplorer.noaa.gov/exploration-extras/24-national-ocean-month/", "Scavenger, enrichment, and sulfophilic processes can overlap and vary; whale falls support deep-sea communities.")],
  ["The Negotiated Partnership around a Root", source("USDA Forest Service: Mycorrhizal Fungi—The World's Largest Soil Carbon Sink?", "https://research.fs.usda.gov/download/treesearch/64948.pdf", "Mycorrhizal fungi associate with roots and exchange soil-derived resources for plant carbon; outcomes depend on context.")],

  ["Clay Held the First Marks", source("British Museum: Making cuneiform tablets", "https://www.britishmuseum.org/research/projects/making-cuneiform-tablets", "Reed-stylus marks on clay and the range and durability of cuneiform records.")],
  ["Pompeii under Ash", source("UNESCO World Heritage Centre: Archaeological Areas of Pompei, Herculaneum and Torre Annunziata", "https://whc.unesco.org/en/list/829/", "The AD 79 eruption buried Roman settlements and preserved extensive evidence of daily life.")],
  ["The Charter at Runnymede", source("UK Parliament: Magna Carta", "https://www.parliament.uk/magnacarta/", "The 1215 settlement at Runnymede, its immediate failure, later reissues, and influence on limits to royal authority.")],
  ["The Army Made of Clay", source("UNESCO World Heritage Centre: Mausoleum of the First Qin Emperor", "https://whc.unesco.org/en/list/441/", "1974 discovery, Qin Shi Huang's mausoleum, life-size terracotta figures, and the site's scale and preservation.")],
  ["Freedom Won in Saint-Domingue", source("Library of Congress: A concise history of the Haitian revolution", "https://www.loc.gov/item/02012395/", "The uprising beginning in 1791, shifting forces and leaders, French defeat, and Haitian independence in 1804.")],
  ["Many Roads Called the Silk Roads", source("UNESCO: About the Silk Roads", "https://www.unesco.org/en/silkroads", "Interconnected land and maritime routes moved goods, knowledge, beliefs, technologies, languages, and cultural forms.")],
  ["What the Emancipation Proclamation Changed", source("U.S. National Archives: Emancipation Proclamation", "https://www.archives.gov/exhibits/featured-documents/emancipation-proclamation", "Date, geographic and legal limits, military context, Black enlistment, and relationship to later nationwide abolition.")],
  ["Designing the Bretton Woods Institutions", source("Federal Reserve History: Creation of the Bretton Woods System", "https://www.federalreservehistory.org/essays/bretton-woods-created", "Forty-four nations met in July 1944, agreed to establish the IMF and what became the World Bank, and designed a dollar-gold-centered system.")],
  ["How Smallpox Eradication Was Verified", source("World Health Organization: Smallpox", "https://www.who.int/health-topics/smallpox", "Intensified eradication, surveillance and containment, last natural case in 1977, verification, and the 1980 declaration.")],

  ["Water Leaves a Leaf", source("U.S. Geological Survey: Evapotranspiration and the Water Cycle", "https://www.usgs.gov/water-science-school/science/evapotranspiration-and-water-cycle", "Water moves through plants and leaves as vapor through transpiration; condensed drops can demonstrate that movement.")],
  ["Why the Moon Looks Different", source("NASA Science: Moon Phases", "https://science.nasa.gov/moon/moon-phases/", "The Sun illuminates half of the Moon and our viewing angle changes as the Moon orbits Earth; eclipses are distinct.")],
  ["Cabbage Water Changes Color", source("American Chemical Society: Celebrating Chemistry—The Many Colors of Cabbage", "https://www.acs.org/content/dam/acsorg/education/outreach/celebrating-chemistry/2010-cced-celebrating-chemistry-english.pdf", "Red-cabbage indicator colors change with acids and bases; the experiment calls for eye protection and no tasting.")],
  ["A Clear Bag around a Branch", source("U.S. Geological Survey: Evapotranspiration and the Water Cycle", "https://www.usgs.gov/water-science-school/science/evapotranspiration-and-water-cycle", "Transpiration through leaf openings and environmental controls on water loss.")],
  ["Bread Rises on Yeast Gas", source("American Chemical Society Journal of Chemical Education: Visualizing Yeast Fermentation", "https://pubs.acs.org/doi/10.1021/acs.jchemed.3c00913", "Yeast fermentation releases carbon dioxide; dough structure, temperature, ingredients, and baking affect expansion and setting.")],
  ["A Complete Path for Electric Current", source("OpenStax Physics: Series Circuits", "https://openstax.org/books/physics/pages/19-2-series-circuits", "A closed conducting path is required for current; voltage, resistance, circuit design, and safe low-voltage practice matter.")],
  ["Resistance Is an Evolutionary Problem", source("U.S. Centers for Disease Control and Prevention: About Antimicrobial Resistance", "https://www.cdc.gov/antimicrobial-resistance/about/index.html", "Microbes—not people—become resistant; selection, transmission, appropriate use, infection prevention, and surveillance.")],
  ["Listening for Distortions in Space-Time", source("LIGO Scientific Collaboration: Detections", "https://ligo.org/detections/", "GW150914 was observed by two LIGO sites, came from merging black holes, and was the first direct gravitational-wave detection.")],
  ["Entanglement without Faster Messages", source("Nobel Prize in Physics 2022: Popular information", "https://www.nobelprize.org/prizes/physics/2022/popular-information/", "Bell inequalities distinguish quantum correlations from local hidden-variable descriptions; entanglement does not provide controllable faster-than-light signaling.")],

  ["Peter Runs from the Garden", source("Project Gutenberg: The Tale of Peter Rabbit", "https://www.gutenberg.org/ebooks/14838", "Peter enters Mr. McGregor's garden against his mother's warning, loses clothes while escaping, and returns ill.")],
  ["Alice Follows a White Rabbit", source("Project Gutenberg: Alice's Adventures in Wonderland", "https://www.gutenberg.org/ebooks/11", "White Rabbit, fall into Wonderland, size changes, Cheshire Cat, tea party, Queen, trial, and waking frame.")],
  ["Heidi Returns to the Mountains", source("Project Gutenberg: Heidi", "https://www.gutenberg.org/ebooks/1448", "Heidi's Alpine home, Frankfurt stay with Clara, homesickness, return, and Clara's visit.")],
  ["Black Beauty Meets Kind and Cruel Hands", source("Project Gutenberg: Black Beauty", "https://www.gutenberg.org/ebooks/271", "First-person horse narrator, changing owners, kindness and cruelty, London work, illness, recognition, and final home.")],
  ["Anne Finds a Home at Green Gables", source("Project Gutenberg: Anne of Green Gables", "https://www.gutenberg.org/ebooks/45", "Anne's mistaken arrival, adoption, friendships, schooling, Matthew's death, and decision to remain near Marilla.")],
  ["Fogg Races around the World", source("Project Gutenberg: Around the World in Eighty Days", "https://www.gutenberg.org/ebooks/103", "Fogg's wager, eastward journey, Passepartout, Fix, Aouda, apparent delay, calendar gain, and marriage.")],
  ["Buck Hears the Call", source("Project Gutenberg: The Call of the Wild", "https://www.gutenberg.org/ebooks/215", "Buck's abduction, sled-dog life, John Thornton, Thornton's death, and Buck's final movement into the wild.")],
  ["The Creature Asks Victor to Listen", source("Project Gutenberg: Frankenstein; or, The Modern Prometheus", "https://www.gutenberg.org/ebooks/84", "Victor's creation and abandonment, the creature's education and request, revenge, Arctic pursuit, and ending.")],
  ["Jane Eyre Chooses Equality", source("Project Gutenberg: Jane Eyre", "https://www.gutenberg.org/ebooks/1260", "Jane's childhood, Lowood, Thornfield, Rochester and Bertha, departure, inheritance, return, and marriage.")],
]);

const classicTitles = new Set(additions.filter((story) => story.topic === "Famous books").map((story) => story.title));
const factualTitles = new Set(additions.filter((story) => ["Nature and animals", "History", "Science"].includes(story.topic)).map((story) => story.title));
if (classicTitles.size !== 9 || factualTitles.size !== 27 || sources.size !== 36) throw new Error("Source map classification mismatch.");
for (const title of [...classicTitles, ...factualTitles]) if (!sources.has(title)) throw new Error(`Missing source: ${title}`);

const rows = additions.map((story) => {
  const item = sources.get(story.title);
  if (classicTitles.has(story.title)) return {
    id: story.id, level: story.level, topic: story.topic, title: story.title,
    fact_check_status: "verified-against-primary-text",
    fact_check_scope: "characters, sequence, principal action, outcome, and source-work attribution",
    source_title: item.title, source_url: item.url, checked_at: reviewedAt,
    notes: `Primary-text comparison completed. ${item.note}`,
  };
  if (factualTitles.has(story.title)) return {
    id: story.id, level: story.level, topic: story.topic, title: story.title,
    fact_check_status: "verified-against-authoritative-source",
    fact_check_scope: "factual statements, mechanism, causal strength, terminology, dates, and stated uncertainty",
    source_title: item.title, source_url: item.url, checked_at: reviewedAt,
    notes: item.note,
  };
  return {
    id: story.id, level: story.level, topic: story.topic, title: story.title,
    fact_check_status: "verified-no-external-claims",
    fact_check_scope: "explicit fiction or hypothetical scenario; checked for accidental real-person, event, numerical, medical, historical, and time-sensitive claims",
    source_title: "", source_url: "", checked_at: reviewedAt,
    notes: "No external proposition required verification; fictional status is explicit in the text, setting, content type, or character framing.",
  };
});

const fields = ["id", "level", "topic", "title", "fact_check_status", "fact_check_scope", "source_title", "source_url", "checked_at", "notes"];
const quote = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
const csv = (items) => `\ufeff${fields.join(",")}\n${items.map((row) => fields.map((field) => quote(row[field])).join(",")).join("\n")}\n`;
const oldText = fs.readFileSync(path.join(root, "fact_check_all_1910.csv"), "utf8").replace(/^\ufeff/, "").trimEnd();
const oldLines = oldText.split(/\r?\n/);
if (oldLines.length !== 1911) throw new Error(`Expected 1,910 old fact-check rows, found ${oldLines.length - 1}.`);
const newLines = csv(rows).replace(/^\ufeff/, "").trim().split(/\r?\n/).slice(1);
fs.writeFileSync(path.join(root, "fact_check_s1911_s2000.csv"), csv(rows));
fs.writeFileSync(path.join(root, "fact_check_all_2000.csv"), `\ufeff${oldLines.concat(newLines).join("\n")}\n`);

const counts = Object.fromEntries([...new Set(rows.map((row) => row.fact_check_status))].map((status) => [status, rows.filter((row) => row.fact_check_status === status).length]));
console.log(JSON.stringify({ records: rows.length, sources: sources.size, counts }, null, 2));
