/**
 * 單一佈告欄 API - GET、PUT、DELETE
 * 路徑: /api/announcements/:id
 */

import { requireAdmin, type AdminEnv } from "../../lib/admin";

interface Env extends AdminEnv {}

interface Announcement {
  id: number;
  content: string;
  isActive: number;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  if (!context.env.DB) {
    return Response.json({ error: "D1 未綁定" }, { status: 503 });
  }
  const id = Number(context.params.id);
  if (isNaN(id)) {
    return Response.json({ error: "Invalid ID" }, { status: 400 });
  }

  try {
    const { results } = await context.env.DB.prepare("SELECT * FROM announcements WHERE id = ?")
      .bind(id)
      .all<Announcement>();

    const announcement = results?.[0];
    if (!announcement) {
      return Response.json({ error: "Announcement not found" }, { status: 404 });
    }

    return Response.json(announcement, {
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  } catch (err) {
    console.error("Error fetching announcement:", err);
    return Response.json({ error: "Failed to fetch announcement" }, { status: 500 });
  }
};

export const onRequestPut: PagesFunction<Env> = async (context) => {
  const authResult = await requireAdmin(context);
  if (!authResult.ok) return authResult.response;
  if (!context.env.DB) {
    return Response.json({ error: "D1 未綁定" }, { status: 503 });
  }
  const id = Number(context.params.id);
  if (isNaN(id)) {
    return Response.json({ error: "Invalid ID" }, { status: 400 });
  }

  try {
    const body = await context.request.json();
    const { content, isActive } = body;

    const updates: string[] = [];
    const values: unknown[] = [];

    if (content !== undefined) {
      updates.push("content = ?");
      values.push(typeof content === "string" ? content.trim() : content);
    }
    if (isActive !== undefined) {
      updates.push("isActive = ?");
      values.push(isActive ? 1 : 0);
    }

    if (updates.length === 0) {
      return Response.json({ error: "No fields to update" }, { status: 400 });
    }

    updates.push("updatedAt = datetime('now')");

    const result = await context.env.DB.prepare(
      `UPDATE announcements SET ${updates.join(", ")} WHERE id = ?`
    )
      .bind(...values, id)
      .run();

    if (result.meta.changes === 0) {
      return Response.json({ error: "Announcement not found" }, { status: 404 });
    }

    const { results } = await context.env.DB.prepare("SELECT * FROM announcements WHERE id = ?")
      .bind(id)
      .all<Announcement>();

    return Response.json(results?.[0], {
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  } catch (err) {
    console.error("Error updating announcement:", err);
    return Response.json({ error: "Failed to update announcement" }, { status: 500 });
  }
};

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const authResult = await requireAdmin(context);
  if (!authResult.ok) return authResult.response;
  if (!context.env.DB) {
    return Response.json({ error: "D1 未綁定" }, { status: 503 });
  }
  const id = Number(context.params.id);
  if (isNaN(id)) {
    return Response.json({ error: "Invalid ID" }, { status: 400 });
  }

  try {
    const result = await context.env.DB.prepare("DELETE FROM announcements WHERE id = ?")
      .bind(id)
      .run();

    if (result.meta.changes === 0) {
      return Response.json({ error: "Announcement not found" }, { status: 404 });
    }

    return Response.json({ success: true }, {
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  } catch (err) {
    console.error("Error deleting announcement:", err);
    return Response.json({ error: "Failed to delete announcement" }, { status: 500 });
  }
};
