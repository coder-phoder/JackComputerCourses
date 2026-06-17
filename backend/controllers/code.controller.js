const path = require('path');

const languageConfigs = {
    c: {
        label: 'C',
        fileName: 'main.c',
        compile: (dir) => ({
            command: 'gcc',
            args: ['main.c', '-O2', '-std=c11', '-o', path.join(dir, 'main')]
        }),
        run: (dir) => ({
            command: path.join(dir, 'main'),
            args: []
        })
    },
    cpp: {
        label: 'C++',
        fileName: 'main.cpp',
        compile: (dir) => ({
            command: 'g++',
            args: ['main.cpp', '-O2', '-std=c++17', '-o', path.join(dir, 'main')]
        }),
        run: (dir) => ({
            command: path.join(dir, 'main'),
            args: []
        })
    },
    java: {
        label: 'Java',
        fileName: 'Main.java',
        compile: () => ({
            command: 'javac',
            args: ['Main.java']
        }),
        run: () => ({
            command: 'java',
            args: ['Main']
        })
    },
    python: {
        label: 'Python',
        fileName: 'main.py',
        run: () => ({
            command: 'python3',
            args: ['main.py']
        })
    },
    javascript: {
        label: 'JavaScript',
        fileName: 'main.js',
        run: () => ({
            command: 'node',
            args: ['main.js']
        })
    }
};

module.exports = {
    languageConfigs
};
