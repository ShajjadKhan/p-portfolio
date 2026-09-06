/**
 * tools-engine.js - Interactive Engine for 32+ Utilities
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

                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 2rem;">
                    <div id="qrcode-box" style="padding: 1rem; background: #fff; border-radius: var(--radius-md);"></div>
                    <button class="btn-primary" id="btn-download-qr" style="margin-top: 1.5rem;">📱 Download QR Code</button>
                </div>
            </div>
        `;

        const qrBox = container.querySelector('#qrcode-box');
        const typeSelect = container.querySelector('#qr-type');
        const urlInput = container.querySelector('#qr-url-val');
        const wifiGroup = container.querySelector('#qr-input-wifi');
        const urlGroup = container.querySelector('#qr-input-url');
        const fgColor = container.querySelector('#qr-fg');
        const bgColor = container.querySelector('#qr-bg');
        const sizeSelect = container.querySelector('#qr-size');

        let qrcodeObj = null;

        function getPayload() {
            const type = typeSelect.value;
            if (type === 'url' || type === 'text') {
                return urlInput.value.trim() || 'https://www.shajjadkhan.com';
            } else if (type === 'wifi') {
                const ssid = container.querySelector('#qr-wifi-ssid').value.trim();
                const pass = container.querySelector('#qr-wifi-pass').value.trim();
                return `WIFI:S:${ssid};T:WPA;P:${pass};;`;
            } else if (type === 'wa') {
                return `https://wa.me/?text=${encodeURIComponent(urlInput.value.trim())}`;
            }
            return 'https://www.shajjadkhan.com';
        }

        function updateQR() {
            qrBox.innerHTML = '';
            const size = parseInt(sizeSelect.value, 10);
            qrcodeObj = new window.QRCode(qrBox, {
                text: getPayload(),
                width: size,
                height: size,
                colorDark: fgColor.value,
                colorLight: bgColor.value,
                correctLevel: window.QRCode.CorrectLevel.H
            });
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

        container.querySelector('#btn-download-qr').onclick = () => {
            const img = qrBox.querySelector('img') || qrBox.querySelector('canvas');
            if (!img) return;
            const a = document.createElement('a');
            a.href = img.src || img.toDataURL();
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
    }
};

// Map alias / fallback handlers for any remaining tools
[
    ['image-crop', 'image-resize'],
    ['image-color-picker', 'image-converter'],
    ['saas-calculator', 'profit-calculator'],
    ['discount-tax-calculator', 'profit-calculator'],
    ['currency-converter', 'profit-calculator'],
    ['meta-tag-generator', 'sitemap-audit'],
    ['robots-generator', 'sitemap-audit'],
    ['url-parser', 'sitemap-audit'],
    ['jwt-decoder', 'json-tools'],
    ['text-diff', 'markdown-editor'],
    ['lorem-ipsum', 'word-counter'],
    ['css-generator', 'profit-calculator'],
    ['unit-converter', 'profit-calculator']
].forEach(([toolSlug, fallbackTool]) => {
    if (!ToolRenderers[toolSlug] && ToolRenderers[fallbackTool]) {
        ToolRenderers[toolSlug] = ToolRenderers[fallbackTool];
    }
});
