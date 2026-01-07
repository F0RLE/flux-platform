const fs = require('fs');
const path = require('path');

const newVersion = process.argv[2];

if (!newVersion) {
    console.error('Usage: node bump-version.js <new_version>');
    process.exit(1);
}

if (!/^\d+\.\d+\.\d+$/.test(newVersion)) {
     console.error('Error: Version must be in format x.y.z (e.g. 1.0.1)');
     process.exit(1);
}

const rootDir = path.resolve(__dirname, '..');

const files = [
    {
        path: path.join(rootDir, 'package.json'),
        type: 'json',
        field: 'version'
    },
    {
        path: path.join(rootDir, 'src-tauri', 'tauri.conf.json'),
        type: 'json',
        field: 'version'
    },
    {
        path: path.join(rootDir, 'src-tauri', 'Cargo.toml'),
        type: 'toml',
        field: 'version'
    }
];

files.forEach(file => {
    try {
        let content = fs.readFileSync(file.path, 'utf8');
        console.log(`Updating ${file.path}...`);

        if (file.type === 'json') {
            const json = JSON.parse(content);
            const oldVersion = json[file.field];
            json[file.field] = newVersion;
            content = JSON.stringify(json, null, 4); // Indent with 4 spaces to match style
            console.log(`  JSON: ${oldVersion} -> ${newVersion}`);
        } else if (file.type === 'toml') {
             // Simple regex replace for TOML to avoid dependencies
             // Matches: version = "1.0.0"
             const oldVersionMatch = content.match(/^version\s*=\s*"(.*?)"/m);
             if (oldVersionMatch) {
                 const oldVersion = oldVersionMatch[1];
                 content = content.replace(/^version\s*=\s*".*?"/m, `version = "${newVersion}"`);
                 console.log(`  TOML: ${oldVersion} -> ${newVersion}`);
             } else {
                 console.warn(`  Warning: Could not find version field in ${file.path}`);
             }
        }

        fs.writeFileSync(file.path, content);
    } catch (e) {
        console.error(`Failed to update ${file.path}:`, e);
        process.exit(1);
    }
});

console.log(`Successfully bumped version to ${newVersion}`);
