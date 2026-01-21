import express from 'express';
import dotenv from 'dotenv';
import sequelize from './config/database';
import mainRoutes from './main_routes';
import seed from '../src/seed';
import cors from 'cors';
import path from 'path';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 100, 
    message: { error: 'Demasiadas solicitudes, por favor intenta más tarde' }
});

app.use(morgan('dev'));
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Auth'],
    exposedHeaders: ['Content-Disposition']
}))

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/', mainRoutes, apiLimiter);

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.get("/", (req, res) => {
    res.send("¡Hola Mundo!");
});

sequelize
    .sync()
    .then(async () => {
        await seed();;
        app.listen(port, () => {
            console.log(`Server running on port ${port}`);
        });
    })
    .catch((error) => {
        console.error("No se pudo conectar a la base de datos:", error);
    });

