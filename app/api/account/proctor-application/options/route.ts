import { NextResponse } from "next/server";
import pool from "@/backend/database/pool";
import { resolveSessionUserId } from "@/lib/server/sessionUser";

type ProfessionOptionRow = {
  name: string;
};

type StateOptionRow = {
  name: string;
  code: string;
};

type CityOptionRow = {
  name: string;
};

type NamedOptionRow = {
  name: string;
};

function otherLast(values: string[]) {
  return values
    .filter((value) => value !== "Other")
    .concat(values.includes("Other") ? ["Other"] : []);
}

export async function GET(request: Request) {
  const userId = await resolveSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const stateCode = searchParams.get("state")?.trim().toUpperCase() || "";
    const [professionResult, genderResult, ethnicityResult, stateResult, cityResult, degreeResult, schoolResult, majorResult, timezoneResult] = await Promise.all([
      pool.query<ProfessionOptionRow>(
      `
        SELECT name
        FROM professions
        WHERE name <> 'Other'
        ORDER BY name ASC
      `
      ),
      pool.query<NamedOptionRow>("SELECT name FROM genders ORDER BY sort_order ASC, name ASC"),
      pool.query<NamedOptionRow>("SELECT name FROM ethnicities ORDER BY sort_order ASC, name ASC"),
      pool.query<StateOptionRow>(
        `
          SELECT s.name, s.code
          FROM states s
          JOIN countries c
            ON c.id = s.country_id
          WHERE c.country = 'United States'
          ORDER BY s.name ASC
        `
      ),
      stateCode
        ? pool.query<CityOptionRow>(
          `
            SELECT ci.name
            FROM cities ci
            JOIN states s
              ON s.id = ci.state_id
            JOIN countries c
              ON c.id = s.country_id
            WHERE c.country = 'United States'
              AND s.code = $1
            ORDER BY ci.name ASC
          `,
          [stateCode]
        )
        : Promise.resolve({ rows: [] as CityOptionRow[] }),
      pool.query<NamedOptionRow>("SELECT name FROM degrees ORDER BY name ASC"),
      pool.query<NamedOptionRow>("SELECT name FROM schools ORDER BY name ASC"),
      pool.query<NamedOptionRow>("SELECT name FROM majors ORDER BY name ASC"),
      pool.query<NamedOptionRow>("SELECT name FROM timezones ORDER BY name ASC"),
    ]);
    return NextResponse.json({
      professions: professionResult.rows.map((row: ProfessionOptionRow) => row.name),
      genders: otherLast(genderResult.rows.map((row: NamedOptionRow) => row.name)),
      ethnicities: ethnicityResult.rows.map((row: NamedOptionRow) => row.name),
      states: stateResult.rows.map((row: StateOptionRow) => ({
        name: row.name,
        code: row.code,
      })),
      cities: otherLast(cityResult.rows.map((row: CityOptionRow) => row.name)),
      degrees: degreeResult.rows.map((row: NamedOptionRow) => row.name),
      schools: otherLast(schoolResult.rows.map((row: NamedOptionRow) => row.name)),
      majors: otherLast(majorResult.rows.map((row: NamedOptionRow) => row.name)),
      timezones: timezoneResult.rows.map((row: NamedOptionRow) => row.name),
    });
  } catch (error) {
    console.error("proctor application options error:", error);
    return NextResponse.json({ error: "Unable to load application options." }, { status: 500 });
  }
}
