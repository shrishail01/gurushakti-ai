/**
 * GuruShakti AI — 27 AI Toolkit tools.
 *
 * This file is intentionally dependency-free (no React, no lucide) so it can
 * be imported from BOTH the frontend (to render the dynamic tool generator)
 * and the Convex backend (to build tool-specific Gemini prompts).
 *
 * Each tool defines its own fields, validation rules, category, icon key,
 * English/Kannada labels and a prompt template with {{placeholders}} that get
 * filled from the submitted parameters.
 */

import type { OutputLanguage, ProfileContext } from "./types";

export type ToolCategory =
  | "teaching"
  | "assessment"
  | "reports"
  | "communication"
  | "utility"
  | "career";

export type ToolFieldType = "text" | "textarea" | "select" | "number";

export interface ToolOption {
  value: string;
  label: string;
  labelKn: string;
}

export interface ToolField {
  name: string;
  label: string;
  labelKn: string;
  type: ToolFieldType;
  required?: boolean;
  placeholder?: string;
  placeholderKn?: string;
  options?: ToolOption[];
  help?: string;
  /** Pre-fill from the user profile when present. */
  fromProfile?: "subjects" | "district" | "teachingLevel" | "role";
}

export interface ToolDef {
  id: string;
  category: ToolCategory;
  /** lucide icon key, resolved to a component on the frontend */
  icon: string;
  title: string;
  titleKn: string;
  description: string;
  descriptionKn: string;
  fields: ToolField[];
  /** Prompt template with {{field}} placeholders */
  prompt: string;
  /** Saved-document title template, e.g. "{topic} — Lesson Plan" */
  titleTemplate?: string;
}

export const CATEGORIES: {
  id: ToolCategory;
  label: string;
  labelKn: string;
}[] = [
  { id: "teaching", label: "Teaching", labelKn: "ಬೋಧನೆ" },
  { id: "assessment", label: "Assessment", labelKn: "ಮೌಲ್ಯಮಾಪನ" },
  { id: "reports", label: "Reports", labelKn: "ವರದಿಗಳು" },
  { id: "communication", label: "Communication", labelKn: "ಸಂವಹನ" },
  { id: "utility", label: "Utility", labelKn: "ಉಪಯುಕ್ತತೆ" },
  { id: "career", label: "Career", labelKn: "ವೃತ್ತಿ" },
];

/* ------------------------------------------------------------------ */
/* Shared option lists                                                 */
/* ------------------------------------------------------------------ */

const GRADE_OPTIONS: ToolOption[] = [
  { value: "LKG", label: "LKG", labelKn: "ಎಲ್ಕೆಜಿ" },
  { value: "UKG", label: "UKG", labelKn: "ಯುಕೆಜಿ" },
  { value: "Class 1", label: "Class 1", labelKn: "೧ ನೇ ತರಗತಿ" },
  { value: "Class 2", label: "Class 2", labelKn: "೨ ನೇ ತರಗತಿ" },
  { value: "Class 3", label: "Class 3", labelKn: "೩ ನೇ ತರಗತಿ" },
  { value: "Class 4", label: "Class 4", labelKn: "೪ ನೇ ತರಗತಿ" },
  { value: "Class 5", label: "Class 5", labelKn: "೫ ನೇ ತರಗತಿ" },
  { value: "Class 6", label: "Class 6", labelKn: "೬ ನೇ ತರಗತಿ" },
  { value: "Class 7", label: "Class 7", labelKn: "೭ ನೇ ತರಗತಿ" },
  { value: "Class 8", label: "Class 8", labelKn: "೮ ನೇ ತರಗತಿ" },
  { value: "Class 9", label: "Class 9", labelKn: "೯ ನೇ ತರಗತಿ" },
  { value: "Class 10", label: "Class 10", labelKn: "೧೦ ನೇ ತರಗತಿ" },
  { value: "PU 1st Year", label: "PU 1st Year", labelKn: "ಪಿಯುಸಿ ಮೊದಲ ವರ್ಷ" },
  { value: "PU 2nd Year", label: "PU 2nd Year", labelKn: "ಪಿಯುಸಿ ಎರಡನೇ ವರ್ಷ" },
  { value: "Degree", label: "Degree", labelKn: "ಪದವಿ" },
  { value: "Diploma", label: "Diploma", labelKn: "ಡಿಪ್ಲೊಮಾ" },
  { value: "Any Level", label: "Any Level", labelKn: "ಯಾವುದೇ ದರ್ಜೆ" },
];

const BOARD_OPTIONS: ToolOption[] = [
  { value: "Karnataka State Board", label: "Karnataka State Board", labelKn: "ಕರ್ನಾಟಕ ರಾಜ್ಯ ಪಠ್ಯಕ್ರಮ" },
  { value: "CBSE", label: "CBSE", labelKn: "ಸಿಬಿಎಸ್ಇ" },
  { value: "ICSE", label: "ICSE", labelKn: "ಐಸಿಎಸ್ಇ" },
  { value: "Other Board", label: "Other Board", labelKn: "ಇತರೆ ಮಂಡಳಿ" },
];

const DURATION_OPTIONS: ToolOption[] = [
  { value: "30 minutes", label: "30 minutes", labelKn: "೩೦ ನಿಮಿಷ" },
  { value: "40 minutes", label: "40 minutes", labelKn: "೪೦ ನಿಮಿಷ" },
  { value: "45 minutes", label: "45 minutes", labelKn: "೪೫ ನಿಮಿಷ" },
  { value: "60 minutes", label: "60 minutes", labelKn: "೬೦ ನಿಮಿಷ" },
  { value: "90 minutes", label: "90 minutes", labelKn: "೯೦ ನಿಮಿಷ" },
];

const DIFFICULTY_OPTIONS: ToolOption[] = [
  { value: "Easy", label: "Easy", labelKn: "ಸುಲಭ" },
  { value: "Medium", label: "Medium", labelKn: "ಮಧ್ಯಮ" },
  { value: "Hard", label: "Hard", labelKn: "ಕಠಿಣ" },
];

const COUNT_5_20: ToolOption[] = [
  { value: "5", label: "5", labelKn: "೫" },
  { value: "10", label: "10", labelKn: "೧೦" },
  { value: "15", label: "15", labelKn: "೧೫" },
  { value: "20", label: "20", labelKn: "೨೦" },
];

const YES_NO: ToolOption[] = [
  { value: "Yes", label: "Yes", labelKn: "ಹೌದು" },
  { value: "No", label: "No", labelKn: "ಇಲ್ಲ" },
];

const f = (field: ToolField): ToolField => field;

/* ------------------------------------------------------------------ */
/* Tools                                                               */
/* ------------------------------------------------------------------ */

export const TOOLS: ToolDef[] = [
  /* ------------------------------ TEACHING ------------------------ */
  {
    id: "lesson-plan",
    category: "teaching",
    icon: "NotebookPen",
    title: "Lesson Plan",
    titleKn: "ಪಾಠ ಯೋಜನೆ",
    description:
      "A complete, ready-to-teach lesson plan with objectives, activities and assessment.",
    descriptionKn:
      "ಉದ್ದೇಶಗಳು, ಚಟುವಟಿಕೆಗಳು ಮತ್ತು ಮೌಲ್ಯಮಾಪನದೊಂದಿಗೆ ಸಂಪೂರ್ಣ ಪಾಠ ಯೋಜನೆ.",
    fields: [
      f({ name: "topic", label: "Topic", labelKn: "ಪಾಠದ ವಿಷಯ", type: "text", required: true, placeholder: "e.g. Fractions", placeholderKn: "ಉದಾ: ಭಿನ್ನರಾಶಿಗಳು" }),
      f({ name: "subject", label: "Subject", labelKn: "ವಿಷಯ", type: "text", required: true, fromProfile: "subjects", placeholder: "e.g. Mathematics", placeholderKn: "ಉದಾ: ಗಣಿತ" }),
      f({ name: "gradeLevel", label: "Grade / Class", labelKn: "ದರ್ಜೆ / ತರಗತಿ", type: "select", required: true, options: GRADE_OPTIONS, fromProfile: "teachingLevel" }),
      f({ name: "board", label: "Board", labelKn: "ಮಂಡಳಿ", type: "select", required: true, options: BOARD_OPTIONS }),
      f({ name: "duration", label: "Duration", labelKn: "ಅವಧಿ", type: "select", required: true, options: DURATION_OPTIONS }),
    ],
    prompt:
      "Create a detailed, ready-to-teach lesson plan for the topic {{topic}} in {{subject}} for {{gradeLevel}} ({{board}}), for a {{duration}} period. Include: 1) Learning objectives written in measurable terms (aligned to Bloom's Taxonomy), 2) Materials/teaching aids needed, 3) Warm-up / introduction that hooks students, 4) Step-by-step main teaching activities with approximate timings, 5) Student participation and group work ideas, 6) Formative assessment questions to check understanding, 7) Homework, 8) Differentiation tips for slow and fast learners. Format with clear headings, numbered steps and a small table for the activity timeline.",
    titleTemplate: "{topic} — Lesson Plan",
  },
  {
    id: "daily-teaching-plan",
    category: "teaching",
    icon: "CalendarClock",
    title: "Daily Teaching Plan",
    titleKn: "ದೈನಂದಿನ ಬೋಧನಾ ಯೋಜನೆ",
    description:
      "A full day's teaching schedule covering every period, class and topic.",
    descriptionKn:
      "ಪ್ರತಿ ಅವಧಿ, ತರಗತಿ ಮತ್ತು ವಿಷಯವನ್ನು ಒಳಗೊಂಡ ದಿನದ ಸಂಪೂರ್ಣ ಬೋಧನಾ ವೇಳಾಪಟ್ಟಿ.",
    fields: [
      f({ name: "subject", label: "Subject(s) of the day", labelKn: "ದಿನದ ವಿಷಯ(ಗಳು)", type: "text", required: true, fromProfile: "subjects", placeholder: "e.g. Maths, Science", placeholderKn: "ಉದಾ: ಗಣಿತ, ವಿಜ್ಞಾನ" }),
      f({ name: "gradeLevel", label: "Grade / Class", labelKn: "ದರ್ಜೆ / ತರಗತಿ", type: "select", required: true, options: GRADE_OPTIONS, fromProfile: "teachingLevel" }),
      f({ name: "periods", label: "Periods & timings", labelKn: "ಅವಧಿಗಳು ಮತ್ತು ಸಮಯ", type: "text", required: true, placeholder: "e.g. 1st: 9:00-9:45 Maths, 2nd: 9:45-10:30 Science…", placeholderKn: "ಉದಾ: ೧ನೇ: ೯:೦೦-೯:೪೫ ಗಣಿತ…" }),
      f({ name: "topics", label: "Topics to cover today", labelKn: "ಇಂದು ಮಾಡಬೇಕಾದ ವಿಷಯಗಳು", type: "text", required: true, placeholder: "e.g. Fractions continued; Photosynthesis intro", placeholderKn: "ಉದಾ: ಭಿನ್ನರಾಶಿಗಳು ಮುಂದುವರಿಕೆ" }),
    ],
    prompt:
      "Create a complete daily teaching plan for a teacher handling {{subject}} for {{gradeLevel}}. The periods and timings are: {{periods}}. Topics to cover: {{topics}}. For every period include: the objective, the teaching activity, student tasks, and a quick closure/assessment question. End the plan with a 3-line summary of what worked and what to revise tomorrow. Use a clear table with columns: Period, Time, Class, Topic, Activity, Assessment.",
    titleTemplate: "Daily Plan — {topics}",
  },
  {
    id: "micro-teaching-plan",
    category: "teaching",
    icon: "Microscope",
    title: "Micro Teaching Plan",
    titleKn: "ಸೂಕ್ಷ್ಮ ಬೋಧನಾ ಯೋಜನೆ",
    description:
      "A focused 5–7 minute micro lesson designed around one specific teaching skill.",
    descriptionKn:
      "ಒಂದು ನಿರ್ದಿಷ್ಟ ಬೋಧನಾ ಕೌಶಲ್ಯದ ಸುತ್ತ ರಚಿಸಿದ ೫–೭ ನಿಮಿಷದ ಸೂಕ್ಷ್ಮ ಪಾಠ.",
    fields: [
      f({ name: "skill", label: "Teaching skill", labelKn: "ಬೋಧನಾ ಕೌಶಲ್ಯ", type: "select", required: true, options: [
        { value: "Set Induction", label: "Set Induction", labelKn: "ಪ್ರಚೋದನೆ" },
        { value: "Questioning", label: "Questioning", labelKn: "ಪ್ರಶ್ನಿಸುವುದು" },
        { value: "Explanation", label: "Explanation", labelKn: "ವಿವರಣೆ" },
        { value: "Reinforcement", label: "Reinforcement", labelKn: "ಪ್ರೋತ್ಸಾಹ" },
        { value: "Stimulus Variation", label: "Stimulus Variation", labelKn: "ಪ್ರಚೋದಕ ಬದಲಾವಣೆ" },
        { value: "Blackboard Writing", label: "Blackboard Writing", labelKn: "ಹಲಗೆ ಬರವಣಿಗೆ" },
        { value: "Closure", label: "Closure", labelKn: "ಸಮಾಪನ" },
      ] }),
      f({ name: "topic", label: "Topic", labelKn: "ಪಾಠದ ವಿಷಯ", type: "text", required: true, placeholder: "e.g. Parts of a flower", placeholderKn: "ಉದಾ: ಹೂವಿನ ಭಾಗಗಳು" }),
      f({ name: "subject", label: "Subject", labelKn: "ವಿಷಯ", type: "text", required: true, fromProfile: "subjects", placeholder: "e.g. Science", placeholderKn: "ಉದಾ: ವಿಜ್ಞಾನ" }),
      f({ name: "gradeLevel", label: "Grade / Class", labelKn: "ದರ್ಜೆ / ತರಗತಿ", type: "select", required: true, options: GRADE_OPTIONS, fromProfile: "teachingLevel" }),
    ],
    prompt:
      "Design a micro-teaching lesson (5–7 minutes) for the topic {{topic}} in {{subject}} for {{gradeLevel}}, centred on the skill: {{skill}}. Structure it minute-by-minute: 1) Set induction (30–60 sec), 2) Presentation of content demonstrating the skill, 3) Skill-specific behaviours the teacher must exhibit (e.g., distribution of questions, probing, reinforcement statements), 4) Student response, 5) Closure. Include a one-line statement of the skill and two observation points a supervisor should watch for. Keep it crisp and classroom-ready.",
    titleTemplate: "{topic} — Micro Teaching",
  },
  {
    id: "assignment",
    category: "teaching",
    icon: "ClipboardList",
    title: "Assignment",
    titleKn: "ನಿಯೋಜನೆ",
    description:
      "A well-structured assignment with clear instructions and questions.",
    descriptionKn:
      "ಸ್ಪಷ್ಟ ಸೂಚನೆಗಳು ಮತ್ತು ಪ್ರಶ್ನೆಗಳೊಂದಿಗೆ ಉತ್ತಮ ರಚನೆಯ ನಿಯೋಜನೆ.",
    fields: [
      f({ name: "subject", label: "Subject", labelKn: "ವಿಷಯ", type: "text", required: true, fromProfile: "subjects", placeholder: "e.g. Social Science", placeholderKn: "ಉದಾ: ಸಮಾಜ ವಿಜ್ಞಾನ" }),
      f({ name: "gradeLevel", label: "Grade / Class", labelKn: "ದರ್ಜೆ / ತರಗತಿ", type: "select", required: true, options: GRADE_OPTIONS, fromProfile: "teachingLevel" }),
      f({ name: "topic", label: "Topic / Chapter", labelKn: "ವಿಷಯ / ಅಧ್ಯಾಯ", type: "text", required: true, placeholder: "e.g. The French Revolution", placeholderKn: "ಉದಾ: ಭಾರತದ ಸ್ವಾತಂತ್ರ್ಯ ಚಳವಳಿ" }),
      f({ name: "numQuestions", label: "Number of questions", labelKn: "ಪ್ರಶ್ನೆಗಳ ಸಂಖ್ಯೆ", type: "select", required: true, options: COUNT_5_20 }),
      f({ name: "difficulty", label: "Difficulty", labelKn: "ಕಷ್ಟದ ಮಟ್ಟ", type: "select", required: true, options: DIFFICULTY_OPTIONS }),
    ],
    prompt:
      "Create a student assignment on {{topic}} for {{subject}}, {{gradeLevel}}, with {{numQuestions}} questions at {{difficulty}} difficulty. Include: 1) A heading and clear submission instructions, 2) Questions divided into sections: Objective/Short answer, Descriptive, Application-based, and one creative/activity question, 3) Marks for each question, 4) A short 'How to submit' note and due date line left blank. Match Karnataka school assessment patterns. Format with headings and numbered questions.",
    titleTemplate: "{topic} — Assignment",
  },
  {
    id: "worksheet",
    category: "teaching",
    icon: "FileSpreadsheet",
    title: "Worksheet",
    titleKn: "ಕಾರ್ಯಪತ್ರ",
    description:
      "An engaging practice worksheet with varied question types.",
    descriptionKn:
      "ವಿವಿಧ ಪ್ರಶ್ನೆ ಪ್ರಕಾರಗಳೊಂದಿಗೆ ಆಕರ್ಷಕ ಅಭ್ಯಾಸ ಕಾರ್ಯಪತ್ರ.",
    fields: [
      f({ name: "subject", label: "Subject", labelKn: "ವಿಷಯ", type: "text", required: true, fromProfile: "subjects", placeholder: "e.g. Mathematics", placeholderKn: "ಉದಾ: ಗಣಿತ" }),
      f({ name: "gradeLevel", label: "Grade / Class", labelKn: "ದರ್ಜೆ / ತರಗತಿ", type: "select", required: true, options: GRADE_OPTIONS, fromProfile: "teachingLevel" }),
      f({ name: "topic", label: "Topic", labelKn: "ವಿಷಯ", type: "text", required: true, placeholder: "e.g. Multiplication tables 6-10", placeholderKn: "ಉದಾ: ಗುಣಾಕಾರ ೬-೧೦" }),
      f({ name: "numQuestions", label: "Number of questions", labelKn: "ಪ್ರಶ್ನೆಗಳ ಸಂಖ್ಯೆ", type: "select", required: true, options: COUNT_5_20 }),
      f({ name: "includeAnswers", label: "Include answer key", labelKn: "ಉತ್ತರ ಕೀಲಿ ಸೇರಿಸಿ", type: "select", required: true, options: YES_NO }),
    ],
    prompt:
      "Create an engaging practice worksheet on {{topic}} for {{subject}}, {{gradeLevel}}, with {{numQuestions}} questions. Mix question types: fill in the blanks, MCQ, matching, true/false, one-word answers and 1–2 problem-solving questions. Keep language simple and student-friendly. Start with a one-line instruction like 'Name: ____  Date: ____'. {{includeAnswers}} — if the answer key is required, add an 'Answer Key' section at the end. Format clearly with headings and numbered questions.",
    titleTemplate: "{topic} — Worksheet",
  },
  {
    id: "ppt-outline",
    category: "teaching",
    icon: "Presentation",
    title: "PPT Outline",
    titleKn: "ಪಿಪಿಟಿ ರೂಪರೇಖೆ",
    description:
      "A slide-by-slide outline for a classroom presentation.",
    descriptionKn:
      "ತರಗತಿ ಪ್ರಸ್ತುತಿಗಾಗಿ ಸ್ಲೈಡ್-ಮೂಲಕ-ಸ್ಲೈಡ್ ರೂಪರೇಖೆ.",
    fields: [
      f({ name: "topic", label: "Topic", labelKn: "ವಿಷಯ", type: "text", required: true, placeholder: "e.g. Photosynthesis", placeholderKn: "ಉದಾ: ದ್ಯುತಿಸಂಶ್ಲೇಷಣೆ" }),
      f({ name: "subject", label: "Subject", labelKn: "ವಿಷಯ", type: "text", required: true, fromProfile: "subjects", placeholder: "e.g. Biology", placeholderKn: "ಉದಾ: ಜೀವಶಾಸ್ತ್ರ" }),
      f({ name: "gradeLevel", label: "Grade / Class", labelKn: "ದರ್ಜೆ / ತರಗತಿ", type: "select", required: true, options: GRADE_OPTIONS, fromProfile: "teachingLevel" }),
      f({ name: "numSlides", label: "Number of slides", labelKn: "ಸ್ಲೈಡ್ಗಳ ಸಂಖ್ಯೆ", type: "select", required: true, options: [
        { value: "5", label: "5", labelKn: "೫" },
        { value: "8", label: "8", labelKn: "೮" },
        { value: "10", label: "10", labelKn: "೧೦" },
        { value: "12", label: "12", labelKn: "೧೨" },
        { value: "15", label: "15", labelKn: "೧೫" },
      ] }),
      f({ name: "audience", label: "Audience", labelKn: "ಪ್ರೇಕ್ಷಕರು", type: "select", required: true, options: [
        { value: "Students", label: "Students", labelKn: "ವಿದ್ಯಾರ್ಥಿಗಳು" },
        { value: "Teachers (workshop)", label: "Teachers (workshop)", labelKn: "ಶಿಕ್ಷಕರ ಕಾರ್ಯಾಗಾರ" },
        { value: "Parents", label: "Parents", labelKn: "ಪೋಷಕರು" },
        { value: "School assembly", label: "School assembly", labelKn: "ಶಾಲಾ ಅಸೆಂಬ್ಲಿ" },
      ] }),
    ],
    prompt:
      "Create a slide-by-slide PPT outline on {{topic}} for {{subject}} ({{gradeLevel}}) for an audience of {{audience}}. Provide exactly {{numSlides}} slides. For each slide give: the slide title, 3–6 bullet points (concise, presentation-ready), and a suggested visual or image idea. Add speaker notes (2–3 sentences) for the first and last slides. Follow a logical flow: title, hook/objective, concepts, examples, activity, summary, Q&A.",
    titleTemplate: "{topic} — PPT Outline",
  },
  {
    id: "teaching-aid",
    category: "teaching",
    icon: "Lightbulb",
    title: "Teaching Aid",
    titleKn: "ಬೋಧನಾ ಸಾಮಗ್ರಿ",
    description:
      "Ideas and instructions for building an effective low-cost teaching aid.",
    descriptionKn:
      "ಕಡಿಮೆ ವೆಚ್ಚದ ಪರಿಣಾಮಕಾರಿ ಬೋಧನಾ ಸಾಮಗ್ರಿ ನಿರ್ಮಾಣದ ಸೂಚನೆಗಳು.",
    fields: [
      f({ name: "topic", label: "Topic", labelKn: "ವಿಷಯ", type: "text", required: true, placeholder: "e.g. Water cycle", placeholderKn: "ಉದಾ: ನೀರಿನ ಚಕ್ರ" }),
      f({ name: "subject", label: "Subject", labelKn: "ವಿಷಯ", type: "text", required: true, fromProfile: "subjects", placeholder: "e.g. Science", placeholderKn: "ಉದಾ: ವಿಜ್ಞಾನ" }),
      f({ name: "gradeLevel", label: "Grade / Class", labelKn: "ದರ್ಜೆ / ತರಗತಿ", type: "select", required: true, options: GRADE_OPTIONS, fromProfile: "teachingLevel" }),
      f({ name: "aidType", label: "Type of aid", labelKn: "ಸಾಮಗ್ರಿಯ ಪ್ರಕಾರ", type: "select", required: true, options: [
        { value: "Chart / Poster", label: "Chart / Poster", labelKn: "ಚಾರ್ಟ್ / ಪೋಸ್ಟರ್" },
        { value: "Working Model", label: "Working Model", labelKn: "ಕಾರ್ಯಾತ್ಮಕ ಮಾದರಿ" },
        { value: "Flash Cards", label: "Flash Cards", labelKn: "ಫ್ಲ್ಯಾಶ್ ಕಾರ್ಡ್ಗಳು" },
        { value: "Digital (PPT / Video)", label: "Digital (PPT / Video)", labelKn: "ಡಿಜಿಟಲ್" },
        { value: "Puppet / Role-play kit", label: "Puppet / Role-play kit", labelKn: "ಗೊಂಬೆ / ಪಾತ್ರಾಭಿನಯ" },
        { value: "Board Game", label: "Board Game", labelKn: "ಬೋರ್ಡ್ ಆಟ" },
        { value: "Other", label: "Other", labelKn: "ಇತರೆ" },
      ] }),
      f({ name: "budget", label: "Budget", labelKn: "ವೆಚ್ಚ", type: "select", required: true, options: [
        { value: "Very low (₹0-100)", label: "Very low (₹0-100)", labelKn: "ತುಂಬಾ ಕಡಿಮೆ" },
        { value: "Low (₹100-500)", label: "Low (₹100-500)", labelKn: "ಕಡಿಮೆ" },
        { value: "Medium (₹500+)", label: "Medium (₹500+)", labelKn: "ಮಧ್ಯಮ" },
      ] }),
    ],
    prompt:
      "Design a {{aidType}} teaching aid for teaching {{topic}} in {{subject}} ({{gradeLevel}}), within a {{budget}} budget. Provide: 1) Why this aid works for this topic, 2) Materials needed (with local/Kannada-market names where useful), 3) Step-by-step construction instructions, 4) How to use it in class (teacher demo + student activity), 5) 2 questions to ask while using it, 6) A durability/reuse tip. Be practical for a government-school classroom.",
    titleTemplate: "{topic} — Teaching Aid",
  },
  {
    id: "classroom-activity",
    category: "teaching",
    icon: "Users",
    title: "Classroom Activity",
    titleKn: "ತರಗತಿ ಚಟುವಟಿಕೆ",
    description:
      "A fun, participative activity that reinforces a lesson concept.",
    descriptionKn:
      "ಪಾಠದ ಪರಿಕಲ್ಪನೆಯನ್ನು ಬಲಪಡಿಸುವ ಆಸಕ್ತಿದಾಯಕ ಭಾಗವಹಿಸುವಿಕೆ ಚಟುವಟಿಕೆ.",
    fields: [
      f({ name: "subject", label: "Subject", labelKn: "ವಿಷಯ", type: "text", required: true, fromProfile: "subjects", placeholder: "e.g. English", placeholderKn: "ಉದಾ: ಇಂಗ್ಲಿಷ್" }),
      f({ name: "gradeLevel", label: "Grade / Class", labelKn: "ದರ್ಜೆ / ತರಗತಿ", type: "select", required: true, options: GRADE_OPTIONS, fromProfile: "teachingLevel" }),
      f({ name: "topic", label: "Topic", labelKn: "ವಿಷಯ", type: "text", required: true, placeholder: "e.g. Vocabulary: adjectives", placeholderKn: "ಉದಾ: ಪದಸಂಪತ್ತು" }),
      f({ name: "activityType", label: "Activity type", labelKn: "ಚಟುವಟಿಕೆಯ ಪ್ರಕಾರ", type: "select", required: true, options: [
        { value: "Group discussion", label: "Group discussion", labelKn: "ಗುಂಪು ಚರ್ಚೆ" },
        { value: "Quiz / Kahoot-style", label: "Quiz / Kahoot-style", labelKn: "ಕ್ವಿಜ್" },
        { value: "Role play", label: "Role play", labelKn: "ಪಾತ್ರಾಭಿನಯ" },
        { value: "Games", label: "Games", labelKn: "ಆಟಗಳು" },
        { value: "Project / craft", label: "Project / craft", labelKn: "ಯೋಜನೆ / ಕರಕುಶಲ" },
        { value: "Peer teaching", label: "Peer teaching", labelKn: "ಗೆಳೆಯರಿಂದ ಬೋಧನೆ" },
        { value: "Debate", label: "Debate", labelKn: "ಚರ್ಚಾಸ್ಪರ್ಧೆ" },
      ] }),
      f({ name: "duration", label: "Duration", labelKn: "ಅವಧಿ", type: "select", required: true, options: DURATION_OPTIONS }),
    ],
    prompt:
      "Design a {{activityType}} classroom activity on {{topic}} for {{subject}}, {{gradeLevel}}, lasting {{duration}}. Include: 1) The learning objective, 2) Materials needed, 3) Grouping strategy (how many per group, mixed-ability note), 4) Step-by-step instructions for the teacher, 5) Student instructions in simple language, 6) A scoring/reward idea, 7) A follow-up question or homework tie-in, 8) How to manage noisy/less-involved students. Make it genuinely fun and practical.",
    titleTemplate: "{topic} — Activity",
  },

  /* ---------------------------- ASSESSMENT ------------------------ */
  {
    id: "question-paper",
    category: "assessment",
    icon: "FileQuestion",
    title: "Question Paper",
    titleKn: "ಪ್ರಶ್ನೆ ಪತ್ರಿಕೆ",
    description:
      "A properly formatted question paper with mark distribution.",
    descriptionKn:
      "ಅಂಕ ವಿತರಣೆಯೊಂದಿಗೆ ಸರಿಯಾದ ಸ್ವರೂಪದ ಪ್ರಶ್ನೆ ಪತ್ರಿಕೆ.",
    fields: [
      f({ name: "subject", label: "Subject", labelKn: "ವಿಷಯ", type: "text", required: true, fromProfile: "subjects", placeholder: "e.g. Science", placeholderKn: "ಉದಾ: ವಿಜ್ಞಾನ" }),
      f({ name: "gradeLevel", label: "Grade / Class", labelKn: "ದರ್ಜೆ / ತರಗತಿ", type: "select", required: true, options: GRADE_OPTIONS, fromProfile: "teachingLevel" }),
      f({ name: "board", label: "Board", labelKn: "ಮಂಡಳಿ", type: "select", required: true, options: BOARD_OPTIONS }),
      f({ name: "chapters", label: "Chapters / units", labelKn: "ಅಧ್ಯಾಯಗಳು / ಘಟಕಗಳು", type: "text", required: true, placeholder: "e.g. Ch 3, 4, 5", placeholderKn: "ಉದಾ: ಅಧ್ಯಾಯ ೩, ೪, ೫" }),
      f({ name: "totalMarks", label: "Total marks", labelKn: "ಒಟ್ಟು ಅಂಕಗಳು", type: "select", required: true, options: [
        { value: "20", label: "20", labelKn: "೨೦" },
        { value: "40", label: "40", labelKn: "೪೦" },
        { value: "50", label: "50", labelKn: "೫೦" },
        { value: "80", label: "80", labelKn: "೮೦" },
        { value: "100", label: "100", labelKn: "೧೦೦" },
      ] }),
      f({ name: "includeAnswerKey", label: "Include answer key", labelKn: "ಉತ್ತರ ಕೀಲಿ ಸೇರಿಸಿ", type: "select", required: true, options: YES_NO }),
    ],
    prompt:
      "Create a {{totalMarks}}-mark question paper for {{subject}}, {{gradeLevel}} ({{board}}) covering: {{chapters}}. Follow Karnataka-style format: Section A (objective/one-mark: MCQs, fill in the blanks, match), Section B (2-mark short answer), Section C (3-mark descriptive), Section D (5-mark long answer/essay), with marks shown against each question and total per section. Distribute questions evenly across chapters. Instructions for students at the top. {{includeAnswerKey}} — include an 'Answer Key' section with brief answers at the end. Use tables for the blueprint summary.",
    titleTemplate: "{chapters} — Question Paper",
  },
  {
    id: "blueprint",
    category: "assessment",
    icon: "DraftingCompass",
    title: "Blueprint",
    titleKn: "ಬ್ಲೂಪ್ರಿಂಟ್",
    description:
      "A mark-allocation blueprint mapping units to question types.",
    descriptionKn:
      "ಘಟಕಗಳನ್ನು ಪ್ರಶ್ನೆ ಪ್ರಕಾರಗಳಿಗೆ ಜೋಡಿಸುವ ಅಂಕ ವಿತರಣಾ ಬ್ಲೂಪ್ರಿಂಟ್.",
    fields: [
      f({ name: "subject", label: "Subject", labelKn: "ವಿಷಯ", type: "text", required: true, fromProfile: "subjects", placeholder: "e.g. Mathematics", placeholderKn: "ಉದಾ: ಗಣಿತ" }),
      f({ name: "gradeLevel", label: "Grade / Class", labelKn: "ದರ್ಜೆ / ತರಗತಿ", type: "select", required: true, options: GRADE_OPTIONS, fromProfile: "teachingLevel" }),
      f({ name: "board", label: "Board", labelKn: "ಮಂಡಳಿ", type: "select", required: true, options: BOARD_OPTIONS }),
      f({ name: "units", label: "Units / chapters", labelKn: "ಘಟಕಗಳು / ಅಧ್ಯಾಯಗಳು", type: "text", required: true, placeholder: "e.g. U1: Number System (20%), U2: Algebra (30%)…", placeholderKn: "ಉದಾ: ಘಟಕ ೧: ಸಂಖ್ಯಾ ವ್ಯವಸ್ಥೆ…" }),
      f({ name: "totalMarks", label: "Total marks", labelKn: "ಒಟ್ಟು ಅಂಕಗಳು", type: "select", required: true, options: [
        { value: "40", label: "40", labelKn: "೪೦" },
        { value: "50", label: "50", labelKn: "೫೦" },
        { value: "80", label: "80", labelKn: "೮೦" },
        { value: "100", label: "100", labelKn: "೧೦೦" },
      ] }),
    ],
    prompt:
      "Build an exam blueprint for {{subject}}, {{gradeLevel}} ({{board}}) worth {{totalMarks}} marks, for units: {{units}}. Produce: 1) A blueprint table with rows = units and columns = objective types (Knowledge, Understanding, Application, Skill), showing marks per cell, 2) Total marks per unit and per objective, 3) A question-type breakdown (MCQ/SA/LA with marks each), 4) A short note on difficulty distribution (easy/medium/hard) and 5) Two sample questions for the most important unit. Use clean markdown tables.",
    titleTemplate: "{subject} — Blueprint",
  },
  {
    id: "rubric",
    category: "assessment",
    icon: "ListChecks",
    title: "Rubric",
    titleKn: "ಮೌಲ್ಯಮಾಪನ ಮಾನದಂಡ",
    description:
      "A clear scoring rubric with performance level descriptions.",
    descriptionKn:
      "ಕಾರ್ಯನಿರ್ವಹಣಾ ಮಟ್ಟದ ವಿವರಣೆಗಳೊಂದಿಗೆ ಸ್ಪಷ್ಟ ಸ್ಕೋರಿಂಗ್ ರೂಬ್ರಿಕ್.",
    fields: [
      f({ name: "task", label: "Task being assessed", labelKn: "ಮೌಲ್ಯಮಾಪನ ಮಾಡಬೇಕಾದ ಕಾರ್ಯ", type: "textarea", required: true, placeholder: "e.g. Science project presentation", placeholderKn: "ಉದಾ: ವಿಜ್ಞಾನ ಯೋಜನಾ ಪ್ರಸ್ತುತಿ" }),
      f({ name: "subject", label: "Subject", labelKn: "ವಿಷಯ", type: "text", required: true, fromProfile: "subjects", placeholder: "e.g. Science", placeholderKn: "ಉದಾ: ವಿಜ್ಞಾನ" }),
      f({ name: "gradeLevel", label: "Grade / Class", labelKn: "ದರ್ಜೆ / ತರಗತಿ", type: "select", required: true, options: GRADE_OPTIONS, fromProfile: "teachingLevel" }),
      f({ name: "criteria", label: "Assessment criteria", labelKn: "ಮೌಲ್ಯಮಾಪನ ಮಾನದಂಡಗಳು", type: "textarea", required: true, placeholder: "e.g. Content accuracy, Presentation, Creativity, Teamwork", placeholderKn: "ಉದಾ: ವಿಷಯ ನಿಖರತೆ, ಪ್ರಸ್ತುತಿ…" }),
      f({ name: "scale", label: "Scale", labelKn: "ಮಟ್ಟದ ವ್ಯಾಪ್ತಿ", type: "select", required: true, options: [
        { value: "3", label: "3 levels", labelKn: "೩ ಮಟ್ಟಗಳು" },
        { value: "4", label: "4 levels", labelKn: "೪ ಮಟ್ಟಗಳು" },
        { value: "5", label: "5 levels", labelKn: "೫ ಮಟ್ಟಗಳು" },
      ] }),
    ],
    prompt:
      "Create an assessment rubric for the task '{{task}}' in {{subject}}, {{gradeLevel}}. Criteria to include (expand into 4-6 clear criteria): {{criteria}}. Use a {{scale}}-level performance scale (e.g., Beginning, Developing, Proficient, Exemplary) with a concrete descriptor sentence for EACH criterion × level. Add a scoring summary table (how to convert levels to marks) and one line of feedback sentence starters for each level. Format as markdown tables.",
    titleTemplate: "{task} — Rubric",
  },
  {
    id: "blooms-taxonomy",
    category: "assessment",
    icon: "Layers",
    title: "Bloom's Taxonomy",
    titleKn: "ಬ್ಲೂಮ್ ಅವರ ವರ್ಗೀಕರಣ",
    description:
      "Questions at every Bloom's level — from remembering to creating.",
    descriptionKn:
      "ನೆನಪಿಸಿಕೊಳ್ಳುವುದರಿಂದ ಸೃಷ್ಟಿಸುವವರೆಗೆ ಪ್ರತಿ ಮಟ್ಟದ ಪ್ರಶ್ನೆಗಳು.",
    fields: [
      f({ name: "subject", label: "Subject", labelKn: "ವಿಷಯ", type: "text", required: true, fromProfile: "subjects", placeholder: "e.g. English Literature", placeholderKn: "ಉದಾ: ಸಾಹಿತ್ಯ" }),
      f({ name: "gradeLevel", label: "Grade / Class", labelKn: "ದರ್ಜೆ / ತರಗತಿ", type: "select", required: true, options: GRADE_OPTIONS, fromProfile: "teachingLevel" }),
      f({ name: "topic", label: "Topic", labelKn: "ವಿಷಯ", type: "text", required: true, placeholder: "e.g. A poem by Kuvempu", placeholderKn: "ಉದಾ: ಕುವೆಂಪು ಅವರ ಕವನ" }),
      f({ name: "levels", label: "Levels to cover", labelKn: "ಒಳಗೊಳ್ಳಬೇಕಾದ ಮಟ್ಟಗಳು", type: "select", required: true, options: [
        { value: "All six levels", label: "All six levels", labelKn: "ಎಲ್ಲಾ ಆರು ಮಟ್ಟಗಳು" },
        { value: "Remembering – Understanding", label: "Remembering – Understanding", labelKn: "ನೆನಪು – ಅರ್ಥ" },
        { value: "Applying – Analyzing", label: "Applying – Analyzing", labelKn: "ಅನ್ವಯ – ವಿಶ್ಲೇಷಣೆ" },
        { value: "Evaluating – Creating", label: "Evaluating – Creating", labelKn: "ಮೌಲ್ಯಮಾಪನ – ಸೃಜನೆ" },
      ] }),
    ],
    prompt:
      "Generate classroom questions on {{topic}} for {{subject}}, {{gradeLevel}}, organised by Bloom's Taxonomy levels: {{levels}}. For each level, give: 1) The level name and one-line explanation, 2) 3–4 question stems/questions, 3) A suggested activity. End with one open-ended 'Creating' challenge task. Use headings per level. Keep questions age-appropriate and linked to the topic.",
    titleTemplate: "{topic} — Bloom's Taxonomy",
  },
  {
    id: "quiz-generator",
    category: "assessment",
    icon: "HelpCircle",
    title: "Quiz Generator",
    titleKn: "ಕ್ವಿಜ್ ಜನರೇಟರ್",
    description:
      "A ready-to-run quiz with answers, perfect for quick revision.",
    descriptionKn:
      "ತ್ವರಿತ ಪುನರಾವರ್ತನೆಗೆ ಸೂಕ್ತವಾದ ಉತ್ತರಗಳೊಂದಿಗೆ ಕ್ವಿಜ್.",
    fields: [
      f({ name: "subject", label: "Subject", labelKn: "ವಿಷಯ", type: "text", required: true, fromProfile: "subjects", placeholder: "e.g. General Knowledge", placeholderKn: "ಉದಾ: ಸಾಮಾನ್ಯ ಜ್ಞಾನ" }),
      f({ name: "gradeLevel", label: "Grade / Class", labelKn: "ದರ್ಜೆ / ತರಗತಿ", type: "select", required: true, options: GRADE_OPTIONS, fromProfile: "teachingLevel" }),
      f({ name: "topic", label: "Topic", labelKn: "ವಿಷಯ", type: "text", required: true, placeholder: "e.g. Solar System", placeholderKn: "ಉದಾ: ಸೌರವ್ಯೂಹ" }),
      f({ name: "numQuestions", label: "Number of questions", labelKn: "ಪ್ರಶ್ನೆಗಳ ಸಂಖ್ಯೆ", type: "select", required: true, options: [
        { value: "5", label: "5", labelKn: "೫" },
        { value: "10", label: "10", labelKn: "೧೦" },
        { value: "15", label: "15", labelKn: "೧೫" },
        { value: "20", label: "20", labelKn: "೨೦" },
      ] }),
      f({ name: "format", label: "Format", labelKn: "ಸ್ವರೂಪ", type: "select", required: true, options: [
        { value: "MCQ only", label: "MCQ only", labelKn: "ಬಹು ಆಯ್ಕೆ ಪ್ರಶ್ನೆಗಳು" },
        { value: "Mixed (MCQ + fill + true/false)", label: "Mixed (MCQ + fill + true/false)", labelKn: "ಮಿಶ್ರ" },
        { value: "Fill in the blanks", label: "Fill in the blanks", labelKn: "ಖಾಲಿ ಜಾಗ ಭರ್ತಿ" },
        { value: "True / False", label: "True / False", labelKn: "ಸರಿ / ತಪ್ಪು" },
      ] }),
    ],
    prompt:
      "Create a fun {{format}} quiz on {{topic}} for {{subject}}, {{gradeLevel}} with {{numQuestions}} questions. Each question must include: the question, 4 options (for MCQ), and the correct answer. Add: 1) A 'How to play' note for the teacher (oral, or printed), 2) An answer key table at the end, 3) 2 bonus 'tricky' questions, 4) A point system suggestion. Keep it engaging and age-appropriate.",
    titleTemplate: "{topic} — Quiz",
  },

  /* ------------------------------ REPORTS ------------------------- */
  {
    id: "observation-report",
    category: "reports",
    icon: "Eye",
    title: "Observation Report",
    titleKn: "ವೀಕ್ಷಣಾ ವರದಿ",
    description:
      "A structured report for observing a trainee teacher's lesson.",
    descriptionKn:
      "ತರಬೇತಿ ಶಿಕ್ಷಕರ ಪಾಠ ವೀಕ್ಷಣೆಗಾಗಿ ರಚನಾತ್ಮಕ ವರದಿ.",
    fields: [
      f({ name: "traineeName", label: "Trainee teacher name", labelKn: "ತರಬೇತಿ ಶಿಕ್ಷಕರ ಹೆಸರು", type: "text", required: true, placeholder: "e.g. Ramesh Kumar" }),
      f({ name: "subject", label: "Subject / class taught", labelKn: "ಬೋಧಿಸಿದ ವಿಷಯ / ತರಗತಿ", type: "text", required: true, fromProfile: "subjects", placeholder: "e.g. Science, Class 8", placeholderKn: "ಉದಾ: ವಿಜ್ಞಾನ, ೮ನೇ ತರಗತಿ" }),
      f({ name: "lessonTopic", label: "Lesson topic", labelKn: "ಪಾಠದ ವಿಷಯ", type: "text", required: true, placeholder: "e.g. Metals and non-metals", placeholderKn: "ಉದಾ: ಲೋಹಗಳು" }),
      f({ name: "date", label: "Date of observation", labelKn: "ವೀಕ್ಷಣಾ ದಿನಾಂಕ", type: "text", required: true, placeholder: "e.g. 15 Aug 2026", placeholderKn: "ಉದಾ: ೧೫ ಆಗಸ್ಟ್ ೨೦೨೬" }),
      f({ name: "focusArea", label: "Focus area", labelKn: "ಗಮನದ ಕ್ಷೇತ್ರ", type: "select", required: true, options: [
        { value: "Overall lesson", label: "Overall lesson", labelKn: "ಸಂಪೂರ್ಣ ಪಾಠ" },
        { value: "Lesson structure", label: "Lesson structure", labelKn: "ಪಾಠ ರಚನೆ" },
        { value: "Student interaction", label: "Student interaction", labelKn: "ವಿದ್ಯಾರ್ಥಿ ಸಂವಹನ" },
        { value: "Classroom management", label: "Classroom management", labelKn: "ತರಗತಿ ನಿರ್ವಹಣೆ" },
        { value: "Questioning technique", label: "Questioning technique", labelKn: "ಪ್ರಶ್ನಿಸುವ ತಂತ್ರ" },
      ] }),
    ],
    prompt:
      "Write a professional observation report for trainee teacher {{traineeName}}, who taught {{lessonTopic}} ({{subject}}) on {{date}}. Focus area: {{focusArea}}. Structure: 1) Header (observer, trainee, date, period), 2) Lesson summary (2-3 sentences), 3) Strengths observed (bullet points with specific examples), 4) Areas for improvement (constructive, specific), 5) Suggested strategies for the trainee, 6) Overall rating (Good / Satisfactory / Needs Improvement) with justification, 7) Observer signature lines. Keep the tone supportive and professional.",
    titleTemplate: "Observation Report — {traineeName}",
  },
  {
    id: "internship-report",
    category: "reports",
    icon: "Briefcase",
    title: "Internship Report",
    titleKn: "ಇಂಟರ್ನ್ಶಿಪ್ ವರದಿ",
    description:
      "A complete teaching internship report for college submission.",
    descriptionKn:
      "ಕಾಲೇಜು ಸಲ್ಲಿಕೆಗಾಗಿ ಸಂಪೂರ್ಣ ಬೋಧನಾ ಇಂಟರ್ನ್ಶಿಪ್ ವರದಿ.",
    fields: [
      f({ name: "name", label: "Your name", labelKn: "ನಿಮ್ಮ ಹೆಸರು", type: "text", required: true, fromProfile: "role", placeholder: "e.g. Priya S" }),
      f({ name: "college", label: "College / University", labelKn: "ಕಾಲೇಜು / ವಿಶ್ವವಿದ್ಯಾಲಯ", type: "text", required: true, placeholder: "e.g. Vijaya Teachers College" }),
      f({ name: "schoolName", label: "Practicing school", labelKn: "ಅಭ್ಯಾಸ ಶಾಲೆ", type: "text", required: true, placeholder: "e.g. Govt High School, Shimoga" }),
      f({ name: "duration", label: "Internship duration", labelKn: "ಇಂಟರ್ನ್ಶಿಪ್ ಅವಧಿ", type: "text", required: true, placeholder: "e.g. 6 weeks (June – July 2026)" }),
      f({ name: "subjectsTaught", label: "Subjects taught", labelKn: "ಬೋಧಿಸಿದ ವಿಷಯಗಳು", type: "text", required: true, fromProfile: "subjects", placeholder: "e.g. Maths and Science, Classes 6-8", placeholderKn: "ಉದಾ: ಗಣಿತ ಮತ್ತು ವಿಜ್ಞಾನ" }),
    ],
    prompt:
      "Write a complete teaching internship report for {{name}} of {{college}}, completed at {{schoolName}} over {{duration}}, teaching {{subjectsTaught}}. Include sections: 1) Title page details (institution, school, name, dates), 2) Introduction & objectives of the internship, 3) Profile of the practicing school (structure, facilities), 4) Description of teaching practice (lessons planned, methods used, aids), 5) Co-curricular activities participated in, 6) Observations about students and classroom dynamics, 7) Challenges faced and how they were handled, 8) Skills developed (map to B.Ed. competencies), 9) Reflection & conclusion, 10) Acknowledgements. Professional, reflective tone, ready for submission.",
    titleTemplate: "Internship Report — {name}",
  },
  {
    id: "action-research",
    category: "reports",
    icon: "FlaskConical",
    title: "Action Research",
    titleKn: "ಕ್ರಿಯಾ ಸಂಶೋಧನೆ",
    description:
      "A structured action research report to solve a classroom problem.",
    descriptionKn:
      "ತರಗತಿಯ ಸಮಸ್ಯೆ ಪರಿಹಾರಕ್ಕಾಗಿ ರಚನಾತ್ಮಕ ಕ್ರಿಯಾ ಸಂಶೋಧನಾ ವರದಿ.",
    fields: [
      f({ name: "problem", label: "Classroom problem", labelKn: "ತರಗತಿಯ ಸಮಸ್ಯೆ", type: "textarea", required: true, placeholder: "e.g. Students struggle to read English words fluently", placeholderKn: "ಉದಾ: ವಿದ್ಯಾರ್ಥಿಗಳು ಇಂಗ್ಲಿಷ್ ಓದಲು ಕಷ್ಟಪಡುತ್ತಾರೆ" }),
      f({ name: "context", label: "Context / class", labelKn: "ಸಂದರ್ಭ / ತರಗತಿ", type: "text", required: true, placeholder: "e.g. Class 5, 40 students", placeholderKn: "ಉದಾ: ೫ನೇ ತರಗತಿ, ೪೦ ವಿದ್ಯಾರ್ಥಿಗಳು" }),
      f({ name: "intervention", label: "Proposed intervention", labelKn: "ಪ್ರಸ್ತಾವಿತ ಪರಿಹಾರ", type: "textarea", required: true, placeholder: "e.g. Daily 15-min phonics games for 6 weeks", placeholderKn: "ಉದಾ: ೬ ವಾರಗಳ ಕಾಲ ದೈನಂದಿನ ೧೫ ನಿಮಿಷ ಧ್ವನಿವಿಜ್ಞಾನ ಆಟಗಳು" }),
      f({ name: "duration", label: "Research duration", labelKn: "ಸಂಶೋಧನಾ ಅವಧಿ", type: "text", required: true, placeholder: "e.g. 6 weeks" }),
    ],
    prompt:
      "Write a complete action research report addressing the problem: '{{problem}}' in {{context}}. Proposed intervention: {{intervention}}, over {{duration}}. Structure: 1) Title & researcher details, 2) Introduction / background of the problem, 3) Objectives of the study, 4) Hypothesis, 5) Methodology (participants, tools — pre-test/post-test, observation), 6) Intervention design with week-wise plan, 7) Data collection & analysis (include a results table), 8) Findings, 9) Conclusions & recommendations for other teachers, 10) References section. Academic but practical tone.",
    titleTemplate: "Action Research — {problem}",
  },
  {
    id: "annual-report",
    category: "reports",
    icon: "BarChart3",
    title: "Annual Report",
    titleKn: "ವಾರ್ಷಿಕ ವರದಿ",
    description:
      "A polished annual report for your school or department.",
    descriptionKn:
      "ನಿಮ್ಮ ಶಾಲೆ ಅಥವಾ ಇಲಾಖೆಗಾಗಿ ಸುಸಜ್ಜಿತ ವಾರ್ಷಿಕ ವರದಿ.",
    fields: [
      f({ name: "schoolName", label: "School / department name", labelKn: "ಶಾಲೆ / ಇಲಾಖೆಯ ಹೆಸರು", type: "text", required: true, placeholder: "e.g. Govt Higher Primary School, Mandya" }),
      f({ name: "academicYear", label: "Academic year", labelKn: "ಶೈಕ್ಷಣಿಕ ವರ್ಷ", type: "text", required: true, placeholder: "e.g. 2025-26", placeholderKn: "ಉದಾ: ೨೦೨೫-೨೬" }),
      f({ name: "highlights", label: "Key highlights", labelKn: "ಪ್ರಮುಖ ಸಾಧನೆಗಳು", type: "textarea", required: true, placeholder: "e.g. 98% SSLC pass rate, won district science fair…", placeholderKn: "ಉದಾ: ಶೇ. ೯೮ ಉತ್ತೀರ್ಣತೆ…" }),
      f({ name: "achievements", label: "Student / staff achievements", labelKn: "ವಿದ್ಯಾರ್ಥಿ / ಸಿಬ್ಬಂದಿ ಸಾಧನೆಗಳು", type: "textarea", placeholder: "e.g. Sports, cultural, competitions…" }),
      f({ name: "enrollment", label: "Student strength", labelKn: "ವಿದ್ಯಾರ್ಥಿಗಳ ಸಂಖ್ಯೆ", type: "text", placeholder: "e.g. 320 students, 12 staff" }),
    ],
    prompt:
      "Write a formal annual report for {{schoolName}} for the academic year {{academicYear}}. Highlights: {{highlights}}. Achievements: {{achievements}}. Student strength: {{enrollment}}. Structure: 1) Introduction / school overview, 2) Academic performance summary (include a simple results table), 3) Co-curricular and sports achievements, 4) Infrastructure and facilities update, 5) Teacher development activities, 6) Community / parent involvement, 7) Challenges and the year ahead, 8) Acknowledgment. Formal, celebratory, ready for a school magazine or PTA meeting.",
    titleTemplate: "Annual Report {academicYear}",
  },

  /* --------------------------- COMMUNICATION ---------------------- */
  {
    id: "parent-message",
    category: "communication",
    icon: "MessagesSquare",
    title: "Parent Message",
    titleKn: "ಪೋಷಕರಿಗೆ ಸಂದೇಶ",
    description:
      "A warm, professional message to send parents.",
    descriptionKn:
      "ಪೋಷಕರಿಗೆ ಕಳುಹಿಸಲು ಆತ್ಮೀಯ, ವೃತ್ತಿಪರ ಸಂದೇಶ.",
    fields: [
      f({ name: "studentName", label: "Student name", labelKn: "ವಿದ್ಯಾರ್ಥಿಯ ಹೆಸರು", type: "text", required: true, placeholder: "e.g. Anitha K" }),
      f({ name: "className", label: "Class / section", labelKn: "ತರಗತಿ / ವಿಭಾಗ", type: "text", required: true, placeholder: "e.g. Class 7 A", placeholderKn: "ಉದಾ: ೭ನೇ ತರಗತಿ" }),
      f({ name: "purpose", label: "Purpose", labelKn: "ಉದ್ದೇಶ", type: "select", required: true, options: [
        { value: "Positive feedback", label: "Positive feedback", labelKn: "ಸಕಾರಾತ್ಮಕ ಪ್ರತಿಕ್ರಿಯೆ" },
        { value: "Concern about progress", label: "Concern about progress", labelKn: "ಪ್ರಗತಿಯ ಬಗ್ಗೆ ಕಾಳಜಿ" },
        { value: "Request a meeting", label: "Request a meeting", labelKn: "ಭೇಟಿಗೆ ವಿನಂತಿ" },
        { value: "Attendance concern", label: "Attendance concern", labelKn: "ಹಾಜರಾತಿ ಕಾಳಜಿ" },
        { value: "General update", label: "General update", labelKn: "ಸಾಮಾನ್ಯ ಮಾಹಿತಿ" },
      ] }),
      f({ name: "details", label: "Specific details", labelKn: "ನಿರ್ದಿಷ್ಟ ವಿವರಗಳು", type: "textarea", placeholder: "e.g. Improvement in maths, but missing homework…" }),
    ],
    prompt:
      "Write a warm, professional parent message for {{studentName}} ({{className}}) about: {{purpose}}. Details: {{details}}. Requirements: 1) Friendly opening with the parent's proper title, 2) Specific, honest feedback, 3) A collaborative tone ('we', not 'you must'), 4) A clear next step or meeting request, 5) Contact details placeholder, 6) Warm closing. Keep it under 150 words, easy to read, and suitable for WhatsApp or letter.",
    titleTemplate: "Parent Message — {studentName}",
  },
  {
    id: "school-notice",
    category: "communication",
    icon: "Megaphone",
    title: "School Notice",
    titleKn: "ಶಾಲಾ ಸೂಚನೆ",
    description:
      "A formal notice with all required details and signature block.",
    descriptionKn:
      "ಎಲ್ಲಾ ಅಗತ್ಯ ವಿವರಗಳು ಮತ್ತು ಸಹಿ ಜಾಗದೊಂದಿಗೆ ಅಧಿಕೃತ ಸೂಚನೆ.",
    fields: [
      f({ name: "noticeSubject", label: "Notice subject", labelKn: "ಸೂಚನೆಯ ವಿಷಯ", type: "text", required: true, placeholder: "e.g. Annual Sports Day", placeholderKn: "ಉದಾ: ವಾರ್ಷಿಕ ಕ್ರೀಡಾ ದಿನ" }),
      f({ name: "date", label: "Notice date", labelKn: "ಸೂಚನಾ ದಿನಾಂಕ", type: "text", required: true, placeholder: "e.g. 10 Aug 2026", placeholderKn: "ಉದಾ: ೧೦ ಆಗಸ್ಟ್ ೨೦೨೬" }),
      f({ name: "details", label: "Details", labelKn: "ವಿವರಗಳು", type: "textarea", required: true, placeholder: "e.g. Event on 26 Aug, 9 am, participation forms due by 20 Aug", placeholderKn: "ಉದಾ: ಕಾರ್ಯಕ್ರಮ ೨೬ ಆಗಸ್ಟ್…" }),
      f({ name: "audience", label: "Audience", labelKn: "ಉದ್ದೇಶಿತ ಪ್ರೇಕ್ಷಕರು", type: "select", required: true, options: [
        { value: "Students", label: "Students", labelKn: "ವಿದ್ಯಾರ್ಥಿಗಳು" },
        { value: "Parents", label: "Parents", labelKn: "ಪೋಷಕರು" },
        { value: "Staff", label: "Staff", labelKn: "ಸಿಬ್ಬಂದಿ" },
        { value: "All", label: "All", labelKn: "ಎಲ್ಲರಿಗೂ" },
      ] }),
    ],
    prompt:
      "Write a formal school notice about: {{noticeSubject}}, dated {{date}}, addressed to {{audience}}. Content: {{details}}. Format: 1) School name line (placeholder), 2) 'NOTICE' heading, 3) Notice title, 4) Date, 5) Body with clear details (what, when, where, who, deadlines), 6) A 'For further details contact' line, 7) Signature block (Name, Designation, School name). Formal, concise, ready to print.",
    titleTemplate: "Notice — {noticeSubject}",
  },
  {
    id: "leave-letter",
    category: "communication",
    icon: "FileText",
    title: "Leave Letter",
    titleKn: "ರಜೆ ಪತ್ರ",
    description:
      "A formal leave application for any reason and duration.",
    descriptionKn:
      "ಯಾವುದೇ ಕಾರಣ ಮತ್ತು ಅವಧಿಗೆ ಅಧಿಕೃತ ರಜೆ ಅರ್ಜಿ.",
    fields: [
      f({ name: "leaveType", label: "Type of leave", labelKn: "ರಜೆಯ ಪ್ರಕಾರ", type: "select", required: true, options: [
        { value: "Casual Leave", label: "Casual Leave", labelKn: "ಆಕಸ್ಮಿಕ ರಜೆ" },
        { value: "Sick Leave", label: "Sick Leave", labelKn: "ಅನಾರೋಗ್ಯ ರಜೆ" },
        { value: "Earned Leave", label: "Earned Leave", labelKn: "ಸಂಪಾದಿತ ರಜೆ" },
        { value: "Emergency", label: "Emergency", labelKn: "ತುರ್ತು" },
        { value: "Other", label: "Other", labelKn: "ಇತರೆ" },
      ] }),
      f({ name: "reason", label: "Reason", labelKn: "ಕಾರಣ", type: "textarea", required: true, placeholder: "e.g. Medical treatment", placeholderKn: "ಉದಾ: ವೈದ್ಯಕೀಯ ಚಿಕಿತ್ಸೆ" }),
      f({ name: "fromDate", label: "From date", labelKn: "ರಜೆ ಆರಂಭ", type: "text", required: true, placeholder: "e.g. 12 Aug 2026", placeholderKn: "ಉದಾ: ೧೨ ಆಗಸ್ಟ್ ೨೦೨೬" }),
      f({ name: "toDate", label: "To date", labelKn: "ರಜೆ ಅಂತ್ಯ", type: "text", required: true, placeholder: "e.g. 14 Aug 2026", placeholderKn: "ಉದಾ: ೧೪ ಆಗಸ್ಟ್ ೨೦೨೬" }),
      f({ name: "recipient", label: "Addressed to", labelKn: "ವಿಳಾಸ", type: "select", required: true, options: [
        { value: "Headmaster / Principal", label: "Headmaster / Principal", labelKn: "ಮುಖ್ಯೋಪಾಧ್ಯಾಯರು" },
        { value: "Block Education Officer", label: "Block Education Officer", labelKn: "ಬಿಇಒ" },
        { value: "Other", label: "Other", labelKn: "ಇತರೆ" },
      ] }),
    ],
    prompt:
      "Write a formal leave application for {{leaveType}} from {{fromDate}} to {{toDate}}, reason: {{reason}}, addressed to the {{recipient}}. Include: 1) Date, 2) Recipient details (name placeholder + school name placeholder), 3) Subject line, 4) Salutation, 5) Body explaining the leave politely with dates and a commitment to complete pending work, 6) Arrangement note for classes (for teachers), 7) Closing and signature lines (Name, Designation). Keep it formal and respectful.",
    titleTemplate: "Leave Letter — {leaveType}",
  },
  {
    id: "event-speech",
    category: "communication",
    icon: "Mic",
    title: "Event Speech",
    titleKn: "ಕಾರ್ಯಕ್ರಮ ಭಾಷಣ",
    description:
      "A well-structured speech for any school event or occasion.",
    descriptionKn:
      "ಯಾವುದೇ ಶಾಲಾ ಕಾರ್ಯಕ್ರಮ ಅಥವಾ ಸಂದರ್ಭಕ್ಕೆ ಉತ್ತಮ ರಚನೆಯ ಭಾಷಣ.",
    fields: [
      f({ name: "event", label: "Event", labelKn: "ಕಾರ್ಯಕ್ರಮ", type: "select", required: true, options: [
        { value: "Annual Day", label: "Annual Day", labelKn: "ವಾರ್ಷಿಕೋತ್ಸವ" },
        { value: "Independence Day", label: "Independence Day", labelKn: "ಸ್ವಾತಂತ್ರ್ಯ ದಿನಾಚರಣೆ" },
        { value: "Republic Day", label: "Republic Day", labelKn: "ಗಣರಾಜ್ಯೋತ್ಸವ" },
        { value: "Kannada Rajyotsava", label: "Kannada Rajyotsava", labelKn: "ಕನ್ನಡ ರಾಜ್ಯೋತ್ಸವ" },
        { value: "Teachers' Day", label: "Teachers' Day", labelKn: "ಶಿಕ್ಷಕರ ದಿನ" },
        { value: "Farewell", label: "Farewell", labelKn: "ವಿದಾಯ" },
        { value: "Welcome", label: "Welcome", labelKn: "ಸ್ವಾಗತ" },
        { value: "Other", label: "Other", labelKn: "ಇತರೆ" },
      ] }),
      f({ name: "audience", label: "Audience", labelKn: "ಪ್ರೇಕ್ಷಕರು", type: "select", required: true, options: [
        { value: "Students & parents", label: "Students & parents", labelKn: "ವಿದ್ಯಾರ್ಥಿಗಳು ಮತ್ತು ಪೋಷಕರು" },
        { value: "Staff", label: "Staff", labelKn: "ಸಿಬ್ಬಂದಿ" },
        { value: "Chief guests", label: "Chief guests", labelKn: "ಮುಖ್ಯ ಅತಿಥಿಗಳು" },
        { value: "General assembly", label: "General assembly", labelKn: "ಸಾಮಾನ್ಯ ಸಭೆ" },
      ] }),
      f({ name: "duration", label: "Speech length", labelKn: "ಭಾಷಣದ ಉದ್ದ", type: "select", required: true, options: [
        { value: "2 minutes", label: "2 minutes", labelKn: "೨ ನಿಮಿಷ" },
        { value: "5 minutes", label: "5 minutes", labelKn: "೫ ನಿಮಿಷ" },
        { value: "10 minutes", label: "10 minutes", labelKn: "೧೦ ನಿಮಿಷ" },
      ] }),
      f({ name: "speakerRole", label: "Your role", labelKn: "ನಿಮ್ಮ ಪಾತ್ರ", type: "select", required: true, options: [
        { value: "Teacher", label: "Teacher", labelKn: "ಶಿಕ್ಷಕ" },
        { value: "Headmaster / Principal", label: "Headmaster / Principal", labelKn: "ಮುಖ್ಯೋಪಾಧ್ಯಾಯರು" },
        { value: "Student", label: "Student", labelKn: "ವಿದ್ಯಾರ್ಥಿ" },
        { value: "Guest", label: "Guest", labelKn: "ಅತಿಥಿ" },
      ] }),
    ],
    prompt:
      "Write a {{duration}} speech for {{event}} as a {{speakerRole}}, addressed to {{audience}}. Structure: 1) Respectful opening (greet dignitaries by role), 2) Occasion significance (1-2 sentences), 3) Main body: 2-3 key points with a short story or example, 4) An inspirational closing and thanks. Include natural pauses suggested with '…' and one rhetorical question. Warm, dignified, and appropriate for a school setting. Provide a Kannada translation note only if the output language is 'both'.",
    titleTemplate: "Speech — {event}",
  },

  /* ------------------------------ UTILITY ------------------------- */
  {
    id: "translation",
    category: "utility",
    icon: "Languages",
    title: "Translation",
    titleKn: "ಅನುವಾದ",
    description:
      "Translate text between English, Kannada and other languages.",
    descriptionKn:
      "ಇಂಗ್ಲಿಷ್, ಕನ್ನಡ ಮತ್ತು ಇತರ ಭಾಷೆಗಳ ನಡುವೆ ಅನುವಾದ.",
    fields: [
      f({ name: "sourceText", label: "Text to translate", labelKn: "ಅನುವಾದಿಸಬೇಕಾದ ಪಠ್ಯ", type: "textarea", required: true, placeholder: "Paste your text here…", placeholderKn: "ನಿಮ್ಮ ಪಠ್ಯವನ್ನು ಇಲ್ಲಿ ಅಂಟಿಸಿ…" }),
      f({ name: "sourceLang", label: "Source language", labelKn: "ಮೂಲ ಭಾಷೆ", type: "select", required: true, options: [
        { value: "English", label: "English", labelKn: "ಇಂಗ್ಲಿಷ್" },
        { value: "Kannada", label: "Kannada", labelKn: "ಕನ್ನಡ" },
        { value: "Hindi", label: "Hindi", labelKn: "ಹಿಂದಿ" },
        { value: "Other", label: "Other", labelKn: "ಇತರೆ" },
      ] }),
      f({ name: "targetLang", label: "Target language", labelKn: "ಗುರಿ ಭಾಷೆ", type: "select", required: true, options: [
        { value: "Kannada", label: "Kannada", labelKn: "ಕನ್ನಡ" },
        { value: "English", label: "English", labelKn: "ಇಂಗ್ಲಿಷ್" },
        { value: "Hindi", label: "Hindi", labelKn: "ಹಿಂದಿ" },
      ] }),
      f({ name: "context", label: "Context / tone", labelKn: "ಸಂದರ್ಭ / ಧ್ವನಿ", type: "select", options: [
        { value: "General", label: "General", labelKn: "ಸಾಮಾನ್ಯ" },
        { value: "Formal / official", label: "Formal / official", labelKn: "ಔಪಚಾರಿಕ" },
        { value: "Teacher-student", label: "Teacher-student", labelKn: "ಶಿಕ್ಷಕ-ವಿದ್ಯಾರ್ಥಿ" },
        { value: "Parent communication", label: "Parent communication", labelKn: "ಪೋಷಕರ ಸಂವಹನ" },
      ] }),
    ],
    prompt:
      "Translate the following text from {{sourceLang}} to {{targetLang}}, in a {{context}} tone. Preserve meaning, formatting (lists, numbers, names) and any educational terminology. If a term has no direct translation, keep it in brackets with a short Kannada explanation. Output ONLY the translation — no preamble. If the output language is 'both', also provide the original next to the translation.",
    titleTemplate: "Translation — {targetLang}",
  },
  {
    id: "circular-simplifier",
    category: "utility",
    icon: "FileCheck2",
    title: "Circular Simplifier",
    titleKn: "ಪರಿಪತ್ರ ಸರಳೀಕರಣ",
    description:
      "Turn a complex government circular into clear, simple points.",
    descriptionKn:
      "ಜಟಿಲ ಸರ್ಕಾರಿ ಪರಿಪತ್ರವನ್ನು ಸರಳ, ಸ್ಪಷ್ಟ ಅಂಶಗಳಾಗಿ ಪರಿವರ್ತಿಸಿ.",
    fields: [
      f({ name: "circularText", label: "Circular text", labelKn: "ಪರಿಪತ್ರದ ಪಠ್ಯ", type: "textarea", required: true, placeholder: "Paste the official circular here…", placeholderKn: "ಅಧಿಕೃತ ಪರಿಪತ್ರವನ್ನು ಇಲ್ಲಿ ಅಂಟಿಸಿ…" }),
      f({ name: "audience", label: "Who needs to act?", labelKn: "ಯಾರು ಕಾರ್ಯನಿರ್ವಹಿಸಬೇಕು?", type: "select", required: true, options: [
        { value: "Teachers", label: "Teachers", labelKn: "ಶಿಕ್ಷಕರು" },
        { value: "Headmasters", label: "Headmasters", labelKn: "ಮುಖ್ಯೋಪಾಧ್ಯಾಯರು" },
        { value: "Parents", label: "Parents", labelKn: "ಪೋಷಕರು" },
        { value: "Students", label: "Students", labelKn: "ವಿದ್ಯಾರ್ಥಿಗಳು" },
      ] }),
      f({ name: "detail", label: "Level of detail", labelKn: "ವಿವರಗಳ ಮಟ್ಟ", type: "select", required: true, options: [
        { value: "Short summary", label: "Short summary", labelKn: "ಸಣ್ಣ ಸಾರಾಂಶ" },
        { value: "Detailed breakdown", label: "Detailed breakdown", labelKn: "ವಿವರವಾದ ವಿಭಜನೆ" },
      ] }),
    ],
    prompt:
      "Simplify the following government circular for {{audience}} at a {{detail}} level. Output: 1) A 3-sentence plain-language summary, 2) 'Key points' as simple bullet points, 3) A table of 'Action needed / Deadline / Who does it', 4) 'Important dates' list, 5) 'Things NOT required' (to remove panic), 6) A one-line message to share on WhatsApp. Avoid official jargon; if technical terms remain, explain them briefly. If the output language is Kannada or both, write in clear Kannada.",
    titleTemplate: "Circular Simplified",
  },

  /* ------------------------------ CAREER -------------------------- */
  {
    id: "resume-builder",
    category: "career",
    icon: "IdCard",
    title: "Resume Builder",
    titleKn: "ರೆಸ್ಯೂಮ್ ಬಿಲ್ಡರ್",
    description:
      "A professional teacher resume ready for any school or interview.",
    descriptionKn:
      "ಯಾವುದೇ ಶಾಲೆ ಅಥವಾ ಸಂದರ್ಶನಕ್ಕೆ ಸಿದ್ಧವಾದ ವೃತ್ತಿಪರ ಶಿಕ್ಷಕರ ರೆಸ್ಯೂಮ್.",
    fields: [
      f({ name: "fullName", label: "Full name", labelKn: "ಪೂರ್ಣ ಹೆಸರು", type: "text", required: true, fromProfile: "role", placeholder: "e.g. Sunita M Patil" }),
      f({ name: "targetRole", label: "Target role", labelKn: "ಗುರಿ ಹುದ್ದೆ", type: "text", required: true, placeholder: "e.g. Primary School Teacher (Kannada medium)", placeholderKn: "ಉದಾ: ಪ್ರಾಥಮಿಕ ಶಾಲಾ ಶಿಕ್ಷಕಿ" }),
      f({ name: "experience", label: "Teaching experience", labelKn: "ಬೋಧನಾ ಅನುಭವ", type: "text", required: true, placeholder: "e.g. 5 years teaching Maths & Science, Classes 6-8", placeholderKn: "ಉದಾ: ೫ ವರ್ಷ…" }),
      f({ name: "education", label: "Education", labelKn: "ವಿದ್ಯಾಭ್ಯಾಸ", type: "text", required: true, placeholder: "e.g. B.Ed., B.Sc (Mathematics), KARTET qualified", placeholderKn: "ಉದಾ: ಬಿಎಡ್, ಬಿಎಸ್ಸಿ…" }),
      f({ name: "skills", label: "Key skills", labelKn: "ಪ್ರಮುಖ ಕೌಶಲ್ಯಗಳು", type: "text", fromProfile: "skills", placeholder: "e.g. Lesson planning, classroom management, digital teaching" }),
      f({ name: "achievements", label: "Achievements", labelKn: "ಸಾಧನೆಗಳು", type: "textarea", placeholder: "e.g. Best teacher award, 100% results…" }),
    ],
    prompt:
      "Create a professional, ATS-friendly resume for {{fullName}} targeting {{targetRole}}. Experience: {{experience}}. Education: {{education}}. Skills: {{skills}}. Achievements: {{achievements}}. Structure: 1) Header (name, phone/email placeholders), 2) Professional summary (3 lines), 3) Core skills (bullet chips), 4) Work experience with action verbs and measurable outcomes, 5) Education & certifications, 6) Achievements, 7) Languages known, 8) Interests (optional). Use clear markdown headings and bullets. One page worth of content.",
    titleTemplate: "Resume — {fullName}",
  },
  {
    id: "cover-letter",
    category: "career",
    icon: "Mail",
    title: "Cover Letter",
    titleKn: "ಕವರ್ ಲೆಟರ್",
    description:
      "A persuasive cover letter tailored to a specific school job.",
    descriptionKn:
      "ನಿರ್ದಿಷ್ಟ ಶಾಲಾ ಹುದ್ದೆಗೆ ಅನುಗುಣವಾದ ಮನವೊಲಿಸುವ ಕವರ್ ಲೆಟರ್.",
    fields: [
      f({ name: "role", label: "Position applying for", labelKn: "ಅರ್ಜಿ ಸಲ್ಲಿಸುವ ಹುದ್ದೆ", type: "text", required: true, placeholder: "e.g. High School Science Teacher", placeholderKn: "ಉದಾ: ಪ್ರೌಢಶಾಲಾ ವಿಜ್ಞಾನ ಶಿಕ್ಷಕ" }),
      f({ name: "schoolName", label: "School name", labelKn: "ಶಾಲೆಯ ಹೆಸರು", type: "text", required: true, placeholder: "e.g. Oxford Public School, Hubballi" }),
      f({ name: "name", label: "Your name", labelKn: "ನಿಮ್ಮ ಹೆಸರು", type: "text", required: true, fromProfile: "role", placeholder: "e.g. Mahesh Gowda" }),
      f({ name: "experience", label: "Experience highlights", labelKn: "ಅನುಭವದ ಮುಖ್ಯಾಂಶಗಳು", type: "textarea", required: true, placeholder: "e.g. 4 years, improved SSLC results by 15%, digital classroom experience" }),
    ],
    prompt:
      "Write a persuasive cover letter from {{name}} for the position of {{role}} at {{schoolName}}. Experience highlights: {{experience}}. Structure: 1) Date and recipient block, 2) Subject line, 3) Opening — position and enthusiasm, 4) Body paragraph 1 — experience & results (with numbers), 5) Body paragraph 2 — how you fit this specific school (mention Kannada/English medium, values, co-curriculars), 6) Closing — call to action and availability, 7) Signature. Confident, humble, specific. Under 350 words.",
    titleTemplate: "Cover Letter — {role}",
  },
  {
    id: "interview-prep",
    category: "career",
    icon: "UserCheck",
    title: "Interview Prep",
    titleKn: "ಸಂದರ್ಶನ ಸಿದ್ಧತೆ",
    description:
      "Likely interview questions with strong model answers.",
    descriptionKn:
      "ಸಂಭವನೀಯ ಸಂದರ್ಶನ ಪ್ರಶ್ನೆಗಳು ಮತ್ತು ಉತ್ತಮ ಮಾದರಿ ಉತ್ತರಗಳು.",
    fields: [
      f({ name: "role", label: "Position", labelKn: "ಹುದ್ದೆ", type: "text", required: true, placeholder: "e.g. TGT Mathematics", placeholderKn: "ಉದಾ: ಗಣಿತ ಶಿಕ್ಷಕ" }),
      f({ name: "experience", label: "Your experience", labelKn: "ನಿಮ್ಮ ಅನುಭವ", type: "text", required: true, placeholder: "e.g. 3 years, Classes 5-10", placeholderKn: "ಉದಾ: ೩ ವರ್ಷ…" }),
      f({ name: "subjectArea", label: "Subject area", labelKn: "ವಿಷಯ ಕ್ಷೇತ್ರ", type: "text", required: true, fromProfile: "subjects", placeholder: "e.g. Mathematics", placeholderKn: "ಉದಾ: ಗಣಿತ" }),
      f({ name: "questionTypes", label: "Question types", labelKn: "ಪ್ರಶ್ನೆ ಪ್ರಕಾರಗಳು", type: "select", required: true, options: [
        { value: "All types", label: "All types", labelKn: "ಎಲ್ಲಾ ಪ್ರಕಾರಗಳು" },
        { value: "General + situational", label: "General + situational", labelKn: "ಸಾಮಾನ್ಯ + ಸನ್ನಿವೇಶ" },
        { value: "Subject knowledge", label: "Subject knowledge", labelKn: "ವಿಷಯ ಜ್ಞಾನ" },
        { value: "Pedagogy", label: "Pedagogy", labelKn: "ಬೋಧನಾ ವಿಧಾನ" },
      ] }),
    ],
    prompt:
      "Prepare me for a teacher interview for {{role}} (experience: {{experience}}, subject: {{subjectArea}}). Question types: {{questionTypes}}. Provide: 1) 12 likely interview questions grouped by type, 2) A strong model answer for each (2-4 sentences, specific, using my experience), 3) 3 questions I should ask the panel, 4) 5 do's and 5 don'ts, 5) A 30-second 'tell me about yourself' script, 6) 3 common tricky questions (e.g., 'Why should we hire you?') with punchy answers. Practical and honest.",
    titleTemplate: "Interview Prep — {role}",
  },
  {
    id: "demo-class-planner",
    category: "career",
    icon: "School",
    title: "Demo Class Planner",
    titleKn: "ಪ್ರಾತ್ಯಕ್ಷಿಕೆ ತರಗತಿ ಯೋಜಕ",
    description:
      "A minute-by-minute demo lesson plan that impresses the panel.",
    descriptionKn:
      "ನಿರ್ಣಾಯಕರನ್ನು ಮೆಚ್ಚಿಸುವ ನಿಮಿಷ-ನಿಮಿಷಕ್ಕೆ ಪ್ರಾತ್ಯಕ್ಷಿಕೆ ಪಾಠ ಯೋಜನೆ.",
    fields: [
      f({ name: "topic", label: "Demo topic", labelKn: "ಪ್ರಾತ್ಯಕ್ಷಿಕೆ ವಿಷಯ", type: "text", required: true, placeholder: "e.g. Trigonometry basics", placeholderKn: "ಉದಾ: ತ್ರಿಕೋನಮಿತಿ" }),
      f({ name: "subject", label: "Subject", labelKn: "ವಿಷಯ", type: "text", required: true, fromProfile: "subjects", placeholder: "e.g. Mathematics", placeholderKn: "ಉದಾ: ಗಣಿತ" }),
      f({ name: "gradeLevel", label: "Grade / Class", labelKn: "ದರ್ಜೆ / ತರಗತಿ", type: "select", required: true, options: GRADE_OPTIONS, fromProfile: "teachingLevel" }),
      f({ name: "duration", label: "Demo duration", labelKn: "ಅವಧಿ", type: "select", required: true, options: DURATION_OPTIONS }),
      f({ name: "panel", label: "Panel type", labelKn: "ನಿರ್ಣಾಯಕರ ತಂಡ", type: "select", required: true, options: [
        { value: "School selection panel", label: "School selection panel", labelKn: "ಶಾಲಾ ಆಯ್ಕೆ ಸಮಿತಿ" },
        { value: "District / BEO panel", label: "District / BEO panel", labelKn: "ಜಿಲ್ಲಾ / ಬಿಇಒ ಸಮಿತಿ" },
        { value: "Private school panel", label: "Private school panel", labelKn: "ಖಾಸಗಿ ಶಾಲಾ ಸಮಿತಿ" },
      ] }),
    ],
    prompt:
      "Create a winning demo-class plan on {{topic}} for {{subject}}, {{gradeLevel}}, for a {{duration}} demo before a {{panel}}. Provide: 1) The one 'wow' hook to open with (30-60 sec), 2) A minute-by-minute timeline table (Time / Activity / What the panel observes), 3) 2 student questions you will ask, 4) The board work you will do (outline), 5) One simple teaching aid you can make the night before, 6) Likely panel questions after the demo with answers, 7) Common mistakes to avoid, 8) A confident 10-second closing line. Make it genuinely impressive and executable.",
    titleTemplate: "Demo Class — {topic}",
  },
];

export const TOOL_BY_ID: Record<string, ToolDef> = Object.fromEntries(
  TOOLS.map((tool) => [tool.id, tool]),
);

export function getTool(id: string): ToolDef | undefined {
  return TOOL_BY_ID[id];
}

/** Build the tool-specific Gemini prompt from parameters + profile. */
export function buildToolPrompt(
  tool: ToolDef,
  parameters: Record<string, string>,
  profile: ProfileContext,
  outputLanguage: OutputLanguage,
): string {
  const filled = tool.prompt.replace(/\{\{(\w+)\}\}/g, (_m, key: string) => {
    const value = parameters[key]?.trim();
    return value && value !== "" ? value : `[${key}]`;
  });

  const profileLines = [
    `Teacher name: ${profile.name ?? "Not specified"}`,
    `Role: ${profile.role ?? "Teacher"}`,
    `Teaching level: ${profile.teachingLevel ?? "Not specified"}`,
    `Subjects: ${profile.subjects?.length ? profile.subjects.join(", ") : "Not specified"}`,
    `District: ${profile.district ?? "Not specified"}`,
    `Digital skill level: ${profile.digitalSkillLevel ?? "Not specified"}`,
  ];

  const languageInstructions: Record<OutputLanguage, string> = {
    en: "Write the entire response in English.",
    kn: "Write the entire response in Kannada (ಕನ್ನಡ). Use clear, natural Kannada that a Karnataka school teacher and their students will understand. Keep technical/English terms in brackets where helpful.",
    both: "Write the response in BOTH languages: first the complete English version, then a complete Kannada (ಕನ್ನಡ) translation in a separate clearly-marked section.",
  };

  return [
    "TASK:",
    filled,
    "",
    "TEACHER PROFILE (use it to personalise the output where relevant):",
    ...profileLines.map((line) => `- ${line}`),
    "",
    "OUTPUT REQUIREMENTS:",
    languageInstructions[outputLanguage],
    "- Format the output as clean Markdown: use headings (## and ###), bullet/numbered lists, and tables where useful.",
    "- Keep it practical and immediately usable in a Karnataka school context (state board alignment where relevant).",
    "- Use simple, respectful language. Do not invent facts about the teacher; use placeholders like [Name], [School] when information is missing.",
  ].join("\n");
}

/** Build a saved-document title from the tool + parameters. */
export function buildDocumentTitle(
  tool: ToolDef,
  parameters: Record<string, string>,
): string {
  if (tool.titleTemplate) {
    const filled = tool.titleTemplate.replace(
      /\{(\w+)\}/g,
      (_m, key: string) => parameters[key]?.trim() || tool.title,
    );
    return filled;
  }
  return tool.title;
}
