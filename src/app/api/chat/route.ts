import { jobStorage } from "@/lib/supabase/jobStorage";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { agentChat } from "@/lib/lyzr-api/agentChat";

export const POST = async () => {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token");

    console.log("token", token);

  
    const jobId = await jobStorage.createJob("ocr");

    if (!jobId) {
      return NextResponse.json(
        { error: "Failed to parse PDF" },
        { status: 500 }
      );
    }

    processJob(jobId);

    return NextResponse.json({
      status: "success",
      jobId: jobId,
      error: null,
    });
  } catch (error) {
    console.log("Error", error);
    return NextResponse.json({ error: "Failed to parse PDF" }, { status: 500 });
  }
};

const processJob = async (jobId: string) => {
  try {

    const response = (await agentChat("Hello", "123", "123")) as {
      success?: boolean;
      status?: number | string;
      data?: { success?: string; data?: unknown };
    };

    const job = await jobStorage.getJob(jobId);

    if (!job) {
      return;
    }

    if (response.success === false) {
      jobStorage.updateJob(jobId, {
        status: "failed",
        error_code: typeof response.status === "number" ? response.status : 500,
      });
    }

    const data = response.data;

    if (data?.success == "error") {
      jobStorage.updateJob(jobId, {
        status: "failed",
        error_code: 500,
      });
      return;
    }

    if (data?.data != null) jobStorage.appendResult(jobId, [data.data]);
  } catch (error) {
    console.error("Job Processing Error:", error);
    jobStorage.updateJob(jobId, {
      status: "failed",
      error: "Processing failed due to an error",
    });
  }
};


