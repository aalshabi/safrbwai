import type { Locale } from "@/lib/i18n/config";
import type { SuggestedQuestion } from "@/lib/offer-pipeline/analysis/types";
import { localizeBi } from "./format-result-value";

export const SAFRBWAI_URL = "https://www.safrbwai.com";
export const MAX_COPIED_QUESTIONS = 5;

export interface QuestionCopyLabels {
  title: string;
  reviewedWith: string;
}

export function getCopyableQuestions(
  questions: readonly SuggestedQuestion[],
  locale: Locale,
  max = MAX_COPIED_QUESTIONS
): string[] {
  return questions
    .slice(0, max)
    .map((question) => localizeBi(question.question, locale))
    .filter((question) => question.length > 0);
}

export function formatQuestionsForCopy(
  questions: readonly SuggestedQuestion[],
  locale: Locale,
  labels: QuestionCopyLabels,
  /** Questions from inferred concerns, copied after the suggested ones and not counted against the cap. */
  concernQuestions: readonly SuggestedQuestion[] = []
): string {
  const copyableQuestions = [
    ...getCopyableQuestions(questions, locale),
    ...getCopyableQuestions(concernQuestions, locale, concernQuestions.length),
  ];
  if (copyableQuestions.length === 0) return "";

  const numberedQuestions = copyableQuestions.map(
    (question, index) => `${index + 1}. ${question}`
  );

  return [
    `${labels.title}:`,
    "",
    ...numberedQuestions,
    "",
    `${labels.reviewedWith}:`,
    SAFRBWAI_URL,
  ].join("\n");
}
