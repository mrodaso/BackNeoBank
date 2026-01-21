import User from './models/users';
import bcrypt from 'bcrypt';

async function seed() {

    const encryptedAdminPassword = await bcrypt.hash('Jrtech0221$', 10);
    await User.findOrCreate({
        where: { id: 1 },
        defaults: {
            id: 1,
            name: 'admin',
            email: 'admin@jrtech.com',
            password: encryptedAdminPassword,
            phone: '1234567890',
            role: 'admin',
            status: 'active',
        }
    });

    const encryptedUserPassword = await bcrypt.hash('Jrtech0221$', 10);
    await User.findOrCreate({
        where: { id: 2 },
        defaults: {
            id: 2,
            name: 'user',
            email: 'user@jrtech.com',
            password: encryptedUserPassword,
            phone: '1234567890',
            role: 'user',
            status: 'active',
        }
    });
}

seed().catch((error) => {
    console.error('Error seeding data:', error);
});

export default seed;