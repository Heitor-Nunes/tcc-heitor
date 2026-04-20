const express     = require("express");
const Reservation = require("../models/Reservation");
const Spot        = require("../models/Spot");
const AccessLog   = require("../models/AccessLog");
const User        = require("../models/User");
const { protect } = require("../middleware/auth");

const router = express.Router();
const PRICE_PER_HOUR = 80;

// GET /api/reservations/mine — reserva ativa do usuário
router.get("/mine", protect, async (req, res) => {
  try {
    const reservation = await Reservation.findOne({ user: req.user._id, status: "active" }).populate("spot");
    res.json(reservation || null);
  } catch (err) {
    res.status(500).json({ message: "Erro ao buscar reserva.", error: err.message });
  }
});

// GET /api/reservations/history — histórico do usuário logado
router.get("/history", protect, async (req, res) => {
  try {
    const history = await Reservation.find({ user: req.user._id, status: "paid" })
      .sort({ createdAt: -1 })
      .limit(20);
    res.json(history);
  } catch (err) {
    res.status(500).json({ message: "Erro ao buscar histórico.", error: err.message });
  }
});

// POST /api/reservations — criar reserva
router.post("/", protect, async (req, res) => {
  const { spotId, startTimeStr, placa, modelo } = req.body;
  if (!spotId || !startTimeStr)
    return res.status(400).json({ message: "spotId e startTimeStr são obrigatórios." });

  try {
    const existing = await Reservation.findOne({ user: req.user._id, status: "active" });
    if (existing)
      return res.status(400).json({ message: "Você já possui uma reserva ativa." });

    const spot = await Spot.findById(spotId);
    if (!spot)
      return res.status(404).json({ message: "Vaga não encontrada." });
    if (spot.status !== "available" && spot.status !== "preferential")
      return res.status(400).json({ message: "Esta vaga não está disponível." });

    const [hours, minutes] = startTimeStr.split(":").map(Number);
    const startTime = new Date();
    startTime.setHours(hours, minutes, 0, 0);

    const reservation = await Reservation.create({
      user: req.user._id,
      spot: spot._id,
      spotNumber: spot.spotNumber,
      startTime,
      startTimeStr,
      placa:  placa  || "",
      modelo: modelo || "",
    });

    spot.status            = "reserved";
    spot.reservedBy        = req.user._id;
    spot.activeReservation = reservation._id;
    await spot.save();

    await AccessLog.create({
      user: req.user._id, email: req.user.email,
      action: `Reservou vaga ${spot.spotNumber} às ${startTimeStr}${placa ? ` — Placa: ${placa}` : ""}`,
    });

    res.status(201).json(reservation);
  } catch (err) {
    res.status(500).json({ message: "Erro ao criar reserva.", error: err.message });
  }
});

// POST /api/reservations/:id/pay — confirmar pagamento
router.post("/:id/pay", protect, async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id).populate("spot");
    if (!reservation)
      return res.status(404).json({ message: "Reserva não encontrada." });
    if (String(reservation.user) !== String(req.user._id))
      return res.status(403).json({ message: "Você não pode pagar a reserva de outra pessoa." });
    if (reservation.status !== "active")
      return res.status(400).json({ message: "Esta reserva já foi encerrada." });

    const now         = new Date();
    const elapsedSecs = Math.max(0, Math.floor((now - new Date(reservation.startTime)) / 1000));
    const totalPrice  = parseFloat(((elapsedSecs / 3600) * PRICE_PER_HOUR).toFixed(2));

    reservation.status       = "paid";
    reservation.endTime      = now;
    reservation.totalSeconds = elapsedSecs;
    reservation.totalPrice   = totalPrice;
    await reservation.save();

    const spot = reservation.spot;
    spot.status            = spot.originalStatus === "preferential" ? "preferential" : "available";
    spot.reservedBy        = null;
    spot.activeReservation = null;
    await spot.save();

    // Atualiza estatísticas do usuário
    await User.findByIdAndUpdate(req.user._id, {
      $inc: { totalReservas: 1, totalGasto: totalPrice },
    });

    await AccessLog.create({
      user: req.user._id, email: req.user.email,
      action: `Pagou vaga ${spot.spotNumber} — R$${totalPrice.toFixed(2)} (${Math.floor(elapsedSecs/60)}min)`,
    });

    res.json({ reservation, totalPrice });
  } catch (err) {
    res.status(500).json({ message: "Erro ao processar pagamento.", error: err.message });
  }
});

// POST /api/reservations/:id/cancel — cancelar reserva (admin/operador)
router.post("/:id/cancel", protect, async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id).populate("spot");
    if (!reservation)
      return res.status(404).json({ message: "Reserva não encontrada." });

    const isOwner = String(reservation.user) === String(req.user._id);
    const isStaff = req.user.isAdmin || req.user.isOperador;
    if (!isOwner && !isStaff)
      return res.status(403).json({ message: "Sem permissão." });

    reservation.status = "cancelled";
    await reservation.save();

    const spot = reservation.spot;
    if (spot) {
      spot.status            = spot.originalStatus === "preferential" ? "preferential" : "available";
      spot.reservedBy        = null;
      spot.activeReservation = null;
      await spot.save();
    }

    await AccessLog.create({
      user: req.user._id, email: req.user.email,
      action: `Cancelou reserva da vaga ${reservation.spotNumber}`,
    });

    res.json({ message: "Reserva cancelada.", reservation });
  } catch (err) {
    res.status(500).json({ message: "Erro ao cancelar reserva.", error: err.message });
  }
});

module.exports = router;
