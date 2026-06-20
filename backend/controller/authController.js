import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { defaultCategories } from "../utils/defaultCategory";
import pool from "../db";

const signToken = (userId) => {
    return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "7d" });
}

export const Register = async (req, res) => {
    const { name, email, hash_password, curreny = 'USD' } = req.body;
    if (!name || !email || !hash_password) {
        return res.status(400).json({ 'message': "Name,Email and Password are required" })
    }
    if (hash_password.length < 6) {
        return res.status(400).json({ 'message': "Minimun password length is 6" })
    }

    const client = await pool.connect();
    try {
        const existing_user = await client.query('SELECT * FROM users WHERE email = $1', [email]);
        if (existing_user.rows.length > 0) {
            return res.status(400).json({ "message": "User already exists" })
        }
        await client.query('BEGIN');
        const salt = await bcrypt.genSalt(10);
        const hashed_password = await bcrypt.hash(hash_password, salt);
        const userResult = await client.query(
            'INSERT INTO users (name, email, hash_password, curreny) VALUES ($1, $2, $3, $4) RETURNING id,name,email,curreny,created_at',
            [name, email, hashed_password, curreny]


        );
        const user = userResult.rows[0];

        for (const category of defaultCategories) {
            await client.query(
                'INSERT INTO category (name, type, icon, color, user_id) VALUES ($1, $2, $3, $4, $5)',
                [category.name, category.type, category.icon, category.color, user.id]
            );

        }
        await client.query('COMMIT');
        const token = signToken(user.id);
        return res.status(201).json({ user, token });
    }
    catch (error) {
        await client.query('ROLLBACK');
        console.log('error while regsitering the account',error);
        res.status(501).json({"message":"Something went wrong"});
    }
    finally {
        client.release();
    }


};