import { JinagaServer } from 'jinaga';
import { Collection, MongoClient } from 'mongodb';

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

    const users = db.collection('users');
    const successors = db.collection('successors');
    migrateUsers(users).then(() => {
        return migrateFacts(successors);
    }).then(() => {
        db.close();
        console.log('Disconnected from MongoDB.');
    }).catch(err => {
        console.log(err);
    });
});

console.log('Migrate from ' + mongoDbConnection + ' to ' + postgreSQLConnection + '.');

async function migrateUsers(users: Collection<any>): Promise<void> {
    const query = {
        provider: 'https://sts.windows.net/f2267c2e-5a54-49f4-84fa-e4f2f4038a2e/'
    };
    await find(users, query, user => {
        console.log('Found user ' + user.userId);
    });
}

async function migrateFacts(successors: Collection<any>): Promise<void> {
    const query = {
        fact: {
            '$exists': true
        }
    };
    await find(successors, query, successor => {
        console.log('Found fact ' + JSON.stringify(successor.fact));
    });
}

function find(collection: Collection<any>, query: {}, handler: ((result: any) => void)): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        const cursor = collection.find(query);
        cursor.forEach(result => {
            handler(result);
        }, error => {
            if (error) {
                reject(error.message);
            }
            else {
                resolve();
            }
        });
    })
}