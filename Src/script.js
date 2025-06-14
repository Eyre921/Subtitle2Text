document.addEventListener('DOMContentLoaded', () => {
    // UI Elements
    const subtitleFileEl = document.getElementById('subtitleFile');
    const fileDropZoneEl = document.getElementById('file-drop-zone');
    const outputTextEl = document.getElementById('outputText');
    const copyButton = document.getElementById('copyButton');
    const mergeButton = document.getElementById('mergeButton');
    const mergeSeparatorEl = document.getElementById('mergeSeparator');
    const messageAreaEl = document.getElementById('messageArea');

    // --- Configuration ---
    const acceptedFileTypes = ['.srt', '.vtt', '.ass', '.ssa', '.sbv', '.smi'];

    // --- Event Listeners ---

    // Drag and Drop
    fileDropZoneEl.addEventListener('dragover', (event) => {
        event.preventDefault();
        fileDropZoneEl.classList.add('dragover');
    });

    fileDropZoneEl.addEventListener('dragleave', () => {
        fileDropZoneEl.classList.remove('dragover');
    });

    fileDropZoneEl.addEventListener('drop', (event) => {
        event.preventDefault();
        fileDropZoneEl.classList.remove('dragover');
        const files = event.dataTransfer.files;
        if (files.length > 0) {
            handleFiles(files);
        }
    });

    // Clicking drop zone also opens file dialog
    fileDropZoneEl.addEventListener('click', () => {
        subtitleFileEl.click();
    });

    // Listen for changes on the actual file input (e.g., after dialog selection)
    subtitleFileEl.addEventListener('change', () => {
        const files = subtitleFileEl.files;
        if (files.length > 0) {
            handleFiles(files);
        }
    });

    // Copy and Merge buttons
    copyButton.addEventListener('click', () => handleCopy(outputTextEl.value));
    mergeButton.addEventListener('click', handleMerge);


    // --- Core File Handling Logic ---

    async function handleFiles(files) {
        clearOutputAndMessages();

        const validFiles = Array.from(files).filter(file =>
            acceptedFileTypes.some(type => file.name.toLowerCase().endsWith(type))
        );

        if (validFiles.length === 0) {
            showMessage(`没有找到支持的文件类型。请使用 ${acceptedFileTypes.join(', ')} 文件。`, 'error');
            return;
        }

        showMessage(`正在处理 ${validFiles.length} 个文件...`, 'info');

        try {
            const processingPromises = validFiles.map(processFile);
            const results = await Promise.all(processingPromises);

            const successfulResults = results.filter(r => !r.error);

            if (successfulResults.length === 0) {
                showMessage('所有文件都处理失败。请检查文件格式。', 'error');
                return;
            }

            // If only one file was processed successfully
            if (successfulResults.length === 1) {
                const { fileName, extractedText } = successfulResults[0];
                outputTextEl.value = extractedText;

                if(extractedText.trim() !== '') {
                    handleCopy(extractedText, true); // Silent copy
                    downloadTextFile(extractedText, fileName);
                    showMessage(`成功处理 ${fileName}，已复制到剪贴板并开始下载。`, 'success');
                } else {
                     showMessage(`${fileName} 中未能提取到任何文本。`, 'error');
                }

            } else { // If multiple files were processed
                outputTextEl.value = ''; // Clear preview area for multiple files
                successfulResults.forEach(({ fileName, extractedText }) => {
                     if(extractedText.trim() !== '') {
                        downloadTextFile(extractedText, fileName);
                     }
                });
                showMessage(`成功处理并下载了 ${successfulResults.length} 个文件。`, 'success');
            }

            // Report errors if some files failed
            const failedCount = results.length - successfulResults.length;
            if (failedCount > 0) {
                let currentMessage = messageAreaEl.textContent;
                messageAreaEl.textContent = currentMessage + ` (${failedCount} 个文件处理失败。).`;
            }

        } catch (error) {
            showMessage('处理文件时发生意外错误。', 'error');
            console.error('File handling error:', error);
        } finally {
            // Reset the file input value to allow re-uploading the same file
            subtitleFileEl.value = '';
        }
    }

    /**
     * Reads a file and returns a promise that resolves with the extracted text.
     * @param {File} file The file to process.
     * @returns {Promise<{fileName: string, extractedText: string, error?: boolean}>}
     */
    function processFile(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                const content = event.target.result;
                const extractedText = extractTextFromContent(content, file.name);
                resolve({ fileName: file.name, extractedText });
            };
            reader.onerror = () => {
                console.error(`Error reading file: ${file.name}`);
                resolve({ fileName: file.name, extractedText: '', error: true });
            };
            reader.readAsText(file);
        });
    }

    // --- Helper Functions ---

    function downloadTextFile(text, originalFileName) {
        if (!text || text.trim() === '') return;

        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');

        const baseName = originalFileName.includes('.')
            ? originalFileName.substring(0, originalFileName.lastIndexOf('.'))
            : originalFileName;

        a.href = url;
        a.download = `${baseName}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function clearOutputAndMessages() {
        outputTextEl.value = '';
        messageAreaEl.textContent = '';
        messageAreaEl.className = 'message';
    }

    function showMessage(message, type = 'info') {
        messageAreaEl.textContent = message;
        messageAreaEl.className = `message ${type}`;
    }

    // --- Core Extraction Logic ---
    function extractTextFromContent(content, fileName) {
        const format = detectFormat(content, fileName);
        const lines = content.split(/\r?\n/);
        let extractedText = '';
        let currentTextLines = [];

        const srtVttTimestampRegex = /^(?:\d{2}:)?\d{2}:\d{2}[,.]\d{3}\s*-->\s*(?:\d{2}:)?\d{2}:\d{2}[,.]\d{3}/;
        const srtSequenceNumberRegex = /^\d+$/;
        const vttMetaDataOrSettings = /^(WEBVTT|KIND|LANGUAGE|::cue|DEFAULT|HEADER|NOTE|STYLE|REGION|TITLE|DESCRIPTION|CHAPTER)/i;

        function finalizeCue() {
            if (currentTextLines.length > 0) {
                const cueText = currentTextLines.join('\n').trim();
                if (cueText) {
                    extractedText += cueText + '\n';
                }
                currentTextLines = [];
            }
        }

        if (format === 'SRT' || format === 'VTT' || format === 'SBV' || format === 'UNKNOWN') {
            let inVttStyleBlock = false;
            lines.forEach((line, index) => {
                line = line.trim();

                if (line.toUpperCase().startsWith('STYLE') && format === 'VTT') inVttStyleBlock = true;
                if (line === '' && inVttStyleBlock) { inVttStyleBlock = false; return; }
                if (inVttStyleBlock) return;

                if (vttMetaDataOrSettings.test(line) && format === 'VTT') return;
                if (srtVttTimestampRegex.test(line) || (format === 'SBV' && /^\d{1,2}:\d{2}:\d{2}\.\d{3},\d{1,2}:\d{2}:\d{2}\.\d{3}$/.test(line))) {
                    finalizeCue();
                    return;
                }
                if (srtSequenceNumberRegex.test(line)) {
                     if (format === 'SRT' && index + 1 < lines.length && srtVttTimestampRegex.test(lines[index + 1].trim())) {
                        finalizeCue();
                        return;
                    }
                }

                if (line === '') {
                    finalizeCue();
                    return;
                }
                const cleaned = cleanHtmlTags(line);
                if (cleaned) currentTextLines.push(cleaned);
            });
            finalizeCue();
        } else if (format === 'ASS_SSA') {
            let inEventsSection = false;
            lines.forEach(line => {
                line = line.trim();
                if (line.toLowerCase() === '[events]') {
                    inEventsSection = true;
                    return;
                }
                if (line.startsWith('[') && line.endsWith(']')) {
                    if (inEventsSection) inEventsSection = false;
                    return;
                }

                if (inEventsSection && (line.toLowerCase().startsWith('dialogue:') || line.toLowerCase().startsWith('comment:'))) {
                    finalizeCue();
                    const parts = line.split(',');
                    const textIndex = line.toLowerCase().startsWith('dialogue:') ? 9 : 9; // Adjust if Comment format differs
                    if (parts.length > textIndex) {
                        const text = parts.slice(textIndex).join(',').trim();
                        const cleaned = cleanSsaAssTags(text);
                        if (cleaned) currentTextLines.push(cleaned);
                        finalizeCue();
                    }
                }
            });
        } else if (format === 'SMI') {
            try {
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(content, "text/xml");
                if (xmlDoc.getElementsByTagName("parsererror").length > 0) return '';

                const syncElements = xmlDoc.getElementsByTagName('SYNC');
                for (let i = 0; i < syncElements.length; i++) {
                    const pElement = syncElements[i].getElementsByTagName('P')[0];
                    if (pElement) {
                        let textContent = pElement.innerHTML.replace(/<br\s*\/?>/gi, '\n');
                        textContent = cleanHtmlTags(textContent);
                        if (textContent.trim()) {
                            currentTextLines.push(textContent.trim());
                            finalizeCue();
                        }
                    }
                }
            } catch (e) {
                console.error("SMI Processing Error:", e);
            }
        }

        return extractedText.trim();
    }

    function detectFormat(content, fileName = '') {
        const ext = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
        if (ext === '.srt') return 'SRT';
        if (ext === '.vtt') return 'VTT';
        if (ext === '.ass' || ext === '.ssa') return 'ASS_SSA';
        if (ext === '.smi') return 'SMI';
        if (ext === '.sbv') return 'SBV';

        if (content.toUpperCase().includes("<SAMI>")) return 'SMI';
        if (content.includes("[Script Info]") && content.includes("[Events]")) return 'ASS_SSA';
        if (content.toUpperCase().startsWith("WEBVTT")) return 'VTT';
        if (/^\d{1,2}:\d{2}:\d{2}\.\d{3},\d{1,2}:\d{2}:\d{2}\.\d{3}/m.test(content)) return 'SBV';
        if (content.includes("-->")) return 'SRT';

        return 'UNKNOWN';
    }

    function cleanHtmlTags(text) {
        let cleaned = text.replace(/<c\.[^>]+>/g, '').replace(/<\/c>/g, '');
        cleaned = cleaned.replace(/<v\s*[^>]*>/gi, '').replace(/<\/v>/gi, '');
        cleaned = cleaned.replace(/<lang\s*[^>]*>/gi, '').replace(/<\/lang>/gi, '');
        cleaned = cleaned.replace(/<ruby[^>]*>([\s\S]*?)<\/ruby>/gi, '$1');
        cleaned = cleaned.replace(/<rt[^>]*>[\s\S]*?<\/rt>/gi, '');
        cleaned = cleaned.replace(/<b[^>]*>|<\/b>/gi, '');
        cleaned = cleaned.replace(/<i[^>]*>|<\/i>/gi, '');
        cleaned = cleaned.replace(/<u[^>]*>|<\/u>/gi, '');
        cleaned = cleaned.replace(/<font[^>]*>|<\/font>/gi, '');
        cleaned = cleaned.replace(/<[^>]+>/g, '');
        cleaned = cleaned.replace(/&nbsp;/gi, ' ')
            .replace(/&lt;/gi, '<')
            .replace(/&gt;/gi, '>')
            .replace(/&amp;/gi, '&');
        return cleaned.trim();
    }

    function cleanSsaAssTags(text) {
        return text.replace(/{\\[^}]+}/g, '').replace(/\\N/g, '\n').replace(/\\n/g, '\n').trim();
    }

    // --- Output Handling ---
    function handleCopy(textToCopy, silent = false) {
        if (!textToCopy || textToCopy.trim() === '') {
            if (!silent) showMessage('没有文本可复制！', 'error');
            return;
        }

        navigator.clipboard.writeText(textToCopy).then(() => {
            if (!silent) showMessage('结果已复制到剪贴板！', 'success');
        }).catch(err => {
            if (!silent) showMessage('复制失败，请手动操作。', 'error');
            console.error('Clipboard API failed:', err);
        });
    }

    function handleMerge() {
        let currentText = outputTextEl.value;
        if (currentText.trim() === '') {
            showMessage('没有文本可合并！', 'error');
            return;
        }
        const separator = mergeSeparatorEl.value;
        currentText = currentText.replace(/\n\s*\n/g, '\n').trim();
        const mergedText = currentText.split('\n').join(separator);
        outputTextEl.value = mergedText;
        showMessage('文本已合并为一段。', 'info');
    }

    // --- Initialization ---
    showMessage('工具已就绪。请拖放文件或点击上方区域选择。', 'info');
});
