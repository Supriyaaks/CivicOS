const EmbeddedPostgres = require('embedded-postgres');
const path = require('path');
const fs = require('fs');

async function start() {
    const dataDir = path.resolve(__dirname, '../postgres_data');
    const isNew = !fs.existsSync(dataDir);
    
    console.log('[PostgreSQL] Data directory:', dataDir, 'isNew:', isNew);
    
    // In CommonJS, embedded-postgres might be default export or module.exports
    const PgClass = EmbeddedPostgres.default || EmbeddedPostgres;
    const pg = new PgClass({
        databaseDir: dataDir,
        user: 'postgres',
        password: 'darshini',
        port: 5432,
        persistent: true,
        autoRehydrateSymlinks: true
    });

    if (isNew) {
        console.log('[PostgreSQL] Initialising cluster at:', dataDir);
        await pg.initialise();
    }

    console.log('[PostgreSQL] Starting server on port 5432...');
    await pg.start();
    console.log('[PostgreSQL] Server started successfully on port 5432.');

    try {
        await pg.createDatabase('civicos');
        console.log('[PostgreSQL] Database civicos created.');
    } catch (err) {
        console.log('[PostgreSQL] Database civicos status:', err.message || err);
    }

    console.log('[PostgreSQL] READY FOR CONNECTIONS on localhost:5432');
    
    // Keep process alive
    setInterval(() => {}, 1000 * 60 * 60);
}

start().catch(err => {
    console.error('[PostgreSQL] FATAL ERROR:', err);
    process.exit(1);
});
