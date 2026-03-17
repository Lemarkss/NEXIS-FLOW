import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import Stripe from "stripe";
import dotenv from "dotenv";
import * as admin from "firebase-admin";
import fs from "fs";

dotenv.config();

console.log("Iniciando servidor...");

// Inicializa Firebase Admin de forma segura
let dbAdmin: any = null;
try {
  if (admin.apps.length === 0) {
    const configPath = path.join(process.cwd(), "firebase-applet-config.json");
    if (fs.existsSync(configPath)) {
      const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      admin.initializeApp({
        projectId: firebaseConfig.projectId,
      });
      dbAdmin = admin.firestore();
      if (firebaseConfig.firestoreDatabaseId) {
        // @ts-ignore
        dbAdmin.settings({ databaseId: firebaseConfig.firestoreDatabaseId });
      }
      console.log("Firebase Admin inicializado com sucesso.");
    } else {
      console.warn("firebase-applet-config.json não encontrado. Admin SDK não inicializado.");
    }
  }
} catch (e) {
  console.error("Erro ao inicializar Firebase Admin:", e);
}

export const app = express();

async function startServer() {
  const PORT = 3000;

  app.use(express.json());

  // Stripe Lazy Initialization com Fallback para Firestore
  let stripeClient: Stripe | null = null;
  
  const getStripe = async () => {
    if (!stripeClient) {
      let key = process.env.STRIPE_SECRET_KEY;
      
      // Se não estiver no .env, tenta buscar no Firestore (Configuração Manual)
      if (!key && dbAdmin) {
        try {
          const configDoc = await dbAdmin.collection('config').doc('stripe').get();
          if (configDoc.exists) {
            key = configDoc.data()?.secretKey;
            console.log("Chave do Stripe carregada do Firestore.");
          }
        } catch (e) {
          console.error("Erro ao buscar chave no Firestore:", e);
        }
      }

      if (!key) {
        throw new Error("STRIPE_SECRET_KEY is not set. Use a página de Admin no app para configurar.");
      }
      stripeClient = new Stripe(key);
    }
    return stripeClient;
  };

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/create-checkout-session", async (req, res) => {
    try {
      const stripe = await getStripe();
      
      // Busca a URL do app no Firestore se não estiver no .env
      let appUrl = process.env.APP_URL;
      if (!appUrl) {
        const configDoc = await dbAdmin.collection('config').doc('stripe').get();
        appUrl = configDoc.data()?.appUrl;
      }

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card", "pix"],
        payment_method_options: {
          pix: {
            expires_after_seconds: 3600,
          },
        },
        line_items: [
          {
            price_data: {
              currency: "brl",
              product_data: {
                name: "Nexis Flow Premium - Suporte ao Projeto",
                description: "Acesso a recursos avançados e suporte prioritário.",
              },
              unit_amount: 2990,
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${appUrl || "http://localhost:3000"}?payment=success`,
        cancel_url: `${appUrl || "http://localhost:3000"}?payment=cancel`,
      });

      res.json({ id: session.id, url: session.url });
    } catch (error: any) {
      console.error("Stripe Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  if (process.env.NODE_ENV === "production") {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  if (process.env.NODE_ENV !== "production") {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://0.0.0.0:${PORT}`);
    });
  }
}

startServer();

export default app;
