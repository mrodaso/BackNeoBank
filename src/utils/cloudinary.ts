import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';

// Tipos
export interface CloudinaryUploadResult {
    public_id: string;
    secure_url: string;
    format: string;
    width: number;
    height: number;
    resource_type: string;
    url: string;
    bytes: number;
    created_at: string;
    folder?: string;
    original_filename: string;
    [key: string]: any;
}

export interface CloudinaryOptions {
    folder?: string;
    resource_type?: 'image' | 'video' | 'raw' | 'auto';
    public_id?: string;
    overwrite?: boolean;
    use_filename?: boolean;
    unique_filename?: boolean;
    transformation?: any[];
    tags?: string[];
}

// Configuración de Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * Sube un archivo desde el sistema de archivos a Cloudinary
 * @param filePath - Ruta al archivo local
 * @param options - Opciones de Cloudinary
 * @returns Resultado de la carga
 */
export const uploadToCloudinary = async (
    filePath: string,
    options: CloudinaryOptions = {}
): Promise<CloudinaryUploadResult> => {
    try {
        // Establecer opciones por defecto
        const uploadOptions: CloudinaryOptions = {
            folder: process.env.CLOUDINARY_FOLDER || 'app-uploads',
            resource_type: 'auto',
            overwrite: true,
            use_filename: true,
            unique_filename: true,
            ...options
        };

        // Subir a Cloudinary
        const result = await cloudinary.uploader.upload(filePath, uploadOptions);

        console.log(`Archivo subido con éxito a Cloudinary: ${result.public_id}`);
        return result;
    } catch (error) {
        console.error('Error al subir archivo a Cloudinary:', error);
        throw error;
    }
};

/**
 * Elimina un archivo de Cloudinary
 * @param publicId - ID público del recurso
 * @param resourceType - Tipo de recurso (image, video, raw, auto)
 * @returns Resultado de la eliminación
 */
export const deleteFromCloudinary = async (
    publicId: string,
    resourceType: 'image' | 'video' | 'raw' = 'image'
): Promise<any> => {
    try {
        const result = await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
        console.log(`Archivo eliminado de Cloudinary: ${publicId}`);
        return result;
    } catch (error) {
        console.error('Error al eliminar archivo de Cloudinary:', error);
        throw error;
    }
};

/**
 * Optimiza una URL de Cloudinary para diferentes propósitos
 * @param publicId - ID público del recurso
 * @param options - Opciones de transformación
 * @returns URL optimizada
 */
export const getOptimizedUrl = (
    publicId: string,
    options: {
        width?: number;
        height?: number;
        crop?: string;
        quality?: string | number;
        format?: string;
    } = {}
): string => {
    return cloudinary.url(publicId, {
        secure: true,
        fetch_format: options.format || 'auto',
        quality: options.quality || 'auto',
        width: options.width,
        height: options.height,
        crop: options.crop
    });
};

/**
 * Obtiene la información de un archivo en Cloudinary
 * @param publicId - ID público del recurso
 * @returns Información del recurso
 */
export const getResourceInfo = async (publicId: string): Promise<any> => {
    try {
        return await cloudinary.api.resource(publicId);
    } catch (error) {
        console.error('Error al obtener información del recurso de Cloudinary:', error);
        throw error;
    }
};

/**
 * Extrae el ID público de una URL de Cloudinary
 * @param url - URL de Cloudinary
 * @returns ID público
 */
export const extractPublicId = (url: string): string => {
    const parts = url.split('/');
    const filenamePart = parts[parts.length - 1];
    // Eliminar la extensión del archivo
    return filenamePart.split('.')[0];
};

/**
 * Sube un archivo desde la ruta y elimina el archivo local después
 * @param filePath - Ruta al archivo local
 * @param options - Opciones de Cloudinary
 * @returns Resultado de la carga
 */
export const uploadAndCleanup = async (
    filePath: string,
    options: CloudinaryOptions = {}
): Promise<CloudinaryUploadResult> => {
    try {
        const result = await uploadToCloudinary(filePath, options);

        // Eliminar archivo local después de la carga
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`Archivo local eliminado: ${filePath}`);
        }

        return result;
    } catch (error) {
        console.error('Error en uploadAndCleanup:', error);
        throw error;
    }
};

export default {
    uploadToCloudinary,
    deleteFromCloudinary,
    getOptimizedUrl,
    getResourceInfo,
    extractPublicId,
    uploadAndCleanup
};