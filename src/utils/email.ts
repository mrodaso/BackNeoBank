import nodemailer from 'nodemailer';

interface MailOptions {
    from: string;
    to: string;
    subject: string;
    text: string;
    html: string;
}

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT),
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
    tls: {
        rejectUnauthorized: false
    }
});

// Función auxiliar para verificar si hay configuración de email
const isEmailConfigured = () => {
    return process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS;
};

export const sendEmailRegister = async (username: string): Promise<void> => {
    if (!isEmailConfigured()) {
        console.log('⚠️ ADVERTENCIA: No hay configuración de email. Se simula el envío.');
        console.log(`[SIMULACIÓN] Email de bienvenida para: ${username}`);
        return;
    }

    const mailOptions: MailOptions = {
        from: process.env.EMAIL_USER as string,
        to: username,
        subject: 'Bienvenido a Nuestra Plataforma',
        text: `Hola ${username},\n\nGracias por registrarte en nuestra plataforma. ¡Estamos encantados de tenerte con nosotros!`,
        html: `<b>Hola ${username}</b>,<br><br>Gracias por registrarte en nuestra plataforma. ¡Estamos encantados de tenerte con nosotros!`
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('Correo de bienvenida enviado con éxito');
    } catch (error) {
        console.error('Error al enviar correo de bienvenida:', error);
        throw error;
    }
};

export const sendEmailRecovery = async (email: string, code: string): Promise<void> => {
    if (!isEmailConfigured()) {
        console.log('⚠️ ADVERTENCIA: No hay configuración de email. Se simula el envío.');
        console.log(`[SIMULACIÓN] Email de recuperación para: ${email}, Código: ${code}`);
        return;
    }

    const mailOptions: MailOptions = {
        from: process.env.EMAIL_USER as string,
        to: email,
        subject: 'Recuperación de contraseña',
        text: `Hola,\n\nHemos recibido una solicitud para recuperar tu contraseña. Si no fuiste tú, ignora este correo.\n\nTu código de recuperación es: ${code}\n\nEste código expira en 15 minutos.`,
        html: `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Recuperación de Contraseña</title>
</head>
<body style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f4f7; color: #51545e; margin: 0; padding: 0; width: 100% !important;">
    <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="background-color: #ffffff; padding: 45px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); text-align: center;">
            <h1 style="color: #333333; font-size: 24px; font-weight: bold; margin-bottom: 25px; text-transform: uppercase; letter-spacing: 1px;">Recuperación de Contraseña</h1>
            
            <p style="font-size: 16px; line-height: 1.6; color: #51545e; margin-bottom: 25px;">
                Hemos recibido una solicitud para restablecer la contraseña de tu cuenta. Para continuar, utiliza el siguiente código de verificación:
            </p>
            
            <div style="background-color: #f0f4f8; border-radius: 6px; padding: 20px; margin: 30px 0; display: inline-block; border: 1px solid #e1e4e8;">
                <span style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #2d3748; font-family: 'Courier New', monospace;">${code}</span>
            </div>
            
            <p style="font-size: 14px; color: #718096; margin-bottom: 30px;">
                Este código expirará en <strong>15 minutos</strong> por razones de seguridad.
            </p>
            
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
            
            <p style="font-size: 13px; color: #a0aec0; margin-top: 20px; font-style: italic;">
                Si tú no has solicitado este cambio, por favor ignora este correo electrónico. Tu cuenta sigue siendo segura.
            </p>
        </div>
        
        <div style="text-align: center; padding-top: 25px;">
            <p style="font-size: 12px; color: #a0aec0; margin: 0;">&copy; ${new Date().getFullYear()} Nuestra Plataforma. Todos los derechos reservados.</p>
        </div>
    </div>
</body>
</html>
`
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('Correo de recuperación enviado con éxito');
    } catch (error) {
        console.error('Error al enviar correo de recuperación:', error);
        throw error;
    }
};

export default sendEmailRegister;