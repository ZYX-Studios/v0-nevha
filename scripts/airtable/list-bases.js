'use strict';

const { fetchAirtableMeta } = require('./env');

(async () => {
  try {
    const data = await fetchAirtableMeta('/meta/bases');
    // Print compact summary + full JSON for scripting
    if (Array.isArray(data.bases)) {
      console.log('\nBases:');
      for (const b of data.bases) {
        console.log(`- ${b.id}  ${b.name}`);
      }
      console.log('\nFull JSON ->');
    }
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(err.message || err);
    process.exit(1);
  }
})();
