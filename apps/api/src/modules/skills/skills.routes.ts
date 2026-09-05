import { Router, Request, Response } from "express";
import { SkillsService } from "./skills.service";

export const skillsRouter = Router();

skillsRouter.get("/", async (req: Request, res: Response) => {
  try {
    const search = req.query.search as string | undefined;
    const category = req.query.category as string | undefined;
    const domain = req.query.domain as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
    const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;

    const result = await SkillsService.listSkills({ search, category, domain, limit, offset });
    res.json({ status: "success", ...result });
  } catch (error: any) {
    res.status(500).json({ status: "error", message: error.message || "Failed to fetch skills" });
  }
});

skillsRouter.get("/demand", async (_req: Request, res: Response) => {
  try {
    const demand = await SkillsService.getSkillDemandRanking();
    res.json({ status: "success", data: demand });
  } catch (error: any) {
    res.status(500).json({ status: "error", message: error.message || "Failed to fetch skill demand ranking" });
  }
});

skillsRouter.get("/:id", async (req: Request, res: Response) => {
  try {
    const id = (req.params.id as string) || "";
    const skill = await SkillsService.getSkillById(id);
    res.json({ status: "success", data: skill });
  } catch (error: any) {
    res.status(500).json({ status: "error", message: error.message || "Failed to fetch skill details" });
  }
});
