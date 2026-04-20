const express     = require("express");
const User        = require("../models/User");
const Reservation = require("../models/Reservation");
const AccessLog   = require("../models/AccessLog");
const Spot        = require("../models/Spot");
const { protect, adminOnly } = require("../middleware/auth");

const router = express.Router();
router.use(protect, adminOnly);

// GET /api/admin/users
router.get("/users", async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: "Erro.", error: err.message });
  }
});

// GET /api/admin/logs
router.get("/logs", async (req, res) => {
  try {
    const logs = await AccessLog.find().sort({ createdAt: -1 }).limit(300).populate("user", "email username nomeCompleto isAdmin");
    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: "Erro.", error: err.message });
  }
});

// GET /api/admin/reservations
router.get("/reservations", async (req, res) => {
  try {
    const reservations = await Reservation.find()
      .sort({ createdAt: -1 })
      .populate("user", "email username nomeCompleto cpf endereco telefone totalReservas totalGasto")
      .populate("spot", "spotNumber row");
    res.json(reservations);
  } catch (err) {
    res.status(500).json({ message: "Erro.", error: err.message });
  }
});

// GET /api/admin/dashboard
router.get("/dashboard", async (req, res) => {
  try {
    const [totalUsers, totalRes, paidRes, spots] = await Promise.all([
      User.countDocuments({ isAdmin: false }),
      Reservation.countDocuments(),
      Reservation.countDocuments({ status: "paid" }),
      Spot.find(),
    ]);

    const revenue = await Reservation.aggregate([
      { $match: { status: "paid" } },
      { $group: { _id: null, total: { $sum: "$totalPrice" } } },
    ]);

    // Receita dos últimos 7 dias
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const revenueWeek = await Reservation.aggregate([
      { $match: { status: "paid", updatedAt: { $gte: sevenDaysAgo } } },
      { $group: { _id: { $dateToString: { format: "%d/%m", date: "$updatedAt" } }, total: { $sum: "$totalPrice" }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    res.json({
      totalUsers,
      totalReservations: totalRes,
      paidReservations:  paidRes,
      activeReservations: totalRes - paidRes,
      totalRevenue:  revenue[0]?.total || 0,
      spotsAvailable: spots.filter(s => s.status === "available").length,
      spotsOccupied:  spots.filter(s => s.status === "occupied" || s.status === "reserved").length,
      spotsPreferential: spots.filter(s => s.status === "preferential").length,
      revenueWeek,
    });
  } catch (err) {
    res.status(500).json({ message: "Erro.", error: err.message });
  }
});

// PATCH /api/admin/users/:id/toggle — ativar/desativar usuário
router.patch("/users/:id/toggle", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "Usuário não encontrado." });
    user.ativo = !user.ativo;
    await user.save();
    res.json({ message: `Usuário ${user.ativo ? "ativado" : "desativado"}.`, user });
  } catch (err) {
    res.status(500).json({ message: "Erro.", error: err.message });
  }
});

// POST /api/admin/reservations/:id/cancel — cancelar reserva pelo admin
router.post("/reservations/:id/cancel", async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id).populate("spot");
    if (!reservation) return res.status(404).json({ message: "Reserva não encontrada." });
    if (reservation.status !== "active") return res.status(400).json({ message: "Reserva já encerrada." });

    reservation.status = "cancelled";
    await reservation.save();

    const spot = reservation.spot;
    if (spot) {
      spot.status = spot.originalStatus === "preferential" ? "preferential" : "available";
      spot.reservedBy = null; spot.activeReservation = null;
      await spot.save();
    }

    await AccessLog.create({
      user: req.user._id, email: req.user.email,
      action: `[ADMIN] Cancelou reserva da vaga ${reservation.spotNumber}`,
    });

    res.json({ message: "Reserva cancelada pelo admin." });
  } catch (err) {
    res.status(500).json({ message: "Erro.", error: err.message });
  }
});

module.exports = router;
