const express = require("express");
const Spot    = require("../models/Spot");
const { protect, adminOnly } = require("../middleware/auth");

const router = express.Router();

// ── GET /api/spots ───────────────────────────────────────
// Retorna todas as vagas (qualquer usuário logado)
router.get("/", protect, async (req, res) => {
  try {
    const spots = await Spot.find().sort({ spotNumber: 1 });
    res.json(spots);
  } catch (err) {
    res.status(500).json({ message: "Erro ao buscar vagas.", error: err.message });
  }
});

// ── POST /api/spots/sensor ───────────────────────────────
// Rota chamada pelo ESP32 para atualizar o status do sensor de uma vaga
// Não requer autenticação (chamada por hardware)
router.post("/sensor", async (req, res) => {
  const { spotNumber, occupied } = req.body;
  if (spotNumber === undefined || occupied === undefined)
    return res.status(400).json({ message: "spotNumber e occupied são obrigatórios." });

  try {
    const spot = await Spot.findOne({ spotNumber });
    if (!spot) return res.status(404).json({ message: "Vaga não encontrada." });

    spot.sensorOccupied = occupied;

    // Só atualiza o status visual se a vaga não estiver reservada por um usuário
    if (spot.status !== "reserved") {
      if (occupied) {
        spot.status = "occupied";
      } else {
        // Restaura para o status original (available ou preferential)
        spot.status = spot.originalStatus === "preferential" ? "preferential" : "available";
      }
    }

    await spot.save();
    res.json({ message: "Sensor atualizado.", spot });
  } catch (err) {
    res.status(500).json({ message: "Erro ao atualizar sensor.", error: err.message });
  }
});

// ── PUT /api/spots/:id/status ────────────────────────────
// Admin pode forçar o status de uma vaga manualmente
router.put("/:id/status", protect, adminOnly, async (req, res) => {
  try {
    const spot = await Spot.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    );
    if (!spot) return res.status(404).json({ message: "Vaga não encontrada." });
    res.json(spot);
  } catch (err) {
    res.status(500).json({ message: "Erro ao atualizar vaga.", error: err.message });
  }
});

module.exports = router;
