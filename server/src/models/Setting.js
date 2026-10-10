const mongoose = require("mongoose");
// Key/value platform settings editable from the admin panel.
const settingSchema = new mongoose.Schema({ key: { type: String, unique: true, required: true }, value: mongoose.Schema.Types.Mixed }, { timestamps: true });
module.exports = mongoose.model("Setting", settingSchema);
