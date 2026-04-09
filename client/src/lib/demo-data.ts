import type { DetectedScene, SceneProfile } from "@shared/schema";

export const DEMO_SCENES: DetectedScene[] = [
  {
    sceneName: "The Derelict Ship Discovery",
    sceneNumber: "1",
    location: "EXT./INT. DERELICT STARSHIP — OUTER RIM SECTOR 7",
    timeOfDay: "CONTINUOUS (DEEP SPACE)",
    charactersPresentList: "Captain Aria Voss, Engineer Kael Danton, Science Officer Dr. Lin Zhao",
    briefSummary: "The crew of the salvage vessel Perihelion discovers an ancient derelict starship adrift in a debris field. Initial scans reveal the ship is 800 years old but still has active power signatures. Aria orders a boarding party despite Kael's reservations.",
    estimatedLength: "medium",
  },
  {
    sceneName: "Boarding the Wreck",
    sceneNumber: "2",
    location: "INT. DERELICT STARSHIP — MAIN CORRIDOR",
    timeOfDay: "CONTINUOUS",
    charactersPresentList: "Captain Aria Voss, Engineer Kael Danton, Marine Sgt. Torres",
    briefSummary: "The boarding party enters the derelict through a breached airlock. Emergency lighting flickers, revealing alien script on the walls and evidence of a violent struggle. Torres's motion tracker picks up faint readings deeper in the ship.",
    estimatedLength: "long",
  },
  {
    sceneName: "The Bridge Revelation",
    sceneNumber: "3",
    location: "INT. DERELICT STARSHIP — BRIDGE",
    timeOfDay: "CONTINUOUS",
    charactersPresentList: "Captain Aria Voss, Dr. Lin Zhao",
    briefSummary: "Aria and Dr. Zhao reach the bridge and access the ship's log. They discover the derelict was a colony ship carrying 10,000 people. The logs reveal the crew encountered something in the void that changed them — then the logs abruptly stop.",
    estimatedLength: "medium",
  },
  {
    sceneName: "Engineering Encounter",
    sceneNumber: "4",
    location: "INT. DERELICT STARSHIP — ENGINEERING DECK",
    timeOfDay: "CONTINUOUS",
    charactersPresentList: "Engineer Kael Danton, Marine Sgt. Torres",
    briefSummary: "Kael investigates the still-active power core and realizes it's running on technology far beyond anything known. Torres hears sounds from behind sealed bulkheads. When Kael opens a panel, they find organic material fused with the ship's systems.",
    estimatedLength: "medium",
  },
  {
    sceneName: "The Cryovault",
    sceneNumber: "5",
    location: "INT. DERELICT STARSHIP — LOWER DECK CRYOVAULT",
    timeOfDay: "CONTINUOUS",
    charactersPresentList: "Captain Aria Voss, Dr. Lin Zhao, Engineer Kael Danton",
    briefSummary: "The team discovers a massive chamber filled with thousands of cryopods. Most are dark and empty, but 47 pods still show green status lights. Dr. Zhao confirms the occupants are alive — but their biosignatures have been fundamentally altered.",
    estimatedLength: "long",
  },
  {
    sceneName: "Distress Signal",
    sceneNumber: "6",
    location: "INT. PERIHELION — COMMUNICATIONS BAY",
    timeOfDay: "NIGHT (SHIP TIME)",
    charactersPresentList: "Captain Aria Voss, Comms Officer Reyes",
    briefSummary: "Back aboard the Perihelion, Aria discovers the derelict has begun broadcasting a distress signal — but it started AFTER they boarded. Reyes traces the signal and realizes it's not calling for help. It's calling something to come.",
    estimatedLength: "short",
  },
  {
    sceneName: "The Awakening",
    sceneNumber: "7",
    location: "INT. DERELICT STARSHIP — CRYOVAULT",
    timeOfDay: "CONTINUOUS",
    charactersPresentList: "Dr. Lin Zhao, Marine Sgt. Torres",
    briefSummary: "One of the 47 cryopods opens. The figure inside is human — but wrong. Its skin has a pearlescent sheen, and it speaks in a language that somehow translates directly into the listener's thoughts. It says: 'You shouldn't have come back for us. They know you're here now.'",
    estimatedLength: "medium",
  },
  {
    sceneName: "Race Against the Signal",
    sceneNumber: "8",
    location: "INT. PERIHELION — BRIDGE / EXT. SPACE",
    timeOfDay: "NIGHT (SHIP TIME)",
    charactersPresentList: "Captain Aria Voss, Engineer Kael Danton, Dr. Lin Zhao, Full Crew",
    briefSummary: "Aria must decide: destroy the derelict and its signal, rescue the 47 altered survivors, or flee before whatever was summoned arrives. Long-range sensors detect something massive approaching. The crew has minutes to choose.",
    estimatedLength: "long",
  },
];

export const DEMO_PROFILE: SceneProfile = {
  // Section 1 - Scene Identity
  sceneName: "Boarding the Wreck",
  sceneNumber: "2",
  logline: "A salvage boarding party enters an 800-year-old derelict starship and discovers evidence of both alien origin and violent catastrophe, setting the stage for mounting dread.",
  location: "INT. DERELICT STARSHIP — MAIN CORRIDOR. A vast, dimly lit passage with vaulted ceilings covered in alien script. Debris floats in partial gravity. Emergency strip lighting casts amber pools between long stretches of darkness.",
  timeOfDay: "CONTINUOUS — deep space, no natural light. The only illumination comes from the boarding party's helmet lights and the ship's failing emergency systems.",
  durationEstimate: "4-5 minutes screen time (approximately 4.5 script pages)",
  sceneType: "Exploration / Tension Build — this is a classic 'haunted house' entry scene designed to establish atmosphere and raise questions",

  // Section 2 - Dramatic Purpose
  narrativePurpose: "Transitions the story from external discovery (space) to intimate horror (inside the ship). Establishes the derelict as a character in itself — the environment becomes an antagonist. Seeds multiple mysteries that will pay off in later scenes.",
  audienceLearns: "The derelict is alien in origin (or heavily modified), something violent happened aboard, and the ship is not entirely dead — systems are still active, suggesting either automated processes or something maintaining them.",
  emotionalArc: "Moves from controlled professional curiosity → unease → dread. Starts with the team's competent military procedure and gradually undermines it with increasingly wrong details.",
  connectionToPreviousScene: "Follows directly from Scene 1's decision to board. The airlock breach mentioned in scans becomes the literal entry point. Aria's confident order to board is immediately tested by what they find inside.",
  connectionToNextScene: "Torres's motion tracker readings create the pull toward Scene 3 (Bridge) and Scene 4 (Engineering), splitting the party — a classic horror structure that increases vulnerability.",

  // Section 3 - Characters Present
  charactersAndObjectives: "Captain Aria Voss: wants to assess salvage value and potential dangers, maintain command authority. Engineer Kael Danton: wants to evaluate the ship's technology, privately hoping for a find that could make them rich. Marine Sgt. Torres: wants to secure the area and protect the team, trusts his training over everything else.",
  emotionalStateEntering: "Aria: controlled excitement masked by professional calm. Kael: nervous but intellectually thrilled — his engineer's curiosity is overriding his survival instincts. Torres: heightened alertness, default combat readiness — he treats every unknown environment as hostile.",
  emotionalStateExiting: "Aria: deeply unsettled but hiding it, beginning to question the boarding decision. Kael: terrified by what the alien script implies about the ship's builders. Torres: on full combat alert, motion tracker giving readings he can't explain.",
  powerDynamics: "Aria holds command authority but Torres controls physical safety — tension between 'we should investigate' and 'we should pull back.' Kael occupies middle ground, alternately supporting each based on what catches his attention.",
  keyRelationshipBeats: "Torres challenges Aria's decision to proceed deeper (first open conflict between military caution and command ambition). Kael's excitement about the alien technology briefly breaks Torres's discipline, revealing their grudging mutual respect.",

  // Section 4 - Dialogue & Subtext
  keyDialogueBeats: "Torres: 'Captain, my tracker's showing movement — intermittent, bearing two-seven-zero.' Aria: 'Structural settling. This ship's been dead 800 years.' Torres: 'Dead things don't have active power cores, ma'am.' — The key exchange that establishes the central tension.",
  saidVsMeant: "When Aria says 'Let's take it slow,' she means 'I'm not turning back but I'm scared.' When Kael says 'This is incredible,' he means 'This is worth dying for.' Torres's clipped responses mean 'We're already in too deep.'",
  significantSilences: "After Kael translates a fragment of the alien script that references 'the passengers who refused to sleep,' all three characters fall silent for a five-count beat — the first time the audience feels genuine dread.",
  verbalConflictPoints: "Torres formally requests permission to abort the mission (denied). Kael argues with Aria about taking samples versus pressing forward. Torres and Kael snap at each other about noise discipline.",
  dialogueTone: "Military-professional radio protocol gradually breaking down into more personal, informal speech as stress increases. Kael's technical jargon becomes a coping mechanism.",

  // Section 5 - Action & Blocking
  physicalMovement: "Linear progression down the main corridor, team moving in tactical formation (Torres point, Aria center, Kael rear). Movement slows as they encounter debris, alien script, and evidence of violence. Gravity is partial — debris drifts, adding to disorientation.",
  stagingPositions: "Triangle formation maintained for first third, then naturally clusters tighter as corridor narrows. Key moment: Torres stops, holds fist up (military 'halt'), forcing Aria and Kael to compress behind him in a claustrophobic grouping.",
  keyGestures: "Kael running his hand along the alien script on the wall (wonder). Torres's hand moving to his sidearm holster (threat). Aria touching the wall where scratch marks suggest someone was dragged (horror).",
  choreographyNotes: "Zero-G debris field near the airlock entrance requires wire work or careful VFX. Partial gravity should feel 'lunar' — not floating, but lighter than normal. Characters' movements should reflect military training (Torres) versus civilian comfort (Kael).",
  entrancesExits: "Enter through breached airlock (practical set piece with atmospheric decompression effects). Exit via branching corridor — Torres and Kael go starboard (Engineering), Aria and Zhao go port (Bridge). The split should feel reluctant, like the team knows it's a bad idea.",

  // Section 6 - Shot List
  shotListDetailed: "Shot 1: WIDE — Steadicam following team through airlock breach. 24mm lens. Team silhouetted against helmet lights cutting through atmospheric haze. 15 seconds. Establishes scale and isolation.\n\nShot 2: MEDIUM — Static shot of Torres checking his motion tracker. 50mm lens. Green glow of the device illuminates his face from below. 4 seconds. Introduces the tracking device as story tool.\n\nShot 3: WIDE PAN — Slow horizontal pan revealing the length of the main corridor with emergency lighting. 35mm lens. Reveals scale — corridor stretches into darkness. 8 seconds. Environmental establishing.\n\nShot 4: CU — Kael's gloved hand touching alien script on the wall. 85mm macro lens. Script seems to shift slightly under the light. 5 seconds. First alien detail.\n\nShot 5: OTS — Over Torres's shoulder as he scans ahead. 40mm lens. Shallow DOF, focus rack from Torres to the darkness ahead. 6 seconds. POV tension.\n\nShot 6: INSERT — Close-up of scratch marks on the floor/wall. 100mm macro. Helmet light sweeps across them revealing depth — these were clawed into metal. 4 seconds. Violence evidence.\n\nShot 7: MEDIUM TWO-SHOT — Aria and Torres in heated whispered exchange. 50mm lens. Split lighting — half in amber emergency light, half in shadow. 12 seconds. Command conflict.\n\nShot 8: WIDE — Dolly back as team enters a larger junction. 24mm lens. Reveals branching corridors and floating debris. 8 seconds. Decision point.\n\nShot 9: CU — Aria's face as she processes the alien script translation. 85mm lens. Tight on eyes. The reflection of the alien writing visible in her visor. 6 seconds. Emotional pivot.\n\nShot 10: WIDE OVERHEAD — Crane/drone shot looking down the corridor as the team splits into two groups. 20mm lens. Visual metaphor for vulnerability. 10 seconds. Act break.\n\nShot 11: INSERT — Torres's motion tracker showing multiple intermittent contacts. 100mm. Green phosphor display fills frame. 3 seconds. Threat escalation.\n\nShot 12: MEDIUM — Static shot watching the two groups walk in opposite directions. 35mm lens. Long hold as they disappear into separate pools of darkness. 8 seconds. Isolation and dread.",

  // Section 7 - Lighting & Atmosphere
  lightingSetup: "Primary: failing amber emergency strip lighting (practicals) running along ceiling tracks — they flicker and pulse irregularly. Secondary: cool white/blue helmet-mounted lights creating moving pools of illumination. Fill: minimal — embrace deep shadows. Negative fill on face sides opposite helmet lights.",
  colorTemperature: "Dual temperature design. Warm amber 2700K from emergency strips creates a sickly, decayed warmth. Cool 5600K+ from helmet lights cuts through with clinical precision. The contrast between warm/cool creates visual unease.",
  mood: "Oppressive dread. The lighting should feel like the ship itself is watching them — pools of visibility surrounded by impenetrable darkness. Every shadow could contain something. The amber emergency lights suggest a ship that's trying to help but failing.",
  timeOfDayEffects: "N/A — deep space setting. However, the emergency lighting system could cycle through states (bright → dim → bright) suggesting the ship's power fluctuations, creating pseudo 'time' through lighting changes.",
  shadowsContrast: "High contrast ratio (8:1 minimum). Deep blacks with sharp falloff from light sources. Volumetric haze/particulates in the air catch light beams, creating visible light shafts. Characters should have hard shadow edges on walls as they pass lights.",
  practicalLights: "Emergency strip lights (ceiling-mounted, amber). Kael's diagnostic tablet screen (blue-white glow). Torres's motion tracker (green phosphor). Helmet-mounted floods (white, adjustable). Status panels along corridor walls (red/amber indicators).",

  // Section 8 - Sound Design
  ambientSound: "Multi-layered: deep structural groaning of the hull (LF rumble), distant mechanical clicking (mid-range, irregular), air cycling through damaged ventilation (white noise with periodic surges). All processed to feel 'vast' — reverb suggesting enormous empty spaces beyond the corridor.",
  dialogueRecordingNotes: "Record through helmet comm processing (slight radio quality). Production sound with lavs for close-ups, boom for wider shots. ADR will be needed for several lines due to helmet muffling. Consider recording wild tracks of breathing in suits.",
  soundEffects: "Magnetic boot contacts on metal deck (rhythmic, mechanical). Debris collisions (gentle floating impacts). Airlock seal engagement. Motion tracker chirps (iconic, rhythmic). Alien script illumination (subtle harmonic resonance when helmet lights hit it). Distant impacts from deeper in the ship.",
  musicCues: "Score enters subtly at the airlock breach — low sustained strings with sub-bass pulse. Builds with dissonant upper harmonics as they proceed. Music DROPS OUT completely for the silence beat after the alien script translation. Returns with a single piano note when Aria makes the decision to split the party.",
  silenceBeats: "Critical silence at 0:03:15 — after script translation, ALL sound (ambient, music, effects) cuts for 3 seconds before Torres's tracker chirps break it. Second silence at the corridor split — holds for 2 seconds before footsteps diverge.",
  diegeticVsNondiegetic: "Heavily weighted toward diegetic. All mechanical sounds are in-world. Score is non-diegetic but should feel like it could be the ship 'singing.' The alien harmonic resonance when light hits the script blurs the line intentionally.",

  // Section 9 - VFX & Technical
  practicalEffects: "Atmospheric haze (machine-generated fog). Practical emergency lighting rigs. Physical debris on wires for floating effect. Scratch/claw mark prosthetics on walls. Alien script — practical applied graphics with VFX enhancement.",
  cgiRequirements: "Partial gravity simulation (wire removal, debris float). Helmet HUD overlays (motion tracker display, comm indicators). Alien script illumination effect (reactive to light). Deep corridor extension (set extension for infinite length). Exterior void visible through hull breaches.",
  greenScreenNeeds: "Hull breach windows showing exterior space/debris field. Corridor terminus for CG extension. Helmet visor reflections may need CG augmentation for script reflection shots.",
  propsSpecialHandling: "Motion tracker device (hero prop, needs working screen insert). Kael's diagnostic tablet (screen replacement). Helmets with working light rigs (battery-powered, adjustable). Magnetic boot sound plates (metal deck sections for Foley).",
  safetyConsiderations: "Wire work for floating/partial gravity sequences. Atmospheric haze requires adequate ventilation and monitoring. Low-light conditions require illuminated safety paths off-camera. Helmet visibility restrictions require spotters for actors during movement.",

  // Section 10 - Emotional & Thematic
  underlyingTension: "The fundamental question: is the ship dead or alive? Every detail encountered adds to the ambiguity — the active power, the alien script, the motion readings. The team is professionally trained for salvage, not first contact, and they know they're out of their depth.",
  thematicResonance: "Explores the human drive to understand the unknown versus the wisdom of leaving it alone. Aria's decision to press forward despite warning signs mirrors humanity's historical pattern of exploration-as-colonization. The alien ship becomes a mirror — we see our own ambitions reflected in its corridors.",
  foreshadowing: "The scratch marks foreshadow the violence in the cryovault (Scene 5). Torres's motion tracker readings foreshadow the Awakening (Scene 7). The alien script's reference to 'passengers who refused to sleep' foreshadows the altered survivors. The ship's active power core foreshadows its ability to broadcast the distress signal (Scene 6).",
  callbacks: "Aria's boarding order from Scene 1 is directly tested here. Kael's stated belief that 'any ship can be understood' from Scene 1 is challenged by alien technology. The Perihelion's 'safe and reliable' reputation is contrasted with this ancient, dangerous vessel.",
  symbolicElements: "The corridor as birth canal — entering the unknown. Light versus dark as knowledge versus ignorance. The alien script as language barrier — communication attempted but imperfect. The team's tactical formation as civilization's fragile order imposed on chaos.",
  directorNotes: "This scene is the audience's first real experience of dread — pace it carefully. Don't rush the discovery beats. Let the actors react to the environment physically — touch things, look around, breathe. The corridor should feel endless. Consider using longer takes (20-30 seconds) to build real-time tension rather than cutting for pace. The team split at the end should feel like a mistake the audience can see coming but the characters can't avoid.",

  // Visual Study Prompts (legacy fixed panels)
  visualMasterShot: "A wide cinematic establishing shot of a dark derelict starship corridor stretching into darkness. Three figures in futuristic EVA suits with helmet lights cutting through atmospheric haze and floating debris. Amber emergency strip lighting on the ceiling creates pools of sickly warm light between stretches of deep shadow. Alien script visible on vaulted walls. The scale is overwhelming — the corridor dwarfs the human figures. Widescreen 2.39:1 composition. The mood is oppressive dread and isolation.",
  visualDramaticMoment: "A tense medium close-up of Captain Aria Voss in her EVA suit helmet, her face half-lit by amber emergency light and half in deep shadow. Through her visor glass, alien script is faintly reflected. Her expression is a mix of determination and dawning fear. Behind her, out of focus, the corridor stretches into darkness with a single emergency light flickering. Cinematic lighting, shallow depth of field, film grain.",
  visualCharacterCoverage: "An over-the-shoulder shot from behind Marine Sgt. Torres as he faces Captain Aria Voss in a narrow section of the derelict corridor. Torres's hand rests on his holstered sidearm. Aria's helmet light illuminates both their faces in harsh white light. The ambient amber emergency glow creates a warm halo around them. Their body language shows conflict — Torres rigid and defensive, Aria leaning forward assertively. Engineer Kael visible in the background examining the wall.",
  visualDetailInsert: "An extreme close-up of deep scratch marks gouged into the metal wall of a derelict starship corridor. A helmet-mounted flashlight beam sweeps across the marks, revealing their depth — something clawed desperately into hardened alloy. The scratches are aged but preserved in the vacuum. Tiny floating dust particles catch the light beam. The metal shows stress fractures around the deepest gouges. Macro photography aesthetic, cinematic lighting.",
  visualLightingStudy: "An atmospheric lighting study of the derelict starship corridor showing the dual-temperature light design. Warm amber emergency strip lights run along the ceiling in broken intervals, creating pools of sickly golden light. Cool white helmet-mounted floods cut through volumetric haze, creating visible light shafts with hard shadows. Deep impenetrable darkness fills the spaces between. Floating debris catches both light temperatures. The overall mood is beautiful but deeply unsettling — a cathedral of dread.",

  // Dynamic per-shot visual prompts — matches the 12 shots in shotListDetailed
  visualShotPrompts: JSON.stringify([
    {
      shotNumber: 1,
      label: "WIDE — Airlock entry",
      sublabel: "Shot #1",
      prompt: "A wide cinematic Steadicam shot following three figures in futuristic EVA suits as they step through a breached airlock into a vast derelict starship corridor. 24mm lens perspective. The team is silhouetted against their helmet lights cutting through thick atmospheric haze and floating debris particles. Amber emergency strip lighting on the vaulted ceiling casts pools of sickly warm light. Alien script is faintly visible on the walls. The scale is overwhelming — the corridor dwarfs the human figures. Widescreen 2.39:1 composition. The mood is oppressive dread and isolation in deep space."
    },
    {
      shotNumber: 2,
      label: "MEDIUM — Torres motion tracker",
      sublabel: "Shot #2",
      prompt: "A static medium shot of Marine Sgt. Torres in a tactical EVA suit checking a handheld motion tracker device inside a dark derelict starship corridor. 50mm lens. The green phosphor glow of the tracker display illuminates his face from below, casting eerie upward shadows across his helmet visor. His expression is focused and alert. Behind him, the corridor fades into darkness with faint amber emergency lighting. The device's screen shows intermittent blips. Cinematic lighting, film grain, sci-fi military aesthetic."
    },
    {
      shotNumber: 3,
      label: "WIDE PAN — Corridor reveal",
      sublabel: "Shot #3",
      prompt: "A slow horizontal panning wide shot revealing the immense length of a derelict starship main corridor. 35mm lens. Failing amber emergency strip lights run along the ceiling in broken intervals, creating pools of golden light between vast stretches of impenetrable darkness. The corridor stretches endlessly into shadow. Floating debris particles catch the light. Alien script etched into the vaulted walls reflects helmet light beams. Volumetric haze fills the air. The scale is cathedral-like. Cinematic widescreen, environmental establishing shot, oppressive atmosphere."
    },
    {
      shotNumber: 4,
      label: "CU — Alien script on wall",
      sublabel: "Shot #4",
      prompt: "An extreme close-up of a gloved hand in a futuristic EVA suit gently touching alien script carved into the metal wall of a derelict starship. 85mm macro lens perspective. The script appears to shimmer and shift slightly under the moving helmet light beam. The alien characters are intricate, geometric, and unsettling — clearly not human in origin. The glove's textured surface contrasts with the smooth, ancient metal. Floating dust motes catch the light. Shallow depth of field, cinematic macro photography, mysterious sci-fi aesthetic."
    },
    {
      shotNumber: 5,
      label: "OTS — Torres scanning ahead",
      sublabel: "Shot #5",
      prompt: "An over-the-shoulder shot from behind Marine Sgt. Torres in tactical EVA gear as he scans the dark corridor ahead. 40mm lens with shallow depth of field. Focus racks from Torres's armored shoulder and helmet in the foreground to the deep impenetrable darkness stretching ahead. His helmet light cuts a cone of white light through atmospheric haze. The corridor walls show alien script and damage. The amber emergency lighting creates warm pools in the distance. Tension and dread, cinematic POV composition."
    },
    {
      shotNumber: 6,
      label: "INSERT — Scratch marks",
      sublabel: "Shot #6",
      prompt: "An extreme close-up insert shot of deep scratch marks gouged into the metal wall of a derelict starship corridor. 100mm macro lens. A helmet-mounted flashlight beam sweeps across the marks, revealing terrifying depth — something clawed desperately into hardened alloy with inhuman strength. The scratches are aged but perfectly preserved in the vacuum of space. Tiny floating dust particles catch the light beam. The metal shows stress fractures and deformation around the deepest gouges. Macro photography aesthetic, cinematic lighting, evidence of violence and horror."
    },
    {
      shotNumber: 7,
      label: "MED TWO-SHOT — Aria & Torres conflict",
      sublabel: "Shot #7",
      prompt: "A medium two-shot of Captain Aria Voss and Marine Sgt. Torres in a heated whispered exchange inside a derelict starship corridor. 50mm lens. Split lighting — half of their faces lit by warm amber emergency light, the other half in deep shadow. Aria leans forward assertively, her body language commanding. Torres stands rigid and defensive, hand near his holstered sidearm. Their helmet lights create harsh white highlights. The narrow corridor compresses the space between them. Tension is palpable. Cinematic dramatic composition, conflict and authority."
    },
    {
      shotNumber: 8,
      label: "WIDE — Junction reveal",
      sublabel: "Shot #8",
      prompt: "A wide dolly-back shot as three figures in EVA suits enter a larger junction chamber inside a derelict starship. 24mm lens. The camera pulls back to reveal branching corridors splitting off in multiple directions. Floating debris drifts in partial gravity — metal fragments, crystallized particles, remnants of the ship's past. Emergency lighting glows amber from multiple corridor entrances. The junction feels like a crossroads — a decision point. The scale dwarfs the team. Volumetric haze catches intersecting light beams. Cinematic widescreen, sci-fi exploration, mounting dread."
    },
    {
      shotNumber: 9,
      label: "CU — Aria's visor reaction",
      sublabel: "Shot #9",
      prompt: "A tight close-up of Captain Aria Voss's face through her EVA helmet visor as she processes a disturbing alien script translation. 85mm lens, extremely tight on her eyes. Her expression shifts from concentration to dawning horror. The reflection of glowing alien writing is visible in the curved glass of her visor. Behind her, out of focus, the corridor stretches into darkness. Warm amber light from one side, cool helmet light from the other creates dramatic split lighting. Shallow depth of field, cinematic emotional pivot, film grain."
    },
    {
      shotNumber: 10,
      label: "WIDE OVERHEAD — Team splits",
      sublabel: "Shot #10",
      prompt: "A dramatic overhead crane shot looking straight down a derelict starship corridor as the team of EVA-suited figures splits into two groups heading in opposite directions. 20mm wide lens. The two groups walk away from the junction point toward separate pools of amber emergency light, leaving darkness between them. The overhead angle makes them look small and vulnerable — a visual metaphor for the danger of separation. Alien script visible on the floor. Floating debris. Cinematic widescreen, act break composition, isolation and vulnerability."
    },
    {
      shotNumber: 11,
      label: "INSERT — Tracker contacts",
      sublabel: "Shot #11",
      prompt: "An extreme close-up insert of a military motion tracker display filling the frame. 100mm lens. The green phosphor screen shows multiple intermittent contacts — blips appearing and disappearing at various ranges. The device's worn metal casing frames the glowing display. Torres's gloved thumb is visible on the edge of the device. The green light reflects off nearby surfaces. The contacts suggest something is moving in the ship — multiple somethings. Macro photography, sci-fi military tech, threat escalation, tension."
    },
    {
      shotNumber: 12,
      label: "MEDIUM — Groups diverge",
      sublabel: "Shot #12",
      prompt: "A static medium shot watching two groups of EVA-suited figures walk in opposite directions down branching corridors of a derelict starship. 35mm lens. Long hold composition. The figures gradually disappear into separate pools of darkness, their helmet lights shrinking to distant pinpoints. Amber emergency lighting creates isolated warm patches. The empty space in the center of frame grows as they separate. Floating debris drifts slowly. The mood is isolation, dread, and the terrible certainty of a mistake being made. Cinematic widescreen, horror atmosphere."
    }
  ]),
};
