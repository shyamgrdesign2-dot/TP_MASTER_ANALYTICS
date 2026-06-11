const buildRange = (start, end, step, decimals = 0) => {
  const values = [];
  const increment = Math.abs(step);
  const direction = step >= 0 ? 1 : -1;
  const precision = Math.round(1 / increment);
  const totalSteps = Math.round(Math.abs(end - start) * precision);
  for (let i = 0; i <= totalSteps; i += 1) {
    const value = start + direction * (i / precision);
    values.push(value.toFixed(decimals));
  }
  return values;
};

const buildSignedRange = (start, end, step, decimals = 2) => {
  return buildRange(start, end, step, decimals).map((value) => {
    const numeric = Number(value);
    if (numeric > 0) {
      return `+${value}`;
    }
    if (numeric === 0) {
      return `+${value}`;
    }
    return value;
  });
};

const withUnit = (values, unit) => values.map((value) => `${value} ${unit}`);

const snellenOptions = [
  "6/6",
  "6/9",
  "6/12",
  "6/18",
  "6/24",
  "6/36",
  "6/60",
  "Counting Fingers",
  "Hand Motion",
  "Perception of Light",
  "No Perception of Light",
];

const logMarOptions = buildRange(0.0, 1.2, 0.1, 1);
const decimalOptions = buildRange(1.0, 0.1, -0.1, 1);
const snellenNearOptionsForNear = [
  "N5",
  "N6",
  "N8",
  "N10",
  "N12",
  "N14",
  "N18",
  "N24",
  "Unable to read near"
];
const jaegerOptions = [
  "J1",
  "J2",
  "J3",
  "J4",
  "J5",
  "J6",
  "J7",
  "J8",
  "J9",
  "J10",
  "J11",
  "J12",
  "J13",
  "J14",
  "J15",
  "J16",
  "J17",
  "J18",
  "J19",
  "J20",
];

const tumblingOptions = ["Up", "Down", "Left", "Right", "Not Identified"];

const sphereOptions = buildSignedRange(-20, 20, 0.25, 2);
const cylinderOptions = buildSignedRange(-6, 6, 0.25, 2);
const axisOptions = buildRange(0, 180, 1, 0);
const additionOptions = buildSignedRange(0.75, 3.5, 0.25, 2);
const prismOptions = buildRange(0.25, 5.0, 0.25, 2);
const pupillaryDistanceOptions = withUnit(buildRange(20, 80, 1, 0), "mm");

const iopOptions = withUnit(buildRange(5, 50, 1, 0), "mmHg");

const keratometryOptions = buildRange(35, 48, 0.01, 2);
const keratometryAxisOptions = buildRange(0, 180, 1, 0);

const cdrOptions = buildRange(0.1, 0.9, 0.1, 1);

export const OPHTHALMOLOGY_OPTIONS = {
  snellenOptions,
  logMarOptions,
  decimalOptions,
  snellenNearOptionsForNear,
  jaegerOptions,
  tumblingOptions,
  sphereOptions,
  cylinderOptions,
  axisOptions,
  additionOptions,
  prismOptions,
  pupillaryDistanceOptions,
  iopOptions,
  keratometryOptions,
  keratometryAxisOptions,
  cdrOptions,
  visualAcuityTestTypes: [
    "Snellen",
    "LogMAR",
    "Decimal",
    "Jaeger",
    "Tumbling E",
    "Landolt C",
  ],
  correctionUsedOptions: [
    "Without Glasses",
    "With Glasses",
    "With Contact Lens",
    "With Pinhole",
  ],
  visionTypeOptions: ["Distance Vision", "Near Vision"],
  iopTestTypes: [
    "Non-contact Tonometry (Air Puff)",
    "Goldmann Applanation",
    "Schiotz Tonometry",
    "iCare Tonometry",
    "Tonopen",
  ],
  measurementTimeOptions: ["Morning", "Afternoon", "Evening", "Night"],
  readingStatusOptions: ["Normal", "High", "Low", "Suspect", "Unreliable"],
  autoRefractionTestTypes: [
    "Standard Auto Refractometer",
    "Handheld Auto Refractometer",
    "Wavefront Aberrometer",
  ],
  readingConfidenceOptions: ["Reliable", "Unreliable", "Recheck Required"],
  prescriptionTypeOptions: [
    "Single Vision",
    "Bifocal",
    "Progressive",
    "Near Vision Only",
    "Distance Vision Only",
    "Computer Glasses",
    "Prism Correction",
  ],
  baseDirectionOptions: ["Up", "Down", "In", "Out"],
  usageRecommendationOptions: [
    "Full-time",
    "Reading Only",
    "Driving",
    "Computer",
    "Part-time Use",
  ],
  keratometryTestTypes: [
    "Manual Keratometer",
    "Auto Keratometer",
    "Corneal Topographer",
  ],
  cornealShapeOptions: [
    "Spherical",
    "With-The-Rule Astigmatism (WTR)",
    "Against-The-Rule Astigmatism (ATR)",
    "Oblique Astigmatism",
  ],
  slitLampOptions: {
    lidsLacrimal: [
      "Normal",
      "Blepharitis",
      "Meibomian Gland Dysfunction (MGD)",
      "Chalazion",
      "Hordeolum",
      "Ptosis",
      "Entropion",
      "Ectropion",
      "Trichiasis",
      "Epiphora",
      "Others",
    ],
    conjunctivaSclera: [
      "Normal",
      "Congestion / Hyperemia",
      "Chemosis",
      "Follicles",
      "Papillae",
      "Subconjunctival Hemorrhage",
      "Pterygium",
      "Pinguecula",
      "Episcleritis",
      "Scleritis",
      "Others",
    ],
    cornea: [
      "Clear",
      "Corneal Edema",
      "Corneal Scar",
      "Corneal Ulcer",
      "Abrasion",
      "Keratitis",
      "Punctate Epithelial Erosions (PEE)",
      "Foreign Body",
      "Neovascularization",
      "Keratoconus",
      "Others",
    ],
    anteriorChamber: [
      "Deep and Quiet",
      "Shallow",
      "Cells Present",
      "Flare Present",
      "Hypopyon",
      "Hyphema",
      "Others",
    ],
    irisPupil: [
      "Normal",
      "Round and Reactive",
      "Sluggish Reaction",
      "Non-Reactive",
      "Irregular Pupil",
      "Anisocoria",
      "Synechiae",
      "Neovascularization of Iris (NVI)",
      "Iris Atrophy",
      "Others",
    ],
    lens: [
      "Clear",
      "Nuclear Sclerosis",
      "Cortical Cataract",
      "Posterior Subcapsular Cataract (PSC)",
      "Mature Cataract",
      "Hypermature Cataract",
      "Pseudophakia",
      "Aphakia",
      "PCO",
      "Others",
    ],
    afterDilatation: [
      "No Additional Findings",
      "Zonular Weakness",
      "Pseudoexfoliation",
      "Lens Subluxation",
      "Vitreous Prolapse",
      "Poor Fundus View",
      "Others",
    ],
    fluoresceinStain: [
      "Negative",
      "Positive",
      "Linear Staining",
      "Dendritic Ulcer",
      "Geographic Ulcer",
      "Tear Film Break-Up TBUT",
      "Others",
    ],
    schirmerTest: [
      "Normal",
      "Mild Dry Eye",
      "Moderate Dry Eye",
      "Severe Dry Eye",
      "Others",
    ],
  },
  fundusOptions: {
    vitreous: [
      "Clear",
      "Vitreous Floaters",
      "Vitreous Haze",
      "Vitritis",
      "Vitreous Hemorrhage",
      "Posterior Vitreous Detachment (PVD)",
      "Media Opacity",
      "Others",
    ],
    opticDisc: [
      "Normal",
      "Hyperemic Disc",
      "Pale Disc",
      "Disc Edema",
      "Glaucomatous Disc",
      "Tilted Disc",
      "Myopic Disc",
      "Disc Hemorrhage",
      "Others",
    ],
    macula: [
      "Normal",
      "Macular Edema",
      "Cystoid Macular Edema (CME)",
      "Macular Hole",
      "Epiretinal Membrane (ERM)",
      "Age-Related Macular Degeneration (ARMD)",
      "Central Serous Chorioretinopathy (CSCR)",
      "Macular Scar",
      "Others",
    ],
    retinalVessels: [
      "Normal",
      "Attenuated Vessels",
      "Tortuous Vessels",
      "AV Nicking",
      "Copper Wiring",
      "Silver Wiring",
      "Sheathing",
      "Neovascularization Elsewhere (NVE)",
      "Others",
    ],
    retinalPeriphery: [
      "Normal",
      "Lattice Degeneration",
      "Retinal Tear",
      "Retinal Detachment",
      "Degenerative Changes",
      "Peripheral Scar",
      "Neovascularization",
      "Others",
    ],
    choroid: [
      "Normal",
      "Choroidal Nevus",
      "Choroidal Atrophy",
      "Choroiditis",
      "Choroidal Neovascular Membrane (CNVM)",
      "Choroidal Mass",
      "Others",
    ],
  },
};

export const OPHTHALMOLOGY_SECTIONS = [
  {
    id: "visualAcuity",
    title: "Visual Acuity Test",
    iconSize: 28,
    actions: ["Load from Prev.",
      // "SnapRx", 
      "Clear"],
    topFields: [
      { label: "Test Type", optionsKey: "visualAcuityTestTypes" },
      { label: "Correction Used", optionsKey: "correctionUsedOptions" },
      { label: "Vision Type", optionsKey: "visionTypeOptions" },
    ],
    tables: [
      {
        id: "visualAcuityTable",
        columns: [
          { key: "eye", label: "Eye", type: "label" },
          {
            key: "ucDistance",
            label: "UC Distance",
            placeholder: "Eg: 6/8",
            optionsKey: "snellenOptions",
          },
          {
            key: "ucNear",
            label: "UC Near",
            placeholder: "Eg: N8",
            optionsKey: "snellenNearOptionsForNear",
          },
          {
            key: "pinhole",
            label: "Pinhole",
            placeholder: "Eg: 6/9",
            optionsKey: "snellenOptions",
          },
          {
            key: "cDistance",
            label: "C Distance",
            placeholder: "Eg: 6/8",
            optionsKey: "snellenOptions",
          },
          {
            key: "cNear",
            label: "C Near",
            placeholder: "Eg: N8",
            optionsKey: "snellenNearOptionsForNear",
          },
        ],
        rows: [
          { key: "od", label: "OD" },
          { key: "os", label: "OS" },
        ],
      },
    ],
  },
  {
    id: "autoRefraction",
    title: "Auto Refraction Test",
    iconSize: 28,
    actions: ["Load from Prev.", "Clear"],
    topFields: [
      { label: "Test Type", optionsKey: "autoRefractionTestTypes" },
      { label: "Reading Confidence", optionsKey: "readingConfidenceOptions" },
    ],
    tables: [
      {
        id: "autoRefractionUndilated",
        title: "Undilated",
        columns: [
          { key: "eye", label: "Eye", type: "label" },
          {
            key: "sphere",
            label: "Sphere",
            placeholder: "Eg: +0.25",
            optionsKey: "sphereOptions",
          },
          {
            key: "cylinder",
            label: "Cylinder",
            placeholder: "Eg: +0.25",
            optionsKey: "cylinderOptions",
          },
          {
            key: "axis",
            label: "Axis",
            placeholder: "Eg: 10 deg",
            optionsKey: "axisOptions",
          },
          {
            key: "add",
            label: "Add",
            placeholder: "Eg: +0.25",
            optionsKey: "additionOptions",
          },
          // {
          //   key: "prism",
          //   label: "Prism",
          //   placeholder: "Eg: 1.00",
          //   optionsKey: "prismOptions",
          // },
          // {
          //   key: "baseDirection",
          //   label: "Base Direction",
          //   placeholder: "Eg: Up",
          //   optionsKey: "baseDirectionOptions",
          // },
          {
            key: "distance",
            label: "Distance",
            placeholder: "Eg: 6/9",
            optionsKey: "snellenOptions",
          },
          {
            key: "near",
            label: "Near",
            placeholder: "Eg: N8",
            optionsKey: "snellenNearOptionsForNear",
          },
        ],
        rows: [
          { key: "od", label: "OD" },
          { key: "os", label: "OS" },
        ],
      },
      {
        id: "autoRefractionDilated",
        title: "Dilated",
        columns: [
          { key: "eye", label: "Eye", type: "label" },
          {
            key: "sphere",
            label: "Sphere",
            placeholder: "Eg: +0.25",
            optionsKey: "sphereOptions",
          },
          {
            key: "cylinder",
            label: "Cylinder",
            placeholder: "Eg: +0.25",
            optionsKey: "cylinderOptions",
          },
          {
            key: "axis",
            label: "Axis",
            placeholder: "Eg: 10 deg",
            optionsKey: "axisOptions",
          },
          {
            key: "add",
            label: "Add",
            placeholder: "Eg: +0.25",
            optionsKey: "additionOptions",
          },
          {
            key: "distance",
            label: "Distance",
            placeholder: "Eg: 6/9",
            optionsKey: "snellenOptions",
          },
          {
            key: "near",
            label: "Near",
            placeholder: "Eg: N8",
            optionsKey: "snellenNearOptionsForNear",
          },
        ],
        rows: [
          { key: "od", label: "OD" },
          { key: "os", label: "OS" },
        ],
      },
    ],
    extraFields: [
      {
        key: "pd",
        label: "Pupillary Distance (PD)",
        shortLabel: "PD",
        placeholder: "Eg: 32 mm",
        optionsKey: "pupillaryDistanceOptions",
        variant: "inlineRow",
      },
    ],
  },
  {
    id: "lensometerValues",
    title: "Lensometer Values",
    iconSize: 28,
    actions: ["Load from Prev.", "Clear"],
    tables: [
      {
        id: "lensometerTable",
        columns: [
          { key: "eye", label: "Eye", type: "label" },
          {
            key: "sphere",
            label: "Sphere",
            placeholder: "Eg: +0.25",
            optionsKey: "sphereOptions",
          },
          {
            key: "cylinder",
            label: "Cylinder",
            placeholder: "Eg: +0.25",
            optionsKey: "cylinderOptions",
          },
          {
            key: "axis",
            label: "Axis",
            placeholder: "Eg: 10 deg",
            optionsKey: "axisOptions",
          },
          {
            key: "add",
            label: "Add",
            placeholder: "Eg: +0.25",
            optionsKey: "additionOptions",
          },
          {
            key: "distance",
            label: "Distance",
            placeholder: "Eg: 6/9",
            optionsKey: "snellenOptions",
          },
          {
            key: "near",
            label: "Near",
            placeholder: "Eg: N8",
            optionsKey: "snellenNearOptionsForNear",
          },
        ],
        rows: [
          { key: "od", label: "OD" },
          { key: "os", label: "OS" },
        ],
      },
    ],
  },
  {
    id: "glassPrescription",
    title: "Glass Prescription",
    iconSize: 28,
    actions: ["Load from Prev.", "Clear"],
    chips: ["Autofill"],
    topFields: [
      { label: "Prescription Type", optionsKey: "prescriptionTypeOptions" },
      { label: "Usage Recommendation", optionsKey: "usageRecommendationOptions" },
    ],
    tables: [
      {
        id: "glassPrescriptionTable",
        columns: [
          { key: "eye", label: "Eye", type: "label" },
          {
            key: "sphere",
            label: "Sphere",
            placeholder: "Eg: +0.25",
            optionsKey: "sphereOptions",
          },
          {
            key: "cylinder",
            label: "Cylinder",
            placeholder: "Eg: +0.25",
            optionsKey: "cylinderOptions",
          },
          {
            key: "axis",
            label: "Axis",
            placeholder: "Eg: 10 deg",
            optionsKey: "axisOptions",
          },
          {
            key: "add",
            label: "Add",
            placeholder: "Eg: +0.25",
            optionsKey: "additionOptions",
          },
          {
            key: "distance",
            label: "Distance",
            placeholder: "Eg: 6/9",
            optionsKey: "snellenOptions",
          },
          {
            key: "near",
            label: "Near",
            placeholder: "Eg: N8",
            optionsKey: "snellenNearOptionsForNear",
          },
        ],
        rows: [
          { key: "od", label: "OD" },
          { key: "os", label: "OS" },
        ],
      },
    ],
    extraFields: [
      {
        key: "pd",
        label: "Pupillary Distance (PD)",
        shortLabel: "PD",
        placeholder: "Eg: 32 mm",
        optionsKey: "pupillaryDistanceOptions",
        variant: "inlineRow",
      },
    ],
  },
  {
    id: "iop",
    title: "Intra Ocular Pressure (IOP)",
    iconSize: 28,
    actions: ["Load from Prev.", "Clear"],
    topFields: [
      { label: "Test Type", optionsKey: "iopTestTypes" },
      { label: "Measurement Time", optionsKey: "measurementTimeOptions" },
      { label: "Reading Status", optionsKey: "readingStatusOptions" },
    ],
    tables: [
      {
        id: "iopTable",
        columns: [
          { key: "eye", label: "Eye", type: "label" },
          {
            key: "nct",
            label: "NCT",
            placeholder: "Eg: 1 mmHg",
            optionsKey: "iopOptions",
          },
          {
            key: "gat",
            label: "GAT",
            placeholder: "Eg: 1 mmHg",
            optionsKey: "iopOptions",
          },
          {
            key: "cct",
            label: "CCT",
            placeholder: "Eg: 300 um",
            options: [],
          },
          {
            key: "ciop",
            label: "CIOP",
            placeholder: "Eg: 1 mmHg",
            optionsKey: "iopOptions",
          },
        ],
        rows: [
          { key: "od", label: "OD" },
          { key: "os", label: "OS" },
        ],
      },
    ],
  },
  {
    id: "slitLamp",
    title: "Slit Lamp Examination",
    iconSize: 28,
    actions: ["Templates", "Save", "Clear"],
    tables: [
      {
        id: "slitLampTable",
        columns: [
          { key: "name", label: "Name", type: "label" },
          {
            key: "od",
            label: "OD",
            placeholder: "Eg: Congestion",
            optionsFromRow: true,
          },
          {
            key: "os",
            label: "OS",
            placeholder: "Eg: Congestion",
            optionsFromRow: true,
          },
          {
            key: "remarks",
            label: "Remarks",
            placeholder: "Eg: Severity is Mild",
            options: [],
          },
        ],
        rows: [
          {
            key: "lids",
            label: "Lids/Lacrimal Apparatus",
            optionsKey: "slitLampOptions.lidsLacrimal",
          },
          {
            key: "conjunctiva",
            label: "Conjunctiva/Sclera",
            optionsKey: "slitLampOptions.conjunctivaSclera",
          },
          {
            key: "cornea",
            label: "Cornea",
            optionsKey: "slitLampOptions.cornea",
          },
          {
            key: "anteriorChamber",
            label: "Anterior Chamber",
            optionsKey: "slitLampOptions.anteriorChamber",
          },
          {
            key: "irisPupil",
            label: "Iris/Pupil",
            optionsKey: "slitLampOptions.irisPupil",
          },
          { key: "lens", label: "Lens", optionsKey: "slitLampOptions.lens" },
          {
            key: "afterDilation",
            label: "After Dilatation Additional SLF",
            optionsKey: "slitLampOptions.afterDilatation",
          },
          {
            key: "fluorescein",
            label: "Fluorescein Stain",
            optionsKey: "slitLampOptions.fluoresceinStain",
          },
          {
            key: "schirmer",
            label: "Schirmer's Test",
            optionsKey: "slitLampOptions.schirmerTest",
          },
        ],
      },
    ],
  },
  {
    id: "fundus",
    title: "Fundus Examination",
    iconSize: 28,
    actions: [
      // "AI Snap",
       "Templates", "Save", "Clear"],
    tables: [
      {
        id: "fundusTable",
        columns: [
          { key: "title", label: "Title", type: "label" },
          {
            key: "od",
            label: "OD",
            placeholder: "Eg: Normal",
            optionsFromRow: true,
          },
          {
            key: "os",
            label: "OS",
            placeholder: "Eg: Normal",
            optionsFromRow: true,
          },
          {
            key: "remarks",
            label: "Remarks",
            placeholder: "Eg: Severity is Mild",
            options: [],
          },
        ],
        rows: [
          {
            key: "disc",
            label: "Disc",
            optionsKey: "fundusOptions.opticDisc",
          },
          {
            key: "macula",
            label: "Macula",
            optionsKey: "fundusOptions.macula",
          },
          {
            key: "vitreous",
            label: "Vitreous",
            optionsKey: "fundusOptions.vitreous",
          },
          {
            key: "retina",
            label: "Retina",
            optionsKey: "fundusOptions.retinalPeriphery",
          },
          {
            key: "fovealReflex",
            label: "Foveal Reflex",
            options: [],
          },
          {
            key: "bloodVessels",
            label: "Blood Vessels",
            optionsKey: "fundusOptions.retinalVessels",
          },
          {
            key: "periphery",
            label: "Periphery",
            optionsKey: "fundusOptions.retinalPeriphery",
          },
        ],
      },
    ],
  },
];
