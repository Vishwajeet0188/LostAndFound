const express = require("express");
const router = express.Router();
const itemController = require("../controller/itemController");
const upload = require("../middleware/upload");

const { isLoggedIn } = require("../middleware/auth");




//  CREATE 
router.get("/create",isLoggedIn, (req, res) => {
  res.render("pages/create");
});

router.post("/", isLoggedIn, upload.single("image"), itemController.createItem);

//  MY ITEMS 

router.get("/my-items",isLoggedIn, itemController.getMyItems);

//  ALL ITEMS 
router.get("/", itemController.getAllItems);

// DELETE ITEM (OWNER ONLY)
router.delete("/:id", itemController.deleteItem);


//  EDIT 
router.get("/:id/edit", itemController.editForm);
router.put("/:id", upload.single("image"), itemController.updateItem);

//  DETAILS (LAST) 
router.get("/:id", itemController.getElementById);

// Add after your existing routes:
// REWARD ROUTES (add these after your existing routes)
router.post("/:id/mark-found", isLoggedIn, itemController.markItemAsFound);
router.post("/:id/request-reward", isLoggedIn, itemController.requestReward);
router.post("/:id/approve-reward", isLoggedIn, itemController.approveReward);
router.post("/:id/confirm-receipt", isLoggedIn, itemController.confirmReceipt);
router.post("/:id/owner-mark-found", isLoggedIn, itemController.ownerMarkFound);

module.exports = router;
