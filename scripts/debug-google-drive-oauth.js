require('dotenv').config({ path: '.env' });
const { google } = require('googleapis');
const { Readable } = require('stream');

async function run() {
    console.log('--- Debugging Google Drive Upload (OAuth2 - User Auth) ---');

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

    if (!clientId || !clientSecret || !refreshToken || !folderId) {
        console.error('ERROR: Missing OAuth2 credentials or Folder ID in .env');
        return;
    }

    try {
        const auth = new google.auth.OAuth2(clientId, clientSecret);
        auth.setCredentials({ refresh_token: refreshToken });

        // Verify access token generation
        console.log('Refreshing access token...');
        const { token } = await auth.getAccessToken();
        console.log('Access Token acquired!');

        const drive = google.drive({ version: 'v3', auth });

        console.log(`Attempting upload to folder: ${folderId}`);

        const fileMetadata = {
            name: 'oauth_test_upload.txt',
            parents: [folderId],
        };

        const media = {
            mimeType: 'text/plain',
            body: Readable.from(['Hello from OAuth2! this file uses your personal quota.']),
        };

        const res = await drive.files.create({
            requestBody: fileMetadata,
            media: media,
            fields: 'id, webViewLink',
        });

        console.log('SUCCESS! File uploaded.');
        console.log('ID:', res.data.id);
        console.log('Link:', res.data.webViewLink);

        // Permission check
        console.log('Setting public permission...');
        await drive.permissions.create({
            fileId: res.data.id,
            requestBody: { role: 'reader', type: 'anyone' },
        });
        console.log('Permission set to Anyone with Link.');

    } catch (err) {
        console.error('Script Error:', err.message);
        if (err.response) {
            console.error('Response Data:', JSON.stringify(err.response.data, null, 2));
        }
    }
}

run();
