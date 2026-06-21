import express from "express";
import { getCategory, addCategory, updateCategory, deleteCategory } from "../controller/categoryController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.get("/", (req, res) => {
    // #swagger.tags = ['Categories']
    // #swagger.summary = 'Get all categories for the user'
    // #swagger.security = [{ "BearerAuth": [] }]
    // #swagger.responses[200] = { description: 'List of categories', schema: [{ $ref: '#/definitions/Category' }] }
    getCategory(req, res);
});

router.post("/", (req, res) => {
    // #swagger.tags = ['Categories']
    // #swagger.summary = 'Add a new category'
    // #swagger.security = [{ "BearerAuth": [] }]
    // #swagger.parameters['body'] = { in: 'body', schema: { $ref: '#/definitions/AddCategoryRequest' } }
    // #swagger.responses[201] = { description: 'Category created', schema: { $ref: '#/definitions/Category' } }
    // #swagger.responses[400] = { description: 'Validation error', schema: { $ref: '#/definitions/ErrorResponse' } }
    addCategory(req, res);
});

router.put("/:id", (req, res) => {
    // #swagger.tags = ['Categories']
    // #swagger.summary = 'Update a category'
    // #swagger.security = [{ "BearerAuth": [] }]
    // #swagger.parameters['body'] = { in: 'body', schema: { $ref: '#/definitions/UpdateCategoryRequest' } }
    // #swagger.responses[200] = { description: 'Category updated', schema: { $ref: '#/definitions/Category' } }
    // #swagger.responses[404] = { description: 'Category not found', schema: { $ref: '#/definitions/ErrorResponse' } }
    updateCategory(req, res);
});

router.delete("/:id", (req, res) => {
    // #swagger.tags = ['Categories']
    // #swagger.summary = 'Delete a category'
    // #swagger.security = [{ "BearerAuth": [] }]
    // #swagger.responses[200] = { description: 'Category deleted', schema: { $ref: '#/definitions/Category' } }
    // #swagger.responses[404] = { description: 'Category not found', schema: { $ref: '#/definitions/ErrorResponse' } }
    deleteCategory(req, res);
});

export default router;