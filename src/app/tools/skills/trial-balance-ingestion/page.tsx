"use client";

import { useState, useEffect } from "react";
import { Upload } from "lucide-react";
import { useAdvisoryJourney } from "@/hooks/use-advisory-journey";
import { JourneyLayout, ToolbarFileInput } from "@/components/journey-layout";
import { ClientNameDropdown } from "@/components/client-name-dropdown";
import { useEngagementSelection } from "@/hooks/use-engagement-selection";
import { resolvePoCSampleEngagement } from "@/lib/client-sample-guard";
import { SAMPLE_INPUTS, loadSampleOutput } from "@/lib/sample-data";

export default function TrialBalanceIngestion() {
  const { state, execute, loadSampleData } = useAdvisoryJourney();
  const { engagementName, setEngagementName, profile, engagementNames, builtInNames } =
    useEngagementSelection();
  const [file, setFile] = useState<File | undefined>();
  const isCustomClient =
    Boolean(engagementName) && !builtInNames.includes(engagementName);

  const applySample = async () => {
    const s = SAMPLE_INPUTS["trial-balance-ingestion"];
    const params = new URLSearchParams(window.location.search);
    const name = resolvePoCSampleEngagement(
      params.get("client"),
      (s.engagementName as string) || engagementName
    );
    if (!name) return;
    setEngagementName(name);
    const { activities, output, analysis } = await loadSampleOutput("trial-balance-ingestion", name);
    loadSampleData(activities, output, "trial-balance-ingestion", analysis);
  };

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("sample") !== "true") return;
    void applySample();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <JourneyLayout
      skillId="trial-balance-ingestion"
      title="Trial Balance Ingestion"
      subtitle="Upload and normalize 36 months of trial-balance data into clean monthly views"
      icon={Upload}
      state={state}
      onExecute={() =>
        execute(
          "trial-balance-ingestion",
          {
            engagementName,
            engagementType: profile?.engagementType ?? "Financial Diligence",
            periodRange: "36 months",
            fileName: file?.name,
          },
          file
        )
      }
      executeLabel="Ingest & Normalize"
      executeDisabled={!engagementName.trim() || (isCustomClient && !file)}
      formContent={
        <>
          <ClientNameDropdown
            value={engagementName}
            onChange={setEngagementName}
            names={engagementNames}
            variant="field"
          />
          <ToolbarFileInput
            label="Trial balance file"
            accept=".xlsx,.xls,.csv"
            onChange={setFile}
            hint={
              isCustomClient
                ? "Required for new clients — upload CSV or XLSX trial balance"
                : "PoC sample: TB_Horizon_FY25.csv (per selected client)"
            }
            className="max-w-lg flex-[2]"
          />
        </>
      }
    />
  );
}
