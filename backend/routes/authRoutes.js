import express from "express";
import { Register, Login, getMe } from "../controller/authController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register", (req, res) => {
    // #swagger.tags = ['Authentication']
    // #swagger.summary = 'Register a new user'
    // #swagger.description = 'Creates a new user account with default expense categories and returns a JWT token.'
    // #swagger.parameters['body'] = { in: 'body', schema: { $ref: '#/definitions/RegisterRequest' } }
    // #swagger.responses[201] = { description: 'User registered', schema: { $ref: '#/definitions/AuthResponse' } }
    // #swagger.responses[400] = { description: 'Validation error', schema: { $ref: '#/definitions/ErrorResponse' } }
    Register(req, res);
});

router.post("/login", (req, res) => {
    // #swagger.tags = ['Authentication']
    // #swagger.summary = 'Login a user'
    // #swagger.description = 'Authenticates a user with email and password, returns a JWT token.'
    // #swagger.parameters['body'] = { in: 'body', schema: { $ref: '#/definitions/LoginRequest' } }
    // #swagger.responses[200] = { description: 'Login successful', schema: { $ref: '#/definitions/AuthResponse' } }
    // #swagger.responses[400] = { description: 'Invalid credentials', schema: { $ref: '#/definitions/ErrorResponse' } }
    Login(req, res);
});

router.get("/me", protect, (req, res) => {
    // #swagger.tags = ['Authentication']
    // #swagger.summary = 'Get current user profile'
    // #swagger.description = 'Returns the authenticated user profile. Requires a valid JWT token.'
    // #swagger.security = [{ "BearerAuth": [] }]
    // #swagger.responses[200] = { description: 'User profile', schema: { user: { $ref: '#/definitions/User' } } }
    // #swagger.responses[401] = { description: 'Unauthorized', schema: { $ref: '#/definitions/ErrorResponse' } }
    getMe(req, res);
});

export default router;