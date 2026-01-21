import express from 'express';
import dotenv from 'dotenv';
import { upload, MulterFiles, validateFilePayload, handleMulterError } from '../../utils/fileUtils';
import File, { StorageType } from '../../models/file';
import FileService from '../../services/fileService';

const router = express.Router();
router.use(handleMulterError);

// Configuración de campos para upload
const fileUploadFields = [
    { name: 'mainFile', maxCount: 1 }, 
    { name: 'additionalFiles', maxCount: 5 }
];

// POST - Crear un archivo
router.post('/', async (req, res) => {
    try {
        const uploadMiddleware = upload.fields(fileUploadFields);
        
        uploadMiddleware(req, res, async (err) => {
            // Manejo de errores de upload
            if (err) {
                return res.status(400).json({
                    error: err.message,
                    details: 'Los campos deben ser: mainFile (archivo único) y additionalFiles (múltiples archivos)'
                });
            }

            // Validación de nombre
            if (!req.body.name) {
                return res.status(400).json({ error: 'El nombre es requerido' });
            }

            // Validación de archivos
            const files = req.files as MulterFiles;
            if (!validateFilePayload(files)) {
                return res.status(400).json({ error: 'Archivos no válidos' });
            }

            // Determinar tipo de almacenamiento
            const storageType = process.env.TYPECLOUD === 'CLOUDINARY' 
                ? StorageType.CLOUDINARY 
                : StorageType.LOCAL;

            try {
                // Usar el servicio para crear el archivo
                const newFile = await FileService.createFile(req.body.name, files, storageType);

                // Transformar URLs y enviar respuesta
                return res.status(201).json({
                    message: 'Archivo creado exitosamente',
                    data: FileService.transformFileUrls(newFile.toJSON())
                });
            } catch (error) {
                console.error('Error al crear registro:', error);
                return res.status(500).json({ error: 'Error al crear registro' });
            }
        });
    } catch (error) {
        console.error('Error en el proceso:', error);
        return res.status(500).json({ error: 'Error en el proceso' });
    }
});

// GET ALL - Obtener todos los archivos
router.get('/', async (req, res) => {
    try {
        // Usar el servicio para obtener todos los archivos
        const files = await FileService.getAllFiles();

        // Transformar cada archivo para incluir URLs completas
        const transformedFiles = files.map(file => 
            FileService.transformFileUrls(file.toJSON())
        );

        return res.status(200).json({
            count: transformedFiles.length,
            data: transformedFiles
        });
    } catch (error) {
        console.error('Error al obtener archivos:', error);
        return res.status(500).json({ error: 'Error al obtener archivos' });
    }
});

// GET BY ID - Obtener un archivo por ID
router.get('/:id', async (req, res) => {
    try {
        // Usar el servicio para obtener un archivo por ID
        const file = await FileService.getFileById(req.params.id);

        if (!file) {
            return res.status(404).json({ error: 'Archivo no encontrado' });
        }

        // Transformar URLs y devolver resultado
        return res.status(200).json(
            FileService.transformFileUrls(file.toJSON())
        );
    } catch (error) {
        console.error('Error al obtener archivo:', error);
        return res.status(500).json({ error: 'Error al obtener archivo' });
    }
});

// PUT - Actualizar un archivo existente
router.put('/:id', async (req, res) => {
    try {
        // Buscar el archivo existente para verificar que existe
        const fileExists = await FileService.getFileById(req.params.id);

        if (!fileExists) {
            return res.status(404).json({ error: 'Archivo no encontrado' });
        }

        // Configurar upload
        const uploadMiddleware = upload.fields(fileUploadFields);
        
        uploadMiddleware(req, res, async (err) => {
            if (err) {
                return res.status(400).json({ error: err.message });
            }

            const files = req.files as MulterFiles;

            try {
                // Usar el servicio para actualizar el archivo
                const updatedFile = await FileService.updateFile(
                    req.params.id,
                    req.body.name,
                    files
                );

                if (!updatedFile) {
                    return res.status(404).json({ error: 'Archivo no encontrado' });
                }

                return res.status(200).json({
                    message: 'Archivo actualizado correctamente',
                    data: FileService.transformFileUrls(updatedFile.toJSON())
                });
            } catch (error) {
                console.error('Error al actualizar:', error);
                return res.status(500).json({ error: 'Error al actualizar' });
            }
        });
    } catch (error) {
        console.error('Error en el proceso:', error);
        return res.status(500).json({ error: 'Error en el proceso' });
    }
});

// DELETE - Eliminar un archivo
router.delete('/:id', async (req, res) => {
    try {
        // Usar el servicio para eliminar el archivo
        const deleted = await FileService.deleteFile(req.params.id);
        
        if (!deleted) {
            return res.status(404).json({ error: 'Archivo no encontrado' });
        }

        return res.status(200).json({ 
            success: true,
            message: 'Archivo eliminado correctamente' 
        });
    } catch (error) {
        console.error('Error al eliminar archivo:', error);
        return res.status(500).json({ error: 'Error al eliminar archivo' });
    }
});

// POST - Migrar un archivo a otro tipo de almacenamiento
router.post('/:id/migrate', async (req, res) => {
    try {
        const { targetStorage } = req.body;
        
        if (!targetStorage || ![StorageType.LOCAL, StorageType.CLOUDINARY].includes(targetStorage)) {
            return res.status(400).json({ 
                error: 'Tipo de almacenamiento inválido',
                validTypes: [StorageType.LOCAL, StorageType.CLOUDINARY]
            });
        }

        try {
            // Usar el servicio para migrar el archivo
            const migratedFile = await FileService.migrateStorageType(
                req.params.id,
                targetStorage
            );
            
            if (!migratedFile) {
                return res.status(404).json({ error: 'Archivo no encontrado' });
            }

            return res.status(200).json({
                message: `Archivo migrado correctamente a ${targetStorage}`,
                data: FileService.transformFileUrls(migratedFile.toJSON())
            });
        } catch (error) {
            if (error instanceof Error && error.message.includes('no está implementada')) {
                return res.status(501).json({ error: error.message });
            }
            
            console.error('Error al migrar tipo de almacenamiento:', error);
            return res.status(500).json({ error: 'Error al migrar el archivo' });
        }
    } catch (error) {
        console.error('Error en el proceso:', error);
        return res.status(500).json({ error: 'Error en el proceso' });
    }
});

export default router;