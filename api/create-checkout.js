const Stripe = require("stripe");

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { installationId } = req.body;
  if (!installationId) return res.status(400).json({ error: "Missing installationId" });

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const baseUrl = process.env.BASE_URL;

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "eur",
          product_data: {
            name: "Smart Stretch Pro",
            description: "Skip during meetings — Google Calendar integration. One-time purchase."
          },
          unit_amount: 300 // €3.00
        },
        quantity: 1
      }
    ],
    mode: "payment",
    success_url: `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}&install_id=${installationId}`,
    cancel_url: `${baseUrl}/cancel`,
    metadata: { installationId }
  });

  res.json({ checkoutUrl: session.url, sessionId: session.id });
};
