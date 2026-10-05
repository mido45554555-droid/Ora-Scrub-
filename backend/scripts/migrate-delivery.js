import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const envFile = path.join(root, '.env');
if (existsSync(envFile)) process.loadEnvFile(envFile);

const env = process.env;
const database = env.DB_NAME;
if (!/^[A-Za-z0-9_]+$/.test(database ?? '')) {
    throw new Error('DB_NAME must only contain letters, digits and _.');
}

const connection = await mysql.createConnection({
    host: env.DB_HOST || '127.0.0.1',
    port: Number(env.DB_PORT || 3306),
    user: env.DB_ROOT_USER || 'root',
    password: env.DB_ROOT_PASSWORD ?? '',
    database,
    timezone: 'Z',
});

try {
    const columns = [
        ['delivered_at', 'DATETIME NULL AFTER completed_at'],
        ['delivery_action_hash', 'CHAR(64) NULL AFTER delivered_at'],
        ['delivery_action_expires_at', 'DATETIME NULL AFTER delivery_action_hash'],
        ['delivery_action_used_at', 'DATETIME NULL AFTER delivery_action_expires_at'],
    ];
    for (const [name, definition] of columns) {
        const [found] = await connection.query(
            'SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?',
            [database, 'orders', name]
        );
        if (found.length === 0) {
            await connection.query(`ALTER TABLE orders ADD COLUMN ${name} ${definition}`);
            console.log(`Added orders.${name}`);
        }
    }

    const [indexes] = await connection.query(
        'SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND INDEX_NAME = ?',
        [database, 'orders', 'uq_orders_delivery_action_hash']
    );
    if (indexes.length === 0) {
        await connection.query('ALTER TABLE orders ADD UNIQUE KEY uq_orders_delivery_action_hash (delivery_action_hash)');
        console.log('Added unique delivery-action token hash index');
    }

    console.log(`Delivery-action schema is ready in database "${database}"; existing order rows were not updated.`);
} finally {
    await connection.end();
}
