const Stripe = require("stripe");
const crypto = require("crypto");

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { sessionId, installationId } = req.body;

  if (!sessionId || !installationId) {
    return res.status(400).json({ error: "Missing sessionId or installationId" });
  }

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid") {
      return res.json({ paid: false });
    }

    const licenseToken = crypto
      .createHmac("sha256", process.env.LICENSE_SECRET)
      .update(installationId)
      .digest("hex");

    res.json({ paid: true, licenseToken });
  } catch (e) {
    console.error("verify-payment error:", e.message);
    res.status(400).json({ error: e.message });
  }
};
