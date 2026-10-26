// const mongoose = require("mongoose");

// const categorySchema = new mongoose.Schema(
//   {
//     name: { type: String, required: true, unique: true, trim: true },
//     slug: { type: String, required: true, unique: true, lowercase: true },
//     icon: { type: String, default: "" },
//   },
//   { timestamps: true }
// );

// module.exports = mongoose.model("Category", categorySchema);


const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    icon: { type: String, default: "" },
    isHidden: { type: Boolean, default: false }, // hidden = not shown on the public site
  },
  { timestamps: true }
);

module.exports = mongoose.model("Category", categorySchema);