const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '..', 'data', 'config.json');

const defaultConfig = {
  controlToken: '',
  prefix: '$',
  owners: [],
  tokens: [],
  speed: 'medium'
};

function readConfig() {
  if (!fs.existsSync(CONFIG_PATH)) {
    writeConfig(defaultConfig);
  }

  const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
  const parsed = JSON.parse(raw);

  return {
    ...defaultConfig,
    ...parsed,
    owners: Array.isArray(parsed.owners) ? parsed.owners : [],
    tokens: Array.isArray(parsed.tokens) ? parsed.tokens : [],
    speed: ['slow', 'medium', 'fast'].includes(parsed.speed) ? parsed.speed : 'medium'
  };
}

function writeConfig(config) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

function updateConfig(mutator) {
  const current = readConfig();
  const next = mutator({ ...current });
  writeConfig(next);
  return next;
}

module.exports = {
  readConfig,
  writeConfig,
  updateConfig,
  CONFIG_PATH
};
