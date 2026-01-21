import { Model, DataTypes, Optional } from 'sequelize';
import sequelize from '../config/database';

// Tipos de almacenamiento
export enum StorageType {
    LOCAL = 'local',
    CLOUDINARY = 'cloudinary'
}

// Información común de archivo
export interface BaseFileInfo {
    fieldname: string;
    originalname: string;
    encoding: string;
    mimetype: string;
    size: number;
}

// Información específica para archivos locales
export interface LocalFileInfo extends BaseFileInfo {
    destination: string;
    filename: string;
    path: string;
    url?: string;
}

// Información específica para archivos en Cloudinary
export interface CloudinaryFileInfo extends BaseFileInfo {
    public_id: string;
    secure_url: string;
    format: string;
    resource_type?: string;
}

// Tipo unión para cubrir ambos casos
export type FileInfo = LocalFileInfo | CloudinaryFileInfo;

// Atributos del modelo File
export interface FileAttributes {
    id: number;
    name: string;
    storageType: StorageType;
    mainFile?: FileInfo | null;
    additionalFiles?: FileInfo[];
    createdAt?: Date;
    updatedAt?: Date;
}

interface FileCreationAttributes extends Optional<FileAttributes, 'id'> { }

class File extends Model<FileAttributes, FileCreationAttributes> implements FileAttributes {
    public id!: number;
    public name!: string;
    public storageType!: StorageType;
    public mainFile!: FileInfo | null;
    public additionalFiles!: FileInfo[];
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;

    // Método para obtener la URL correcta del archivo principal
    public getMainFileUrl(): string | null {
        if (!this.mainFile) return null;

        if (this.storageType === StorageType.LOCAL) {
            const localFile = this.mainFile as LocalFileInfo;
            return `${process.env.BACKEND_URL_UPLOADS}${localFile.filename}`;
        } else {
            const cloudinaryFile = this.mainFile as CloudinaryFileInfo;
            return cloudinaryFile.secure_url;
        }
    }

    // Método para obtener URLs de archivos adicionales
    public getAdditionalFileUrls(): string[] {
        if (!this.additionalFiles || !this.additionalFiles.length) return [];

        return this.additionalFiles.map(file => {
            if (this.storageType === StorageType.LOCAL) {
                const localFile = file as LocalFileInfo;
                return `${process.env.BACKEND_URL_UPLOADS}${localFile.filename}`;
            } else {
                const cloudinaryFile = file as CloudinaryFileInfo;
                return cloudinaryFile.secure_url;
            }
        });
    }

    // Método para verificar si un archivo es de Cloudinary
    public isCloudinaryFile(file: FileInfo): boolean {
        return this.storageType === StorageType.CLOUDINARY &&
            'public_id' in file && 'secure_url' in file;
    }

    // Método para verificar si un archivo es local
    public isLocalFile(file: FileInfo): boolean {
        return this.storageType === StorageType.LOCAL &&
            'path' in file && 'filename' in file;
    }
}

File.init(
    {
        id: {
            type: DataTypes.BIGINT,
            autoIncrement: true,
            primaryKey: true,
        },
        name: {
            type: DataTypes.STRING(128),
            allowNull: false,
            validate: {
                notEmpty: true
            }
        },
        storageType: {
            type: DataTypes.ENUM(StorageType.LOCAL, StorageType.CLOUDINARY),
            allowNull: false,
            defaultValue: StorageType.LOCAL
        },
        mainFile: {
            type: DataTypes.JSON,
            allowNull: true,
        },
        additionalFiles: {
            type: DataTypes.JSON,
            allowNull: true,
            defaultValue: []
        }
    },
    {
        tableName: 'files',
        sequelize,
    }
);

export default File;
