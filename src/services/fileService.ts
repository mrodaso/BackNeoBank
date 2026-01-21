import fs from 'fs';
import File, { StorageType, FileInfo, LocalFileInfo, CloudinaryFileInfo } from '../models/file';
import { 
    MulterFiles, 
    processUploadedFiles, 
    deleteFile,
    getFileUrl
} from '../utils/fileUtils';
import {
    uploadToCloudinary,
    deleteFromCloudinary
} from '../utils/cloudinary';

class FileService {
    /**
     * Crea un nuevo archivo
     */
    static async createFile(name: string, files: MulterFiles, storageType: StorageType): Promise<File> {
        try {
            let mainFileInfo = null;
            let additionalFilesInfo = [];

            // Procesamiento según tipo de almacenamiento
            if (storageType === StorageType.LOCAL) {
                // Procesar archivos para almacenamiento local
                mainFileInfo = files['mainFile']?.[0] 
                    ? processUploadedFiles([files['mainFile'][0]])[0] 
                    : null;
                
                additionalFilesInfo = files['additionalFiles'] 
                    ? processUploadedFiles(files['additionalFiles']) 
                    : [];
            } else {
                // Procesar archivos para Cloudinary
                if (files['mainFile']?.[0]) {
                    const mainFile = files['mainFile'][0];
                    const mainFileUpload = await uploadToCloudinary(mainFile.path, {
                        folder: `${name}/main`,
                        resource_type: 'auto'
                    });
                    
                    mainFileInfo = {
                        fieldname: mainFile.fieldname,
                        originalname: mainFile.originalname,
                        encoding: mainFile.encoding,
                        mimetype: mainFile.mimetype,
                        size: mainFile.size,
                        public_id: mainFileUpload.public_id,
                        secure_url: mainFileUpload.secure_url,
                        format: mainFileUpload.format,
                        resource_type: mainFileUpload.resource_type
                    };
                    
                    // Eliminar archivo local después de subir a Cloudinary
                    if (fs.existsSync(mainFile.path)) {
                        fs.unlinkSync(mainFile.path);
                    }
                }

                if (files['additionalFiles']) {
                    for (const file of files['additionalFiles']) {
                        const additionalFileUpload = await uploadToCloudinary(file.path, {
                            folder: `${name}/additional`,
                            resource_type: 'auto'
                        });
                        
                        additionalFilesInfo.push({
                            fieldname: file.fieldname,
                            originalname: file.originalname,
                            encoding: file.encoding,
                            mimetype: file.mimetype,
                            size: file.size,
                            public_id: additionalFileUpload.public_id,
                            secure_url: additionalFileUpload.secure_url,
                            format: additionalFileUpload.format,
                            resource_type: additionalFileUpload.resource_type
                        });
                        
                        // Eliminar archivo local después de subir a Cloudinary
                        if (fs.existsSync(file.path)) {
                            fs.unlinkSync(file.path);
                        }
                    }
                }
            }

            // Crear registro en base de datos
            const newFile = await File.create({
                name,
                storageType,
                mainFile: mainFileInfo,
                additionalFiles: additionalFilesInfo
            });

            return newFile;
        } catch (error) {
            // Limpiar archivos en caso de error
            await this.cleanupFiles(files, storageType);
            throw error;
        }
    }

    /**
     * Actualiza un archivo existente
     */
    static async updateFile(fileId: number | string, name: string | undefined, files: MulterFiles): Promise<File | null> {
        const file = await File.findByPk(fileId);
        
        if (!file) return null;

        try {
            const storageType = file.storageType; // Mantener el mismo tipo de almacenamiento
            let mainFileInfo = file.mainFile;
            let additionalFilesInfo = file.additionalFiles || [];

            // Procesamiento según tipo de almacenamiento
            if (storageType === StorageType.LOCAL) {
                // Actualización para almacenamiento local
                if (files['mainFile']?.[0]) {
                    // Eliminar archivo anterior si existe
                    if (file.mainFile) {
                        const localFile = file.mainFile as LocalFileInfo;
                        await deleteFile(localFile.path);
                    }
                    // Procesar nuevo archivo
                    mainFileInfo = processUploadedFiles([files['mainFile'][0]])[0];
                }

                if (files['additionalFiles']) {
                    // Eliminar archivos anteriores
                    if (file.additionalFiles && Array.isArray(file.additionalFiles)) {
                        for (const oldFile of file.additionalFiles) {
                            const localFile = oldFile as LocalFileInfo;
                            await deleteFile(localFile.path);
                        }
                    }
                    // Procesar nuevos archivos
                    additionalFilesInfo = processUploadedFiles(files['additionalFiles']);
                }
            } else {
                // Actualización para Cloudinary
                if (files['mainFile']?.[0]) {
                    // Eliminar archivo anterior de Cloudinary si existe
                    if (file.mainFile) {
                        const cloudinaryFile = file.mainFile as CloudinaryFileInfo;
                        await deleteFromCloudinary(cloudinaryFile.public_id);
                    }

                    // Subir nuevo archivo a Cloudinary
                    const mainFile = files['mainFile'][0];
                    const mainFileUpload = await uploadToCloudinary(mainFile.path, {
                        folder: `${name || file.name}/main`,
                        resource_type: 'auto'
                    });
                    
                    mainFileInfo = {
                        fieldname: mainFile.fieldname,
                        originalname: mainFile.originalname,
                        encoding: mainFile.encoding,
                        mimetype: mainFile.mimetype,
                        size: mainFile.size,
                        public_id: mainFileUpload.public_id,
                        secure_url: mainFileUpload.secure_url,
                        format: mainFileUpload.format,
                        resource_type: mainFileUpload.resource_type
                    };
                    
                    // Eliminar archivo local
                    if (fs.existsSync(mainFile.path)) {
                        fs.unlinkSync(mainFile.path);
                    }
                }

                if (files['additionalFiles']) {
                    // Eliminar archivos anteriores de Cloudinary
                    if (file.additionalFiles && Array.isArray(file.additionalFiles)) {
                        for (const oldFile of file.additionalFiles) {
                            const cloudinaryFile = oldFile as CloudinaryFileInfo;
                            if (cloudinaryFile.public_id) {
                                await deleteFromCloudinary(cloudinaryFile.public_id);
                            }
                        }
                    }

                    // Subir nuevos archivos a Cloudinary
                    additionalFilesInfo = [];
                    for (const addFile of files['additionalFiles']) {
                        const additionalFileUpload = await uploadToCloudinary(addFile.path, {
                            folder: `${name || file.name}/additional`,
                            resource_type: 'auto'
                        });
                        
                        additionalFilesInfo.push({
                            fieldname: addFile.fieldname,
                            originalname: addFile.originalname,
                            encoding: addFile.encoding,
                            mimetype: addFile.mimetype,
                            size: addFile.size,
                            public_id: additionalFileUpload.public_id,
                            secure_url: additionalFileUpload.secure_url,
                            format: additionalFileUpload.format,
                            resource_type: additionalFileUpload.resource_type
                        });
                        
                        // Eliminar archivo local
                        if (fs.existsSync(addFile.path)) {
                            fs.unlinkSync(addFile.path);
                        }
                    }
                }
            }

            // Actualizar registro
            await file.update({
                name: name || file.name,
                mainFile: mainFileInfo,
                additionalFiles: additionalFilesInfo
            });

            return file;
        } catch (error) {
            // Limpiar archivos en caso de error
            await this.cleanupFiles(files, file.storageType);
            throw error;
        }
    }

    /**
     * Obtener todos los archivos
     */
    static async getAllFiles(): Promise<File[]> {
        return await File.findAll();
    }

    /**
     * Obtener un archivo por ID
     */
    static async getFileById(id: number | string): Promise<File | null> {
        return await File.findByPk(id);
    }

    /**
     * Eliminar un archivo y sus recursos asociados
     */
    static async deleteFile(fileId: number | string): Promise<boolean> {
        const file = await File.findByPk(fileId);
        
        if (!file) return false;

        try {
            if (file.storageType === StorageType.LOCAL) {
                // Eliminar archivos locales
                if (file.mainFile) {
                    const localFile = file.mainFile as LocalFileInfo;
                    if (localFile.path) {
                        await deleteFile(localFile.path);
                    }
                }

                if (file.additionalFiles && Array.isArray(file.additionalFiles)) {
                    for (const fileInfo of file.additionalFiles) {
                        const localFile = fileInfo as LocalFileInfo;
                        if (localFile.path) {
                            await deleteFile(localFile.path);
                        }
                    }
                }
            } else {
                // Eliminar archivos de Cloudinary
                if (file.mainFile) {
                    const cloudinaryFile = file.mainFile as CloudinaryFileInfo;
                    if (cloudinaryFile.public_id) {
                        await deleteFromCloudinary(cloudinaryFile.public_id);
                    }
                }

                if (file.additionalFiles && Array.isArray(file.additionalFiles)) {
                    for (const fileInfo of file.additionalFiles) {
                        const cloudinaryFile = fileInfo as CloudinaryFileInfo;
                        if (cloudinaryFile.public_id) {
                            await deleteFromCloudinary(cloudinaryFile.public_id);
                        }
                    }
                }
            }

            // Eliminar el registro de la base de datos
            await file.destroy();
            return true;
        } catch (error) {
            console.error('Error al eliminar archivo:', error);
            throw error;
        }
    }

    /**
     * Migrar un archivo a otro tipo de almacenamiento
     */
    static async migrateStorageType(
        fileId: number | string, 
        targetStorage: StorageType
    ): Promise<File | null> {
        const file = await File.findByPk(fileId);
        
        if (!file) return null;
        
        // Si ya está en el tipo de almacenamiento objetivo, no hacer nada
        if (file.storageType === targetStorage) {
            return file;
        }

        try {
            // Migrar de LOCAL a CLOUDINARY
            if (targetStorage === StorageType.CLOUDINARY) {
                let newMainFile = null;
                const newAdditionalFiles = [];

                // Migrar archivo principal
                if (file.mainFile) {
                    const localFile = file.mainFile as LocalFileInfo;
                    if (localFile.path) {
                        const mainFileUpload = await uploadToCloudinary(localFile.path, {
                            folder: `${file.name}/main`,
                            resource_type: 'auto'
                        });

                        newMainFile = {
                            fieldname: localFile.fieldname,
                            originalname: localFile.originalname,
                            encoding: localFile.encoding,
                            mimetype: localFile.mimetype,
                            size: localFile.size,
                            public_id: mainFileUpload.public_id,
                            secure_url: mainFileUpload.secure_url,
                            format: mainFileUpload.format,
                            resource_type: mainFileUpload.resource_type
                        };
                    }
                }

                // Migrar archivos adicionales
                if (file.additionalFiles && Array.isArray(file.additionalFiles)) {
                    for (const additionalFile of file.additionalFiles) {
                        const localFile = additionalFile as LocalFileInfo;
                        if (localFile.path) {
                            const additionalFileUpload = await uploadToCloudinary(localFile.path, {
                                folder: `${file.name}/additional`,
                                resource_type: 'auto'
                            });

                            newAdditionalFiles.push({
                                fieldname: localFile.fieldname,
                                originalname: localFile.originalname,
                                encoding: localFile.encoding,
                                mimetype: localFile.mimetype,
                                size: localFile.size,
                                public_id: additionalFileUpload.public_id,
                                secure_url: additionalFileUpload.secure_url,
                                format: additionalFileUpload.format,
                                resource_type: additionalFileUpload.resource_type
                            });
                        }
                    }
                }

                // Eliminar archivos locales después de migrar exitosamente
                if (file.mainFile) {
                    const localFile = file.mainFile as LocalFileInfo;
                    if (localFile.path) {
                        await deleteFile(localFile.path);
                    }
                }

                if (file.additionalFiles && Array.isArray(file.additionalFiles)) {
                    for (const additionalFile of file.additionalFiles) {
                        const localFile = additionalFile as LocalFileInfo;
                        if (localFile.path) {
                            await deleteFile(localFile.path);
                        }
                    }
                }

                // Actualizar registro
                await file.update({
                    storageType: StorageType.CLOUDINARY,
                    mainFile: newMainFile,
                    additionalFiles: newAdditionalFiles
                });
            } 
            // Migrar de CLOUDINARY a LOCAL no está implementado aún
            else if (targetStorage === StorageType.LOCAL) {
                throw new Error('La migración de Cloudinary a almacenamiento local no está implementada');
            }

            return file;
        } catch (error) {
            console.error('Error al migrar tipo de almacenamiento:', error);
            throw error;
        }
    }

    /**
     * Función para transformar URLs en los datos de archivos
     */
    static transformFileUrls(fileData: any): any {
        // Clonar el objeto para no modificar el original
        const transformedData = JSON.parse(JSON.stringify(fileData));
        
        if (transformedData.storageType === StorageType.LOCAL) {
            // Transformar URLs locales
            if (transformedData.mainFile && transformedData.mainFile.filename) {
                transformedData.mainFile.url = getFileUrl(transformedData.mainFile.filename);
            }
            
            if (transformedData.additionalFiles && Array.isArray(transformedData.additionalFiles)) {
                transformedData.additionalFiles = transformedData.additionalFiles.map((additionalFile: any) => {
                    if (additionalFile.filename) {
                        additionalFile.url = getFileUrl(additionalFile.filename);
                    }
                    return additionalFile;
                });
            }
        }
        
        return transformedData;
    }

    /**
     * Limpiar archivos en caso de error
     */
    static async cleanupFiles(files: MulterFiles, storageType: StorageType): Promise<void> {
        try {
            // Para archivos locales, simplemente los eliminamos
            if (files['mainFile']?.[0]) {
                await deleteFile(files['mainFile'][0].path);
            }
            if (files['additionalFiles']) {
                for (const file of files['additionalFiles']) {
                    await deleteFile(file.path);
                }
            }
        } catch (error) {
            console.error('Error al limpiar archivos temporales:', error);
        }
    }
}

export default FileService;