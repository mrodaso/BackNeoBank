import express from 'express';
import User from '../../../models/users';
import Profile from '../../../models/profile';
import validateRequired from '../../../middlewares/validateRequired';
import bcrypt from 'bcrypt';
const router = express.Router();

// Crud completo de usuarios con relación al perfil
router.post('/', validateRequired(['name', 'email', 'password', 'phone', 'role', 'status', 'address', 'document', 'document_type', 'birth_date']), async (req, res) => {
    try {

        const { name, email, password, phone, role, status, address, document, document_type, birth_date } = req.body;

        const ExistingUser = await User.findOne({ where: { email } });
        if (ExistingUser) {
            return res.status(400).json({ message: "User already exists" });
        }

        const encryptedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({ name, email, password: encryptedPassword, phone, role, status });

        const userId = user.id;
        if (!userId) {
            return res.status(500).json({ message: "User creation failed" });
        }

        const existingProfile = await Profile.findOne({ where: { user_id: userId } });
        if (existingProfile) {
            return res.status(400).json({ message: "Profile already exists for this user" });
        }

        const profile = await Profile.create({
            user_id: userId,
            address,
            document,
            document_type,
            birth_date,
        });

        res.status(201).json({ user, profile });
        
    } catch (error) {
        console.error("Error creating user:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

router.get('/', async (req, res) => {
    try {
        const users = await User.findAll();
        res.status(200).json(users);
    } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

router.get('/:id', async (req, res) => {
    try {
        if (!req.params.id) {
            return res.status(400).json({ message: "User ID is required" });
        }

        const { id } = req.params;
        const user = await User.findOne({ where: { id } });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.status(200).json(user);
    } catch (error) {
        console.error("Error fetching user:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

router.put('/:id', validateRequired(['name', 'email', 'password', 'phone', 'role', 'status']), async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, password, phone, role, status } = req.body;

        const user = await User.findOne({ where: { id } });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const encryptedPassword = await bcrypt.hash(password, 10);
        await user.update({ name, email, password: encryptedPassword, phone, role, status });
        res.status(200).json(user);
    } catch (error) {
        console.error("Error updating user:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

router.delete('/:id', async (req, res) => {
    try {

        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ message: "User ID is required" });
        }
        const user = await User.findOne({ where: { id } });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        await user.destroy();
        res.status(201).send();
        res.json({ message: "User deleted successfully" });
    } catch (error) {
        console.error("Error deleting user:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});



export default router;