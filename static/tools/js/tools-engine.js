/**
 * tools-engine.js - Interactive Engine for 48+ Utilities
 * FastTrack Tools (https://www.shajjadkhan.com)
 */

document.addEventListener('DOMContentLoaded', () => {
    const workspace = document.getElementById('toolWorkspace');
    if (!workspace) return;

    const toolId = workspace.getAttribute('data-tool-id');
    const loadingEl = document.getElementById('workspaceLoading');

    try {
        if (typeof ToolRenderers[toolId] === 'function') {
            workspace.innerHTML = '';
            ToolRenderers[toolId](workspace);
        } else {
            workspace.innerHTML = `
                <div style="text-align: center; padding: 3rem;">
                    <h3>Tool initialization</h3>
                    <p style="color: var(--text-muted);">Workspace for <code>${toolId}</code> is ready.</p>
                </div>
            `;
        }
    } catch (err) {
        console.error('Error rendering tool workspace:', err);
        workspace.innerHTML = `
            <div style="color: var(--accent-red); padding: 2rem; text-align: center;">
                <h3>Failed to load tool workspace</h3>
                <p>${err.message}</p>
            </div>
        `;
    }
});

// --- Helper Functions ---
const Utils = {
    formatBytes(bytes, decimals = 2) {
        if (!+bytes) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
    },

    downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    },

    copyToClipboard(text, btnElement) {
        navigator.clipboard.writeText(text).then(() => {
            if (btnElement) {
                const original = btnElement.textContent;
                btnElement.textContent = '✓ Copied!';
                btnElement.style.color = 'var(--accent)';
                setTimeout(() => {
                    btnElement.textContent = original;
                    btnElement.style.color = '';
                }, 2000);
            }
        });
    },

    readFileAsArrayBuffer(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    },

    readFileAsDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    },

    createDropzone(container, accept, multiple, onFilesDropped) {
        const dropzone = document.createElement('div');
        dropzone.className = 'dropzone';
        dropzone.innerHTML = `
            <div class="dropzone-icon">📁</div>
            <div class="dropzone-title">Click to browse or drag & drop files here</div>
            <div class="dropzone-subtitle">Supported: ${accept} (Instant client-side processing)</div>
            <button type="button" class="dropzone-btn">Choose Files</button>
            <input type="file" accept="${accept}" ${multiple ? 'multiple' : ''} style="display: none;">
        `;

        const fileInput = dropzone.querySelector('input[type="file"]');
        dropzone.addEventListener('click', () => fileInput.click());
        dropzone.querySelector('.dropzone-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            fileInput.click();
        });

        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length) {
                onFilesDropped(Array.from(e.target.files));
            }
        });

        dropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropzone.classList.add('dragover');
        });

        dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));

        dropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropzone.classList.remove('dragover');
            if (e.dataTransfer.files.length) {
                onFilesDropped(Array.from(e.dataTransfer.files));
            }
        });

        container.appendChild(dropzone);
        return dropzone;
    }
};

// --- Tool Implementations ---
const ToolRenderers = {

    // 1. JPG & Images to PDF
    'jpg-to-pdf': (container) => {
        let filesList = [];
        container.innerHTML = `
            <div id="dz-area"></div>
            <div id="files-list" class="files-preview-list"></div>
            <div class="controls-panel" id="pdf-controls" style="display: none;">
                <div class="control-group">
                    <label>Page Orientation</label>
                    <select id="pdf-orientation">
                        <option value="auto">Auto (Match Image)</option>
                        <option value="portrait">Portrait</option>
                        <option value="landscape">Landscape</option>
                    </select>
                </div>
                <div class="control-group">
                    <label>Margins</label>
                    <select id="pdf-margins">
                        <option value="0">None (Full Bleed)</option>
                        <option value="20" selected>Standard (20pt)</option>
                        <option value="40">Large (40pt)</option>
                    </select>
                </div>
                <div class="control-group" style="margin-left: auto; justify-content: flex-end;">
                    <button class="btn-primary" id="btn-create-pdf">⚡ Generate & Download PDF</button>
                </div>
            </div>
            <div id="status-box" style="margin-top: 1rem; color: var(--accent); font-weight: 600;"></div>
        `;

        const dzArea = container.querySelector('#dz-area');
        const filesContainer = container.querySelector('#files-list');
        const controls = container.querySelector('#pdf-controls');
        const statusBox = container.querySelector('#status-box');

        Utils.createDropzone(dzArea, 'image/jpeg,image/png,image/webp', true, (newFiles) => {
            filesList = [...filesList, ...newFiles];
            renderList();
        });

        function renderList() {
            filesContainer.innerHTML = '';
            controls.style.display = filesList.length > 0 ? 'flex' : 'none';

            filesList.forEach((file, index) => {
                const card = document.createElement('div');
                card.className = 'file-preview-card';
                card.innerHTML = `
                    <img class="file-thumbnail" src="${URL.createObjectURL(file)}" alt="Preview">
                    <div class="file-card-name" title="${file.name}">${file.name}</div>
                    <div class="file-card-size">${Utils.formatBytes(file.size)}</div>
                    <div class="file-actions">
                        <button class="action-mini-btn" title="Move Left" data-action="left">◀</button>
                        <button class="action-mini-btn" title="Move Right" data-action="right">▶</button>
                        <button class="action-mini-btn btn-del" title="Remove" data-action="del">✕</button>
                    </div>
                `;

                card.querySelector('[data-action="left"]').onclick = () => {
                    if (index > 0) {
                        const temp = filesList[index - 1];
                        filesList[index - 1] = filesList[index];
                        filesList[index] = temp;
                        renderList();
                    }
                };

                card.querySelector('[data-action="right"]').onclick = () => {
                    if (index < filesList.length - 1) {
                        const temp = filesList[index + 1];
                        filesList[index + 1] = filesList[index];
                        filesList[index] = temp;
                        renderList();
                    }
                };

                card.querySelector('[data-action="del"]').onclick = () => {
                    filesList.splice(index, 1);
                    renderList();
                };

                filesContainer.appendChild(card);
            });
        }

        container.querySelector('#btn-create-pdf').onclick = async () => {
            if (!filesList.length) return;
            statusBox.textContent = 'Assembling PDF in browser...';
            try {
                const { PDFDocument } = window.PDFLib;
                const pdfDoc = await PDFDocument.create();
                const orientation = container.querySelector('#pdf-orientation').value;
                const margin = parseInt(container.querySelector('#pdf-margins').value, 10);

                for (const file of filesList) {
                    const arrayBuffer = await Utils.readFileAsArrayBuffer(file);
                    let embeddedImage;

                    if (file.type === 'image/png') {
                        embeddedImage = await pdfDoc.embedPng(arrayBuffer);
                    } else {
                        // Embed as JPG or convert WebP to JPG via canvas
                        try {
                            embeddedImage = await pdfDoc.embedJpg(arrayBuffer);
                        } catch (e) {
                            // Fallback: draw through canvas to get JPG
                            const dataUrl = await Utils.readFileAsDataURL(file);
                            const img = new Image();
                            await new Promise(r => { img.onload = r; img.src = dataUrl; });
                            const c = document.createElement('canvas');
                            c.width = img.width;
                            c.height = img.height;
                            const ctx = c.getContext('2d');
                            ctx.fillStyle = '#ffffff';
                            ctx.fillRect(0, 0, c.width, c.height);
                            ctx.drawImage(img, 0, 0);
                            const jpgBlob = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.92));
                            const buf = await Utils.readFileAsArrayBuffer(jpgBlob);
                            embeddedImage = await pdfDoc.embedJpg(buf);
                        }
                    }

                    const { width, height } = embeddedImage;
                    let pageWidth = width + margin * 2;
                    let pageHeight = height + margin * 2;

                    if (orientation === 'portrait' && pageWidth > pageHeight) {
                        const t = pageWidth; pageWidth = pageHeight; pageHeight = t;
                    } else if (orientation === 'landscape' && pageHeight > pageWidth) {
                        const t = pageWidth; pageWidth = pageHeight; pageHeight = t;
                    }

                    const page = pdfDoc.addPage([pageWidth, pageHeight]);
                    page.drawImage(embeddedImage, {
                        x: margin,
                        y: margin,
                        width: pageWidth - margin * 2,
                        height: pageHeight - margin * 2
                    });
                }

                const pdfBytes = await pdfDoc.save();
                const blob = new Blob([pdfBytes], { type: 'application/pdf' });
                Utils.downloadBlob(blob, `fasttrack_images_${Date.now()}.pdf`);
                statusBox.textContent = '✓ PDF successfully created and downloaded!';
            } catch (err) {
                console.error(err);
                statusBox.textContent = 'Error creating PDF: ' + err.message;
            }
        };
    },

    // 2. PDF Merge & Combine
    'pdf-merge': (container) => {
        let pdfFiles = [];
        container.innerHTML = `
            <div id="dz-merge"></div>
            <div id="merge-list" style="margin: 1.5rem 0; display: flex; flex-direction: column; gap: 0.75rem;"></div>
            <div class="controls-panel" id="merge-controls" style="display: none; justify-content: space-between;">
                <div style="font-size: 0.9rem; color: var(--text-muted);" id="merge-stats"></div>
                <button class="btn-primary" id="btn-merge">📑 Merge into Single PDF</button>
            </div>
            <div id="merge-status" style="margin-top: 1rem; color: var(--accent); font-weight: 600;"></div>
        `;

        const dz = container.querySelector('#dz-merge');
        const list = container.querySelector('#merge-list');
        const controls = container.querySelector('#merge-controls');
        const stats = container.querySelector('#merge-stats');
        const statusBox = container.querySelector('#merge-status');

        Utils.createDropzone(dz, 'application/pdf', true, (files) => {
            pdfFiles = [...pdfFiles, ...files];
            renderList();
        });

        function renderList() {
            list.innerHTML = '';
            controls.style.display = pdfFiles.length >= 2 ? 'flex' : 'none';
            stats.textContent = `${pdfFiles.length} files selected for merging`;

            pdfFiles.forEach((f, idx) => {
                const item = document.createElement('div');
                item.style.cssText = 'background: var(--bg-surface); border: 1px solid var(--border-color); padding: 0.85rem 1.25rem; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: space-between;';
                item.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 0.85rem;">
                        <span style="font-size: 1.2rem;">📄</span>
                        <div>
                            <div style="font-weight: 600; font-size: 0.92rem;">${idx + 1}. ${f.name}</div>
                            <div style="font-size: 0.75rem; color: var(--text-dim);">${Utils.formatBytes(f.size)}</div>
                        </div>
                    </div>
                    <div style="display: flex; gap: 0.4rem;">
                        <button class="action-mini-btn" data-act="up">▲</button>
                        <button class="action-mini-btn" data-act="down">▼</button>
                        <button class="action-mini-btn btn-del" data-act="del">✕</button>
                    </div>
                `;

                item.querySelector('[data-act="up"]').onclick = () => {
                    if (idx > 0) {
                        const tmp = pdfFiles[idx - 1];
                        pdfFiles[idx - 1] = pdfFiles[idx];
                        pdfFiles[idx] = tmp;
                        renderList();
                    }
                };

                item.querySelector('[data-act="down"]').onclick = () => {
                    if (idx < pdfFiles.length - 1) {
                        const tmp = pdfFiles[idx + 1];
                        pdfFiles[idx + 1] = pdfFiles[idx];
                        pdfFiles[idx] = tmp;
                        renderList();
                    }
                };

                item.querySelector('[data-act="del"]').onclick = () => {
                    pdfFiles.splice(idx, 1);
                    renderList();
                };

                list.appendChild(item);
            });
        }

        container.querySelector('#btn-merge').onclick = async () => {
            if (pdfFiles.length < 2) return;
            statusBox.textContent = 'Merging documents in browser memory...';
            try {
                const { PDFDocument } = window.PDFLib;
                const mergedPdf = await PDFDocument.create();

                for (const file of pdfFiles) {
                    const buf = await Utils.readFileAsArrayBuffer(file);
                    const doc = await PDFDocument.load(buf);
                    const pages = await mergedPdf.copyPages(doc, doc.getPageIndices());
                    pages.forEach(p => mergedPdf.addPage(p));
                }

                const pdfBytes = await mergedPdf.save();
                const blob = new Blob([pdfBytes], { type: 'application/pdf' });
                Utils.downloadBlob(blob, `merged_document_${Date.now()}.pdf`);
                statusBox.textContent = '✓ Successfully merged and downloaded!';
            } catch (err) {
                statusBox.textContent = 'Merge failed: ' + err.message;
            }
        };
    },

    // 3. PDF Page Arranger & Reorder
    'pdf-arrange': (container) => {
        let currentDoc = null;
        let pagesData = []; // { index, rotation, canvas, deleted }

        container.innerHTML = `
            <div id="dz-arrange"></div>
            <div id="arrange-workspace" style="display: none; margin-top: 1.5rem;">
                <div class="controls-panel" style="justify-content: space-between; align-items: center;">
                    <div style="font-weight: 600;" id="page-stats">Pages</div>
                    <div style="display: flex; gap: 0.75rem;">
                        <button class="btn-secondary" id="btn-rotate-all">🔄 Rotate All 90°</button>
                        <button class="btn-primary" id="btn-export-arrange">💾 Export Arranged PDF</button>
                    </div>
                </div>
                <div id="pages-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 1.25rem; margin-top: 1.5rem;"></div>
            </div>
            <div id="arrange-status" style="margin-top: 1rem; color: var(--accent); font-weight: 600;"></div>
        `;

        const dz = container.querySelector('#dz-arrange');
        const ws = container.querySelector('#arrange-workspace');
        const grid = container.querySelector('#pages-grid');
        const stats = container.querySelector('#page-stats');
        const statusBox = container.querySelector('#arrange-status');

        Utils.createDropzone(dz, 'application/pdf', false, async (files) => {
            if (!files.length) return;
            const file = files[0];
            statusBox.textContent = 'Rendering PDF page previews...';
            try {
                const arrayBuffer = await Utils.readFileAsArrayBuffer(file);
                const pdfjs = window.pdfjsLib;
                const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
                const pdf = await loadingTask.promise;
                currentDoc = arrayBuffer;
                pagesData = [];

                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const viewport = page.getViewport({ scale: 0.3 });
                    const canvas = document.createElement('canvas');
                    canvas.width = viewport.width;
                    canvas.height = viewport.height;
                    const ctx = canvas.getContext('2d');
                    await page.render({ canvasContext: ctx, viewport }).promise;

                    pagesData.push({
                        origIndex: i - 1,
                        pageNum: i,
                        rotation: 0,
                        canvas: canvas,
                        deleted: false
                    });
                }

                dz.style.display = 'none';
                ws.style.display = 'block';
                statusBox.textContent = '';
                renderGrid();
            } catch (err) {
                statusBox.textContent = 'Failed to load PDF: ' + err.message;
            }
        });

        function renderGrid() {
            grid.innerHTML = '';
            const activePages = pagesData.filter(p => !p.deleted);
            stats.textContent = `${activePages.length} active pages`;

            activePages.forEach((item, displayIdx) => {
                const card = document.createElement('div');
                card.className = 'file-preview-card';
                card.style.position = 'relative';

                const img = document.createElement('img');
                img.src = item.canvas.toDataURL();
                img.style.cssText = `width: 100%; height: 140px; object-fit: contain; background: #fff; border-radius: 4px; transform: rotate(${item.rotation}deg); transition: transform 0.2s;`;

                card.innerHTML = `
                    <div style="font-weight: 700; font-size: 0.85rem; margin-bottom: 0.35rem;">Page ${item.pageNum}</div>
                `;
                card.appendChild(img);

                const actions = document.createElement('div');
                actions.className = 'file-actions';
                actions.innerHTML = `
                    <button class="action-mini-btn" title="Move Left" data-act="left">◀</button>
                    <button class="action-mini-btn" title="Rotate 90°" data-act="rot">🔄</button>
                    <button class="action-mini-btn" title="Move Right" data-act="right">▶</button>
                    <button class="action-mini-btn btn-del" title="Delete Page" data-act="del">✕</button>
                `;

                actions.querySelector('[data-act="left"]').onclick = () => {
                    const curIndex = pagesData.indexOf(item);
                    if (curIndex > 0) {
                        const tmp = pagesData[curIndex - 1];
                        pagesData[curIndex - 1] = pagesData[curIndex];
                        pagesData[curIndex] = tmp;
                        renderGrid();
                    }
                };

                actions.querySelector('[data-act="right"]').onclick = () => {
                    const curIndex = pagesData.indexOf(item);
                    if (curIndex < pagesData.length - 1) {
                        const tmp = pagesData[curIndex + 1];
                        pagesData[curIndex + 1] = pagesData[curIndex];
                        pagesData[curIndex] = tmp;
                        renderGrid();
                    }
                };

                actions.querySelector('[data-act="rot"]').onclick = () => {
                    item.rotation = (item.rotation + 90) % 360;
                    img.style.transform = `rotate(${item.rotation}deg)`;
                };

                actions.querySelector('[data-act="del"]').onclick = () => {
                    item.deleted = true;
                    renderGrid();
                };

                card.appendChild(actions);
                grid.appendChild(card);
            });
        }

        container.querySelector('#btn-rotate-all').onclick = () => {
            pagesData.forEach(p => {
                if (!p.deleted) p.rotation = (p.rotation + 90) % 360;
            });
            renderGrid();
        };

        container.querySelector('#btn-export-arrange').onclick = async () => {
            const activePages = pagesData.filter(p => !p.deleted);
            if (!activePages.length) return;

            statusBox.textContent = 'Rebuilding PDF document...';
            try {
                const { PDFDocument, degrees } = window.PDFLib;
                const sourcePdf = await PDFDocument.load(currentDoc);
                const newPdf = await PDFDocument.create();

                for (const item of activePages) {
                    const [copiedPage] = await newPdf.copyPages(sourcePdf, [item.origIndex]);
                    const currentRot = copiedPage.getRotation().angle;
                    copiedPage.setRotation(degrees((currentRot + item.rotation) % 360));
                    newPdf.addPage(copiedPage);
                }

                const pdfBytes = await newPdf.save();
                const blob = new Blob([pdfBytes], { type: 'application/pdf' });
                Utils.downloadBlob(blob, `rearranged_pdf_${Date.now()}.pdf`);
                statusBox.textContent = '✓ Exported successfully!';
            } catch (err) {
                statusBox.textContent = 'Export error: ' + err.message;
            }
        };
    },

    // 4. PDF Splitter & Page Extractor
    'pdf-split': (container) => {
        let pdfBytes = null;
        let totalPages = 0;

        container.innerHTML = `
            <div id="dz-split"></div>
            <div id="split-ws" style="display: none; margin-top: 1.5rem;">
                <div class="controls-panel">
                    <div class="control-group">
                        <label>Total Pages Found</label>
                        <div style="font-size: 1.1rem; font-weight: 700; color: var(--accent);" id="split-pages-count">0</div>
                    </div>
                    <div class="control-group" style="flex: 1;">
                        <label>Enter Page Range(s) to Extract</label>
                        <input type="text" id="split-ranges" placeholder="e.g. 1-3, 5, 7-10">
                    </div>
                    <div class="control-group" style="align-self: flex-end;">
                        <button class="btn-primary" id="btn-split-download">✂️ Extract Pages & Download</button>
                    </div>
                </div>
            </div>
            <div id="split-status" style="margin-top: 1rem; color: var(--accent); font-weight: 600;"></div>
        `;

        const dz = container.querySelector('#dz-split');
        const ws = container.querySelector('#split-ws');
        const pagesCountEl = container.querySelector('#split-pages-count');
        const statusBox = container.querySelector('#split-status');

        Utils.createDropzone(dz, 'application/pdf', false, async (files) => {
            if (!files.length) return;
            try {
                pdfBytes = await Utils.readFileAsArrayBuffer(files[0]);
                const { PDFDocument } = window.PDFLib;
                const doc = await PDFDocument.load(pdfBytes);
                totalPages = doc.getPageCount();
                pagesCountEl.textContent = `${totalPages} Pages`;
                container.querySelector('#split-ranges').value = `1-${Math.min(totalPages, 3)}`;
                dz.style.display = 'none';
                ws.style.display = 'block';
            } catch (e) {
                statusBox.textContent = 'Error loading PDF: ' + e.message;
            }
        });

        container.querySelector('#btn-split-download').onclick = async () => {
            const rangeStr = container.querySelector('#split-ranges').value.trim();
            if (!rangeStr || !pdfBytes) return;

            statusBox.textContent = 'Extracting pages...';
            try {
                const pagesToExtract = new Set();
                const parts = rangeStr.split(',');

                for (const part of parts) {
                    const trimmed = part.trim();
                    if (trimmed.includes('-')) {
                        const [start, end] = trimmed.split('-').map(Number);
                        if (!isNaN(start) && !isNaN(end)) {
                            for (let i = Math.max(1, start); i <= Math.min(totalPages, end); i++) {
                                pagesToExtract.add(i - 1);
                            }
                        }
                    } else {
                        const num = Number(trimmed);
                        if (!isNaN(num) && num >= 1 && num <= totalPages) {
                            pagesToExtract.add(num - 1);
                        }
                    }
                }

                if (!pagesToExtract.size) {
                    statusBox.textContent = 'No valid pages found in range.';
                    return;
                }

                const { PDFDocument } = window.PDFLib;
                const source = await PDFDocument.load(pdfBytes);
                const target = await PDFDocument.create();

                const copiedPages = await target.copyPages(source, Array.from(pagesToExtract));
                copiedPages.forEach(p => target.addPage(p));

                const outBytes = await target.save();
                Utils.downloadBlob(new Blob([outBytes], { type: 'application/pdf' }), `extracted_pages_${Date.now()}.pdf`);
                statusBox.textContent = `✓ Extracted ${pagesToExtract.size} page(s) successfully!`;
            } catch (err) {
                statusBox.textContent = 'Split error: ' + err.message;
            }
        };
    },

    // 5. PDF to Images
    'pdf-to-images': (container) => {
        container.innerHTML = `
            <div id="dz-pdf2img"></div>
            <div id="p2i-workspace" style="display: none; margin-top: 1.5rem;">
                <div class="controls-panel" style="justify-content: space-between;">
                    <div style="font-weight: 600;" id="p2i-stats">Pages Ready</div>
                    <div class="control-group">
                        <label>Format</label>
                        <select id="p2i-fmt">
                            <option value="png">PNG (High Quality)</option>
                            <option value="jpeg">JPG (Compact)</option>
                        </select>
                    </div>
                </div>
                <div id="p2i-grid" class="files-preview-list" style="margin-top: 1.5rem;"></div>
            </div>
            <div id="p2i-status" style="margin-top: 1rem; color: var(--accent); font-weight: 600;"></div>
        `;

        const dz = container.querySelector('#dz-pdf2img');
        const ws = container.querySelector('#p2i-workspace');
        const grid = container.querySelector('#p2i-grid');
        const statusBox = container.querySelector('#p2i-status');

        Utils.createDropzone(dz, 'application/pdf', false, async (files) => {
            if (!files.length) return;
            statusBox.textContent = 'Rendering PDF pages to images...';
            try {
                const arrayBuffer = await Utils.readFileAsArrayBuffer(files[0]);
                const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                grid.innerHTML = '';
                dz.style.display = 'none';
                ws.style.display = 'block';
                statusBox.textContent = '';

                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const viewport = page.getViewport({ scale: 1.5 });
                    const canvas = document.createElement('canvas');
                    canvas.width = viewport.width;
                    canvas.height = viewport.height;
                    const ctx = canvas.getContext('2d');
                    await page.render({ canvasContext: ctx, viewport }).promise;

                    const card = document.createElement('div');
                    card.className = 'file-preview-card';
                    card.innerHTML = `
                        <img class="file-thumbnail" src="${canvas.toDataURL('image/jpeg', 0.85)}" alt="Page ${i}">
                        <div class="file-card-name">Page ${i}</div>
                        <button class="btn-secondary" style="margin-top: 0.5rem; font-size: 0.78rem; padding: 0.35rem 0.8rem;">Download</button>
                    `;

                    card.querySelector('button').onclick = () => {
                        const fmt = container.querySelector('#p2i-fmt').value;
                        canvas.toBlob((b) => {
                            Utils.downloadBlob(b, `page_${i}.${fmt === 'jpeg' ? 'jpg' : 'png'}`);
                        }, `image/${fmt}`, 0.95);
                    };

                    grid.appendChild(card);
                }
            } catch (err) {
                statusBox.textContent = 'Error rendering pages: ' + err.message;
            }
        });
    },

    // 6. Image Format Converter
    'image-converter': (container) => {
        let loadedImg = null;
        let originalName = 'converted';

        container.innerHTML = `
            <div id="dz-conv"></div>
            <div id="conv-ws" style="display: none; margin-top: 1.5rem;">
                <div style="display: flex; gap: 2rem; flex-wrap: wrap;">
                    <div style="flex: 1; min-width: 280px; text-align: center;">
                        <img id="conv-preview" style="max-width: 100%; max-height: 320px; border-radius: var(--radius-md); border: 1px solid var(--border-color);" alt="Preview">
                    </div>
                    <div style="flex: 1; min-width: 280px;">
                        <div class="controls-panel" style="flex-direction: column; align-items: stretch; margin: 0;">
                            <div class="control-group">
                                <label>Target Format</label>
                                <select id="conv-target-format">
                                    <option value="png">PNG (.png) - Transparency</option>
                                    <option value="jpeg" selected>JPG / JPEG (.jpg) - Universal</option>
                                    <option value="webp">WebP (.webp) - Modern Web</option>
                                </select>
                            </div>
                            <div class="control-group" id="conv-quality-group">
                                <label>Quality</label>
                                <div class="slider-wrap">
                                    <input type="range" id="conv-quality" min="10" max="100" value="92">
                                    <span class="slider-val" id="conv-quality-val">92%</span>
                                </div>
                            </div>
                            <button class="btn-primary" id="btn-convert-download" style="margin-top: 1.5rem;">🔄 Convert & Download</button>
                        </div>
                    </div>
                </div>
            </div>
            <div id="conv-status" style="margin-top: 1rem; color: var(--accent); font-weight: 600;"></div>
        `;

        const dz = container.querySelector('#dz-conv');
        const ws = container.querySelector('#conv-ws');
        const preview = container.querySelector('#conv-preview');
        const qSlider = container.querySelector('#conv-quality');
        const qVal = container.querySelector('#conv-quality-val');
        const statusBox = container.querySelector('#conv-status');

        qSlider.oninput = () => qVal.textContent = qSlider.value + '%';

        Utils.createDropzone(dz, 'image/*', false, async (files) => {
            if (!files.length) return;
            const file = files[0];
            originalName = file.name.replace(/\.[^/.]+$/, '');
            const dataUrl = await Utils.readFileAsDataURL(file);
            loadedImg = new Image();
            loadedImg.onload = () => {
                preview.src = dataUrl;
                dz.style.display = 'none';
                ws.style.display = 'block';
            };
            loadedImg.src = dataUrl;
        });

        container.querySelector('#btn-convert-download').onclick = () => {
            if (!loadedImg) return;
            const format = container.querySelector('#conv-target-format').value;
            const quality = parseInt(qSlider.value, 10) / 100;

            const canvas = document.createElement('canvas');
            canvas.width = loadedImg.naturalWidth;
            canvas.height = loadedImg.naturalHeight;
            const ctx = canvas.getContext('2d');

            if (format === 'jpeg') {
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
            ctx.drawImage(loadedImg, 0, 0);

            canvas.toBlob((blob) => {
                const ext = format === 'jpeg' ? 'jpg' : format;
                Utils.downloadBlob(blob, `${originalName}.${ext}`);
                statusBox.textContent = `✓ Successfully converted to ${ext.toUpperCase()} (${Utils.formatBytes(blob.size)})`;
            }, `image/${format}`, quality);
        };
    },

    // 7. Photo Resizer
    'image-resize': (container) => {
        let loadedImg = null;
        let origWidth = 0;
        let origHeight = 0;
        let origName = 'resized';

        container.innerHTML = `
            <div id="dz-resize"></div>
            <div id="resize-ws" style="display: none; margin-top: 1.5rem;">
                <div style="display: flex; gap: 2rem; flex-wrap: wrap;">
                    <div style="flex: 1; min-width: 280px; text-align: center;">
                        <img id="resize-preview" style="max-width: 100%; max-height: 300px; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
                        <div style="font-size: 0.8rem; color: var(--text-dim); margin-top: 0.5rem;" id="orig-dim-text"></div>
                    </div>
                    <div style="flex: 1; min-width: 280px;">
                        <div class="controls-panel" style="flex-direction: column; align-items: stretch; margin: 0;">
                            <div style="display: flex; gap: 1rem;">
                                <div class="control-group" style="flex: 1;">
                                    <label>Width (px)</label>
                                    <input type="number" id="resize-w">
                                </div>
                                <div class="control-group" style="flex: 1;">
                                    <label>Height (px)</label>
                                    <input type="number" id="resize-h">
                                </div>
                            </div>
                            <div style="display: flex; align-items: center; gap: 0.5rem; margin: 0.75rem 0;">
                                <input type="checkbox" id="lock-ratio" checked>
                                <label for="lock-ratio" style="font-size: 0.85rem; cursor: pointer;">Lock Aspect Ratio</label>
                            </div>
                            <div style="margin: 0.5rem 0;">
                                <label style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Scale Presets</label>
                                <div style="display: flex; gap: 0.5rem; margin-top: 0.35rem;">
                                    <button class="sort-btn" data-pct="25">25%</button>
                                    <button class="sort-btn" data-pct="50">50%</button>
                                    <button class="sort-btn" data-pct="75">75%</button>
                                    <button class="sort-btn" data-pct="100">100%</button>
                                </div>
                            </div>
                            <button class="btn-primary" id="btn-do-resize" style="margin-top: 1.5rem;">📐 Resize & Download</button>
                        </div>
                    </div>
                </div>
            </div>
            <div id="resize-status" style="margin-top: 1rem; color: var(--accent); font-weight: 600;"></div>
        `;

        const dz = container.querySelector('#dz-resize');
        const ws = container.querySelector('#resize-ws');
        const preview = container.querySelector('#resize-preview');
        const inputW = container.querySelector('#resize-w');
        const inputH = container.querySelector('#resize-h');
        const lockRatio = container.querySelector('#lock-ratio');
        const dimText = container.querySelector('#orig-dim-text');
        const statusBox = container.querySelector('#resize-status');

        inputW.oninput = () => {
            if (lockRatio.checked && origWidth) {
                inputH.value = Math.round((inputW.value / origWidth) * origHeight);
            }
        };

        inputH.oninput = () => {
            if (lockRatio.checked && origHeight) {
                inputW.value = Math.round((inputH.value / origHeight) * origWidth);
            }
        };

        container.querySelectorAll('[data-pct]').forEach(btn => {
            btn.onclick = () => {
                const pct = parseInt(btn.getAttribute('data-pct'), 10) / 100;
                inputW.value = Math.round(origWidth * pct);
                inputH.value = Math.round(origHeight * pct);
            };
        });

        Utils.createDropzone(dz, 'image/*', false, async (files) => {
            if (!files.length) return;
            const file = files[0];
            origName = file.name.replace(/\.[^/.]+$/, '');
            const dataUrl = await Utils.readFileAsDataURL(file);
            loadedImg = new Image();
            loadedImg.onload = () => {
                origWidth = loadedImg.naturalWidth;
                origHeight = loadedImg.naturalHeight;
                inputW.value = origWidth;
                inputH.value = origHeight;
                dimText.textContent = `Original: ${origWidth} × ${origHeight} px (${Utils.formatBytes(file.size)})`;
                preview.src = dataUrl;
                dz.style.display = 'none';
                ws.style.display = 'block';
            };
            loadedImg.src = dataUrl;
        });

        container.querySelector('#btn-do-resize').onclick = () => {
            if (!loadedImg) return;
            const w = parseInt(inputW.value, 10);
            const h = parseInt(inputH.value, 10);
            if (!w || !h) return;

            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(loadedImg, 0, 0, w, h);

            canvas.toBlob((b) => {
                Utils.downloadBlob(b, `${origName}_${w}x${h}.png`);
                statusBox.textContent = `✓ Resized to ${w} × ${h} px (${Utils.formatBytes(b.size)}) and downloaded!`;
            }, 'image/png');
        };
    },

    // 8. Photo Reducer & Compressor
    'image-compress': (container) => {
        let loadedImg = null;
        let originalFile = null;

        container.innerHTML = `
            <div id="dz-comp"></div>
            <div id="comp-ws" style="display: none; margin-top: 1.5rem;">
                <div style="display: flex; gap: 2rem; flex-wrap: wrap;">
                    <div style="flex: 1; min-width: 280px; text-align: center;">
                        <img id="comp-preview" style="max-width: 100%; max-height: 320px; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
                    </div>
                    <div style="flex: 1; min-width: 280px;">
                        <div class="controls-panel" style="flex-direction: column; align-items: stretch; margin: 0;">
                            <div class="control-group">
                                <label>Target Compression Level</label>
                                <div class="slider-wrap">
                                    <input type="range" id="comp-level" min="5" max="95" value="70">
                                    <span class="slider-val" id="comp-level-val">70%</span>
                                </div>
                            </div>
                            <div style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1rem; margin: 1.25rem 0;">
                                <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 0.5rem;">
                                    <span>Original Size:</span>
                                    <strong id="orig-size-val">0 KB</strong>
                                </div>
                                <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 0.5rem;">
                                    <span>Estimated Size:</span>
                                    <strong id="est-size-val" style="color: var(--accent);">Calculating...</strong>
                                </div>
                                <div style="display: flex; justify-content: space-between; font-size: 0.85rem;">
                                    <span>Savings:</span>
                                    <strong id="savings-val" style="color: var(--accent-cyan);">0%</strong>
                                </div>
                            </div>
                            <button class="btn-primary" id="btn-compress-download">🗜️ Compress & Download</button>
                        </div>
                    </div>
                </div>
            </div>
            <div id="comp-status" style="margin-top: 1rem; color: var(--accent); font-weight: 600;"></div>
        `;

        const dz = container.querySelector('#dz-comp');
        const ws = container.querySelector('#comp-ws');
        const preview = container.querySelector('#comp-preview');
        const levelSlider = container.querySelector('#comp-level');
        const levelVal = container.querySelector('#comp-level-val');
        const origSizeEl = container.querySelector('#orig-size-val');
        const estSizeEl = container.querySelector('#est-size-val');
        const savingsEl = container.querySelector('#savings-val');
        const statusBox = container.querySelector('#comp-status');

        function updateEstimate() {
            if (!loadedImg) return;
            const quality = parseInt(levelSlider.value, 10) / 100;
            levelVal.textContent = levelSlider.value + '%';

            const canvas = document.createElement('canvas');
            canvas.width = loadedImg.naturalWidth;
            canvas.height = loadedImg.naturalHeight;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(loadedImg, 0, 0);

            canvas.toBlob((blob) => {
                estSizeEl.textContent = Utils.formatBytes(blob.size);
                const diff = originalFile.size - blob.size;
                const pct = Math.max(0, Math.round((diff / originalFile.size) * 100));
                savingsEl.textContent = `${pct}% (${Utils.formatBytes(Math.max(0, diff))})`;
            }, 'image/jpeg', quality);
        }

        levelSlider.oninput = updateEstimate;

        Utils.createDropzone(dz, 'image/*', false, async (files) => {
            if (!files.length) return;
            originalFile = files[0];
            origSizeEl.textContent = Utils.formatBytes(originalFile.size);
            const dataUrl = await Utils.readFileAsDataURL(originalFile);
            loadedImg = new Image();
            loadedImg.onload = () => {
                preview.src = dataUrl;
                dz.style.display = 'none';
                ws.style.display = 'block';
                updateEstimate();
            };
            loadedImg.src = dataUrl;
        });

        container.querySelector('#btn-compress-download').onclick = () => {
            if (!loadedImg) return;
            const quality = parseInt(levelSlider.value, 10) / 100;
            const canvas = document.createElement('canvas');
            canvas.width = loadedImg.naturalWidth;
            canvas.height = loadedImg.naturalHeight;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(loadedImg, 0, 0);

            canvas.toBlob((b) => {
                const name = originalFile.name.replace(/\.[^/.]+$/, '');
                Utils.downloadBlob(b, `${name}_compressed.jpg`);
                statusBox.textContent = `✓ Compressed and saved (${Utils.formatBytes(b.size)})`;
            }, 'image/jpeg', quality);
        };
    },

    // 9. Profit Margin & Markup Calculator
    'profit-calculator': (container) => {
        container.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 2rem;">
                <div class="controls-panel" style="flex-direction: column; align-items: stretch; margin: 0;">
                    <h3 style="font-size: 1.1rem; margin-bottom: 0.5rem;">Input Values</h3>
                    <div class="control-group">
                        <label>Cost Price ($)</label>
                        <input type="number" id="calc-cost" value="50" step="0.01">
                    </div>
                    <div class="control-group">
                        <label>Selling Price ($)</label>
                        <input type="number" id="calc-sell" value="100" step="0.01">
                    </div>
                    <div class="control-group">
                        <label>Sales Tax / VAT (%)</label>
                        <input type="number" id="calc-tax" value="15" step="0.1">
                    </div>
                    <div class="control-group">
                        <label>Discount (%)</label>
                        <input type="number" id="calc-disc" value="0" step="0.1">
                    </div>
                </div>

                <div>
                    <div style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 1.5rem;">
                        <h3 style="font-size: 1.1rem; margin-bottom: 1.25rem;">Financial Breakdown</h3>
                        
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; margin-bottom: 1.5rem;">
                            <div style="background: var(--bg-input); padding: 1rem; border-radius: var(--radius-md);">
                                <div style="font-size: 0.78rem; color: var(--text-muted); text-transform: uppercase;">Gross Profit</div>
                                <div style="font-size: 1.5rem; font-weight: 800; color: var(--accent);" id="res-profit">$50.00</div>
                            </div>
                            <div style="background: var(--bg-input); padding: 1rem; border-radius: var(--radius-md);">
                                <div style="font-size: 0.78rem; color: var(--text-muted); text-transform: uppercase;">Gross Margin</div>
                                <div style="font-size: 1.5rem; font-weight: 800; color: var(--accent-cyan);" id="res-margin">50.0%</div>
                            </div>
                            <div style="background: var(--bg-input); padding: 1rem; border-radius: var(--radius-md);">
                                <div style="font-size: 0.78rem; color: var(--text-muted); text-transform: uppercase;">Markup</div>
                                <div style="font-size: 1.5rem; font-weight: 800; color: var(--accent-amber);" id="res-markup">100.0%</div>
                            </div>
                            <div style="background: var(--bg-input); padding: 1rem; border-radius: var(--radius-md);">
                                <div style="font-size: 0.78rem; color: var(--text-muted); text-transform: uppercase;">Net Revenue (After Tax)</div>
                                <div style="font-size: 1.5rem; font-weight: 800; color: var(--text-main);" id="res-net">$86.96</div>
                            </div>
                        </div>

                        <!-- Visual Breakdown Bar -->
                        <div style="margin-top: 1rem;">
                            <div style="font-size: 0.78rem; color: var(--text-muted); margin-bottom: 0.4rem;">Revenue Proportion</div>
                            <div style="height: 14px; border-radius: 99px; overflow: hidden; display: flex; background: #1e293b;">
                                <div id="bar-cost" style="background: var(--accent-red); width: 50%;" title="Cost"></div>
                                <div id="bar-profit" style="background: var(--accent); width: 50%;" title="Profit"></div>
                            </div>
                            <div style="display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--text-dim); margin-top: 0.35rem;">
                                <span>🟥 Cost (<span id="pct-cost">50%</span>)</span>
                                <span>🟩 Profit (<span id="pct-profit">50%</span>)</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const costIn = container.querySelector('#calc-cost');
        const sellIn = container.querySelector('#calc-sell');
        const taxIn = container.querySelector('#calc-tax');
        const discIn = container.querySelector('#calc-disc');

        const profitOut = container.querySelector('#res-profit');
        const marginOut = container.querySelector('#res-margin');
        const markupOut = container.querySelector('#res-markup');
        const netOut = container.querySelector('#res-net');
        const barCost = container.querySelector('#bar-cost');
        const barProfit = container.querySelector('#bar-profit');
        const pctCost = container.querySelector('#pct-cost');
        const pctProfit = container.querySelector('#pct-profit');

        function recalculate() {
            const cost = parseFloat(costIn.value) || 0;
            let sell = parseFloat(sellIn.value) || 0;
            const tax = parseFloat(taxIn.value) || 0;
            const disc = parseFloat(discIn.value) || 0;

            if (disc > 0) {
                sell = sell * (1 - disc / 100);
            }

            const grossProfit = sell - cost;
            const margin = sell > 0 ? (grossProfit / sell) * 100 : 0;
            const markup = cost > 0 ? (grossProfit / cost) * 100 : 0;
            const netRev = sell / (1 + tax / 100);

            profitOut.textContent = `$${grossProfit.toFixed(2)}`;
            marginOut.textContent = `${margin.toFixed(1)}%`;
            markupOut.textContent = `${markup.toFixed(1)}%`;
            netOut.textContent = `$${netRev.toFixed(2)}`;

            const costPct = sell > 0 ? Math.min(100, Math.max(0, (cost / sell) * 100)) : 100;
            const profitPct = 100 - costPct;

            barCost.style.width = costPct + '%';
            barProfit.style.width = profitPct + '%';
            pctCost.textContent = costPct.toFixed(0) + '%';
            pctProfit.textContent = profitPct.toFixed(0) + '%';
        }

        [costIn, sellIn, taxIn, discIn].forEach(input => input.addEventListener('input', recalculate));
        recalculate();
    },

    // 10. QR Code Studio & Generator
    'qr-generator': (container) => {
        container.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 2rem;">
                <div class="controls-panel" style="flex-direction: column; align-items: stretch; margin: 0;">
                    <div class="control-group">
                        <label>Content Type</label>
                        <select id="qr-type">
                            <option value="url">Website URL</option>
                            <option value="text">Plain Text</option>
                            <option value="wifi">WiFi Network</option>
                            <option value="wa">WhatsApp Message</option>
                        </select>
                    </div>

                    <div id="qr-input-url" class="control-group">
                        <label>Target URL</label>
                        <input type="text" id="qr-url-val" value="https://www.shajjadkhan.com">
                    </div>

                    <div id="qr-input-wifi" class="control-group" style="display: none;">
                        <label>WiFi SSID (Network Name)</label>
                        <input type="text" id="qr-wifi-ssid" placeholder="MyHomeWiFi">
                        <label style="margin-top: 0.5rem;">Password</label>
                        <input type="text" id="qr-wifi-pass" placeholder="SecretPass123">
                    </div>

                    <div style="display: flex; gap: 1rem; margin-top: 0.5rem;">
                        <div class="control-group" style="flex: 1;">
                            <label>QR Foreground</label>
                            <input type="color" id="qr-fg" value="#000000" style="width: 100%; height: 38px; padding: 2px; cursor: pointer;">
                        </div>
                        <div class="control-group" style="flex: 1;">
                            <label>QR Background</label>
                            <input type="color" id="qr-bg" value="#ffffff" style="width: 100%; height: 38px; padding: 2px; cursor: pointer;">
                        </div>
                    </div>

                    <div class="control-group" style="margin-top: 0.5rem;">
                        <label>Size</label>
                        <select id="qr-size">
                            <option value="256">Standard (256 × 256)</option>
                            <option value="400" selected>High-Res (400 × 400)</option>
                            <option value="600">Print Quality (600 × 600)</option>
                        </select>
                    </div>
                </div>

                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 2rem; min-width: 0;">
                    <div id="qrcode-box" class="qr-preview-box">
                        <canvas id="qrcode-canvas" aria-label="Generated QR code"></canvas>
                    </div>
                    <p id="qr-status" style="color: var(--text-muted); font-size: 0.82rem; margin-top: 0.85rem; text-align: center;"></p>
                    <button class="btn-primary" id="btn-download-qr" style="margin-top: 1.5rem;">📱 Download QR Code</button>
                </div>
            </div>
        `;

        const qrBox = container.querySelector('#qrcode-box');
        const qrCanvas = container.querySelector('#qrcode-canvas');
        const qrStatus = container.querySelector('#qr-status');
        const typeSelect = container.querySelector('#qr-type');
        const urlInput = container.querySelector('#qr-url-val');
        const wifiGroup = container.querySelector('#qr-input-wifi');
        const urlGroup = container.querySelector('#qr-input-url');
        const fgColor = container.querySelector('#qr-fg');
        const bgColor = container.querySelector('#qr-bg');
        const sizeSelect = container.querySelector('#qr-size');
        const downloadBtn = container.querySelector('#btn-download-qr');

        const setQrStatus = (message, isError = false) => {
            qrStatus.textContent = message;
            qrStatus.style.color = isError ? '#f87171' : 'var(--text-muted)';
            downloadBtn.disabled = isError;
            downloadBtn.style.opacity = isError ? '0.65' : '';
            downloadBtn.style.cursor = isError ? 'not-allowed' : '';
        };

        const escapeWifiValue = (value) => value.replace(/([\\;,":])/g, '\\$1');

        const waitForQrLibrary = () => new Promise((resolve, reject) => {
            const started = Date.now();
            const check = () => {
                if (window.QRCode && typeof window.QRCode.toCanvas === 'function') {
                    resolve();
                    return;
                }
                if (Date.now() - started > 5000) {
                    reject(new Error('QR code library could not be loaded. Please refresh the page and try again.'));
                    return;
                }
                setTimeout(check, 120);
            };
            check();
        });

        function getPayload() {
            const type = typeSelect.value;
            if (type === 'url' || type === 'text') {
                return urlInput.value.trim() || 'https://www.shajjadkhan.com';
            } else if (type === 'wifi') {
                const ssid = container.querySelector('#qr-wifi-ssid').value.trim();
                const pass = container.querySelector('#qr-wifi-pass').value.trim();
                return `WIFI:S:${escapeWifiValue(ssid)};T:WPA;P:${escapeWifiValue(pass)};;`;
            } else if (type === 'wa') {
                return `https://wa.me/?text=${encodeURIComponent(urlInput.value.trim())}`;
            }
            return 'https://www.shajjadkhan.com';
        }

        async function updateQR() {
            const size = parseInt(sizeSelect.value, 10);
            const payload = getPayload();
            setQrStatus('Generating QR code...');
            try {
                await waitForQrLibrary();
                await window.QRCode.toCanvas(qrCanvas, payload, {
                    width: size,
                    margin: 2,
                    errorCorrectionLevel: 'H',
                    color: {
                        dark: fgColor.value,
                        light: bgColor.value
                    }
                });
                qrCanvas.style.width = '100%';
                qrCanvas.style.height = 'auto';
                qrCanvas.style.maxWidth = `${size}px`;
                qrBox.style.background = bgColor.value;
                setQrStatus(`${size} x ${size}px QR ready`);
            } catch (err) {
                console.error('QR generation failed:', err);
                setQrStatus(err.message || 'QR code generation failed.', true);
            }
        }

        typeSelect.onchange = () => {
            if (typeSelect.value === 'wifi') {
                wifiGroup.style.display = 'flex';
                urlGroup.style.display = 'none';
            } else {
                wifiGroup.style.display = 'none';
                urlGroup.style.display = 'flex';
            }
            updateQR();
        };

        [urlInput, fgColor, bgColor, sizeSelect].forEach(el => el.addEventListener('input', updateQR));
        container.querySelector('#qr-wifi-ssid').addEventListener('input', updateQR);
        container.querySelector('#qr-wifi-pass').addEventListener('input', updateQR);

        updateQR();

        downloadBtn.onclick = () => {
            if (downloadBtn.disabled) return;
            const a = document.createElement('a');
            a.href = qrCanvas.toDataURL('image/png');
            a.download = `qrcode_${Date.now()}.png`;
            a.click();
        };
    },

    // 11. XML Sitemap Auditor
    'sitemap-audit': (container) => {
        container.innerHTML = `
            <div class="controls-panel" style="flex-direction: column; align-items: stretch; margin-bottom: 2rem;">
                <div class="control-group">
                    <label>Sitemap URL</label>
                    <div style="display: flex; gap: 0.75rem;">
                        <input type="text" id="audit-url" placeholder="https://example.com/sitemap.xml" style="flex: 1;">
                        <button class="btn-primary" id="btn-run-audit">🔍 Audit Sitemap</button>
                    </div>
                </div>
                <div style="text-align: center; margin: 0.75rem 0; color: var(--text-dim); font-size: 0.8rem;">— OR PASTE RAW XML CONTENT —</div>
                <textarea id="audit-xml-raw" placeholder="<urlset xmlns='...'>..." style="background: var(--bg-input); border: 1px solid var(--border-color); color: var(--text-main); font-family: var(--font-mono); font-size: 0.8rem; padding: 0.75rem; border-radius: var(--radius-sm); height: 90px; resize: vertical;"></textarea>
            </div>

            <div id="audit-results" style="display: none;">
                <!-- Score & Highlights -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem;">
                    <div style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1.25rem; text-align: center;">
                        <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Health Score</div>
                        <div id="res-score" style="font-size: 2.4rem; font-weight: 800; color: var(--accent);">95/100</div>
                    </div>
                    <div style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1.25rem; text-align: center;">
                        <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Total URLs</div>
                        <div id="res-total" style="font-size: 2rem; font-weight: 700;">0</div>
                    </div>
                    <div style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1.25rem; text-align: center;">
                        <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Duplicates</div>
                        <div id="res-dups" style="font-size: 2rem; font-weight: 700; color: var(--accent-red);">0</div>
                    </div>
                    <div style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1.25rem; text-align: center;">
                        <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Insecure (HTTP)</div>
                        <div id="res-insecure" style="font-size: 2rem; font-weight: 700; color: var(--accent-amber);">0</div>
                    </div>
                </div>

                <!-- Warnings List -->
                <div id="audit-warnings" style="margin-bottom: 2rem;"></div>

                <!-- URL Preview Table -->
                <div style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-lg); overflow: hidden;">
                    <div style="padding: 1rem 1.5rem; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
                        <h4 style="font-size: 1rem;">Extracted Sitemap URLs</h4>
                        <button class="sort-btn" id="btn-export-urls-csv">Export CSV</button>
                    </div>
                    <div style="max-height: 400px; overflow-y: auto;">
                        <table style="width: 100%; border-collapse: collapse; font-size: 0.82rem; text-align: left;" id="audit-table">
                            <thead>
                                <tr style="background: #020617; color: var(--text-dim); border-bottom: 1px solid var(--border-color);">
                                    <th style="padding: 0.75rem 1rem;">#</th>
                                    <th style="padding: 0.75rem 1rem;">URL (<loc>)</th>
                                    <th style="padding: 0.75rem 1rem;">Depth</th>
                                    <th style="padding: 0.75rem 1rem;">Priority</th>
                                    <th style="padding: 0.75rem 1rem;">Changefreq</th>
                                </tr>
                            </thead>
                            <tbody id="audit-table-body"></tbody>
                        </table>
                    </div>
                </div>
            </div>
            <div id="audit-status" style="margin-top: 1rem; color: var(--accent); font-weight: 600;"></div>
        `;

        const urlIn = container.querySelector('#audit-url');
        const rawIn = container.querySelector('#audit-xml-raw');
        const runBtn = container.querySelector('#btn-run-audit');
        const resBox = container.querySelector('#audit-results');
        const statusBox = container.querySelector('#audit-status');
        let currentAuditUrls = [];

        runBtn.onclick = async () => {
            const url = urlIn.value.trim();
            const xml = rawIn.value.trim();
            if (!url && !xml) {
                statusBox.textContent = 'Please enter a URL or paste raw XML.';
                return;
            }

            statusBox.textContent = 'Connecting and auditing sitemap structure...';
            try {
                const res = await fetch('/api/sitemap-audit', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url, xml_content: xml })
                });
                const data = await res.json();

                if (data.status !== 'success') {
                    statusBox.textContent = 'Audit error: ' + (data.message || 'Failed to inspect sitemap');
                    return;
                }

                currentAuditUrls = data.urls || [];
                statusBox.textContent = '';
                resBox.style.display = 'block';

                container.querySelector('#res-score').textContent = `${data.score}/100`;
                container.querySelector('#res-total').textContent = data.summary.total_urls;
                container.querySelector('#res-dups').textContent = data.summary.duplicates;
                container.querySelector('#res-insecure').textContent = data.summary.insecure_http;

                const warningsDiv = container.querySelector('#audit-warnings');
                warningsDiv.innerHTML = '';
                if (data.warnings && data.warnings.length) {
                    warningsDiv.innerHTML = `
                        <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: var(--radius-md); padding: 1rem;">
                            <strong style="color: #f87171; display: block; margin-bottom: 0.5rem;">⚠️ Potential Issues Detected:</strong>
                            <ul style="padding-left: 1.25rem; color: #fca5a5; font-size: 0.85rem;">
                                ${data.warnings.map(w => `<li>${w}</li>`).join('')}
                            </ul>
                        </div>
                    `;
                }

                const tbody = container.querySelector('#audit-table-body');
                tbody.innerHTML = currentAuditUrls.map((u, i) => `
                    <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.04);">
                        <td style="padding: 0.6rem 1rem; color: var(--text-dim);">${i + 1}</td>
                        <td style="padding: 0.6rem 1rem; word-break: break-all;"><a href="${u.loc}" target="_blank" style="color: var(--accent); text-decoration: none;">${u.loc}</a></td>
                        <td style="padding: 0.6rem 1rem; color: var(--text-muted);">${u.depth}</td>
                        <td style="padding: 0.6rem 1rem; color: var(--text-muted);">${u.priority || '—'}</td>
                        <td style="padding: 0.6rem 1rem; color: var(--text-muted);">${u.changefreq || '—'}</td>
                    </tr>
                `).join('');

            } catch (err) {
                statusBox.textContent = 'Network or server error: ' + err.message;
            }
        };

        container.querySelector('#btn-export-urls-csv').onclick = () => {
            if (!currentAuditUrls.length) return;
            const csv = ['URL,Depth,Priority,Changefreq', ...currentAuditUrls.map(u => `"${u.loc}",${u.depth},"${u.priority || ''}","${u.changefreq || ''}"`)].join('\n');
            Utils.downloadBlob(new Blob([csv], { type: 'text/csv' }), `sitemap_urls_${Date.now()}.csv`);
        };
    },

    // 12. JSON Formatter, Validator & Minifier
    'json-tools': (container) => {
        container.innerHTML = `
            <div class="controls-panel" style="justify-content: space-between; margin-bottom: 1rem;">
                <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                    <button class="btn-primary" id="btn-json-fmt-2">Beautify (2 Spaces)</button>
                    <button class="btn-secondary" id="btn-json-fmt-4">Beautify (4 Spaces)</button>
                    <button class="btn-secondary" id="btn-json-min">Minify</button>
                    <button class="btn-secondary" id="btn-json-val">Validate</button>
                </div>
                <div style="display: flex; gap: 0.5rem;">
                    <button class="btn-secondary" id="btn-json-copy">Copy</button>
                    <button class="btn-secondary" id="btn-json-clear">Clear</button>
                </div>
            </div>
            <textarea id="json-input" class="code-area" style="min-height: 420px; border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1rem; background: var(--bg-surface);" placeholder="Paste JSON here...">{
  "name": "FastTrack Tools",
  "author": "Shajjad Khan",
  "status": "production",
  "tools": 32
}</textarea>
            <div id="json-status" style="margin-top: 0.75rem; font-size: 0.88rem; font-weight: 600;"></div>
        `;

        const area = container.querySelector('#json-input');
        const statusBox = container.querySelector('#json-status');

        function parse(spaces) {
            try {
                const parsed = JSON.parse(area.value);
                area.value = JSON.stringify(parsed, null, spaces);
                statusBox.textContent = '✓ Valid JSON formatted successfully';
                statusBox.style.color = 'var(--accent)';
            } catch (err) {
                statusBox.textContent = '✗ JSON Parse Error: ' + err.message;
                statusBox.style.color = 'var(--accent-red)';
            }
        }

        container.querySelector('#btn-json-fmt-2').onclick = () => parse(2);
        container.querySelector('#btn-json-fmt-4').onclick = () => parse(4);
        container.querySelector('#btn-json-min').onclick = () => parse(0);

        container.querySelector('#btn-json-val').onclick = () => {
            try {
                JSON.parse(area.value);
                statusBox.textContent = '✓ Valid JSON structure!';
                statusBox.style.color = 'var(--accent)';
            } catch (err) {
                statusBox.textContent = '✗ Invalid JSON: ' + err.message;
                statusBox.style.color = 'var(--accent-red)';
            }
        };

        container.querySelector('#btn-json-copy').onclick = (e) => Utils.copyToClipboard(area.value, e.target);
        container.querySelector('#btn-json-clear').onclick = () => { area.value = ''; statusBox.textContent = ''; };
    },

    // 13. Secure Password & Passphrase Generator
    'password-generator': (container) => {
        container.innerHTML = `
            <div class="controls-panel" style="flex-direction: column; align-items: stretch;">
                <div style="display: flex; gap: 0.75rem; align-items: center; margin-bottom: 1.5rem;">
                    <input type="text" id="pwd-output" readonly style="flex: 1; font-family: var(--font-mono); font-size: 1.4rem; padding: 0.85rem 1.25rem; background: var(--bg-input); border: 2px solid var(--border-color); border-radius: var(--radius-md); color: var(--accent);">
                    <button class="btn-primary" id="btn-copy-pwd">Copy</button>
                    <button class="btn-secondary" id="btn-gen-pwd">🔄 Regenerate</button>
                </div>

                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1.25rem;">
                    <div class="control-group">
                        <label>Password Length (<span id="pwd-len-val">20</span> characters)</label>
                        <input type="range" id="pwd-len" min="8" max="64" value="20">
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 0.5rem; justify-content: center;">
                        <label><input type="checkbox" id="pwd-upper" checked> Uppercase (A-Z)</label>
                        <label><input type="checkbox" id="pwd-lower" checked> Lowercase (a-z)</label>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 0.5rem; justify-content: center;">
                        <label><input type="checkbox" id="pwd-num" checked> Numbers (0-9)</label>
                        <label><input type="checkbox" id="pwd-sym" checked> Symbols (!@#$%^&*)</label>
                    </div>
                </div>
            </div>
        `;

        const out = container.querySelector('#pwd-output');
        const len = container.querySelector('#pwd-len');
        const lenVal = container.querySelector('#pwd-len-val');
        const upper = container.querySelector('#pwd-upper');
        const lower = container.querySelector('#pwd-lower');
        const num = container.querySelector('#pwd-num');
        const sym = container.querySelector('#pwd-sym');

        function generate() {
            let chars = '';
            if (upper.checked) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
            if (lower.checked) chars += 'abcdefghijklmnopqrstuvwxyz';
            if (num.checked) chars += '0123456789';
            if (sym.checked) chars += '!@#$%^&*()_+~|}{[]:;?><,.-=';
            if (!chars) chars = 'abcdefghijklmnopqrstuvwxyz';

            const length = parseInt(len.value, 10);
            lenVal.textContent = length;

            const randomVals = new Uint32Array(length);
            window.crypto.getRandomValues(randomVals);

            let res = '';
            for (let i = 0; i < length; i++) {
                res += chars[randomVals[i] % chars.length];
            }
            out.value = res;
        }

        len.oninput = generate;
        [upper, lower, num, sym].forEach(c => c.onchange = generate);
        container.querySelector('#btn-gen-pwd').onclick = generate;
        container.querySelector('#btn-copy-pwd').onclick = (e) => Utils.copyToClipboard(out.value, e.target);

        generate();
    },

    // 14. Hash Generator (MD5, SHA-1, SHA-256, SHA-512)
    'hash-generator': (container) => {
        container.innerHTML = `
            <div class="controls-panel" style="flex-direction: column; align-items: stretch; margin-bottom: 1.5rem;">
                <label style="font-weight: 700; margin-bottom: 0.4rem;">Source Text</label>
                <textarea id="hash-input" class="code-area" style="height: 100px; padding: 0.75rem; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-sm);" placeholder="Enter text to hash...">Shajjad Khan</textarea>
            </div>

            <div style="display: flex; flex-direction: column; gap: 1rem;">
                ${['SHA-256', 'SHA-512', 'SHA-1'].map(alg => `
                    <div style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1rem 1.25rem;">
                        <div style="display: flex; justify-content: space-between; font-size: 0.78rem; font-weight: 700; color: var(--text-muted); margin-bottom: 0.35rem;">
                            <span>${alg}</span>
                            <button class="sort-btn" data-copy-hash="${alg}">Copy</button>
                        </div>
                        <div id="hash-out-${alg}" style="font-family: var(--font-mono); font-size: 0.88rem; color: var(--accent); word-break: break-all;">Computing...</div>
                    </div>
                `).join('')}
            </div>
        `;

        const input = container.querySelector('#hash-input');

        async function computeHashes() {
            const text = input.value;
            const enc = new TextEncoder();
            const data = enc.encode(text);

            for (const alg of ['SHA-256', 'SHA-512', 'SHA-1']) {
                try {
                    const buf = await crypto.subtle.digest(alg, data);
                    const hex = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
                    container.querySelector(`#hash-out-${alg}`).textContent = hex;
                } catch (e) {
                    container.querySelector(`#hash-out-${alg}`).textContent = 'Error computing hash';
                }
            }
        }

        input.addEventListener('input', computeHashes);
        container.querySelectorAll('[data-copy-hash]').forEach(btn => {
            btn.onclick = () => {
                const alg = btn.getAttribute('data-copy-hash');
                const text = container.querySelector(`#hash-out-${alg}`).textContent;
                Utils.copyToClipboard(text, btn);
            };
        });

        computeHashes();
    },

    // 15. Base64 Encoder & Decoder
    'base64-tools': (container) => {
        container.innerHTML = `
            <div class="controls-panel" style="justify-content: space-between; margin-bottom: 1rem;">
                <div style="display: flex; gap: 0.5rem;">
                    <button class="btn-primary" id="btn-b64-enc">Encode to Base64</button>
                    <button class="btn-secondary" id="btn-b64-dec">Decode from Base64</button>
                </div>
                <button class="btn-secondary" id="btn-b64-copy">Copy Result</button>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                <div>
                    <label style="font-size: 0.75rem; color: var(--text-muted); font-weight: 700;">INPUT</label>
                    <textarea id="b64-in" class="code-area" style="height: 280px; padding: 0.75rem; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-sm); margin-top: 0.35rem;" placeholder="Enter plain text or base64...">Hello World!</textarea>
                </div>
                <div>
                    <label style="font-size: 0.75rem; color: var(--text-muted); font-weight: 700;">OUTPUT</label>
                    <textarea id="b64-out" class="code-area" style="height: 280px; padding: 0.75rem; background: var(--bg-input); border: 1px solid var(--border-color); border-radius: var(--radius-sm); margin-top: 0.35rem; color: var(--accent);" readonly></textarea>
                </div>
            </div>
        `;

        const inText = container.querySelector('#b64-in');
        const outText = container.querySelector('#b64-out');

        container.querySelector('#btn-b64-enc').onclick = () => {
            try {
                outText.value = btoa(unescape(encodeURIComponent(inText.value)));
            } catch (e) {
                outText.value = 'Encode Error: ' + e.message;
            }
        };

        container.querySelector('#btn-b64-dec').onclick = () => {
            try {
                outText.value = decodeURIComponent(escape(atob(inText.value.trim())));
            } catch (e) {
                outText.value = 'Decode Error: Invalid Base64 string';
            }
        };

        container.querySelector('#btn-b64-copy').onclick = (e) => Utils.copyToClipboard(outText.value, e.target);
        container.querySelector('#btn-b64-enc').click();
    },

    // 16. UUID / GUID v4 Batch Generator
    'uuid-generator': (container) => {
        container.innerHTML = `
            <div class="controls-panel" style="justify-content: space-between;">
                <div style="display: flex; gap: 1.5rem; align-items: center;">
                    <div class="control-group">
                        <label>Quantity (<span id="uuid-qty-val">10</span>)</label>
                        <input type="range" id="uuid-qty" min="1" max="100" value="10">
                    </div>
                    <label><input type="checkbox" id="uuid-upper"> Uppercase</label>
                    <label><input type="checkbox" id="uuid-hyphen" checked> Hyphens</label>
                </div>
                <div style="display: flex; gap: 0.5rem;">
                    <button class="btn-primary" id="btn-gen-uuid">Generate</button>
                    <button class="btn-secondary" id="btn-copy-uuid">Copy All</button>
                </div>
            </div>
            <textarea id="uuid-out" class="code-area" style="height: 350px; padding: 1rem; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-md); margin-top: 1rem; color: var(--accent);" readonly></textarea>
        `;

        const qty = container.querySelector('#uuid-qty');
        const qtyVal = container.querySelector('#uuid-qty-val');
        const upper = container.querySelector('#uuid-upper');
        const hyphen = container.querySelector('#uuid-hyphen');
        const out = container.querySelector('#uuid-out');

        function generate() {
            qtyVal.textContent = qty.value;
            const count = parseInt(qty.value, 10);
            const list = [];
            for (let i = 0; i < count; i++) {
                let u = crypto.randomUUID();
                if (!hyphen.checked) u = u.replace(/-/g, '');
                if (upper.checked) u = u.toUpperCase();
                list.push(u);
            }
            out.value = list.join('\n');
        }

        qty.oninput = generate;
        upper.onchange = generate;
        hyphen.onchange = generate;
        container.querySelector('#btn-gen-uuid').onclick = generate;
        container.querySelector('#btn-copy-uuid').onclick = (e) => Utils.copyToClipboard(out.value, e.target);

        generate();
    },

    // 17. Markdown Live Editor
    'markdown-editor': (container) => {
        container.innerHTML = `
            <div class="controls-panel" style="justify-content: space-between; margin-bottom: 1rem;">
                <div style="font-weight: 700; font-size: 0.9rem;">Live Dual-Pane Markdown Sync</div>
                <div style="display: flex; gap: 0.5rem;">
                    <button class="btn-primary" id="btn-copy-html">Copy Rendered HTML</button>
                    <button class="btn-secondary" id="btn-dl-md">Download .md</button>
                </div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; min-height: 480px;">
                <textarea id="md-in" class="code-area" style="height: 100%; padding: 1rem; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-md); resize: none;"># FastTrack Tools
Welcome to the live Markdown editor.

## Key Features
- **Instant Rendering**
- *Full GFM Support*
- Tables & code syntax

| Tool | Status | Speed |
| --- | --- | --- |
| PDF Merge | Active | 0ms |
| Resizer | Active | 0ms |

\`\`\`python
print("Built by Shajjad Khan")
\`\`\`
</textarea>
                <div id="md-preview" style="height: 100%; overflow-y: auto; padding: 1.25rem; background: #020617; border: 1px solid var(--border-color); border-radius: var(--radius-md); line-height: 1.7;"></div>
            </div>
        `;

        const mdIn = container.querySelector('#md-in');
        const preview = container.querySelector('#md-preview');

        function render() {
            if (window.marked) {
                preview.innerHTML = window.marked.parse(mdIn.value);
            }
        }

        mdIn.addEventListener('input', render);
        render();

        container.querySelector('#btn-copy-html').onclick = (e) => Utils.copyToClipboard(preview.innerHTML, e.target);
        container.querySelector('#btn-dl-md').onclick = () => {
            Utils.downloadBlob(new Blob([mdIn.value], { type: 'text/markdown' }), 'document.md');
        };
    },

    // 18. Word & Character Counter
    'word-counter': (container) => {
        container.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
                <div style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1rem; text-align: center;">
                    <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Words</div>
                    <div style="font-size: 1.8rem; font-weight: 800; color: var(--accent);" id="wc-words">0</div>
                </div>
                <div style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1rem; text-align: center;">
                    <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Characters</div>
                    <div style="font-size: 1.8rem; font-weight: 800; color: var(--accent-cyan);" id="wc-chars">0</div>
                </div>
                <div style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1rem; text-align: center;">
                    <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Sentences</div>
                    <div style="font-size: 1.8rem; font-weight: 800; color: var(--accent-purple);" id="wc-sentences">0</div>
                </div>
                <div style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1rem; text-align: center;">
                    <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Reading Time</div>
                    <div style="font-size: 1.8rem; font-weight: 800; color: var(--accent-amber);" id="wc-reading">0m</div>
                </div>
            </div>
            <textarea id="wc-text" class="code-area" style="min-height: 300px; padding: 1.25rem; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-md);" placeholder="Paste or type text to analyze..."></textarea>
        `;

        const area = container.querySelector('#wc-text');
        const wordsEl = container.querySelector('#wc-words');
        const charsEl = container.querySelector('#wc-chars');
        const sentencesEl = container.querySelector('#wc-sentences');
        const readEl = container.querySelector('#wc-reading');

        function update() {
            const text = area.value.trim();
            const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
            const chars = text.length;
            const sentences = text ? (text.match(/[^.!?]+[.!?]+/g) || []).length || 1 : 0;
            const readTime = Math.ceil(words / 200);

            wordsEl.textContent = words;
            charsEl.textContent = chars;
            sentencesEl.textContent = text ? sentences : 0;
            readEl.textContent = `${readTime}m`;
        }

        area.addEventListener('input', update);
        update();
    },

    // 19. Text Case Converter
    'case-converter': (container) => {
        container.innerHTML = `
            <div class="controls-panel" style="gap: 0.6rem; flex-wrap: wrap; margin-bottom: 1rem;">
                <button class="sort-btn active" data-case="upper">UPPERCASE</button>
                <button class="sort-btn" data-case="lower">lowercase</button>
                <button class="sort-btn" data-case="title">Title Case</button>
                <button class="sort-btn" data-case="sentence">Sentence case</button>
                <button class="sort-btn" data-case="camel">camelCase</button>
                <button class="sort-btn" data-case="snake">snake_case</button>
                <button class="sort-btn" data-case="kebab">kebab-case</button>
                <button class="sort-btn" data-case="constant">CONSTANT_CASE</button>
            </div>
            <textarea id="case-text" class="code-area" style="min-height: 320px; padding: 1.25rem; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-md);" placeholder="Type or paste text here...">FastTrack tools are engineered for extreme speed and client-side performance.</textarea>
            <div style="margin-top: 1rem; display: flex; justify-content: flex-end;">
                <button class="btn-primary" id="btn-case-copy">Copy Transformed Text</button>
            </div>
        `;

        const area = container.querySelector('#case-text');

        container.querySelectorAll('[data-case]').forEach(btn => {
            btn.onclick = () => {
                const mode = btn.getAttribute('data-case');
                const val = area.value;
                if (!val) return;

                if (mode === 'upper') {
                    area.value = val.toUpperCase();
                } else if (mode === 'lower') {
                    area.value = val.toLowerCase();
                } else if (mode === 'title') {
                    area.value = val.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.substr(1).toLowerCase());
                } else if (mode === 'sentence') {
                    area.value = val.toLowerCase().replace(/(^\s*\w|[.!?]\s*\w)/g, (c) => c.toUpperCase());
                } else if (mode === 'camel') {
                    area.value = val.replace(/(?:^\w|[A-Z]|\b\w|\s+)/g, (match, index) => {
                        if (+match === 0) return '';
                        return index === 0 ? match.toLowerCase() : match.toUpperCase();
                    }).replace(/[^a-zA-Z0-9]/g, '');
                } else if (mode === 'snake') {
                    area.value = val.toLowerCase().trim().replace(/[\s\W-]+/g, '_');
                } else if (mode === 'kebab') {
                    area.value = val.toLowerCase().trim().replace(/[\s\W_]+/g, '-');
                } else if (mode === 'constant') {
                    area.value = val.toUpperCase().trim().replace(/[\s\W-]+/g, '_');
                }
            };
        });

        container.querySelector('#btn-case-copy').onclick = (e) => Utils.copyToClipboard(area.value, e.target);
    },

    // 10. Byte, Data Storage & Speed Converter
    'unit-converter': (container) => {
        container.innerHTML = `
            <div style="max-width: 900px; margin: 0 auto;">
                <div class="controls-panel" style="gap: 1.25rem; align-items: flex-end;">
                    <div class="control-group" style="flex: 2;">
                        <label>Enter Value</label>
                        <input type="number" id="unit-val-in" value="1024" step="any">
                    </div>
                    <div class="control-group" style="flex: 2;">
                        <label>Source Unit</label>
                        <select id="unit-select-source">
                            <optgroup label="Decimal (Base 10)">
                                <option value="B">Bytes (B)</option>
                                <option value="KB">Kilobytes (KB) - 10³</option>
                                <option value="MB" selected>Megabytes (MB) - 10⁶</option>
                                <option value="GB">Gigabytes (GB) - 10⁹</option>
                                <option value="TB">Terabytes (TB) - 10¹²</option>
                            </optgroup>
                            <optgroup label="Binary (Base 2 - IEC)">
                                <option value="KiB">Kibibytes (KiB) - 2¹⁰</option>
                                <option value="MiB">Mebibytes (MiB) - 2²⁰</option>
                                <option value="GiB">Gibibytes (GiB) - 2³⁰</option>
                                <option value="TiB">Tebibytes (TiB) - 2⁴⁰</option>
                            </optgroup>
                            <optgroup label="Bits & Bandwidth">
                                <option value="b">Bits (b)</option>
                                <option value="Kb">Kilobits (Kb)</option>
                                <option value="Mb">Megabits (Mb)</option>
                                <option value="Gb">Gigabits (Gb)</option>
                            </optgroup>
                        </select>
                    </div>
                </div>

                <div class="output-box" style="margin-top: 1.5rem;">
                    <div class="output-header">
                        <span class="output-title">Storage Conversions</span>
                        <span style="font-size: 0.8rem; color: var(--text-dim);">Live Multi-Unit Calculation</span>
                    </div>
                    <table class="unit-table">
                        <thead>
                            <tr>
                                <th>Unit</th>
                                <th>Name & Standard</th>
                                <th>Equivalent Value</th>
                                <th>Copy</th>
                            </tr>
                        </thead>
                        <tbody id="unit-tbody"></tbody>
                    </table>
                </div>

                <div class="output-box" style="margin-top: 1.5rem;">
                    <div class="output-header">
                        <span class="output-title">Estimated Download Times</span>
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem;" id="transfer-grid"></div>
                </div>
            </div>
        `;

        const valIn = container.querySelector('#unit-val-in');
        const srcSel = container.querySelector('#unit-select-source');
        const tbody = container.querySelector('#unit-tbody');
        const transferGrid = container.querySelector('#transfer-grid');

        const multipliers = {
            'b': 0.125,
            'B': 1,
            'KB': 1e3,
            'MB': 1e6,
            'GB': 1e9,
            'TB': 1e12,
            'KiB': 1024,
            'MiB': 1024 * 1024,
            'GiB': 1024 * 1024 * 1024,
            'TiB': 1024 * 1024 * 1024 * 1024,
            'Kb': 1e3 / 8,
            'Mb': 1e6 / 8,
            'Gb': 1e9 / 8
        };

        const unitDefs = [
            { id: 'b', name: 'Bit (b)', type: 'Binary Bit' },
            { id: 'B', name: 'Byte (B)', type: 'Standard 8-bit' },
            { id: 'KB', name: 'Kilobyte (KB)', type: 'Decimal (1,000 B)' },
            { id: 'KiB', name: 'Kibibyte (KiB)', type: 'Binary (1,024 B)' },
            { id: 'MB', name: 'Megabyte (MB)', type: 'Decimal (1,000 KB)' },
            { id: 'MiB', name: 'Mebibyte (MiB)', type: 'Binary (1,024 KiB)' },
            { id: 'GB', name: 'Gigabyte (GB)', type: 'Decimal (1,000 MB)' },
            { id: 'GiB', name: 'Gibibyte (GiB)', type: 'Binary (1,024 MiB)' },
            { id: 'TB', name: 'Terabyte (TB)', type: 'Decimal (1,000 GB)' },
            { id: 'TiB', name: 'Tebibyte (TiB)', type: 'Binary (1,024 GiB)' }
        ];

        function recalculate() {
            const raw = parseFloat(valIn.value) || 0;
            const src = srcSel.value;
            const bytes = raw * (multipliers[src] || 1);

            tbody.innerHTML = unitDefs.map(u => {
                const converted = bytes / multipliers[u.id];
                const formatted = converted >= 1e6 || (converted > 0 && converted < 0.0001) ? 
                    converted.toExponential(4) : 
                    converted.toLocaleString('en-US', { maximumFractionDigits: 4 });

                return `
                    <tr>
                        <td><strong style="color: var(--text-main); font-family: var(--font-mono);">${u.id}</strong></td>
                        <td style="color: var(--text-muted); font-size: 0.85rem;">${u.name} <span style="color: var(--text-dim);">(${u.type})</span></td>
                        <td class="unit-val">${formatted}</td>
                        <td><button class="action-mini-btn" style="width: auto; padding: 0.2rem 0.5rem;" onclick="Utils.copyToClipboard('${converted}', this)">Copy</button></td>
                    </tr>
                `;
            }).join('');

            // Transfer speed estimates
            const speeds = [
                { name: '4G LTE (25 Mbps)', bps: 25 * 1e6 },
                { name: 'Home Fiber (100 Mbps)', bps: 100 * 1e6 },
                { name: '5G Ultra (300 Mbps)', bps: 300 * 1e6 },
                { name: 'Gigabit LAN (1 Gbps)', bps: 1e9 }
            ];

            const totalBits = bytes * 8;
            transferGrid.innerHTML = speeds.map(s => {
                const sec = totalBits / s.bps;
                let timeStr = `${sec.toFixed(1)}s`;
                if (sec >= 60 && sec < 3600) {
                    timeStr = `${(sec / 60).toFixed(1)} min`;
                } else if (sec >= 3600) {
                    timeStr = `${(sec / 3600).toFixed(1)} hrs`;
                } else if (sec < 0.01) {
                    timeStr = `< 10ms`;
                }

                return `
                    <div style="background: var(--bg-card); padding: 1rem; border-radius: var(--radius-sm); border: 1px solid var(--border-dim); text-align: center;">
                        <div style="font-size: 0.72rem; color: var(--text-dim); text-transform: uppercase;">${s.name}</div>
                        <div style="font-size: 1.35rem; font-weight: 800; color: var(--accent); margin-top: 0.35rem;">${timeStr}</div>
                    </div>
                `;
            }).join('');
        }

        valIn.oninput = recalculate;
        srcSel.onchange = recalculate;
        recalculate();
    },

    // 11. Lorem Ipsum & Mock Data Generator
    'lorem-ipsum': (container) => {
        container.innerHTML = `
            <div style="max-width: 900px; margin: 0 auto;">
                <div class="controls-panel" style="gap: 1.25rem; align-items: flex-end;">
                    <div class="control-group" style="max-width: 130px;">
                        <label>Quantity</label>
                        <input type="number" id="lorem-qty" value="3" min="1" max="100">
                    </div>
                    <div class="control-group" style="flex: 2;">
                        <label>Content Type</label>
                        <select id="lorem-type">
                            <option value="paragraphs" selected>Paragraphs (Text)</option>
                            <option value="sentences">Sentences</option>
                            <option value="words">Words</option>
                            <option value="mock-users">Mock Users (JSON)</option>
                            <option value="mock-products">Mock Products (JSON)</option>
                        </select>
                    </div>
                    <div class="control-group" style="flex: 2; flex-direction: row; align-items: center; gap: 0.5rem; padding-bottom: 0.6rem;">
                        <input type="checkbox" id="lorem-lead" checked style="width: auto !important; margin: 0;">
                        <label for="lorem-lead" style="text-transform: none; font-size: 0.85rem; cursor: pointer; color: var(--text-main); margin: 0;">Include "Lorem ipsum..."</label>
                    </div>
                    <button class="btn-primary" id="btn-make-lorem">Generate</button>
                </div>

                <div class="output-box" style="margin-top: 1.25rem;">
                    <div class="output-header">
                        <span class="output-title">Generated Content</span>
                        <div style="display: flex; gap: 0.75rem; align-items: center;">
                            <span id="lorem-meta" style="font-size: 0.8rem; color: var(--text-muted); font-family: var(--font-mono);">0 words</span>
                            <button class="btn-secondary" id="btn-copy-lorem" style="padding: 0.35rem 0.85rem; font-size: 0.8rem;">📋 Copy Text</button>
                        </div>
                    </div>
                    <textarea id="lorem-output" style="height: 320px; font-size: 0.95rem;"></textarea>
                </div>
            </div>
        `;

        const words = ["lorem", "ipsum", "dolor", "sit", "amet", "consectetur", "adipiscing", "elit", "sed", "do", "eiusmod", "tempor", "incididunt", "ut", "labore", "et", "dolore", "magna", "aliqua", "ut", "enim", "ad", "minim", "veniam", "quis", "nostrud", "exercitation", "ullamco", "laboris", "nisi", "ut", "aliquip", "ex", "ea", "commodo", "consequat", "duis", "aute", "irure", "dolor", "in", "reprehenderit", "in", "voluptate", "velit", "esse", "cillum", "dolore", "eu", "fugiat", "nulla", "pariatur", "excepteur", "sint", "occaecat", "cupidatat", "non", "proident", "sunt", "in", "culpa", "qui", "officia", "deserunt", "mollit", "anim", "id", "est", "laborum"];

        function makeSentence() {
            const len = Math.floor(Math.random() * 10) + 8;
            const w = [];
            for (let i = 0; i < len; i++) {
                w.push(words[Math.floor(Math.random() * words.length)]);
            }
            const s = w.join(' ');
            return s.charAt(0).toUpperCase() + s.slice(1) + '.';
        }

        function generate() {
            const qty = Math.max(1, parseInt(container.querySelector('#lorem-qty').value) || 1);
            const type = container.querySelector('#lorem-type').value;
            const lead = container.querySelector('#lorem-lead').checked;
            const outArea = container.querySelector('#lorem-output');
            const meta = container.querySelector('#lorem-meta');

            let result = '';

            if (type === 'paragraphs') {
                const paras = [];
                for (let p = 0; p < qty; p++) {
                    const sentenceCount = Math.floor(Math.random() * 4) + 4;
                    const sentences = [];
                    for (let s = 0; s < sentenceCount; s++) {
                        sentences.push(makeSentence());
                    }
                    paras.push(sentences.join(' '));
                }
                if (lead && paras.length > 0) {
                    paras[0] = "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. " + paras[0];
                }
                result = paras.join('\n\n');
            } else if (type === 'sentences') {
                const s = [];
                for (let i = 0; i < qty; i++) s.push(makeSentence());
                result = s.join(' ');
            } else if (type === 'words') {
                const w = [];
                for (let i = 0; i < qty; i++) w.push(words[Math.floor(Math.random() * words.length)]);
                result = w.join(' ');
            } else if (type === 'mock-users') {
                const users = [];
                const roles = ["Software Architect", "Product Manager", "DevOps Engineer", "Frontend Developer", "Security Analyst"];
                const cities = ["Riyadh", "Dubai", "London", "San Francisco", "Singapore"];
                for (let i = 1; i <= qty; i++) {
                    users.push({
                        id: `usr_${1000 + i}`,
                        name: `User ${i}`,
                        email: `user.${i}@enterprise-cloud.io`,
                        role: roles[i % roles.length],
                        location: cities[i % cities.length],
                        active: i % 4 !== 0,
                        createdAt: new Date(Date.now() - i * 86400000).toISOString()
                    });
                }
                result = JSON.stringify(users, null, 2);
            } else if (type === 'mock-products') {
                const prods = [];
                const cats = ["Cloud SaaS", "API Gateway", "Database", "Security Suite", "Storage"];
                for (let i = 1; i <= qty; i++) {
                    prods.push({
                        id: `prod_${2000 + i}`,
                        sku: `SKU-${100 + i}`,
                        title: `Enterprise ${cats[i % cats.length]} License`,
                        price: (i * 29.99).toFixed(2),
                        currency: "USD",
                        category: cats[i % cats.length],
                        inStock: true
                    });
                }
                result = JSON.stringify(prods, null, 2);
            }

            outArea.value = result;
            const wordCount = result.trim() ? result.trim().split(/\s+/).length : 0;
            meta.textContent = `${wordCount} words • ${result.length} characters`;
        }

        container.querySelector('#btn-make-lorem').onclick = generate;
        container.querySelector('#btn-copy-lorem').onclick = (e) => {
            Utils.copyToClipboard(container.querySelector('#lorem-output').value, e.target);
        };
        generate();
    },

    // 12. SaaS Metrics, MRR, ARR & LTV / CAC
    'saas-calculator': (container) => {
        container.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 2rem;">
                <div class="controls-panel" style="flex-direction: column; align-items: stretch; margin: 0;">
                    <h3 style="font-size: 1.1rem; margin-bottom: 0.5rem;">SaaS Financial Inputs</h3>
                    <div class="control-group">
                        <label>Paying Customers</label>
                        <input type="number" id="saas-customers" value="250">
                    </div>
                    <div class="control-group">
                        <label>Avg Monthly Revenue Per User - ARPU ($)</label>
                        <input type="number" id="saas-arpu" value="120">
                    </div>
                    <div class="control-group">
                        <label>Monthly Customer Churn Rate (%)</label>
                        <input type="number" id="saas-churn" value="3.5" step="0.1">
                    </div>
                    <div class="control-group">
                        <label>Customer Acquisition Cost - CAC ($)</label>
                        <input type="number" id="saas-cac" value="450">
                    </div>
                    <div class="control-group">
                        <label>Gross Margin (%)</label>
                        <input type="number" id="saas-margin" value="80">
                    </div>
                </div>

                <div>
                    <div class="output-box" style="margin: 0;">
                        <h3 style="font-size: 1.1rem; margin-bottom: 1.25rem;">SaaS Unit Economics</h3>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
                            <div style="background: var(--bg-card); padding: 1rem; border-radius: var(--radius-sm); border: 1px solid var(--border-dim);">
                                <div style="font-size: 0.72rem; color: var(--text-dim); text-transform: uppercase;">Monthly Recurring (MRR)</div>
                                <div style="font-size: 1.55rem; font-weight: 800; color: var(--accent);" id="saas-res-mrr">$30,000</div>
                            </div>
                            <div style="background: var(--bg-card); padding: 1rem; border-radius: var(--radius-sm); border: 1px solid var(--border-dim);">
                                <div style="font-size: 0.72rem; color: var(--text-dim); text-transform: uppercase;">Annual Run Rate (ARR)</div>
                                <div style="font-size: 1.55rem; font-weight: 800; color: var(--accent-blue);" id="saas-res-arr">$360,000</div>
                            </div>
                            <div style="background: var(--bg-card); padding: 1rem; border-radius: var(--radius-sm); border: 1px solid var(--border-dim);">
                                <div style="font-size: 0.72rem; color: var(--text-dim); text-transform: uppercase;">Customer LTV</div>
                                <div style="font-size: 1.55rem; font-weight: 800; color: #a855f7;" id="saas-res-ltv">$2,742</div>
                            </div>
                            <div style="background: var(--bg-card); padding: 1rem; border-radius: var(--radius-sm); border: 1px solid var(--border-dim);">
                                <div style="font-size: 0.72rem; color: var(--text-dim); text-transform: uppercase;">LTV / CAC Ratio</div>
                                <div style="font-size: 1.55rem; font-weight: 800;" id="saas-res-ratio">6.1x</div>
                            </div>
                        </div>
                        <div style="background: var(--bg-card); padding: 1rem; border-radius: var(--radius-sm); border: 1px solid var(--border-dim);">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 0.4rem;">
                                <span style="font-size: 0.82rem; color: var(--text-muted);">CAC Payback Period</span>
                                <span id="saas-res-payback" style="font-weight: 700; color: var(--accent);">4.7 Months</span>
                            </div>
                            <div style="font-size: 0.78rem; color: var(--text-dim);" id="saas-res-note">✅ Exceptional SaaS economics (> 3.0x benchmark)</div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const inputs = container.querySelectorAll('input');
        function compute() {
            const cust = parseFloat(container.querySelector('#saas-customers').value) || 0;
            const arpu = parseFloat(container.querySelector('#saas-arpu').value) || 0;
            const churn = parseFloat(container.querySelector('#saas-churn').value) || 0;
            const cac = parseFloat(container.querySelector('#saas-cac').value) || 0;
            const margin = parseFloat(container.querySelector('#saas-margin').value) || 0;

            const mrr = cust * arpu;
            const arr = mrr * 12;
            const lifetimeMonths = churn > 0 ? (1 / (churn / 100)) : 0;
            const ltv = arpu * (margin / 100) * lifetimeMonths;
            const ratio = cac > 0 ? (ltv / cac) : 0;
            const monthlyMargin = arpu * (margin / 100);
            const payback = monthlyMargin > 0 ? (cac / monthlyMargin) : 0;

            container.querySelector('#saas-res-mrr').textContent = `$${mrr.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
            container.querySelector('#saas-res-arr').textContent = `$${arr.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
            container.querySelector('#saas-res-ltv').textContent = `$${ltv.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
            
            const ratioEl = container.querySelector('#saas-res-ratio');
            ratioEl.textContent = `${ratio.toFixed(1)}x`;
            ratioEl.style.color = ratio >= 3.0 ? 'var(--accent)' : (ratio >= 1.5 ? '#f59e0b' : '#ef4444');

            container.querySelector('#saas-res-payback').textContent = `${payback.toFixed(1)} Months`;
            container.querySelector('#saas-res-note').textContent = ratio >= 3.0 ? 
                '✅ Exceptional SaaS economics (> 3.0x industry benchmark)' : 
                (ratio >= 1.5 ? '⚠️ Acceptable but optimize CAC or reduce churn (< 3.0x)' : '⛔ Critical warning: Customer acquisition costs exceed lifetime value!');
        }

        inputs.forEach(i => i.oninput = compute);
        compute();
    },

    // 13. Discount, Coupon & VAT / Tax Calculator
    'discount-tax-calculator': (container) => {
        container.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 2rem;">
                <div class="controls-panel" style="flex-direction: column; align-items: stretch; margin: 0;">
                    <h3 style="font-size: 1.1rem; margin-bottom: 0.5rem;">Pricing & Discounts</h3>
                    <div class="control-group">
                        <label>Original Price ($)</label>
                        <input type="number" id="dt-price" value="120" step="0.01">
                    </div>
                    <div class="control-group">
                        <label>Primary Discount (%)</label>
                        <input type="number" id="dt-disc1" value="20" step="0.5">
                    </div>
                    <div class="control-group">
                        <label>Additional Promo / Coupon (%)</label>
                        <input type="number" id="dt-disc2" value="5" step="0.5">
                    </div>
                    <div class="control-group">
                        <label>Sales Tax / VAT (%)</label>
                        <input type="number" id="dt-vat" value="15" step="0.1">
                    </div>
                </div>

                <div>
                    <div class="output-box" style="margin: 0;">
                        <h3 style="font-size: 1.1rem; margin-bottom: 1.25rem;">Checkout Summary</h3>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
                            <div style="background: var(--bg-card); padding: 1rem; border-radius: var(--radius-sm); border: 1px solid var(--border-dim);">
                                <div style="font-size: 0.72rem; color: var(--text-dim); text-transform: uppercase;">Final You Pay</div>
                                <div style="font-size: 1.65rem; font-weight: 800; color: var(--accent);" id="dt-res-pay">$104.88</div>
                            </div>
                            <div style="background: var(--bg-card); padding: 1rem; border-radius: var(--radius-sm); border: 1px solid var(--border-dim);">
                                <div style="font-size: 0.72rem; color: var(--text-dim); text-transform: uppercase;">Total You Save</div>
                                <div style="font-size: 1.65rem; font-weight: 800; color: #f59e0b;" id="dt-res-saved">$28.80</div>
                            </div>
                        </div>
                        <table class="unit-table">
                            <tr><td>Discounted Base Price</td><td class="unit-val" id="dt-res-base">$91.20</td></tr>
                            <tr><td>Tax / VAT Amount</td><td class="unit-val" id="dt-res-tax">$13.68</td></tr>
                            <tr><td>Effective Total Discount Rate</td><td class="unit-val" id="dt-res-eff">24.0%</td></tr>
                        </table>
                    </div>
                </div>
            </div>
        `;

        const inputs = container.querySelectorAll('input');
        function recalc() {
            const orig = parseFloat(container.querySelector('#dt-price').value) || 0;
            const d1 = parseFloat(container.querySelector('#dt-disc1').value) || 0;
            const d2 = parseFloat(container.querySelector('#dt-disc2').value) || 0;
            const vat = parseFloat(container.querySelector('#dt-vat').value) || 0;

            const afterD1 = orig * (1 - d1 / 100);
            const afterD2 = afterD1 * (1 - d2 / 100);
            const saved = orig - afterD2;
            const taxAmt = afterD2 * (vat / 100);
            const finalPay = afterD2 + taxAmt;
            const eff = orig > 0 ? ((saved / orig) * 100) : 0;

            container.querySelector('#dt-res-pay').textContent = `$${finalPay.toFixed(2)}`;
            container.querySelector('#dt-res-saved').textContent = `$${saved.toFixed(2)}`;
            container.querySelector('#dt-res-base').textContent = `$${afterD2.toFixed(2)}`;
            container.querySelector('#dt-res-tax').textContent = `$${taxAmt.toFixed(2)}`;
            container.querySelector('#dt-res-eff').textContent = `${eff.toFixed(1)}%`;
        }

        inputs.forEach(i => i.oninput = recalc);
        recalc();
    },

    // 14. Currency & Financial Converter
    'currency-converter': (container) => {
        container.innerHTML = `
            <div style="max-width: 900px; margin: 0 auto;">
                <div class="controls-panel" style="gap: 1.25rem; align-items: flex-end;">
                    <div class="control-group" style="flex: 2;">
                        <label>Amount</label>
                        <input type="number" id="curr-val" value="1000" step="any">
                    </div>
                    <div class="control-group" style="flex: 2;">
                        <label>From Currency</label>
                        <select id="curr-src">
                            <option value="USD" selected>USD - US Dollar</option>
                            <option value="EUR">EUR - Euro</option>
                            <option value="GBP">GBP - British Pound</option>
                            <option value="SAR">SAR - Saudi Riyal</option>
                            <option value="AED">AED - UAE Dirham</option>
                            <option value="CAD">CAD - Canadian Dollar</option>
                            <option value="JPY">JPY - Japanese Yen</option>
                            <option value="INR">INR - Indian Rupee</option>
                            <option value="SGD">SGD - Singapore Dollar</option>
                        </select>
                    </div>
                    <button class="btn-secondary" id="btn-curr-swap" style="padding: 0.65rem 0.9rem;" title="Swap Currencies">⇄</button>
                    <div class="control-group" style="flex: 2;">
                        <label>To Currency</label>
                        <select id="curr-dst">
                            <option value="USD">USD - US Dollar</option>
                            <option value="EUR">EUR - Euro</option>
                            <option value="GBP">GBP - British Pound</option>
                            <option value="SAR" selected>SAR - Saudi Riyal</option>
                            <option value="AED">AED - UAE Dirham</option>
                            <option value="CAD">CAD - Canadian Dollar</option>
                            <option value="JPY">JPY - Japanese Yen</option>
                            <option value="INR">INR - Indian Rupee</option>
                            <option value="SGD">SGD - Singapore Dollar</option>
                        </select>
                    </div>
                </div>

                <div class="output-box" style="text-align: center; padding: 2rem 1.5rem;">
                    <div style="font-size: 0.9rem; color: var(--text-dim);" id="curr-rate-label">1 USD = 3.7500 SAR</div>
                    <div style="font-size: 2.5rem; font-weight: 800; color: var(--accent); margin: 0.75rem 0;" id="curr-converted">3,750.00 SAR</div>
                    <div style="font-size: 0.8rem; color: var(--text-muted);">Real-time peg reference rates • Accurate financial calculations</div>
                </div>

                <div class="output-box" style="margin-top: 1.5rem;">
                    <div class="output-header"><span class="output-title">Top Currency Conversions</span></div>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;" id="curr-matrix"></div>
                </div>
            </div>
        `;

        const rates = {
            USD: 1.0,
            EUR: 0.92,
            GBP: 0.79,
            SAR: 3.75,
            AED: 3.6725,
            CAD: 1.36,
            JPY: 153.5,
            INR: 83.4,
            SGD: 1.35
        };

        const amtIn = container.querySelector('#curr-val');
        const srcSel = container.querySelector('#curr-src');
        const dstSel = container.querySelector('#curr-dst');
        const swapBtn = container.querySelector('#btn-curr-swap');

        function convert() {
            const amt = parseFloat(amtIn.value) || 0;
            const src = srcSel.value;
            const dst = dstSel.value;

            const inUSD = amt / rates[src];
            const result = inUSD * rates[dst];
            const singleRate = rates[dst] / rates[src];

            container.querySelector('#curr-rate-label').textContent = `1 ${src} = ${singleRate.toFixed(4)} ${dst}`;
            container.querySelector('#curr-converted').textContent = `${result.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${dst}`;

            // Top conversions matrix
            const major = ['USD', 'EUR', 'GBP', 'SAR', 'AED', 'JPY', 'INR', 'CAD'];
            container.querySelector('#curr-matrix').innerHTML = major.map(c => {
                const resC = inUSD * rates[c];
                return `
                    <div style="background: var(--bg-card); padding: 0.85rem; border-radius: var(--radius-sm); border: 1px solid var(--border-dim);">
                        <div style="font-size: 0.75rem; color: var(--text-dim);">${c}</div>
                        <div style="font-size: 1.15rem; font-weight: 700; color: var(--text-main); margin-top: 0.2rem;">
                            ${resC.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                    </div>
                `;
            }).join('');
        }

        swapBtn.onclick = () => {
            const tmp = srcSel.value;
            srcSel.value = dstSel.value;
            dstSel.value = tmp;
            convert();
        };

        amtIn.oninput = convert;
        srcSel.onchange = convert;
        dstSel.onchange = convert;
        convert();
    },

    // 16. Meta Tags & OpenGraph Previewer
    'meta-tag-generator': (container) => {
        container.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 2rem;">
                <div class="controls-panel" style="flex-direction: column; align-items: stretch; margin: 0;">
                    <h3 style="font-size: 1.1rem; margin-bottom: 0.5rem;">Metadata Inputs</h3>
                    <div class="control-group">
                        <label>Page Title</label>
                        <input type="text" id="meta-in-title" value="FastTrack Tools — High-Velocity Utilities">
                    </div>
                    <div class="control-group">
                        <label>Meta Description</label>
                        <textarea id="meta-in-desc" style="height: 90px;">48+ essential engineering, PDF, image, and business utilities. Free, 100% private in-browser file execution with zero lag.</textarea>
                    </div>
                    <div class="control-group">
                        <label>Canonical Page URL</label>
                        <input type="url" id="meta-in-url" value="https://www.shajjadkhan.com/tools">
                    </div>
                    <div class="control-group">
                        <label>Social Preview Image URL (OG Image)</label>
                        <input type="url" id="meta-in-img" value="https://www.shajjadkhan.com/static/images/og-tools.png">
                    </div>
                    <div class="control-group">
                        <label>Author / Publisher</label>
                        <input type="text" id="meta-in-author" value="Shajjad Khan">
                    </div>
                </div>

                <div>
                    <div class="output-box" style="margin: 0 0 1.25rem 0;">
                        <div class="output-header"><span class="output-title">Google Search Snippet Preview</span></div>
                        <div style="background: #ffffff; color: #1a0dab; border-radius: 8px; padding: 1rem; font-family: Arial, sans-serif;">
                            <div style="font-size: 12px; color: #202124;" id="meta-prev-url">https://www.shajjadkhan.com/tools</div>
                            <div style="font-size: 18px; font-weight: 400; color: #1a0dab; margin: 2px 0 4px;" id="meta-prev-title">FastTrack Tools</div>
                            <div style="font-size: 13px; color: #4d5156; line-height: 1.4;" id="meta-prev-desc">Meta description snippet preview...</div>
                        </div>
                    </div>

                    <div class="output-box">
                        <div class="output-header">
                            <span class="output-title">Generated HTML Tags</span>
                            <button class="btn-secondary" id="btn-copy-meta" style="padding: 0.35rem 0.85rem; font-size: 0.8rem;">📋 Copy Tags</button>
                        </div>
                        <pre class="code-pre" id="meta-code" style="max-height: 220px; font-size: 0.8rem;"></pre>
                    </div>
                </div>
            </div>
        `;

        const inputs = container.querySelectorAll('input, textarea');
        function update() {
            const title = container.querySelector('#meta-in-title').value.trim() || 'FastTrack Tools';
            const desc = container.querySelector('#meta-in-desc').value.trim() || '';
            const url = container.querySelector('#meta-in-url').value.trim() || 'https://www.shajjadkhan.com/tools';
            const img = container.querySelector('#meta-in-img').value.trim() || '';
            const author = container.querySelector('#meta-in-author').value.trim() || 'Shajjad Khan';

            container.querySelector('#meta-prev-url').textContent = url;
            container.querySelector('#meta-prev-title').textContent = title;
            container.querySelector('#meta-prev-desc').textContent = desc;

            const code = `<!-- Primary Meta Tags -->\n<title>${title}</title>\n<meta name="title" content="${title}">\n<meta name="description" content="${desc}">\n<meta name="author" content="${author}">\n<link rel="canonical" href="${url}">\n\n<!-- Open Graph / Facebook -->\n<meta property="og:type" content="website">\n<meta property="og:url" content="${url}">\n<meta property="og:title" content="${title}">\n<meta property="og:description" content="${desc}">\n<meta property="og:image" content="${img}">\n\n<!-- Twitter / X -->\n<meta property="twitter:card" content="summary_large_image">\n<meta property="twitter:url" content="${url}">\n<meta property="twitter:title" content="${title}">\n<meta property="twitter:description" content="${desc}">\n<meta property="twitter:image" content="${img}">`;

            container.querySelector('#meta-code').textContent = code;
        }

        container.querySelector('#btn-copy-meta').onclick = (e) => {
            Utils.copyToClipboard(container.querySelector('#meta-code').textContent, e.target);
        };

        inputs.forEach(i => i.oninput = update);
        update();
    },

    // 17. Robots.txt Generator & Rule Tester
    'robots-generator': (container) => {
        container.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 2rem;">
                <div class="controls-panel" style="flex-direction: column; align-items: stretch; margin: 0;">
                    <h3 style="font-size: 1.1rem; margin-bottom: 0.5rem;">Robots.txt Builder</h3>
                    <div class="control-group">
                        <label>Target User-Agent</label>
                        <select id="rob-ua">
                            <option value="*">All Web Crawlers (*)</option>
                            <option value="Googlebot">Googlebot (Google)</option>
                            <option value="Bingbot">Bingbot (Microsoft)</option>
                        </select>
                    </div>
                    <div class="control-group">
                        <label>Disallow Paths (One per line)</label>
                        <textarea id="rob-disallow" style="height: 100px;">/admin/
/private/
/api/
/tmp/</textarea>
                    </div>
                    <div class="control-group">
                        <label>Allow Paths (One per line)</label>
                        <textarea id="rob-allow" style="height: 60px;">/
/tools/</textarea>
                    </div>
                    <div class="control-group">
                        <label>Sitemap URL</label>
                        <input type="url" id="rob-sitemap" value="https://www.shajjadkhan.com/sitemap.xml">
                    </div>
                </div>

                <div>
                    <div class="output-box" style="margin: 0 0 1.25rem 0;">
                        <div class="output-header">
                            <span class="output-title">Generated robots.txt</span>
                            <div style="display: flex; gap: 0.5rem;">
                                <button class="btn-secondary" id="btn-copy-rob" style="padding: 0.35rem 0.75rem; font-size: 0.8rem;">📋 Copy</button>
                                <button class="btn-primary" id="btn-dl-rob" style="padding: 0.35rem 0.75rem; font-size: 0.8rem;">💾 Download</button>
                            </div>
                        </div>
                        <pre class="code-pre" id="rob-output" style="min-height: 160px; font-size: 0.85rem;"></pre>
                    </div>

                    <!-- URL Rule Tester -->
                    <div class="output-box">
                        <div class="output-header"><span class="output-title">Live URL Path Tester</span></div>
                        <div style="display: flex; gap: 0.5rem;">
                            <input type="text" id="rob-test-in" value="/admin/users" placeholder="/path-to-test">
                            <button class="btn-primary" id="btn-rob-test">Test</button>
                        </div>
                        <div id="rob-test-badge" style="margin-top: 0.75rem; font-weight: 700; font-size: 0.95rem;"></div>
                    </div>
                </div>
            </div>
        `;

        function buildRobots() {
            const ua = container.querySelector('#rob-ua').value;
            const disallow = container.querySelector('#rob-disallow').value.trim().split('\n').filter(Boolean);
            const allow = container.querySelector('#rob-allow').value.trim().split('\n').filter(Boolean);
            const sitemap = container.querySelector('#rob-sitemap').value.trim();

            let txt = `# robots.txt generated by FastTrack Tools\nUser-agent: ${ua}\n`;
            disallow.forEach(d => txt += `Disallow: ${d.trim()}\n`);
            allow.forEach(a => txt += `Allow: ${a.trim()}\n`);
            if (sitemap) txt += `\nSitemap: ${sitemap}\n`;

            container.querySelector('#rob-output').textContent = txt;
            return txt;
        }

        function testPath() {
            const path = (container.querySelector('#rob-test-in').value || '').trim();
            const disallow = container.querySelector('#rob-disallow').value.trim().split('\n').map(s => s.trim()).filter(Boolean);
            const badge = container.querySelector('#rob-test-badge');

            const blocked = disallow.some(rule => path.startsWith(rule));
            if (blocked) {
                badge.innerHTML = `<span style="color: #ef4444;">⛔ BLOCKED</span> &bull; Path matches disallow rule`;
            } else {
                badge.innerHTML = `<span style="color: var(--accent);">✅ ALLOWED</span> &bull; Search engines can crawl this path`;
            }
        }

        container.querySelectorAll('input, textarea, select').forEach(el => el.oninput = buildRobots);
        container.querySelector('#btn-rob-test').onclick = testPath;
        container.querySelector('#btn-copy-rob').onclick = (e) => {
            Utils.copyToClipboard(container.querySelector('#rob-output').textContent, e.target);
        };
        container.querySelector('#btn-dl-rob').onclick = () => {
            const blob = new Blob([container.querySelector('#rob-output').textContent], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'robots.txt';
            a.click();
            URL.revokeObjectURL(url);
        };

        buildRobots();
        testPath();
    },

    // 18. URL Parser & Query String Builder
    'url-parser': (container) => {
        container.innerHTML = `
            <div style="max-width: 950px; margin: 0 auto;">
                <div class="controls-panel" style="flex-direction: column; align-items: stretch; margin: 0;">
                    <div class="control-group">
                        <label>Paste Full URL to Parse</label>
                        <input type="text" id="url-parse-str" value="https://www.shajjadkhan.com/tools?category=pdf&sort=featured&token=fast2026#catalog">
                    </div>
                </div>

                <div class="output-box" style="margin-top: 1.5rem;">
                    <div class="output-header"><span class="output-title">Deconstructed URL Components</span></div>
                    <table class="unit-table" id="url-parts-tbl"></table>
                </div>

                <div class="output-box" style="margin-top: 1.5rem;">
                    <div class="output-header">
                        <span class="output-title">Query Parameters Key-Value Pair Table</span>
                    </div>
                    <table class="unit-table">
                        <thead><tr><th>Param Key</th><th>Param Value</th><th>Action</th></tr></thead>
                        <tbody id="url-query-tbl"></tbody>
                    </table>
                </div>
            </div>
        `;

        const urlInput = container.querySelector('#url-parse-str');
        const partsTbl = container.querySelector('#url-parts-tbl');
        const queryTbl = container.querySelector('#url-query-tbl');

        function parse() {
            let u;
            try {
                let raw = urlInput.value.trim();
                if (!raw.startsWith('http://') && !raw.startsWith('https://')) {
                    raw = 'https://' + raw;
                }
                u = new URL(raw);
            } catch (e) {
                partsTbl.innerHTML = `<tr><td colspan="2" style="color: #ef4444;">Invalid URL format. Please enter a complete URL.</td></tr>`;
                queryTbl.innerHTML = '';
                return;
            }

            partsTbl.innerHTML = `
                <tr><td style="width: 180px; color: var(--text-dim);">Protocol</td><td class="unit-val">${u.protocol}</td></tr>
                <tr><td style="color: var(--text-dim);">Hostname (Domain)</td><td class="unit-val">${u.hostname}</td></tr>
                <tr><td style="color: var(--text-dim);">Port</td><td class="unit-val">${u.port || '(Default 80/443)'}</td></tr>
                <tr><td style="color: var(--text-dim);">Pathname</td><td class="unit-val">${u.pathname}</td></tr>
                <tr><td style="color: var(--text-dim);">Search Query</td><td class="unit-val">${u.search || '(None)'}</td></tr>
                <tr><td style="color: var(--text-dim);">Hash (Fragment)</td><td class="unit-val">${u.hash || '(None)'}</td></tr>
            `;

            const params = Array.from(u.searchParams.entries());
            if (params.length === 0) {
                queryTbl.innerHTML = `<tr><td colspan="3" style="color: var(--text-dim); text-align: center;">No query parameters in this URL</td></tr>`;
            } else {
                queryTbl.innerHTML = params.map(([k, v]) => `
                    <tr>
                        <td style="font-family: var(--font-mono); font-weight: 700; color: var(--accent);">${k}</td>
                        <td style="font-family: var(--font-mono);">${v}</td>
                        <td><button class="action-mini-btn" style="width: auto; padding: 0.2rem 0.5rem;" onclick="Utils.copyToClipboard('${v}', this)">Copy</button></td>
                    </tr>
                `).join('');
            }
        }

        urlInput.oninput = parse;
        parse();
    },

    // 25. JWT Token Decoder & Expiration Inspector
    'jwt-decoder': (container) => {
        container.innerHTML = `
            <div style="max-width: 950px; margin: 0 auto;">
                <div class="controls-panel" style="flex-direction: column; align-items: stretch; margin: 0;">
                    <div class="control-group">
                        <label>Paste JSON Web Token (JWT)</label>
                        <textarea id="jwt-raw-in" style="height: 90px; font-size: 0.85rem;" placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...">eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyXzg4OTIxIiwibmFtZSI6IlNoYWpqYWQgS2hhbiIsInJvbGUiOiJTeXN0ZW1BcmNoaXRlY3QiLCJpYXQiOjE3MDAwMDAwMDAsImV4cCI6MjEzMDAwMDAwMH0.signature_fasttrack</textarea>
                    </div>
                </div>

                <div id="jwt-badge-status" style="margin-top: 1rem; padding: 0.75rem 1.25rem; border-radius: var(--radius-sm); font-weight: 700;"></div>

                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1.5rem; margin-top: 1.25rem;">
                    <div class="output-box" style="margin: 0;">
                        <div class="output-header"><span class="output-title" style="color: #ef4444;">Header (Algorithm & Type)</span></div>
                        <pre class="code-pre" id="jwt-head-pre" style="min-height: 160px;"></pre>
                    </div>
                    <div class="output-box" style="margin: 0;">
                        <div class="output-header"><span class="output-title" style="color: #a855f7;">Payload (Claims Data)</span></div>
                        <pre class="code-pre" id="jwt-pay-pre" style="min-height: 160px;"></pre>
                    </div>
                </div>
            </div>
        `;

        const txtIn = container.querySelector('#jwt-raw-in');
        const badge = container.querySelector('#jwt-badge-status');
        const headPre = container.querySelector('#jwt-head-pre');
        const payPre = container.querySelector('#jwt-pay-pre');

        function b64Decode(str) {
            let output = str.replace(/-/g, '+').replace(/_/g, '/');
            switch (output.length % 4) {
                case 0: break;
                case 2: output += '=='; break;
                case 3: output += '='; break;
                default: throw 'Illegal base64url string!';
            }
            return decodeURIComponent(escape(atob(output)));
        }

        function decode() {
            const raw = (txtIn.value || '').trim();
            const parts = raw.split('.');
            if (parts.length < 2) {
                badge.style.background = 'rgba(239, 68, 68, 0.15)';
                badge.style.color = '#ef4444';
                badge.textContent = '⛔ Invalid JWT format (Must have at least 2 dot-separated base64 segments)';
                headPre.textContent = '';
                payPre.textContent = '';
                return;
            }

            try {
                const headerObj = JSON.parse(b64Decode(parts[0]));
                const payloadObj = JSON.parse(b64Decode(parts[1]));

                headPre.textContent = JSON.stringify(headerObj, null, 2);
                payPre.textContent = JSON.stringify(payloadObj, null, 2);

                if (payloadObj.exp) {
                    const expMs = payloadObj.exp * 1000;
                    const expDate = new Date(expMs);
                    const now = Date.now();

                    if (now < expMs) {
                        badge.style.background = 'rgba(16, 185, 129, 0.15)';
                        badge.style.color = 'var(--accent)';
                        badge.innerHTML = `🟢 TOKEN ACTIVE &bull; Expires: ${expDate.toUTCString()} (in ${Math.round((expMs - now) / 86400000)} days)`;
                    } else {
                        badge.style.background = 'rgba(239, 68, 68, 0.15)';
                        badge.style.color = '#ef4444';
                        badge.innerHTML = `🔴 TOKEN EXPIRED &bull; Expired on: ${expDate.toUTCString()}`;
                    }
                } else {
                    badge.style.background = 'rgba(59, 130, 246, 0.15)';
                    badge.style.color = '#60a5fa';
                    badge.textContent = '⚪ No Expiration (exp) claim present in token payload';
                }
            } catch (err) {
                badge.style.background = 'rgba(239, 68, 68, 0.15)';
                badge.style.color = '#ef4444';
                badge.textContent = `Parse Error: ${err.message || err}`;
            }
        }

        txtIn.oninput = decode;
        decode();
    },

    // 27. Text Diff & Comparison Checker
    'text-diff': (container) => {
        container.innerHTML = `
            <div style="max-width: 1000px; margin: 0 auto;">
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1.25rem;">
                    <div>
                        <label style="font-size: 0.78rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Original Text</label>
                        <textarea id="diff-original" style="height: 160px; margin-top: 0.35rem;">System Architect: Shajjad Khan
Platform: FastTrack Tools
Status: Initial Release
Architecture: Client-side file processing</textarea>
                    </div>
                    <div>
                        <label style="font-size: 0.78rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Modified Text</label>
                        <textarea id="diff-modified" style="height: 160px; margin-top: 0.35rem;">System Architect: Shajjad Khan (Founder)
Platform: FastTrack Tools Suite 2.0
Status: Production Deployed
Architecture: Client-side file processing
Monetization: Google AdSense integrated</textarea>
                    </div>
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1rem;">
                    <button class="btn-primary" id="btn-run-diff">Compare Diff</button>
                    <div id="diff-metrics" style="font-family: var(--font-mono); font-size: 0.85rem; color: var(--text-muted);"></div>
                </div>

                <div class="output-box" style="margin-top: 1.25rem;">
                    <div class="output-header"><span class="output-title">Line-by-Line Difference Analysis</span></div>
                    <div id="diff-display" style="font-family: var(--font-mono); font-size: 0.85rem; line-height: 1.6;"></div>
                </div>
            </div>
        `;

        function compare() {
            const orig = container.querySelector('#diff-original').value.split('\n');
            const mod = container.querySelector('#diff-modified').value.split('\n');
            const display = container.querySelector('#diff-display');
            const metrics = container.querySelector('#diff-metrics');

            let additions = 0;
            let deletions = 0;
            let html = '';

            const max = Math.max(orig.length, mod.length);
            for (let i = 0; i < max; i++) {
                const lineO = orig[i];
                const lineM = mod[i];

                if (lineO === undefined) {
                    additions++;
                    html += `<div class="diff-output-line diff-add">+ ${escapeHtml(lineM)}</div>`;
                } else if (lineM === undefined) {
                    deletions++;
                    html += `<div class="diff-output-line diff-del">- ${escapeHtml(lineO)}</div>`;
                } else if (lineO === lineM) {
                    html += `<div class="diff-output-line diff-same">  ${escapeHtml(lineO)}</div>`;
                } else {
                    deletions++;
                    additions++;
                    html += `<div class="diff-output-line diff-del">- ${escapeHtml(lineO)}</div>`;
                    html += `<div class="diff-output-line diff-add">+ ${escapeHtml(lineM)}</div>`;
                }
            }

            display.innerHTML = html || '<div style="color: var(--text-dim); text-align: center;">Texts are identical</div>';
            metrics.innerHTML = `<span style="color: #34d399;">+${additions} added</span> &bull; <span style="color: #f87171;">-${deletions} removed</span>`;
        }

        function escapeHtml(str) {
            return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        }

        container.querySelector('#btn-run-diff').onclick = compare;
        compare();
    },

    // 31. CSS Gradient & Box Shadow Studio
    'css-generator': (container) => {
        container.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 2rem;">
                <div class="controls-panel" style="flex-direction: column; align-items: stretch; margin: 0;">
                    <h3 style="font-size: 1.1rem; margin-bottom: 0.5rem;">Gradient & Shadow Controls</h3>
                    <div class="control-group">
                        <label>Gradient Angle: <span id="css-ang-lbl" style="color: var(--accent);">135deg</span></label>
                        <input type="range" id="css-ang" min="0" max="360" value="135">
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                        <div class="control-group">
                            <label>Start Color</label>
                            <input type="color" id="css-c1" value="#00e599" style="height: 42px; cursor: pointer;">
                        </div>
                        <div class="control-group">
                            <label>End Color</label>
                            <input type="color" id="css-c2" value="#00c2ff" style="height: 42px; cursor: pointer;">
                        </div>
                    </div>
                    <div class="control-group">
                        <label>Shadow Blur: <span id="css-blur-lbl" style="color: var(--accent);">28px</span></label>
                        <input type="range" id="css-blur-in" min="0" max="80" value="28">
                    </div>
                </div>

                <div>
                    <div class="output-box" style="margin: 0; text-align: center;">
                        <div class="output-header"><span class="output-title">Live Element Preview</span></div>
                        <div id="css-target-box" style="height: 180px; border-radius: 16px; margin: 1rem 0; display: flex; align-items: center; justify-content: center; font-weight: 800; color: #060913; font-size: 1.25rem;">
                            Live CSS Preview
                        </div>
                    </div>

                    <div class="output-box" style="margin-top: 1.25rem;">
                        <div class="output-header">
                            <span class="output-title">Generated CSS Properties</span>
                            <button class="btn-secondary" id="btn-copy-css" style="padding: 0.35rem 0.75rem; font-size: 0.8rem;">📋 Copy CSS</button>
                        </div>
                        <pre class="code-pre" id="css-code-txt"></pre>
                    </div>
                </div>
            </div>
        `;

        const angIn = container.querySelector('#css-ang');
        const c1In = container.querySelector('#css-c1');
        const c2In = container.querySelector('#css-c2');
        const blurIn = container.querySelector('#css-blur-in');
        const target = container.querySelector('#css-target-box');
        const codePre = container.querySelector('#css-code-txt');

        function update() {
            const ang = angIn.value;
            const c1 = c1In.value;
            const c2 = c2In.value;
            const blur = blurIn.value;

            container.querySelector('#css-ang-lbl').textContent = `${ang}deg`;
            container.querySelector('#css-blur-lbl').textContent = `${blur}px`;

            const grad = `linear-gradient(${ang}deg, ${c1} 0%, ${c2} 100%)`;
            const shadow = `0 12px ${blur}px rgba(0, 229, 153, 0.35)`;

            target.style.background = grad;
            target.style.boxShadow = shadow;

            const css = `background: ${grad};\nbox-shadow: ${shadow};\nborder-radius: 16px;`;
            codePre.textContent = css;
        }

        container.querySelectorAll('input').forEach(i => i.oninput = update);
        container.querySelector('#btn-copy-css').onclick = (e) => Utils.copyToClipboard(codePre.textContent, e.target);
        update();
    },

    // 09. Image Cropper & Aspect Ratio Tool
    'image-crop': (container) => {
        container.innerHTML = `
            <div style="max-width: 900px; margin: 0 auto;">
                <div class="dropzone" id="crop-dropzone">
                    <div class="dropzone-icon">✂️</div>
                    <div class="dropzone-title">Upload Image to Crop</div>
                    <div class="dropzone-subtitle">Supported formats: JPG, PNG, WebP</div>
                    <input type="file" id="crop-file" accept="image/*" style="display: none;">
                    <button class="dropzone-btn" onclick="document.getElementById('crop-file').click()">Choose Image</button>
                </div>

                <div id="crop-workspace" style="display: none; margin-top: 1.5rem;">
                    <div class="controls-panel" style="gap: 0.75rem; align-items: center;">
                        <span style="font-weight: 700; font-size: 0.85rem; color: var(--text-muted);">RATIO:</span>
                        <button class="pill-btn active" data-r="1">1:1 (Square)</button>
                        <button class="pill-btn" data-r="1.777">16:9 (Landscape)</button>
                        <button class="pill-btn" data-r="1.333">4:3 (Standard)</button>
                        <button class="pill-btn" data-r="0.5625">9:16 (Story)</button>
                        <button class="btn-primary" id="btn-save-crop" style="margin-left: auto;">💾 Download Cropped Image</button>
                    </div>
                    <div style="background: #020617; border-radius: var(--radius-md); padding: 1rem; display: flex; justify-content: center; align-items: center; min-height: 320px;">
                        <canvas id="crop-canvas" style="max-width: 100%; max-height: 450px; border: 1.5px dashed var(--accent);"></canvas>
                    </div>
                </div>
            </div>
        `;

        let activeImg = null;
        let activeRatio = 1.0;

        const fileIn = container.querySelector('#crop-file');
        const workspace = container.querySelector('#crop-workspace');
        const canvas = container.querySelector('#crop-canvas');
        const ctx = canvas.getContext('2d');

        function renderCrop() {
            if (!activeImg) return;
            const imgW = activeImg.width;
            const imgH = activeImg.height;

            let targetW, targetH;
            if (imgW / imgH > activeRatio) {
                targetH = imgH;
                targetW = imgH * activeRatio;
            } else {
                targetW = imgW;
                targetH = imgW / activeRatio;
            }

            const startX = (imgW - targetW) / 2;
            const startY = (imgH - targetH) / 2;

            canvas.width = targetW;
            canvas.height = targetH;
            ctx.drawImage(activeImg, startX, startY, targetW, targetH, 0, 0, targetW, targetH);
        }

        fileIn.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (re) => {
                const img = new Image();
                img.onload = () => {
                    activeImg = img;
                    workspace.style.display = 'block';
                    renderCrop();
                };
                img.src = re.target.result;
            };
            reader.readAsDataURL(file);
        };

        container.querySelectorAll('.pill-btn').forEach(btn => {
            btn.onclick = () => {
                container.querySelectorAll('.pill-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                activeRatio = parseFloat(btn.dataset.r) || 1;
                renderCrop();
            };
        });

        container.querySelector('#btn-save-crop').onclick = () => {
            const a = document.createElement('a');
            a.href = canvas.toDataURL('image/png');
            a.download = `cropped_image_${Date.now()}.png`;
            a.click();
        };
    },

    // 10. Image Color Picker & Palette Extractor
    'image-color-picker': (container) => {
        container.innerHTML = `
            <div style="max-width: 900px; margin: 0 auto;">
                <div class="dropzone" id="picker-dropzone">
                    <div class="dropzone-icon">🎨</div>
                    <div class="dropzone-title">Upload Image to Extract Palette</div>
                    <div class="dropzone-subtitle">Hover over any pixel to inspect color codes or generate dominant palette</div>
                    <input type="file" id="picker-file" accept="image/*" style="display: none;">
                    <button class="dropzone-btn" onclick="document.getElementById('picker-file').click()">Select Image</button>
                </div>

                <div id="picker-workspace" style="display: none; margin-top: 1.5rem;">
                    <div style="display: flex; gap: 1.25rem; align-items: center; background: #0f172a; padding: 1rem 1.5rem; border-radius: var(--radius-md); margin-bottom: 1.25rem; border: 1px solid var(--border-dim);">
                        <div id="swatch-hover" style="width: 50px; height: 50px; border-radius: 8px; border: 2px solid white; background: #00e599; flex-shrink: 0;"></div>
                        <div>
                            <div style="font-size: 0.72rem; color: var(--text-dim); text-transform: uppercase;">Hovered Pixel</div>
                            <div id="hex-hover" style="font-size: 1.35rem; font-weight: 800; font-family: var(--font-mono); color: var(--text-main);">#00E599</div>
                            <div id="rgb-hover" style="font-size: 0.8rem; color: var(--text-muted); font-family: var(--font-mono);">rgb(0, 229, 153)</div>
                        </div>
                        <button class="btn-secondary" id="btn-copy-hover" style="margin-left: auto; font-size: 0.82rem;">Copy HEX</button>
                    </div>

                    <div style="text-align: center; background: #020617; padding: 1rem; border-radius: var(--radius-md); overflow: auto; max-height: 450px;">
                        <canvas id="picker-canvas" style="cursor: crosshair; max-width: 100%;"></canvas>
                    </div>

                    <div class="output-box" style="margin-top: 1.5rem;">
                        <div class="output-header"><span class="output-title">Dominant 6-Color Palette (Click to Copy)</span></div>
                        <div class="palette-grid" id="palette-chips"></div>
                    </div>
                </div>
            </div>
        `;

        const fileIn = container.querySelector('#picker-file');
        const workspace = container.querySelector('#picker-workspace');
        const canvas = container.querySelector('#picker-canvas');
        const ctx = canvas.getContext('2d');
        const swatch = container.querySelector('#swatch-hover');
        const hexTxt = container.querySelector('#hex-hover');
        const rgbTxt = container.querySelector('#rgb-hover');
        const copyBtn = container.querySelector('#btn-copy-hover');
        const paletteChips = container.querySelector('#palette-chips');

        fileIn.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (re) => {
                const img = new Image();
                img.onload = () => {
                    workspace.style.display = 'block';
                    canvas.width = img.width;
                    canvas.height = img.height;
                    ctx.drawImage(img, 0, 0);

                    // Extract dominant palette
                    const step = Math.max(1, Math.floor((img.width * img.height) / 500));
                    const imgData = ctx.getImageData(0, 0, img.width, img.height).data;
                    const samples = [];
                    for (let i = 0; i < imgData.length; i += step * 4) {
                        const r = imgData[i], g = imgData[i + 1], b = imgData[i + 2], a = imgData[i + 3];
                        if (a > 128) samples.push({ r, g, b });
                    }

                    // Pick 6 distinct colors
                    const palette = [];
                    for (let s of samples) {
                        if (palette.length >= 6) break;
                        const isDistinct = palette.every(p => Math.hypot(p.r - s.r, p.g - s.g, p.b - s.b) > 45);
                        if (isDistinct) palette.push(s);
                    }

                    paletteChips.innerHTML = palette.map(p => {
                        const hex = `#${((1 << 24) + (p.r << 16) + (p.g << 8) + p.b).toString(16).slice(1).toUpperCase()}`;
                        return `
                            <div class="palette-chip" onclick="Utils.copyToClipboard('${hex}', this)" title="Click to copy ${hex}">
                                <div class="palette-swatch" style="background: ${hex};"></div>
                                <div class="palette-info">
                                    <div class="palette-hex">${hex}</div>
                                    <div class="palette-rgb">rgb(${p.r}, ${p.g}, ${p.b})</div>
                                </div>
                            </div>
                        `;
                    }).join('');
                };
                img.src = re.target.result;
            };
            reader.readAsDataURL(file);
        };

        canvas.onmousemove = (e) => {
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            const x = Math.floor((e.clientX - rect.left) * scaleX);
            const y = Math.floor((e.clientY - rect.top) * scaleY);

            const pixel = ctx.getImageData(x, y, 1, 1).data;
            const hex = `#${((1 << 24) + (pixel[0] << 16) + (pixel[1] << 8) + pixel[2]).toString(16).slice(1).toUpperCase()}`;
            const rgb = `rgb(${pixel[0]}, ${pixel[1]}, ${pixel[2]})`;

            swatch.style.background = hex;
            hexTxt.textContent = hex;
            rgbTxt.textContent = rgb;
        };

        copyBtn.onclick = (e) => Utils.copyToClipboard(hexTxt.textContent, e.target);
    },

    // Extra utility tools added for the expanded FastTrack suite
    'percentage-calculator': (container) => {
        container.innerHTML = basicToolShell('Percentage Calculator', `
            <div class="tool-form-grid">
                <div class="control-group"><label>Original / Base Value</label><input type="number" id="pct-base" value="100"></div>
                <div class="control-group"><label>New / Compared Value</label><input type="number" id="pct-new" value="125"></div>
                <div class="control-group"><label>Percent Value</label><input type="number" id="pct-percent" value="15"></div>
            </div>
            <div class="result-grid" id="pct-results"></div>`);
        const out = container.querySelector('#pct-results');
        function calc(){ const b=+container.querySelector('#pct-base').value||0,n=+container.querySelector('#pct-new').value||0,p=+container.querySelector('#pct-percent').value||0; const change=b?((n-b)/b*100):0; out.innerHTML = metricCards([
            ['Change', `${change.toFixed(2)}%`], ['${p}% of ${b}', fmt(b*p/100)], ['${b} + ${p}%', fmt(b*(1+p/100))], ['Reverse from ${n} after ${p}%', fmt(n/(1+p/100))]
        ]); }
        container.querySelectorAll('input').forEach(i=>i.oninput=calc); calc();
    },

    'loan-calculator': (container) => {
        container.innerHTML = basicToolShell('Loan EMI Calculator', `
            <div class="tool-form-grid">
                <div class="control-group"><label>Loan Amount</label><input type="number" id="loan-p" value="100000"></div>
                <div class="control-group"><label>Annual Interest %</label><input type="number" id="loan-r" value="7.5" step="0.1"></div>
                <div class="control-group"><label>Term (months)</label><input type="number" id="loan-m" value="60"></div>
            </div><div class="result-grid" id="loan-out"></div>`);
        const out=container.querySelector('#loan-out'); function calc(){const P=+container.querySelector('#loan-p').value||0; const r=(+container.querySelector('#loan-r').value||0)/1200; const m=+container.querySelector('#loan-m').value||1; const emi=r?P*r*Math.pow(1+r,m)/(Math.pow(1+r,m)-1):P/m; const total=emi*m; out.innerHTML=metricCards([['Monthly Payment', money(emi)],['Total Interest', money(total-P)],['Total Repayment', money(total)],['Interest Share', `${P ? ((total-P)/P*100).toFixed(1) : 0}%`]]);} container.querySelectorAll('input').forEach(i=>i.oninput=calc); calc();
    },

    'salary-converter': (container) => {
        container.innerHTML = basicToolShell('Salary Converter', `
            <div class="tool-form-grid"><div class="control-group"><label>Hourly Rate</label><input type="number" id="sal-hour" value="25"></div><div class="control-group"><label>Hours / Week</label><input type="number" id="sal-hours" value="40"></div><div class="control-group"><label>Weeks / Year</label><input type="number" id="sal-weeks" value="52"></div></div><div class="result-grid" id="sal-out"></div>`);
        const out=container.querySelector('#sal-out'); function calc(){const h=+container.querySelector('#sal-hour').value||0, hw=+container.querySelector('#sal-hours').value||0, w=+container.querySelector('#sal-weeks').value||0; const annual=h*hw*w; out.innerHTML=metricCards([['Annual', money(annual)],['Monthly', money(annual/12)],['Weekly', money(h*hw)],['Daily (5 days)', money(h*hw/5)]]);} container.querySelectorAll('input').forEach(i=>i.oninput=calc); calc();
    },

    'vat-invoice-calculator': (container) => {
        container.innerHTML = basicToolShell('VAT Invoice Line Calculator', `<div class="tool-form-grid"><div class="control-group"><label>Quantity</label><input type="number" id="vat-qty" value="5"></div><div class="control-group"><label>Unit Price</label><input type="number" id="vat-price" value="120"></div><div class="control-group"><label>Discount %</label><input type="number" id="vat-disc" value="0"></div><div class="control-group"><label>VAT %</label><input type="number" id="vat-rate" value="15"></div></div><div class="result-grid" id="vat-out"></div>`);
        const out=container.querySelector('#vat-out'); function calc(){const q=+qs('#vat-qty').value||0, price=+qs('#vat-price').value||0, d=+qs('#vat-disc').value||0, vr=+qs('#vat-rate').value||0; const sub=q*price, disc=sub*d/100, taxable=sub-disc, vat=taxable*vr/100; out.innerHTML=metricCards([['Subtotal', money(sub)],['Discount', money(disc)],['VAT', money(vat)],['Grand Total', money(taxable+vat)]]);} const qs=s=>container.querySelector(s); container.querySelectorAll('input').forEach(i=>i.oninput=calc); calc();
    },

    'timestamp-converter': (container) => {
        container.innerHTML = basicToolShell('Timestamp Converter', `<div class="tool-form-grid"><div class="control-group"><label>Unix Timestamp</label><input id="ts-input" value="${Math.floor(Date.now()/1000)}"></div><div class="control-group"><label>Date / Time</label><input type="datetime-local" id="date-input"></div></div><div class="controls-panel"><button class="btn-primary" id="ts-now">Use Current Time</button></div><pre class="code-pre" id="ts-out"></pre>`);
        const ts=container.querySelector('#ts-input'), di=container.querySelector('#date-input'), out=container.querySelector('#ts-out'); function fromTs(){let v=Number(ts.value); if(String(ts.value).length>10) v=v/1000; const d=new Date(v*1000); out.textContent=`Local: ${d.toString()}\nUTC: ${d.toUTCString()}\nISO: ${d.toISOString()}\nSeconds: ${Math.floor(d.getTime()/1000)}\nMilliseconds: ${d.getTime()}`;} function fromDate(){const d=new Date(di.value); if(!isNaN(d)){ts.value=Math.floor(d.getTime()/1000); fromTs();}} ts.oninput=fromTs; di.oninput=fromDate; container.querySelector('#ts-now').onclick=()=>{ts.value=Math.floor(Date.now()/1000); fromTs();}; fromTs();
    },

    'cron-helper': (container) => {
        container.innerHTML = basicToolShell('Cron Helper', `<div class="tool-form-grid"><div class="control-group"><label>Common Schedule</label><select id="cron-preset"><option value="*/5 * * * *|Every 5 minutes">Every 5 minutes</option><option value="0 * * * *|Every hour">Every hour</option><option value="0 9 * * *|Every day at 9:00">Every day at 9 AM</option><option value="0 9 * * 1|Every Monday at 9:00">Every Monday</option><option value="0 0 1 * *|First day of every month">Monthly</option></select></div><div class="control-group"><label>Cron Expression</label><input id="cron-exp"></div></div><pre class="code-pre" id="cron-out"></pre>`);
        const preset=container.querySelector('#cron-preset'), exp=container.querySelector('#cron-exp'), out=container.querySelector('#cron-out'); function apply(){const [e,desc]=preset.value.split('|'); exp.value=e; out.textContent=`${e}\n${desc}\n\nFormat: minute hour day-of-month month day-of-week`; } preset.onchange=apply; exp.oninput=()=>{out.textContent=`${exp.value}\nCustom cron expression\n\nFormat: minute hour day-of-month month day-of-week`;}; apply();
    },

    'regex-tester': (container) => {
        container.innerHTML = basicToolShell('Regex Tester', `<div class="tool-form-grid"><div class="control-group"><label>Pattern</label><input id="rx-pattern" value="\\b\\w+@\\w+\\.\\w+\\b"></div><div class="control-group"><label>Flags</label><input id="rx-flags" value="gi"></div></div><textarea id="rx-text" class="code-area" style="height:160px;">Email test@example.com or sales@company.com for details.</textarea><div class="output-box"><div class="output-header"><span class="output-title" id="rx-count">Matches</span></div><div id="rx-out"></div></div>`);
        const pat=container.querySelector('#rx-pattern'), flags=container.querySelector('#rx-flags'), txt=container.querySelector('#rx-text'), out=container.querySelector('#rx-out'), count=container.querySelector('#rx-count'); function run(){try{const re=new RegExp(pat.value, flags.value); let m=[...txt.value.matchAll(re)]; count.textContent=`${m.length} match(es)`; out.innerHTML=m.map(x=>`<div class="result-line"><code>${escapeHtml(x[0])}</code> at index ${x.index}</div>`).join('')||'<p class="muted">No matches.</p>';}catch(e){count.textContent='Regex error'; out.textContent=e.message;}} [pat,flags,txt].forEach(i=>i.oninput=run); run();
    },

    'url-encoder': (container) => textTransformTool(container, 'URL Encoder & Slugifier', 'Enter URL text or a page title...', [
        ['Encode URL', v => encodeURIComponent(v)], ['Decode URL', v => decodeURIComponent(v)], ['Slugify', v => v.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')]
    ]),

    'utm-builder': (container) => {
        container.innerHTML = basicToolShell('UTM Campaign Builder', `<div class="tool-form-grid"><div class="control-group"><label>Base URL</label><input id="utm-url" value="https://example.com/page"></div><div class="control-group"><label>Source</label><input id="utm-source" value="google"></div><div class="control-group"><label>Medium</label><input id="utm-medium" value="cpc"></div><div class="control-group"><label>Campaign</label><input id="utm-campaign" value="summer_offer"></div><div class="control-group"><label>Term</label><input id="utm-term"></div><div class="control-group"><label>Content</label><input id="utm-content"></div></div><pre class="code-pre" id="utm-out"></pre><button class="btn-primary" id="utm-copy">Copy URL</button>`);
        const out=container.querySelector('#utm-out'); function build(){try{const u=new URL(container.querySelector('#utm-url').value); ['source','medium','campaign','term','content'].forEach(k=>{const v=container.querySelector(`#utm-${k}`).value.trim(); if(v) u.searchParams.set(`utm_${k}`,v);}); out.textContent=u.toString();}catch(e){out.textContent='Enter a valid full URL.';}} container.querySelectorAll('input').forEach(i=>i.oninput=build); container.querySelector('#utm-copy').onclick=e=>Utils.copyToClipboard(out.textContent,e.target); build();
    },

    'color-converter': (container) => {
        container.innerHTML = basicToolShell('Color Converter', `<div class="tool-form-grid"><div class="control-group"><label>Color</label><input type="color" id="col-pick" value="#00e599"></div><div class="control-group"><label>HEX</label><input id="col-hex" value="#00e599"></div></div><div id="col-preview" style="height:120px;border-radius:16px;border:1px solid var(--border-color);"></div><pre class="code-pre" id="col-out"></pre>`);
        const pick=container.querySelector('#col-pick'), hex=container.querySelector('#col-hex'), prev=container.querySelector('#col-preview'), out=container.querySelector('#col-out'); function conv(v){v=v.replace('#',''); if(v.length===3)v=v.split('').map(c=>c+c).join(''); const n=parseInt(v,16); const r=(n>>16)&255,g=(n>>8)&255,b=n&255; const max=Math.max(r,g,b)/255,min=Math.min(r,g,b)/255,l=(max+min)/2; const d=max-min; let h=0,s=0; if(d){s=d/(1-Math.abs(2*l-1)); const rr=r/255,gg=g/255,bb=b/255; h=max===rr?((gg-bb)/d)%6:max===gg?(bb-rr)/d+2:(rr-gg)/d+4; h=Math.round(h*60); if(h<0)h+=360;} return {r,g,b,h,s:Math.round(s*100),l:Math.round(l*100)};} function update(){const c=conv(hex.value); pick.value='#'+hex.value.replace('#','').padStart(6,'0').slice(0,6); prev.style.background=pick.value; out.textContent=`HEX: ${pick.value}\nRGB: rgb(${c.r}, ${c.g}, ${c.b})\nHSL: hsl(${c.h}, ${c.s}%, ${c.l}%)`; } pick.oninput=()=>{hex.value=pick.value;update();}; hex.oninput=update; update();
    },

    'html-entity-tools': (container) => textTransformTool(container, 'HTML Entity Encoder & Decoder', 'Paste HTML or encoded text...', [
        ['Encode HTML', v => escapeHtml(v)], ['Decode HTML', v => { const t=document.createElement('textarea'); t.innerHTML=v; return t.value; }]
    ]),

    'text-cleaner': (container) => textTransformTool(container, 'Text Cleaner', 'Paste messy copied text...', [
        ['Trim Spaces', v => v.split('\n').map(l=>l.trim().replace(/\s+/g,' ')).join('\n').trim()], ['Remove Blank Lines', v => v.split('\n').filter(l=>l.trim()).join('\n')], ['Remove Duplicate Lines', v => [...new Set(v.split('\n'))].join('\n')], ['Tabs to Spaces', v => v.replace(/\t/g,'    ')]
    ]),

    'csv-table-converter': (container) => {
        container.innerHTML = basicToolShell('CSV Table Converter', `<textarea id="csv-in" class="code-area" style="height:150px;">Name,Qty,Price\nCoffee,2,15\nTea,4,8</textarea><div class="controls-panel"><button class="btn-primary" id="csv-md">Markdown</button><button class="btn-secondary" id="csv-html">HTML</button></div><pre class="code-pre" id="csv-out"></pre>`);
        const input=container.querySelector('#csv-in'), out=container.querySelector('#csv-out'); const rows=()=>input.value.trim().split(/\r?\n/).map(r=>r.split(',').map(c=>c.trim())); function md(){const r=rows(); if(!r.length)return; out.textContent='| '+r[0].join(' | ')+' |\n| '+r[0].map(()=> '---').join(' | ')+' |\n'+r.slice(1).map(x=>'| '+x.join(' | ')+' |').join('\n');} function html(){const r=rows(); out.textContent='<table>\n  <thead><tr>'+r[0].map(c=>`<th>${escapeHtml(c)}</th>`).join('')+'</tr></thead>\n  <tbody>\n'+r.slice(1).map(x=>'    <tr>'+x.map(c=>`<td>${escapeHtml(c)}</td>`).join('')+'</tr>').join('\n')+'\n  </tbody>\n</table>'; } container.querySelector('#csv-md').onclick=md; container.querySelector('#csv-html').onclick=html; input.oninput=md; md();
    },

    'random-picker': (container) => {
        container.innerHTML = basicToolShell('Random Picker', `<textarea id="rand-list" class="code-area" style="height:150px;">Ahmed\nRayhan\nSara\nMohammed\nFatima</textarea><div class="tool-form-grid"><div class="control-group"><label>Teams</label><input type="number" id="rand-teams" value="2" min="1"></div><div class="control-group"><label>Min Number</label><input type="number" id="rand-min" value="1"></div><div class="control-group"><label>Max Number</label><input type="number" id="rand-max" value="100"></div></div><div class="controls-panel"><button class="btn-primary" id="rand-pick">Pick One</button><button class="btn-secondary" id="rand-shuffle">Shuffle</button><button class="btn-secondary" id="rand-team">Split Teams</button><button class="btn-secondary" id="rand-num">Random Number</button></div><pre class="code-pre" id="rand-out"></pre>`);
        const list=()=>container.querySelector('#rand-list').value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean); const out=container.querySelector('#rand-out'); const shuffle=a=>a.map(v=>[Math.random(),v]).sort((a,b)=>a[0]-b[0]).map(x=>x[1]); container.querySelector('#rand-pick').onclick=()=>{const a=list(); out.textContent=a[Math.floor(Math.random()*a.length)]||'Add names first.'}; container.querySelector('#rand-shuffle').onclick=()=>out.textContent=shuffle(list()).join('\n'); container.querySelector('#rand-team').onclick=()=>{const a=shuffle(list()), n=+container.querySelector('#rand-teams').value||2; out.textContent=Array.from({length:n},(_,i)=>`Team ${i+1}: ${a.filter((_,idx)=>idx%n===i).join(', ')}`).join('\n');}; container.querySelector('#rand-num').onclick=()=>{const min=+container.querySelector('#rand-min').value||0,max=+container.querySelector('#rand-max').value||100; out.textContent=String(Math.floor(Math.random()*(max-min+1))+min);};
    },

    'date-calculator': (container) => {
        container.innerHTML = basicToolShell('Date Calculator', `<div class="tool-form-grid"><div class="control-group"><label>Start Date</label><input type="date" id="date-a"></div><div class="control-group"><label>End Date</label><input type="date" id="date-b"></div><div class="control-group"><label>Add Days</label><input type="number" id="date-add" value="30"></div></div><div class="result-grid" id="date-out"></div>`);
        const a=container.querySelector('#date-a'), b=container.querySelector('#date-b'), add=container.querySelector('#date-add'), out=container.querySelector('#date-out'); a.value=new Date().toISOString().slice(0,10); b.value=new Date(Date.now()+7*864e5).toISOString().slice(0,10); function calc(){const da=new Date(a.value), db=new Date(b.value); const days=Math.round((db-da)/864e5); const future=new Date(da.getTime()+(+add.value||0)*864e5); out.innerHTML=metricCards([['Days Between', String(days)],['Weeks', (days/7).toFixed(2)],['After Added Days', future.toISOString().slice(0,10)],['Start Weekday', da.toLocaleDateString(undefined,{weekday:'long'})]]);} [a,b,add].forEach(i=>i.oninput=calc); calc();
    },

    'spin-wheel-excel': (container) => {
        container.innerHTML = basicToolShell('Excel Spin Wheel Picker', `
            <div class="spin-import-grid">
                <div class="spin-panel">
                    <h3>1. Prepare list</h3>
                    <p class="muted">Download the template, fill Name, Department, Property, Group, Phone, and Notes, then upload CSV or XLSX.</p>
                    <div class="controls-panel">
                        <a class="btn-primary" href="/tools/api/spin-wheel/template">Download Excel Template</a>
                        <label class="btn-secondary" style="cursor:pointer;">Upload Excel/CSV<input type="file" id="spin-file" accept=".xlsx,.csv,.tsv,text/csv" style="display:none;"></label>
                    </div>
                    <textarea id="spin-manual" class="code-area" style="height:120px;" placeholder="Or add names manually, one per line..."></textarea>
                    <button class="btn-secondary" id="spin-add-manual">Add Manual Names</button>
                </div>
                <div class="spin-panel">
                    <h3>2. Filter before spin</h3>
                    <div class="tool-form-grid">
                        <div class="control-group"><label>Department</label><select id="spin-dept"><option value="">All</option></select></div>
                        <div class="control-group"><label>Property</label><select id="spin-property"><option value="">All</option></select></div>
                        <div class="control-group"><label>Group / Other</label><select id="spin-group"><option value="">All</option></select></div>
                    </div>
                    <div class="result-grid" id="spin-stats"></div>
                </div>
            </div>
            <div class="spin-wheel-layout">
                <div class="spin-wheel-wrap">
                    <canvas id="spin-canvas" width="520" height="520"></canvas>
                    <button class="btn-primary spin-main-btn" id="spin-btn">SPIN</button>
                </div>
                <div class="spin-panel">
                    <h3>Ready Entries</h3>
                    <div id="spin-list" class="spin-entry-list"></div>
                    <h3>Winner History</h3>
                    <div id="spin-history" class="spin-history"></div>
                </div>
            </div>
        `);
        let people = [
            {name:'Rayhan', department:'Maintenance', property:'Marriott Riyadh', group:'Team A', phone:'+966 57 748 4238', notes:'Sample'},
            {name:'Ahmed', department:'Purchasing', property:'Courtyard', group:'Team B', phone:'', notes:''},
            {name:'Sara', department:'Finance', property:'Head Office', group:'Team A', phone:'', notes:''},
            {name:'Mohammed', department:'Operations', property:'Marriott Riyadh', group:'Team C', phone:'', notes:''}
        ];
        let angle = 0;
        let spinning = false;
        const canvas = container.querySelector('#spin-canvas');
        const ctx = canvas.getContext('2d');
        const colors = ['#00e599','#22d3ee','#f59e0b','#ec4899','#8b5cf6','#ef4444','#14b8a6','#a3e635'];
        const clean = v => String(v || '').trim();
        const unique = key => [...new Set(people.map(p => clean(p[key])).filter(Boolean))].sort();
        function fillSelect(id, values) {
            const el = container.querySelector(id);
            const current = el.value;
            el.innerHTML = '<option value="">All</option>' + values.map(v => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join('');
            el.value = values.includes(current) ? current : '';
        }
        function filtered() {
            const dept = container.querySelector('#spin-dept').value;
            const property = container.querySelector('#spin-property').value;
            const group = container.querySelector('#spin-group').value;
            return people.filter(p => (!dept || p.department === dept) && (!property || p.property === property) && (!group || p.group === group));
        }
        function refreshFilters() {
            fillSelect('#spin-dept', unique('department'));
            fillSelect('#spin-property', unique('property'));
            fillSelect('#spin-group', unique('group'));
            render();
        }
        function render() {
            const entries = filtered();
            container.querySelector('#spin-stats').innerHTML = metricCards([
                ['Total Loaded', people.length], ['Ready to Spin', entries.length], ['Departments', unique('department').length], ['Properties', unique('property').length]
            ]);
            container.querySelector('#spin-list').innerHTML = entries.slice(0, 100).map((p, i) => `<div class="spin-entry"><strong>${i + 1}. ${escapeHtml(p.name)}</strong><span>${escapeHtml([p.department, p.property, p.group].filter(Boolean).join(' • '))}</span></div>`).join('') || '<p class="muted">No entries match the filters.</p>';
            draw(entries);
        }
        function draw(entries) {
            const w = canvas.width, h = canvas.height, cx = w / 2, cy = h / 2, r = Math.min(w, h) / 2 - 12;
            ctx.clearRect(0, 0, w, h);
            if (!entries.length) {
                ctx.fillStyle = '#0f172a'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#fff'; ctx.font = '800 24px Inter, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('Upload names to spin', cx, cy);
                return;
            }
            const slice = Math.PI * 2 / entries.length;
            entries.forEach((p, i) => {
                const start = angle + i * slice, end = start + slice;
                ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r, start, end); ctx.closePath(); ctx.fillStyle = colors[i % colors.length]; ctx.fill();
                ctx.save(); ctx.translate(cx, cy); ctx.rotate(start + slice / 2); ctx.textAlign = 'right'; ctx.fillStyle = '#06111f'; ctx.font = '800 15px Inter, sans-serif'; ctx.fillText(p.name.slice(0, 26), r - 18, 5); ctx.restore();
            });
            ctx.beginPath(); ctx.arc(cx, cy, 50, 0, Math.PI * 2); ctx.fillStyle = '#020617'; ctx.fill(); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.font = '900 16px Inter, sans-serif'; ctx.fillText('SPIN', cx, cy + 6);
            ctx.beginPath(); ctx.moveTo(cx + 6, 10); ctx.lineTo(cx - 18, 50); ctx.lineTo(cx + 30, 50); ctx.closePath(); ctx.fillStyle = '#fff'; ctx.fill();
        }
        function winnerFor(entries) {
            const pointer = (Math.PI * 1.5 - (angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
            return entries[Math.floor(pointer / (Math.PI * 2 / entries.length)) % entries.length];
        }
        container.querySelector('#spin-btn').onclick = () => {
            const entries = filtered();
            if (spinning || !entries.length) return;
            spinning = true;
            const start = performance.now(), startAngle = angle, spinFor = 3200, extra = (7 + Math.random() * 4) * Math.PI * 2 + Math.random() * Math.PI * 2;
            function tick(now) {
                const t = Math.min(1, (now - start) / spinFor);
                angle = startAngle + (1 - Math.pow(1 - t, 4)) * extra;
                draw(entries);
                if (t < 1) requestAnimationFrame(tick);
                else {
                    spinning = false;
                    const winner = winnerFor(entries);
                    const msg = `${winner.name}${winner.department ? ' — ' + winner.department : ''}${winner.property ? ' / ' + winner.property : ''}`;
                    const phone = clean(winner.phone).replace(/\D/g, '');
                    container.querySelector('#spin-history').insertAdjacentHTML('afterbegin', `<div class="winner-card">🏆 <strong>${escapeHtml(msg)}</strong>${phone ? `<br><a href="tel:+${phone}">Call</a> <a href="https://wa.me/${phone}" target="_blank" rel="noopener">WhatsApp</a>` : ''}</div>`);
                    alert('Winner: ' + msg);
                }
            }
            requestAnimationFrame(tick);
        };
        container.querySelector('#spin-file').onchange = async (event) => {
            const file = event.target.files[0];
            if (!file) return;
            const fd = new FormData();
            fd.append('file', file);
            const res = await fetch('/tools/api/spin-wheel/import', { method: 'POST', body: fd });
            const data = await res.json();
            if (data.status !== 'success') { alert(data.message || 'Import failed'); return; }
            people = data.people.map(p => ({ name: clean(p.name), department: clean(p.department), property: clean(p.property), group: clean(p.group), phone: clean(p.phone), notes: clean(p.notes) })).filter(p => p.name);
            refreshFilters();
        };
        container.querySelector('#spin-add-manual').onclick = () => {
            const names = container.querySelector('#spin-manual').value.split(/\r?\n/).map(clean).filter(Boolean);
            people = people.concat(names.map(name => ({ name, department: 'Manual', property: '', group: 'Manual', phone: '', notes: '' })));
            container.querySelector('#spin-manual').value = '';
            refreshFilters();
        };
        ['#spin-dept', '#spin-property', '#spin-group'].forEach(id => container.querySelector(id).onchange = render);
        refreshFilters();
    }

};

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));
}
function money(value) { return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(Number.isFinite(value) ? value : 0); }
function fmt(value) { return Number.isFinite(value) ? Number(value).toLocaleString(undefined, { maximumFractionDigits: 4 }) : '0'; }
function metricCards(items) {
    return items.map(([label, value]) => `<div class="metric-card"><div class="metric-label">${escapeHtml(label)}</div><div class="metric-value">${escapeHtml(value)}</div></div>`).join('');
}
function basicToolShell(title, body) {
    return `<div style="max-width: 980px; margin: 0 auto;"><div class="output-box" style="margin-bottom:1rem;"><div class="output-header"><span class="output-title">${escapeHtml(title)}</span></div>${body}</div></div>`;
}
function textTransformTool(container, title, placeholder, actions) {
    container.innerHTML = basicToolShell(title, `<textarea id="tt-in" class="code-area" style="height:160px;" placeholder="${escapeHtml(placeholder)}"></textarea><div class="controls-panel" id="tt-actions"></div><pre class="code-pre" id="tt-out"></pre><button class="btn-primary" id="tt-copy" style="margin-top: .75rem;">Copy Result</button>`);
    const input = container.querySelector('#tt-in');
    const out = container.querySelector('#tt-out');
    const actionsBox = container.querySelector('#tt-actions');
    actionsBox.innerHTML = actions.map(([label], i) => `<button class="${i === 0 ? 'btn-primary' : 'btn-secondary'}" data-action="${i}">${escapeHtml(label)}</button>`).join('');
    function run(fn) { try { out.textContent = fn(input.value); } catch (e) { out.textContent = e.message; } }
    actionsBox.querySelectorAll('button').forEach(btn => btn.onclick = () => run(actions[Number(btn.dataset.action)][1]));
    input.oninput = () => run(actions[0][1]);
    container.querySelector('#tt-copy').onclick = e => Utils.copyToClipboard(out.textContent, e.target);
    input.value = placeholder.includes('URL') ? 'https://example.com/a page?q=hello world' : 'Paste <strong>text</strong> & clean it here.';
    run(actions[0][1]);
}



