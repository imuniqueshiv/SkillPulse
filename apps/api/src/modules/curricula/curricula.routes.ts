import { Router, Request, Response } from "express";
import { CurriculaService } from "./curricula.service";

export const curriculaRouter = Router();

curriculaRouter.get("/", async (_req: Request, res: Response) => {
  try {
    const result = await CurriculaService.listCurricula();
    res.json({ status: "success", ...result });
  } catch (error: any) {
    res.status(500).json({ status: "error", message: error.message || "Failed to fetch curricula" });
  }
});

curriculaRouter.get("/gaps", async (req: Request, res: Response) => {
  try {
    const sector = req.query.sector as string | undefined;
    const minSeverity = req.query.minSeverity ? parseFloat(req.query.minSeverity as string) : undefined;
    const result = await CurriculaService.getGapAnalysis({ sector, minSeverity });
    res.json({ status: "success", ...result });
  } catch (error: any) {
    res.status(500).json({ status: "error", message: error.message || "Failed to analyze curriculum gaps" });
  }
});

curriculaRouter.get("/:id/gaps", async (req: Request, res: Response) => {
  try {
    const id = (req.params.id as string) || "";
    const result = await CurriculaService.getCurriculumGapById(id);
    res.json({ status: "success", data: result });
  } catch (error: any) {
    res.status(500).json({ status: "error", message: error.message || "Failed to fetch specific curriculum gap" });
  }
});
