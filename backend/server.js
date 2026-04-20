require("dotenv").config();
const express = require("express");
const cors    = require("cors");
const mongoose = require("mongoose");

const authRoutes        = require("./routes/auth");
const spotsRoutes       = require("./routes/spots");
const reservationsRoutes = require("./routes/reservations");
const adminRoutes       = require("./routes/admin");

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Middlewares ──────────────────────────────────────────
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || origin.includes("localhost")) {
      return callback(null, true);
    }
    callback(new Error("CORS bloqueado"));
  },
  credentials: true,
}));
app.use(express.json());

// ── Rotas ────────────────────────────────────────────────
app.use("/api/auth",         authRoutes);
app.use("/api/spots",        spotsRoutes);
app.use("/api/reservations", reservationsRoutes);
app.use("/api/admin",        adminRoutes);

// Rota de health check
app.get("/api/health", (req, res) => res.json({ status: "ok", message: "Estacionamento OMV API rodando" }));

// ── Conexão MongoDB + start ──────────────────────────────
mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("✅ Conectado ao MongoDB");
    // Inicializa as vagas no banco se ainda não existirem
    await require("./utils/seedSpots")();
    app.listen(PORT, () => console.log(`🚀 Servidor rodando na porta ${PORT}`));
  })
  .catch((err) => {
    console.error("❌ Erro ao conectar ao MongoDB:", err.message);
    process.exit(1);
  });
