#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const storiesPath = path.join(root, "stories.json");
const stories = JSON.parse(fs.readFileSync(storiesPath, "utf8"));

const revisions = {
  s008: {
    title: "How Birds Can Change Their Migration Routes",
    text: `Many migratory birds follow routes shaped by both inherited tendencies and experience. Young birds of some species travel without their parents, while others learn important parts of a route from older birds.

Migration is not perfectly fixed. Wind, storms, food, drought, artificial light, and changes to resting places can all affect where birds travel. Tracking devices have shown that individuals from the same species may use different routes or alter their timing from one year to another.

A new route does not necessarily mean that a bird has planned a better journey. It may result from weather pushing the bird away from its usual path, from following other birds, or from exploring and surviving an unfamiliar route. If the route works, experience may make it more likely that the bird uses it again.

Climate change is also shifting the seasonal conditions that migrants encounter. Some populations now arrive, depart, or stop at different times. Their ability to adjust varies, and rapid environmental change can still outpace that flexibility.

Scientists therefore avoid describing migration as either a rigid instinct or a completely learned map. It is usually a layered behavior in which genes, development, social learning, memory, and current conditions all contribute. Long-term tracking is essential because one unusual journey cannot show whether an entire population has adopted a lasting change.`,
  },
  s012: {
    title: "What the Brain Does During Sleep",
    text: `Sleep is not a period in which the brain simply turns off. During a normal night, the brain moves through several stages with different patterns of electrical activity. Rapid-eye-movement sleep, or REM sleep, is one of those stages and is often associated with vivid dreaming.

Sleep also supports learning and memory. Studies comparing sleep with continued wakefulness show that sleep can help stabilize some newly learned information. The exact effect depends on the kind of memory, the timing of sleep, and many other conditions.

Researchers are also studying a fluid-transport system often called the glymphatic system. Animal experiments show that fluid movement through brain tissue changes with sleep and can help clear some waste products. Evidence in humans is growing, but scientists are still working out how strongly sleep stage, body position, aging, and disease affect this process. Calling sleep a complete nightly “brain wash” would go beyond the evidence.

Too little sleep can reduce attention, reaction speed, emotional control, and decision quality. The size of the effect differs among people, and a simple comparison with a fixed amount of alcohol is not reliable in every situation.

The careful conclusion is still important: sleep is biologically active and necessary. It contributes to brain function, immune regulation, metabolism, and recovery, even though researchers have not yet explained every process that occurs while we sleep.`,
  },
  s014: {
    title: "Leafcutter Ants and Their Fungus Garden",
    text: `Leafcutter ants do not eat the leaf pieces they carry into their nests. They use the plant material to grow a fungus, and the fungus produces food the ants can digest.

Workers cut leaves, clean them, chew them into a soft material, and place them in underground garden chambers. Other workers remove waste and control conditions around the crop. A colony can contain millions of ants, each performing part of this agricultural system.

The partnership is very old. The ants depend strongly on their cultivated fungus, while the fungus depends on the colony for food and protection. A young queen carries a small piece of the fungus when she leaves to start a new nest, passing the crop to the next colony.

The garden can be attacked by other fungi. Some leafcutter-ant relatives carry bacteria on their bodies that make compounds able to slow these garden parasites. Researchers study this interaction to understand how long relationships among ants, fungi, and bacteria change over evolutionary time. Possible medical uses remain a research question rather than an established treatment.

The system resembles farming, but it did not arise through human planning. Natural selection gradually linked the survival of the ants and their crop. Their partnership began millions of years before human agriculture and shows that food cultivation can evolve in a very different kind of society.`,
  },
  s018: {
    title: "Spirals in Seashell Growth",
    text: `Many shells grow in a spiral because an animal adds new material around the open edge while keeping roughly the same overall shape. As the opening becomes larger, each new section is larger than the one before it.

Mathematicians can describe many of these forms with a logarithmic spiral. In that kind of spiral, the shape stays similar as its scale increases. The pattern is useful for a growing mollusk because the older shell does not need to be discarded and rebuilt.

Real shells are not perfect equations. Growth rate, available food, injury, water conditions, and the changing shape of the animal can all alter the curve. Different species also follow different growth rules. A mathematical model is therefore a useful approximation, not a hidden blueprint followed exactly by every shell.

Spiral patterns also appear in storms, plants, and galaxies, but similar appearance does not prove that one mechanism created them all. A rotating galaxy develops through gravity and motion, while a shell develops through biological growth.

The important connection is more modest. Repeated local rules can produce an organized form over time, and mathematics helps scientists compare those forms. A shell shows how a simple process of adding material can create a structure that remains recognizable while it becomes larger.`,
  },
  s020: {
    title: "Life Around Deep-Sea Hydrothermal Vents",
    text: `In 1977, scientists exploring the deep Pacific found dense communities of animals around hydrothermal vents. The discovery was surprising because the ecosystem existed in darkness, far below the sunlight that supports most food webs at Earth's surface.

Hydrothermal vents form where seawater moves through hot rock beneath the seafloor and returns carrying dissolved minerals. Microorganisms near the vents use chemical energy to build organic matter. This process is called chemosynthesis.

Giant tube worms are among the best-known vent animals. Adult tube worms have no mouth or digestive tract. Instead, they house bacteria inside a specialized organ. The bacteria use chemicals supplied through the worm's blood, and the worm receives nutrients produced by the bacteria.

The discovery did not show that scientists had believed all complex life was impossible in every deep trench. Deep-sea animals were already known. What changed was the understanding that a rich ecosystem could be based mainly on chemical energy rather than recent sunlight.

Vent research also influences astrobiology. Worlds with subsurface oceans may contain water, rock, and chemical energy even when sunlight cannot reach the water. That does not prove life exists there, but it gives scientists a reason to investigate.

Deep-sea exploration continues to find new species and new chemical relationships. Each finding adds evidence without turning the still poorly observed ocean into a place where any claim can be assumed true.`,
  },
  s034: {
    title: "How Trees and Fungi Exchange Resources Underground",
    text: `Many plant roots form partnerships with fungi called mycorrhizae. The fungi receive carbon-rich compounds made by plants. In return, their fine threads can help plants reach water and nutrients in the soil.

A single fungal network may connect with more than one plant. Experiments have detected movement of carbon, nutrients, or chemical signals between connected plants. These results have inspired the popular phrase “wood wide web.”

The phrase can be useful, but it can also suggest more certainty and cooperation than the evidence supports. A transfer observed in an experiment may be small, may benefit the fungus, or may occur differently under natural field conditions. Plants still compete for light, water, and nutrients, and fungi pursue their own survival.

Terms such as “mother tree” are metaphors, not proof that an older tree intentionally cares for seedlings. Researchers continue to debate how often transfers occur, what controls their direction, and how much they affect the growth of whole forests.

The strongest conclusion is that a tree is not biologically isolated. Roots interact with fungi, bacteria, soil, water, and neighboring plants. Some underground connections can move materials or information, but describing a forest as a single cooperative mind goes beyond what current experiments demonstrate.`,
  },
  s040: {
    title: "How Humpback Whale Songs Spread",
    text: `Male humpback whales in the same population usually sing similar, complex songs during a breeding season. The shared song changes over time as phrases are added, altered, or dropped.

Researchers comparing recordings from whale populations around Australia found an especially striking pattern. Songs that appeared in western populations later appeared in eastern populations, spreading in a broad direction across the South Pacific. In some years, a new song largely replaced the previous one.

This is evidence of cultural transmission: whales learn parts of their behavior from other whales rather than receiving every detail through genes. Movement and contact among populations can carry a song into a new area, where more singers gradually adopt it.

Recordings can reveal that a song spread, but they cannot show that whales adopted it with “enthusiasm” or preferred novelty in the human sense. Scientists also do not yet have one complete explanation for why songs change. Sexual selection, copying errors, innovation, and contact among groups may all contribute.

Whale song is valuable because it allows researchers to follow a changing animal tradition across years and great distances. The findings support the broader conclusion that culture is not limited to humans, while leaving the whales' exact motivations as an open question.`,
  },
  s070: {
    title: "Do Plants Feel Pain?",
    text: `Plants detect and respond to damage. A bitten leaf can release chemicals, change its growth, and trigger defenses in other parts of the plant. Some signals also affect nearby plants or insects.

These responses are complex, but they do not by themselves show that plants feel pain. In animals, pain is a conscious experience associated with a nervous system and a brain or comparable processing structure. Plants have neither neurons nor a brain.

Electrical and chemical signals in plants are sometimes compared with animal nerve signals. The comparison can help describe how information moves, but similar words do not make the underlying systems identical. A plant's response can be adaptive without involving a private experience of suffering.

Science cannot directly observe another organism's conscious experience. Researchers therefore look for biological structures and behavior that could support it. Current evidence gives strong reasons to describe plant sensing and defense, but it does not establish plant pain.

This distinction does not make plants unimportant. Their signaling systems are remarkable and ecologically essential. It simply separates a measurable response from a claim about consciousness. Asking careful questions about plants can expand our understanding without assigning them human experiences that the evidence has not demonstrated.`,
  },
  s072: { title: "The Clock That Runs Faster on a Mountain" },
  s085: { title: "What Octopus Color Changes Can Signal" },
  s088: {
    title: "How Corals Record Past Ocean Conditions",
    text: `Massive corals build skeletons in layers as they grow. Those layers contain chemical clues about the water around the coral at the time each layer formed.

Researchers can measure ratios of chemical elements and forms of oxygen in a coral skeleton. Together with the coral's growth bands, these measurements can help reconstruct past sea-surface temperature, rainfall, river flow, or ocean circulation. The method is similar in purpose to reading tree rings, although the evidence and uncertainties are different.

Corals do not predict a storm weeks before weather instruments can detect it. They respond to conditions in the water, and their skeletons preserve part of that history. Some coral colonies live for centuries, so a core taken carefully from a living colony can extend a climate record far beyond modern thermometers.

Interpreting the record requires calibration. Growth may change with age, depth, light, disease, or local pollution. A chemical signal can also reflect more than one environmental cause. Scientists compare coral evidence with instruments and other records rather than treating a single colony as a perfect archive.

Coral records are especially useful in tropical oceans, where long historical measurements are limited. They help researchers study past climate variation, but they are records of earlier conditions, not biological weather forecasts.`,
  },
  s113: {
    title: "How Instinct and Experience Guide Bird Migration",
    text: `A young migratory bird may begin its first journey without an experienced parent beside it. Experiments and tracking studies show that inherited information can influence direction, timing, and the urge to migrate.

Inheritance is only part of the system. Weather can push a bird away from its route. Landmarks, stars, the Sun, smells, and Earth's magnetic field may provide cues, depending on the species. Social birds can also learn from older travelers.

Scientists study these influences with small tracking tags, orientation experiments, and comparisons among populations. The results do not support a single map stored in one gene. Many genes affect development and behavior, while experience changes how an individual uses available information.

A route can shift between generations when habitats, climate, or social conditions change. That does not mean an instinct literally “skipped” one generation. Nor does a temporary change prove that the population's genes changed. Researchers need long records to separate inherited differences from learning and unusual environmental events.

Migration is therefore a useful example of a layered behavior. Biological tendencies give a bird a starting point, and information gathered during life helps refine the journey. Different species combine those elements in different proportions, which is why scientists avoid one explanation for every migration.`,
  },
  s114: {
    title: "How Cleaner Fish Trade a Service",
    text: `On coral reefs, small cleaner fish remove parasites and dead tissue from larger fish. The larger animals, often called clients, pause at cleaning stations and allow the cleaners to approach their skin, mouths, and gills.

The cleaner gains food, while the client may gain relief from parasites. This makes the interaction a form of mutualism when both partners benefit. Yet the relationship is not perfectly cooperative. A cleaner may prefer to bite protective mucus, and a client may leave or punish a cleaner that cheats.

Researchers use observations and experiments to study how repeated interactions help maintain the exchange. Cleaners can behave differently when other potential clients are watching, and clients may choose among cleaning stations. These findings make the system useful for studying cooperation, choice, and conflict in animals.

The interaction did not suddenly appear in one newly formed reef, and it is not evidence that a predator species abruptly stopped eating its normal prey. Cleaning relationships occur in many marine species and have evolved in different forms.

The most interesting lesson is that cooperation need not remove competition or self-interest. It can remain stable when both participants receive a benefit and can respond when the exchange becomes unfair.`,
  },
  s116: {
    title: "What Scientists Mean by Self-Domestication",
    text: `Domestication often involves people choosing which animals reproduce. Over many generations, that selection can change behavior, body form, and development.

Self-domestication is a different hypothesis. It proposes that natural or social selection can favor lower reactive aggression even without deliberate human breeding. Individuals that tolerate neighbors, or that live successfully near people, may gain access to food, partners, or safer group life.

Researchers have discussed versions of this idea for bonobos, humans, and animals that began living around human settlements. Dogs are sometimes included in the discussion, although their history also contains later intentional breeding. No single species provides a simple model for every other species.

Reduced aggression can be associated with other traits, but the proposed “domestication syndrome” and its developmental causes remain debated. Similar-looking features do not prove that the same genetic process produced them in every case.

The hypothesis is useful because it expands the question beyond human control: could a social environment itself favor animals that react less aggressively? Evidence comes from genetics, fossils, development, and comparisons among living species, and each kind has limits.

Self-domestication should therefore be understood as an active scientific framework, not as proof that a species consciously domesticated itself. Natural selection has no plan; it changes populations when some inherited traits lead to more surviving offspring.`,
  },
  s129: {
    title: "How a Small Biological Change Can Affect a Food Web",
    text: `A food web connects producers, consumers, and predators. Because those connections cross several feeding levels, a change near the base can influence organisms much farther up the web.

Algae, for example, differ in the nutrients and defensive chemicals they contain. A genetic change or a shift in water conditions can alter that chemistry. Small animals that eat the algae may then grow or reproduce differently, changing the food available to fish and larger predators.

An enzyme can be part of such a change because enzymes control chemical reactions inside cells. However, ecologists should not assume that one enzyme has “rewired” an entire regional food chain unless a specific study traces the effect and rules out other causes.

Researchers combine laboratory feeding experiments, genetic analysis, field sampling, and population records to test a proposed chain of effects. Temperature, pollution, competing species, and fishing can produce similar population changes, so evidence from one step is not enough.

The general principle is well supported: traits within a producer can affect the consumers that depend on it. The size and direction of the effect must be measured in each ecosystem. A dramatic cascade is a hypothesis to test, not a conclusion that can be invented from an unnamed mutation.`,
  },
  s132: { title: "The Jellyfish That Can Reverse Its Life Cycle" },
  s146: {
    title: "Black Walnut, Juglone, and Plant Competition",
    text: `Black walnut tissues contain a compound that can become juglone. Laboratory studies show that juglone can slow growth or damage some plants at sufficient concentrations.

This has led to a common claim that a walnut tree poisons every plant around it. Conditions in a garden or forest are more complicated. Soil microbes can break chemicals down, water moves them, and plant species differ in sensitivity. Shade, dry soil, and competition from tree roots can also explain poor growth near a large walnut.

Scientists use the term allelopathy when chemicals released by one plant affect another. Demonstrating allelopathy in the field requires more than finding a potentially toxic compound. Researchers must show that the compound reaches an effective concentration under natural conditions and separate its effect from ordinary competition.

Gardeners may still choose walnut-tolerant plants and avoid placing sensitive crops directly under walnut trees, especially near roots and fallen hulls. That is a practical precaution, not proof that the tree deliberately attacks rivals.

The walnut example shows why a laboratory effect and a field explanation are not always the same. Chemical interactions matter, but soil, climate, microbes, and access to resources also shape which plants can live together.`,
  },
  s171: {
    title: "How Proteins Find a Working Shape",
    text: `A protein begins as a chain of amino acids. To work, that chain usually has to fold into a three-dimensional shape.

There are an enormous number of shapes the chain could take in principle. Yet a protein does not test every possibility one by one. Interactions among its amino acids create an energy landscape that makes some arrangements more likely than others.

Some small proteins fold quickly on their own. Many larger proteins fold through several steps, and cells contain helper proteins called chaperones that can reduce incorrect interactions. Folding time can range from very fast to much slower, depending on the protein and its environment.

Incorrect folding matters in disease. Misfolded proteins may lose their function, form harmful aggregates, or be removed by the cell's quality-control systems. Researchers study these processes to understand conditions including some neurodegenerative diseases.

Computer systems can now predict many protein structures from amino-acid sequences with impressive accuracy. A prediction is still not a complete account of movement, interactions, or function inside a living cell, so experiments remain essential.

Protein folding is remarkable not because a molecule consciously solves trillions of options, but because physical interactions guide it through a structured set of possibilities toward stable working forms.`,
  },
  s187: {
    title: "How Woodpeckers Withstand Repeated Pecking",
    text: `A woodpecker strikes wood with high acceleration, but its head is adapted to make the impact brief and controlled. Its beak, skull, neck muscles, and body posture work together during each strike.

The bird keeps its motion close to a straight line. This limits twisting forces that can be especially damaging to a brain. Its small brain fits closely inside the skull, leaving little room for movement. The small size of the brain also changes how forces act across it.

Older explanations often described spongy bone or the woodpecker's long tongue-supporting hyoid structure as a shock absorber. Those structures have other functions, and current mechanical studies do not support the simple idea of a helmet-like cushion absorbing most of every impact. Too much shock absorption would also make pecking less effective.

Woodpeckers peck in short bursts and use specialized muscles to control the movement. A membrane can cover the eye during a strike, helping protect it from debris.

Scientists still study the limits and long-term effects of repeated pecking. It is safer to say that woodpeckers reduce harmful motion through their size, anatomy, and technique than to claim that they can never suffer brain injury or headaches, which an animal cannot report to us.`,
  },
  s191: { title: "The Bird That Builds a Bower to Attract Mates" },
  s194: { title: "A Giant Fungus Beneath the Forest" },
  s245: {
    title: "How Nearby Bacteria Coordinate Their Behavior",
    text: `Many bacteria release small signaling molecules into their surroundings. Other bacteria can detect those molecules. As a local population grows, the concentration of the signal may rise.

This process is called quorum sensing. When a threshold is reached, cells can change gene activity together. Depending on the species, the coordinated behavior may include making light, producing toxins, exchanging genetic material, or building a biofilm.

The signals do not normally allow one colony to hold a conversation across a continent. They move through a local environment and can be carried or broken down by water, surfaces, and other organisms. Different bacterial species also use different signals, though some forms of communication can cross species boundaries.

Researchers study quorum sensing because group behavior can affect infection and industrial systems. A biofilm, for example, may protect cells from treatment. Drugs that interfere with signals are being investigated, but blocking communication is not yet a universal replacement for antibiotics, and resistance can still evolve.

Bacteria do not need brains to coordinate. Chemical feedback lets each cell respond to evidence that many neighbors are nearby. The result can look like a group decision even though it emerges from local molecular interactions.`,
  },
  s259: {
    title: "How Giraffes Control Blood Pressure",
    text: `A giraffe must pump blood upward through a long neck to reach its brain. It maintains a much higher arterial blood pressure than most mammals of similar size.

Its heart has a thick, powerful left ventricle that generates this pressure. Tight skin and connective tissue in the legs help limit swelling, while specialized blood vessels and valves help manage blood flow.

Lowering the head to drink creates a different problem. Gravity could send too much pressure toward the brain. Changes in vessel resistance, valves in the veins, and a network of small vessels near the brain all contribute to controlling the shift. The giraffe also spreads its front legs and moves its head in a controlled way.

When the animal raises its head, the system must keep enough blood reaching the brain. This regulation is active and dynamic; it is not explained by one valve or by an unusually huge heart alone.

Researchers study giraffe circulation because it shows how the same basic mammalian organs can work under unusual physical demands. The adaptations reduce dangerous changes in blood flow, although scientists cannot ask a giraffe whether it ever feels dizzy. The measurable claim is that its cardiovascular system keeps brain circulation within a workable range as posture changes.`,
  },
  s270: { title: "How Newborn Mice Can Repair Heart Tissue" },
  s312: { text: `A firefly makes light in a special organ in its abdomen. A molecule called luciferin reacts with oxygen in a process helped by an enzyme called luciferase. The reaction produces very little heat compared with a flame or an old electric bulb, so biologists call it cold light.

The insect controls a series of chemical steps that regulate oxygen and the light-producing reaction. This creates patterns of flashes. Different firefly species use different rhythms.

The patterns often help males and females of the same species find one another. A flying male sends one signal, and a female near the ground may answer with another. Females of some species imitate another species' reply and then prey on the males they attract.

Researchers also use luciferase in laboratory tests. Its glow can act as a marker showing that a gene is active, a cell is present, or a chemical reaction has occurred.

A summer flash may look simple, but it combines chemistry, precise biological control, and communication. Most of the reaction's visible output is light rather than damaging heat, allowing a small insect to send a clear signal without burning itself.`, },
  s314: {
    title: "Why a New Language Can Feel More Difficult",
    text: `The difficulty of learning a language depends partly on what a learner already knows. Sounds, word order, grammar, and writing systems that resemble patterns in a first language may be easier to notice and practice.

Distance between languages is not the only factor. Opportunity, motivation, teaching quality, anxiety, time, and regular contact with speakers all influence progress. A language that appears distant can become learnable when practice is meaningful and sustained.

Learners often have trouble hearing a sound contrast that their first language does not use. The brain has become efficient at sorting speech into familiar categories. Training can improve perception, but improvement takes repeated attention.

Age affects some parts of language learning, especially the likelihood of developing a native-like accent. Children often learn implicitly through long exposure. Adults, however, can use literacy, explicit explanation, and study strategies, and they can reach very high proficiency. Adult brains are not fixed.

It is therefore misleading to say that a particular language is inherently hard for a certain kind of brain. The challenge comes from the relationship among the languages, the learner's history, and the learning environment.

Effective teaching anticipates likely contrasts without treating them as permanent limits. It gives learners understandable input, chances to communicate, useful feedback, and enough time for new patterns to become familiar.`,
  },
  s315: {
    title: "Why Yawning Can Be Contagious",
    text: `Seeing, hearing, reading about, or even thinking about a yawn can make another person yawn. Researchers call this contagious yawning, but they have not agreed on one complete explanation.

One proposal links it to social attention or empathy. Some studies have reported relationships between contagious yawning and closeness or measures of empathy. Other studies have not reproduced those results consistently. A correlation also cannot show that empathy directly causes the response.

Another line of research points to the excitability and inhibition of brain areas involved in movement. General attention, tiredness, age, and the strength of the yawn signal may also influence whether a person responds.

Reports of contagious yawning in other animals are interesting but difficult to compare. An animal may yawn because it is stressed, tired, or simply responding to activity nearby. Researchers need controlled experiments before calling the behavior social copying.

Contagious yawning is therefore not a reliable test of how empathetic a person is. Failing to yawn says little about someone's feelings or character.

The phenomenon remains useful to science because it connects perception with an involuntary-looking action. Its familiarity should not hide the uncertainty: several mechanisms may contribute, and the relative importance of each one is still being studied.`,
  },
  s316: {
    title: "Why Old Books Have a Distinctive Smell",
    text: `Old paper and binding materials slowly change through reactions with oxygen, moisture, light, and heat. As cellulose, lignin, adhesives, and inks break down, they release small airborne molecules called volatile organic compounds.

Some of these compounds have sweet, grassy, almond-like, or musty odors. Vanillin may contribute a vanilla-like note in materials that contain lignin. The exact mixture differs with the paper, ink, glue, leather, storage history, and surrounding air.

Conservators can sample these gases without removing a large piece from a book. Chemical analysis may reveal patterns related to degradation and help them judge whether storage conditions are damaging a collection.

An odor profile alone cannot reliably identify the exact age or geographic origin of every book. Different materials can produce similar compounds, and later repairs or storage can change the mixture. Researchers combine chemical results with paper analysis, printing evidence, records, and visual examination.

The smell many readers enjoy is therefore also evidence of slow chemical change. Libraries reduce heat, strong light, excess moisture, and pollutants to slow that process. They do not try to stop every molecule from moving, but they can create conditions that preserve paper for much longer.`,
  },
  s318: {
    title: "Why Some People Are Exceptional at Recognizing Faces",
    text: `People vary widely in their ability to recognize faces. At one end are people with developmental prosopagnosia, often called face blindness. At the other are “super-recognizers,” who perform unusually well on demanding face-matching and face-memory tests.

The ability is partly specialized. Someone may remember faces extremely well without having an extraordinary memory for words or objects. Researchers use several tests because success on one short task is not enough to identify a super-recognizer reliably.

Face recognition involves a network of brain regions, including areas in the temporal and occipital lobes. Brain-imaging studies examine how this network differs among people, but there is not yet one simple neural signature that explains every exceptional recognizer.

Some police and security organizations use trained super-recognizers to review images. Their performance can be valuable, but it is not infallible. Poor image quality, changes in age or appearance, and bias can still produce mistakes. Important identifications require procedures that test and document accuracy rather than trusting a label.

Studying both exceptional recognition and face blindness helps scientists understand the processes used to detect, compare, and remember faces. It also shows why a strong human ability should support careful evidence, not replace it.`,
  },
  s505: { text: `This example is made up. It shows a choice a real town may face.

A restaurant gives free food.

Hungry people can eat there.

The food is warm.

People say thank you.

The owner is happy to help.

All the people eat together.` },
  s663: {
    title: "Why Yawning May Be Contagious",
    text: `Seeing another person yawn can make us feel an urge to yawn. This is called contagious yawning.

Scientists do not yet agree on one cause. Attention and tiredness may affect the response. So may the way the brain prepares and controls movement.

Some studies have linked contagious yawning with empathy or close relationships. Other studies have not found the same pattern. This means that a yawn is not a test of whether someone is kind or understands other people.

Researchers have also studied yawning in animals. These studies are difficult because an animal may yawn from stress, sleepiness, or another cause. Simply yawning near another animal does not prove social copying.

The safest conclusion is that contagious yawning is real for many people, but its explanation remains open. Several body and social processes may work together.

An ordinary action can therefore raise a useful scientific question. Researchers must separate what they can observe—the timing of a yawn—from ideas about a person's thoughts or feelings that the action alone cannot prove.`,
  },
};

const historicalDisclaimer = (level) => level <= 2
  ? "This story is made up. It is not about a real person or event.\n\n"
  : level <= 4
    ? "This is a made-up story set in the past. It does not describe a real person or event.\n\n"
    : "This is a fictional story set in an unspecified period of the past; it is not a record of a documented person or event.\n\n";
const policyDisclaimer = (level) => level <= 2
  ? "This example is made up. It shows a choice a real town may face.\n\n"
  : level <= 4
    ? "This is a made-up policy example based on choices real communities may face.\n\n"
    : "This is a fictional policy scenario based on choices that real communities may face.\n\n";
const factualWorldAffairs = new Set(["s015", "s021", "s091", "s118", "s119", "s154", "s613", "s614"]);

let revised = 0;
let historyClarified = 0;
let policyClarified = 0;
for (const story of stories) {
  const number = Number(story.id.slice(1));
  const revision = revisions[story.id];
  if (revision) {
    if (revision.title) story.title = revision.title;
    if (revision.text) story.text = revision.text;
    revised += 1;
  }

  if (number <= 1710 && story.topic === "History" && number < 695) {
    story.text = story.text.replace(/^(?:This story is made up\. It is not about a real person or event\.|This is a made-up story set in the past\. It does not describe a real person or event\.|This is a fictional story set in an unspecified period of the past; it is not a record of a documented person or event\.)\n\n/, "");
    story.text = historicalDisclaimer(story.level) + story.text;
    historyClarified += 1;
  }

  if (number <= 1710 && story.topic === "World affairs" && number < 695 && !factualWorldAffairs.has(story.id) && !/\bhypothetical\b/i.test(story.text)) {
    story.text = story.text.replace(/^(?:This example is made up\. It shows a choice a real town may face\.|This is a made-up policy example based on choices real communities may face\.|This is a fictional policy scenario based on choices that real communities may face\.)\n\n/, "");
    story.text = policyDisclaimer(story.level) + story.text;
    policyClarified += 1;
  }

  if (number <= 1710) {
    story.factChecked = true;
    story.reviewedAt = "2026-09-14";
  }

  story.wordCount = story.text.trim().split(/\s+/).filter(Boolean).length;
}

fs.writeFileSync(storiesPath, JSON.stringify(stories, null, 2) + "\n");
console.log(JSON.stringify({ revised, historyClarified, policyClarified, factChecked: stories.filter((s) => s.factChecked).length }, null, 2));
