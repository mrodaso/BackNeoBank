import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { Request, Response, NextFunction } from 'express';

// Tipos y constantes
export interface FileInfo {
    fieldname: string;
    originalname: string;
    encoding: string;
    mimetype: string;
    destination: string;
    filename: string;
    path: string;
    size: number;
    url?: string;
}

export interface MulterFiles {
    [fieldname: string]: Express.Multer.File[];
}

export enum FileType {
    IMAGE = 'image',
    DOCUMENT = 'document',
    ALL = 'all'
}

// Constantes de configuración
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES = 20;
const UPLOAD_PATH = path.join(__dirname, '../../uploads');

// Tipos MIME permitidos
const ALLOWED_MIME_TYPES = {
    image: ['image/jpeg', 'image/png', 'image/gif'],
    document: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    all: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
};

// Inicializar directorio de uploads
const initializeUploadDir = (): void => {
    if (!fs.existsSync(UPLOAD_PATH)) {
        fs.mkdirSync(UPLOAD_PATH, { recursive: true });
    }
};

// Configuración del almacenamiento
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        initializeUploadDir();
        cb(null, UPLOAD_PATH);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

// Crear filtro de tipos de archivo
const createFileFilter = (fileType: FileType = FileType.ALL) => {
    return (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
        const allowedTypes = ALLOWED_MIME_TYPES[fileType];

        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`Tipo de archivo no permitido. Permitidos: ${allowedTypes.join(', ')}`));
        }
    };
};

// Configuración de multer con opciones personalizables
export const createMulterUpload = (options: {
    fileType?: FileType,
    maxFileSize?: number,
    maxFiles?: number
} = {}) => {
    const {
        fileType = FileType.ALL,
        maxFileSize = MAX_FILE_SIZE,
        maxFiles = MAX_FILES
    } = options;

    return multer({
        storage,
        fileFilter: createFileFilter(fileType),
        limits: {
            fileSize: maxFileSize,
            files: maxFiles
        }
    });
};

// Configuración general de multer
export const upload = createMulterUpload();

// Configuración específica para un solo archivo
export const uploadSingle = (fieldName: string = 'file', fileType: FileType = FileType.ALL) => {
    return createMulterUpload({ fileType }).single(fieldName);
};

// Configuración para múltiples archivos
export const uploadMultiple = (fieldName: string = 'files', maxCount: number = MAX_FILES, fileType: FileType = FileType.ALL) => {
    return createMulterUpload({ fileType, maxFiles: maxCount }).array(fieldName, maxCount);
};

// Función para procesar los archivos subidos
export const processUploadedFiles = (files: Express.Multer.File[]): FileInfo[] => {
    return files.map(file => ({
        fieldname: file.fieldname,
        originalname: file.originalname,
        encoding: file.encoding,
        mimetype: file.mimetype,
        destination: file.destination,
        filename: file.filename,
        path: file.path,
        size: file.size,
        url: file.filename
    }));
};

// Función para eliminar un archivo
export const deleteFile = async (filePath: string): Promise<boolean> => {
    try {
        if (fs.existsSync(filePath)) {
            await fs.promises.unlink(filePath);
        }
        return true;
    } catch (error) {
        console.error('Error al eliminar archivo:', error);
        return false;
    }
};

// Función para obtener la URL de un archivo
export const getFileUrl = (filename: string): string => {
    return `${process.env.BACKEND_URL_UPLOADS}${filename}`;
};

// Middleware para manejar errores de multer
export const handleMulterError = (
    err: any,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    if (err instanceof multer.MulterError) {
        // Error de multer
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                error: 'El archivo excede el tamaño máximo permitido',
                details: `Tamaño máximo: ${MAX_FILE_SIZE / (1024 * 1024)}MB`
            });
        } else if (err.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({
                error: 'Se excedió el número máximo de archivos',
                details: `Máximo: ${MAX_FILES} archivos`
            });
        }
        return res.status(400).json({ error: err.message });
    } else if (err) {
        // Otro tipo de error
        return res.status(500).json({ error: err.message });
    }
    next();
};

// Validar payload de archivos
export const validateFilePayload = (files: any): boolean => {
    if (!files) return false;

    const hasMainFile = files['mainFile'] && files['mainFile'].length > 0;
    const hasAdditionalFiles = files['additionalFiles'] && files['additionalFiles'].length > 0;

    return hasMainFile || hasAdditionalFiles;
};