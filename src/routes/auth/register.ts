import express from 'express';
import User from '../../models/users';
import validateRequired from '../../middlewares/validateRequired';
import bcrypt from 'bcrypt';

const router = express.Router();

router.post('/', validateRequired(['name', 'email', 'password', 'confirmPassword', 'phone']), async (req, res) => {
    try {
        const { name, email, password, confirmPassword, phone } = req.body;

        if (typeof name !== 'string' || typeof email !== 'string' || typeof password !== 'string' || typeof phone !== 'string') {
            return res.status(400).json({ message: 'Datos enviados incorrectamente' });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ message: 'El formato del email no es válido' });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({ message: 'Las contraseñas no coinciden' });
        }

        if (password.length < 6) {
            return res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres' });
        }

        const phoneRegex = /^\d+$/;
        if (!phoneRegex.test(phone)) {
            return res.status(400).json({ message: 'El teléfono debe contener solo números' });
        }

        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ message: 'El usuario ya existe' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await User.create({
            name,
            email,
            password: hashedPassword,
            phone,
            role: 'user',
            status: 'active'
        });

        const { password: _, ...userWithoutPassword } = newUser.toJSON();

        res.status(201).json(userWithoutPassword);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

export default router;