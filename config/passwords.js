const crypto = require("crypto");
const { promisify } = require("util");

const scrypt = promisify(crypto.scrypt);

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("base64url");
  const derivedKey = await scrypt(password, salt, 64);
  return `scrypt:${salt}:${derivedKey.toString("base64url")}`;
}

async function verifyPassword(password, passwordHash) {
  const [method, salt, storedKey] = String(passwordHash).split(":");
  if (method !== "scrypt" || !salt || !storedKey) return false;

  const derivedKey = await scrypt(password, salt, 64);
  const storedBuffer = Buffer.from(storedKey, "base64url");

  return (
    storedBuffer.length === derivedKey.length &&
    crypto.timingSafeEqual(storedBuffer, derivedKey)
  );
}

module.exports = {
  hashPassword,
  verifyPassword,
};
