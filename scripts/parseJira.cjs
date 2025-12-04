const fs = require('fs');
const Papa = require('papaparse');

const fileContent = fs.readFileSync('/Users/mikael/Downloads/TestJiraData.csv', 'utf8');
const results = Papa.parse(fileContent, { header: true, skipEmptyLines: true });

const stories = results.data.map(row => {
    const key = row['Key'] || row['Issue key'] || row['ID'] || '';
    if (!key) return null;

    return {
        id: key,
        name: (row['Summary'] || row['Name'] || '').substring(0, 50).replace(/"/g, '\\"'),
        key: key,
        status: row['Status'] || '',
        sp: parseFloat(row['Custom field (Story Points)'] || row['Story Points'] || row['SP']) || 0,
        team: row['Custom field (pdev_unit)'] || row['pdev_unit'] || row['Team'] || '',
        sprint: row['Custom field (current Sprint)'] || row['current Sprint'] || row['Sprint'] || '',
        epic: row['Parent key'] || row['Parent'] || '',
        pi: '26.1'
    };
}).filter(s => s !== null);

const output = `import { Story } from "../types";\n\nexport const TEST_JIRA_DATA: Story[] = ${JSON.stringify(stories, null, 2)};`;

// Ensure directory exists
if (!fs.existsSync('src/data')) {
    fs.mkdirSync('src/data');
}

fs.writeFileSync('src/data/testJiraData.ts', output);
console.log('Processed ' + stories.length + ' stories');
