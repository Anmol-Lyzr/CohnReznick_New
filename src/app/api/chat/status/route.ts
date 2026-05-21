/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextRequest, NextResponse } from "next/server";
import { jobStorage } from "@/lib/supabase/jobStorage";

export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get("jobId");

  if (!jobId) {
    return NextResponse.json({ error: "Job ID is required", status: "failed" });
  }

  const job = await jobStorage.getJob(jobId);

  if (!job) {
    return NextResponse.json({ error: "Job not found", status: "failed" });
  }

  const response = {
    status: job.status,
    results: job.status === "completed" ? job.results : undefined,
    error: job.error,
    errorCode: job.error_code,
  };

  return NextResponse.json(response);
}
