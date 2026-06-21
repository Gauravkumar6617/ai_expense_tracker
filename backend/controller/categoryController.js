import pool from "../db.js";



// to get user categroy id
export const getCategory = async (req, res) => {
    try {
        const userId = req.userId
        const client = await pool.connect()
        const result = await client.query("SELECT * FROM categories WHERE user_id = $1 ORDER BY type , name", [userId])
        client.release()
        res.json(result.rows)
    } catch (error) {
        console.log("error while getting categories", error)
        res.status(500).json({ message: "Internal server error" })
    }
}


// to add new category
export const addCategory = async (req, res) => {
    try {
        const userId = req.userId
        const { name, type } = req.body
        if (!name || !type) {
            return res.status(400).json({ message: "Name and type are required" })
        }
        if (type !== "expense" && type !== "income") {
            return res.status(400).json({ message: "Please enter a valid category type" })
        }
        const client = await pool.connect()
        const result = await client.query("INSERT INTO categories (user_id, name, type ,icon,color ,is_default) VALUES ($1, $2, $3,$4,$5,$6) RETURNING *", [userId, name, type, icon || null, color || null, false])
        client.release()
        res.status(201).json(result.rows[0])
    } catch (error) {
        // 23505 code to check value already exist or not 
        if (error.code === "23505") {
            return res.status(400).json({ message: "Category already exists" })
        }
        console.log("error while adding category", error)
        res.status(500).json({ message: "Internal server error" })
    }
}

export const updateCategory = async (req, res) => {
    const { id } = req.params
    const { name, type, color, icon } = req.body
    const userId = req.userId
    const client = await pool.connect()
    try {
        // using coalesce to update only the fields that are provided
        const result = await client.query("UPDATE categories SET name = COALESCE($1,name), type = COALESCE($2,type), color = COALESCE($3,color), icon = COALESCE($4,icon) WHERE id = $5 AND user_id = $6 RETURNING *", [name, type, color, icon, id, userId])
        client.release()
        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Category not found" })
        }
        res.status(200).json(result.rows[0])
    } catch (error) {
        console.log("error while updating category", error)
        res.status(500).json({ message: "Internal server error" })
    }
}

export const deleteCategory = async (req, res) => {
    const { id } = req.params
    const userId = req.userId
    const client = await pool.connect()
    try {
        const result = await client.query("DELETE FROM categories WHERE id = $1 AND user_id = $2 RETURNING *", [id, userId])
        client.release()
        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Category not found" })
        }
        res.status(200).json(result.rows[0])
    } catch (error) {
        console.log("error while deleting category", error)
        res.status(500).json({ message: "Internal server error" })
    }
}