-- Kept only so existing installations can migrate their saved app_state row.
CREATE TABLE IF NOT EXISTS app_state (
    id SMALLINT PRIMARY KEY CHECK (id = 1),
    state JSONB NOT NULL CHECK (jsonb_typeof(state) = 'object'),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS school_periods (
    period_index SMALLINT PRIMARY KEY CHECK (period_index BETWEEN 0 AND 6),
    label TEXT NOT NULL,
    starts_at TIME NOT NULL,
    ends_at TIME NOT NULL,
    CHECK (starts_at < ends_at)
);

CREATE TABLE IF NOT EXISTS teachers (
    id TEXT PRIMARY KEY,
    sort_order INTEGER NOT NULL,
    name TEXT NOT NULL,
    subject TEXT NOT NULL,
    subject_group TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS teacher_timetable (
    teacher_id TEXT NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    weekday SMALLINT NOT NULL CHECK (weekday BETWEEN 0 AND 5),
    period_index SMALLINT NOT NULL REFERENCES school_periods(period_index),
    class_name TEXT NOT NULL,
    PRIMARY KEY (teacher_id, weekday, period_index)
);

CREATE TABLE IF NOT EXISTS teacher_absences (
    absence_date DATE NOT NULL,
    teacher_id TEXT NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    PRIMARY KEY (absence_date, teacher_id)
);

CREATE TABLE IF NOT EXISTS substitution_assignments (
    absence_date DATE NOT NULL,
    absent_teacher_id TEXT NOT NULL,
    period_index SMALLINT NOT NULL REFERENCES school_periods(period_index),
    substitute_teacher_id TEXT NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    PRIMARY KEY (absence_date, absent_teacher_id, period_index),
    FOREIGN KEY (absence_date, absent_teacher_id)
        REFERENCES teacher_absences(absence_date, teacher_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS planner_metadata (
    id SMALLINT PRIMARY KEY CHECK (id = 1),
    initialized BOOLEAN NOT NULL DEFAULT FALSE,
    teacher_count INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO planner_metadata (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

ALTER TABLE app_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_timetable ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_absences ENABLE ROW LEVEL SECURITY;
ALTER TABLE substitution_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE planner_metadata ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE school_periods, teachers, teacher_timetable,
    teacher_absences, substitution_assignments, planner_metadata TO service_role;

CREATE OR REPLACE FUNCTION public.save_planner_state(payload JSONB)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    IF jsonb_typeof(payload) IS DISTINCT FROM 'object'
       OR jsonb_typeof(payload->'periods') IS DISTINCT FROM 'array'
       OR jsonb_typeof(payload->'teachers') IS DISTINCT FROM 'array' THEN
        RAISE EXCEPTION 'Invalid planner state';
    END IF;

    DELETE FROM substitution_assignments;
    DELETE FROM teacher_absences;
    DELETE FROM teacher_timetable;
    DELETE FROM teachers;
    DELETE FROM school_periods;

    INSERT INTO school_periods (period_index, label, starts_at, ends_at)
    SELECT (period.ordinality - 1)::SMALLINT,
           period.value->>'label',
           (period.value->>'start')::TIME,
           (period.value->>'end')::TIME
    FROM jsonb_array_elements(payload->'periods') WITH ORDINALITY AS period(value, ordinality);

    INSERT INTO teachers (id, sort_order, name, subject, subject_group)
    SELECT teacher.value->>'id',
           (teacher.ordinality - 1)::INTEGER,
           teacher.value->>'name',
           COALESCE(teacher.value->>'sub', ''),
           COALESCE(teacher.value->>'grp', 'Other')
    FROM jsonb_array_elements(payload->'teachers') WITH ORDINALITY AS teacher(value, ordinality);

    INSERT INTO teacher_timetable (teacher_id, weekday, period_index, class_name)
    SELECT teacher.value->>'id',
           (day.ordinality - 1)::SMALLINT,
           (cell.ordinality - 1)::SMALLINT,
           cell.value #>> '{}'
    FROM jsonb_array_elements(payload->'teachers') AS teacher(value)
    CROSS JOIN LATERAL jsonb_array_elements(teacher.value->'tt') WITH ORDINALITY AS day(value, ordinality)
    CROSS JOIN LATERAL jsonb_array_elements(day.value) WITH ORDINALITY AS cell(value, ordinality)
    WHERE NULLIF(cell.value #>> '{}', '') IS NOT NULL;

    INSERT INTO teacher_absences (absence_date, teacher_id)
    SELECT absence.key::DATE, absent_teacher.value #>> '{}'
    FROM jsonb_each(COALESCE(payload->'abs', '{}'::JSONB)) AS absence(key, value)
    CROSS JOIN LATERAL jsonb_array_elements(absence.value) AS absent_teacher(value);

    INSERT INTO substitution_assignments (
        absence_date, absent_teacher_id, period_index, substitute_teacher_id
    )
    SELECT assignment_day.key::DATE,
           split_part(assignment.key, ':', 1),
           split_part(assignment.key, ':', 2)::SMALLINT,
           assignment.value #>> '{}'
    FROM jsonb_each(COALESCE(payload->'asg', '{}'::JSONB)) AS assignment_day(key, value)
    CROSS JOIN LATERAL jsonb_each(assignment_day.value) AS assignment(key, value);

    UPDATE planner_metadata
    SET initialized = TRUE,
        teacher_count = COALESCE((payload->>'n')::INTEGER, jsonb_array_length(payload->'teachers')),
        updated_at = NOW()
    WHERE id = 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.load_planner_state()
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    settings planner_metadata%ROWTYPE;
    planner_state JSONB;
BEGIN
    SELECT * INTO settings FROM planner_metadata WHERE id = 1;
    IF NOT FOUND OR NOT settings.initialized THEN
        RETURN NULL;
    END IF;

    SELECT jsonb_build_object(
        'periods', (
            SELECT COALESCE(jsonb_agg(jsonb_build_object(
                'label', label,
                'start', to_char(starts_at, 'HH24:MI'),
                'end', to_char(ends_at, 'HH24:MI')
            ) ORDER BY period_index), '[]'::JSONB)
            FROM school_periods
        ),
        'teachers', (
            SELECT COALESCE(jsonb_agg(jsonb_build_object(
                'id', teacher.id,
                'name', teacher.name,
                'sub', teacher.subject,
                'grp', teacher.subject_group,
                'tt', (
                    SELECT jsonb_agg(day_grid ORDER BY weekday)
                    FROM (
                        SELECT day.weekday,
                            (
                                SELECT jsonb_agg(COALESCE(schedule.class_name, '') ORDER BY period.period_index)
                                FROM school_periods AS period
                                LEFT JOIN teacher_timetable AS schedule
                                    ON schedule.teacher_id = teacher.id
                                   AND schedule.weekday = day.weekday
                                   AND schedule.period_index = period.period_index
                            ) AS day_grid
                        FROM generate_series(0, 5) AS day(weekday)
                    ) AS timetable_days
                )
            ) ORDER BY teacher.sort_order), '[]'::JSONB)
            FROM teachers AS teacher
        ),
        'abs', (
            SELECT COALESCE(jsonb_object_agg(absence_date::TEXT, teacher_ids), '{}'::JSONB)
            FROM (
                SELECT absence_date, jsonb_agg(teacher_id) AS teacher_ids
                FROM teacher_absences
                GROUP BY absence_date
            ) AS absence_days
        ),
        'asg', (
            SELECT COALESCE(jsonb_object_agg(absence_date::TEXT, assignments), '{}'::JSONB)
            FROM (
                SELECT absence_date,
                    jsonb_object_agg(absent_teacher_id || ':' || period_index::TEXT, substitute_teacher_id) AS assignments
                FROM substitution_assignments
                GROUP BY absence_date
            ) AS assignment_days
        ),
        'n', settings.teacher_count
    ) INTO planner_state;

    RETURN planner_state;
END;
$$;

REVOKE ALL ON FUNCTION public.save_planner_state(JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.load_planner_state() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_planner_state(JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.load_planner_state() TO service_role;

-- If the old JSON table already contains planner data, move it into the new tables once.
DO $$
DECLARE
    legacy_state JSONB;
BEGIN
    IF NOT (SELECT initialized FROM planner_metadata WHERE id = 1) THEN
        SELECT state INTO legacy_state FROM app_state WHERE id = 1;
        IF legacy_state IS NOT NULL THEN
            PERFORM public.save_planner_state(legacy_state);
        END IF;
    END IF;
END;
$$;
