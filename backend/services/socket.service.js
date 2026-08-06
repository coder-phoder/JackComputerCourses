const { spawn } = require('child_process');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const { languageConfigs } = require('../controllers/code.controller');

const RUN_TIMEOUT_MS = 30000; // 30s timeout
const TEST_CASE_TIMEOUT_MS = 10000; // 10s per test case
const MAX_TEST_CASES_PER_RUN = 20;
const MAX_TEST_CASE_INPUT_LENGTH = 8 * 1024;
const MAX_TEST_CASE_OUTPUT_LENGTH = 32 * 1024;
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

async function createRunDirectory(prefix, language, code, config) {
    const runDirectory = await fs.mkdtemp(path.join(os.tmpdir(), prefix));

    await fs.writeFile(path.join(runDirectory, config.fileName), code, 'utf8');
    await writeRuntimeSupportFiles(language, runDirectory);

    return runDirectory;
}

function compileInDirectory(config, dir, language) {
    return new Promise((resolve) => {
        const compileSetup = getCompileConfig(config, dir, language);
        let settled = false;
        let output = '';

        const settle = (success) => {
            if (settled) {
                return;
            }

            settled = true;
            resolve({ success, output });
        };

        let compileProcess = null;

        try {
            compileProcess = spawn(compileSetup.command, compileSetup.args, {
                cwd: dir,
                shell: false,
                windowsHide: true
            });
        } catch (spawnError) {
            output += `${spawnError.message}\n`;
            settle(false);
            return;
        }

        const appendOutput = (data) => {
            output += data.toString();
        };

        compileProcess.stdout.on('data', appendOutput);
        compileProcess.stderr.on('data', appendOutput);
        compileProcess.on('error', (compileError) => {
            output += `${compileError.message}\n`;
            settle(false);
        });
        compileProcess.on('close', (exitCode) => settle(exitCode === 0));
    });
}

function runProcessWithInput({ command, args, cwd, input, timeoutMs, onSpawn }) {
    return new Promise((resolve) => {
        const startedAt = Date.now();
        let runProcess = null;

        try {
            runProcess = spawn(command, args, {
                cwd,
                shell: false,
                windowsHide: true
            });
        } catch (spawnError) {
            resolve({
                stdout: '',
                stderr: `Execution error: ${spawnError.message}\n`,
                exitCode: 1,
                timedOut: false,
                truncated: false,
                durationMs: 0
            });
            return;
        }

        let stdout = '';
        let stderr = '';
        let truncated = false;
        let timedOut = false;
        let settled = false;

        const appendChunk = (current, chunk) => {
            const remaining = MAX_TEST_CASE_OUTPUT_LENGTH - current.length;

            if (remaining <= 0) {
                truncated = true;
                return current;
            }

            if (chunk.length > remaining) {
                truncated = true;
                return current + chunk.slice(0, remaining);
            }

            return current + chunk;
        };

        const timeoutId = setTimeout(() => {
            timedOut = true;

            try {
                runProcess.kill('SIGKILL');
            } catch (killError) {}
        }, timeoutMs);

        const settle = (exitCode) => {
            if (settled) {
                return;
            }

            settled = true;
            clearTimeout(timeoutId);
            resolve({
                stdout,
                stderr,
                exitCode,
                timedOut,
                truncated,
                durationMs: Date.now() - startedAt
            });
        };

        if (onSpawn) {
            onSpawn(runProcess);
        }

        runProcess.stdout.on('data', (data) => {
            stdout = appendChunk(stdout, data.toString());
        });

        runProcess.stderr.on('data', (data) => {
            stderr = appendChunk(stderr, data.toString());
        });

        runProcess.on('error', (runError) => {
            stderr = appendChunk(stderr, `Execution error: ${runError.message}\n`);
            settle(1);
        });

        runProcess.on('close', (exitCode) => settle(exitCode));

        runProcess.stdin.on('error', () => {});
        runProcess.stdin.end(input);
    });
}

function normalizeTestCases(testCases) {
    if (!Array.isArray(testCases)) {
        return [];
    }

    return testCases.slice(0, MAX_TEST_CASES_PER_RUN).map((testCase, index) => ({
        id: String(testCase?.id || index),
        input: String(testCase?.input || '').slice(0, MAX_TEST_CASE_INPUT_LENGTH)
    }));
}

function initSocket(io) {
    io.on('connection', (socket) => {
        let childProcess = null;
        let tempDir = null;
        let timeoutId = null;

        let batchProcess = null;
        let batchDir = null;
        let batchToken = 0;

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

        const cleanupBatch = async () => {
            batchToken += 1;

            if (batchProcess) {
                try {
                    batchProcess.kill('SIGKILL');
                } catch (e) {}
                batchProcess = null;
            }
            if (batchDir) {
                try {
                    await fs.rm(batchDir, { recursive: true, force: true });
                } catch (e) {}
                batchDir = null;
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
                const normalizedLanguage = language.toLowerCase();
                tempDir = await createRunDirectory('jack-interactive-', normalizedLanguage, code, config);

                if (config.compile) {
                    socket.emit('terminal-output', 'Compiling...\n');
                    const compileResult = await compileInDirectory(config, tempDir, normalizedLanguage);

                    if (!compileResult.success) {
                        socket.emit('terminal-output', `Compilation Failed:\n${compileResult.output}\n`);
                        socket.emit('process-exit', 1);
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

        socket.on('run-testcases', async ({ language, code, testCases }) => {
            await cleanupBatch();

            const currentToken = batchToken;
            const isStale = () => currentToken !== batchToken;
            const config = languageConfigs[language?.toLowerCase()];

            if (!config) {
                socket.emit('testcase-batch-done', { error: 'Unsupported language.' });
                return;
            }

            if (!code || !code.trim()) {
                socket.emit('testcase-batch-done', { error: 'Code is empty.' });
                return;
            }

            const runnableTestCases = normalizeTestCases(testCases);

            if (!runnableTestCases.length) {
                socket.emit('testcase-batch-done', { error: 'Add at least one test case first.' });
                return;
            }

            try {
                const normalizedLanguage = language.toLowerCase();
                const runDirectory = await createRunDirectory('jack-testcases-', normalizedLanguage, code, config);

                if (isStale()) {
                    await fs.rm(runDirectory, { recursive: true, force: true }).catch(() => {});
                    return;
                }

                batchDir = runDirectory;

                if (config.compile) {
                    socket.emit('testcase-batch-compiling', {});
                    const compileResult = await compileInDirectory(config, runDirectory, normalizedLanguage);

                    if (isStale()) {
                        return;
                    }

                    if (!compileResult.success) {
                        socket.emit('testcase-batch-done', {
                            error: 'Compilation failed.',
                            compileOutput: compileResult.output
                        });
                        await cleanupBatch();
                        return;
                    }
                }

                const runner = getRunConfig(config, runDirectory, normalizedLanguage);

                for (const testCase of runnableTestCases) {
                    if (isStale()) {
                        return;
                    }

                    socket.emit('testcase-started', { id: testCase.id });

                    const result = await runProcessWithInput({
                        command: runner.command,
                        args: runner.args,
                        cwd: runDirectory,
                        input: testCase.input,
                        timeoutMs: TEST_CASE_TIMEOUT_MS,
                        onSpawn: (spawnedProcess) => {
                            if (isStale()) {
                                try {
                                    spawnedProcess.kill('SIGKILL');
                                } catch (e) {}
                                return;
                            }

                            batchProcess = spawnedProcess;
                        }
                    });

                    if (isStale()) {
                        return;
                    }

                    batchProcess = null;

                    socket.emit('testcase-result', {
                        id: testCase.id,
                        ...result,
                        timeoutMs: TEST_CASE_TIMEOUT_MS
                    });
                }

                socket.emit('testcase-batch-done', {});
                await cleanupBatch();
            } catch (batchError) {
                if (isStale()) {
                    return;
                }

                socket.emit('testcase-batch-done', { error: `System error: ${batchError.message}` });
                await cleanupBatch();
            }
        });

        socket.on('stop-testcases', async () => {
            await cleanupBatch();
            socket.emit('testcase-batch-done', { stopped: true });
        });

        socket.on('disconnect', async () => {
            await cleanup();
            await cleanupBatch();
        });
    });
}

module.exports = { initSocket };
