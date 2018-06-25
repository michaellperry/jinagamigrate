import { JinagaServer } from 'jinaga';
import { Collection, Db, MongoClient } from 'mongodb';
import { PoolClient } from 'pg';

import { ConnectionFactory } from './connection';

const args = process.argv.slice(2);

if (args.length !== 2) {
    console.log('Usage:\n  node migrate.js <MongoDB connection string> <PostgreSQL connection string>');
    process.exit(1);
}

const mongoDbConnection = args[0];
const postgreSQLConnection = args[1];

const { j } = JinagaServer.create({
    pgKeystore: postgreSQLConnection,
    pgStore: postgreSQLConnection
});
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
    await migrateUsers(users, connectionFactory);
    await migrateFacts(successors, connectionFactory);
}

async function migrateUsers(users: Collection<any>, connectionFactory: ConnectionFactory): Promise<void> {
    await connectionFactory.with(async connection => {
        const query = {
            provider: 'https://sts.windows.net/f2267c2e-5a54-49f4-84fa-e4f2f4038a2e/'
        };
        await find(users, query, async user => {
            console.log('Found user ' + user.userId);
            await saveUser(connection, user);
        });
    });
}

async function migrateFacts(successors: Collection<any>, connectionFactory: ConnectionFactory): Promise<void> {
    const query = {
        fact: {
            '$exists': true
        }
    };
    await find(successors, query, async successor => {
        //console.log('Found fact ' + JSON.stringify(successor.fact));
    });
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