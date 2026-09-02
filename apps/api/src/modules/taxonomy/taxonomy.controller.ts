import type { Request, Response } from "express";
import {
  getOccupation,
  getSector,
  getSkill,
  listOccupations,
  listSectors,
  listSkills,
  resolveTerm,
} from "./taxonomy.service";

export async function getSkills(req: Request, res: Response): Promise<void> {
  const body = await listSkills(req.query);
  res.status(200).json(body);
}

export async function getSkillById(req: Request, res: Response): Promise<void> {
  const body = await getSkill(req.params.id ?? "");
  res.status(200).json(body);
}

export async function getOccupations(
  req: Request,
  res: Response,
): Promise<void> {
  const body = await listOccupations(req.query);
  res.status(200).json(body);
}

export async function getOccupationById(
  req: Request,
  res: Response,
): Promise<void> {
  const body = await getOccupation(req.params.id ?? "");
  res.status(200).json(body);
}

export async function getSectors(req: Request, res: Response): Promise<void> {
  const body = await listSectors(req.query);
  res.status(200).json(body);
}

export async function getSectorById(req: Request, res: Response): Promise<void> {
  const body = await getSector(req.params.id ?? "");
  res.status(200).json(body);
}

export async function getNormalizedTerm(
  req: Request,
  res: Response,
): Promise<void> {
  const term = typeof req.query.term === "string" ? req.query.term : "";
  const body = await resolveTerm(term);
  res.status(200).json(body);
}
