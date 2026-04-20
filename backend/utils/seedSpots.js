const Spot = require("../models/Spot");

// Configuração inicial das 20 vagas
// Vagas D16-D20 são preferenciais, as demais são available
const SPOTS_CONFIG = [
  { spotNumber: 1,  row: "A", originalStatus: "available"    },
  { spotNumber: 2,  row: "A", originalStatus: "available"    },
  { spotNumber: 3,  row: "A", originalStatus: "available"    },
  { spotNumber: 4,  row: "A", originalStatus: "available"    },
  { spotNumber: 5,  row: "A", originalStatus: "available"    },
  { spotNumber: 6,  row: "B", originalStatus: "available"    },
  { spotNumber: 7,  row: "B", originalStatus: "available"    },
  { spotNumber: 8,  row: "B", originalStatus: "available"    },
  { spotNumber: 9,  row: "B", originalStatus: "available"    },
  { spotNumber: 10, row: "B", originalStatus: "available"    },
  { spotNumber: 11, row: "C", originalStatus: "available"    },
  { spotNumber: 12, row: "C", originalStatus: "available"    },
  { spotNumber: 13, row: "C", originalStatus: "available"    },
  { spotNumber: 14, row: "C", originalStatus: "available"    },
  { spotNumber: 15, row: "C", originalStatus: "available"    },
  { spotNumber: 16, row: "D", originalStatus: "preferential" },
  { spotNumber: 17, row: "D", originalStatus: "preferential" },
  { spotNumber: 18, row: "D", originalStatus: "preferential" },
  { spotNumber: 19, row: "D", originalStatus: "preferential" },
  { spotNumber: 20, row: "D", originalStatus: "preferential" },
];

module.exports = async function seedSpots() {
  const count = await Spot.countDocuments();
  if (count > 0) {
    console.log(`ℹ️  Vagas já existem no banco (${count}). Seed ignorado.`);
    return;
  }
  const docs = SPOTS_CONFIG.map(s => ({ ...s, status: s.originalStatus }));
  await Spot.insertMany(docs);
  console.log("🅿️  20 vagas criadas no banco de dados.");
};
