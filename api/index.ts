import express from "express";
import Stripe from "stripe";
import dotenv from "dotenv";
import * as admin from "firebase-admin";
import path from "path";
import fs from "fs";

dotenv.config();

const app = express();
app.use(express.json());

// Inicializa Firebase Admin de forma segura para Serverless
try {
  if (admin.apps.length === 0) {
    // Tenta carregar do arquivo local, mas não trava se não existir
    const configPath = path.join(process.cwd(), "firebase-applet-config.json");
    if (fs.existsSync(configPath)) {
      const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      admin.initializeApp({
        projectId: firebaseConfig.projectId,
      });
      console.log("Firebase Admin inicializado.");
    }
  }
} catch (e) {
  console.error("Erro Firebase Admin:", e);
}

let stripeClient: Stripe | null = null;

const getStripe = async () => {
  if (!stripeClient) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY ausente.");
    stripeClient = new Stripe(key);
  }
  return stripeClient;
};

// Rotas da API
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", env: process.env.NODE_ENV });
});

app.post("/api/create-checkout-session", async (req, res) => {
  try {
    const stripe = await getStripe();
    const appUrl = process.env.APP_URL || `https://${process.env.VERCEL_URL}`;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card", "pix"],
      payment_method_options: { pix: { expires_after_seconds: 3600 } },
      line_items: [
        {
          price_data: {
            currency: "brl",
            product_data: {
              name: "Nexis Flow Premium",
              description: "Suporte ao Projeto",
            },
            unit_amount: 2990,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${appUrl}?payment=success`,
      cancel_url: `${appUrl}?payment=cancel`,
    });

    res.json({ id: session.id, url: session.url });
  } catch (error: any) {
    console.error("Stripe Error:", error);
    res.status(500).json({ error: error.message });
  }
});

export default app;
