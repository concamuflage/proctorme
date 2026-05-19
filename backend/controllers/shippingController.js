const pool = require("../database/pool");

exports.getShippingCosts = async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        id,
        mode,
        delivery_time,
        first_kg_cost_rmb,
        additional_kg_cost_rmb
      FROM shipping_cost
      ORDER BY id`
    );

    return res.json(
      result.rows.map((row) => ({
        id: row.id,
        mode: row.mode,
        delivery_time: row.delivery_time,
        first_kg_cost_rmb:
          row.first_kg_cost_rmb === null || row.first_kg_cost_rmb === undefined
            ? null
            : Number(row.first_kg_cost_rmb),
        additional_kg_cost_rmb:
          row.additional_kg_cost_rmb === null || row.additional_kg_cost_rmb === undefined
            ? null
            : Number(row.additional_kg_cost_rmb),
      }))
    );
  } catch (err) {
    console.error("getShippingCosts error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};
