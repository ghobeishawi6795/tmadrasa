// /api/admin/classes
import { q } from "../_shared/db.js";
import { authenticate, requirePermission } from "../_shared/auth.js";
import { ok, created, errors } from "../_shared/response.js";
import { requireFields, readJson, withErrorHandling } from "../_shared/validate.js";
import { writeAudit } from "../_shared/audit.js";

export const onRequestGet = withErrorHandling(async ({ request, env }) => {
    const { user } = await authenticate(request, env);
    await requirePermission(env, user, "classes.view");
    const db = q(env);
    const rows = await db.all(
        `SELECT * FROM classes WHERE school_id = ? AND deleted_at IS NULL ORDER BY name`,
        user.school_id
    );
    return ok(rows.results);
});

export const onRequestPost = withErrorHandling(async ({ request, env }) => {
    const { user } = await authenticate(request, env);
    await requirePermission(env, user, "classes.create");
    const body = await readJson(request);
    requireFields(body, ["name"]);
    const db = q(env);
    const result = await db.run(
        `INSERT INTO classes (school_id, name, grade) VALUES (?, ?, ?)`,
        user.school_id, body.name, body.grade || null
    );
    await writeAudit(env, {
        schoolId: user.school_id, actorUserId: user.id, action: "class.create",
        entityType: "class", entityId: result.meta.last_row_id,
        meta: { name: body.name }, request,
    });

    return created({ id: result.meta.last_row_id }, "کلاس ساخته شد");
});

export const onRequestDelete = withErrorHandling(async ({ request, env }) => {
    const { user } = await authenticate(request, env);
    await requirePermission(env, user, "classes.delete");
    const body = await readJson(request);
    requireFields(body, ["id"]);
    const db = q(env);
    const cls = await db.first(`SELECT * FROM classes WHERE id = ? AND school_id = ?`, body.id, user.school_id);
    if (!cls) throw errors.notFound("کلاس پیدا نشد");
    await db.run(`UPDATE classes SET deleted_at = datetime('now') WHERE id = ?`, cls.id);

    await writeAudit(env, {
        schoolId: user.school_id, actorUserId: user.id, action: "class.delete",
        entityType: "class", entityId: cls.id, request,
    });

    return ok(null, "کلاس حذف شد");
});
