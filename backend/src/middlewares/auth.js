// Reaproveita a mesma lógica do authMiddleware (JWT)
const authMiddleware = require("./authMiddleware");

// Exporta como objeto, para funcionar com:
// const { authMiddleware } = require("../middleware/auth");
module.exports = { authMiddleware };

