const mongoose = require("mongoose");

const spotSchema = new mongoose.Schema(
  {
    // Ex: 1, 2, ... 20
    spotNumber: { type: Number, required: true, unique: true },

    // Fileira: A, B, C ou D
    row: { type: String, required: true, enum: ["A", "B", "C", "D"] },

    // Status atual da vaga
    status: {
      type: String,
      enum: ["available", "occupied", "reserved", "preferential"],
      default: "available",
    },

    // Status original (para restaurar após pagamento)
    originalStatus: {
      type: String,
      enum: ["available", "occupied", "preferential"],
      default: "available",
    },

    // Referência ao usuário que reservou (null se livre)
    reservedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },

    // Referência à reserva ativa (null se livre)
    activeReservation: { type: mongoose.Schema.Types.ObjectId, ref: "Reservation", default: null },

    // Dados vindos do ESP32 (sensor físico)
    sensorOccupied: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Spot", spotSchema);
