import express from "express";
import cors from "cors";
import pool from "./db.js";
import dotenv from "dotenv";
import swaggerUi from "swagger-ui-express";
import swaggerJsdoc from "swagger-jsdoc";
import authRoutes from "./routes/authRoutes.js";

const app = express();
dotenv.config();

app.use(cors());
app.use(express.json());
const port = process.env.PORT || 8000;

// Swagger auto-generated config
const swaggerOptions = {
  definition: {
    openapi: "3.0.3",
    info: {
      title: "AI Expense Tracker API",
      description: "API documentation for the AI Expense Tracker application",
      version: "1.0.0",
    },
    servers: [
      {
        url: `http://localhost:${port}`,
        description: "Local development server",
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
  },
  apis: ["./routes/*.js"], // Path to files with JSDoc comments
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.use("/api/auth", authRoutes);

app.listen(port, () => {
  console.log(`App listening on port ${port}`);
  console.log(`Swagger docs available at http://localhost:${port}/api-docs`);
});

export default app;