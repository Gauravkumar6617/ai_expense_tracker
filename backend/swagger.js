import swaggerAutogen from "swagger-autogen";

const doc = {
    info: {
        title: "AI Expense Tracker API",
        description: "API documentation for the AI Expense Tracker application",
        version: "1.0.0",
    },
    host: "localhost:8000",
    schemes: ["http"],
    securityDefinitions: {
        BearerAuth: {
            type: "apiKey",
            in: "header",
            name: "Authorization",
            description: "Enter your Bearer token as: Bearer <token>",
        },
    },
    tags: [
        { name: "Authentication", description: "User auth endpoints" },
        { name: "Categories", description: "Category management endpoints" },
    ],
    definitions: {
        User: {
            id: 1,
            name: "John Doe",
            email: "john@example.com",
            curreny: "USD",
            created_at: "2026-06-21T10:00:00.000Z",
        },
        RegisterRequest: {
            $name: "John Doe",
            $email: "john@example.com",
            $hash_password: "secret123",
            curreny: "USD",
        },
        LoginRequest: {
            $email: "john@example.com",
            $hash_password: "secret123",
        },
        AuthResponse: {
            user: { $ref: "#/definitions/User" },
            token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        },
        Category: {
            id: 1,
            user_id: 1,
            name: "Food",
            type: "expense",
            icon: "🍔",
            color: "#FF5733",
            is_default: false,
        },
        AddCategoryRequest: {
            $name: "Groceries",
            $type: "expense",
            icon: "🛒",
            color: "#4CAF50",
        },
        UpdateCategoryRequest: {
            name: "Dining Out",
            type: "expense",
            icon: "🍽️",
            color: "#E91E63",
        },
        ErrorResponse: {
            message: "Something went wrong",
        },
    },
};

const outputFile = "./swagger-output.json";
const routes = ["./server.js"];

swaggerAutogen()(outputFile, routes, doc).then(() => {
    console.log("✅ Swagger spec generated at swagger-output.json");
});
