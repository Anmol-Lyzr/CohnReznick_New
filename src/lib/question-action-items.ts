import type { FollowUpQuestion, IssueLogEntry } from "@/lib/advisory-output-types";
import type { SkillActionProposal } from "@/lib/skill-action-types";

export function buildQuestionActionProposal(
  question: FollowUpQuestion,
  issue: IssueLogEntry
): SkillActionProposal {
  return {
    title: question.question_text,
    category: `${question.category.replace(/_/g, " ")} · P${question.priority}`,
    rationale: [
      `Management question ${question.question_id} linked to ${issue.issue_id} (${issue.account_name}).`,
      question.context_note,
      question.requires_documentation ? "Documentation request flagged for diligence file." : null,
      `Question type: ${question.question_type.replace(/_/g, " ")}.`,
    ]
      .filter(Boolean)
      .join(" "),
    impactIfAccepted: `Question will appear on the management / diligence call agenda and in the exported agenda pack. Report drafting primary question for ${issue.issue_id} may use this wording when set as INCLUDED.`,
    costOfRejection: `If excluded or deferred without follow-up, management discussion may have a coverage gap for ${issue.account_name}. Defensibility of the ${issue.severity} finding weakens if this topic is not addressed.`,
    actionItem: `Agenda decision — ${question.category.replace(/_/g, " ")}`,
    actionDescription: `Decide whether this P${question.priority} question is asked on the management call, deferred to post-close, or excluded as immaterial or already answered.`,
    metrics: [
      { label: "Priority", value: `P${question.priority}` },
      { label: "Category", value: question.category.replace(/_/g, " ") },
      { label: "Doc required", value: question.requires_documentation ? "Yes" : "No" },
    ],
    type: `QUESTION_${question.question_type}`,
  };
}

export function getQuestionOutcomeMessage(
  status: FollowUpQuestion["agenda_status"],
  proposal: SkillActionProposal
): string | null {
  if (status === "INCLUDED" || status === "EDITED") return `Included — ${proposal.impactIfAccepted}`;
  if (status === "DEFERRED" || status === "EXCLUDED") return `${status} — ${proposal.costOfRejection}`;
  return null;
}
