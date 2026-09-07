import { q } from "./db.js";

// Weighted average per subject: sum(score*weight) / sum(weight).
// NOTE: this assumes scores for a subject share a comparable max_score (e.g. all out of 20),
// which is how this school's grading works. If a subject ever mixes different max_scores,
// switch to percentage-normalized weighting before trusting this number.
export async function buildReportCard(env, studentId, schoolId, gradePeriodId) {
    const db = q(env);

    const rows = await db.all(
        `SELECT g.*, s.name as subject_name FROM grades g
           JOIN subjects s ON s.id = g.subject_id
          WHERE g.student_id = ? AND g.school_id = ?
            AND (? IS NULL OR g.grade_period_id = ?)
          ORDER BY s.name, g.created_at`,
        studentId, schoolId, gradePeriodId, gradePeriodId
    );

    const bySubject = {};
    for (const g of rows.results) {
        if (!bySubject[g.subject_id]) {
            bySubject[g.subject_id] = { subject_id: g.subject_id, subject_name: g.subject_name, entries: [], weightSum: 0, weightedScore: 0 };
        }
        const bucket = bySubject[g.subject_id];
        bucket.entries.push({ source: g.source, score: g.score, max_score: g.max_score, feedback: g.feedback });
        bucket.weightSum += g.weight;
        bucket.weightedScore += g.score * g.weight;
    }

    const subjects = Object.values(bySubject).map(b => ({
        subject_id: b.subject_id,
        subject_name: b.subject_name,
        entries: b.entries,
        average: b.weightSum > 0 ? Number((b.weightedScore / b.weightSum).toFixed(2)) : null,
    }));

    const gradedSubjects = subjects.filter(s => s.average !== null);
    const overallAverage = gradedSubjects.length
        ? Number((gradedSubjects.reduce((sum, s) => sum + s.average, 0) / gradedSubjects.length).toFixed(2))
        : null;

    return { subjects, overall_average: overallAverage };
}
