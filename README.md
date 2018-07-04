# Jinaga Migrate

Command-line tool to migrate data from a Jinaga 1.x Mongo database to a Jinaga 2.x PostgreSQL database.

## Setup

Create your PostgreSQL database in your target environment.

- Create the database

```
CREATE DATABASE myapplication;
```

- Create the `dev` user for your application

```
CREATE USER dev WITH
  LOGIN
  ENCRYPTED PASSWORD 'devpassword'
  NOSUPERUSER
  INHERIT
  NOCREATEDB
  NOCREATEROLE
  NOREPLICATION
  VALID UNTIL 'infinity';
```

- Run the script found in `node_modules/jinaga/setup.sql`

## Migrate

Build this application using `gulp`, and then run the following command to migrate the data.

```
node ./dist/migrate.js <MongoDB connection string> <PostgreSQL connection string>
```

For example:

```
gulp
node ./dist/migrate.js mongodb://dev:devpassword@host:27017/myapplication postgresql://dev:devpassword@host:5432/myapplication
```

## Idempotency

The migration process is idempotent. You can run it several times, and only the new data will be migrated.

Facts from two or more databases can be merged using the migrate command. However, users will collide. Plan accordingly if you want to merge databases.

Users are assigned key pairs in Jinaga. If you have two different databases, the same user accessing each database will get a different key pair. If you migrate from each of those databases into a single source, the key pair from the first database will be taken, and the second will not be imported.

Facts representing users in Jinaga use the public key. After the merge, facts representing the second public key will be present. However, there will be no principal that can access that keypair. The data associated with the orphaned key pair will appear as belonging to a user who can no longer log in.

## Running remotely

The process is much faster if it's running on or close to one of the database servers. To run remotely, copy the entire `dist` folder. You also need to either copy the `node_modules` folder, or copy `package.json` and run `npm install --production`.

For example, if both MongoDB and PostgreSQL are on the same host:

```
ssh username@host
mkdir ~/jinagamigrate
exit

scp -r dist username@host:~/jinagamigrate/
scp package.json username@host:~/jinagamigrate/package.json

ssh username@host
cd ~/jinagamigrate
npm install --production
node ./dist/migrate.js mongodb://dev:devpassword@localhost:27017/myapplication postgresql://dev:devpassword@localhost:5432/myapplication
```