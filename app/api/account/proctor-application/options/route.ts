import { NextResponse } from "next/server";
import pool from "@/lib/server/database/pool";
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

/**
 * Put the "Other" option at the end of the array, so it's always the last option in the list.
 * 
 * @param values - Input used by other last.
 *
 * @returns The result used by the surrounding flow.
 */
function otherLast(values: string[]) {
  return values
    // Remove "Other" from the array
    .filter((value) => value !== "Other")
    // if values includes "Other", add it to the end
    .concat(values.includes("Other") ? ["Other"] : []);
}

/**
 * Handles GET requests for the /api/account/proctor-application/options route.
 *
 * @param request - Input used by get.
 *
 * @returns A Next.js response for the request.
 */
export async function GET(request: Request) {
  const userId = await resolveSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    // the api does send a state parameter
    const stateCode = searchParams.get("state")?.trim().toUpperCase() || "";
    if (stateCode) {
      // A state-specific request is only used to refresh the city dropdown after Step 2 state changes.
      // Example: `/api/account/proctor-application/options?state=CA` returns `{ cities: ["Los Angeles", "Other"] }`
      // without rerunning the profession, degree, school, major, or timezone queries.
      const cityResult = await pool.query<CityOptionRow>(
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
      );

      return NextResponse.json({
        cities: otherLast(cityResult.rows.map((row: CityOptionRow) => row.name)),
      });
    }

    // can expand each variable to see the shape 
    const [professionResult, genderResult, ethnicityResult, stateResult, degreeResult, schoolResult, majorResult, timezoneResult] = await Promise.all([
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
      pool.query<NamedOptionRow>("SELECT name FROM degrees ORDER BY name ASC"),
      pool.query<NamedOptionRow>("SELECT name FROM schools ORDER BY name ASC"),
      pool.query<NamedOptionRow>("SELECT name FROM majors ORDER BY name ASC"),
      pool.query<NamedOptionRow>("SELECT name FROM timezones ORDER BY name ASC"),
    ]);
    return NextResponse.json({

      professions: professionResult.rows.map((row: ProfessionOptionRow) => row.name),
      genders: otherLast(genderResult.rows.map((row: NamedOptionRow) => row.name)),
      ethnicities: ethnicityResult.rows.map((row: NamedOptionRow) => row.name),
      // Keep the API contract to only the fields the client needs.
      // Example: if the SQL later selects `s.id`, in stateResult.rows, each row will have an `id` field.
      // if we don't map the rows to only the fields we need, the response will include the `id` field.
      // this will expose the shape of row
      // with explicit mapping, we can ensure the response only includes the fields we want.
      // this response still returns `{ name: "California", code: "CA" }` without leaking `id`.

      states: stateResult.rows.map((row: StateOptionRow) => ({
        name: row.name,
        code: row.code,
      })),
      cities: [],
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
