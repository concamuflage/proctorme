const express = require("express");
const router = express.Router();
const proctorsController = require("../controllers/proctorsController");

router.get("/", proctorsController.getAllProctors);
router.get("/:id", proctorsController.getProctorById);

module.exports = router;
