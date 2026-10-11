const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/subjectController");

router.post("/", ctrl.create);
router.get("/", ctrl.list);
router.delete("/:id", ctrl.delete);

module.exports = router;
