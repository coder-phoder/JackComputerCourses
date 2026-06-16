const { spawn } = require('child_process');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');

const MAX_CODE_LENGTH = 20000;
const MAX_OUTPUT_LENGTH = 12000;
const RUN_TIMEOUT_MS = 5000;

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

const trimOutput = (value) => {
    const output = String(value || '');

    if (output.length <= MAX_OUTPUT_LENGTH) {
        return output;
    }

    return `${output.slice(0, MAX_OUTPUT_LENGTH)}\n\n[Output truncated]`;
};

const runProcess = async ({ command, args, cwd }) => (
    new Promise((resolve) => {
        let stdout = '';
        let stderr = '';
        let didTimeout = false;

        const child = spawn(command, args, {
            cwd,
            shell: false,
            windowsHide: true
        });

        const timeout = setTimeout(() => {
            didTimeout = true;
            child.kill('SIGKILL');
        }, RUN_TIMEOUT_MS);

        child.stdout.on('data', (chunk) => {
            stdout = trimOutput(stdout + chunk.toString());
        });

        child.stderr.on('data', (chunk) => {
            stderr = trimOutput(stderr + chunk.toString());
        });

        child.on('error', (error) => {
            clearTimeout(timeout);
            resolve({
                exitCode: 127,
                stdout,
                stderr: error.code === 'ENOENT'
                    ? `${command} is not installed or is not available in PATH.`
                    : error.message,
                timedOut: false
            });
        });

        child.on('close', (exitCode) => {
            clearTimeout(timeout);
            resolve({
                exitCode,
                stdout: trimOutput(stdout),
                stderr: trimOutput(stderr),
                timedOut: didTimeout
            });
        });
    })
);

const runCode = async (req, res) => {
    let tempDir = '';

    try {
        const language = String(req.body?.language || '').trim().toLowerCase();
        const code = String(req.body?.code || '');
        const config = languageConfigs[language];

        if (!config) {
            return res.status(400).json({
                success: false,
                message: 'Unsupported language',
                data: {
                    supportedLanguages: Object.keys(languageConfigs)
                }
            });
        }

        if (!code.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Code is required',
                data: {}
            });
        }

        if (code.length > MAX_CODE_LENGTH) {
            return res.status(400).json({
                success: false,
                message: `Code must be ${MAX_CODE_LENGTH} characters or fewer`,
                data: {}
            });
        }

        tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'jack-code-'));
        await fs.writeFile(path.join(tempDir, config.fileName), code, 'utf8');

        if (config.compile) {
            const compileResult = await runProcess({
                ...config.compile(tempDir),
                cwd: tempDir
            });

            if (compileResult.timedOut) {
                return res.status(408).json({
                    success: false,
                    message: `${config.label} compilation timed out`,
                    data: {
                        output: compileResult.stdout,
                        error: compileResult.stderr || 'Compilation timed out.'
                    }
                });
            }

            if (compileResult.exitCode !== 0) {
                return res.status(400).json({
                    success: false,
                    message: `${config.label} compilation failed`,
                    data: {
                        output: compileResult.stdout,
                        error: compileResult.stderr || 'Compilation failed.'
                    }
                });
            }
        }

        const runResult = await runProcess({
            ...config.run(tempDir),
            cwd: tempDir
        });

        if (runResult.timedOut) {
            return res.status(408).json({
                success: false,
                message: 'Execution timed out',
                data: {
                    output: runResult.stdout,
                    error: `Execution timed out after ${RUN_TIMEOUT_MS / 1000} seconds.`
                }
            });
        }

        if (runResult.exitCode !== 0) {
            return res.status(400).json({
                success: false,
                message: 'Execution failed',
                data: {
                    output: runResult.stdout,
                    error: runResult.stderr || `Process exited with code ${runResult.exitCode}.`
                }
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Code executed successfully',
            data: {
                output: runResult.stdout || 'Finished with no output.',
                error: ''
            }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Unable to execute code',
            data: {
                output: '',
                error: error.message || 'Internal server error'
            }
        });
    } finally {
        if (tempDir) {
            await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
        }
    }
};

module.exports = {
    runCode
};
