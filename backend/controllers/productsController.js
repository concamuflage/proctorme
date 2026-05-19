const pool = require("../database/pool");

exports.getProductById = async (req, res) => {
  const { id } = req.params;

  const result = await pool.query(
    `SELECT 
      product_variants.id AS variant_id,
      product_variants.sku,
      product_variants.cost_rmb,
      sizes.size,
      sizes.height_cm,
      sizes.chest_cm,
      products.id AS product_id,
      products.name,
      products.description,
      brands.brand,
      styles.style,
      styles.weight_kg,
      colors.color,
      inventory.qty,
      product_variant_images.image_link,
      materials.material,
      product_variant_materials.percentage
    FROM product_variants
    JOIN products
      ON products.id = product_variants.product_id
    JOIN brands
      ON brands.id = products.brand_id
    JOIN styles
      ON styles.id = products.style_id
    JOIN colors
      ON colors.id = product_variants.color_id
    JOIN sizes
      ON sizes.id = product_variants.size_id
    LEFT JOIN inventory
      ON inventory.variant_id = product_variants.id
    LEFT JOIN product_variant_images
      ON product_variant_images.product_variant_id = product_variants.id
    LEFT JOIN product_variant_materials
      ON product_variant_materials.product_variant_id = product_variants.id
    LEFT JOIN materials
      ON materials.id = product_variant_materials.material_id
    WHERE products.id = $1`,
    [id]
  );

  if (!result.rows || result.rows.length === 0) {
    return res.status(404).json({ error: "Product not found" });
  }

  // Product-level fields (same across all rows)
  const first = result.rows[0];

  const product = {
    product_id: first.product_id,
    name: first.name,
    description: first.description,
    brand: first.brand,
    style: first.style,
    weight_kg:
      first.weight_kg === null || first.weight_kg === undefined ? null : Number(first.weight_kg),
    // Materials are defined at the product level (same across variants)
    materials: [],
    // Variants are color/size specific, used for toggles in the frontend
    variants: [],
  };

  // Consolidate product-level materials (unique by material name)
  const materialsMap = new Map();

  // Consolidate variant-level info (unique by variant_id)
  const variantsMap = new Map();

  for (const row of result.rows) {
    // 1) Materials (product-level)
    if (row.material) {
      const pct = row.percentage === null || row.percentage === undefined ? null : Number(row.percentage);
      if (!materialsMap.has(row.material)) {
        materialsMap.set(row.material, pct);
      }
    }

    // 2) Variants (color/size specific)
    const variantId = row.variant_id;

    if (!variantsMap.has(variantId)) {
      variantsMap.set(variantId, {
        variant_id: variantId,
        sku: row.sku,
        color: row.color,
        size: row.size,
        height_cm: row.height_cm,
        chest_cm: row.chest_cm,
        cost_rmb: row.cost_rmb === null || row.cost_rmb === undefined ? null : Number(row.cost_rmb),
        qty: row.qty === null || row.qty === undefined ? null : Number(row.qty),
        images: new Set(),
      });
    }

    const v = variantsMap.get(variantId);

    // Add images (unique)
    if (row.image_link) v.images.add(row.image_link);
  }

  product.materials = Array.from(materialsMap.entries()).map(([material, percentage]) => ({
    material,
    percentage,
  }));

  product.variants = Array.from(variantsMap.values()).map((v) => ({
    variant_id: v.variant_id,
    sku: v.sku,
    color: v.color,
    size: v.size,
    height_cm: v.height_cm,
    chest_cm: v.chest_cm,
    cost_rmb: v.cost_rmb,
    qty: v.qty,
    images: Array.from(v.images),
  }));

  return res.json(product);
};



exports.getProductsByStyleName = async (req, res) => {
  try {
    const { styleName } = req.params;

    const result = await pool.query(
      `SELECT 
        products.id AS product_id,
        products.name AS product_name,
        brands.brand,
        product_variants.cost_rmb,
        colors.color,
        product_variant_images.image_link
      FROM product_variants
      JOIN products
        ON products.id = product_variants.product_id
      JOIN brands
        ON brands.id = products.brand_id
      JOIN styles
        ON styles.id = products.style_id
      JOIN colors
        ON colors.id = product_variants.color_id
      LEFT JOIN product_variant_images
        ON product_variant_images.product_variant_id = product_variants.id
      WHERE styles.style = $1`,
      [styleName]
    );

    // Aggregate rows into one object per product_id
    const productsMap = new Map();

    for (const row of result.rows) {
      const productId = row.product_id;

      if (!productsMap.has(productId)) {
        productsMap.set(productId, {
          product_id: productId,
          name: row.product_name,
          brand: row.brand,
          lowest_cost_rmb: row.cost_rmb === null || row.cost_rmb === undefined ? null : Number(row.cost_rmb),
          colors: new Set(),
          photos: new Set(),
        });
      }

      const p = productsMap.get(productId);

      if (row.color) p.colors.add(row.color);
      if (row.image_link) p.photos.add(row.image_link);

      if (row.cost_rmb !== null && row.cost_rmb !== undefined) {
        const cost = Number(row.cost_rmb);
        if (p.lowest_cost_rmb === null || cost < p.lowest_cost_rmb) {
          p.lowest_cost_rmb = cost;
        }
      }
    }

    const aggregated = Array.from(productsMap.values()).map((p) => ({
      product_id: p.product_id,
      name: p.name,
      brand: p.brand,
      lowest_cost_rmb: p.lowest_cost_rmb,
      colors: Array.from(p.colors),
      photos: Array.from(p.photos),
    }));

    return res.json(aggregated);
  } catch (err) {
    console.error("getProductsByStyleName error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

exports.getAllProducts = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        products.id AS product_id,
        products.name AS product_name,
        products.description,
        brands.brand,
        styles.style,
        product_variants.cost_rmb,
        colors.color,
        product_variant_images.image_link
      FROM product_variants
      JOIN products
        ON products.id = product_variants.product_id
      JOIN brands
        ON brands.id = products.brand_id
      JOIN styles
        ON styles.id = products.style_id
      JOIN colors
        ON colors.id = product_variants.color_id
      LEFT JOIN product_variant_images
        ON product_variant_images.product_variant_id = product_variants.id
      ORDER BY products.id`,
      []
    );

    // Aggregate rows into one object per product_id
    const productsMap = new Map();

    for (const row of result.rows) {
      const productId = row.product_id;

      if (!productsMap.has(productId)) {
        productsMap.set(productId, {
          product_id: productId,
          name: row.product_name,
          description: row.description,
          brand: row.brand,
          style: row.style,
          lowest_cost_rmb: row.cost_rmb === null || row.cost_rmb === undefined ? null : Number(row.cost_rmb),
          colors: new Set(),
          photos: new Set(),
        });
      }

      const p = productsMap.get(productId);

      if (row.color) p.colors.add(row.color);
      if (row.image_link) p.photos.add(row.image_link);

      if (row.cost_rmb !== null && row.cost_rmb !== undefined) {
        const cost = Number(row.cost_rmb);
        if (p.lowest_cost_rmb === null || cost < p.lowest_cost_rmb) {
          p.lowest_cost_rmb = cost;
        }
      }
    }

    const aggregated = Array.from(productsMap.values()).map((p) => ({
      product_id: p.product_id,
      name: p.name,
      description: p.description,
      brand: p.brand,
      style: p.style,
      lowest_cost_rmb: p.lowest_cost_rmb,
      colors: Array.from(p.colors),
      photos: Array.from(p.photos),
    }));

    return res.json(aggregated);
  } catch (err) {
    console.error("getAllProducts error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};
