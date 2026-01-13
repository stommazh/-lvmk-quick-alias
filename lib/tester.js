import { spawn } from 'child_process';

/**
 * Test if the CLI works in headless mode
 */
export async function testHeadlessMode(cli, model) {
    const testPrompt = 'Say OK';

    return new Promise((resolve) => {
        const command = cli.buildCommand(testPrompt, model);

        // Use spawn with shell for proper command execution
        const child = spawn(command, {
            shell: '/bin/zsh',
            stdio: ['inherit', 'pipe', 'pipe'],
            env: { ...process.env, TERM: 'dumb' }, // Disable fancy terminal output
            timeout: 60000
        });

        let stdout = '';
        let stderr = '';

        child.stdout?.on('data', (data) => {
            stdout += data.toString();
        });

        child.stderr?.on('data', (data) => {
            stderr += data.toString();
        });

        // Set a manual timeout
        const timeoutId = setTimeout(() => {
            child.kill('SIGTERM');
            resolve({
                success: false,
                error: 'Command timed out after 60 seconds'
            });
        }, 60000);

        child.on('close', (code) => {
            clearTimeout(timeoutId);

            const combinedOutput = (stdout + stderr).toLowerCase().trim();

            // If we got any output, consider it a success
            if (combinedOutput.length > 0) {
                resolve({ success: true, output: stdout || stderr });
                return;
            }

            // Exit code 0 but no output - might still be okay for some CLIs
            if (code === 0) {
                resolve({ success: true, output: 'CLI responded successfully' });
                return;
            }

            resolve({
                success: false,
                error: stderr || `CLI exited with code ${code}`
            });
        });

        child.on('error', (error) => {
            clearTimeout(timeoutId);
            resolve({
                success: false,
                error: error.message
            });
        });
    });
}
