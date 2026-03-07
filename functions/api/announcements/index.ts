/**
 * 佈告欄 API - GET (列表)、POST (新增)
 * 路徑: /api/announcements
 */

interface Env {
  DB: D1Database;
}

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
    return Response.json(
      { error: "D1 未綁定", message: "請至 Cloudflare Dashboard 新增 D1 綁定" },
      { status: 503 }
    );
  }

  try {
    const url = new URL(context.request.url);
    const activeOnly = url.searchParams.get("active") === "true";

    const whereClause = activeOnly ? " WHERE isActive = 1" : "";
    const { results } = await context.env.DB.prepare(
      `SELECT * FROM announcements${whereClause} ORDER BY orderIndex ASC, createdAt DESC`
    ).all<Announcement>();

    return Response.json(
      { announcements: results || [] },
      { headers: { "Access-Control-Allow-Origin": "*" } }
    );
  } catch (err) {
    console.error("Error fetching announcements:", err);
    return Response.json(
      { error: "Failed to fetch announcements" },
      { status: 500 }
    );
  }
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  if (!context.env.DB) {
    return Response.json(
      { error: "D1 未綁定", message: "請至 Cloudflare Dashboard 新增 D1 綁定" },
      { status: 503 }
    );
  }

  try {
    const body = await context.request.json();
    const { content, isActive = 1 } = body;

    if (!content || typeof content !== "string") {
      return Response.json(
        { error: "content 為必填" },
        { status: 400 }
      );
    }

    const result = await context.env.DB.prepare(
      `INSERT INTO announcements (content, isActive) VALUES (?, ?)`
    )
      .bind(content.trim(), isActive ? 1 : 0)
      .run();

    const id = result.meta.last_row_id;
    const { results } = await context.env.DB.prepare("SELECT * FROM announcements WHERE id = ?")
      .bind(id)
      .all<Announcement>();

    const newAnnouncement = results?.[0];
    if (!newAnnouncement) {
      return Response.json(
        { error: "Failed to fetch created announcement" },
        { status: 500 }
      );
    }

    return Response.json(newAnnouncement, {
      status: 201,
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  } catch (err) {
    console.error("Error adding announcement:", err);
    return Response.json(
      { error: "Failed to add announcement" },
      { status: 500 }
    );
  }
};
