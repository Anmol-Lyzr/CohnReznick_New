/** Shared proposal shape for skill action modals */
export interface SkillActionProposal {
  title: string;
  category: string;
  rationale: string;
  impactIfAccepted: string;
  costOfRejection: string;
  actionItem: string;
  actionDescription: string;
  metrics: { label: string; value: string }[];
  type: string;
}
