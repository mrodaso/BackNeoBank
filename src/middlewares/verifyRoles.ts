import { Request, Response, NextFunction } from 'express';

const verifyRoles = (allowedRoles: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!(req as any).user) {
            return res.status(401).json({ message: 'Usuario no autenticado.' });
        }

        const hasPermission = allowedRoles.includes((req as any).user.role);

        if (!hasPermission) {
            return res.status(403).json({ message: 'No tienes permiso para acceder a este recurso.' });
        }

        next();
    };
};

export default verifyRoles;