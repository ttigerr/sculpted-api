import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { HttpError } from "./http-error";
import { requireUser } from "./require-user";
import { getOrCreateUserBySub, type CurrentUser } from "./current-user";

type Handler<Ctx> = (
  req: Request,
  user: CurrentUser,
  ctx: Ctx,
) => Promise<Response> | Response;

export function withAuth<Ctx = unknown>(handler: Handler<Ctx>) {
  return async (req: Request, ctx: Ctx) => {
    try {
      const sub = await requireUser(req);
      const user = await getOrCreateUserBySub(sub);
      return await handler(req, user, ctx);
    } catch (err) {
      return toErrorResponse(err);
    }
  };
}

export function toErrorResponse(err: unknown): Response {
  if (err instanceof HttpError) {
    return NextResponse.json({ message: err.message }, { status: err.status });
  }
  if (err instanceof ZodError) {
    const first = err.issues[0];
    const message = first
      ? `${first.path.join(".") || "body"}: ${first.message}`
      : "Invalid request body";
    return NextResponse.json({ message }, { status: 400 });
  }
  console.error("Unhandled API error:", err);
  return NextResponse.json(
    { message: "Internal server error" },
    { status: 500 },
  );
}
