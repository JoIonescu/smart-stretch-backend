const crypto = require("crypto");

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { installationId, licenseToken } = req.body;

  if (!installationId || !licenseToken) {
    return res.status(400).json({ valid: false });
  }

  try {
    const expected = crypto
      .createHmac("sha256", process.env.LICENSE_SECRET)
      .update(installationId)
      .digest("hex");

    const tokenBuf    = Buffer.from(licenseToken.slice(0, expected.length).padEnd(expected.length, "0"), "hex");
    const expectedBuf = Buffer.from(expected, "hex");

    const valid = tokenBuf.length === expectedBuf.length &&
      crypto.timingSafeEqual(tokenBuf, expectedBuf);

    res.json({ valid });
  } catch (e) {
    res.json({ valid: false });
  }
};
