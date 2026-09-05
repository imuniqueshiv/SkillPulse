import { Router, Request, Response } from "express";
import { JobsService } from "./jobs.service";

export const jobsRouter = Router();

jobsRouter.get("/", async (req: Request, res: Response) => {
  try {
    const search = req.query.search as string | undefined;
    const state = req.query.state as string | undefined;
    const sector = req.query.sector as string | undefined;
    const minConfidence = req.query.minConfidence ? parseFloat(req.query.minConfidence as string) : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
    const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;

    const result = await JobsService.listJobs({ search, state, sector, minConfidence, limit, offset });
    res.json({ status: "success", ...result });
  } catch (error: any) {
    res.status(500).json({ status: "error", message: error.message || "Failed to fetch jobs" });
  }
});

jobsRouter.get("/analytics/summary", async (_req: Request, res: Response) => {
  try {
    const analytics = await JobsService.getAnalyticsSummary();
    res.json({ status: "success", data: analytics });
  } catch (error: any) {
    res.status(500).json({ status: "error", message: error.message || "Failed to fetch job analytics" });
  }
});

jobsRouter.get("/:id", async (req: Request, res: Response) => {
  try {
    const id = (req.params.id as string) || "";
    const job = await JobsService.getJobById(id);
    res.json({ status: "success", data: job });
  } catch (error: any) {
    res.status(500).json({ status: "error", message: error.message || "Failed to fetch job details" });
  }
});
