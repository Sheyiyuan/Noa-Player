import { useState } from 'react';

export function App() {
    const [output, setOutput] = useState('IPC 结果会显示在这里');

    const callPing = async () => {
        const result = await window.noaDesktop.ping();
        setOutput(JSON.stringify(result, null, 2));
    };

    const callVersions = async () => {
        const result = await window.noaDesktop.getVersions();
        setOutput(JSON.stringify(result, null, 2));
    };

    const callExportMarkdown = async () => {
        const result = await window.noaDesktop.exportMarkdown({
            content: '# NoaStudio IPC\n\n这是一段导出占位内容。',
            suggestedName: 'noa-note.md',
        });
        setOutput(JSON.stringify(result, null, 2));
    };

    return (
        <main className="app">
            <section className="card">
                <h1>NoaStudio</h1>
                <p>IPC 框架已接通（main / preload / renderer）。</p>
                <div className="actions">
                    <button type="button" onClick={callPing}>ping</button>
                    <button type="button" onClick={callVersions}>getVersions</button>
                    <button type="button" onClick={callExportMarkdown}>exportMarkdown</button>
                </div>
                <pre className="output">{output}</pre>
            </section>
        </main>
    );
}
