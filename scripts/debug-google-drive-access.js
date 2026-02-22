require('dotenv').config({ path: '.env' });
const { google } = require('googleapis');

async function run() {
    console.log('--- Debugging Google Drive Folder Access (Corrected ID) ---');
    let rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
    if (!rawKey) {
        console.error('ERROR: GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY is undefined');
        return;
    }

    // Same robust key cleaning logic as the fix
    rawKey = rawKey.replace(/\\n/g, '\n');
    const match = rawKey.match(/-----BEGIN PRIVATE KEY-----[\s\S]+?-----END PRIVATE KEY-----/);
    if (match) {
        rawKey = match[0];
    } else {
        // Fallback
        rawKey = rawKey.trim();
        if (rawKey.startsWith('"')) rawKey = rawKey.slice(1);
        if (rawKey.endsWith('"')) rawKey = rawKey.slice(0, -1);
        if (rawKey.endsWith(',')) rawKey = rawKey.slice(0, -1);
        if (rawKey.endsWith('"')) rawKey = rawKey.slice(0, -1);
    }

    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    // MANUALLY OVERRIDING ID TO TEST
    const folderId = "1H9caVc6a2M3MV0wvyVg6qNf_QAVDA2dW";

    console.log(`Service Account Email: ${email}`);
    console.log(`Testing Folder ID: ${folderId}`);

    try {
        const auth = new google.auth.JWT({
            email,
            key: rawKey,
            scopes: ['https://www.googleapis.com/auth/drive.file'],
        });

        console.log('Attempting to list file metadata for the folder...');
        const drive = google.drive({ version: 'v3', auth });

        const res = await drive.files.get({
            fileId: folderId,
            fields: 'id, name, webViewLink'
        });

        console.log('Folder found!');
        console.log('Name:', res.data.name);
        console.log('Link:', res.data.webViewLink);
        console.log('SUCCESS! This ID is correct.');

    } catch (err) {
        console.error('Failed to access folder:', err.message);
        if (err.code === 404) {
            console.error('ERROR 404: The folder was not found or permission denied.');
        } else {
            console.error('Error Code:', err.code);
        }
    }
}

run();
