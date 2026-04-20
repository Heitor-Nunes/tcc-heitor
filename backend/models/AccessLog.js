const mongoose = require("mongoose");

const accessLogSchema = new mongoose.Schema(
  {
    user:   { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    email:  { type: String, required: true },
    action: { type: String, required: true },
    // Ex: "Login realizado", "Reservou vaga 5 às 14:30", "Pagou vaga 5 — R$12.00"
  },
  { timestamps: true }
);

module.exports = mongoose.model("AccessLog", accessLogSchema);
