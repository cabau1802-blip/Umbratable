// backend/src/services/user.service.js
const { pool } = require("../db");

async function areUsersFriends(userAId, userBId) {
  if (!userAId || !userBId) return false;
  const a = String(userAId);
  const b = String(userBId);
  if (a === b) return true;

  const { rows } = await pool.query(
    `
    SELECT 1
    FROM friend_requests fr
    WHERE fr.status = 'accepted'
      AND (
        (fr.from_user_id = $1 AND fr.to_user_id = $2)
        OR
        (fr.from_user_id = $2 AND fr.to_user_id = $1)
      )
    LIMIT 1
  `,
    [a, b]
  );

  return rows.length > 0;
}

module.exports = { areUsersFriends };
