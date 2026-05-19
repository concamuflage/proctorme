const express = require("express");
const router = express.Router();
const shippingController = require("../controllers/shippingController");

router.get("/costs", shippingController.getShippingCosts);

module.exports = router;
