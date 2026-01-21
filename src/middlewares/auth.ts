import { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';

dotenv.config();

const auth = (req: Request, res: Response, next: NextFunction) => {

    const authEnv = process.env.AUTH;
    const authHeader = req.headers['auth'];

    if (authHeader === authEnv) {
        next();
    } else {
        res.status(403).json({ message: 'Acceso no autorizado' });
    }
};

export default auth;