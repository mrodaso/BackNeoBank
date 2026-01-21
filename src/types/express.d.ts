import { UserAttributes } from '../models/users';

declare global {
    namespace Express {
        interface Request {
            user?: UserAttributes;
        }
    }
}