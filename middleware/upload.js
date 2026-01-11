const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/uploads"); // 👈 MUST be public/uploads
  },
  filename: (req, file, cb) => {
    cb(
      null,
      Date.now() + "-" + file.originalname.replace(/\s+/g, "")
    );
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    if (![".png", ".jpg", ".jpeg", ".webp"].includes(ext)) {
      cb(new Error("Only images allowed"));
    }
    cb(null, true);
  }
});

module.exports = upload;
