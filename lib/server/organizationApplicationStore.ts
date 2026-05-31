import pool from "@/backend/database/pool";
import { getVerifiedOrganizationEmailStatus } from "@/lib/server/organizationEmailVerification";

export type OrganizationApplicationInput = {
  organizationName: string;
  organizationEmail: string;
};

type OrganizationApplicationRow = {
  id: unknown;
  user_id: unknown;
  first_name?: unknown;
  last_name?: unknown;
  email?: unknown;
  organization_id: unknown;
  organization_name: unknown;
  organization_email: unknown;
  status: unknown;
  review_note: unknown;
  submitted_at: unknown;
  reviewed_at: unknown;
  verification_expires_at: unknown;
  organization_email_verification_status: unknown;
  organization_email_verification_sent_at: unknown;
  organization_email_verified_at: unknown;
  domain_verified: unknown;
};

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function toNumber(value: unknown) {
  return typeof value === "number" ? value : Number(value);
}

function dateText(value: unknown) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function organizationDomain(email: string) {
  const normalized = normalizeEmail(email);
  const atIndex = normalized.lastIndexOf("@");
  return atIndex >= 0 ? normalized.slice(atIndex + 1) : "";
}

function normalizeInput(payload: unknown): OrganizationApplicationInput {
  const data = payload && typeof payload === "object" && !Array.isArray(payload) ? payload as Record<string, unknown> : {};
  return {
    organizationName: text(data.organizationName),
    organizationEmail: normalizeEmail(text(data.organizationEmail)),
  };
}

export function validateOrganizationApplicationInput(input: OrganizationApplicationInput) {
  if (!input.organizationName) return "Organization name is required.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.organizationEmail)) return "A valid organization email is required.";
  return null;
}

function mapApplication(row: OrganizationApplicationRow) {
  const applicantName = [text(row.first_name), text(row.last_name)].filter(Boolean).join(" ");
  return {
    id: toNumber(row.id),
    userId: toNumber(row.user_id),
    applicantName,
    applicantEmail: text(row.email),
    organizationId: row.organization_id == null ? null : toNumber(row.organization_id),
    organizationName: text(row.organization_name),
    organizationEmail: text(row.organization_email),
    organizationDomain: organizationDomain(text(row.organization_email)),
    status: text(row.status) || "pending",
    reviewNote: text(row.review_note),
    submittedAt: dateText(row.submitted_at),
    reviewedAt: dateText(row.reviewed_at),
    verificationExpiresAt: dateText(row.verification_expires_at),
    organizationEmailVerificationStatus: text(row.organization_email_verification_status) || "not_provided",
    organizationEmailVerificationSentAt: dateText(row.organization_email_verification_sent_at),
    organizationEmailVerifiedAt: dateText(row.organization_email_verified_at),
    domainVerified: row.domain_verified === true,
  };
}

export async function submitOrganizationApplication(userId: number, payload: unknown) {
  const input = normalizeInput(payload);
  const validationError = validateOrganizationApplicationInput(input);
  if (validationError) throw new Error(validationError);
  const emailVerification = await getVerifiedOrganizationEmailStatus(userId, input.organizationEmail);
  if (emailVerification?.status !== "verified") {
    throw new Error("Verify your organization email before submitting.");
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const domain = organizationDomain(input.organizationEmail);
    const mappedOrganizationId = await findMappedOrganizationId(client, input.organizationName, domain);
    const expiresAt = mappedOrganizationId ? organizationVerificationExpiresAt() : null;
    const result = await client.query<OrganizationApplicationRow>(
      `
        INSERT INTO organization_user_applications (
          user_id,
          organization_id,
          organization_name,
          organization_email,
          organization_email_verification_status,
          organization_email_verification_sent_at,
          organization_email_verified_at,
          status,
          reviewed_at,
          review_note,
          verification_expires_at,
          submitted_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, 'verified', $5, $6, $7, $8, $9, $10, NOW(), NOW())
        RETURNING *, $11::boolean AS domain_verified
      `,
      [
        userId,
        mappedOrganizationId,
        input.organizationName,
        input.organizationEmail,
        emailVerification.sentAt || null,
        emailVerification.verifiedAt || null,
        mappedOrganizationId ? "approved" : "pending",
        mappedOrganizationId ? new Date() : null,
        mappedOrganizationId ? "Auto-approved from verified organization-domain mapping." : null,
        expiresAt,
        Boolean(mappedOrganizationId),
      ]
    );

    if (mappedOrganizationId && expiresAt) {
      await activateOrganizationUser(client, {
        userId,
        organizationId: mappedOrganizationId,
        organizationEmail: input.organizationEmail,
        expiresAt,
      });
    }

    await client.query("COMMIT");
    return mapApplication(result.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function listOrganizationApplicationsForUser(userId: number) {
  const result = await pool.query<OrganizationApplicationRow>(
    `
      SELECT a.*,
             false AS domain_verified
      FROM organization_user_applications a
      WHERE a.user_id = $1
      ORDER BY a.submitted_at DESC NULLS LAST, a.id DESC
    `,
    [userId]
  );
  return result.rows.map(mapApplication);
}

export async function getApprovedOrganizationProfile(userId: number) {
  const result = await pool.query<OrganizationApplicationRow>(
    `
      SELECT a.*,
             o.name AS organization_name,
             EXISTS (
               SELECT 1
               FROM organization_email_domains d
               WHERE d.organization_id = a.organization_id
                 AND lower(d.domain) = lower(split_part(a.organization_email, '@', 2))
             ) AS domain_verified
      FROM organization_user_applications a
      JOIN organization o
        ON o.id = a.organization_id
      WHERE a.user_id = $1
        AND a.status = 'approved'
        AND a.organization_id IS NOT NULL
      ORDER BY a.reviewed_at DESC NULLS LAST, a.id DESC
      LIMIT 1
    `,
    [userId]
  );
  return result.rows[0] ? mapApplication(result.rows[0]) : null;
}

export async function listOrganizationApplications() {
  const result = await pool.query<OrganizationApplicationRow>(
    `
      SELECT a.*,
             COALESCE(o.name, a.organization_name) AS organization_name,
             u.first_name,
             u.last_name,
             u.email,
             EXISTS (
               SELECT 1
               FROM organization_email_domains d
               JOIN organization domain_org
                 ON domain_org.id = d.organization_id
               WHERE lower(domain_org.name) = lower(a.organization_name)
                 AND lower(d.domain) = lower(split_part(a.organization_email, '@', 2))
             ) AS domain_verified
      FROM organization_user_applications a
      JOIN users u
        ON u.id = a.user_id
      LEFT JOIN organization o
        ON o.id = a.organization_id
      ORDER BY
        CASE a.status WHEN 'pending' THEN 0 WHEN 'rejected' THEN 1 ELSE 2 END,
        a.submitted_at DESC NULLS LAST,
        a.id DESC
    `
  );
  return result.rows.map(mapApplication);
}

async function corporateRoleId(client: typeof pool) {
  const result = await client.query<{ id: unknown }>(
    `
      SELECT id
      FROM roles
      WHERE name = ANY($1::text[])
      ORDER BY array_position($1::text[], name)
      LIMIT 1
    `,
    [["corporate_user", "cooporate_user", "interviewee"]]
  );
  const id = result.rows[0]?.id == null ? null : toNumber(result.rows[0].id);
  if (!id) throw new Error("Corporate user role is not configured.");
  return id;
}

async function corporateOrganizationTypeId(client: typeof pool) {
  const result = await client.query<{ id: unknown }>(
    "SELECT id FROM organization_type WHERE name = 'corporate' LIMIT 1"
  );
  const id = result.rows[0]?.id == null ? null : toNumber(result.rows[0].id);
  if (!id) throw new Error("Corporate organization type is not configured.");
  return id;
}

async function upsertOrganization(client: typeof pool, organizationName: string) {
  const existing = await client.query<{ id: unknown }>(
    "SELECT id FROM organization WHERE lower(name) = lower($1) LIMIT 1",
    [organizationName]
  );
  const existingId = existing.rows[0]?.id == null ? null : toNumber(existing.rows[0].id);
  if (existingId) return existingId;

  const organizationTypeId = await corporateOrganizationTypeId(client);
  const created = await client.query<{ id: unknown }>(
    `
      INSERT INTO organization (name, organization_type_id)
      VALUES ($1, $2)
      RETURNING id
    `,
    [organizationName, organizationTypeId]
  );
  return toNumber(created.rows[0].id);
}

async function findMappedOrganizationId(client: typeof pool, organizationName: string, domain: string) {
  if (!domain) return null;
  const result = await client.query<{ id: unknown }>(
    `
      SELECT o.id
      FROM organization_email_domains d
      JOIN organization o
        ON o.id = d.organization_id
      WHERE lower(o.name) = lower($1)
        AND lower(d.domain) = lower($2)
      LIMIT 1
    `,
    [organizationName, domain]
  );
  return result.rows[0]?.id == null ? null : toNumber(result.rows[0].id);
}

function organizationVerificationExpiresAt() {
  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + 6);
  return expiresAt;
}

async function activateOrganizationUser(
  client: typeof pool,
  {
    userId,
    organizationId,
    organizationEmail,
    expiresAt,
  }: {
    userId: number;
    organizationId: number;
    organizationEmail: string;
    expiresAt: Date;
  }
) {
  const roleId = await corporateRoleId(client);
  await client.query(
    `
      INSERT INTO organization_profile (
        user_id,
        organization_id,
        organization_email,
        verification_status,
        verified_at,
        verification_expires_at,
        last_reverified_at,
        reverification_email_sent_at
      )
      VALUES ($1, $2, $3, 'verified', NOW(), $4, NOW(), NULL)
      ON CONFLICT (user_id, organization_id) DO UPDATE
        SET organization_email = EXCLUDED.organization_email,
            verification_status = 'verified',
            verified_at = NOW(),
            verification_expires_at = EXCLUDED.verification_expires_at,
            last_reverified_at = NOW(),
            reverification_email_sent_at = NULL,
            deactivated_at = NULL
    `,
    [userId, organizationId, organizationEmail, expiresAt]
  );

  await client.query(
    `
      INSERT INTO user_roles (user_id, role_id)
      VALUES ($1, $2)
      ON CONFLICT DO NOTHING
    `,
    [userId, roleId]
  );
}

export async function reviewOrganizationApplication(applicationId: number, adminUserId: number, action: "approve" | "reject", note = "") {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const applicationResult = await client.query<OrganizationApplicationRow>(
      `
        SELECT *
        FROM organization_user_applications
        WHERE id = $1
        FOR UPDATE
      `,
      [applicationId]
    );
    const application = applicationResult.rows[0];
    if (!application) throw new Error("Organization application not found.");
    if (text(application.status) !== "pending") throw new Error("This application has already been reviewed.");

    if (action === "reject") {
      await client.query(
        `
          UPDATE organization_user_applications
          SET status = 'rejected',
              reviewed_by = $2,
              reviewed_at = NOW(),
              review_note = $3,
              updated_at = NOW()
          WHERE id = $1
        `,
        [applicationId, adminUserId, note]
      );
      await client.query("COMMIT");
      return;
    }

    const userId = toNumber(application.user_id);
    if (text(application.organization_email_verification_status) !== "verified") {
      throw new Error("Organization email must be verified before approval.");
    }
    const organizationName = text(application.organization_name);
    const domain = organizationDomain(text(application.organization_email));
    const organizationId = await upsertOrganization(client, organizationName);
    const expiresAt = organizationVerificationExpiresAt();

    await client.query(
      `
        UPDATE organization_user_applications
        SET status = 'approved',
            organization_id = $5,
            reviewed_by = $2,
            reviewed_at = NOW(),
            review_note = $3,
            verification_expires_at = $4,
            updated_at = NOW()
        WHERE id = $1
      `,
      [applicationId, adminUserId, note, expiresAt, organizationId]
    );

    await activateOrganizationUser(client, {
      userId,
      organizationId,
      organizationEmail: text(application.organization_email),
      expiresAt,
    });

    await client.query(
      `
        INSERT INTO organization_email_domains (organization_id, domain, created_by, created_at, updated_at)
        VALUES ($1, $2, $3, NOW(), NOW())
        ON CONFLICT (organization_id, lower(domain)) WHERE organization_id IS NOT NULL DO UPDATE
          SET updated_at = NOW()
      `,
      [organizationId, domain, adminUserId]
    );

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
