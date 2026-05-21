"use client";

import { useState, useEffect } from "react";
import { Upload } from "lucide-react";
import { useAdvisoryJourney } from "@/hooks/use-advisory-journey";
import { JourneyLayout, ToolbarFileInput } from "@/components/journey-layout";
import { ClientNameDropdown } from "@/components/client-name-dropdown";
import { useEngagementSelection } from "@/hooks/use-engagement-selection";
import { SAMPLE_INPUTS, loadSampleOutput } from "@/lib/sample-data";

export default function TrialBalanceIngestion() {
  const { state, execute, loadSampleData } = useAdvisoryJourney();
  const { engagementName, setEngagementName, profile, engagementNames, customNames } = useEngagementSelection();
  const [file, setFile] = useState<File | undefined>();

  const applySample = async () => {
    const s = SAMPLE_INPUTS["trial-balance-ingestion"];
    setEngagementName(s.engagementName as string);
    const { activities, output, analysis } = await loadSampleOutput("trial-balance-ingestion", engagementName);
    loadSampleData(activities, output, "trial-balance-ingestion", analysis);
  };

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("sample") === "true") applySample();
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
      executeDisabled={!engagementName}
      formContent={
        <>
          <ClientNameDropdown
            value={engagementName}
            onChange={setEngagementName}
            names={engagementNames}
            customNames={customNames}
            variant="field"
          />
          <ToolbarFileInput
            label="Trial balance file"
            accept=".xlsx,.xls,.csv"
            onChange={setFile}
            hint="PoC sample: CohnReznick_TB_Input_File_v2.xlsx"
            className="max-w-lg flex-[2]"
          />
        </>
      }
    />
  );
}
