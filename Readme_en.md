# Advanced Subtitle Text Extraction Tool

**Last Updated:** 2025-05-11

## Description

This tool allows users to easily extract plain text content from various subtitle file formats or pasted subtitle text. It removes timestamps, styling tags, and other metadata, providing clean, readable text. The interface is designed to be intuitive, responsive, and modern, with features like automatic copying and clear user feedback.

## Features

* **Versatile Input Methods:**
    * **Paste Text:** Directly paste subtitle content into a text area.
    * **File Upload:** Upload subtitle files using a file selector.
    * **Drag & Drop:** Drag and drop subtitle files directly onto the designated area.
* **Button-Style Input Selection:** Easily switch between "Paste Text" and "Upload File" modes using clear buttons.
* **Wide Format Support:** Extracts text from common subtitle formats:
    * SRT (`.srt`)
    * WebVTT (`.vtt`)
    * Advanced Substation Alpha (`.ass`)
    * SubStation Alpha (`.ssa`)
    * YouTube SBV (`.sbv`)
    * SAMI (`.smi`)
* **Automatic Text Extraction:** Clicking the "提取文本" (Extract Text) button processes the input.
* **Auto-Copy to Clipboard:** Upon successful text extraction, the result is automatically copied to the clipboard.
* **User Notifications:** Clear, non-intrusive messages inform the user about success, errors, or other statuses (e.g., "Text extracted successfully!", "Copied to clipboard!", "Unsupported file type.").
* **Manual Copy Option:** A "复制结果" (Copy Result) button is available if manual copying is preferred.
* **Merge Text Lines:** An option to "合并为一段" (Merge into one paragraph) allows users to join all extracted text lines into a single block, using a customizable separator (default is ", ").
* **Responsive Design:** The layout adapts to various screen sizes, ensuring a good user experience on both desktop and mobile devices.
* **Modern & Elegant UI:**
    * Clean, Google-inspired design.
    * Subtle click and hover animations for interactive elements.
    * Visual feedback for actions like file dragging.

## Supported Formats

The tool officially supports the extraction of text from the following subtitle file formats:

* `.srt` (SubRip Text)
* `.vtt` (WebVTT)
* `.ass` (Advanced SubStation Alpha)
* `.ssa` (SubStation Alpha)
* `.sbv` (YouTube SBV)
* `.smi` (SAMI)

If an unknown format is provided, the tool will attempt a generic extraction, which may have mixed results.

## How to Use

1.  **Open the Tool:**
    * Ensure all project files (`index.html`, `style.css`, `script.js`) are in the same directory.
    * Open the `index.html` file in any modern web browser (e.g., Chrome, Firefox, Edge, Safari).

2.  **Choose Input Method:**
    * Click "粘贴文本" to paste subtitle content directly.
    * Click "上传/拖拽文件" to upload a file.

3.  **Provide Subtitle Data:**
    * **If pasting text:** Paste your subtitle content into the large text area provided.
    * **If uploading file:**
        * Click the "选择字幕文件" label within the drop zone to open a file dialog and select your subtitle file.
        * Alternatively, drag and drop your subtitle file directly onto the area marked "或将文件拖拽到此处".

4.  **Extract Text:**
    * Click the "提取文本" (Extract Text) button.

5.  **Get Results:**
    * The extracted plain text will appear in the "提取结果" text area.
    * The text will be **automatically copied to your clipboard** upon successful extraction. A notification will confirm this.
    * If you need to copy it again, click the "复制结果" (Copy Result) button.

6.  **(Optional) Merge Text:**
    * If you want to merge all lines of the extracted text into a single paragraph, you can:
        * Optionally change the separator in the small input field next to the "合并为一段" button (default is ", ").
        * Click the "合并为一段" (Merge into one paragraph) button. The text in the "提取结果" area will be updated.

## Project Files

* `index.html`: The main HTML structure of the web application.
* `style.css`: Contains all the CSS rules for styling the application, including responsive design and animations.
* `script.js`: Handles all the client-side logic, including:
    * Input type switching.
    * File reading and drag & drop functionality.
    * Subtitle parsing and text extraction for various formats.
    * Clipboard operations.
    * UI updates and notifications.

## Setup / Installation

This is a client-side web application. No special installation or server is required.

1.  Download all three files: `index.html`, `style.css`, and `script.js`.
2.  Place them in the same folder on your local computer.
3.  Open `index.html` in your preferred web browser.

---

Enjoy using the Advanced Subtitle Text Extraction Tool!