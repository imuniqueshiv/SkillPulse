import { randomUUID } from "node:crypto";
import type { NextFunction, Request, RequestHandler, Response } from "express";

const HEADER = "x-request-id";

export function requestId(): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const incoming = req.header(HEADER)?.trim();
    const id =
      incoming && incoming.length > 0 && incoming.length <= 128
        ? incoming
        : randomUUID();
    req.requestId = id;
    res.setHeader(HEADER, id);
    next();
  };
}
