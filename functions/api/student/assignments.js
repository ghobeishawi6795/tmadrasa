// GET /api/student/assignments -- assignments for classes this student is enrolled in,
// each annotated with the student's own latest submission (if any).
import { q } from "../_shared/db.js";
import { authenticate, requirePermission } from "../_shared/auth.js";
import { getStudentRecord } from "../_shared/ownership.js";
import { ok } from "../_shared/response.js";
import { withErrorHandling } from "../_shared/validate.js";

export const onRequestGet = withErrorHandling(async ({ request, env }) => {
    const { user } = await authenticate(request, env);
    await requirePermission(env, user, "assignments.view");
    const student = await getStudentRecord(env, user.id);

    const db = q(env);
    const rows = await db.all(
        `SELECT a.id, a.title, a.description, a.due_at, a.allow_late, a.max_attempts, a.max_score,
                a.submission_type, s.name as subject_name, c.name as class_name,
                sub.id as submission_id, sub.status as submission_status,
                sub.score as submission_score, sub.attempt_number as submission_attempt_number
           FROM assignments a
           JOIN class_students cs ON cs.class_id = a.class_id AND cs.student_id = ?
           JOIN subjects s ON s.id = a.subject_id
           JOIN classes c ON c.id = a.class_id
           LEFT JOIN submissions sub ON sub.id = (
               SELECT id FROM submissions
                WHERE assignment_id = a.id AND student_id = ?
                ORDER BY attempt_number DESC LIMIT 1
           )
          WHERE a.school_id = ? AND a.deleted_at IS NULL
          ORDER BY a.due_at ASC`,
        student.id, student.id, user.school_id
    );
    // No answer keys exist on assignments/submissions yet (text/photo/audio are all
    // manually graded), so there's nothing to strip here -- unlike exams, which must
    // never send question.correct_option_id to the client.
    return ok(rows.results);
});
