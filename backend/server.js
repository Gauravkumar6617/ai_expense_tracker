import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import swaggerUi from "swagger-ui-express";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import authRoutes from "./routes/authRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import transactionRoutes from "./routes/transcationRouter.js";
import budgetRoutes from "./routes/budgetRoutes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
dotenv.config();

app.use(cors());
app.use(express.json());
const port = process.env.PORT || 8000;

// Load auto-generated swagger spec
const swaggerFile = JSON.parse(
  readFileSync(join(__dirname, "swagger-output.json"), "utf-8"),
);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerFile));

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.use("/api/auth", authRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/budgets", budgetRoutes);
app.use(
  "/api/dashboard",
  (await import("./routes/dashboardRouter.js")).default,
);
app.use("/api/insights", (await import("./routes/inSightRoutes.js")).default);

app.listen(port, () => {
  console.log(`App listening on port ${port}`);
  console.log(`Swagger docs available at http://localhost:${port}/api-docs`);
});

export default app;
