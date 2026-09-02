import type { Request, Response } from "express";
import {
  createDataSource,
  getDataSource,
  listDataSources,
  updateDataSource,
} from "./data-source.service";

export async function getDataSources(
  req: Request,
  res: Response,
): Promise<void> {
  const body = await listDataSources(req.query);
  res.status(200).json(body);
}

export async function getDataSourceById(
  req: Request,
  res: Response,
): Promise<void> {
  const body = await getDataSource(req.params.id ?? "");
  res.status(200).json(body);
}

export async function postDataSource(
  req: Request,
  res: Response,
): Promise<void> {
  const body = await createDataSource(req.body);
  res.status(201).json(body);
}

export async function patchDataSource(
  req: Request,
  res: Response,
): Promise<void> {
  const body = await updateDataSource(req.params.id ?? "", req.body);
  res.status(200).json(body);
}
