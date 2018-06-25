import { dehydrateFact } from './hydrate';
import { Collection, Db, MongoClient } from 'mongodb';
import { PoolClient } from 'pg';

import { clearLine, cursorTo } from "readline";

import { ConnectionFactory } from './connection';
import { PostgresStore } from './postgres-store';

const args = process.argv.slice(2);

if (args.length !== 2) {
    console.log('Usage:\n  node migrate.js <MongoDB connection string> <PostgreSQL connection string>');
    process.exit(1);
}

const mongoDbConnection = args[0];
const postgreSQLConnection = args[1];

MongoClient.connect(mongoDbConnection, (error, db) => {
    if (error) {
        console.log('Error connecting to MongoDB: ' + error.message);
        process.exit(1);
    }

    console.log('Connected to MongoDB.');

    migrate(db).then(() => {
        db.close();
        console.log('Disconnected from MongoDB.');
    }).catch(err => {
        console.log(err);
    });
});

console.log('Migrate from ' + mongoDbConnection + ' to ' + postgreSQLConnection + '.');

async function migrate(db: Db): Promise<void> {
    const users = db.collection('users');
    const successors = db.collection('successors');
    const connectionFactory = new ConnectionFactory(postgreSQLConnection);
    const postgresStore = new PostgresStore(postgreSQLConnection);
    await migrateUsers(users, connectionFactory);
    await migrateFacts(successors, postgresStore);
}

async function migrateUsers(users: Collection<any>, connectionFactory: ConnectionFactory): Promise<void> {
    await connectionFactory.with(async connection => {
        const query = {
            provider: 'https://sts.windows.net/f2267c2e-5a54-49f4-84fa-e4f2f4038a2e/'
        };
        let count = 0;
        beginProgress('Migrating users');

        await find(users, query, async user => {
            await saveUser(connection, user);

            count++;
            progress('Migrated users', count);
        });

        endProgress();
    });
}

async function migrateFacts(successors: Collection<any>, postgresStore: PostgresStore): Promise<void> {
    const query = {
        fact: {
            '$exists': true
        }
    };
    let count = 0;
    beginProgress('Migrating facts');

    await find(successors, query, async successor => {
        const fact = JSON.parse(JSON.stringify(successor.fact));
        const factRecords = dehydrateFact(fact);
        await postgresStore.save(factRecords);

        count++;
        progress('Migrated facts', count);
    });

    endProgress();
}

async function find(collection: Collection<any>, query: {}, handler: ((result: any) => Promise<void>)): Promise<void> {
    const cursor = collection.find(query);
    while (await cursor.hasNext()) {
        const result = await cursor.next();
        await handler(result);
    }
}

async function saveUser(connection: PoolClient, user: any) {
    await connection.query('INSERT INTO public.user (provider, user_id, private_key, public_key) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING',
        [user.provider, user.userId, user.privateKey, user.publicKey]);
}

function beginProgress(message: string) {
    process.stdout.write(`${message}\n`);
}

function progress(message: string, count: number) {
    clearLine(process.stdout, 0);
    cursorTo(process.stdout, 0);
    process.stdout.write(`${message}: ${count}`);
}

function endProgress() {
    process.stdout.write('\n');
}