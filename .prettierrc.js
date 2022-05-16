module.exports = {
    printWidth: 80,
    singleQuote: true,
    quoteProps: 'as-needed',
    trailingComma: 'all',
    tabWidth: 4,
    useTabs: false,
    semi: true,
    overrides: [
        {
            files: '*.yml',
            options: {
                tabWidth: 2,
            }
        }
    ]
};
