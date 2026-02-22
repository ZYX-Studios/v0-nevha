require('dotenv').config({ path: '.env' });
const { google } = require('googleapis');
const { Readable } = require('stream');

async function run() {
    console.log('--- Debugging Google Drive Upload (Quota Issue - Fixed Script) ---');
    let rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
    if (!rawKey) {
        console.error('ERROR: GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY is undefined');
        return;
    }

    // Key cleaning
    rawKey = rawKey.replace(/\\n/g, '\n');
    const match = rawKey.match(/-----BEGIN PRIVATE KEY-----[\s\S]+?-----END PRIVATE KEY-----/);
    if (match) {
        rawKey = match[0];
    } else {
        rawKey = rawKey.trim();
        if (rawKey.startsWith('"')) rawKey = rawKey.slice(1);
        if (rawKey.endsWith('"')) rawKey = rawKey.slice(0, -1);
        if (rawKey.endsWith(',')) rawKey = rawKey.slice(0, -1);
        if (rawKey.endsWith('"')) rawKey = rawKey.slice(0, -1);
    }

    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

    try {
        const auth = new google.auth.JWT({
            email,
            key: rawKey,
            scopes: ['https://www.googleapis.com/auth/drive.file'],
        });

        const drive = google.drive({ version: 'v3', auth });

        console.log('Attempting small text file upload...');

        const fileMetadata = {
            name: 'debug_test_upload.txt',
            parents: [folderId],
        };

        // Attempt 1: Standard (Fresh Stream)
        try {
            console.log('--- Attempt 1: Standard Upload ---');
            const media1 = {
                mimeType: 'text/plain',
                body: Readable.from(['Hello World 1']),
            };
            const res = await drive.files.create({
                requestBody: fileMetadata,
                media: media1,
                fields: 'id',
            });
            console.log('Success! ID:', res.data.id);
            return;
        } catch (err) {
            console.log('Attempt 1 Failed:', err.message);
        }

        // Attempt 2: With supportsAllDrives (Fresh Stream)
        try {
            console.log('--- Attempt 2: supportsAllDrives: true ---');
            const media2 = {
                mimeType: 'text/plain',
                body: Readable.from(['Hello World 2']),
            };
            const res = await drive.files.create({
                requestBody: fileMetadata,
                media: media2,
                fields: 'id',
                supportsAllDrives: true,
            });
            console.log('Success! ID:', res.data.id);
            return;
        } catch (err) {
            console.log('Attempt 2 Failed:', err.message);
            if (err.errors) {
                console.log('Detailed Errors:', JSON.stringify(err.errors, null, 2));
            }
        }

        console.warn('\nCONCLUSION: Service Account has no quota and cannot upload directly to this folder.');

    } catch (err) {
        console.error('Script Error:', err);
    }
}

run();
