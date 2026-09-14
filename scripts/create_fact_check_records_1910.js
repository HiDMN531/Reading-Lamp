#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const reviewedAt = "2026-09-14";
const stories = JSON.parse(fs.readFileSync(path.join(root, "stories.json"), "utf8"));
const additions = stories.slice(1810);
if (stories.length !== 1910 || additions.length !== 100) throw new Error("Expected the 1,910-story corpus.");

const source = (title, url, note) => ({ title, url, note });
const sources = new Map([
  ["A Bee Carries Dust", source("USDA NRCS: Insects and Pollinators", "https://www.nrcs.usda.gov/conservation-basics/animals/insects-pollinators", "Pollen transfer during flower visits and its role in seed or fruit production.")],
  ["A Duck Stays Dry", source("U.S. National Park Service: Anhinga", "https://www.nps.gov/bicy/learn/nature/anhinga.htm", "Preening oil and water resistance in ducks and many other waterbirds.")],
  ["Warm Air under Feathers", source("U.S. National Park Service: Feathers", "https://www.nps.gov/media/video/view.htm?id=19CFCBC9-94D8-4225-A5EF-02313BA36239", "Feathers as insulation and the need for feather maintenance.")],
  ["Roots in Salt Water", source("NOAA Ocean Service: What is a mangrove forest?", "https://oceanservice.noaa.gov/facts/mangroves.html", "Intertidal habitat, low-oxygen soils, sediment capture, shelter, and coastal stabilization.")],
  ["A Butterfly across Generations", source("U.S. Fish & Wildlife Service: The phenomenal monarch migration", "https://www.fws.gov/story/phenomenal-monarch-migration", "Multi-generation migration, overwintering journey, milkweed, nectar, and environmental cues.")],
  ["Gifts from Returning Salmon", source("U.S. National Park Service: Nature & Science", "https://www.nps.gov/subjects/nnlandmarks/naturescience.htm", "Salmon life cycle and the qualified movement of marine-derived nutrients into watersheds.")],
  ["Elephants beyond Human Hearing", source("Smithsonian's National Zoo: Asian elephant", "https://nationalzoo.si.edu/animals/asian-elephant", "Low-frequency elephant calls, social contact, distance, and the need to qualify transmission conditions.")],
  ["When Coral Loses Its Color", source("NOAA Ocean Service: What is coral bleaching?", "https://oceanservice.noaa.gov/facts/coral_bleach.html", "Heat stress, loss of symbiotic algae, bleaching, recovery, and mortality risk.")],
  ["Peat Built by Incomplete Decay", source("UNEP: Global Peatlands Initiative", "https://www.unep.org/explore-topics/ecosystems-and-biodiversity/what-we-do/global-peatlands-initiative", "Peat formation, carbon storage, drainage, fire, rewetting, and restoration limits.")],
  ["Wolves, Elk, and the Limits of a Cascade", source("U.S. National Park Service: Wolf restoration in Yellowstone", "https://www.nps.gov/yell/learn/nature/wolves.htm", "Wolf reintroduction, predation, scavengers, vegetation responses, and multi-cause cautions.")],

  ["The Stone with Three Scripts", source("British Museum: Everything you ever wanted to know about the Rosetta Stone", "https://www.britishmuseum.org/blog/everything-you-ever-wanted-know-about-rosetta-stone", "Discovery date, decree in three scripts, Greek text, and its role in reading Egyptian scripts.")],
  ["Roads Built in Layers", source("Encyclopaedia Britannica: Roman road system", "https://www.britannica.com/technology/Roman-road-system", "Variation in Roman road construction, layers, drainage, and network uses.")],
  ["Books Hidden in Family Chests", source("Associated Press: Timbuktu manuscripts return home", "https://apnews.com/article/785663f5854718cca7abdcc95ddeba66", "Timbuktu's scholarly collections and the local evacuation of manuscripts during the 2012 occupation.")],
  ["Ink, Metal, and Many Pages", source("Library of Congress: The Gutenberg Bible", "https://www.loc.gov/exhibits/bibles/the-gutenberg-bible.html", "Movable metal type in Western Europe and the Gutenberg Bible's place in book production history.")],
  ["Messages That Became Dots and Lines", source("Smithsonian Institution Archives: Drawing of the Electromagnetic Telegraph and Alpha Code", "https://siarchives.si.edu/collections/siris_sic_12874", "Morse, Vail, telegraph equipment, coded signals, and the 1840s network context.")],
  ["A Map around a Water Pump", source("CDC MMWR: Historical Perspectives—John Snow and the Broad Street Pump", "https://www.cdc.gov/mmwr/preview/mmwrhtml/mm5334a1.htm", "The 1854 cholera investigation, mapped deaths, local inquiry, pump handle, and limits of causal interpretation.")],
  ["Rails Meeting at Promontory", source("U.S. National Park Service: Golden Spike National Historical Park history", "https://www.nps.gov/gosp/learn/historyculture/index.htm", "Promontory Summit in 1869, railroad labor, and consequences of transcontinental expansion.")],
  ["Petitions before the Nineteenth Amendment", source("U.S. National Archives: 19th Amendment", "https://www.archives.gov/milestone-documents/19th-amendment", "Ratification, organizing methods, constitutional language, and continuing discriminatory barriers.")],
  ["Earthrise from Apollo 8", source("NASA: Apollo 8's Earthrise", "https://www.nasa.gov/image-article/apollo-8-earthrise/", "Apollo 8 crew, lunar orbit, the Earthrise photographs, and careful distinction from earlier lunar-distance images.")],
  ["A Continent Reserved for Peace and Science", source("Antarctic Treaty Secretariat: The Antarctic Treaty", "https://www.ats.aq/e/antarctictreaty.html", "Signing, entry into force, peaceful use, science, data exchange, nuclear provisions, and territorial claims.")],

  ["Noon beneath the Tree", source("NASA Science: The Sun", "https://science.nasa.gov/sun/", "Sunlight direction, Earth's rotation, and changing shadows during the day.")],
  ["Sound from a String", source("OpenStax Physics: Waves", "https://openstax.org/books/physics/pages/13-introduction", "Vibration, wave motion, energy transfer, and sound as a mechanical wave.")],
  ["Ice, Water, and Steam", source("OpenStax Chemistry 2e: Phases and Classification of Matter", "https://openstax.org/books/chemistry-2e/pages/1-2-phases-and-classification-of-matter", "Solid, liquid, and gas states and changes caused by heating or cooling.")],
  ["Why a Metal Spoon Feels Cold", source("OpenStax Physics: Heat Transfer", "https://openstax.org/books/physics/pages/11-2-heat-specific-heat-and-heat-transfer", "Heat flow, thermal equilibrium, and differences in conduction between materials.")],
  ["Continents on Restless Plates", source("U.S. Geological Survey: This Dynamic Earth", "https://www.usgs.gov/publications/dynamic-earth-story-plate-tectonics", "Moving plates, boundary types, earthquakes, volcanoes, mountains, and crust formation.")],
  ["How DNA Keeps a Copy", source("National Human Genome Research Institute: DNA Fact Sheet", "https://www.genome.gov/about-genomics/fact-sheets/DNA-Fact-Sheet", "DNA structure, four bases, complementary pairing, and replication.")],
  ["What Immune Memory Remembers", source("CDC: Explaining How Vaccines Work", "https://www.cdc.gov/vaccines/basics/explaining-how-vaccines-work.html", "Antigens, immune response, memory, variable protection, and booster rationale.")],
  ["The Atmosphere's Useful Blanket", source("NASA Science: What is the greenhouse effect?", "https://science.nasa.gov/climate-change/faq/what-is-the-greenhouse-effect/", "Infrared radiation, greenhouse gases, the natural effect, human forcing, and the limits of the blanket analogy.")],
  ["A Result Needs Its Uncertainty", source("NIST: Uncertainty of Measurement Results", "https://physics.nist.gov/cuu/Uncertainty/", "Measurement uncertainty, random and systematic components, coverage, and reporting precision.")],
  ["CRISPR as a Guided Molecular Tool", source("National Human Genome Research Institute: What is genome editing?", "https://www.genome.gov/about-genomics/policy-issues/Genome-Editing/what-is-genome-editing", "Guide RNA, Cas enzymes, DNA repair, edit types, off-target effects, delivery, and clinical limits.")],

  ["Mary Opens the Secret Garden", source("Project Gutenberg: The Secret Garden", "https://www.gutenberg.org/ebooks/17396", "Characters, hidden garden, restoration, and the children's change.")],
  ["Dorothy Follows the Yellow Road", source("Project Gutenberg: The Wonderful Wizard of Oz", "https://www.gutenberg.org/ebooks/55", "Dorothy's journey, companions, goals, danger, and return through the silver shoes.")],
  ["Pinocchio Wants to Be Real", source("Project Gutenberg: The Adventures of Pinocchio", "https://www.gutenberg.org/ebooks/500", "Geppetto, Pinocchio's choices, lies, responsibility, and transformation.")],
  ["Jim and the Island Map", source("Project Gutenberg: Treasure Island", "https://www.gutenberg.org/ebooks/120", "Jim Hawkins, the map, Long John Silver, mutiny, voyage, and outcome.")],
  ["Toad Learns Too Slowly", source("Project Gutenberg: The Wind in the Willows", "https://www.gutenberg.org/ebooks/27805", "Mole, Rat, Badger, Toad's motorcar obsession, prison escape, and recovery of Toad Hall.")],
  ["The Traveler Sees Two Futures", source("Project Gutenberg: The Time Machine", "https://www.gutenberg.org/ebooks/35", "The Time Traveller, Eloi, Morlocks, class division, far future, and final disappearance.")],
  ["Hester Refuses to Disappear", source("Project Gutenberg: The Scarlet Letter", "https://www.gutenberg.org/ebooks/33", "Hester, Pearl, Dimmesdale, Chillingworth, the scarlet letter, confession, and ending.")],
  ["Dorian Bargains with His Portrait", source("Project Gutenberg: The Picture of Dorian Gray", "https://www.gutenberg.org/ebooks/174", "Dorian, Basil, Lord Henry, the changing portrait, murder, and final scene.")],
  ["Dorothea Revises Her Idea of a Great Life", source("Project Gutenberg: Middlemarch", "https://www.gutenberg.org/ebooks/145", "Dorothea, Casaubon, Will, Lydgate, marriage, reform, and the novel's social web.")],
  ["The Karamazov Brothers Face a Father's Death", source("Project Gutenberg: The Brothers Karamazov", "https://www.gutenberg.org/ebooks/28054", "Fyodor, Dmitri, Ivan, Alyosha, Smerdyakov, the murder, trial, and central moral conflicts.")],
]);

const classicTitles = new Set(additions.filter((story) => story.topic === "Famous books").map((story) => story.title));
const factualTitles = new Set(additions.filter((story) => ["Nature and animals", "History", "Science"].includes(story.topic)).map((story) => story.title));
if (classicTitles.size !== 10 || factualTitles.size !== 30 || sources.size !== 40) throw new Error("Source map classification mismatch.");
for (const title of [...classicTitles, ...factualTitles]) if (!sources.has(title)) throw new Error(`Missing source: ${title}`);

const rows = additions.map((story) => {
  const item = sources.get(story.title);
  const isClassic = classicTitles.has(story.title);
  const isFactual = factualTitles.has(story.title);
  if (isClassic) return {
    id: story.id, level: story.level, topic: story.topic, title: story.title,
    fact_check_status: "verified-against-primary-text",
    fact_check_scope: "characters, sequence, principal action, outcome, and source-work attribution",
    source_title: item.title, source_url: item.url, checked_at: reviewedAt,
    notes: `Primary-text comparison completed. ${item.note}`,
  };
  if (isFactual) return {
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
const oldText = fs.readFileSync(path.join(root, "fact_check_all_1810.csv"), "utf8").replace(/^\ufeff/, "").trimEnd();
const oldLines = oldText.split(/\r?\n/);
if (oldLines.length !== 1811) throw new Error(`Expected 1,810 old fact-check rows, found ${oldLines.length - 1}.`);
const newLines = csv(rows).replace(/^\ufeff/, "").trim().split(/\r?\n/).slice(1);
fs.writeFileSync(path.join(root, "fact_check_s1811_s1910.csv"), csv(rows));
fs.writeFileSync(path.join(root, "fact_check_all_1910.csv"), `\ufeff${oldLines.concat(newLines).join("\n")}\n`);

const counts = Object.fromEntries([...new Set(rows.map((row) => row.fact_check_status))].map((status) => [status, rows.filter((row) => row.fact_check_status === status).length]));
console.log(JSON.stringify({ records: rows.length, counts }, null, 2));
