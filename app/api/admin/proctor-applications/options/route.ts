import { NextResponse } from "next/server";
import pool from "@/lib/server/database/pool";
import { requireAdminUserId } from "@/lib/server/sessionUser";

type NamedOptionRow = {
  name: string;
};

export async function GET() {
  const adminUserId = await requireAdminUserId();
  if (!adminUserId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const [professionResult, genderResult, ethnicityResult, schoolResult, majorResult, timezoneResult] = await Promise.all([
      pool.query<NamedOptionRow>("SELECT name FROM professions WHERE name <> 'Other' ORDER BY name ASC"),
      pool.query<NamedOptionRow>("SELECT name FROM genders ORDER BY sort_order ASC, name ASC"),
      pool.query<NamedOptionRow>("SELECT name FROM ethnicities ORDER BY sort_order ASC, name ASC"),
      pool.query<NamedOptionRow>("SELECT name FROM schools ORDER BY name ASC"),
      pool.query<NamedOptionRow>("SELECT name FROM majors ORDER BY name ASC"),
      pool.query<NamedOptionRow>("SELECT name FROM timezones ORDER BY name ASC"),
    ]);

    return NextResponse.json({
      professions: professionResult.rows.map((row: NamedOptionRow) => row.name),
      genders: genderResult.rows.map((row: NamedOptionRow) => row.name),
      ethnicities: ethnicityResult.rows.map((row: NamedOptionRow) => row.name),
      schools: schoolResult.rows.map((row: NamedOptionRow) => row.name),
      majors: majorResult.rows.map((row: NamedOptionRow) => row.name),
      timezones: timezoneResult.rows.map((row: NamedOptionRow) => row.name),
    });
  } catch (error) {
    console.error("admin proctor applications options error:", error);
    return NextResponse.json({ error: "Unable to load application options." }, { status: 500 });
  }
}
