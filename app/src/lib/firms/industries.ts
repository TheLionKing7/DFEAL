/**
 * Industry presets used during firm onboarding. Each preset seeds suggested
 * NAICS codes, capability keywords, and set-aside defaults that the firm can
 * then edit. Every NAICS code here is validated against NAICS 2022 in tests.
 */

export interface IndustryPreset {
  key: string;
  label: string;
  description: string;
  suggestedNaics: string[];
  keywords: string[];
  competencies: string[];
}

export const INDUSTRY_PRESETS: IndustryPreset[] = [
  {
    key: "healthcare_consulting",
    label: "Healthcare & Clinical Services",
    description: "Healthcare program management, clinical research support, health IT.",
    suggestedNaics: ["541611", "541618", "541714", "621999", "541512"],
    keywords: ["healthcare", "clinical", "medical", "research", "hipaa", "fda", "program management", "public health"],
    competencies: ["Healthcare program management", "Clinical research support", "Health IT"],
  },
  {
    key: "it_services",
    label: "IT Services & Software",
    description: "Systems integration, software development, cloud, cybersecurity.",
    suggestedNaics: ["541512", "541511", "541513", "541519", "518210"],
    keywords: ["information technology", "software", "cloud", "cybersecurity", "network", "data", "devops", "help desk"],
    competencies: ["Software development", "Cloud migration", "Cybersecurity", "IT operations"],
  },
  {
    key: "management_consulting",
    label: "Management & Professional Consulting",
    description: "Program/project management, strategy, acquisition support.",
    suggestedNaics: ["541611", "541618", "541612", "541613", "541990"],
    keywords: ["consulting", "program management", "advisory", "strategy", "acquisition support", "pmo", "process improvement"],
    competencies: ["Program management", "Strategic planning", "Process improvement"],
  },
  {
    key: "construction",
    label: "Construction & Trades",
    description: "General contracting, renovation, specialty trades.",
    suggestedNaics: ["236220", "236210", "237310", "238210", "238220", "238160"],
    keywords: ["construction", "renovation", "repair", "hvac", "electrical", "roofing", "paving", "facility improvement"],
    competencies: ["General contracting", "Renovation", "Specialty trades"],
  },
  {
    key: "engineering",
    label: "Engineering & Architecture",
    description: "Engineering design, architecture, surveying, environmental engineering.",
    suggestedNaics: ["541330", "541310", "541370", "541380", "541620"],
    keywords: ["engineering", "design", "architect", "survey", "inspection", "environmental", "a/e services"],
    competencies: ["Engineering design", "Architecture", "Inspection & testing"],
  },
  {
    key: "facilities",
    label: "Facilities, Janitorial & Grounds",
    description: "Facility support, custodial, landscaping, pest control.",
    suggestedNaics: ["561210", "561720", "561730", "561710", "561790"],
    keywords: ["janitorial", "custodial", "facility", "grounds", "landscaping", "maintenance", "cleaning", "pest control"],
    competencies: ["Custodial services", "Facility operations", "Grounds maintenance"],
  },
  {
    key: "staffing",
    label: "Staffing & Workforce",
    description: "Temporary help, professional staffing, employment placement.",
    suggestedNaics: ["561320", "561311", "561330", "541612"],
    keywords: ["staffing", "temporary", "personnel", "workforce", "recruiting", "labor"],
    competencies: ["Temporary staffing", "Recruiting", "Workforce management"],
  },
  {
    key: "medical_supplies",
    label: "Medical & Lab Supplies",
    description: "Medical, dental, hospital and laboratory equipment and supplies.",
    suggestedNaics: ["423450", "423490", "339112", "339113", "424210"],
    keywords: ["medical supplies", "ppe", "laboratory", "equipment", "pharmaceutical", "durable medical", "hospital"],
    competencies: ["Medical supply procurement", "Distribution", "Emergency response supply"],
  },
  {
    key: "logistics",
    label: "Logistics & Transportation",
    description: "Freight, warehousing, courier, fleet services.",
    suggestedNaics: ["484110", "484121", "488510", "493110", "492110"],
    keywords: ["logistics", "transportation", "freight", "warehouse", "shipping", "courier", "fleet", "moving"],
    competencies: ["Freight transportation", "Warehousing", "Supply chain"],
  },
  {
    key: "security",
    label: "Security Services",
    description: "Guard services, security systems, investigations.",
    suggestedNaics: ["561612", "561621", "561611", "238210"],
    keywords: ["security", "guard", "surveillance", "access control", "patrol", "alarm"],
    competencies: ["Guard services", "Security systems integration"],
  },
  {
    key: "training_education",
    label: "Training & Education",
    description: "Professional training, curriculum development, e-learning.",
    suggestedNaics: ["611430", "611710", "611699", "611519", "541611"],
    keywords: ["training", "curriculum", "instruction", "education", "e-learning", "workforce development"],
    competencies: ["Instructional design", "Professional training", "E-learning"],
  },
  {
    key: "environmental",
    label: "Environmental & Remediation",
    description: "Remediation, waste management, environmental consulting.",
    suggestedNaics: ["562910", "562211", "541620", "562111", "541380"],
    keywords: ["environmental", "remediation", "hazardous", "waste", "abatement", "asbestos", "compliance monitoring"],
    competencies: ["Remediation", "Waste management", "Environmental compliance"],
  },
  {
    key: "marketing_communications",
    label: "Marketing, Media & Communications",
    description: "Advertising, public relations, digital media, printing.",
    suggestedNaics: ["541810", "541820", "541430", "512110", "323111"],
    keywords: ["marketing", "outreach", "communications", "public relations", "media", "advertising", "design", "video"],
    competencies: ["Public outreach campaigns", "Digital media", "Creative services"],
  },
  {
    key: "manufacturing",
    label: "Manufacturing & Products",
    description: "Fabrication, machining, product manufacturing.",
    suggestedNaics: ["332710", "332999", "336413", "334511", "339999"],
    keywords: ["manufacturing", "fabrication", "machining", "parts", "assembly", "production"],
    competencies: ["Precision machining", "Fabrication", "Quality assurance"],
  },
  {
    key: "research_development",
    label: "Research & Development",
    description: "Scientific R&D in physical, engineering, life sciences.",
    suggestedNaics: ["541715", "541714", "541713", "541720"],
    keywords: ["research", "development", "r&d", "sbir", "sttr", "scientific", "prototype", "laboratory"],
    competencies: ["Applied research", "Prototype development", "Technical studies"],
  },
  {
    key: "other",
    label: "Other",
    description: "Start from scratch and choose NAICS codes manually.",
    suggestedNaics: [],
    keywords: [],
    competencies: [],
  },
];

export function getIndustryPreset(key: string): IndustryPreset | undefined {
  return INDUSTRY_PRESETS.find((p) => p.key === key);
}

export function industryLabel(key: string): string {
  return getIndustryPreset(key)?.label ?? key;
}

export const SET_ASIDE_OPTIONS = [
  "None",
  "Unrestricted",
  "Small Business",
  "8(a)",
  "HUBZone",
  "WOSB",
  "EDWOSB",
  "SDVOSB",
  "VOSB",
  "ISBEE",
] as const;

export const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA",
  "ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR",
  "PA","PR","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY",
] as const;
