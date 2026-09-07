// GET /api/parent/grades?student_id=123&grade_period_id=(optional)
import { authenticate, requirePermission } from "../_shared/auth.js";
import { getParentRecord, assertParentOwnsStudent } from "../_shared/ownership.js";
import { buildReportCard } from "../_shared/reportcard.js";
import { ok, errors } from "../_shared/response.js";
import { withErrorHandling } from "../_shared/validate.js";

export const onRequestGet = withErrorHandling(async ({ request, env }) => {
    const { user } = await authenticate(request, env);
    await requirePermission(env, user, "grades.view");
    const parent = await getParentRecord(env, user.id);

    const url = new URL(request.url);
    const studentId = url.searchParams.get("student_id");
    if (!studentId) throw errors.validation("student_id الزامی است");
    await assertParentOwnsStudent(env, parent.id, studentId, user.school_id);

    const periodId = url.searchParams.get("grade_period_id");
    const report = await buildReportCard(env, studentId, user.school_id, periodId);
    return ok(report);
});
