/**
 * Vetted harm-reduction and recovery education.
 *
 * This content is authored and reviewed by humans, not generated. EVI chooses
 * which topic is relevant; the application renders the text below verbatim.
 * That boundary is deliberate: a language model must never improvise health
 * guidance for someone in withdrawal or at overdose risk.
 *
 * Nothing here is dosing guidance or a substitute for medical care.
 */

export const RESOURCE_TOPICS = [
  "naloxone",
  "tolerance_loss",
  "treatment_options",
  "withdrawal",
  "never_use_alone",
] as const;

export type ResourceTopic = (typeof RESOURCE_TOPICS)[number];

export type Resource = {
  topic: ResourceTopic;
  title: string;
  summary: string;
  points: string[];
  source: string;
};

export const RESOURCES: Record<ResourceTopic, Resource> = {
  naloxone: {
    topic: "naloxone",
    title: "Naloxone (Narcan) basics",
    summary:
      "Naloxone reverses an opioid overdose. It is safe to give even if you are not certain opioids are involved.",
    points: [
      "Available without a prescription at most pharmacies in the US, and free from many local harm-reduction programs.",
      "Give it, then call 911. Naloxone can wear off before the opioid does.",
      "It does not work on overdoses that involve only alcohol, benzodiazepines, or stimulants, but it will not cause harm if given.",
      "Keep it where someone else can find it, and tell one person where that is.",
    ],
    source: "SAMHSA Opioid Overdose Prevention Toolkit",
  },
  tolerance_loss: {
    topic: "tolerance_loss",
    title: "Why the risk spikes after a break",
    summary:
      "Tolerance falls fast after even a few days without use. A dose that felt ordinary before a break can be fatal after one.",
    points: [
      "Risk is highest in the first two weeks after detox, hospitalization, or release from jail.",
      "If you do use after a break, using less than you used to is the single most protective thing you can do.",
      "Do not use alone. Have naloxone within reach.",
      "Mixing with alcohol or benzodiazepines sharply raises overdose risk.",
    ],
    source: "WHO guidance on opioid overdose; CDC overdose prevention",
  },
  treatment_options: {
    topic: "treatment_options",
    title: "Treatment paths worth asking about",
    summary:
      "Medication for opioid use disorder is the most effective treatment available, and it is a legitimate long-term option.",
    points: [
      "Buprenorphine and methadone both substantially reduce overdose death. Naltrexone is another option.",
      "Staying on medication long-term is normal and is not a failure of recovery.",
      "SAMHSA's national helpline is 1-800-662-4357, free and confidential, 24/7.",
      "A primary care doctor can prescribe buprenorphine. You do not always need a specialty clinic.",
    ],
    source: "SAMHSA National Helpline; NIDA Medications for Opioid Use Disorder",
  },
  withdrawal: {
    topic: "withdrawal",
    title: "Withdrawal, and when it is dangerous",
    summary:
      "Most opioid withdrawal is agonizing but not life-threatening. Alcohol and benzodiazepine withdrawal can be.",
    points: [
      "Alcohol or benzodiazepine withdrawal can cause seizures. Do not stop those abruptly on your own; get medical supervision.",
      "Opioid withdrawal peaks within a few days. Dehydration from vomiting and diarrhea is the main physical danger.",
      "Withdrawal is not a required rite of passage. Medication can prevent most of it.",
      "Go to an emergency room for seizures, confusion, chest pain, or inability to keep fluids down.",
    ],
    source: "NIDA; SAMHSA TIP 45 detoxification guidance",
  },
  never_use_alone: {
    topic: "never_use_alone",
    title: "If you are going to use anyway",
    summary:
      "Being met with a plan instead of a lecture keeps people alive. These steps reduce the chance this becomes fatal.",
    points: [
      "Never Use Alone: call 1-800-484-3731 and someone stays on the line and sends help if you stop responding.",
      "Do a small test amount first, especially from a new source.",
      "Unlock the door so help can reach you.",
      "Fentanyl test strips are legal in most states and available free from harm-reduction programs.",
    ],
    source: "Never Use Alone hotline; National Harm Reduction Coalition",
  },
};

/** Returns the vetted resource for a topic, or null when the topic is unknown. */
export function getResource(topic: unknown): Resource | null {
  if (typeof topic !== "string") return null;
  return RESOURCES[topic as ResourceTopic] ?? null;
}
