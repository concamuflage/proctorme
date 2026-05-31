exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS public.city_timezones (
      id SERIAL PRIMARY KEY,
      city_id INTEGER NOT NULL REFERENCES public.cities(id) ON DELETE CASCADE,
      state_id INTEGER NOT NULL REFERENCES public.states(id) ON DELETE CASCADE,
      country_id INTEGER NOT NULL REFERENCES public.countries(id) ON DELETE CASCADE,
      timezone_id INTEGER NOT NULL REFERENCES public.timezones(id) ON DELETE RESTRICT,
      source TEXT NOT NULL DEFAULT 'google',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT city_timezones_location_unique UNIQUE (city_id, state_id, country_id)
    );

    CREATE INDEX IF NOT EXISTS idx_city_timezones_timezone_id
      ON public.city_timezones (timezone_id);
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP TABLE IF EXISTS public.city_timezones;
  `);
};
