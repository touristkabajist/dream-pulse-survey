type SurveyOption = {
  readonly id: string;
  readonly label: string;
  readonly note: string;
};

type SurveyGroup = {
  readonly id: string;
  readonly number: string;
  readonly label: string;
  readonly description: string;
  readonly options: readonly SurveyOption[];
};

export const SURVEY_GROUPS: readonly SurveyGroup[] = [
  {
    id: "view",
    number: "01",
    label: "View",
    description: "Did the dream arrive in light or colour?",
    options: [
      { id: "viewWithoutColour", label: "Without colour", note: "A monochrome scene" },
      { id: "viewWithColour", label: "With colour", note: "A coloured scene" },
    ],
  },
  {
    id: "sound",
    number: "02",
    label: "Sound",
    description: "A voice, rhythm, noise, or complete silence.",
    options: [{ id: "sound", label: "Sound", note: "Audio was present" }],
  },
  {
    id: "smell",
    number: "03",
    label: "Smell",
    description: "An atmosphere you could somehow breathe in.",
    options: [{ id: "smell", label: "Smell", note: "Scent was present" }],
  },
  {
    id: "taste",
    number: "04",
    label: "Taste",
    description: "A flavour that crossed the boundary into sleep.",
    options: [{ id: "taste", label: "Taste", note: "Flavour was present" }],
  },
  {
    id: "touch",
    number: "05",
    label: "Touch",
    description: "Physical sensation, mapped in small details.",
    options: [
      { id: "touchWetness", label: "Wetness", note: "Water or dampness" },
      { id: "touchTemperature", label: "Temperature", note: "Heat or cold" },
      { id: "touchRoughness", label: "Roughness", note: "Texture or friction" },
    ],
  },
  {
    id: "other",
    number: "06",
    label: "Other",
    description: "Name the sense that does not fit a neat category.",
    options: [{ id: "other", label: "Other", note: "Something else entirely" }],
  },
] as const;

export const SURVEY_OPTIONS = SURVEY_GROUPS.flatMap(group => group.options);
export type SurveyOptionId = (typeof SURVEY_OPTIONS)[number]["id"];
export const OPTION_IDS = SURVEY_OPTIONS.map(option => option.id) as SurveyOptionId[];

export function isSurveyOptionId(value: string): value is SurveyOptionId {
  return OPTION_IDS.includes(value as SurveyOptionId);
}

export function countWords(value: string) {
  const normalized = value.trim();
  return normalized ? normalized.split(/\s+/u).length : 0;
}
