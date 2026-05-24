import type { ReviewFinding } from "@/lib/types";
import { getAnalysisForEngagement } from "@/lib/engagement-analysis";
import { DEFAULT_ENGAGEMENT_NAME } from "@/lib/customer-management";
import { toReviewFindings } from "@/lib/advisory-mappers";

/** Default inbox findings for the primary engagement (Horizon Logistics LLC). */
export const INITIAL_REVIEW_FINDINGS: ReviewFinding[] = toReviewFindings(
  getAnalysisForEngagement(DEFAULT_ENGAGEMENT_NAME)
);
