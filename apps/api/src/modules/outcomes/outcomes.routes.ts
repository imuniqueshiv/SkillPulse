import { Router, Request, Response } from "express";
import { OutcomesService } from "./outcomes.service";

export const outcomesRouter = Router();

outcomesRouter.get("/", async (_req: Request, res: Response) => {
  try {
    const result = await OutcomesService.getOutcomeMetrics();
    res.json({ status: "success", data: result });
  } catch (error: any) {
    res.status(500).json({ status: "error", message: error.message || "Failed to fetch outcome metrics" });
  }
});

outcomesRouter.post("/feedback", async (req: Request, res: Response) => {
  try {
    const { recommendationId, skillId, rating, comments, expertRole } = req.body;
    if (!rating || !comments) {
      res.status(400).json({ status: "error", message: "Rating and comments are required." });
      return;
    }

    const result = await OutcomesService.submitFeedback({
      recommendationId,
      skillId,
      rating: Number(rating),
      comments,
      expertRole: expertRole || "Public Audit Expert"
    });

    res.json({ status: "success", ...result });
  } catch (error: any) {
    res.status(500).json({ status: "error", message: error.message || "Failed to record feedback" });
  }
});
