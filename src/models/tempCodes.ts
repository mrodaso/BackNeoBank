import { Model, DataTypes, Optional } from 'sequelize';
import sequelize from '../config/database';

export interface TempCodeAttributes {
    id: number;
    email: string;
    code: string;
    type: string;
    expiresAt: Date;
}

interface TempCodeCreationAttributes extends Optional<TempCodeAttributes, 'id'> { }

class TempCodes extends Model<TempCodeAttributes, TempCodeCreationAttributes> implements TempCodeAttributes {
    public id!: number;
    public email!: string;
    public code!: string;
    public type!: string;
    public expiresAt!: Date;

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

TempCodes.init(
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        email: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        code: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        type: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: 'general'
        },
        expiresAt: {
            type: DataTypes.DATE,
            allowNull: false,
        }
    },
    {
        tableName: 'temp_codes',
        sequelize,
    }
);

export default TempCodes;
