const mongoose = require("mongoose");

const reservationSchema = new mongoose.Schema(
  {
    user:         { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    spot:         { type: mongoose.Schema.Types.ObjectId, ref: "Spot", required: true },
    spotNumber:   { type: Number, required: true },

    // Horário de início escolhido pelo usuário
    startTime:    { type: Date, required: true },
    startTimeStr: { type: String, required: true }, // "14:30" para exibição

    // Preenchidos quando o pagamento é confirmado
    endTime:      { type: Date, default: null },
    totalSeconds: { type: Number, default: 0 },
    totalPrice:   { type: Number, default: 0 },

    status: {
      type: String,
      enum: ["active", "paid", "cancelled"],
      default: "active",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Reservation", reservationSchema);
