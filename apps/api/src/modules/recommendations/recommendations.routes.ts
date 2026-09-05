import { Router, Request, Response } from "express";
import { RecommendationsService } from "./recommendations.service";

export const recommendationsRouter = Router();

recommendationsRouter.get("/", async (req: Request, res: Response) => {
  try {
    const targetRole = req.query.targetRole as string | undefined;
    const domain = req.query.domain as string | undefined;
    const minConfidence = req.query.minConfidence ? parseFloat(req.query.minConfidence as string) : undefined;

    const result = await RecommendationsService.listRecommendations({ targetRole, domain, minConfidence });
    res.json({ status: "success", ...result });
  } catch (error: any) {
    res.status(500).json({ status: "error", message: error.message || "Failed to fetch recommendations" });
  }
});

recommendationsRouter.get("/:id", async (req: Request, res: Response) => {
  try {
    const id = (req.params.id as string) || "";
    const result = await RecommendationsService.getRecommendationById(id);
    res.json({ status: "success", data: result });
  } catch (error: any) {
    res.status(500).json({ status: "error", message: error.message || "Failed to fetch recommendation details" });
  }
});
