exports.up = (pgm) => {
  pgm.sql(`
    DO $$
    BEGIN
      IF to_regclass('public.tutor_availability') IS NOT NULL THEN
        CREATE INDEX IF NOT EXISTS idx_tutor_availability_user_day_time
          ON public.tutor_availability (user_id, day_of_week, start_time, end_time);
      END IF;

      IF to_regclass('public.bookings') IS NOT NULL THEN
        CREATE INDEX IF NOT EXISTS idx_bookings_user_time_range
          ON public.bookings (user_id, start_time_utc, end_time_utc);
      END IF;
    END
    $$;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP INDEX IF EXISTS public.idx_bookings_user_time_range;
    DROP INDEX IF EXISTS public.idx_tutor_availability_user_day_time;
  `);
};
