const script = process.platform === 'win32' ? '../../scripts/npm.js' : 'npm';

module.exports = [
    {
        name: 'Yoobee Bot',
        cwd: './apps/bot',
        script,
        args: 'start',
        instances: 1,
        autorestart: true,
        watch: false,
    },
];
