const { spawn } = require('child_process');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const { languageConfigs } = require('../controllers/code.controller');

const RUN_TIMEOUT_MS = 30000; // 30s timeout
const C_STDOUT_SETUP_HEADER = 'jack_stdout_setup.h';
const JS_PROMPT_RUNTIME_FILE = 'jack_prompt_runtime.cjs';
const C_STDOUT_SETUP_SOURCE = [
    '#include <stdio.h>',
    'static void jack_configure_stdout(void) __attribute__((constructor));',
    'static void jack_configure_stdout(void) {',
    '    setvbuf(stdout, NULL, _IONBF, 0);',
    '}',
    ''
].join('\n');
const JS_PROMPT_RUNTIME_SOURCE = [
    "'use strict';",
    "const fs = require('fs');",
    "let pendingInput = '';",
    "function readLine() {",
    "    for (;;) {",
    "        const newlineIndex = pendingInput.indexOf('\\n');",
    "        if (newlineIndex !== -1) {",
    "            const line = pendingInput.slice(0, newlineIndex);",
    "            pendingInput = pendingInput.slice(newlineIndex + 1);",
    "            return line.endsWith('\\r') ? line.slice(0, -1) : line;",
    "        }",
    "        const buffer = Buffer.alloc(1024);",
    "        const bytesRead = fs.readSync(0, buffer, 0, buffer.length, null);",
    "        if (bytesRead === 0) {",
    "            const line = pendingInput;",
    "            pendingInput = '';",
    "            return line;",
    "        }",
    "        pendingInput += buffer.toString('utf8', 0, bytesRead);",
    "    }",
    "}",
    "globalThis.prompt = function prompt(message = '') {",
    "    process.stdout.write(String(message));",
    "    return readLine();",
    "};",
    ''
].join('\n');

async function writeRuntimeSupportFiles(language, dir) {
    if (language === 'c') {
        await fs.writeFile(path.join(dir, C_STDOUT_SETUP_HEADER), C_STDOUT_SETUP_SOURCE, 'utf8');
    }
    if (language === 'javascript') {
        await fs.writeFile(path.join(dir, JS_PROMPT_RUNTIME_FILE), JS_PROMPT_RUNTIME_SOURCE, 'utf8');
    }
}

function getCompileConfig(config, dir, language) {
    const compileConfig = config.compile(dir);

    if (language === 'c') {
        return {
            ...compileConfig,
            args: ['-include', C_STDOUT_SETUP_HEADER, ...compileConfig.args]
        };
    }

    return compileConfig;
}

function getRunConfig(config, dir, language) {
    const runConfig = config.run(dir);

    if (language === 'javascript') {
        return {
            ...runConfig,
            args: ['--require', path.join(dir, JS_PROMPT_RUNTIME_FILE), ...runConfig.args]
        };
    }

    return runConfig;
}

function initSocket(io) {
    io.on('connection', (socket) => {
        let childProcess = null;
        let tempDir = null;
        let timeoutId = null;

        const cleanup = async () => {
            if (timeoutId) {
                clearTimeout(timeoutId);
                timeoutId = null;
            }
            if (childProcess) {
                try {
                    childProcess.kill('SIGKILL');
                } catch (e) {}
                childProcess = null;
            }
            if (tempDir) {
                try {
                    await fs.rm(tempDir, { recursive: true, force: true });
                } catch (e) {}
                tempDir = null;
            }
        };

        socket.on('run-code', async ({ language, code }) => {
            await cleanup();

            const config = languageConfigs[language?.toLowerCase()];
            if (!config) {
                socket.emit('terminal-output', 'Error: Unsupported language.\n');
                socket.emit('process-exit', 1);
                return;
            }

            if (!code || !code.trim()) {
                socket.emit('terminal-output', 'Error: Code is empty.\n');
                socket.emit('process-exit', 1);
                return;
            }

            try {
                tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'jack-interactive-'));
                const fileToCreate = path.join(tempDir, config.fileName);
                await fs.writeFile(fileToCreate, code, 'utf8');
                await writeRuntimeSupportFiles(language.toLowerCase(), tempDir);

                if (config.compile) {
                    socket.emit('terminal-output', 'Compiling...\n');
                    const comp = getCompileConfig(config, tempDir, language.toLowerCase());
                    
                    const compileProc = spawn(comp.command, comp.args, {
                        cwd: tempDir,
                        shell: false,
                        windowsHide: true
                    });

                    let compStderr = '';
                    compileProc.stderr.on('data', (data) => {
                        compStderr += data.toString();
                    });
                    compileProc.stdout.on('data', (data) => {
                        compStderr += data.toString();
                    });

                    const compileExitCode = await new Promise((resolve) => {
                        compileProc.on('close', resolve);
                    });

                    if (compileExitCode !== 0) {
                        socket.emit('terminal-output', `Compilation Failed:\n${compStderr}\n`);
                        socket.emit('process-exit', compileExitCode);
                        await cleanup();
                        return;
                    }
                    socket.emit('terminal-output', 'Compilation successful. Running...\n');
                }

                const runner = getRunConfig(config, tempDir, language.toLowerCase());
                childProcess = spawn(runner.command, runner.args, {
                    cwd: tempDir,
                    shell: false,
                    windowsHide: true
                });

                timeoutId = setTimeout(async () => {
                    socket.emit('terminal-output', `\nExecution timed out after ${RUN_TIMEOUT_MS / 1000} seconds.\n`);
                    socket.emit('process-exit', 124);
                    await cleanup();
                }, RUN_TIMEOUT_MS);

                childProcess.stdout.on('data', (data) => {
                    socket.emit('terminal-output', data.toString());
                });

                childProcess.stderr.on('data', (data) => {
                    socket.emit('terminal-output', data.toString());
                });

                childProcess.on('close', async (exitCode) => {
                    socket.emit('process-exit', exitCode);
                    await cleanup();
                });

                childProcess.on('error', async (err) => {
                    socket.emit('terminal-output', `Execution error: ${err.message}\n`);
                    socket.emit('process-exit', 1);
                    await cleanup();
                });

            } catch (err) {
                socket.emit('terminal-output', `System error: ${err.message}\n`);
                socket.emit('process-exit', 1);
                await cleanup();
            }
        });

        socket.on('terminal-input', (input) => {
            if (childProcess && childProcess.stdin.writable) {
                childProcess.stdin.write(input);
            }
        });

        socket.on('stop-code', async () => {
            socket.emit('terminal-output', '\nExecution stopped by user.\n');
            socket.emit('process-exit', 130);
            await cleanup();
        });

        socket.on('disconnect', async () => {
            await cleanup();
        });
    });
}

module.exports = { initSocket };
