import express from 'express';
import User from '../../models/users';
import validateRequired from '../../middlewares/validateRequired';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const router = express.Router();

// Login
router.post('/', validateRequired(['email', 'password']), async (req, res) => {
    try {
        const user = await User.findOne({ where: { email: req.body.email } });
        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        const passwordMatch = await bcrypt.compare(req.body.password, user.password);
        if (!passwordMatch) {
            return res.status(401).json({ error: 'Contraseña incorrecta' });
        }

        const secret = process.env.JWT_SECRET || '';
        const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, secret , { expiresIn: '7h' });

        return res.status(200).json({ message: '¡Bienvenido!', token });

    } catch (error) {
        console.error('Error al iniciar sesión:', error);
        return res.status(500).json({ error: 'Error al iniciar sesión' });
    }
});

export default router;