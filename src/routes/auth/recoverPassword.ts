import express from 'express';
import bcrypt from 'bcrypt';
import { Op } from 'sequelize';
import User from '../../models/users';
import TempCodes from '../../models/tempCodes';
import validateRequired from '../../middlewares/validateRequired';
import { sendEmailRecovery } from '../../utils/email';

const router = express.Router();

// Paso 1: Solicitar código de recuperación
router.post('/init', validateRequired(['email']), async (req, res) => {
    try {
        const { email } = req.body;

        if (typeof email !== 'string') {
            return res.status(400).json({ message: 'El email debe ser un texto' });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ message: 'El formato del email no es válido' });
        }

        const user = await User.findOne({ where: { email } });

        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

        await TempCodes.create({
            email,
            code,
            type: 'recovery_password',
            expiresAt
        });

        // Enviar correo de recuperación
        await sendEmailRecovery(user.email, code);

        res.status(200).json({ message: 'Correo de recuperación enviado con éxito' });

    } catch (error) {
        console.error('Error al solicitar recuperación de contraseña:', error);
        res.status(500).json({ 
            message: 'Error interno del servidor',
            error: error instanceof Error ? error.message : 'Error desconocido'
        });
    }
});

// Paso 2: Verificar código
router.post('/verify-code', validateRequired(['email', 'code']), async (req, res) => {
    try {
        const { email, code } = req.body;

        const tempCode = await TempCodes.findOne({
            where: {
                email,
                code,
                type: 'recovery_password',
                expiresAt: {
                    [Op.gt]: new Date() // El código debe expirar en el futuro
                }
            },
            order: [['createdAt', 'DESC']] // Obtener el más reciente si hay varios
        });

        if (!tempCode) {
            return res.status(400).json({ message: 'Código inválido o expirado' });
        }

        res.status(200).json({ message: 'Código verificado correctamente' });

    } catch (error) {
        console.error('Error al verificar código:', error);
        res.status(500).json({ 
            message: 'Error interno del servidor',
            error: error instanceof Error ? error.message : 'Error desconocido'
        });
    }
});

// Paso 3: Actualizar contraseña
router.post('/reset-password', validateRequired(['email', 'code', 'newPassword']), async (req, res) => {
    try {
        const { email, code, newPassword } = req.body;

        // Verificar código nuevamente por seguridad
        const tempCode = await TempCodes.findOne({
            where: {
                email,
                code,
                type: 'recovery_password'
            }
        });

        if (!tempCode) {
            return res.status(400).json({ message: 'Código inválido' });
        }
        
        if (tempCode.expiresAt < new Date()) {
             return res.status(400).json({ message: 'El código ha expirado' });
        }

        const user = await User.findOne({ where: { email } });

        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        const encryptedPassword = await bcrypt.hash(newPassword, 10);

        await user.update({ password: encryptedPassword });

        // Opcional: Eliminar o invalidar el código usado
        await tempCode.destroy();

        res.status(200).json({ message: 'Contraseña actualizada con éxito' });

    } catch (error) {
        console.error('Error al actualizar contraseña:', error);
        res.status(500).json({ 
            message: 'Error interno del servidor',
            error: error instanceof Error ? error.message : 'Error desconocido'
        });
    }
});

export default router;
