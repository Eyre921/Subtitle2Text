document.addEventListener('DOMContentLoaded', () => {
    // UI Elements
    const inputTypeTextButton = document.getElementById('inputTypeText');
    const inputTypeFileButton = document.getElementById('inputTypeFile');
    const textInputAreaEl = document.getElementById('text-input-area');
    const fileInputAreaEl = document.getElementById('file-input-area');
    const subtitleInputEl = document.getElementById('subtitleInput');
    const subtitleFileEl = document.getElementById('subtitleFile');
    const fileDropZoneEl = document.getElementById('file-drop-zone');
    const extractButton = document.getElementById('extractButton');
    const outputTextEl = document.getElementById('outputText');
    const copyButton = document.getElementById('copyButton');
    const mergeButton = document.getElementById('mergeButton');
    const mergeSeparatorEl = document.getElementById('mergeSeparator');
    const messageAreaEl = document.getElementById('messageArea');

    // --- Configuration & State ---
    const acceptedFileTypes = ['.srt', '.vtt', '.ass', '.ssa', '.sbv', '.smi'];
    let currentInputType = 'text'; // Default to text, will be set by active button

    // --- Event Listeners ---

    // Input type button toggle
    function updateInputTypeView() {
        if (currentInputType === 'text') {
            textInputAreaEl.style.display = 'block';
            fileInputAreaEl.style.display = 'none';
            subtitleFileEl.value = ''; // Clear file input
            inputTypeTextButton.classList.add('active');
            inputTypeFileButton.classList.remove('active');
        } else { // 'file'
            textInputAreaEl.style.display = 'none';
            fileInputAreaEl.style.display = 'block';
            subtitleInputEl.value = ''; // Clear text input
            inputTypeFileButton.classList.add('active');
            inputTypeTextButton.classList.remove('active');
        }
        clearOutputAndMessages();
    }

    inputTypeTextButton.addEventListener('click', () => {
        if (currentInputType !== 'text') {
            currentInputType = 'text';
            updateInputTypeView();
        }
    });

    inputTypeFileButton.addEventListener('click', () => {
        if (currentInputType !== 'file') {
            currentInputType = 'file';
            updateInputTypeView();
        }
    });


    // Extract button
    extractButton.addEventListener('click', () => {
        clearOutputAndMessages();
        // Use currentInputType variable
        if (currentInputType === 'text') {
            const content = subtitleInputEl.value;
            if (content.trim() === '') {
                showMessage('请输入或粘贴字幕内容！', 'error');
                return;
            }
            processSubtitleContent(content, 'unknown'); // 'unknown' type for pasted content
        } else { // 'file' input
            const file = subtitleFileEl.files[0];
            if (!file) {
                showMessage('请选择一个字幕文件！', 'error');
                return;
            }
            if (!acceptedFileTypes.some(type => file.name.toLowerCase().endsWith(type))) {
                showMessage(`不支持的文件类型。请上传 ${acceptedFileTypes.join(', ')} 文件。`, 'error');
                subtitleFileEl.value = ''; // Clear invalid file
                return;
            }
            readFile(file);
        }
    });

    // Copy button
    copyButton.addEventListener('click', handleCopy);

    // Merge button
    mergeButton.addEventListener('click', handleMerge);

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
        clearOutputAndMessages();
        const files = event.dataTransfer.files;
        if (files.length > 0) {
            const file = files[0];
            if (!acceptedFileTypes.some(type => file.name.toLowerCase().endsWith(type))) {
                showMessage(`不支持的文件类型。请上传 ${acceptedFileTypes.join(', ')} 文件。`, 'error');
                return;
            }
            subtitleFileEl.files = files; // Assign to file input for consistency
            // If currentInputType is not 'file', switch to it
            if (currentInputType !== 'file') {
                currentInputType = 'file';
                updateInputTypeView(); // This will also clear messages, so call readFile after.
            }
            readFile(file);
        }
    });
    // Clicking drop zone also opens file dialog
    fileDropZoneEl.addEventListener('click', (event) => { // Added event parameter
        if(event.target !== subtitleFileEl && event.target.tagName !== 'LABEL') { // Avoid re-triggering if input or label itself is clicked
            subtitleFileEl.click();
        }
    });
    // Also handle click on the label inside drop zone
    const dropZoneLabel = fileDropZoneEl.querySelector('label');
    if (dropZoneLabel) {
        dropZoneLabel.addEventListener('click', (event) => {
            event.preventDefault(); // Prevent label's default behavior which might interfere
            subtitleFileEl.click();
        });
    }

    // Listen for changes on the actual file input (e.g., after dialog selection)
    subtitleFileEl.addEventListener('change', () => {
        clearOutputAndMessages();
        const file = subtitleFileEl.files[0];
        if (file) {
            if (!acceptedFileTypes.some(type => file.name.toLowerCase().endsWith(type))) {
                showMessage(`不支持的文件类型。请上传 ${acceptedFileTypes.join(', ')} 文件。`, 'error');
                subtitleFileEl.value = ''; // Clear invalid file
                return;
            }
            readFile(file);
        }
    });


    // --- Helper Functions ---

    function clearOutputAndMessages() {
        outputTextEl.value = '';
        messageAreaEl.textContent = '';
        messageAreaEl.className = 'message';
    }

    function showMessage(message, type = 'info') {
        messageAreaEl.textContent = message;
        messageAreaEl.className = `message ${type}`;
    }

    function readFile(file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            processSubtitleContent(event.target.result, file.name);
        };
        reader.onerror = (err) => {
            showMessage(`读取文件失败: ${err.message || '未知错误'}`, 'error');
        };
        reader.readAsText(file);
    }

    // --- Core Processing Logic ---
    function detectFormat(content, fileName = '') {
        const ext = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));

        if (content.toUpperCase().includes("<SAMI>")) return 'SMI';
        if (content.includes("[Script Info]") && content.includes("[Events]")) return 'ASS_SSA';
        if (content.toUpperCase().startsWith("WEBVTT")) return 'VTT';
        if (ext === '.sbv' || /^\d{1,2}:\d{2}:\d{2}\.\d{3},\d{1,2}:\d{2}:\d{2}\.\d{3}/m.test(content)) {
            const lines = content.split(/\r?\n/);
            if (lines.length > 1 && /^\d{1,2}:\d{2}:\d{2}\.\d{3},\d{1,2}:\d{2}:\d{2}\.\d{3}$/.test(lines[0].trim()) && lines[1].trim() !== '') {
                return 'SBV';
            }
        }
        if (content.includes("-->")) return 'SRT';
        if (ext === '.srt') return 'SRT';
        if (ext === '.vtt') return 'VTT';
        if (ext === '.ass' || ext === '.ssa') return 'ASS_SSA';
        if (ext === '.smi') return 'SMI';

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


    function processSubtitleContent(content, fileName) {
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

        if (format === 'UNKNOWN') {
            showMessage('无法识别字幕格式，将尝试通用提取。', 'error');
            lines.forEach(line => {
                line = line.trim();
                if (!srtVttTimestampRegex.test(line) && !/^\d+$/.test(line) && line !== "") {
                    currentTextLines.push(cleanHtmlTags(line));
                } else if (line === "" && currentTextLines.length > 0) {
                    finalizeCue();
                }
            });
            finalizeCue();
        } else if (format === 'SRT' || format === 'VTT') {
            let inVttStyleBlock = false;
            lines.forEach((line, index) => {
                line = line.trim();

                if (line.toUpperCase().startsWith('STYLE') && format === 'VTT') inVttStyleBlock = true;
                if (line === '' && inVttStyleBlock) { inVttStyleBlock = false; return; }
                if (inVttStyleBlock) return;

                if (vttMetaDataOrSettings.test(line) && format === 'VTT') return;
                if (srtVttTimestampRegex.test(line)) {
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
                    inEventsSection = false;
                    return;
                }

                if (inEventsSection && line.toLowerCase().startsWith('dialogue:')) {
                    finalizeCue();
                    const parts = line.split(',');
                    if (parts.length > 9) {
                        const text = parts.slice(9).join(',').trim();
                        const cleaned = cleanSsaAssTags(text);
                        if (cleaned) currentTextLines.push(cleaned);
                        finalizeCue();
                    }
                }
            });
        } else if (format === 'SBV') {
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                if (/^\d{1,2}:\d{2}:\d{2}\.\d{3},\d{1,2}:\d{2}:\d{2}\.\d{3}$/.test(line)) {
                    finalizeCue();
                    let textBlock = [];
                    i++;
                    while (i < lines.length && lines[i].trim() !== '' && !/^\d{1,2}:\d{2}:\d{2}\.\d{3},\d{1,2}:\d{2}:\d{2}\.\d{3}$/.test(lines[i].trim())) {
                        const cleaned = cleanHtmlTags(lines[i].trim());
                        if (cleaned) textBlock.push(cleaned);
                        i++;
                    }
                    if (textBlock.length > 0) {
                        currentTextLines.push(...textBlock);
                        finalizeCue();
                    }
                    i--;
                }
            }
            finalizeCue();
        } else if (format === 'SMI') {
            try {
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(content, "text/xml");
                const syncElements = xmlDoc.getElementsByTagName('SYNC');
                if (xmlDoc.getElementsByTagName("parsererror").length > 0) {
                    showMessage('SMI/SAMI 文件解析错误。请检查文件格式。', 'error');
                    console.error("SMI Parse Error:", xmlDoc.getElementsByTagName("parsererror")[0].textContent);
                    return;
                }

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
                showMessage(`SMI 文件处理失败: ${e.message}`, 'error');
                console.error("SMI Processing Error:", e);
            }
        }

        outputTextEl.value = extractedText.trim();

        if (outputTextEl.value === '') {
            showMessage('未能提取到任何文本。请检查字幕格式或内容。', 'error');
        } else {
            showMessage(`文本提取成功 (格式: ${format})！`, 'success');
            handleCopy(); // Automatically copy after successful extraction
        }
    }

    // --- Output Handling ---
    function handleCopy() {
        if (outputTextEl.value === '') {
            showMessage('没有文本可复制！', 'error');
            return;
        }
        outputTextEl.select();
        outputTextEl.setSelectionRange(0, 99999); // For mobile

        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(outputTextEl.value)
                    .then(() => showMessage('结果已复制到剪贴板！', 'success'))
                    .catch(err => {
                        console.warn('Clipboard API failed, falling back to legacy:', err);
                        legacyCopy();
                    });
            } else {
                console.warn('Clipboard API not available, using legacy copy.');
                legacyCopy();
            }
        } catch (err) {
            console.error('Error initiating copy:', err);
            legacyCopy();
        }

        if (window.getSelection) window.getSelection().removeAllRanges();
        else if (document.selection) document.selection.empty();
    }

    function legacyCopy() {
        try {
            const successful = document.execCommand('copy');
            showMessage(successful ? '结果已复制到剪贴板！ (旧版方法)' : '无法自动复制 (旧版失败)', successful ? 'success' : 'error');
        } catch (err) {
            showMessage('复制错误，请手动复制。', 'error');
            console.error('Legacy copy failed:', err);
        }
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
    // Determine initial active button based on HTML class or default to 'text'
    if (inputTypeFileButton.classList.contains('active')) {
        currentInputType = 'file';
    } else {
        currentInputType = 'text'; // Default if neither or text has active
        inputTypeTextButton.classList.add('active'); // Ensure one is active
        inputTypeFileButton.classList.remove('active');
    }
    updateInputTypeView(); // Set initial view based on buttons
    showMessage('工具已就绪。请选择输入方式或拖放文件。', 'info');
});