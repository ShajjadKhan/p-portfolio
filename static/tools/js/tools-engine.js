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

    createDropzone(container, accept, multiple, onFilesDropped, customSubtitle) {
        const dropzone = document.createElement('div');
        dropzone.className = 'dropzone';
        const sub = customSubtitle || `Supported: ${accept} (Instant client-side processing)`;
        dropzone.innerHTML = `
            <div class="dropzone-icon">📁</div>
            <div class="dropzone-title">Click to browse or drag & drop files here</div>
            <div class="dropzone-subtitle">${sub}</div>
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
                fileInput.value = '';
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
    },

    async renderCombinedPdf({
        pdfDoc,
        items,
        layoutMode = 'single',
        pageSizeName = 'auto',
        orientation = 'auto',
        margin = 20,
        gap = 5,
        showBorders = true,
        onProgress = null
    }) {
        const { rgb } = window.PDFLib;

        const SIZES = {
            a4: [595.28, 841.89],
            a3: [841.89, 1190.55],
            a2: [1190.55, 1683.78],
            a1: [1683.78, 2383.94],
            letter: [612.00, 792.00]
        };

        function getBasePageSize(targetSize, count) {
            if (targetSize && SIZES[targetSize]) {
                return [...SIZES[targetSize]];
            }
            if (layoutMode === 'single') {
                if (count >= 25) return [...SIZES.a2];
                if (count >= 9) return [...SIZES.a3];
                return [...SIZES.a4];
            }
            return [...SIZES.a4];
        }

        function applyOrientation(size, targetOrientation, count) {
            let [w, h] = size;
            if (targetOrientation === 'landscape') {
                return [Math.max(w, h), Math.min(w, h)];
            }
            if (targetOrientation === 'portrait') {
                return [Math.min(w, h), Math.max(w, h)];
            }
            // Auto orientation: for single page with >= 6 items, landscape gives optimal multi-column layout
            if (layoutMode === 'single' && count >= 6) {
                return [Math.max(w, h), Math.min(w, h)];
            }
            return [Math.min(w, h), Math.max(w, h)];
        }

        async function drawItem(targetPage, it, x, y, w, h) {
            if (it.type === 'pdf') {
                const [embeddedPage] = await pdfDoc.embedPdf(it.srcDoc, [it.pageIndex]);
                targetPage.drawPage(embeddedPage, { x, y, width: w, height: h });
            } else if (it.type === 'image' && it.embeddedImg) {
                targetPage.drawImage(it.embeddedImg, { x, y, width: w, height: h });
            }
        }

        // Mode 1: Standard Multi-Page Document (1 page per item)
        if (layoutMode === 'multi') {
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                if (onProgress) {
                    onProgress(`Placing item ${i + 1} of ${items.length}: ${item.name}...`);
                    await new Promise(r => setTimeout(r, 10));
                }
                if (item.type === 'pdf') {
                    const [copiedPage] = await pdfDoc.copyPages(item.srcDoc, [item.pageIndex]);
                    pdfDoc.addPage(copiedPage);
                } else {
                    let [pW, pH] = getBasePageSize(pageSizeName, 1);
                    [pW, pH] = applyOrientation([pW, pH], orientation, 1);
                    const page = pdfDoc.addPage([pW, pH]);
                    const availW = pW - margin * 2;
                    const availH = pH - margin * 2;
                    const fitScale = Math.min(availW / item.width, availH / item.height);
                    const drawW = item.width * fitScale;
                    const drawH = item.height * fitScale;
                    const drawX = margin + (availW - drawW) / 2;
                    const drawY = margin + (availH - drawH) / 2;
                    page.drawImage(item.embeddedImg, { x: drawX, y: drawY, width: drawW, height: drawH });
                }
            }
            return;
        }

        // Mode 2: Continuous Long Page (Single Vertical Roll)
        if (layoutMode === 'continuous') {
            let [baseW] = getBasePageSize(pageSizeName, items.length);
            if (orientation === 'landscape') baseW = Math.max(...(SIZES[pageSizeName] || SIZES.a4));
            const availW = baseW - margin * 2;
            let totalH = margin * 2;
            const heights = [];
            for (const it of items) {
                const scale = availW / it.width;
                const h = it.height * scale;
                heights.push(h);
                totalH += h;
            }
            totalH += Math.max(0, items.length - 1) * gap;

            if (onProgress) {
                onProgress(`Building continuous vertical canvas (${Math.round(totalH)}pt tall)...`);
                await new Promise(r => setTimeout(r, 15));
            }

            const singlePage = pdfDoc.addPage([baseW, totalH]);
            let currentY = totalH - margin;

            for (let i = 0; i < items.length; i++) {
                const it = items[i];
                const h = heights[i];
                currentY -= h;
                if (onProgress) {
                    onProgress(`Drawing item ${i + 1} of ${items.length}: ${it.name}...`);
                    await new Promise(r => setTimeout(r, 10));
                }
                await drawItem(singlePage, it, margin, currentY, availW, h);
                currentY -= gap;
            }
            return;
        }

        // Mode 3: Grid / N-Up (Fit All on 1 Single Page, 2-up, 4-up, 9-up, 16-up)
        let itemsPerSheet = items.length;
        if (layoutMode === '2-up') itemsPerSheet = 2;
        else if (layoutMode === '4-up') itemsPerSheet = 4;
        else if (layoutMode === '9-up') itemsPerSheet = 9;
        else if (layoutMode === '16-up') itemsPerSheet = 16;
        else if (layoutMode === 'single') itemsPerSheet = items.length;

        for (let chunkStart = 0; chunkStart < items.length; chunkStart += itemsPerSheet) {
            const chunk = items.slice(chunkStart, chunkStart + itemsPerSheet);
            const N = chunk.length;

            let [pageW, pageH] = getBasePageSize(pageSizeName, items.length);
            [pageW, pageH] = applyOrientation([pageW, pageH], orientation, N);

            const targetPage = pdfDoc.addPage([pageW, pageH]);
            const availW = pageW - margin * 2;
            const availH = pageH - margin * 2;

            // Find optimal (cols, rows) grid maximizing scale
            let bestCols = 1;
            let bestRows = N;
            let bestScale = 0;

            const avgItemW = chunk.reduce((acc, it) => acc + it.width, 0) / N;
            const avgItemH = chunk.reduce((acc, it) => acc + it.height, 0) / N;

            for (let c = 1; c <= N; c++) {
                const r = Math.ceil(N / c);
                const cellW = (availW - (c - 1) * gap) / c;
                const cellH = (availH - (r - 1) * gap) / r;
                if (cellW <= 0 || cellH <= 0) continue;
                const s = Math.min(cellW / avgItemW, cellH / avgItemH);
                if (s > bestScale) {
                    bestScale = s;
                    bestCols = c;
                    bestRows = r;
                }
            }

            const cols = bestCols;
            const rows = bestRows;
            const cellW = (availW - (cols - 1) * gap) / cols;
            const cellH = (availH - (rows - 1) * gap) / rows;

            for (let i = 0; i < N; i++) {
                const item = chunk[i];
                const globalIndex = chunkStart + i;
                if (onProgress) {
                    onProgress(`Placing item ${globalIndex + 1} of ${items.length} onto grid (col ${(i % cols) + 1}, row ${Math.floor(i / cols) + 1})...`);
                    await new Promise(r => setTimeout(r, 10));
                }

                const col = i % cols;
                const row = Math.floor(i / cols);

                const cellX = margin + col * (cellW + gap);
                const cellY = pageH - margin - (row + 1) * cellH - row * gap;

                const fitScale = Math.min(cellW / item.width, cellH / item.height);
                const drawW = item.width * fitScale;
                const drawH = item.height * fitScale;
                const drawX = cellX + (cellW - drawW) / 2;
                const drawY = cellY + (cellH - drawH) / 2;

                if (showBorders) {
                    try {
                        targetPage.drawRectangle({
                            x: drawX - 0.5,
                            y: drawY - 0.5,
                            width: drawW + 1,
                            height: drawH + 1,
                            borderColor: rgb(0.8, 0.82, 0.86),
                            borderWidth: 0.5
                        });
                    } catch (e) {}
                }

                await drawItem(targetPage, item, drawX, drawY, drawW, drawH);
            }
        }
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
            <div class="controls-panel" id="pdf-controls" style="display: none; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
                <div style="display: flex; gap: 1rem; flex-wrap: wrap; align-items: center; flex: 1;">
                    <div class="control-group" style="min-width: 200px;">
                        <label>Output Layout</label>
                        <select id="pdf-layout">
                            <option value="single">📑 Fit All on 1 Single Page (Grid / 50-in-1)</option>
                            <option value="continuous">📜 Continuous Long Page (Vertical Roll)</option>
                            <option value="multi" selected>📄 Multi-Page Document (1 per page)</option>
                            <option value="2-up">2️⃣ 2 per Sheet (2-Up)</option>
                            <option value="4-up">4️⃣ 4 per Sheet (4-Up)</option>
                            <option value="9-up">9️⃣ 9 per Sheet (9-Up)</option>
                        </select>
                    </div>
                    <div class="control-group" style="min-width: 140px;">
                        <label>Paper Size</label>
                        <select id="pdf-pagesize">
                            <option value="auto" selected>Auto (Smart Fit)</option>
                            <option value="a4">A4 (Standard 595 × 842 pt)</option>
                            <option value="a3">A3 (Large 842 × 1191 pt)</option>
                            <option value="a2">A2 / Poster (1191 × 1684 pt)</option>
                            <option value="a1">A1 / Giant Poster (1684 × 2384 pt)</option>
                            <option value="letter">US Letter (612 × 792 pt)</option>
                        </select>
                    </div>
                    <div class="control-group" style="min-width: 120px;">
                        <label>Orientation</label>
                        <select id="pdf-orientation">
                            <option value="auto" selected>Auto</option>
                            <option value="portrait">Portrait</option>
                            <option value="landscape">Landscape</option>
                        </select>
                    </div>
                    <div class="control-group" style="min-width: 120px;">
                        <label>Margins</label>
                        <select id="pdf-margins">
                            <option value="10">Compact (10pt)</option>
                            <option value="20" selected>Standard (20pt)</option>
                            <option value="40">Large (40pt)</option>
                            <option value="0">None (Full Bleed)</option>
                        </select>
                    </div>
                    <div class="control-group" style="min-width: 120px;">
                        <label>Tile Spacing</label>
                        <select id="pdf-gap">
                            <option value="5" selected>Tight (5pt)</option>
                            <option value="10">Standard (10pt)</option>
                            <option value="15">Spaced (15pt)</option>
                            <option value="0">Zero Gap</option>
                        </select>
                    </div>
                    <div style="font-size: 0.88rem; color: var(--text-muted); font-weight: 500; min-width: 100%;" id="pdf-stats"></div>
                </div>
                <div style="display: flex; gap: 0.75rem; align-items: center; margin-left: auto;">
                    <button class="btn-secondary" id="btn-clear-pdf" type="button">Clear All</button>
                    <button class="btn-primary" id="btn-create-pdf" type="button">⚡ Generate & Download PDF</button>
                </div>
            </div>
            <div id="status-box" style="margin-top: 1rem; color: var(--accent); font-weight: 600;"></div>
        `;

        const dzArea = container.querySelector('#dz-area');
        const filesContainer = container.querySelector('#files-list');
        const controls = container.querySelector('#pdf-controls');
        const statusBox = container.querySelector('#status-box');

        Utils.createDropzone(
            dzArea,
            'image/jpeg,image/png,image/webp,image/gif,image/bmp,application/pdf,.pdf,.jpg,.jpeg,.png,.webp,.bmp',
            true,
            (newFiles) => {
                filesList = [...filesList, ...newFiles];
                renderList();
            },
            'Supported: JPG, PNG, WebP, BMP & PDF Documents (Instant client-side processing)'
        );

        container.querySelector('#btn-clear-pdf').onclick = () => {
            filesList.forEach(f => {
                if (f._previewUrl) URL.revokeObjectURL(f._previewUrl);
            });
            filesList = [];
            renderList();
            statusBox.textContent = '';
        };

        function renderList() {
            filesContainer.innerHTML = '';
            controls.style.display = filesList.length > 0 ? 'flex' : 'none';

            const totalBytes = filesList.reduce((acc, f) => acc + (f.size || 0), 0);
            const statsEl = container.querySelector('#pdf-stats');
            if (statsEl) {
                statsEl.textContent = `${filesList.length} files • ${Utils.formatBytes(totalBytes)} total`;
            }

            filesList.forEach((file, index) => {
                const card = document.createElement('div');
                card.className = 'file-preview-card';
                const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

                let thumbHtml = '';
                if (isPdf) {
                    thumbHtml = `
                        <div class="file-thumbnail pdf-thumb" style="display: flex; flex-direction: column; align-items: center; justify-content: center; background: rgba(239, 68, 68, 0.1); color: #ef4444; border-radius: var(--radius-sm); margin-bottom: 0.5rem; height: 120px; width: 100%;">
                            <span style="font-size: 2.5rem; line-height: 1;">📄</span>
                            <span style="font-size: 0.7rem; font-weight: 800; letter-spacing: 0.05em; margin-top: 0.35rem; background: rgba(239, 68, 68, 0.2); padding: 2px 7px; border-radius: 4px;">PDF</span>
                        </div>
                    `;
                } else {
                    if (!file._previewUrl) {
                        file._previewUrl = URL.createObjectURL(file);
                    }
                    thumbHtml = `<img class="file-thumbnail" src="${file._previewUrl}" alt="${file.name}">`;
                }

                card.innerHTML = `
                    ${thumbHtml}
                    <div class="file-card-name" title="${file.name}">${file.name}</div>
                    <div class="file-card-size">${Utils.formatBytes(file.size)}</div>
                    <div class="file-actions">
                        <button class="action-mini-btn" title="Move Left" data-action="left" type="button">◀</button>
                        <button class="action-mini-btn" title="Move Right" data-action="right" type="button">▶</button>
                        <button class="action-mini-btn btn-del" title="Remove" data-action="del" type="button">✕</button>
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
                    const removed = filesList.splice(index, 1);
                    if (removed[0] && removed[0]._previewUrl) {
                        URL.revokeObjectURL(removed[0]._previewUrl);
                    }
                    renderList();
                };

                filesContainer.appendChild(card);
            });
        }

        container.querySelector('#btn-create-pdf').onclick = async () => {
            if (!filesList.length) return;

            const btn = container.querySelector('#btn-create-pdf');
            btn.disabled = true;
            btn.style.opacity = '0.6';
            btn.style.cursor = 'not-allowed';

            statusBox.style.color = 'var(--accent)';
            statusBox.textContent = `Preparing ${filesList.length} files...`;

            try {
                const { PDFDocument } = window.PDFLib;
                const pdfDoc = await PDFDocument.create();

                const layoutMode = container.querySelector('#pdf-layout').value;
                const pageSizeName = container.querySelector('#pdf-pagesize').value;
                const orientation = container.querySelector('#pdf-orientation').value;
                const margin = parseInt(container.querySelector('#pdf-margins').value, 10);
                const gap = parseInt(container.querySelector('#pdf-gap').value, 10);

                const items = [];
                for (let i = 0; i < filesList.length; i++) {
                    const file = filesList[i];
                    const pct = Math.round(((i + 1) / filesList.length) * 100);
                    statusBox.textContent = `Reading file ${i + 1} of ${filesList.length} (${pct}%): ${file.name}...`;
                    await new Promise(r => setTimeout(r, 10));

                    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
                    const arrayBuffer = await Utils.readFileAsArrayBuffer(file);

                    if (isPdf) {
                        const srcDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
                        const pageIndices = srcDoc.getPageIndices();
                        for (const pIdx of pageIndices) {
                            const origPage = srcDoc.getPage(pIdx);
                            const { width, height } = origPage.getSize();
                            items.push({
                                type: 'pdf',
                                file,
                                srcDoc,
                                pageIndex: pIdx,
                                width,
                                height,
                                name: `${file.name}${pageIndices.length > 1 ? ` (p.${pIdx + 1})` : ''}`
                            });
                        }
                    } else {
                        let embeddedImg = null;
                        const isPng = file.type === 'image/png' || file.name.toLowerCase().endsWith('.png');

                        if (isPng) {
                            try { embeddedImg = await pdfDoc.embedPng(arrayBuffer); } catch (e) {}
                        } else {
                            try { embeddedImg = await pdfDoc.embedJpg(arrayBuffer); } catch (e) {}
                        }

                        if (!embeddedImg) {
                            const objectUrl = URL.createObjectURL(file);
                            try {
                                const img = await new Promise((resolve, reject) => {
                                    const imageEl = new Image();
                                    const timer = setTimeout(() => reject(new Error(`Timeout decoding image "${file.name}"`)), 15000);
                                    imageEl.onload = () => { clearTimeout(timer); resolve(imageEl); };
                                    imageEl.onerror = () => { clearTimeout(timer); reject(new Error(`Failed to decode image "${file.name}"`)); };
                                    imageEl.src = objectUrl;
                                });

                                let w = img.naturalWidth || img.width;
                                let h = img.naturalHeight || img.height;
                                const maxDim = 3840;
                                if (w > maxDim || h > maxDim) {
                                    const scale = Math.min(maxDim / w, maxDim / h);
                                    w = Math.round(w * scale);
                                    h = Math.round(h * scale);
                                }

                                const canvas = document.createElement('canvas');
                                canvas.width = w;
                                canvas.height = h;
                                const ctx = canvas.getContext('2d');
                                ctx.fillStyle = '#ffffff';
                                ctx.fillRect(0, 0, w, h);
                                ctx.drawImage(img, 0, 0, w, h);

                                const blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.92));
                                const buf = await Utils.readFileAsArrayBuffer(blob);
                                embeddedImg = await pdfDoc.embedJpg(buf);
                            } finally {
                                URL.revokeObjectURL(objectUrl);
                            }
                        }

                        items.push({
                            type: 'image',
                            file,
                            embeddedImg,
                            width: embeddedImg.width,
                            height: embeddedImg.height,
                            name: file.name
                        });
                    }
                }

                await Utils.renderCombinedPdf({
                    pdfDoc,
                    items,
                    layoutMode,
                    pageSizeName,
                    orientation,
                    margin,
                    gap,
                    showBorders: true,
                    onProgress: (msg) => { statusBox.textContent = msg; }
                });

                statusBox.textContent = `Compressing and saving PDF (${items.length} items)...`;
                await new Promise(r => setTimeout(r, 20));

                const pdfBytes = await pdfDoc.save({ useObjectStreams: false });
                const blob = new Blob([pdfBytes], { type: 'application/pdf' });
                const layoutSuffix = layoutMode === 'single' ? '1page' : (layoutMode === 'continuous' ? 'scroll' : 'merged');
                Utils.downloadBlob(blob, `fasttrack_${layoutSuffix}_${Date.now()}.pdf`);
                statusBox.style.color = 'var(--accent)';
                statusBox.textContent = `✓ Successfully generated & downloaded PDF (${items.length} items in ${layoutMode === 'single' ? '1 single page' : layoutMode + ' layout'}, ${Utils.formatBytes(blob.size)})!`;
            } catch (err) {
                console.error(err);
                statusBox.style.color = '#ef4444';
                statusBox.textContent = '⚠️ Error creating PDF: ' + err.message;
            } finally {
                btn.disabled = false;
                btn.style.opacity = '1';
                btn.style.cursor = 'pointer';
            }
        };
    },

    // 2. PDF Merge & Combine
    'pdf-merge': (container) => {
        let pdfFiles = [];
        container.innerHTML = `
            <div id="dz-merge"></div>
            <div id="merge-list" style="margin: 1.5rem 0; display: flex; flex-direction: column; gap: 0.75rem;"></div>
            <div class="controls-panel" id="merge-controls" style="display: none; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
                <div style="display: flex; gap: 1rem; flex-wrap: wrap; align-items: center; flex: 1;">
                    <div class="control-group" style="min-width: 200px;">
                        <label>Merge Layout</label>
                        <select id="merge-layout">
                            <option value="single">📑 Fit All on 1 Single Page (Grid / 50-in-1)</option>
                            <option value="continuous">📜 Continuous Long Page (Vertical Roll)</option>
                            <option value="multi" selected>📄 Multi-Page Document (Standard Sequence)</option>
                            <option value="2-up">2️⃣ 2 per Sheet (2-Up)</option>
                            <option value="4-up">4️⃣ 4 per Sheet (4-Up)</option>
                            <option value="9-up">9️⃣ 9 per Sheet (9-Up)</option>
                        </select>
                    </div>
                    <div class="control-group" style="min-width: 140px;">
                        <label>Paper Size</label>
                        <select id="merge-pagesize">
                            <option value="auto" selected>Auto (Smart Fit)</option>
                            <option value="a4">A4 (Standard 595 × 842 pt)</option>
                            <option value="a3">A3 (Large 842 × 1191 pt)</option>
                            <option value="a2">A2 / Poster (1191 × 1684 pt)</option>
                            <option value="a1">A1 / Giant Poster (1684 × 2384 pt)</option>
                            <option value="letter">US Letter (612 × 792 pt)</option>
                        </select>
                    </div>
                    <div class="control-group" style="min-width: 120px;">
                        <label>Orientation</label>
                        <select id="merge-orientation">
                            <option value="auto" selected>Auto</option>
                            <option value="portrait">Portrait</option>
                            <option value="landscape">Landscape</option>
                        </select>
                    </div>
                    <div class="control-group" style="min-width: 120px;">
                        <label>Margins</label>
                        <select id="merge-margins">
                            <option value="10">Compact (10pt)</option>
                            <option value="20" selected>Standard (20pt)</option>
                            <option value="40">Large (40pt)</option>
                            <option value="0">None (Full Bleed)</option>
                        </select>
                    </div>
                    <div class="control-group" style="min-width: 120px;">
                        <label>Tile Spacing</label>
                        <select id="merge-gap">
                            <option value="5" selected>Tight (5pt)</option>
                            <option value="10">Standard (10pt)</option>
                            <option value="15">Spaced (15pt)</option>
                            <option value="0">Zero Gap</option>
                        </select>
                    </div>
                    <div style="font-size: 0.9rem; color: var(--text-muted); font-weight: 500; min-width: 100%;" id="merge-stats"></div>
                </div>
                <div style="display: flex; gap: 0.75rem; align-items: center; margin-left: auto;">
                    <button class="btn-secondary" id="btn-merge-clear" type="button">Clear All</button>
                    <button class="btn-primary" id="btn-merge" type="button">📑 Merge & Download PDF</button>
                </div>
            </div>
            <div id="merge-status" style="margin-top: 1rem; color: var(--accent); font-weight: 600;"></div>
        `;

        const dz = container.querySelector('#dz-merge');
        const list = container.querySelector('#merge-list');
        const controls = container.querySelector('#merge-controls');
        const stats = container.querySelector('#merge-stats');
        const statusBox = container.querySelector('#merge-status');

        Utils.createDropzone(
            dz,
            'application/pdf,image/*,.pdf,.jpg,.jpeg,.png,.webp',
            true,
            (files) => {
                pdfFiles = [...pdfFiles, ...files];
                renderList();
            },
            'Supported: PDF Documents & Images (Instant client-side processing)'
        );

        container.querySelector('#btn-merge-clear').onclick = () => {
            pdfFiles = [];
            renderList();
            statusBox.textContent = '';
        };

        function renderList() {
            list.innerHTML = '';
            controls.style.display = pdfFiles.length >= 1 ? 'flex' : 'none';
            const totalBytes = pdfFiles.reduce((acc, f) => acc + (f.size || 0), 0);
            const engineBadge = totalBytes > 20 * 1024 * 1024 
                ? '<span style="display: inline-flex; align-items: center; gap: 0.3rem; margin-left: 0.5rem; padding: 2px 8px; border-radius: 999px; background: rgba(56, 189, 248, 0.15); color: #38bdf8; font-size: 0.78rem; font-weight: 600;">⚡ Server-Accelerated Engine (Optimized for large files)</span>'
                : '<span style="display: inline-flex; align-items: center; gap: 0.3rem; margin-left: 0.5rem; padding: 2px 8px; border-radius: 999px; background: rgba(16, 185, 129, 0.15); color: #10b981; font-size: 0.78rem; font-weight: 600;">⚡ Instant Engine</span>';
            stats.innerHTML = `${pdfFiles.length} file${pdfFiles.length === 1 ? '' : 's'} selected (${Utils.formatBytes(totalBytes)}) ${engineBadge}`;

            pdfFiles.forEach((f, idx) => {
                const item = document.createElement('div');
                item.style.cssText = 'background: var(--bg-surface, #0d1322); border: 1px solid var(--border-dim, rgba(255,255,255,0.08)); padding: 0.85rem 1.25rem; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: space-between; gap: 1rem;';
                const isPdf = f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf');
                const icon = isPdf ? '📄' : '🖼️';

                item.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 0.85rem; min-width: 0;">
                        <span style="font-size: 1.4rem;">${icon}</span>
                        <div style="min-width: 0;">
                            <div style="font-weight: 600; font-size: 0.92rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${idx + 1}. ${f.name}</div>
                            <div style="font-size: 0.75rem; color: var(--text-dim);">${Utils.formatBytes(f.size)}</div>
                        </div>
                    </div>
                    <div style="display: flex; gap: 0.4rem; flex-shrink: 0;">
                        <button class="action-mini-btn" data-act="up" type="button" title="Move Up">▲</button>
                        <button class="action-mini-btn" data-act="down" type="button" title="Move Down">▼</button>
                        <button class="action-mini-btn btn-del" data-act="del" type="button" title="Remove">✕</button>
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

        async function runServerMerge(filesToMerge) {
            return new Promise((resolve, reject) => {
                const formData = new FormData();
                filesToMerge.forEach((f) => {
                    formData.append('pdf_files', f, f.name);
                });

                const xhr = new XMLHttpRequest();
                xhr.open('POST', '/tools/api/pdf/merge', true);
                xhr.responseType = 'blob';

                xhr.upload.onprogress = (e) => {
                    if (e.lengthComputable) {
                        const pct = Math.round((e.loaded / e.total) * 100);
                        const loadedStr = Utils.formatBytes(e.loaded);
                        const totalStr = Utils.formatBytes(e.total);
                        statusBox.style.color = 'var(--accent, #38bdf8)';
                        statusBox.innerHTML = `
                            <div style="display: flex; flex-direction: column; gap: 0.5rem; max-width: 480px;">
                                <div style="display: flex; justify-content: space-between; font-size: 0.88rem;">
                                    <span>⚡ High-speed server processing:</span>
                                    <span><b>${pct}%</b> (${loadedStr} / ${totalStr})</span>
                                </div>
                                <div style="width: 100%; background: rgba(255,255,255,0.12); height: 8px; border-radius: 999px; overflow: hidden;">
                                    <div style="background: linear-gradient(90deg, #0284c7, #38bdf8); width: ${pct}%; height: 100%; transition: width 0.15s ease;"></div>
                                </div>
                                <div style="font-size: 0.78rem; color: var(--text-dim, #94a3b8);">${pct < 100 ? 'Streaming files securely to server...' : 'All files received. Merging and compressing document...'}</div>
                            </div>
                        `;
                    } else {
                        statusBox.textContent = 'Uploading files to high-speed server...';
                    }
                };

                xhr.onload = () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        const blob = xhr.response;
                        const filename = `merged_document_${Date.now()}.pdf`;
                        Utils.downloadBlob(blob, filename);
                        statusBox.style.color = 'var(--accent, #10b981)';
                        statusBox.innerHTML = `✓ Successfully merged ${filesToMerge.length} documents (${Utils.formatBytes(blob.size)})! Download started automatically.`;
                        resolve(blob);
                    } else {
                        const reader = new FileReader();
                        reader.onload = () => {
                            try {
                                const errJson = JSON.parse(reader.result);
                                reject(new Error(errJson.message || `Server error (${xhr.status})`));
                            } catch (_) {
                                reject(new Error(`Server error (${xhr.status}): ${xhr.statusText || 'Merge failed'}`));
                            }
                        };
                        reader.onerror = () => reject(new Error(`Server error (${xhr.status})`));
                        reader.readAsText(xhr.response);
                    }
                };

                xhr.onerror = () => {
                    reject(new Error('Network error connecting to server. Please check your connection.'));
                };

                xhr.ontimeout = () => {
                    reject(new Error('Merge request timed out on server (5-minute limit exceeded).'));
                };

                xhr.timeout = 300000; // 5-minute timeout for large documents
                statusBox.textContent = 'Initiating server merge...';
                xhr.send(formData);
            });
        }

        container.querySelector('#btn-merge').onclick = async () => {
            if (!pdfFiles.length) {
                statusBox.style.color = '#ef4444';
                statusBox.textContent = 'Please select at least 1 file to merge.';
                return;
            }

            const btn = container.querySelector('#btn-merge');
            btn.disabled = true;
            btn.style.opacity = '0.6';
            btn.style.cursor = 'not-allowed';

            statusBox.style.color = 'var(--accent)';
            statusBox.textContent = `Preparing ${pdfFiles.length} files...`;

            const totalBytes = pdfFiles.reduce((acc, f) => acc + (f.size || 0), 0);
            const layoutMode = container.querySelector('#merge-layout').value;

            // Strategy: For large multi-file payloads (> 20MB) or when layout is standard sequence 'multi',
            // browser V8 heap cannot allocate hundreds of MBs in memory without crashing.
            // Route directly to high-performance disk streaming server engine!
            if (layoutMode === 'multi' && totalBytes > 20 * 1024 * 1024) {
                try {
                    await runServerMerge(pdfFiles);
                } catch (srvErr) {
                    console.error('Server merge error:', srvErr);
                    statusBox.style.color = '#ef4444';
                    statusBox.textContent = 'Merge error: ' + srvErr.message;
                } finally {
                    btn.disabled = false;
                    btn.style.opacity = '1';
                    btn.style.cursor = 'pointer';
                }
                return;
            }

            try {
                const { PDFDocument } = window.PDFLib;
                const mergedPdf = await PDFDocument.create();

                const pageSizeName = container.querySelector('#merge-pagesize').value;
                const orientation = container.querySelector('#merge-orientation').value;
                const margin = parseInt(container.querySelector('#merge-margins').value, 10);
                const gap = parseInt(container.querySelector('#merge-gap').value, 10);

                const items = [];
                for (let i = 0; i < pdfFiles.length; i++) {
                    const file = pdfFiles[i];
                    const pct = Math.round(((i + 1) / pdfFiles.length) * 100);
                    statusBox.textContent = `Reading file ${i + 1} of ${pdfFiles.length} (${pct}%): ${file.name}...`;
                    await new Promise(r => setTimeout(r, 10));

                    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
                    const buf = await Utils.readFileAsArrayBuffer(file);

                    if (isPdf) {
                        const doc = await PDFDocument.load(buf, { ignoreEncryption: true });
                        const pageIndices = doc.getPageIndices();
                        for (const pIdx of pageIndices) {
                            const origPage = doc.getPage(pIdx);
                            const { width, height } = origPage.getSize();
                            items.push({
                                type: 'pdf',
                                file,
                                srcDoc: doc,
                                pageIndex: pIdx,
                                width,
                                height,
                                name: `${file.name}${pageIndices.length > 1 ? ` (p.${pIdx + 1})` : ''}`
                            });
                        }
                    } else {
                        let embeddedImg = null;
                        if (file.type === 'image/png' || file.name.toLowerCase().endsWith('.png')) {
                            try { embeddedImg = await mergedPdf.embedPng(buf); } catch (e) {}
                        } else {
                            try { embeddedImg = await mergedPdf.embedJpg(buf); } catch (e) {}
                        }
                        if (!embeddedImg) {
                            const objectUrl = URL.createObjectURL(file);
                            try {
                                const img = await new Promise((resolve, reject) => {
                                    const imageEl = new Image();
                                    const timer = setTimeout(() => reject(new Error(`Timeout loading "${file.name}"`)), 15000);
                                    imageEl.onload = () => { clearTimeout(timer); resolve(imageEl); };
                                    imageEl.onerror = () => { clearTimeout(timer); reject(new Error(`Failed to decode image "${file.name}"`)); };
                                    imageEl.src = objectUrl;
                                });
                                let w = img.naturalWidth || img.width;
                                let h = img.naturalHeight || img.height;
                                const maxDim = 3840;
                                if (w > maxDim || h > maxDim) {
                                    const scale = Math.min(maxDim / w, maxDim / h);
                                    w = Math.round(w * scale);
                                    h = Math.round(h * scale);
                                }
                                const canvas = document.createElement('canvas');
                                canvas.width = w;
                                canvas.height = h;
                                const ctx = canvas.getContext('2d');
                                ctx.fillStyle = '#ffffff';
                                ctx.fillRect(0, 0, w, h);
                                ctx.drawImage(img, 0, 0, w, h);
                                const blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.92));
                                const jpgBuf = await Utils.readFileAsArrayBuffer(blob);
                                embeddedImg = await mergedPdf.embedJpg(jpgBuf);
                            } finally {
                                URL.revokeObjectURL(objectUrl);
                            }
                        }
                        items.push({
                            type: 'image',
                            file,
                            embeddedImg,
                            width: embeddedImg.width,
                            height: embeddedImg.height,
                            name: file.name
                        });
                    }
                }

                await Utils.renderCombinedPdf({
                    pdfDoc: mergedPdf,
                    items,
                    layoutMode,
                    pageSizeName,
                    orientation,
                    margin,
                    gap,
                    showBorders: true,
                    onProgress: (msg) => { statusBox.textContent = msg; }
                });

                statusBox.textContent = `Compressing and saving PDF (${items.length} items)...`;
                await new Promise(r => setTimeout(r, 20));

                const pdfBytes = await mergedPdf.save({ useObjectStreams: false });
                const blob = new Blob([pdfBytes], { type: 'application/pdf' });
                const layoutSuffix = layoutMode === 'single' ? '1page' : (layoutMode === 'continuous' ? 'scroll' : 'merged');
                Utils.downloadBlob(blob, `merged_${layoutSuffix}_${Date.now()}.pdf`);
                statusBox.style.color = 'var(--accent)';
                statusBox.textContent = `✓ Successfully merged ${items.length} items into ${layoutMode === 'single' ? '1 single page' : layoutMode + ' layout'} (${Utils.formatBytes(blob.size)})!`;
            } catch (err) {
                console.warn('Client-side merge failed:', err);
                // If it was standard multi-page layout, automatically fallback to server!
                if (layoutMode === 'multi') {
                    statusBox.style.color = 'var(--accent)';
                    statusBox.textContent = 'Client memory limit reached. Seamlessly switching to high-speed server engine...';
                    try {
                        await runServerMerge(pdfFiles);
                    } catch (srvErr) {
                        statusBox.style.color = '#ef4444';
                        statusBox.textContent = 'Merge failed: ' + srvErr.message;
                    }
                } else {
                    statusBox.style.color = '#ef4444';
                    statusBox.textContent = 'Merge failed: ' + err.message;
                }
            } finally {
                btn.disabled = false;
                btn.style.opacity = '1';
                btn.style.cursor = 'pointer';
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
                const sourcePdf = await PDFDocument.load(currentDoc, { ignoreEncryption: true });
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
                const doc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
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
                const source = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
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

    // =========================================================================
    // High-Accuracy PDF Editor & Precision Signer (with Word-Style In-Place Text Editing)
    // =========================================================================
    'pdf-editor': (container) => {
        let currentPdfBuffer = null;
        let pdfDoc = null;
        let originalFileName = 'document.pdf';
        let totalPages = 0;
        let currentPageNum = 1;
        let currentZoom = 1.0;
        let currentRotation = 0;
        let pageWidthPt = 595.28;
        let pageHeightPt = 841.89;

        // Active tool: 'edit-text' is default Word-mode for editing existing text
        let activeTool = 'edit-text'; // edit-text, select, text, whiteout, redact, draw, highlight, shape, signature, image, stamp
        let selectedId = null;
        let activeTextBlock = null;
        let shapeSubtype = 'rect'; // rect, circle, line, arrow

        // Active tool styling properties
        const textProps = {
            fontFamily: 'Helvetica',
            fontSize: 14,
            color: '#000000',
            bgColor: 'transparent',
            bold: false,
            italic: false
        };
        const penProps = {
            color: '#000000',
            width: 2
        };
        const highlightProps = {
            color: '#fff159',
            width: 20
        };
        const shapeProps = {
            stroke: '#000000',
            strokeWidth: 2,
            fill: 'transparent'
        };

        // Data Stores by Page Number
        const pageTextBlocks = {};  // { [pageNum]: [ { id, str, origStr, ptX, ptY, ptW, ptH, fontSize, fontFamily, color, edited } ] }
        const pageAnnotations = {}; // { [pageNum]: [ user-added items ] }
        const pageDrawings = {};    // { [pageNum]: [ drawing strokes ] }
        const pageRotations = {};   // { [pageNum]: rotationDeg }

        // Undo & Redo History
        const undoStack = [];
        const redoStack = [];

        // Interaction state
        let isInteracting = false;
        let interactionMode = null; // 'drag', 'resize', 'create-box', 'draw'
        let resizeHandle = null;
        let startClientX = 0, startClientY = 0;
        let startPtX = 0, startPtY = 0, startPtW = 0, startPtH = 0;
        let activeStroke = null;

        // Base DOM Setup
        container.innerHTML = `
            <div class="pdf-ed-wrapper">
                <!-- Dropzone State -->
                <div id="pdf-ed-dropzone" class="pdf-ed-dropzone-box">
                    <div class="pdf-ed-dropzone-icon">✍️📄</div>
                    <div class="pdf-ed-dropzone-title">High-Accuracy PDF Editor & Signer</div>
                    <div class="pdf-ed-dropzone-sub">
                        Direct in-place text editing (Word Mode): click any existing date, number, or text in your PDF to edit directly with Backspace and keyboard, plus signatures, whiteout & annotations.
                    </div>
                    <div class="pdf-ed-dropzone-actions">
                        <button type="button" class="btn-primary" id="pdf-ed-choose-btn">Choose PDF File</button>
                        <button type="button" class="btn-secondary" id="pdf-ed-blank-btn">Create Blank Document (A4)</button>
                        <input type="file" id="pdf-ed-file-input" accept="application/pdf" style="display: none;">
                    </div>
                </div>

                <!-- Active Editor Workspace -->
                <div id="pdf-ed-workspace" style="display: none; flex-direction: column;">
                    <!-- Top Bar: Navigation, Zoom & Actions -->
                    <div class="pdf-ed-topbar">
                        <div style="display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
                            <div class="pdf-ed-doc-badge">
                                <span>📄</span>
                                <span class="pdf-ed-doc-name" id="pdf-ed-filename">document.pdf</span>
                            </div>
                            <div class="pdf-ed-nav-group">
                                <button type="button" class="pdf-ed-btn-mini" id="pdf-ed-prev-btn" title="Previous Page">◀</button>
                                <div class="pdf-ed-page-indicator">
                                    Page <input type="number" id="pdf-ed-page-num" min="1" max="1" value="1" class="pdf-ed-page-input">
                                    <span>/ <span id="pdf-ed-total-pages">1</span></span>
                                </div>
                                <button type="button" class="pdf-ed-btn-mini" id="pdf-ed-next-btn" title="Next Page">▶</button>
                                <button type="button" class="pdf-ed-btn-mini" id="pdf-ed-rotate-btn" title="Rotate Page 90°">🔄 Rotate</button>
                            </div>
                        </div>

                        <div class="pdf-ed-zoom-group">
                            <button type="button" class="pdf-ed-btn-mini" id="pdf-ed-zoom-out" title="Zoom Out">➖</button>
                            <span class="pdf-ed-zoom-val" id="pdf-ed-zoom-txt">100%</span>
                            <button type="button" class="pdf-ed-btn-mini" id="pdf-ed-zoom-in" title="Zoom In">➕</button>
                            <button type="button" class="pdf-ed-btn-mini" id="pdf-ed-zoom-fit" title="Fit Width">Fit Width</button>
                        </div>

                        <div class="pdf-ed-actions-group">
                            <button type="button" class="pdf-ed-btn-mini" id="pdf-ed-undo-btn" title="Undo (Ctrl+Z)">↩ Undo</button>
                            <button type="button" class="pdf-ed-btn-mini" id="pdf-ed-redo-btn" title="Redo (Ctrl+Y)">↪ Redo</button>
                            <button type="button" class="pdf-ed-btn-mini" id="pdf-ed-clear-btn" title="Clear Page Annotations">🗑️ Clear</button>
                            <button type="button" class="pdf-ed-btn-mini" id="pdf-ed-new-btn" title="Open Another PDF">📂 Open</button>
                            <button type="button" class="pdf-ed-export-btn" id="pdf-ed-export-btn">
                                <span>💾</span>
                                <span>Export Vector PDF</span>
                            </button>
                        </div>
                    </div>

                    <!-- Tool Ribbon -->
                    <div class="pdf-ed-ribbon" id="pdf-ed-tools">
                        <button type="button" class="pdf-ed-tool-btn active" data-tool="edit-text" title="Click directly on existing text/dates to edit with Backspace and typing like Word">
                            <span>📝</span> Edit Text (Word Mode)
                        </button>
                        <button type="button" class="pdf-ed-tool-btn" data-tool="select" title="Select, Move, and Resize Elements">
                            <span>👆</span> Select / Move
                        </button>
                        <div class="pdf-ed-tool-sep"></div>
                        <button type="button" class="pdf-ed-tool-btn" data-tool="text" title="Click anywhere to add new text">
                            <span>🔤</span> Add Text
                        </button>
                        <button type="button" class="pdf-ed-tool-btn" data-tool="whiteout" title="Drag box over text to erase/whiteout">
                            <span>⬜</span> Whiteout / Erase
                        </button>
                        <button type="button" class="pdf-ed-tool-btn" data-tool="redact" title="Drag black box to redact confidential info">
                            <span>⬛</span> Redact
                        </button>
                        <div class="pdf-ed-tool-sep"></div>
                        <button type="button" class="pdf-ed-tool-btn" data-tool="draw" title="Freehand Pen Tool">
                            <span>✏️</span> Pen
                        </button>
                        <button type="button" class="pdf-ed-tool-btn" data-tool="highlight" title="Neon Translucent Highlighter">
                            <span>🖍️</span> Highlighter
                        </button>
                        <button type="button" class="pdf-ed-tool-btn" data-tool="shape" title="Draw Rectangles, Circles, Lines, Arrows">
                            <span>🔲</span> Shapes
                        </button>
                        <div class="pdf-ed-tool-sep"></div>
                        <button type="button" class="pdf-ed-tool-btn" data-tool="signature" title="Insert Drawn or Typed Signature">
                            <span>✍️</span> Signature
                        </button>
                        <button type="button" class="pdf-ed-tool-btn" data-tool="image" title="Insert Image / Stamp">
                            <span>🖼️</span> Insert Image
                            <input type="file" id="pdf-ed-img-input" accept="image/*" style="display: none;">
                        </button>
                        <button type="button" class="pdf-ed-tool-btn" data-tool="stamp" title="Insert Official Approval / Status Stamps">
                            <span>🏷️</span> Stamps
                        </button>
                    </div>

                    <!-- Property Ribbon -->
                    <div class="pdf-ed-props" id="pdf-ed-props"></div>

                    <!-- Workspace Layout: Left Sidebar + Viewport Stage -->
                    <div class="pdf-ed-main-layout">
                        <div class="pdf-ed-sidebar" id="pdf-ed-sidebar"></div>
                        <div class="pdf-ed-viewport" id="pdf-ed-viewport">
                            <div class="pdf-ed-stage-wrap" id="pdf-ed-stage-wrap">
                                <div class="pdf-ed-stage" id="pdf-ed-stage">
                                    <canvas class="pdf-ed-base-canvas" id="pdf-ed-base-canvas"></canvas>
                                    <div class="pdf-ed-text-layer" id="pdf-ed-text-layer"></div>
                                    <canvas class="pdf-ed-draw-canvas" id="pdf-ed-draw-canvas"></canvas>
                                    <div class="pdf-ed-anno-layer" id="pdf-ed-anno-layer"></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Precision Status HUD -->
                    <div class="pdf-ed-hud">
                        <div id="pdf-ed-hud-dims">Page: 595 x 842 pt (210.0 x 297.0 mm, A4)</div>
                        <div id="pdf-ed-hud-coords">Cursor: X: 0.0 pt, Y: 0.0 pt</div>
                        <div class="pdf-ed-hud-badge">
                            <span>🔒</span> Word-Mode In-Place Vector Replacement
                        </div>
                    </div>
                </div>

                <!-- Status Feedback Box -->
                <div id="pdf-ed-status" style="padding: 0.75rem 1rem; color: var(--accent); font-weight: 600; font-size: 0.85rem; display: none;"></div>
            </div>
        `;

        // Cache DOM references
        const dzBox = container.querySelector('#pdf-ed-dropzone');
        const wsBox = container.querySelector('#pdf-ed-workspace');
        const fileInput = container.querySelector('#pdf-ed-file-input');
        const chooseBtn = container.querySelector('#pdf-ed-choose-btn');
        const blankBtn = container.querySelector('#pdf-ed-blank-btn');
        const statusBox = container.querySelector('#pdf-ed-status');

        const fileNameEl = container.querySelector('#pdf-ed-filename');
        const pageNumInput = container.querySelector('#pdf-ed-page-num');
        const totalPagesEl = container.querySelector('#pdf-ed-total-pages');
        const prevBtn = container.querySelector('#pdf-ed-prev-btn');
        const nextBtn = container.querySelector('#pdf-ed-next-btn');
        const rotateBtn = container.querySelector('#pdf-ed-rotate-btn');

        const zoomOutBtn = container.querySelector('#pdf-ed-zoom-out');
        const zoomInBtn = container.querySelector('#pdf-ed-zoom-in');
        const zoomFitBtn = container.querySelector('#pdf-ed-zoom-fit');
        const zoomTxt = container.querySelector('#pdf-ed-zoom-txt');

        const undoBtn = container.querySelector('#pdf-ed-undo-btn');
        const redoBtn = container.querySelector('#pdf-ed-redo-btn');
        const clearBtn = container.querySelector('#pdf-ed-clear-btn');
        const newBtn = container.querySelector('#pdf-ed-new-btn');
        const exportBtn = container.querySelector('#pdf-ed-export-btn');

        const toolsRibbon = container.querySelector('#pdf-ed-tools');
        const propsRibbon = container.querySelector('#pdf-ed-props');
        const sidebar = container.querySelector('#pdf-ed-sidebar');
        const viewport = container.querySelector('#pdf-ed-viewport');
        const stage = container.querySelector('#pdf-ed-stage');
        const baseCanvas = container.querySelector('#pdf-ed-base-canvas');
        const textLayer = container.querySelector('#pdf-ed-text-layer');
        const drawCanvas = container.querySelector('#pdf-ed-draw-canvas');
        const annoLayer = container.querySelector('#pdf-ed-anno-layer');
        const hudDims = container.querySelector('#pdf-ed-hud-dims');
        const hudCoords = container.querySelector('#pdf-ed-hud-coords');
        const imgInput = container.querySelector('#pdf-ed-img-input');

        // Helpers
        function showStatus(msg, isError = false) {
            statusBox.style.display = 'block';
            statusBox.style.color = isError ? 'var(--tag-pdf)' : 'var(--accent)';
            statusBox.textContent = msg;
        }

        function hideStatus() {
            statusBox.style.display = 'none';
        }

        function hexToRgb(hex) {
            if (!hex || hex === 'transparent') return { r: 0, g: 0, b: 0 };
            hex = hex.replace('#', '');
            if (hex.length === 3) {
                hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
            }
            const num = parseInt(hex, 16);
            return {
                r: ((num >> 16) & 255) / 255,
                g: ((num >> 8) & 255) / 255,
                b: (num & 255) / 255
            };
        }

        function dataUriToUint8(dataUri) {
            const base64 = dataUri.split(',')[1];
            const binaryStr = atob(base64);
            const len = binaryStr.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
                bytes[i] = binaryStr.charCodeAt(i);
            }
            return bytes;
        }

        function getEventPdfPoint(e) {
            const rect = stage.getBoundingClientRect();
            const clientX = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
            const clientY = e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
            const screenX = clientX - rect.left;
            const screenY = clientY - rect.top;
            const ptX = screenX / currentZoom;
            const ptY = screenY / currentZoom;
            return {
                screenX,
                screenY,
                ptX: Math.max(0, Math.min(pageWidthPt, ptX)),
                ptY: Math.max(0, Math.min(pageHeightPt, ptY))
            };
        }

        function saveHistory() {
            const items = pageAnnotations[currentPageNum] ? JSON.parse(JSON.stringify(pageAnnotations[currentPageNum])) : [];
            const drawings = pageDrawings[currentPageNum] ? JSON.parse(JSON.stringify(pageDrawings[currentPageNum])) : [];
            const textBlocks = pageTextBlocks[currentPageNum] ? JSON.parse(JSON.stringify(pageTextBlocks[currentPageNum])) : [];
            undoStack.push({ pageNum: currentPageNum, items, drawings, textBlocks });
            redoStack.length = 0;
            if (undoStack.length > 30) undoStack.shift();
        }

        function undo() {
            if (!undoStack.length) return;
            const curState = {
                pageNum: currentPageNum,
                items: pageAnnotations[currentPageNum] ? JSON.parse(JSON.stringify(pageAnnotations[currentPageNum])) : [],
                drawings: pageDrawings[currentPageNum] ? JSON.parse(JSON.stringify(pageDrawings[currentPageNum])) : [],
                textBlocks: pageTextBlocks[currentPageNum] ? JSON.parse(JSON.stringify(pageTextBlocks[currentPageNum])) : []
            };
            redoStack.push(curState);
            const prev = undoStack.pop();
            pageAnnotations[prev.pageNum] = prev.items;
            pageDrawings[prev.pageNum] = prev.drawings;
            if (prev.textBlocks) pageTextBlocks[prev.pageNum] = prev.textBlocks;
            if (prev.pageNum !== currentPageNum) {
                currentPageNum = prev.pageNum;
            }
            renderPage(currentPageNum);
        }

        function redo() {
            if (!redoStack.length) return;
            const curState = {
                pageNum: currentPageNum,
                items: pageAnnotations[currentPageNum] ? JSON.parse(JSON.stringify(pageAnnotations[currentPageNum])) : [],
                drawings: pageDrawings[currentPageNum] ? JSON.parse(JSON.stringify(pageDrawings[currentPageNum])) : [],
                textBlocks: pageTextBlocks[currentPageNum] ? JSON.parse(JSON.stringify(pageTextBlocks[currentPageNum])) : []
            };
            undoStack.push(curState);
            const next = redoStack.pop();
            pageAnnotations[next.pageNum] = next.items;
            pageDrawings[next.pageNum] = next.drawings;
            if (next.textBlocks) pageTextBlocks[next.pageNum] = next.textBlocks;
            if (next.pageNum !== currentPageNum) {
                currentPageNum = next.pageNum;
            }
            renderPage(currentPageNum);
        }

        // Dropzone & File Loading
        chooseBtn.onclick = () => fileInput.click();
        fileInput.onchange = (e) => {
            if (e.target.files && e.target.files[0]) {
                handleFile(e.target.files[0]);
            }
        };

        blankBtn.onclick = async () => {
            showStatus('Generating blank A4 document...');
            try {
                const { PDFDocument } = window.PDFLib;
                const blankDoc = await PDFDocument.create();
                blankDoc.addPage([595.28, 841.89]);
                const bytes = await blankDoc.save();
                await loadPdfBuffer(bytes.buffer, 'blank-document.pdf');
                hideStatus();
            } catch (err) {
                showStatus('Failed to create blank document: ' + err.message, true);
            }
        };

        dzBox.ondragover = (e) => { e.preventDefault(); dzBox.classList.add('dragover'); };
        dzBox.ondragleave = () => dzBox.classList.remove('dragover');
        dzBox.ondrop = (e) => {
            e.preventDefault();
            dzBox.classList.remove('dragover');
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                handleFile(e.dataTransfer.files[0]);
            }
        };

        async function handleFile(file) {
            if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
                showStatus('Please select a valid PDF file.', true);
                return;
            }
            showStatus('Reading PDF file into browser memory...');
            try {
                const buffer = await Utils.readFileAsArrayBuffer(file);
                await loadPdfBuffer(buffer, file.name);
                hideStatus();
            } catch (err) {
                showStatus('Failed to read file: ' + err.message, true);
            }
        }

        async function loadPdfBuffer(buffer, filename) {
            currentPdfBuffer = buffer;
            originalFileName = filename || 'document.pdf';
            fileNameEl.textContent = originalFileName;

            showStatus('Parsing PDF text streams and vector geometry...');
            try {
                if (!window.pdfjsLib) {
                    throw new Error('PDF.js library not loaded yet. Please wait a moment and try again.');
                }
                const loadingTask = window.pdfjsLib.getDocument({ data: currentPdfBuffer });
                pdfDoc = await loadingTask.promise;
                totalPages = pdfDoc.numPages;
                currentPageNum = 1;
                currentZoom = 1.0;
                currentRotation = 0;
                pageRotations[1] = 0;

                totalPagesEl.textContent = totalPages;
                pageNumInput.max = totalPages;
                pageNumInput.value = 1;

                dzBox.style.display = 'none';
                wsBox.style.display = 'flex';

                await renderThumbnails();
                await renderPage(1);
                updatePropertyRibbon();
            } catch (err) {
                console.error(err);
                showStatus('Failed to load PDF: ' + err.message, true);
            }
        }

        // Render Thumbnails Sidebar
        async function renderThumbnails() {
            sidebar.innerHTML = '';
            for (let i = 1; i <= totalPages; i++) {
                const card = document.createElement('div');
                card.className = `pdf-ed-thumb-card ${i === currentPageNum ? 'active' : ''}`;
                card.setAttribute('data-page', i);

                const thumbCanvas = document.createElement('canvas');
                thumbCanvas.className = 'pdf-ed-thumb-img';
                const numLabel = document.createElement('div');
                numLabel.className = 'pdf-ed-thumb-num';
                numLabel.textContent = `Page ${i}`;

                card.appendChild(thumbCanvas);
                card.appendChild(numLabel);
                sidebar.appendChild(card);

                card.onclick = () => {
                    if (currentPageNum !== i) {
                        currentPageNum = i;
                        pageNumInput.value = i;
                        updateThumbnailActiveState();
                        renderPage(i);
                    }
                };

                // Render thumbnail async
                pdfDoc.getPage(i).then(page => {
                    const unscaled = page.getViewport({ scale: 1.0 });
                    const scale = 140 / Math.max(unscaled.width, unscaled.height);
                    const viewport = page.getViewport({ scale });
                    thumbCanvas.width = viewport.width;
                    thumbCanvas.height = viewport.height;
                    const ctx = thumbCanvas.getContext('2d');
                    page.render({ canvasContext: ctx, viewport });
                });
            }
        }

        function updateThumbnailActiveState() {
            sidebar.querySelectorAll('.pdf-ed-thumb-card').forEach(card => {
                const p = parseInt(card.getAttribute('data-page'), 10);
                if (p === currentPageNum) card.classList.add('active');
                else card.classList.remove('active');
            });
        }

        // Extract and Merge Text Blocks from pdf.js
        function parsePdfTextContent(textContent, pWidthPt, pHeightPt) {
            if (!textContent || !textContent.items || !textContent.items.length) return [];
            const items = textContent.items;
            const blocks = [];

            for (let i = 0; i < items.length; i++) {
                const it = items[i];
                const str = it.str || '';
                if (!str.trim()) continue;

                const tx = it.transform[4];
                const ty = it.transform[5];
                const fontSize = Math.max(8, Math.round(Math.hypot(it.transform[2], it.transform[3]) || it.height || 12));
                const ptX = tx;
                // ty is the baseline from bottom-left
                const ptY = pHeightPt - ty - (fontSize * 0.88);
                const ptW = Math.max(8, it.width || (str.length * fontSize * 0.55));
                const ptH = Math.max(fontSize * 1.15, it.height || fontSize);

                blocks.push({
                    id: `tb_${Date.now()}_${i}`,
                    str: str,
                    origStr: str,
                    ptX: ptX,
                    ptY: ptY,
                    ptW: ptW,
                    ptH: ptH,
                    origPtW: ptW,
                    origPtH: ptH,
                    fontSize: fontSize,
                    fontFamily: detectFontFamily(it.fontName),
                    color: '#000000',
                    baselineY: ty,
                    edited: false
                });
            }

            // Merge adjacent text items on the same baseline into phrases/dates
            const merged = [];
            for (let i = 0; i < blocks.length; i++) {
                const cur = blocks[i];
                if (!merged.length) {
                    merged.push(cur);
                    continue;
                }
                const prev = merged[merged.length - 1];
                const sameLine = Math.abs(prev.baselineY - cur.baselineY) < (prev.fontSize * 0.35);
                const gap = cur.ptX - (prev.ptX + prev.ptW);
                const maxGap = prev.fontSize * 0.75;

                if (sameLine && gap >= -2 && gap <= maxGap) {
                    const needsSpace = gap > (prev.fontSize * 0.15) && !prev.str.endsWith(' ') && !cur.str.startsWith(' ');
                    prev.str += (needsSpace ? ' ' : '') + cur.str;
                    prev.origStr = prev.str;
                    prev.ptW = (cur.ptX + cur.ptW) - prev.ptX;
                    prev.origPtW = prev.ptW;
                    prev.ptH = Math.max(prev.ptH, cur.ptH);
                    prev.origPtH = prev.ptH;
                } else {
                    merged.push(cur);
                }
            }

            return merged;
        }

        function detectFontFamily(fontName) {
            if (!fontName) return 'Helvetica';
            const lower = fontName.toLowerCase();
            if (lower.includes('times') || lower.includes('serif') || lower.includes('georgia') || lower.includes('minion')) return 'Times';
            if (lower.includes('courier') || lower.includes('mono') || lower.includes('console')) return 'Courier';
            return 'Helvetica';
        }

        // Render Active Page & Layers
        async function renderPage(pageNum) {
            if (!pdfDoc) return;
            const page = await pdfDoc.getPage(pageNum);
            const baseViewport = page.getViewport({ scale: 1.0, rotation: currentRotation });
            pageWidthPt = baseViewport.width;
            pageHeightPt = baseViewport.height;

            const displayWidth = Math.round(pageWidthPt * currentZoom);
            const displayHeight = Math.round(pageHeightPt * currentZoom);

            // Set Stage dimensions
            stage.style.width = displayWidth + 'px';
            stage.style.height = displayHeight + 'px';

            // High-DPI supersampled PDF rendering for crispness
            const dpr = 2; // 2x supersampling guarantees retina-sharp vector text
            const scaledViewport = page.getViewport({ scale: currentZoom * dpr, rotation: currentRotation });

            baseCanvas.width = scaledViewport.width;
            baseCanvas.height = scaledViewport.height;
            baseCanvas.style.width = displayWidth + 'px';
            baseCanvas.style.height = displayHeight + 'px';

            const baseCtx = baseCanvas.getContext('2d');
            baseCtx.clearRect(0, 0, baseCanvas.width, baseCanvas.height);
            await page.render({ canvasContext: baseCtx, viewport: scaledViewport }).promise;

            // Extract & cache existing text blocks for Word Mode
            if (!pageTextBlocks[pageNum]) {
                const textContent = await page.getTextContent({ normalizeWhitespace: true });
                pageTextBlocks[pageNum] = parsePdfTextContent(textContent, pageWidthPt, pageHeightPt);
            }

            // Setup Direct In-Place Text Layer
            textLayer.style.width = displayWidth + 'px';
            textLayer.style.height = displayHeight + 'px';
            renderTextLayer();

            // Setup Draw Canvas
            drawCanvas.width = Math.round(displayWidth * dpr);
            drawCanvas.height = Math.round(displayHeight * dpr);
            drawCanvas.style.width = displayWidth + 'px';
            drawCanvas.style.height = displayHeight + 'px';
            renderDrawCanvasStrokes();

            // Setup Annotation Layer
            annoLayer.style.width = displayWidth + 'px';
            annoLayer.style.height = displayHeight + 'px';
            renderAnnotationItems();

            // Update HUD
            hudDims.textContent = `Page ${pageNum}: ${Math.round(pageWidthPt)} x ${Math.round(pageHeightPt)} pt (${(pageWidthPt * 0.352778).toFixed(1)} x ${(pageHeightPt * 0.352778).toFixed(1)} mm)`;
            updateThumbnailActiveState();
        }

        // Render In-Place Text Layer (Word Mode)
        function renderTextLayer() {
            textLayer.innerHTML = '';
            const blocks = pageTextBlocks[currentPageNum] || [];

            blocks.forEach(block => {
                const el = document.createElement('div');
                el.className = `pdf-text-block ${block.edited ? 'is-edited' : ''}`;
                el.setAttribute('data-id', block.id);

                const left = Math.round(block.ptX * currentZoom);
                const top = Math.round(block.ptY * currentZoom);
                const fontSizePx = Math.round(block.fontSize * currentZoom);

                el.style.left = left + 'px';
                el.style.top = top + 'px';
                el.style.fontSize = fontSizePx + 'px';
                el.style.fontFamily = block.fontFamily === 'Courier' ? 'Courier, monospace' : (block.fontFamily === 'Times' ? 'Times New Roman, serif' : 'Helvetica, Arial, sans-serif');
                el.style.color = block.color || '#000000';

                // If edited, apply opaque white background to mask original PDF text!
                if (block.edited) {
                    el.style.background = '#ffffff';
                    el.style.minWidth = Math.round(Math.max(block.origPtW, block.ptW) * currentZoom) + 'px';
                    el.style.minHeight = Math.round(block.ptH * currentZoom) + 'px';
                }

                el.textContent = block.str;
                el.title = "Click to edit text directly with keyboard (Backspace / Type)";

                // Clicking activates inline editing
                el.onclick = (e) => {
                    if (activeTool !== 'edit-text' && activeTool !== 'select') return;
                    e.stopPropagation();
                    activateInlineTextEdit(el, block);
                };

                textLayer.appendChild(el);
            });
        }

        // Activate Direct In-Place Text Editing on Click
        function activateInlineTextEdit(domEl, block) {
            if (domEl.getAttribute('contenteditable') === 'true') return;

            saveHistory();
            activeTextBlock = block;

            domEl.setAttribute('contenteditable', 'true');
            domEl.classList.add('editing-active');
            domEl.style.background = '#ffffff';
            domEl.style.minWidth = Math.round(Math.max(block.origPtW, block.ptW) * currentZoom) + 'px';
            domEl.style.zIndex = '100';

            // Focus & Select all text for quick backspacing
            domEl.focus();
            const range = document.createRange();
            range.selectNodeContents(domEl);
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);

            showStatus(`Editing: "${block.origStr}" — Use Backspace / Keyboard to edit. Press Enter or click outside to finish.`, false);
            updatePropertyRibbon();

            function finishEdit() {
                domEl.removeAttribute('contenteditable');
                domEl.classList.remove('editing-active');
                activeTextBlock = null;

                const newStr = domEl.textContent.trim();
                if (newStr !== block.origStr) {
                    block.str = newStr;
                    block.edited = true;
                    domEl.classList.add('is-edited');
                    block.ptW = Math.max(12, (block.origPtW / Math.max(1, block.origStr.length)) * Math.max(1, newStr.length));
                    showStatus(`✓ Updated text to: "${newStr}"`, false);
                    setTimeout(hideStatus, 3500);
                } else if (newStr === block.origStr && !block.edited) {
                    domEl.style.background = 'transparent';
                }
                updatePropertyRibbon();
            }

            domEl.onblur = finishEdit;

            domEl.onkeydown = (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    domEl.blur();
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    domEl.textContent = block.str;
                    domEl.blur();
                }
            };
        }

        function renderDrawCanvasStrokes() {
            const dpr = 2;
            const dCtx = drawCanvas.getContext('2d');
            dCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
            const strokes = pageDrawings[currentPageNum] || [];

            strokes.forEach(stroke => {
                if (!stroke.points || stroke.points.length < 2) return;
                dCtx.save();
                dCtx.scale(currentZoom * dpr, currentZoom * dpr);
                dCtx.strokeStyle = stroke.color;
                dCtx.lineWidth = stroke.width;
                dCtx.lineCap = 'round';
                dCtx.lineJoin = 'round';
                dCtx.globalAlpha = stroke.opacity ?? 1.0;
                dCtx.beginPath();
                dCtx.moveTo(stroke.points[0].ptX, stroke.points[0].ptY);
                for (let i = 1; i < stroke.points.length; i++) {
                    dCtx.lineTo(stroke.points[i].ptX, stroke.points[i].ptY);
                }
                dCtx.stroke();
                dCtx.restore();
            });
        }

        function renderAnnotationItems() {
            annoLayer.innerHTML = '';
            const items = pageAnnotations[currentPageNum] || [];

            items.forEach(item => {
                const el = document.createElement('div');
                el.className = `pdf-anno-el type-${item.type} ${item.id === selectedId ? 'selected' : ''}`;
                el.setAttribute('data-id', item.id);

                const left = Math.round(item.ptX * currentZoom);
                const top = Math.round(item.ptY * currentZoom);
                const width = Math.round(item.ptW * currentZoom);
                const height = Math.round(item.ptH * currentZoom);

                el.style.left = left + 'px';
                el.style.top = top + 'px';
                el.style.width = width + 'px';
                el.style.height = height + 'px';

                if (item.type === 'whiteout') {
                    el.style.background = '#ffffff';
                    el.style.border = 'none';
                } else if (item.type === 'redact') {
                    el.style.background = '#000000';
                    el.style.border = 'none';
                } else if (item.type === 'rect') {
                    el.style.background = item.fill && item.fill !== 'transparent' ? item.fill : 'transparent';
                    el.style.border = `${item.strokeWidth || 2}px solid ${item.stroke || '#000000'}`;
                } else if (item.type === 'circle') {
                    el.style.background = item.fill && item.fill !== 'transparent' ? item.fill : 'transparent';
                    el.style.border = `${item.strokeWidth || 2}px solid ${item.stroke || '#000000'}`;
                    el.style.borderRadius = '50%';
                } else if (item.type === 'line' || item.type === 'arrow') {
                    el.innerHTML = `
                        <svg width="100%" height="100%" style="display:block; overflow:visible;">
                            <defs>
                                <marker id="arrow-${item.id}" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                                    <path d="M 0 0 L 10 5 L 0 10 z" fill="${item.stroke || '#000000'}"/>
                                </marker>
                            </defs>
                            <line x1="0" y1="0" x2="${width}" y2="${height}" stroke="${item.stroke || '#000000'}" stroke-width="${item.strokeWidth || 2}" ${item.type === 'arrow' ? `marker-end="url(#arrow-${item.id})"` : ''} />
                        </svg>
                    `;
                } else if (item.type === 'text') {
                    el.style.color = item.color || '#000000';
                    el.style.fontFamily = item.fontFamily === 'Courier' ? 'Courier, monospace' : (item.fontFamily === 'Times' ? 'Times New Roman, serif' : 'Helvetica, Arial, sans-serif');
                    el.style.fontSize = Math.round((item.fontSize || 14) * currentZoom) + 'px';
                    el.style.fontWeight = item.bold ? '700' : '400';
                    el.style.fontStyle = item.italic ? 'italic' : 'normal';
                    el.style.background = item.bgColor && item.bgColor !== 'transparent' ? item.bgColor : 'transparent';
                    el.style.padding = '2px 4px';
                    el.textContent = item.text || '';
                } else if (item.type === 'image' || item.type === 'signature' || item.type === 'stamp') {
                    const img = document.createElement('img');
                    img.src = item.dataUrl;
                    img.style.cssText = 'width:100%; height:100%; object-fit:contain; display:block; pointer-events:none;';
                    el.appendChild(img);
                }

                // If selected, attach 8 resize handles
                if (item.id === selectedId) {
                    ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'].forEach(dir => {
                        const hdl = document.createElement('div');
                        hdl.className = `pdf-anno-hdl ${dir}`;
                        hdl.setAttribute('data-handle', dir);
                        el.appendChild(hdl);
                    });
                }

                annoLayer.appendChild(el);
            });
        }

        // Selection & Item Manipulation
        function selectItem(id) {
            selectedId = id;
            renderAnnotationItems();
            updatePropertyRibbon();
        }

        function deselectItem() {
            if (selectedId !== null) {
                selectedId = null;
                renderAnnotationItems();
                updatePropertyRibbon();
            }
        }

        function getSelectedItem() {
            if (!selectedId) return null;
            const items = pageAnnotations[currentPageNum] || [];
            return items.find(it => it.id === selectedId) || null;
        }

        function deleteSelectedItem() {
            if (!selectedId) return;
            saveHistory();
            pageAnnotations[currentPageNum] = (pageAnnotations[currentPageNum] || []).filter(it => it.id !== selectedId);
            selectedId = null;
            renderAnnotationItems();
            updatePropertyRibbon();
        }

        function duplicateSelectedItem() {
            const it = getSelectedItem();
            if (!it) return;
            saveHistory();
            const clone = JSON.parse(JSON.stringify(it));
            clone.id = 'anno_' + Date.now();
            clone.ptX = Math.min(pageWidthPt - clone.ptW, clone.ptX + 15);
            clone.ptY = Math.min(pageHeightPt - clone.ptH, clone.ptY + 15);
            (pageAnnotations[currentPageNum] = pageAnnotations[currentPageNum] || []).push(clone);
            selectItem(clone.id);
        }

        // Dynamic Property Ribbon Generator
        function updatePropertyRibbon() {
            const sel = getSelectedItem();
            propsRibbon.innerHTML = '';

            if (activeTextBlock) {
                // Currently editing an existing PDF text block
                propsRibbon.innerHTML = `
                    <div class="pdf-ed-prop-item">
                        <span class="pdf-ed-prop-label">Font</span>
                        <select id="tb-font" class="pdf-ed-select-mini">
                            <option value="Helvetica" ${activeTextBlock.fontFamily === 'Helvetica' ? 'selected' : ''}>Helvetica</option>
                            <option value="Times" ${activeTextBlock.fontFamily === 'Times' ? 'selected' : ''}>Times Roman</option>
                            <option value="Courier" ${activeTextBlock.fontFamily === 'Courier' ? 'selected' : ''}>Courier</option>
                        </select>
                    </div>
                    <div class="pdf-ed-prop-item">
                        <span class="pdf-ed-prop-label">Size</span>
                        <select id="tb-size" class="pdf-ed-select-mini">
                            ${[9, 10, 11, 12, 13, 14, 16, 18, 20, 24, 28, 32].map(s => `<option value="${s}" ${activeTextBlock.fontSize === s ? 'selected' : ''}>${s} pt</option>`).join('')}
                        </select>
                    </div>
                    <div class="pdf-ed-prop-item">
                        <span class="pdf-ed-prop-label">Color</span>
                        <input type="color" id="tb-color" value="${activeTextBlock.color || '#000000'}" style="width:24px; height:24px; padding:0; border:none; background:none; cursor:pointer;">
                    </div>
                    <div class="pdf-ed-prop-item" style="margin-left:auto;">
                        <button type="button" class="pdf-ed-btn-mini" id="tb-revert" title="Revert to original text">↩ Revert Original</button>
                    </div>
                `;
                propsRibbon.querySelector('#tb-font').onchange = (e) => { activeTextBlock.fontFamily = e.target.value; renderTextLayer(); };
                propsRibbon.querySelector('#tb-size').onchange = (e) => { activeTextBlock.fontSize = parseInt(e.target.value, 10); renderTextLayer(); };
                propsRibbon.querySelector('#tb-color').onchange = (e) => { activeTextBlock.color = e.target.value; renderTextLayer(); };
                propsRibbon.querySelector('#tb-revert').onclick = () => {
                    activeTextBlock.str = activeTextBlock.origStr;
                    activeTextBlock.edited = false;
                    renderTextLayer();
                    showStatus('Reverted to original text', false);
                    setTimeout(hideStatus, 2000);
                };
                return;
            }

            if (sel) {
                // Properties for Selected User Annotation
                if (sel.type === 'text') {
                    propsRibbon.innerHTML = `
                        <div class="pdf-ed-prop-item">
                            <span class="pdf-ed-prop-label">Font</span>
                            <select id="prop-font" class="pdf-ed-select-mini">
                                <option value="Helvetica" ${sel.fontFamily === 'Helvetica' ? 'selected' : ''}>Helvetica</option>
                                <option value="Times" ${sel.fontFamily === 'Times' ? 'selected' : ''}>Times Roman</option>
                                <option value="Courier" ${sel.fontFamily === 'Courier' ? 'selected' : ''}>Courier</option>
                            </select>
                        </div>
                        <div class="pdf-ed-prop-item">
                            <span class="pdf-ed-prop-label">Size</span>
                            <select id="prop-size" class="pdf-ed-select-mini">
                                ${[10, 12, 14, 16, 18, 20, 24, 28, 32, 40, 48, 64].map(s => `<option value="${s}" ${sel.fontSize === s ? 'selected' : ''}>${s} pt</option>`).join('')}
                            </select>
                        </div>
                        <div class="pdf-ed-prop-item">
                            <span class="pdf-ed-prop-label">Color</span>
                            <input type="color" id="prop-color" value="${sel.color || '#000000'}" style="width:24px; height:24px; padding:0; border:none; background:none; cursor:pointer;">
                        </div>
                        <div class="pdf-ed-prop-item">
                            <span class="pdf-ed-prop-label">Fill</span>
                            <select id="prop-bg" class="pdf-ed-select-mini">
                                <option value="transparent" ${sel.bgColor === 'transparent' ? 'selected' : ''}>None (Transparent)</option>
                                <option value="#ffffff" ${sel.bgColor === '#ffffff' ? 'selected' : ''}>Whiteout Box</option>
                                <option value="#fff159" ${sel.bgColor === '#fff159' ? 'selected' : ''}>Highlight Yellow</option>
                            </select>
                        </div>
                        <div class="pdf-ed-prop-item">
                            <button type="button" class="pdf-ed-btn-mini ${sel.bold ? 'active' : ''}" id="prop-bold" title="Toggle Bold"><b>B</b></button>
                            <button type="button" class="pdf-ed-btn-mini ${sel.italic ? 'active' : ''}" id="prop-italic" title="Toggle Italic"><i>I</i></button>
                        </div>
                        <div class="pdf-ed-prop-item" style="margin-left:auto;">
                            <button type="button" class="pdf-ed-btn-mini" id="prop-dup" title="Duplicate">📋 Duplicate</button>
                            <button type="button" class="pdf-ed-btn-mini" id="prop-del" style="color:var(--tag-pdf);" title="Delete">🗑️ Delete</button>
                        </div>
                    `;

                    propsRibbon.querySelector('#prop-font').onchange = (e) => { saveHistory(); sel.fontFamily = e.target.value; renderAnnotationItems(); };
                    propsRibbon.querySelector('#prop-size').onchange = (e) => { saveHistory(); sel.fontSize = parseInt(e.target.value, 10); renderAnnotationItems(); };
                    propsRibbon.querySelector('#prop-color').onchange = (e) => { saveHistory(); sel.color = e.target.value; renderAnnotationItems(); };
                    propsRibbon.querySelector('#prop-bg').onchange = (e) => { saveHistory(); sel.bgColor = e.target.value; renderAnnotationItems(); };
                    propsRibbon.querySelector('#prop-bold').onclick = () => { saveHistory(); sel.bold = !sel.bold; renderAnnotationItems(); updatePropertyRibbon(); };
                    propsRibbon.querySelector('#prop-italic').onclick = () => { saveHistory(); sel.italic = !sel.italic; renderAnnotationItems(); updatePropertyRibbon(); };
                    propsRibbon.querySelector('#prop-dup').onclick = duplicateSelectedItem;
                    propsRibbon.querySelector('#prop-del').onclick = deleteSelectedItem;
                } else if (sel.type === 'whiteout' || sel.type === 'redact') {
                    propsRibbon.innerHTML = `
                        <div class="pdf-ed-prop-item">
                            <span class="pdf-ed-prop-label">${sel.type === 'whiteout' ? 'Whiteout Eraser' : 'Black Redaction'}</span>
                            <span style="font-size:0.75rem; color:var(--text-dim);">Coordinates: X: ${Math.round(sel.ptX)}, Y: ${Math.round(sel.ptY)}, W: ${Math.round(sel.ptW)}, H: ${Math.round(sel.ptH)} pt</span>
                        </div>
                        <div class="pdf-ed-prop-item" style="margin-left:auto;">
                            <button type="button" class="pdf-ed-btn-mini" id="prop-dup">📋 Duplicate</button>
                            <button type="button" class="pdf-ed-btn-mini" id="prop-del" style="color:var(--tag-pdf);">🗑️ Delete</button>
                        </div>
                    `;
                    propsRibbon.querySelector('#prop-dup').onclick = duplicateSelectedItem;
                    propsRibbon.querySelector('#prop-del').onclick = deleteSelectedItem;
                } else if (sel.type === 'rect' || sel.type === 'circle' || sel.type === 'line' || sel.type === 'arrow') {
                    propsRibbon.innerHTML = `
                        <div class="pdf-ed-prop-item">
                            <span class="pdf-ed-prop-label">Border Color</span>
                            <input type="color" id="prop-stroke" value="${sel.stroke || '#000000'}" style="width:24px; height:24px; padding:0; border:none; background:none; cursor:pointer;">
                        </div>
                        <div class="pdf-ed-prop-item">
                            <span class="pdf-ed-prop-label">Width</span>
                            <select id="prop-stroke-w" class="pdf-ed-select-mini">
                                ${[1, 2, 3, 4, 6, 8].map(w => `<option value="${w}" ${sel.strokeWidth === w ? 'selected' : ''}>${w}px</option>`).join('')}
                            </select>
                        </div>
                        ${sel.type === 'rect' || sel.type === 'circle' ? `
                            <div class="pdf-ed-prop-item">
                                <span class="pdf-ed-prop-label">Fill</span>
                                <select id="prop-fill" class="pdf-ed-select-mini">
                                    <option value="transparent" ${sel.fill === 'transparent' ? 'selected' : ''}>Transparent</option>
                                    <option value="#ffffff" ${sel.fill === '#ffffff' ? 'selected' : ''}>White</option>
                                    <option value="#000000" ${sel.fill === '#000000' ? 'selected' : ''}>Black</option>
                                    <option value="#fff159" ${sel.fill === '#fff159' ? 'selected' : ''}>Yellow</option>
                                    <option value="#00e599" ${sel.fill === '#00e599' ? 'selected' : ''}>Emerald</option>
                                </select>
                            </div>
                        ` : ''}
                        <div class="pdf-ed-prop-item" style="margin-left:auto;">
                            <button type="button" class="pdf-ed-btn-mini" id="prop-dup">📋 Duplicate</button>
                            <button type="button" class="pdf-ed-btn-mini" id="prop-del" style="color:var(--tag-pdf);">🗑️ Delete</button>
                        </div>
                    `;
                    propsRibbon.querySelector('#prop-stroke').onchange = (e) => { saveHistory(); sel.stroke = e.target.value; renderAnnotationItems(); };
                    propsRibbon.querySelector('#prop-stroke-w').onchange = (e) => { saveHistory(); sel.strokeWidth = parseInt(e.target.value, 10); renderAnnotationItems(); };
                    if (propsRibbon.querySelector('#prop-fill')) {
                        propsRibbon.querySelector('#prop-fill').onchange = (e) => { saveHistory(); sel.fill = e.target.value; renderAnnotationItems(); };
                    }
                    propsRibbon.querySelector('#prop-dup').onclick = duplicateSelectedItem;
                    propsRibbon.querySelector('#prop-del').onclick = deleteSelectedItem;
                } else {
                    // Image / Signature / Stamp
                    propsRibbon.innerHTML = `
                        <div class="pdf-ed-prop-item">
                            <span class="pdf-ed-prop-label">${sel.type.toUpperCase()}</span>
                            <span style="font-size:0.75rem; color:var(--text-dim);">${Math.round(sel.ptW)} x ${Math.round(sel.ptH)} pt</span>
                        </div>
                        <div class="pdf-ed-prop-item" style="margin-left:auto;">
                            <button type="button" class="pdf-ed-btn-mini" id="prop-dup">📋 Duplicate</button>
                            <button type="button" class="pdf-ed-btn-mini" id="prop-del" style="color:var(--tag-pdf);">🗑️ Delete</button>
                        </div>
                    `;
                    propsRibbon.querySelector('#prop-dup').onclick = duplicateSelectedItem;
                    propsRibbon.querySelector('#prop-del').onclick = deleteSelectedItem;
                }
            } else {
                // Properties for Active Tool
                if (activeTool === 'edit-text') {
                    propsRibbon.innerHTML = `
                        <span style="color:var(--accent); font-weight:600; font-size:0.78rem;">
                            📝 Word Mode Active: Click directly on any existing date or text in the document. Press Backspace to erase, type new text, and hit Enter to save.
                        </span>
                    `;
                } else if (activeTool === 'select') {
                    propsRibbon.innerHTML = `
                        <span style="color:var(--text-muted); font-size:0.78rem;">
                            👆 Select Mode: Click and drag user-added elements (signatures, stamps, shapes) to reposition or resize.
                        </span>
                    `;
                } else if (activeTool === 'text') {
                    propsRibbon.innerHTML = `
                        <div class="pdf-ed-prop-item">
                            <span class="pdf-ed-prop-label">Font</span>
                            <select id="def-font" class="pdf-ed-select-mini">
                                <option value="Helvetica" ${textProps.fontFamily === 'Helvetica' ? 'selected' : ''}>Helvetica</option>
                                <option value="Times" ${textProps.fontFamily === 'Times' ? 'selected' : ''}>Times Roman</option>
                                <option value="Courier" ${textProps.fontFamily === 'Courier' ? 'selected' : ''}>Courier</option>
                            </select>
                        </div>
                        <div class="pdf-ed-prop-item">
                            <span class="pdf-ed-prop-label">Size</span>
                            <select id="def-size" class="pdf-ed-select-mini">
                                ${[10, 12, 14, 16, 18, 20, 24, 28, 32, 40, 48].map(s => `<option value="${s}" ${textProps.fontSize === s ? 'selected' : ''}>${s} pt</option>`).join('')}
                            </select>
                        </div>
                        <div class="pdf-ed-prop-item">
                            <span class="pdf-ed-prop-label">Color</span>
                            <input type="color" id="def-color" value="${textProps.color}" style="width:24px; height:24px; padding:0; border:none; background:none; cursor:pointer;">
                        </div>
                        <span style="color:var(--text-dim); font-size:0.75rem; margin-left:0.5rem;">Click anywhere on the PDF page to add new text box</span>
                    `;
                    propsRibbon.querySelector('#def-font').onchange = (e) => textProps.fontFamily = e.target.value;
                    propsRibbon.querySelector('#def-size').onchange = (e) => textProps.fontSize = parseInt(e.target.value, 10);
                    propsRibbon.querySelector('#def-color').onchange = (e) => textProps.color = e.target.value;
                } else if (activeTool === 'whiteout') {
                    propsRibbon.innerHTML = `
                        <span style="color:var(--accent); font-weight:600; font-size:0.78rem;">
                            ⬜ Whiteout Mode: Click & drag over any unwanted PDF text or numbers to permanently erase/cover them.
                        </span>
                    `;
                } else if (activeTool === 'redact') {
                    propsRibbon.innerHTML = `
                        <span style="color:var(--tag-pdf); font-weight:600; font-size:0.78rem;">
                            ⬛ Redact Mode: Click & drag a black redaction block over sensitive confidential content.
                        </span>
                    `;
                } else if (activeTool === 'draw') {
                    propsRibbon.innerHTML = `
                        <div class="pdf-ed-prop-item">
                            <span class="pdf-ed-prop-label">Pen Color</span>
                            <div class="pdf-ed-color-swatches" id="pen-swatches">
                                ${['#000000', '#1e3a8a', '#dc2626', '#059669', '#ffffff'].map(c => `
                                    <div class="pdf-ed-swatch ${penProps.color === c ? 'active' : ''}" data-color="${c}" style="background:${c};"></div>
                                `).join('')}
                                <input type="color" id="pen-custom-color" value="${penProps.color}" style="width:20px; height:20px; padding:0; border:none; background:none; cursor:pointer;">
                            </div>
                        </div>
                        <div class="pdf-ed-prop-item">
                            <span class="pdf-ed-prop-label">Thickness</span>
                            <select id="pen-width" class="pdf-ed-select-mini">
                                ${[1, 2, 3, 5, 8].map(w => `<option value="${w}" ${penProps.width === w ? 'selected' : ''}>${w}px</option>`).join('')}
                            </select>
                        </div>
                    `;
                    propsRibbon.querySelectorAll('.pdf-ed-swatch').forEach(sw => {
                        sw.onclick = () => {
                            penProps.color = sw.getAttribute('data-color');
                            updatePropertyRibbon();
                        };
                    });
                    propsRibbon.querySelector('#pen-custom-color').onchange = (e) => {
                        penProps.color = e.target.value;
                        updatePropertyRibbon();
                    };
                    propsRibbon.querySelector('#pen-width').onchange = (e) => penProps.width = parseInt(e.target.value, 10);
                } else if (activeTool === 'highlight') {
                    propsRibbon.innerHTML = `
                        <div class="pdf-ed-prop-item">
                            <span class="pdf-ed-prop-label">Highlighter Color</span>
                            <div class="pdf-ed-color-swatches">
                                ${['#fff159', '#00e676', '#00e5ff', '#ff4081', '#ff9100'].map(c => `
                                    <div class="pdf-ed-swatch ${highlightProps.color === c ? 'active' : ''}" data-color="${c}" style="background:${c};"></div>
                                `).join('')}
                            </div>
                        </div>
                        <div class="pdf-ed-prop-item">
                            <span class="pdf-ed-prop-label">Thickness</span>
                            <select id="hi-width" class="pdf-ed-select-mini">
                                ${[12, 18, 24, 32].map(w => `<option value="${w}" ${highlightProps.width === w ? 'selected' : ''}>${w}px</option>`).join('')}
                            </select>
                        </div>
                    `;
                    propsRibbon.querySelectorAll('.pdf-ed-swatch').forEach(sw => {
                        sw.onclick = () => {
                            highlightProps.color = sw.getAttribute('data-color');
                            updatePropertyRibbon();
                        };
                    });
                    propsRibbon.querySelector('#hi-width').onchange = (e) => highlightProps.width = parseInt(e.target.value, 10);
                } else if (activeTool === 'shape') {
                    propsRibbon.innerHTML = `
                        <div class="pdf-ed-prop-item">
                            <span class="pdf-ed-prop-label">Shape Type</span>
                            <select id="shape-type" class="pdf-ed-select-mini">
                                <option value="rect" ${shapeSubtype === 'rect' ? 'selected' : ''}>Rectangle</option>
                                <option value="circle" ${shapeSubtype === 'circle' ? 'selected' : ''}>Circle</option>
                                <option value="line" ${shapeSubtype === 'line' ? 'selected' : ''}>Line</option>
                                <option value="arrow" ${shapeSubtype === 'arrow' ? 'selected' : ''}>Arrow</option>
                            </select>
                        </div>
                        <div class="pdf-ed-prop-item">
                            <span class="pdf-ed-prop-label">Border</span>
                            <input type="color" id="shape-stroke" value="${shapeProps.stroke}" style="width:24px; height:24px; padding:0; border:none; background:none; cursor:pointer;">
                        </div>
                        <div class="pdf-ed-prop-item">
                            <span class="pdf-ed-prop-label">Width</span>
                            <select id="shape-w" class="pdf-ed-select-mini">
                                ${[1, 2, 3, 5, 8].map(w => `<option value="${w}" ${shapeProps.strokeWidth === w ? 'selected' : ''}>${w}px</option>`).join('')}
                            </select>
                        </div>
                    `;
                    propsRibbon.querySelector('#shape-type').onchange = (e) => shapeSubtype = e.target.value;
                    propsRibbon.querySelector('#shape-stroke').onchange = (e) => shapeProps.stroke = e.target.value;
                    propsRibbon.querySelector('#shape-w').onchange = (e) => shapeProps.strokeWidth = parseInt(e.target.value, 10);
                }
            }
        }

        // Tool Selection Handlers
        toolsRibbon.querySelectorAll('.pdf-ed-tool-btn').forEach(btn => {
            btn.onclick = () => {
                const tool = btn.getAttribute('data-tool');
                if (tool === 'signature') {
                    openSignatureModal();
                    return;
                }
                if (tool === 'image') {
                    imgInput.click();
                    return;
                }
                if (tool === 'stamp') {
                    openStampModal();
                    return;
                }

                toolsRibbon.querySelectorAll('.pdf-ed-tool-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                activeTool = tool;
                deselectItem();
                updatePropertyRibbon();

                // Update cursor
                if (activeTool === 'edit-text') {
                    stage.style.cursor = 'default';
                    textLayer.style.pointerEvents = 'auto';
                } else if (activeTool === 'select') {
                    stage.style.cursor = 'default';
                    textLayer.style.pointerEvents = 'none';
                } else if (activeTool === 'text') {
                    stage.style.cursor = 'text';
                    textLayer.style.pointerEvents = 'none';
                } else {
                    stage.style.cursor = 'crosshair';
                    textLayer.style.pointerEvents = 'none';
                }
            };
        });

        // Stage Interactions: Mouse & Touch Events
        stage.addEventListener('mousemove', (e) => {
            const pt = getEventPdfPoint(e);
            hudCoords.textContent = `Cursor: X: ${pt.ptX.toFixed(1)} pt, Y: ${pt.ptY.toFixed(1)} pt`;

            if (!isInteracting) return;

            if (interactionMode === 'drag') {
                const sel = getSelectedItem();
                if (!sel) return;
                const dx = (e.clientX - startClientX) / currentZoom;
                const dy = (e.clientY - startClientY) / currentZoom;
                sel.ptX = Math.max(0, Math.min(pageWidthPt - sel.ptW, startPtX + dx));
                sel.ptY = Math.max(0, Math.min(pageHeightPt - sel.ptH, startPtY + dy));
                renderAnnotationItems();
            } else if (interactionMode === 'resize') {
                const sel = getSelectedItem();
                if (!sel) return;
                const dx = (e.clientX - startClientX) / currentZoom;
                const dy = (e.clientY - startClientY) / currentZoom;
                const minSize = 10;

                if (resizeHandle.includes('e')) sel.ptW = Math.max(minSize, startPtW + dx);
                if (resizeHandle.includes('s')) sel.ptH = Math.max(minSize, startPtH + dy);
                if (resizeHandle.includes('w')) {
                    const newW = Math.max(minSize, startPtW - dx);
                    sel.ptX = startPtX + (startPtW - newW);
                    sel.ptW = newW;
                }
                if (resizeHandle.includes('n')) {
                    const newH = Math.max(minSize, startPtH - dy);
                    sel.ptY = startPtY + (startPtH - newH);
                    sel.ptH = newH;
                }
                renderAnnotationItems();
            } else if (interactionMode === 'draw') {
                if (activeStroke) {
                    activeStroke.points.push(pt);
                    renderDrawCanvasStrokes();
                }
            }
        });

        stage.addEventListener('mousedown', (e) => {
            // Check if clicked on a resize handle
            const handleEl = e.target.closest('.pdf-anno-hdl');
            if (handleEl) {
                e.stopPropagation();
                const sel = getSelectedItem();
                if (!sel) return;
                saveHistory();
                isInteracting = true;
                interactionMode = 'resize';
                resizeHandle = handleEl.getAttribute('data-handle');
                startClientX = e.clientX;
                startClientY = e.clientY;
                startPtX = sel.ptX;
                startPtY = sel.ptY;
                startPtW = sel.ptW;
                startPtH = sel.ptH;
                return;
            }

            // Check if clicked on an existing annotation item
            const itemEl = e.target.closest('.pdf-anno-el');
            if (itemEl && (activeTool === 'select' || activeTool === 'edit-text')) {
                const id = itemEl.getAttribute('data-id');
                selectItem(id);
                const sel = getSelectedItem();
                if (!sel) return;
                saveHistory();
                isInteracting = true;
                interactionMode = 'drag';
                startClientX = e.clientX;
                startClientY = e.clientY;
                startPtX = sel.ptX;
                startPtY = sel.ptY;
                return;
            }

            // Clicked on blank area
            if (activeTool === 'select' || activeTool === 'edit-text') {
                deselectItem();
            } else if (activeTool === 'text') {
                saveHistory();
                const pt = getEventPdfPoint(e);
                const newText = {
                    id: 'text_' + Date.now(),
                    type: 'text',
                    ptX: pt.ptX,
                    ptY: pt.ptY,
                    ptW: 180,
                    ptH: 26,
                    text: 'New text',
                    fontFamily: textProps.fontFamily,
                    fontSize: textProps.fontSize,
                    color: textProps.color,
                    bgColor: textProps.bgColor,
                    bold: textProps.bold,
                    italic: textProps.italic
                };
                (pageAnnotations[currentPageNum] = pageAnnotations[currentPageNum] || []).push(newText);
                selectItem(newText.id);
                toolsRibbon.querySelector('[data-tool="select"]').click();
            } else if (activeTool === 'whiteout' || activeTool === 'redact' || activeTool === 'shape') {
                saveHistory();
                isInteracting = true;
                interactionMode = 'create-box';
                const pt = getEventPdfPoint(e);
                startPtX = pt.ptX;
                startPtY = pt.ptY;
            } else if (activeTool === 'draw' || activeTool === 'highlight') {
                saveHistory();
                isInteracting = true;
                interactionMode = 'draw';
                const pt = getEventPdfPoint(e);
                activeStroke = {
                    type: activeTool,
                    points: [pt],
                    color: activeTool === 'draw' ? penProps.color : highlightProps.color,
                    width: activeTool === 'draw' ? penProps.width : highlightProps.width,
                    opacity: activeTool === 'draw' ? 1.0 : 0.45
                };
                (pageDrawings[currentPageNum] = pageDrawings[currentPageNum] || []).push(activeStroke);
            }
        });

        window.addEventListener('mouseup', (e) => {
            if (!isInteracting) return;

            if (interactionMode === 'create-box') {
                const pt = getEventPdfPoint(e);
                const x = Math.min(startPtX, pt.ptX);
                const y = Math.min(startPtY, pt.ptY);
                const w = Math.max(15, Math.abs(pt.ptX - startPtX));
                const h = Math.max(10, Math.abs(pt.ptY - startPtY));

                let newItem = null;
                if (activeTool === 'whiteout') {
                    newItem = {
                        id: 'whiteout_' + Date.now(),
                        type: 'whiteout',
                        ptX: x, ptY: y, ptW: w, ptH: h,
                        fill: '#ffffff', opacity: 1.0
                    };
                } else if (activeTool === 'redact') {
                    newItem = {
                        id: 'redact_' + Date.now(),
                        type: 'redact',
                        ptX: x, ptY: y, ptW: w, ptH: h,
                        fill: '#000000', opacity: 1.0
                    };
                } else if (activeTool === 'shape') {
                    newItem = {
                        id: 'shape_' + Date.now(),
                        type: shapeSubtype,
                        ptX: x, ptY: y, ptW: w, ptH: h,
                        stroke: shapeProps.stroke,
                        strokeWidth: shapeProps.strokeWidth,
                        fill: shapeProps.fill,
                        opacity: 1.0
                    };
                }

                if (newItem) {
                    (pageAnnotations[currentPageNum] = pageAnnotations[currentPageNum] || []).push(newItem);
                    selectItem(newItem.id);
                    toolsRibbon.querySelector('[data-tool="select"]').click();
                }
            }

            isInteracting = false;
            interactionMode = null;
            activeStroke = null;
        });

        // Double Click to Edit Text In-Place on user annotations
        annoLayer.addEventListener('dblclick', (e) => {
            const itemEl = e.target.closest('.pdf-anno-el.type-text');
            if (!itemEl) return;
            const sel = getSelectedItem();
            if (!sel || sel.type !== 'text') return;

            const originalText = sel.text;
            const newText = prompt('Edit Text Content:', originalText);
            if (newText !== null && newText !== originalText) {
                saveHistory();
                sel.text = newText;
                renderAnnotationItems();
            }
        });

        // Keyboard Shortcuts
        window.addEventListener('keydown', (e) => {
            if (!wsBox || wsBox.style.display === 'none') return;
            // Ignore if active in input/textarea/contenteditable
            if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName) || document.activeElement.getAttribute('contenteditable') === 'true') return;

            if (e.key === 'Delete' || e.key === 'Backspace') {
                if (selectedId) {
                    e.preventDefault();
                    deleteSelectedItem();
                }
            } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
                e.preventDefault();
                if (e.shiftKey) redo();
                else undo();
            } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
                e.preventDefault();
                redo();
            }
        });

        // Topbar Controls Handlers
        prevBtn.onclick = () => {
            if (currentPageNum > 1) {
                currentPageNum--;
                pageNumInput.value = currentPageNum;
                renderPage(currentPageNum);
            }
        };

        nextBtn.onclick = () => {
            if (currentPageNum < totalPages) {
                currentPageNum++;
                pageNumInput.value = currentPageNum;
                renderPage(currentPageNum);
            }
        };

        pageNumInput.onchange = () => {
            const val = parseInt(pageNumInput.value, 10);
            if (val >= 1 && val <= totalPages) {
                currentPageNum = val;
                renderPage(currentPageNum);
            } else {
                pageNumInput.value = currentPageNum;
            }
        };

        rotateBtn.onclick = () => {
            currentRotation = (currentRotation + 90) % 360;
            pageRotations[currentPageNum] = currentRotation;
            renderPage(currentPageNum);
        };

        zoomInBtn.onclick = () => {
            if (currentZoom < 2.5) {
                currentZoom = Math.min(2.5, +(currentZoom + 0.15).toFixed(2));
                zoomTxt.textContent = `${Math.round(currentZoom * 100)}%`;
                renderPage(currentPageNum);
            }
        };

        zoomOutBtn.onclick = () => {
            if (currentZoom > 0.4) {
                currentZoom = Math.max(0.4, +(currentZoom - 0.15).toFixed(2));
                zoomTxt.textContent = `${Math.round(currentZoom * 100)}%`;
                renderPage(currentPageNum);
            }
        };

        zoomFitBtn.onclick = () => {
            const availWidth = viewport.clientWidth - 80;
            if (availWidth > 200 && pageWidthPt > 0) {
                currentZoom = +(availWidth / pageWidthPt).toFixed(2);
                zoomTxt.textContent = `${Math.round(currentZoom * 100)}%`;
                renderPage(currentPageNum);
            }
        };

        undoBtn.onclick = undo;
        redoBtn.onclick = redo;
        clearBtn.onclick = () => {
            if (confirm(`Clear all edits and annotations on Page ${currentPageNum}?`)) {
                saveHistory();
                pageAnnotations[currentPageNum] = [];
                pageDrawings[currentPageNum] = [];
                if (pageTextBlocks[currentPageNum]) {
                    pageTextBlocks[currentPageNum].forEach(b => {
                        b.str = b.origStr;
                        b.edited = false;
                    });
                }
                selectedId = null;
                renderPage(currentPageNum);
                updatePropertyRibbon();
            }
        };

        newBtn.onclick = () => {
            if (confirm('Discard changes and open another PDF document?')) {
                currentPdfBuffer = null;
                pdfDoc = null;
                wsBox.style.display = 'none';
                dzBox.style.display = 'block';
                hideStatus();
            }
        };

        // Insert Image Handler
        imgInput.onchange = (e) => {
            if (e.target.files && e.target.files[0]) {
                const file = e.target.files[0];
                const reader = new FileReader();
                reader.onload = () => {
                    const img = new Image();
                    img.onload = () => {
                        saveHistory();
                        const maxW = 200;
                        const aspect = img.height / img.width;
                        const w = Math.min(maxW, img.width);
                        const h = w * aspect;
                        const newItem = {
                            id: 'img_' + Date.now(),
                            type: 'image',
                            ptX: (pageWidthPt - w) / 2,
                            ptY: (pageHeightPt - h) / 2,
                            ptW: w,
                            ptH: h,
                            dataUrl: reader.result,
                            opacity: 1.0
                        };
                        (pageAnnotations[currentPageNum] = pageAnnotations[currentPageNum] || []).push(newItem);
                        selectItem(newItem.id);
                        toolsRibbon.querySelector('[data-tool="select"]').click();
                    };
                    img.src = reader.result;
                };
                reader.readAsDataURL(file);
            }
        };

        // Signature Modal Dialog
        function openSignatureModal() {
            let modal = document.getElementById('pdf-ed-sig-modal');
            if (!modal) {
                modal = document.createElement('div');
                modal.id = 'pdf-ed-sig-modal';
                modal.className = 'pdf-ed-modal';
                document.body.appendChild(modal);
            }

            modal.innerHTML = `
                <div class="pdf-ed-modal-card">
                    <div class="pdf-ed-modal-header">
                        <div class="pdf-ed-modal-title">✍️ Create & Insert Signature</div>
                        <button type="button" class="pdf-ed-modal-close" id="sig-modal-close">✕</button>
                    </div>
                    <div class="pdf-ed-modal-body">
                        <div class="pdf-ed-modal-tabs">
                            <button type="button" class="pdf-ed-tab-btn active" id="tab-sig-draw">Draw Signature</button>
                            <button type="button" class="pdf-ed-tab-btn" id="tab-sig-type">Type Signature</button>
                        </div>
                        <div id="sig-panel-draw">
                            <canvas class="pdf-ed-sig-pad" id="sig-pad-canvas" width="460" height="170"></canvas>
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:0.75rem;">
                                <div style="display:flex; gap:0.4rem; align-items:center;">
                                    <span style="font-size:0.75rem; color:var(--text-dim);">Ink:</span>
                                    <div class="pdf-ed-swatch active" data-ink="#000000" style="background:#000000;"></div>
                                    <div class="pdf-ed-swatch" data-ink="#1e3a8a" style="background:#1e3a8a;"></div>
                                    <div class="pdf-ed-swatch" data-ink="#2563eb" style="background:#2563eb;"></div>
                                </div>
                                <button type="button" class="pdf-ed-btn-mini" id="sig-clear-pad">Clear Pad</button>
                            </div>
                        </div>
                        <div id="sig-panel-type" style="display:none;">
                            <input type="text" id="sig-type-input" placeholder="Type your name (e.g. Shajjad Khan)" style="width:100%; padding:0.65rem 0.85rem; background:var(--bg-input); border:1px solid var(--border-dim); border-radius:var(--radius-sm); color:var(--text-main); font-size:1rem; margin-bottom:1rem;">
                            <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.75rem;" id="sig-type-previews">
                                ${['Brush Script MT', 'Dancing Script', 'Caveat', 'cursive'].map((f, i) => `
                                    <div class="sig-type-card ${i === 0 ? 'selected' : ''}" data-font="${f}" style="padding:0.75rem; background:#080d1a; border:1px solid var(--border-dim); border-radius:var(--radius-sm); cursor:pointer; text-align:center;">
                                        <div style="font-family:'${f}', cursive; font-size:1.4rem; color:var(--accent-blue); line-height:1.2;">Your Signature</div>
                                        <div style="font-size:0.7rem; color:var(--text-dim); margin-top:0.25rem;">Style ${i+1}</div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                    <div class="pdf-ed-modal-footer">
                        <button type="button" class="btn-secondary" id="sig-cancel-btn">Cancel</button>
                        <button type="button" class="btn-primary" id="sig-insert-btn">Insert Signature</button>
                    </div>
                </div>
            `;

            modal.style.display = 'flex';

            const padCanvas = modal.querySelector('#sig-pad-canvas');
            const padCtx = padCanvas.getContext('2d');
            let sigInk = '#000000';
            let isSigDrawing = false;
            let sigMode = 'draw';
            let selectedTypeFont = 'Brush Script MT';

            modal.querySelector('#sig-modal-close').onclick = () => modal.style.display = 'none';
            modal.querySelector('#sig-cancel-btn').onclick = () => modal.style.display = 'none';

            padCanvas.onmousedown = (e) => {
                isSigDrawing = true;
                const rect = padCanvas.getBoundingClientRect();
                padCtx.strokeStyle = sigInk;
                padCtx.lineWidth = 3;
                padCtx.lineCap = 'round';
                padCtx.lineJoin = 'round';
                padCtx.beginPath();
                padCtx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
            };
            padCanvas.onmousemove = (e) => {
                if (!isSigDrawing) return;
                const rect = padCanvas.getBoundingClientRect();
                padCtx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
                padCtx.stroke();
            };
            window.addEventListener('mouseup', () => isSigDrawing = false);

            modal.querySelectorAll('[data-ink]').forEach(sw => {
                sw.onclick = () => {
                    modal.querySelectorAll('[data-ink]').forEach(s => s.classList.remove('active'));
                    sw.classList.add('active');
                    sigInk = sw.getAttribute('data-ink');
                };
            });

            modal.querySelector('#sig-clear-pad').onclick = () => {
                padCtx.clearRect(0, 0, padCanvas.width, padCanvas.height);
            };

            modal.querySelector('#tab-sig-draw').onclick = () => {
                sigMode = 'draw';
                modal.querySelector('#tab-sig-draw').classList.add('active');
                modal.querySelector('#tab-sig-type').classList.remove('active');
                modal.querySelector('#sig-panel-draw').style.display = 'block';
                modal.querySelector('#sig-panel-type').style.display = 'none';
            };
            modal.querySelector('#tab-sig-type').onclick = () => {
                sigMode = 'type';
                modal.querySelector('#tab-sig-type').classList.add('active');
                modal.querySelector('#tab-sig-draw').classList.remove('active');
                modal.querySelector('#sig-panel-type').style.display = 'block';
                modal.querySelector('#sig-panel-draw').style.display = 'none';
            };

            const typeInput = modal.querySelector('#sig-type-input');
            typeInput.oninput = () => {
                const name = typeInput.value.trim() || 'Your Signature';
                modal.querySelectorAll('#sig-type-previews [style*="font-family"]').forEach(el => {
                    el.textContent = name;
                });
            };

            modal.querySelectorAll('.sig-type-card').forEach(card => {
                card.onclick = () => {
                    modal.querySelectorAll('.sig-type-card').forEach(c => {
                        c.classList.remove('selected');
                        c.style.borderColor = 'var(--border-dim)';
                    });
                    card.classList.add('selected');
                    card.style.borderColor = 'var(--accent)';
                    selectedTypeFont = card.getAttribute('data-font');
                };
            });

            function cropTransparent(canvas) {
                const ctx = canvas.getContext('2d');
                const w = canvas.width, h = canvas.height;
                const imgData = ctx.getImageData(0, 0, w, h).data;
                let minX = w, minY = h, maxX = 0, maxY = 0;

                for (let y = 0; y < h; y++) {
                    for (let x = 0; x < w; x++) {
                        const alpha = imgData[(y * w + x) * 4 + 3];
                        if (alpha > 10) {
                            if (x < minX) minX = x;
                            if (x > maxX) maxX = x;
                            if (y < minY) minY = y;
                            if (y > maxY) maxY = y;
                        }
                    }
                }

                if (minX > maxX || minY > maxY) return canvas.toDataURL('image/png');

                const pad = 8;
                const cropW = Math.max(20, (maxX - minX) + pad * 2);
                const cropH = Math.max(12, (maxY - minY) + pad * 2);
                const c = document.createElement('canvas');
                c.width = cropW;
                c.height = cropH;
                const cCtx = c.getContext('2d');
                cCtx.drawImage(canvas, minX, minY, maxX - minX, maxY - minY, pad, pad, maxX - minX, maxY - minY);
                return c.toDataURL('image/png');
            }

            modal.querySelector('#sig-insert-btn').onclick = () => {
                let dataUrl = null;
                if (sigMode === 'draw') {
                    dataUrl = cropTransparent(padCanvas);
                } else {
                    const name = typeInput.value.trim() || 'Signature';
                    const c = document.createElement('canvas');
                    c.width = 400;
                    c.height = 120;
                    const cCtx = c.getContext('2d');
                    cCtx.font = `44px '${selectedTypeFont}', cursive`;
                    cCtx.fillStyle = '#1e3a8a';
                    cCtx.textAlign = 'center';
                    cCtx.textBaseline = 'middle';
                    cCtx.fillText(name, 200, 60);
                    dataUrl = cropTransparent(c);
                }

                saveHistory();
                const sigW = 150;
                const sigH = 55;
                const newItem = {
                    id: 'sig_' + Date.now(),
                    type: 'signature',
                    ptX: (pageWidthPt - sigW) / 2,
                    ptY: (pageHeightPt - sigH) / 2,
                    ptW: sigW,
                    ptH: sigH,
                    dataUrl: dataUrl,
                    opacity: 1.0
                };
                (pageAnnotations[currentPageNum] = pageAnnotations[currentPageNum] || []).push(newItem);
                modal.style.display = 'none';
                selectItem(newItem.id);
                toolsRibbon.querySelector('[data-tool="select"]').click();
            };
        }

        // Stamp Preset Modal
        function openStampModal() {
            let modal = document.getElementById('pdf-ed-stamp-modal');
            if (!modal) {
                modal = document.createElement('div');
                modal.id = 'pdf-ed-stamp-modal';
                modal.className = 'pdf-ed-modal';
                document.body.appendChild(modal);
            }

            const stampList = [
                { text: 'APPROVED', color: '#10b981', border: '#10b981' },
                { text: 'CONFIDENTIAL', color: '#ef4444', border: '#ef4444' },
                { text: 'DRAFT', color: '#64748b', border: '#64748b' },
                { text: 'VOID', color: '#dc2626', border: '#dc2626' },
                { text: 'COMPLETED', color: '#2563eb', border: '#2563eb' },
                { text: 'URGENT', color: '#f59e0b', border: '#f59e0b' }
            ];

            modal.innerHTML = `
                <div class="pdf-ed-modal-card" style="max-width:440px;">
                    <div class="pdf-ed-modal-header">
                        <div class="pdf-ed-modal-title">🏷️ Insert Pre-formatted Stamp</div>
                        <button type="button" class="pdf-ed-modal-close" id="stamp-modal-close">✕</button>
                    </div>
                    <div class="pdf-ed-modal-body">
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.75rem;">
                            ${stampList.map((st, i) => `
                                <button type="button" class="pdf-stamp-btn" data-idx="${i}" style="padding:0.75rem; background:rgba(255,255,255,0.03); border:2px dashed ${st.border}; border-radius:var(--radius-sm); color:${st.color}; font-weight:800; font-size:1.05rem; cursor:pointer; letter-spacing:0.08em; transition:transform 0.1s;">
                                    ${st.text}
                                </button>
                            `).join('')}
                        </div>
                    </div>
                </div>
            `;

            modal.style.display = 'flex';
            modal.querySelector('#stamp-modal-close').onclick = () => modal.style.display = 'none';

            modal.querySelectorAll('.pdf-stamp-btn').forEach(btn => {
                btn.onclick = () => {
                    const idx = parseInt(btn.getAttribute('data-idx'), 10);
                    const st = stampList[idx];

                    const c = document.createElement('canvas');
                    c.width = 240;
                    c.height = 80;
                    const cCtx = c.getContext('2d');
                    cCtx.translate(120, 40);
                    cCtx.rotate(-0.08); // Subtle 4.5° stamp tilt
                    cCtx.translate(-120, -40);

                    cCtx.strokeStyle = st.border;
                    cCtx.lineWidth = 4;
                    cCtx.strokeRect(10, 10, 220, 60);

                    cCtx.fillStyle = st.color;
                    cCtx.font = '900 24px -apple-system, sans-serif';
                    cCtx.textAlign = 'center';
                    cCtx.textBaseline = 'middle';
                    cCtx.letterSpacing = '2px';
                    cCtx.fillText(st.text, 120, 40);

                    saveHistory();
                    const stW = 140;
                    const stH = 46;
                    const newItem = {
                        id: 'stamp_' + Date.now(),
                        type: 'stamp',
                        ptX: (pageWidthPt - stW) / 2,
                        ptY: (pageHeightPt - stH) / 2,
                        ptW: stW,
                        ptH: stH,
                        dataUrl: c.toDataURL('image/png'),
                        opacity: 0.95
                    };
                    (pageAnnotations[currentPageNum] = pageAnnotations[currentPageNum] || []).push(newItem);
                    modal.style.display = 'none';
                    selectItem(newItem.id);
                    toolsRibbon.querySelector('[data-tool="select"]').click();
                };
            });
        }

        // Lossless Vector PDF Export Engine
        exportBtn.onclick = async () => {
            if (!currentPdfBuffer) return;
            showStatus('Assembling precision vector PDF with Word-style text replacements...');
            try {
                const { PDFDocument, rgb, degrees, StandardFonts } = window.PDFLib;
                const pdfLibDoc = await PDFDocument.load(currentPdfBuffer);

                // Embed Standard Fonts
                const embeddedFonts = {
                    'Helvetica': await pdfLibDoc.embedFont(StandardFonts.Helvetica),
                    'Helvetica-Bold': await pdfLibDoc.embedFont(StandardFonts.HelveticaBold),
                    'Helvetica-Oblique': await pdfLibDoc.embedFont(StandardFonts.HelveticaOblique),
                    'Helvetica-BoldOblique': await pdfLibDoc.embedFont(StandardFonts.HelveticaBoldOblique),
                    'Times': await pdfLibDoc.embedFont(StandardFonts.TimesRoman),
                    'Times-Bold': await pdfLibDoc.embedFont(StandardFonts.TimesRomanBold),
                    'Times-Italic': await pdfLibDoc.embedFont(StandardFonts.TimesRomanItalic),
                    'Courier': await pdfLibDoc.embedFont(StandardFonts.Courier),
                    'Courier-Bold': await pdfLibDoc.embedFont(StandardFonts.CourierBold),
                };

                const pages = pdfLibDoc.getPages();
                for (let pIdx = 0; pIdx < pages.length; pIdx++) {
                    const pageNum = pIdx + 1;
                    const page = pages[pIdx];
                    const { width: pWidth, height: pHeight } = page.getSize();

                    // Apply custom rotation if updated
                    if (pageRotations[pageNum]) {
                        const curRot = page.getRotation().angle || 0;
                        page.setRotation(degrees((curRot + pageRotations[pageNum]) % 360));
                    }

                    // 1. Process Word-Mode Edited Text Blocks (In-Place Date & Text Replacement)
                    const textBlocks = pageTextBlocks[pageNum] || [];
                    const editedBlocks = textBlocks.filter(b => b.edited && b.str !== b.origStr);

                    for (const b of editedBlocks) {
                        // Mask the original text area permanently with white rectangle
                        const maskX = b.ptX - 1;
                        const maskY = pHeight - b.ptY - b.origPtH - 1;
                        const maskW = Math.max(b.origPtW, b.ptW) + 3;
                        const maskH = b.origPtH + 3;

                        page.drawRectangle({
                            x: maskX,
                            y: maskY,
                            width: maskW,
                            height: maskH,
                            color: rgb(1, 1, 1),
                            opacity: 1.0
                        });

                        // Draw the replacement text in place
                        if (b.str.trim()) {
                            const fontKey = b.fontFamily || 'Helvetica';
                            const font = embeddedFonts[fontKey] || embeddedFonts['Helvetica'];
                            const fontSize = b.fontSize || 12;
                            const textColor = hexToRgb(b.color || '#000000');

                            page.drawText(b.str, {
                                x: b.ptX,
                                y: pHeight - b.ptY - (fontSize * 0.85),
                                size: fontSize,
                                font: font,
                                color: rgb(textColor.r, textColor.g, textColor.b)
                            });
                        }
                    }

                    // 2. Export Freehand Drawings (Pen & Highlighter)
                    const drawings = pageDrawings[pageNum] || [];
                    if (drawings.length > 0) {
                        const dpr = 2; // high-res canvas
                        const dCanvas = document.createElement('canvas');
                        dCanvas.width = Math.round(pWidth * dpr);
                        dCanvas.height = Math.round(pHeight * dpr);
                        const dCtx = dCanvas.getContext('2d');
                        dCtx.scale(dpr, dpr);

                        for (const stroke of drawings) {
                            if (!stroke.points || stroke.points.length < 2) continue;
                            dCtx.save();
                            dCtx.strokeStyle = stroke.color;
                            dCtx.lineWidth = stroke.width;
                            dCtx.lineCap = 'round';
                            dCtx.lineJoin = 'round';
                            dCtx.globalAlpha = stroke.opacity ?? 1.0;
                            dCtx.beginPath();
                            dCtx.moveTo(stroke.points[0].ptX, stroke.points[0].ptY);
                            for (let i = 1; i < stroke.points.length; i++) {
                                dCtx.lineTo(stroke.points[i].ptX, stroke.points[i].ptY);
                            }
                            dCtx.stroke();
                            dCtx.restore();
                        }

                        const dataUrl = dCanvas.toDataURL('image/png');
                        const pngBytes = dataUriToUint8(dataUrl);
                        const embeddedDrawing = await pdfLibDoc.embedPng(pngBytes);
                        page.drawImage(embeddedDrawing, {
                            x: 0,
                            y: 0,
                            width: pWidth,
                            height: pHeight
                        });
                    }

                    // 3. Export Vector Annotations
                    const items = pageAnnotations[pageNum] || [];
                    for (const item of items) {
                        if (item.type === 'whiteout' || item.type === 'redact' || item.type === 'rect') {
                            const x = item.ptX;
                            const y = pHeight - item.ptY - item.ptH;
                            const w = Math.max(1, item.ptW);
                            const h = Math.max(1, item.ptH);

                            const fillHex = item.fill || (item.type === 'whiteout' ? '#ffffff' : '#000000');
                            const fColor = hexToRgb(fillHex);
                            const rectOpts = {
                                x: x,
                                y: y,
                                width: w,
                                height: h,
                                color: rgb(fColor.r, fColor.g, fColor.b),
                                opacity: item.opacity ?? 1.0
                            };
                            if (item.stroke && item.strokeWidth > 0) {
                                const sColor = hexToRgb(item.stroke);
                                rectOpts.borderColor = rgb(sColor.r, sColor.g, sColor.b);
                                rectOpts.borderWidth = item.strokeWidth;
                            }
                            page.drawRectangle(rectOpts);
                        } else if (item.type === 'circle') {
                            const radius = Math.min(item.ptW, item.ptH) / 2;
                            const centerX = item.ptX + radius;
                            const centerY = pHeight - item.ptY - radius;
                            const fillHex = item.fill && item.fill !== 'transparent' ? item.fill : null;
                            const circleOpts = {
                                x: centerX,
                                y: centerY,
                                size: radius,
                                opacity: item.opacity ?? 1.0
                            };
                            if (fillHex) {
                                const fColor = hexToRgb(fillHex);
                                circleOpts.color = rgb(fColor.r, fColor.g, fColor.b);
                            }
                            if (item.stroke && item.strokeWidth > 0) {
                                const sColor = hexToRgb(item.stroke);
                                circleOpts.borderColor = rgb(sColor.r, sColor.g, sColor.b);
                                circleOpts.borderWidth = item.strokeWidth;
                            }
                            try {
                                page.drawCircle(circleOpts);
                            } catch (e) {
                                page.drawRectangle({
                                    x: item.ptX, y: pHeight - item.ptY - item.ptH,
                                    width: item.ptW, height: item.ptH,
                                    color: fillHex ? rgb(fColor.r, fColor.g, fColor.b) : undefined
                                });
                            }
                        } else if (item.type === 'line' || item.type === 'arrow') {
                            const startX = item.ptX;
                            const startY = pHeight - item.ptY;
                            const endX = item.ptX + item.ptW;
                            const endY = pHeight - (item.ptY + item.ptH);
                            const sColor = hexToRgb(item.stroke || '#000000');
                            page.drawLine({
                                start: { x: startX, y: startY },
                                end: { x: endX, y: endY },
                                thickness: item.strokeWidth || 2,
                                color: rgb(sColor.r, sColor.g, sColor.b),
                                opacity: item.opacity ?? 1.0
                            });
                            if (item.type === 'arrow') {
                                const angle = Math.atan2(endY - startY, endX - startX);
                                const headLen = Math.max(8, (item.strokeWidth || 2) * 3.5);
                                page.drawLine({
                                    start: { x: endX, y: endY },
                                    end: { x: endX - headLen * Math.cos(angle - Math.PI / 6), y: endY - headLen * Math.sin(angle - Math.PI / 6) },
                                    thickness: item.strokeWidth || 2,
                                    color: rgb(sColor.r, sColor.g, sColor.b)
                                });
                                page.drawLine({
                                    start: { x: endX, y: endY },
                                    end: { x: endX - headLen * Math.cos(angle + Math.PI / 6), y: endY - headLen * Math.sin(angle + Math.PI / 6) },
                                    thickness: item.strokeWidth || 2,
                                    color: rgb(sColor.r, sColor.g, sColor.b)
                                });
                            }
                        } else if (item.type === 'text') {
                            let fontKey = item.fontFamily || 'Helvetica';
                            if (item.bold && item.italic) fontKey = fontKey === 'Times' ? 'Times-BoldItalic' : (fontKey === 'Courier' ? 'Courier-BoldOblique' : 'Helvetica-BoldOblique');
                            else if (item.bold) fontKey = fontKey === 'Times' ? 'Times-Bold' : (fontKey === 'Courier' ? 'Courier-Bold' : 'Helvetica-Bold');
                            else if (item.italic) fontKey = fontKey === 'Times' ? 'Times-Italic' : (fontKey === 'Courier' ? 'Courier-Oblique' : 'Helvetica-Oblique');

                            const selectedFont = embeddedFonts[fontKey] || embeddedFonts['Helvetica'];
                            const fontSize = item.fontSize || 14;
                            const lines = (item.text || '').split('\n');
                            const lineHeight = fontSize * 1.25;

                            if (item.bgColor && item.bgColor !== 'transparent') {
                                const bg = hexToRgb(item.bgColor);
                                page.drawRectangle({
                                    x: item.ptX - 2,
                                    y: pHeight - item.ptY - (lines.length * lineHeight) - 2,
                                    width: Math.max(item.ptW, 20) + 4,
                                    height: (lines.length * lineHeight) + 4,
                                    color: rgb(bg.r, bg.g, bg.b),
                                    opacity: 1.0
                                });
                            }

                            const textColor = hexToRgb(item.color || '#000000');
                            for (let l = 0; l < lines.length; l++) {
                                const line = lines[l];
                                const lineY = pHeight - item.ptY - (fontSize * 0.82) - (l * lineHeight);
                                page.drawText(line, {
                                    x: item.ptX,
                                    y: lineY,
                                    size: fontSize,
                                    font: selectedFont,
                                    color: rgb(textColor.r, textColor.g, textColor.b),
                                    maxWidth: Math.max(item.ptW, pWidth - item.ptX)
                                });
                            }
                        } else if (item.type === 'image' || item.type === 'signature' || item.type === 'stamp') {
                            if (item.dataUrl) {
                                const imgBytes = dataUriToUint8(item.dataUrl);
                                let embeddedImg;
                                if (item.dataUrl.startsWith('data:image/jpeg') || item.dataUrl.startsWith('data:image/jpg')) {
                                    embeddedImg = await pdfLibDoc.embedJpg(imgBytes);
                                } else {
                                    embeddedImg = await pdfLibDoc.embedPng(imgBytes);
                                }
                                const x = item.ptX;
                                const y = pHeight - item.ptY - item.ptH;
                                page.drawImage(embeddedImg, {
                                    x: x,
                                    y: y,
                                    width: item.ptW,
                                    height: item.ptH,
                                    opacity: item.opacity ?? 1.0
                                });
                            }
                        }
                    }
                }

                const modifiedBytes = await pdfLibDoc.save();
                const blob = new Blob([modifiedBytes], { type: 'application/pdf' });
                Utils.downloadBlob(blob, `${originalFileName.replace(/\.pdf$/i, '')}-edited.pdf`);
                showStatus('✓ Precision vector PDF exported with text updates!', false);
                setTimeout(hideStatus, 5000);
            } catch (err) {
                console.error('PDF export failed:', err);
                showStatus('Export failed: ' + err.message, true);
            }
        };
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
        container.innerHTML = `
            <div class="dt-calc-container">
                <div class="dt-calc-intro">
                    <span class="dt-calc-kicker">Simple date math</span>
                    <h2>How much time is between two dates?</h2>
                    <p>Choose a calculator mode below. Start with <strong>Count days</strong> for the clearest answer, then add time or workday rules only when you need them.</p>
                </div>
                <!-- Navigation Tabs -->
                <div class="dt-calc-tabs">
                    <button class="dt-calc-tab-btn active" data-tab="datediff">
                        <span>📅</span> Count days
                    </button>
                    <button class="dt-calc-tab-btn" data-tab="dateadd">
                        <span>➕</span> Add or subtract
                    </button>
                    <button class="dt-calc-tab-btn" data-tab="timetotime">
                        <span>⏱️</span> Compare times
                    </button>
                    <button class="dt-calc-tab-btn" data-tab="datetimerange">
                        <span>🗓️</span> Date + time
                    </button>
                    <button class="dt-calc-tab-btn" data-tab="countdown">
                        <span>⏳</span> Live Countdown
                    </button>
                </div>

                <!-- Mode 1: Date to Date Difference -->
                <div class="dt-panel active" id="dt-panel-datediff">
                    <div class="tool-form-grid">
                        <div class="control-group">
                            <label>Start Date</label>
                            <input type="date" id="dd-start" class="code-area" style="height:44px; padding:0 10px;">
                            <div class="dt-presets-row">
                                <button class="dt-preset-pill" data-target="dd-start" data-preset="today">Today</button>
                                <button class="dt-preset-pill" data-target="dd-start" data-preset="yesterday">Yesterday</button>
                                <button class="dt-preset-pill" data-target="dd-start" data-preset="start-month">1st of Month</button>
                                <button class="dt-preset-pill" data-target="dd-start" data-preset="start-year">Jan 1</button>
                            </div>
                        </div>

                        <div class="control-group">
                            <label>End Date</label>
                            <input type="date" id="dd-end" class="code-area" style="height:44px; padding:0 10px;">
                            <div class="dt-presets-row">
                                <button class="dt-preset-pill" data-target="dd-end" data-preset="today">Today</button>
                                <button class="dt-preset-pill" data-target="dd-end" data-preset="plus30">+30 Days</button>
                                <button class="dt-preset-pill" data-target="dd-end" data-preset="plus90">+90 Days</button>
                                <button class="dt-preset-pill" data-target="dd-end" data-preset="end-month">End of Month</button>
                                <button class="dt-preset-pill" data-target="dd-end" data-preset="end-year">Dec 31</button>
                            </div>
                        </div>

                        <div class="control-group">
                            <label>Weekend Standard</label>
                            <select id="dd-weekend" class="code-area" style="height:44px;">
                                <option value="sat-sun">Saturday & Sunday (Standard)</option>
                                <option value="fri-sat">Friday & Saturday (Middle East / GCC)</option>
                                <option value="fri">Friday Only</option>
                                <option value="sun">Sunday Only</option>
                                <option value="none">None (7 Days / Week)</option>
                            </select>
                            <div style="margin-top: .6rem; display: flex; align-items: center; gap: .5rem;">
                                <input type="checkbox" id="dd-include-end" style="width: auto; cursor: pointer;">
                                <label for="dd-include-end" style="margin-bottom:0; font-size: .82rem; cursor: pointer; color: var(--text-main);">
                                    Include end date (+1 day)
                                </label>
                            </div>
                        </div>
                    </div>

                    <!-- Hero Result Card -->
                    <div class="dt-hero-card" id="dd-hero">
                        <div class="dt-hero-label">Duration Between Dates</div>
                        <div class="dt-hero-value" id="dd-hero-val">0 Days</div>
                        <div class="dt-hero-sub" id="dd-hero-sub">Loading date difference...</div>
                        <div class="dt-progress-wrap" id="dd-progress-wrap" style="display: none;">
                            <div style="display:flex; justify-content:space-between; font-size:.75rem; color:#94a3b8;">
                                <span>Timeline Progress</span>
                                <span id="dd-progress-pct">0%</span>
                            </div>
                            <div class="dt-progress-track">
                                <div class="dt-progress-bar" id="dd-progress-bar" style="width: 0%;"></div>
                            </div>
                        </div>
                    </div>

                    <!-- Metrics Grid -->
                    <div class="dt-metrics-grid" id="dd-metrics"></div>

                    <div class="controls-panel">
                        <button class="btn-primary" id="dd-copy-btn">📋 Copy Full Summary</button>
                        <button class="btn-secondary" id="dd-swap-btn">🔄 Swap Start / End</button>
                    </div>
                </div>

                <!-- Mode 2: Add or Subtract Days -->
                <div class="dt-panel" id="dt-panel-dateadd">
                    <div class="tool-form-grid">
                        <div class="control-group">
                            <label>Starting Date</label>
                            <input type="date" id="da-start" class="code-area" style="height:44px; padding:0 10px;">
                            <div class="dt-presets-row">
                                <button class="dt-preset-pill" data-target="da-start" data-preset="today">Today</button>
                                <button class="dt-preset-pill" data-target="da-start" data-preset="tomorrow">Tomorrow</button>
                                <button class="dt-preset-pill" data-target="da-start" data-preset="start-month">1st of Month</button>
                            </div>
                        </div>

                        <div class="control-group">
                            <label>Operation</label>
                            <div style="display:flex; gap:.5rem; height:44px;">
                                <button type="button" class="btn-primary da-op-btn active" data-op="add" style="flex:1; justify-content:center;">➕ Add (+)</button>
                                <button type="button" class="btn-secondary da-op-btn" data-op="sub" style="flex:1; justify-content:center;">➖ Subtract (-)</button>
                            </div>
                            <input type="hidden" id="da-op" value="add">
                        </div>

                        <div class="control-group">
                            <label>Calculation Mode</label>
                            <select id="da-weekend-mode" class="code-area" style="height:44px;">
                                <option value="all">All Calendar Days</option>
                                <option value="business-sat-sun">Working Days Only (Skip Sat/Sun)</option>
                                <option value="business-fri-sat">Working Days Only (Skip Fri/Sat - GCC)</option>
                            </select>
                        </div>
                    </div>

                    <!-- Quantity Inputs -->
                    <div class="tool-form-grid">
                        <div class="control-group">
                            <label>Days</label>
                            <input type="number" id="da-days" value="30" min="0" class="code-area" style="height:44px;">
                        </div>
                        <div class="control-group">
                            <label>Weeks</label>
                            <input type="number" id="da-weeks" value="0" min="0" class="code-area" style="height:44px;">
                        </div>
                        <div class="control-group">
                            <label>Months</label>
                            <input type="number" id="da-months" value="0" min="0" class="code-area" style="height:44px;">
                        </div>
                        <div class="control-group">
                            <label>Years</label>
                            <input type="number" id="da-years" value="0" min="0" class="code-area" style="height:44px;">
                        </div>
                    </div>

                    <!-- Quick Preset Pills -->
                    <div>
                        <div style="font-size: .8rem; font-weight: 600; color: #94a3b8; margin-bottom: .3rem;">Quick Add Presets:</div>
                        <div class="dt-presets-row">
                            <button class="dt-preset-pill da-preset" data-days="7" data-weeks="0" data-months="0" data-years="0">+7 Days (1 Wk)</button>
                            <button class="dt-preset-pill da-preset" data-days="14" data-weeks="0" data-months="0" data-years="0">+14 Days (2 Wks)</button>
                            <button class="dt-preset-pill da-preset" data-days="30" data-weeks="0" data-months="0" data-years="0">+30 Days (1 Mo)</button>
                            <button class="dt-preset-pill da-preset" data-days="60" data-weeks="0" data-months="0" data-years="0">+60 Days (2 Mos)</button>
                            <button class="dt-preset-pill da-preset" data-days="90" data-weeks="0" data-months="0" data-years="0">+90 Days (Quarter)</button>
                            <button class="dt-preset-pill da-preset" data-days="180" data-weeks="0" data-months="0" data-years="0">+180 Days (Half Yr)</button>
                            <button class="dt-preset-pill da-preset" data-days="0" data-weeks="0" data-months="0" data-years="1">+1 Year</button>
                        </div>
                    </div>

                    <!-- Hero Target Date Result -->
                    <div class="dt-hero-card" id="da-hero">
                        <div class="dt-hero-label">Resulting Target Date</div>
                        <div class="dt-hero-value" id="da-hero-val">-</div>
                        <div class="dt-hero-sub" id="da-hero-sub">-</div>
                    </div>

                    <!-- Details Grid -->
                    <div class="dt-metrics-grid" id="da-metrics"></div>

                    <div class="controls-panel">
                        <button class="btn-primary" id="da-copy-iso">📋 Copy Date (YYYY-MM-DD)</button>
                        <button class="btn-secondary" id="da-copy-full">📋 Copy Full Description</button>
                        <button class="btn-secondary" id="da-use-diff">➡️ Use in Date to Date Diff</button>
                    </div>
                </div>

                <!-- Mode 3: Time to Time -->
                <div class="dt-panel" id="dt-panel-timetotime">
                    <div class="tool-form-grid">
                        <div class="control-group">
                            <label>Start Time</label>
                            <input type="time" id="tt-start-time" value="09:00" class="code-area" style="height:44px;">
                            <div class="dt-presets-row">
                                <button class="dt-preset-pill tt-preset-start" data-time="now">Now</button>
                                <button class="dt-preset-pill tt-preset-start" data-time="08:00">08:00 AM</button>
                                <button class="dt-preset-pill tt-preset-start" data-time="09:00">09:00 AM</button>
                                <button class="dt-preset-pill tt-preset-start" data-time="13:00">01:00 PM</button>
                            </div>
                        </div>

                        <div class="control-group">
                            <label>End Time</label>
                            <input type="time" id="tt-end-time" value="17:30" class="code-area" style="height:44px;">
                            <div class="dt-presets-row">
                                <button class="dt-preset-pill tt-preset-end" data-time="now">Now</button>
                                <button class="dt-preset-pill tt-preset-end" data-time="17:00">05:00 PM</button>
                                <button class="dt-preset-pill tt-preset-end" data-time="18:00">06:00 PM</button>
                                <button class="dt-preset-pill tt-preset-end" data-time="22:00">10:00 PM</button>
                            </div>
                        </div>

                        <div class="control-group">
                            <label>Break / Lunch Deduction (Mins)</label>
                            <input type="number" id="tt-break" value="30" min="0" step="5" class="code-area" style="height:44px;">
                            <div class="dt-presets-row">
                                <button class="dt-preset-pill tt-preset-break" data-break="0">None</button>
                                <button class="dt-preset-pill tt-preset-break" data-break="15">15m</button>
                                <button class="dt-preset-pill tt-preset-break" data-break="30">30m</button>
                                <button class="dt-preset-pill tt-preset-break" data-break="45">45m</button>
                                <button class="dt-preset-pill tt-preset-break" data-break="60">60m</button>
                            </div>
                        </div>

                        <div class="control-group">
                            <label>Hourly Wage / Rate (Optional)</label>
                            <input type="number" id="tt-rate" placeholder="e.g. 50 (SAR/hr)" min="0" step="0.5" class="code-area" style="height:44px;">
                            <div style="margin-top: .6rem; display: flex; align-items: center; gap: .5rem;">
                                <input type="checkbox" id="tt-overnight" style="width: auto; cursor: pointer;">
                                <label for="tt-overnight" style="margin-bottom:0; font-size: .82rem; cursor: pointer; color: var(--text-main);">
                                    Overnight / Next Day (+24h)
                                </label>
                            </div>
                        </div>
                    </div>

                    <!-- Hero Time Result -->
                    <div class="dt-hero-card" id="tt-hero">
                        <div class="dt-hero-label">Net Work Time</div>
                        <div class="dt-hero-value" id="tt-hero-val">8h 00m</div>
                        <div class="dt-hero-sub" id="tt-hero-sub">Gross: 8h 30m | 30m unpaid break</div>
                    </div>

                    <!-- Metrics Grid -->
                    <div class="dt-metrics-grid" id="tt-metrics"></div>

                    <div class="controls-panel">
                        <button class="btn-primary" id="tt-copy-btn">📋 Copy Timesheet Entry</button>
                    </div>
                </div>

                <!-- Mode 4: Date & Time Range -->
                <div class="dt-panel" id="dt-panel-datetimerange">
                    <div class="tool-form-grid">
                        <div class="control-group">
                            <label>Start Date & Time</label>
                            <input type="datetime-local" id="dtr-start" class="code-area" style="height:44px; padding:0 10px;">
                        </div>
                        <div class="control-group">
                            <label>End Date & Time</label>
                            <input type="datetime-local" id="dtr-end" class="code-area" style="height:44px; padding:0 10px;">
                        </div>
                    </div>

                    <div class="dt-hero-card" id="dtr-hero">
                        <div class="dt-hero-label">Exact Date & Time Span</div>
                        <div class="dt-hero-value" id="dtr-hero-val">-</div>
                        <div class="dt-hero-sub" id="dtr-hero-sub">-</div>
                    </div>

                    <div class="dt-metrics-grid" id="dtr-metrics"></div>

                    <div class="controls-panel">
                        <button class="btn-primary" id="dtr-copy-btn">📋 Copy Exact Span</button>
                    </div>
                </div>

                <!-- Mode 5: Live Countdown -->
                <div class="dt-panel" id="dt-panel-countdown">
                    <div class="tool-form-grid">
                        <div class="control-group">
                            <label>Event / Milestone Name</label>
                            <input type="text" id="cd-title" value="Project Delivery Deadline" class="code-area" style="height:44px; padding:0 10px;">
                        </div>
                        <div class="control-group">
                            <label>Target Date & Time</label>
                            <input type="datetime-local" id="cd-target" class="code-area" style="height:44px; padding:0 10px;">
                            <div class="dt-presets-row">
                                <button class="dt-preset-pill cd-preset" data-preset="tomorrow">Tomorrow 9 AM</button>
                                <button class="dt-preset-pill cd-preset" data-preset="friday">Friday 5 PM</button>
                                <button class="dt-preset-pill cd-preset" data-preset="end-month">End of Month</button>
                                <button class="dt-preset-pill cd-preset" data-preset="new-year">New Year 2027</button>
                            </div>
                        </div>
                    </div>

                    <!-- Digital Ticking Clock Display -->
                    <div class="dt-hero-card" style="text-align: center; align-items: center;">
                        <div class="dt-hero-label" id="cd-event-label">COUNTDOWN TO TARGET</div>
                        <div class="dt-countdown-clock">
                            <div class="dt-countdown-unit">
                                <div class="dt-countdown-num" id="cd-days">00</div>
                                <div class="dt-countdown-lbl">Days</div>
                            </div>
                            <div class="dt-countdown-unit">
                                <div class="dt-countdown-num" id="cd-hours">00</div>
                                <div class="dt-countdown-lbl">Hours</div>
                            </div>
                            <div class="dt-countdown-unit">
                                <div class="dt-countdown-num" id="cd-mins">00</div>
                                <div class="dt-countdown-lbl">Minutes</div>
                            </div>
                            <div class="dt-countdown-unit">
                                <div class="dt-countdown-num" id="cd-secs">00</div>
                                <div class="dt-countdown-lbl">Seconds</div>
                            </div>
                        </div>
                        <div class="dt-hero-sub" id="cd-status-sub">Calculating live time...</div>
                    </div>
                </div>
            </div>
        `;

        // Tab Switching Logic
        const tabBtns = container.querySelectorAll('.dt-calc-tab-btn');
        const panels = container.querySelectorAll('.dt-panel');
        tabBtns.forEach(btn => {
            btn.onclick = () => {
                tabBtns.forEach(b => b.classList.remove('active'));
                panels.forEach(p => p.classList.remove('active'));
                btn.classList.add('active');
                const targetId = `dt-panel-${btn.dataset.tab}`;
                const targetPanel = container.querySelector(`#${targetId}`);
                if (targetPanel) targetPanel.classList.add('active');
            };
        });

        // -------------------------------------------------------------
        // Helper Utilities
        // -------------------------------------------------------------
        const pad2 = n => String(n).padStart(2, '0');

        const parseYMD = str => {
            if (!str) return new Date();
            const [y, m, d] = str.split('-').map(Number);
            return new Date(y, (m || 1) - 1, d || 1);
        };

        const formatYMD = d => {
            if (!d || isNaN(d)) return '';
            return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
        };

        const formatLongDate = d => {
            if (!d || isNaN(d)) return '';
            return d.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        };

        const isWeekend = (d, type) => {
            const day = d.getDay(); // 0 = Sun, 1 = Mon ... 6 = Sat
            if (type === 'sat-sun') return day === 0 || day === 6;
            if (type === 'fri-sat') return day === 5 || day === 6;
            if (type === 'fri') return day === 5;
            if (type === 'sun') return day === 0;
            return false;
        };

        const getDayOfYear = d => {
            const start = new Date(d.getFullYear(), 0, 0);
            const diff = d - start + ((start.getTimezoneOffset() - d.getTimezoneOffset()) * 60000);
            return Math.floor(diff / 864e5);
        };

        const getISOWeek = d => {
            const target = new Date(d.valueOf());
            const dayNr = (d.getDay() + 6) % 7;
            target.setDate(target.getDate() - dayNr + 3);
            const firstThursday = target.valueOf();
            target.setMonth(0, 1);
            if (target.getDay() !== 4) {
                target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
            }
            return 1 + Math.ceil((firstThursday - target) / 6048e5);
        };

        const isLeapYear = y => ((y % 4 === 0) && (y % 100 !== 0)) || (y % 400 === 0);

        // -------------------------------------------------------------
        // MODE 1: Date to Date Difference
        // -------------------------------------------------------------
        const ddStart = container.querySelector('#dd-start');
        const ddEnd = container.querySelector('#dd-end');
        const ddWeekend = container.querySelector('#dd-weekend');
        const ddIncludeEnd = container.querySelector('#dd-include-end');
        const ddHeroVal = container.querySelector('#dd-hero-val');
        const ddHeroSub = container.querySelector('#dd-hero-sub');
        const ddMetrics = container.querySelector('#dd-metrics');
        const ddProgressWrap = container.querySelector('#dd-progress-wrap');
        const ddProgressBar = container.querySelector('#dd-progress-bar');
        const ddProgressPct = container.querySelector('#dd-progress-pct');

        // Init default dates: Start = Today, End = +30 Days
        const now = new Date();
        ddStart.value = formatYMD(now);
        const defaultEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 30);
        ddEnd.value = formatYMD(defaultEnd);

        function calcDateDiff() {
            if (!ddStart.value || !ddEnd.value) return;
            let d1 = parseYMD(ddStart.value);
            let d2 = parseYMD(ddEnd.value);
            const isReversed = d2 < d1;
            const startD = isReversed ? d2 : d1;
            const endD = isReversed ? d1 : d2;

            const includeEnd = ddIncludeEnd.checked;
            const weekendType = ddWeekend.value;

            // Total Days
            let totalDays = Math.round((endD - startD) / 864e5);
            if (includeEnd) totalDays += 1;

            // Business days vs Weekend days
            let busDays = 0;
            let wkndDays = 0;
            let cur = new Date(startD.getFullYear(), startD.getMonth(), startD.getDate());
            const limit = includeEnd ? endD : new Date(endD.getFullYear(), endD.getMonth(), endD.getDate() - 1);

            while (cur <= limit) {
                if (isWeekend(cur, weekendType)) {
                    wkndDays++;
                } else {
                    busDays++;
                }
                cur.setDate(cur.getDate() + 1);
            }

            // Natural Years, Months, Days breakdown
            let yDiff = endD.getFullYear() - startD.getFullYear();
            let mDiff = endD.getMonth() - startD.getMonth();
            let dDiff = endD.getDate() - startD.getDate();

            if (includeEnd) dDiff += 1;
            if (dDiff < 0) {
                const prevMonthLast = new Date(endD.getFullYear(), endD.getMonth(), 0).getDate();
                dDiff += prevMonthLast;
                mDiff -= 1;
            }
            if (mDiff < 0) {
                mDiff += 12;
                yDiff -= 1;
            }

            const parts = [];
            if (yDiff > 0) parts.push(`${yDiff} year${yDiff > 1 ? 's' : ''}`);
            if (mDiff > 0) parts.push(`${mDiff} month${mDiff > 1 ? 's' : ''}`);
            if (dDiff > 0 || parts.length === 0) parts.push(`${dDiff} day${dDiff !== 1 ? 's' : ''}`);
            const naturalStr = parts.join(', ');

            // Hero Display
            ddHeroVal.textContent = `${totalDays.toLocaleString()} Days (${naturalStr})`;
            const revNote = isReversed ? ' [End Date is earlier than Start Date]' : '';
            ddHeroSub.textContent = `${formatLongDate(startD)} → ${formatLongDate(endD)}${revNote}`;

            // Metrics Cards
            const weeks = Math.floor(totalDays / 7);
            const remDays = totalDays % 7;
            const hours = totalDays * 24;
            const minutes = hours * 60;
            const seconds = minutes * 60;
            const pctYear = ((totalDays / (isLeapYear(startD.getFullYear()) ? 366 : 365)) * 100).toFixed(1);

            ddMetrics.innerHTML = `
                <div class="dt-metric-box">
                    <div class="dt-metric-title">📆 Total Calendar Days</div>
                    <div class="dt-metric-data">${totalDays.toLocaleString()}</div>
                </div>
                <div class="dt-metric-box">
                    <div class="dt-metric-title">💼 Business Workdays</div>
                    <div class="dt-metric-data" style="color: #34d399;">${busDays.toLocaleString()}</div>
                </div>
                <div class="dt-metric-box">
                    <div class="dt-metric-title">🏖️ Weekend Days</div>
                    <div class="dt-metric-data" style="color: #fbbf24;">${wkndDays.toLocaleString()}</div>
                </div>
                <div class="dt-metric-box">
                    <div class="dt-metric-title">📅 Weeks & Days</div>
                    <div class="dt-metric-data">${weeks}w ${remDays}d</div>
                </div>
                <div class="dt-metric-box">
                    <div class="dt-metric-title">🕒 Equivalent Hours</div>
                    <div class="dt-metric-data">${hours.toLocaleString()} h</div>
                </div>
                <div class="dt-metric-box">
                    <div class="dt-metric-title">⏱️ Total Minutes</div>
                    <div class="dt-metric-data">${minutes.toLocaleString()} m</div>
                </div>
                <div class="dt-metric-box">
                    <div class="dt-metric-title">⚡ Total Seconds</div>
                    <div class="dt-metric-data">${seconds.toLocaleString()} s</div>
                </div>
                <div class="dt-metric-box">
                    <div class="dt-metric-title">📊 % of Current Year</div>
                    <div class="dt-metric-data" style="color: #38bdf8;">${pctYear}%</div>
                </div>
            `;

            // Progress Timeline bar if today is between start and end
            const todayMid = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            if (todayMid >= startD && todayMid <= endD && totalDays > 0) {
                const elapsed = Math.round((todayMid - startD) / 864e5);
                const pct = Math.min(100, Math.max(0, Math.round((elapsed / totalDays) * 100)));
                ddProgressWrap.style.display = 'flex';
                ddProgressBar.style.width = `${pct}%`;
                ddProgressPct.textContent = `${pct}% elapsed (Today: Day ${elapsed} of ${totalDays})`;
            } else {
                ddProgressWrap.style.display = 'none';
            }
        }

        [ddStart, ddEnd, ddWeekend, ddIncludeEnd].forEach(el => {
            el.addEventListener('input', calcDateDiff);
            el.addEventListener('change', calcDateDiff);
        });

        // Date Diff Preset Buttons
        container.querySelectorAll('#dt-panel-datediff .dt-preset-pill').forEach(btn => {
            btn.onclick = () => {
                const target = container.querySelector(`#${btn.dataset.target}`);
                const p = btn.dataset.preset;
                const d = new Date();
                if (p === 'today') target.value = formatYMD(d);
                else if (p === 'yesterday') { d.setDate(d.getDate() - 1); target.value = formatYMD(d); }
                else if (p === 'plus30') { d.setDate(d.getDate() + 30); target.value = formatYMD(d); }
                else if (p === 'plus90') { d.setDate(d.getDate() + 90); target.value = formatYMD(d); }
                else if (p === 'start-month') target.value = formatYMD(new Date(d.getFullYear(), d.getMonth(), 1));
                else if (p === 'end-month') target.value = formatYMD(new Date(d.getFullYear(), d.getMonth() + 1, 0));
                else if (p === 'start-year') target.value = `${d.getFullYear()}-01-01`;
                else if (p === 'end-year') target.value = `${d.getFullYear()}-12-31`;
                calcDateDiff();
            };
        });

        container.querySelector('#dd-swap-btn').onclick = () => {
            const tmp = ddStart.value;
            ddStart.value = ddEnd.value;
            ddEnd.value = tmp;
            calcDateDiff();
        };

        container.querySelector('#dd-copy-btn').onclick = (e) => {
            const txt = `📅 Date Range: ${ddStart.value} to ${ddEnd.value}\nTotal Duration: ${ddHeroVal.textContent}\n${ddHeroSub.textContent}`;
            Utils.copyToClipboard(txt, e.target);
        };

        // -------------------------------------------------------------
        // MODE 2: Add or Subtract Days
        // -------------------------------------------------------------
        const daStart = container.querySelector('#da-start');
        const daOpInput = container.querySelector('#da-op');
        const daOpBtns = container.querySelectorAll('.da-op-btn');
        const daWeekendMode = container.querySelector('#da-weekend-mode');
        const daDays = container.querySelector('#da-days');
        const daWeeks = container.querySelector('#da-weeks');
        const daMonths = container.querySelector('#da-months');
        const daYears = container.querySelector('#da-years');
        const daHeroVal = container.querySelector('#da-hero-val');
        const daHeroSub = container.querySelector('#da-hero-sub');
        const daMetrics = container.querySelector('#da-metrics');

        daStart.value = formatYMD(now);

        daOpBtns.forEach(btn => {
            btn.onclick = () => {
                daOpBtns.forEach(b => { b.classList.remove('active', 'btn-primary'); b.classList.add('btn-secondary'); });
                btn.classList.add('active', 'btn-primary');
                btn.classList.remove('btn-secondary');
                daOpInput.value = btn.dataset.op;
                calcDateAdd();
            };
        });

        function calcDateAdd() {
            if (!daStart.value) return;
            const startD = parseYMD(daStart.value);
            const op = daOpInput.value === 'sub' ? -1 : 1;
            const mode = daWeekendMode.value;

            const days = parseInt(daDays.value, 10) || 0;
            const weeks = parseInt(daWeeks.value, 10) || 0;
            const months = parseInt(daMonths.value, 10) || 0;
            const years = parseInt(daYears.value, 10) || 0;

            let resD = new Date(startD.getFullYear(), startD.getMonth(), startD.getDate());

            if (mode.startsWith('business')) {
                const wType = mode === 'business-fri-sat' ? 'fri-sat' : 'sat-sun';
                // Add total business days: days + weeks*5
                const totalBusDays = (days + (weeks * 5));
                let added = 0;
                while (added < totalBusDays) {
                    resD.setDate(resD.getDate() + op);
                    if (!isWeekend(resD, wType)) {
                        added++;
                    }
                }
                // Add months and years normally
                if (months !== 0) resD.setMonth(resD.getMonth() + (months * op));
                if (years !== 0) resD.setFullYear(resD.getFullYear() + (years * op));
            } else {
                const totalCalDays = days + (weeks * 7);
                if (totalCalDays !== 0) resD.setDate(resD.getDate() + (totalCalDays * op));
                if (months !== 0) resD.setMonth(resD.getMonth() + (months * op));
                if (years !== 0) resD.setFullYear(resD.getFullYear() + (years * op));
            }

            // Hero Output
            daHeroVal.textContent = formatLongDate(resD);
            const diffDays = Math.round((resD - startD) / 864e5);
            const relTxt = diffDays === 0 ? 'Today (Same date)' : (diffDays > 0 ? `In ${diffDays} days` : `${Math.abs(diffDays)} days ago`);
            daHeroSub.textContent = `${relTxt} • ${formatYMD(resD)}`;

            // Metrics
            const dayOfYear = getDayOfYear(resD);
            const weekNum = getISOWeek(resD);
            const quarter = `Q${Math.floor(resD.getMonth() / 3) + 1} ${resD.getFullYear()}`;
            const leap = isLeapYear(resD.getFullYear()) ? 'Yes (366 days)' : 'No (365 days)';

            daMetrics.innerHTML = `
                <div class="dt-metric-box">
                    <div class="dt-metric-title">📆 Formatted ISO Date</div>
                    <div class="dt-metric-data" style="font-size:1.1rem; color:#38bdf8;">${formatYMD(resD)}</div>
                </div>
                <div class="dt-metric-box">
                    <div class="dt-metric-title">📅 Day of Week</div>
                    <div class="dt-metric-data">${resD.toLocaleDateString('en-US', { weekday: 'long' })}</div>
                </div>
                <div class="dt-metric-box">
                    <div class="dt-metric-title">🗓️ Day of the Year</div>
                    <div class="dt-metric-data">Day ${dayOfYear}</div>
                </div>
                <div class="dt-metric-box">
                    <div class="dt-metric-title">🔢 ISO Week Number</div>
                    <div class="dt-metric-data">Week ${weekNum}</div>
                </div>
                <div class="dt-metric-box">
                    <div class="dt-metric-title">📊 Financial Quarter</div>
                    <div class="dt-metric-data">${quarter}</div>
                </div>
                <div class="dt-metric-box">
                    <div class="dt-metric-title">⚖️ Leap Year</div>
                    <div class="dt-metric-data">${leap}</div>
                </div>
            `;
        }

        [daStart, daWeekendMode, daDays, daWeeks, daMonths, daYears].forEach(el => {
            el.addEventListener('input', calcDateAdd);
            el.addEventListener('change', calcDateAdd);
        });

        // Quick add presets
        container.querySelectorAll('.da-preset').forEach(btn => {
            btn.onclick = () => {
                daDays.value = btn.dataset.days || 0;
                daWeeks.value = btn.dataset.weeks || 0;
                daMonths.value = btn.dataset.months || 0;
                daYears.value = btn.dataset.years || 0;
                calcDateAdd();
            };
        });

        container.querySelectorAll('#dt-panel-dateadd .dt-preset-pill').forEach(btn => {
            btn.onclick = () => {
                const p = btn.dataset.preset;
                const d = new Date();
                if (p === 'today') daStart.value = formatYMD(d);
                else if (p === 'tomorrow') { d.setDate(d.getDate() + 1); daStart.value = formatYMD(d); }
                else if (p === 'start-month') daStart.value = formatYMD(new Date(d.getFullYear(), d.getMonth(), 1));
                calcDateAdd();
            };
        });

        container.querySelector('#da-copy-iso').onclick = (e) => {
            const val = daHeroSub.textContent.split('•')[1]?.trim() || '';
            Utils.copyToClipboard(val, e.target);
        };

        container.querySelector('#da-copy-full').onclick = (e) => {
            const txt = `Target Date: ${daHeroVal.textContent} (${daHeroSub.textContent})`;
            Utils.copyToClipboard(txt, e.target);
        };

        container.querySelector('#da-use-diff').onclick = () => {
            const val = daHeroSub.textContent.split('•')[1]?.trim() || '';
            if (val) {
                ddEnd.value = val;
                // Switch to tab 1
                container.querySelector('[data-tab="datediff"]').click();
                calcDateDiff();
            }
        };

        // -------------------------------------------------------------
        // MODE 3: Time to Time Duration
        // -------------------------------------------------------------
        const ttStartTime = container.querySelector('#tt-start-time');
        const ttEndTime = container.querySelector('#tt-end-time');
        const ttBreak = container.querySelector('#tt-break');
        const ttRate = container.querySelector('#tt-rate');
        const ttOvernight = container.querySelector('#tt-overnight');
        const ttHeroVal = container.querySelector('#tt-hero-val');
        const ttHeroSub = container.querySelector('#tt-hero-sub');
        const ttMetrics = container.querySelector('#tt-metrics');

        function calcTimeToTime() {
            if (!ttStartTime.value || !ttEndTime.value) return;

            const [sh, sm] = ttStartTime.value.split(':').map(Number);
            const [eh, em] = ttEndTime.value.split(':').map(Number);

            let startMins = (sh * 60) + sm;
            let endMins = (eh * 60) + em;

            // Auto-detect overnight
            if (endMins < startMins && !ttOvernight.checked) {
                ttOvernight.checked = true;
            }

            if (ttOvernight.checked && endMins < startMins) {
                endMins += (24 * 60);
            }

            let grossMins = endMins - startMins;
            if (grossMins < 0) grossMins += (24 * 60);

            const breakMins = parseInt(ttBreak.value, 10) || 0;
            const netMins = Math.max(0, grossMins - breakMins);

            const grossH = Math.floor(grossMins / 60);
            const grossM = grossMins % 60;

            const netH = Math.floor(netMins / 60);
            const netM = netMins % 60;
            const netDecimal = (netMins / 60).toFixed(2);

            // Hero
            ttHeroVal.textContent = `${netH}h ${pad2(netM)}m Net Work Time (${netDecimal} hrs)`;
            ttHeroSub.textContent = `Gross: ${grossH}h ${pad2(grossM)}m (${grossMins}m) | ${breakMins}m Break Deducted`;

            const hourlyRate = parseFloat(ttRate.value) || 0;
            const earningsStr = hourlyRate > 0 ? (netDecimal * hourlyRate).toFixed(2) : '-';

            ttMetrics.innerHTML = `
                <div class="dt-metric-box">
                    <div class="dt-metric-title">⏱️ Decimal Hours</div>
                    <div class="dt-metric-data" style="color: #38bdf8;">${netDecimal} hrs</div>
                </div>
                <div class="dt-metric-box">
                    <div class="dt-metric-title">🕒 Net Minutes</div>
                    <div class="dt-metric-data">${netMins.toLocaleString()} mins</div>
                </div>
                <div class="dt-metric-box">
                    <div class="dt-metric-title">⚡ Total Seconds</div>
                    <div class="dt-metric-data">${(netMins * 60).toLocaleString()} s</div>
                </div>
                <div class="dt-metric-box">
                    <div class="dt-metric-title">☕ Break Deducted</div>
                    <div class="dt-metric-data" style="color: #fbbf24;">${breakMins} mins</div>
                </div>
                <div class="dt-metric-box">
                    <div class="dt-metric-title">💰 Calculated Earnings</div>
                    <div class="dt-metric-data" style="color: #34d399;">${earningsStr !== '-' ? earningsStr : 'Enter rate'}</div>
                </div>
                <div class="dt-metric-box">
                    <div class="dt-metric-title">🌙 Overnight Status</div>
                    <div class="dt-metric-data" style="font-size: 1rem;">${ttOvernight.checked ? 'Overnight (+24h)' : 'Same Day'}</div>
                </div>
            `;
        }

        [ttStartTime, ttEndTime, ttBreak, ttRate, ttOvernight].forEach(el => {
            el.addEventListener('input', calcTimeToTime);
            el.addEventListener('change', calcTimeToTime);
        });

        // Time Presets
        container.querySelectorAll('.tt-preset-start').forEach(btn => {
            btn.onclick = () => {
                if (btn.dataset.time === 'now') {
                    const d = new Date();
                    ttStartTime.value = `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
                } else {
                    ttStartTime.value = btn.dataset.time;
                }
                calcTimeToTime();
            };
        });

        container.querySelectorAll('.tt-preset-end').forEach(btn => {
            btn.onclick = () => {
                if (btn.dataset.time === 'now') {
                    const d = new Date();
                    ttEndTime.value = `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
                } else {
                    ttEndTime.value = btn.dataset.time;
                }
                calcTimeToTime();
            };
        });

        container.querySelectorAll('.tt-preset-break').forEach(btn => {
            btn.onclick = () => {
                ttBreak.value = btn.dataset.break;
                calcTimeToTime();
            };
        });

        container.querySelector('#tt-copy-btn').onclick = (e) => {
            const txt = `Timesheet Entry: ${ttStartTime.value} to ${ttEndTime.value} (${ttHeroVal.textContent})\n${ttHeroSub.textContent}`;
            Utils.copyToClipboard(txt, e.target);
        };

        // -------------------------------------------------------------
        // MODE 4: Combined Date & Time Range
        // -------------------------------------------------------------
        const dtrStart = container.querySelector('#dtr-start');
        const dtrEnd = container.querySelector('#dtr-end');
        const dtrHeroVal = container.querySelector('#dtr-hero-val');
        const dtrHeroSub = container.querySelector('#dtr-hero-sub');
        const dtrMetrics = container.querySelector('#dtr-metrics');

        const nowDtr = new Date();
        const futureDtr = new Date(nowDtr.getTime() + (2 * 864e5) + (8.5 * 36e5));
        const toLocalDT = d => `${formatYMD(d)}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
        dtrStart.value = toLocalDT(nowDtr);
        dtrEnd.value = toLocalDT(futureDtr);

        function calcDateTimeRange() {
            if (!dtrStart.value || !dtrEnd.value) return;
            const t1 = new Date(dtrStart.value).getTime();
            const t2 = new Date(dtrEnd.value).getTime();

            const diffMs = Math.abs(t2 - t1);
            let rem = Math.floor(diffMs / 1000);

            const days = Math.floor(rem / 86400);
            rem %= 86400;
            const hours = Math.floor(rem / 3600);
            rem %= 3600;
            const mins = Math.floor(rem / 60);
            const secs = rem % 60;

            const decHours = (diffMs / 36e5).toFixed(2);
            const decDays = (diffMs / 864e5).toFixed(2);

            dtrHeroVal.textContent = `${days}d ${hours}h ${mins}m ${secs}s`;
            dtrHeroSub.textContent = `Total: ${decHours} Decimal Hours • ${decDays} Decimal Days`;

            dtrMetrics.innerHTML = `
                <div class="dt-metric-box">
                    <div class="dt-metric-title">🕒 Decimal Hours</div>
                    <div class="dt-metric-data" style="color:#38bdf8;">${decHours} h</div>
                </div>
                <div class="dt-metric-box">
                    <div class="dt-metric-title">📆 Decimal Days</div>
                    <div class="dt-metric-data">${decDays} d</div>
                </div>
                <div class="dt-metric-box">
                    <div class="dt-metric-title">⏱️ Total Minutes</div>
                    <div class="dt-metric-data">${Math.floor(diffMs / 60000).toLocaleString()} m</div>
                </div>
                <div class="dt-metric-box">
                    <div class="dt-metric-title">⚡ Total Seconds</div>
                    <div class="dt-metric-data">${Math.floor(diffMs / 1000).toLocaleString()} s</div>
                </div>
            `;
        }

        [dtrStart, dtrEnd].forEach(el => {
            el.addEventListener('input', calcDateTimeRange);
            el.addEventListener('change', calcDateTimeRange);
        });

        container.querySelector('#dtr-copy-btn').onclick = (e) => {
            Utils.copyToClipboard(`${dtrHeroVal.textContent} (${dtrHeroSub.textContent})`, e.target);
        };

        // -------------------------------------------------------------
        // MODE 5: Live Countdown & Milestone
        // -------------------------------------------------------------
        const cdTitle = container.querySelector('#cd-title');
        const cdTarget = container.querySelector('#cd-target');
        const cdEventLabel = container.querySelector('#cd-event-label');
        const cdDays = container.querySelector('#cd-days');
        const cdHours = container.querySelector('#cd-hours');
        const cdMins = container.querySelector('#cd-mins');
        const cdSecs = container.querySelector('#cd-secs');
        const cdStatusSub = container.querySelector('#cd-status-sub');

        // Target: End of current month 23:59:59
        const eom = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        cdTarget.value = `${formatYMD(eom)}T23:59`;

        function updateCountdown() {
            if (!cdTarget.value) return;
            const targetMs = new Date(cdTarget.value).getTime();
            const nowMs = Date.now();
            const diff = targetMs - nowMs;

            cdEventLabel.textContent = `COUNTDOWN: ${cdTitle.value.toUpperCase() || 'TARGET EVENT'}`;

            if (diff <= 0) {
                cdDays.textContent = '00';
                cdHours.textContent = '00';
                cdMins.textContent = '00';
                cdSecs.textContent = '00';
                const pastSec = Math.floor(Math.abs(diff) / 1000);
                cdStatusSub.textContent = `🎉 Event reached! (${Math.floor(pastSec / 86400)} days ago)`;
                cdStatusSub.style.color = '#34d399';
                return;
            }

            cdStatusSub.style.color = '#94a3b8';
            let rem = Math.floor(diff / 1000);
            const d = Math.floor(rem / 86400);
            rem %= 86400;
            const h = Math.floor(rem / 3600);
            rem %= 3600;
            const m = Math.floor(rem / 60);
            const s = rem % 60;

            cdDays.textContent = pad2(d);
            cdHours.textContent = pad2(h);
            cdMins.textContent = pad2(m);
            cdSecs.textContent = pad2(s);
            cdStatusSub.textContent = `Target: ${formatLongDate(new Date(targetMs))} at ${new Date(targetMs).toLocaleTimeString()}`;
        }

        const cdInterval = setInterval(updateCountdown, 1000);
        [cdTitle, cdTarget].forEach(el => {
            el.addEventListener('input', updateCountdown);
            el.addEventListener('change', updateCountdown);
        });

        container.querySelectorAll('.cd-preset').forEach(btn => {
            btn.onclick = () => {
                const p = btn.dataset.preset;
                const d = new Date();
                if (p === 'tomorrow') {
                    d.setDate(d.getDate() + 1);
                    d.setHours(9, 0, 0);
                    cdTarget.value = `${formatYMD(d)}T09:00`;
                    cdTitle.value = 'Tomorrow Morning 9:00 AM';
                } else if (p === 'friday') {
                    const daysUntilFri = (5 - d.getDay() + 7) % 7 || 7;
                    d.setDate(d.getDate() + daysUntilFri);
                    d.setHours(17, 0, 0);
                    cdTarget.value = `${formatYMD(d)}T17:00`;
                    cdTitle.value = 'Friday Weekend Kickoff (5 PM)';
                } else if (p === 'end-month') {
                    const eomDate = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 0);
                    cdTarget.value = `${formatYMD(eomDate)}T23:59`;
                    cdTitle.value = 'End of Month Deadline';
                } else if (p === 'new-year') {
                    cdTarget.value = `${d.getFullYear() + 1}-01-01T00:00`;
                    cdTitle.value = `New Year ${d.getFullYear() + 1} Countdown`;
                }
                updateCountdown();
            };
        });

        // Initialize all active calculations
        calcDateDiff();
        calcDateAdd();
        calcTimeToTime();
        calcDateTimeRange();
        updateCountdown();
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
    },

    // 33. DWG & CAD Drawing Viewer
    'dwg-viewer': (container) => {
        container.innerHTML = `
            <div class="cad-workspace-container" id="cadWorkspaceContainer">
                <!-- Top CAD Toolbar -->
                <div class="cad-toolbar">
                    <div class="cad-toolbar-group">
                        <input type="file" id="cadFileInput" accept=".dwg,.dxf" style="display: none;">
                        <button class="cad-btn cad-btn-primary" id="btnOpenCad">
                            <span>📁</span> Open DWG / DXF
                        </button>

                        <select class="cad-select" id="cadSampleSelect" title="Load sample CAD blueprint">
                            <option value="">⚡ Load Sample Blueprint...</option>
                            <option value="floorplan">🏢 Architectural Floor Plan</option>
                            <option value="mechanical">⚙️ Mechanical Flange & Spoke</option>
                            <option value="schematic">⚡ Electrical Circuit Schematic</option>
                        </select>
                    </div>

                    <div class="cad-toolbar-group">
                        <button class="cad-btn" id="btnCadFit" title="Fit drawing to screen (F)">
                            <span>🔍</span> Fit
                        </button>
                        <button class="cad-btn" id="btnCadReset" title="Reset view 1:1 (R)">
                            <span>🔄</span> Reset
                        </button>
                        <button class="cad-btn" id="btnCadZoomIn" title="Zoom in (+)">
                            <span>➕</span>
                        </button>
                        <button class="cad-btn" id="btnCadZoomOut" title="Zoom out (-)">
                            <span>➖</span>
                        </button>

                        <select class="cad-select" id="cadThemeSelect" title="CAD Viewport Theme">
                            <option value="dark">🖤 AutoCAD Dark</option>
                            <option value="blueprint">🔷 Blueprint Cyan</option>
                            <option value="light">⚪ Clean White</option>
                            <option value="matrix">💚 Matrix Green</option>
                        </select>

                        <button class="cad-btn" id="btnCadGrid" title="Toggle CAD grid (G)">
                            <span>🔲</span> Grid
                        </button>
                        <button class="cad-btn" id="btnCadCrosshair" title="Toggle Reticle">
                            <span>🎯</span> Reticle
                        </button>
                        <button class="cad-btn cad-btn-accent" id="btnCadMeasure" title="Distance Measurement Tool (M)">
                            <span>📏</span> Measure
                        </button>
                    </div>

                    <div class="cad-toolbar-group">
                        <button class="cad-btn" id="btnCadExportPng" title="Export 2x High-Res PNG">
                            <span>📷</span> PNG
                        </button>
                        <button class="cad-btn" id="btnCadExportSvg" title="Export Scalable Vector Graphics">
                            <span>📐</span> SVG
                        </button>
                        <button class="cad-btn" id="btnCadExportDxf" title="Download Standard DXF File">
                            <span>📄</span> DXF
                        </button>
                        <button class="cad-btn" id="btnCadFullscreen" title="Toggle Fullscreen">
                            <span>🗖</span>
                        </button>
                    </div>
                </div>

                <!-- Main Viewport Layout -->
                <div class="cad-main-viewport-layout" id="cadViewport">
                    <!-- Canvas Drawing Area -->
                    <div class="cad-canvas-container" id="cadCanvasContainer">
                        <canvas class="cad-canvas" id="cadCanvas"></canvas>

                        <!-- HUD Coordinate Reader -->
                        <div class="cad-hud-coords" id="cadHudCoords">
                            X: 0.000 | Y: 0.000 | Zoom: 100%
                        </div>

                        <!-- Active Mode Banner -->
                        <div class="cad-hud-mode-banner" id="cadModeBanner">
                            📏 Measure Mode: Click Point A to begin
                        </div>

                        <!-- UCS Icon (User Coordinate System) -->
                        <div class="cad-ucs-icon" id="cadUcsIcon">
                            <svg width="38" height="38" viewBox="0 0 40 40">
                                <line x1="6" y1="34" x2="34" y2="34" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round" />
                                <polygon points="34,31 39,34 34,37" fill="#ef4444" />
                                <text x="32" y="28" fill="#ef4444" font-size="9" font-family="sans-serif" font-weight="bold">X</text>
                                <line x1="6" y1="34" x2="6" y2="6" stroke="#22c55e" stroke-width="2.5" stroke-linecap="round" />
                                <polygon points="3,6 6,1 9,6" fill="#22c55e" />
                                <text x="10" y="10" fill="#22c55e" font-size="9" font-family="sans-serif" font-weight="bold">Y</text>
                                <circle cx="6" cy="34" r="2.5" fill="#38bdf8" />
                            </svg>
                        </div>

                        <!-- Empty State Dropzone Overlay -->
                        <div class="cad-empty-dropzone" id="cadDropzone">
                            <div class="cad-dropzone-icon">📐</div>
                            <h2 style="font-size: 1.4rem; font-weight: 800; margin-bottom: 0.4rem; color: #f8fafc;">
                                Drop AutoCAD DWG or DXF File Here
                            </h2>
                            <p style="color: var(--text-muted); max-width: 460px; font-size: 0.88rem; margin-bottom: 1.2rem;">
                                Support for all AutoCAD versions (R12 through AutoCAD 2024). Inspect vector layers, dimensions, text, measure distances, and export cleanly.
                            </p>
                            <button class="cad-btn cad-btn-primary" id="btnDropzoneUpload" style="padding: 0.6rem 1.4rem; font-size: 0.92rem;">
                                <span>📂</span> Select File from Computer
                            </button>
                            <div class="cad-sample-quicklinks">
                                <span style="font-size: 0.8rem; color: var(--text-dim); align-self: center;">Or try a sample:</span>
                                <button class="cad-btn" id="btnQuickFloorplan">🏢 Floor Plan</button>
                                <button class="cad-btn" id="btnQuickMechanical">⚙️ Flange Blueprint</button>
                                <button class="cad-btn" id="btnQuickSchematic">⚡ Schematic</button>
                            </div>
                        </div>

                        <!-- Loading Spinner Overlay -->
                        <div class="cad-loading-overlay" id="cadLoadingOverlay" style="display: none;">
                            <div class="spinner"></div>
                            <h3 id="cadLoadingText">Analyzing CAD Drawing...</h3>
                            <p style="color: var(--text-muted); font-size: 0.82rem;">Parsing layers, vectors, and bounding geometry</p>
                        </div>
                    </div>

                    <!-- Right Inspector Sidebar -->
                    <div class="cad-inspector-sidebar" id="cadSidebar">
                        <div class="cad-sidebar-tabs">
                            <button class="cad-sidebar-tab-btn active" data-tab="layers">Layers (<span id="cadLayerCount">0</span>)</button>
                            <button class="cad-sidebar-tab-btn" data-tab="properties">Properties</button>
                            <button class="cad-sidebar-tab-btn" data-tab="measurements">Measure (<span id="cadMeasureCount">0</span>)</button>
                        </div>

                        <div class="cad-sidebar-content" id="cadSidebarLayers">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
                                <span style="font-size: 0.75rem; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Drawing Layers</span>
                                <button class="cad-btn" id="btnToggleAllLayers" style="padding: 0.2rem 0.5rem; font-size: 0.72rem;">Toggle All</button>
                            </div>
                            <div id="cadLayersListContainer">
                                <p style="color: var(--text-dim); font-size: 0.8rem; text-align: center; padding: 2rem 0;">No active layers.</p>
                            </div>
                        </div>

                        <div class="cad-sidebar-content" id="cadSidebarProperties" style="display: none;">
                            <div class="cad-prop-card">
                                <div class="cad-prop-title">Document</div>
                                <div class="cad-prop-val" id="propFileName">—</div>
                                <div style="font-size: 0.75rem; color: var(--text-dim); margin-top: 2px;" id="propFileSize">—</div>
                            </div>
                            <div class="cad-prop-card">
                                <div class="cad-prop-title">AutoCAD Format Version</div>
                                <div class="cad-prop-val" id="propCadVersion" style="color: #38bdf8;">—</div>
                            </div>
                            <div class="cad-prop-card">
                                <div class="cad-prop-title">Drawing Extents (Units)</div>
                                <div class="cad-prop-grid">
                                    <div>
                                        <span style="font-size: 0.7rem; color: var(--text-dim);">Width:</span>
                                        <div class="cad-prop-val" id="propExtWidth">—</div>
                                    </div>
                                    <div>
                                        <span style="font-size: 0.7rem; color: var(--text-dim);">Height:</span>
                                        <div class="cad-prop-val" id="propExtHeight">—</div>
                                    </div>
                                </div>
                            </div>
                            <div class="cad-prop-card">
                                <div class="cad-prop-title">Entity Statistics</div>
                                <div class="cad-prop-grid" id="propStatsGrid">
                                    <div><span style="font-size: 0.7rem; color: var(--text-dim);">Lines:</span> <strong id="statLines">0</strong></div>
                                    <div><span style="font-size: 0.7rem; color: var(--text-dim);">Circles:</span> <strong id="statCircles">0</strong></div>
                                    <div><span style="font-size: 0.7rem; color: var(--text-dim);">Polylines:</span> <strong id="statPolylines">0</strong></div>
                                    <div><span style="font-size: 0.7rem; color: var(--text-dim);">Arcs:</span> <strong id="statArcs">0</strong></div>
                                    <div><span style="font-size: 0.7rem; color: var(--text-dim);">Texts:</span> <strong id="statTexts">0</strong></div>
                                    <div><span style="font-size: 0.7rem; color: var(--text-dim);">Total:</span> <strong id="statTotal" style="color: #38bdf8;">0</strong></div>
                                </div>
                            </div>
                        </div>

                        <div class="cad-sidebar-content" id="cadSidebarMeasurements" style="display: none;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
                                <span style="font-size: 0.75rem; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Recorded Measurements</span>
                                <button class="cad-btn" id="btnClearMeasurements" style="padding: 0.2rem 0.5rem; font-size: 0.72rem;">Clear</button>
                            </div>
                            <div id="cadMeasurementList">
                                <p style="color: var(--text-dim); font-size: 0.8rem; text-align: center; padding: 2rem 0;">No measurements recorded yet.<br>Click "Measure" above to measure distances.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // DOM elements
        const fileInput = container.querySelector('#cadFileInput');
        const btnOpen = container.querySelector('#btnOpenCad');
        const btnDropzoneUpload = container.querySelector('#btnDropzoneUpload');
        const dropzone = container.querySelector('#cadDropzone');
        const loadingOverlay = container.querySelector('#cadLoadingOverlay');
        const loadingText = container.querySelector('#cadLoadingText');
        const sampleSelect = container.querySelector('#cadSampleSelect');
        const themeSelect = container.querySelector('#cadThemeSelect');
        const canvasContainer = container.querySelector('#cadCanvasContainer');
        const canvas = container.querySelector('#cadCanvas');
        const hudCoords = container.querySelector('#cadHudCoords');
        const modeBanner = container.querySelector('#cadModeBanner');
        const btnFit = container.querySelector('#btnCadFit');
        const btnReset = container.querySelector('#btnCadReset');
        const btnZoomIn = container.querySelector('#btnCadZoomIn');
        const btnZoomOut = container.querySelector('#btnCadZoomOut');
        const btnGrid = container.querySelector('#btnCadGrid');
        const btnCrosshair = container.querySelector('#btnCadCrosshair');
        const btnMeasure = container.querySelector('#btnCadMeasure');
        const btnFullscreen = container.querySelector('#btnCadFullscreen');
        const btnExportPng = container.querySelector('#btnCadExportPng');
        const btnExportSvg = container.querySelector('#btnCadExportSvg');
        const btnExportDxf = container.querySelector('#btnCadExportDxf');
        const layersContainer = container.querySelector('#cadLayersListContainer');
        const layerCountEl = container.querySelector('#cadLayerCount');
        const btnToggleAllLayers = container.querySelector('#btnToggleAllLayers');
        const measurementListEl = container.querySelector('#cadMeasurementList');
        const measureCountEl = container.querySelector('#cadMeasureCount');
        const btnClearMeasurements = container.querySelector('#btnClearMeasurements');

        // Quick sample buttons
        container.querySelector('#btnQuickFloorplan').onclick = () => loadSample('floorplan');
        container.querySelector('#btnQuickMechanical').onclick = () => loadSample('mechanical');
        container.querySelector('#btnQuickSchematic').onclick = () => loadSample('schematic');

        // Theme palette definitions
        const THEMES = {
            dark: {
                bg: '#181c24',
                gridMinor: '#1e2430',
                gridMajor: '#273142',
                axisX: '#ef4444',
                axisY: '#22c55e',
                defaultStroke: '#f8fafc',
                crosshair: 'rgba(56, 189, 248, 0.45)',
                measure: '#f59e0b'
            },
            blueprint: {
                bg: '#0a2239',
                gridMinor: '#0e2e4d',
                gridMajor: '#153f68',
                axisX: '#f87171',
                axisY: '#4ade80',
                defaultStroke: '#38bdf8',
                crosshair: 'rgba(255, 255, 255, 0.4)',
                measure: '#fbbf24'
            },
            light: {
                bg: '#ffffff',
                gridMinor: '#f1f5f9',
                gridMajor: '#e2e8f0',
                axisX: '#dc2626',
                axisY: '#16a34a',
                defaultStroke: '#0f172a',
                crosshair: 'rgba(15, 23, 42, 0.4)',
                measure: '#d97706'
            },
            matrix: {
                bg: '#051a0e',
                gridMinor: '#092917',
                gridMajor: '#0f3d23',
                axisX: '#f87171',
                axisY: '#22c55e',
                defaultStroke: '#4ade80',
                crosshair: 'rgba(74, 222, 128, 0.5)',
                measure: '#facc15'
            }
        };

        // State variables
        let currentDrawing = null;
        let activeTheme = 'dark';
        let showGrid = true;
        let showCrosshair = true;
        let measureMode = false;
        let measureStart = null;
        let measureEnd = null;
        let measurements = [];

        let scale = 1.0;
        let panX = 0.0;
        let panY = 0.0;
        let isDragging = false;
        let lastMousePos = { x: 0, y: 0 };
        let mouseCAD = { x: 0, y: 0 };
        let mouseScreen = { x: 0, y: 0 };
        let layersVisibility = {};

        const ctx = canvas.getContext('2d');

        // Resize Canvas with high-DPI scaling
        function resizeCanvas() {
            const rect = canvasContainer.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;
            canvas.width = Math.max(100, Math.floor(rect.width * dpr));
            canvas.height = Math.max(100, Math.floor(rect.height * dpr));
            render();
        }

        window.addEventListener('resize', resizeCanvas);
        setTimeout(resizeCanvas, 50);

        // Coordinate transforms
        function toScreenX(cadX) {
            const dpr = window.devicePixelRatio || 1;
            const viewW = canvas.width / dpr;
            return (cadX - panX) * scale + viewW / 2;
        }

        function toScreenY(cadY) {
            const dpr = window.devicePixelRatio || 1;
            const viewH = canvas.height / dpr;
            return viewH / 2 - (cadY - panY) * scale;
        }

        function toCADX(screenX) {
            const dpr = window.devicePixelRatio || 1;
            const viewW = canvas.width / dpr;
            return (screenX - viewW / 2) / scale + panX;
        }

        function toCADY(screenY) {
            const dpr = window.devicePixelRatio || 1;
            const viewH = canvas.height / dpr;
            return panY - (screenY - viewH / 2) / scale;
        }

        // Fit drawing extents to viewport
        function fitExtents() {
            if (!currentDrawing || !currentDrawing.extents) return;
            const ext = currentDrawing.extents;
            const dpr = window.devicePixelRatio || 1;
            const viewW = canvas.width / dpr;
            const viewH = canvas.height / dpr;

            panX = (ext.min_x + ext.max_x) / 2;
            panY = (ext.min_y + ext.max_y) / 2;

            const w = Math.max(ext.width, 10);
            const h = Math.max(ext.height, 10);
            const scaleX = (viewW * 0.82) / w;
            const scaleY = (viewH * 0.82) / h;
            scale = Math.max(0.001, Math.min(scaleX, scaleY));

            render();
        }

        // Reset view
        function resetView() {
            if (currentDrawing && currentDrawing.extents) {
                fitExtents();
            } else {
                panX = 0;
                panY = 0;
                scale = 1.0;
                render();
            }
        }

        // Main Render Loop
        function render() {
            const dpr = window.devicePixelRatio || 1;
            ctx.save();
            ctx.scale(dpr, dpr);

            const viewW = canvas.width / dpr;
            const viewH = canvas.height / dpr;
            const theme = THEMES[activeTheme] || THEMES.dark;

            // 1. Clear & fill background
            ctx.fillStyle = theme.bg;
            ctx.fillRect(0, 0, viewW, viewH);

            // 2. Draw CAD Grid
            if (showGrid) {
                drawGrid(theme, viewW, viewH);
            }

            // 3. Draw CAD Drawing Entities
            if (currentDrawing && currentDrawing.entities) {
                drawEntities(theme);
            }

            // 4. Draw Active Measurement Dimension Line
            if (measureMode && measureStart) {
                drawActiveMeasurement(theme);
            }

            // 5. Draw Completed Measurements
            drawRecordedMeasurements(theme);

            // 6. Draw Reticle / Crosshair
            if (showCrosshair && mouseScreen.x >= 0 && mouseScreen.x <= viewW && mouseScreen.y >= 0 && mouseScreen.y <= viewH) {
                drawCrosshair(theme, viewW, viewH);
            }

            ctx.restore();

            // Update Telemetry HUD
            updateHud();
        }

        function drawGrid(theme, viewW, viewH) {
            // Adaptive grid spacing based on zoom scale
            const targetPixelSpacing = 60;
            const cadSpacingRaw = targetPixelSpacing / scale;
            const power = Math.floor(Math.log10(cadSpacingRaw));
            const base = Math.pow(10, power);
            let minorStep = base;
            if (cadSpacingRaw / base > 5) minorStep = base * 5;
            else if (cadSpacingRaw / base > 2) minorStep = base * 2;
            const majorStep = minorStep * 5;

            const minCadX = toCADX(0);
            const maxCadX = toCADX(viewW);
            const minCadY = toCADY(viewH);
            const maxCadY = toCADY(0);

            const startMinorX = Math.floor(minCadX / minorStep) * minorStep;
            const startMinorY = Math.floor(minCadY / minorStep) * minorStep;

            // Draw Minor Grid
            ctx.lineWidth = 0.8;
            ctx.strokeStyle = theme.gridMinor;
            ctx.beginPath();
            for (let gx = startMinorX; gx <= maxCadX; gx += minorStep) {
                const sx = toScreenX(gx);
                ctx.moveTo(sx, 0);
                ctx.lineTo(sx, viewH);
            }
            for (let gy = startMinorY; gy <= maxCadY; gy += minorStep) {
                const sy = toScreenY(gy);
                ctx.moveTo(0, sy);
                ctx.lineTo(viewW, sy);
            }
            ctx.stroke();

            // Draw Major Grid
            const startMajorX = Math.floor(minCadX / majorStep) * majorStep;
            const startMajorY = Math.floor(minCadY / majorStep) * majorStep;
            ctx.lineWidth = 1.0;
            ctx.strokeStyle = theme.gridMajor;
            ctx.beginPath();
            for (let gx = startMajorX; gx <= maxCadX; gx += majorStep) {
                const sx = toScreenX(gx);
                ctx.moveTo(sx, 0);
                ctx.lineTo(sx, viewH);
            }
            for (let gy = startMajorY; gy <= maxCadY; gy += majorStep) {
                const sy = toScreenY(gy);
                ctx.moveTo(0, sy);
                ctx.lineTo(viewW, sy);
            }
            ctx.stroke();

            // Draw World Origin Axes (0,0)
            const originSX = toScreenX(0);
            const originSY = toScreenY(0);

            // X-Axis (Red)
            ctx.lineWidth = 1.5;
            ctx.strokeStyle = theme.axisX;
            ctx.beginPath();
            ctx.moveTo(0, originSY);
            ctx.lineTo(viewW, originSY);
            ctx.stroke();

            // Y-Axis (Green)
            ctx.strokeStyle = theme.axisY;
            ctx.beginPath();
            ctx.moveTo(originSX, 0);
            ctx.lineTo(originSX, viewH);
            ctx.stroke();
        }

        function drawEntities(theme) {
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            for (const ent of currentDrawing.entities) {
                // Check layer visibility
                if (ent.layer && layersVisibility[ent.layer] === false) {
                    continue;
                }

                const strokeColor = ent.color || theme.defaultStroke;
                ctx.strokeStyle = strokeColor;
                ctx.fillStyle = strokeColor;

                if (ent.type === 'LINE') {
                    const sx1 = toScreenX(ent.start[0]);
                    const sy1 = toScreenY(ent.start[1]);
                    const sx2 = toScreenX(ent.end[0]);
                    const sy2 = toScreenY(ent.end[1]);
                    ctx.lineWidth = 1.4;
                    ctx.beginPath();
                    ctx.moveTo(sx1, sy1);
                    ctx.lineTo(sx2, sy2);
                    ctx.stroke();
                } else if (ent.type === 'CIRCLE') {
                    const scx = toScreenX(ent.center[0]);
                    const scy = toScreenY(ent.center[1]);
                    const sRadius = ent.radius * scale;
                    if (sRadius > 0.5) {
                        ctx.lineWidth = 1.4;
                        ctx.beginPath();
                        ctx.arc(scx, scy, sRadius, 0, Math.PI * 2);
                        ctx.stroke();
                    }
                } else if (ent.type === 'ARC') {
                    const scx = toScreenX(ent.center[0]);
                    const scy = toScreenY(ent.center[1]);
                    const sRadius = ent.radius * scale;
                    if (sRadius > 0.5) {
                        const startRad = (ent.start_angle * Math.PI) / 180;
                        const endRad = (ent.end_angle * Math.PI) / 180;
                        ctx.lineWidth = 1.4;
                        ctx.beginPath();
                        // Note: inverted Y-axis means clockwise is counter-clockwise in screen space
                        ctx.arc(scx, scy, sRadius, -endRad, -startRad);
                        ctx.stroke();
                    }
                } else if (ent.type === 'POLYLINE') {
                    if (ent.points && ent.points.length >= 2) {
                        ctx.lineWidth = 1.4;
                        ctx.beginPath();
                        const startSX = toScreenX(ent.points[0][0]);
                        const startSY = toScreenY(ent.points[0][1]);
                        ctx.moveTo(startSX, startSY);
                        for (let p = 1; p < ent.points.length; p++) {
                            ctx.lineTo(toScreenX(ent.points[p][0]), toScreenY(ent.points[p][1]));
                        }
                        if (ent.closed) {
                            ctx.closePath();
                        }
                        ctx.stroke();
                    }
                } else if (ent.type === 'TEXT') {
                    const sx = toScreenX(ent.point[0]);
                    const sy = toScreenY(ent.point[1]);
                    const fontSize = Math.max(9, Math.min(48, (ent.height || 3.5) * scale));
                    ctx.font = `600 ${fontSize}px 'JetBrains Mono', monospace`;
                    ctx.fillText(ent.text, sx, sy);
                } else if (ent.type === 'POINT') {
                    const sx = toScreenX(ent.point[0]);
                    const sy = toScreenY(ent.point[1]);
                    ctx.beginPath();
                    ctx.arc(sx, sy, 2.5, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }

        function drawActiveMeasurement(theme) {
            const sx1 = toScreenX(measureStart.x);
            const sy1 = toScreenY(measureStart.y);
            const targetX = measureEnd ? measureEnd.x : mouseCAD.x;
            const targetY = measureEnd ? measureEnd.y : mouseCAD.y;
            const sx2 = toScreenX(targetX);
            const sy2 = toScreenY(targetY);

            // Point A glowing ring
            ctx.fillStyle = theme.measure;
            ctx.beginPath();
            ctx.arc(sx1, sy1, 4, 0, Math.PI * 2);
            ctx.fill();

            // Dashed dimension line
            ctx.lineWidth = 1.6;
            ctx.strokeStyle = theme.measure;
            ctx.setLineDash([5, 4]);
            ctx.beginPath();
            ctx.moveTo(sx1, sy1);
            ctx.lineTo(sx2, sy2);
            ctx.stroke();
            ctx.setLineDash([]);

            // Point B ring
            ctx.beginPath();
            ctx.arc(sx2, sy2, 4, 0, Math.PI * 2);
            ctx.stroke();

            // Calculate distance & angle
            const dx = targetX - measureStart.x;
            const dy = targetY - measureStart.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const angleDeg = (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360;

            // Dimension Label Badge
            const midSX = (sx1 + sx2) / 2;
            const midSY = (sy1 + sy2) / 2 - 12;
            const labelText = `Dist: ${dist.toFixed(2)} | ΔX: ${Math.abs(dx).toFixed(2)} | ΔY: ${Math.abs(dy).toFixed(2)} | ${angleDeg.toFixed(1)}°`;

            ctx.font = "bold 11px 'JetBrains Mono', monospace";
            const textMetrics = ctx.measureText(labelText);
            const pad = 6;
            ctx.fillStyle = "rgba(10, 15, 29, 0.9)";
            ctx.fillRect(midSX - textMetrics.width / 2 - pad, midSY - 12, textMetrics.width + pad * 2, 18);
            ctx.strokeStyle = theme.measure;
            ctx.strokeRect(midSX - textMetrics.width / 2 - pad, midSY - 12, textMetrics.width + pad * 2, 18);

            ctx.fillStyle = theme.measure;
            ctx.textAlign = 'center';
            ctx.fillText(labelText, midSX, midSY + 1);
            ctx.textAlign = 'start';
        }

        function drawRecordedMeasurements(theme) {
            measurements.forEach((m, idx) => {
                const sx1 = toScreenX(m.p1.x);
                const sy1 = toScreenY(m.p1.y);
                const sx2 = toScreenX(m.p2.x);
                const sy2 = toScreenY(m.p2.y);

                ctx.strokeStyle = "rgba(245, 158, 11, 0.6)";
                ctx.lineWidth = 1.2;
                ctx.beginPath();
                ctx.moveTo(sx1, sy1);
                ctx.lineTo(sx2, sy2);
                ctx.stroke();

                ctx.fillStyle = "rgba(245, 158, 11, 0.8)";
                ctx.beginPath();
                ctx.arc(sx1, sy1, 2.5, 0, Math.PI * 2);
                ctx.arc(sx2, sy2, 2.5, 0, Math.PI * 2);
                ctx.fill();

                const midSX = (sx1 + sx2) / 2;
                const midSY = (sy1 + sy2) / 2 - 8;
                ctx.font = "10px 'JetBrains Mono', monospace";
                ctx.fillStyle = "#f59e0b";
                ctx.fillText(`M${idx + 1}: ${m.dist.toFixed(2)}`, midSX + 4, midSY);
            });
        }

        function drawCrosshair(theme, viewW, viewH) {
            const cx = mouseScreen.x;
            const cy = mouseScreen.y;

            ctx.lineWidth = 0.9;
            ctx.strokeStyle = theme.crosshair;
            ctx.setLineDash([4, 4]);

            // Full crosshairs
            ctx.beginPath();
            ctx.moveTo(0, cy);
            ctx.lineTo(viewW, cy);
            ctx.moveTo(cx, 0);
            ctx.lineTo(cx, viewH);
            ctx.stroke();
            ctx.setLineDash([]);

            // Reticle box at intersection
            ctx.strokeRect(cx - 5, cy - 5, 10, 10);

            // Floating Coordinate Tag
            const coordTag = `(${mouseCAD.x.toFixed(2)}, ${mouseCAD.y.toFixed(2)})`;
            ctx.font = "10px 'JetBrains Mono', monospace";
            ctx.fillStyle = "rgba(10, 15, 29, 0.8)";
            ctx.fillRect(cx + 8, cy + 8, ctx.measureText(coordTag).width + 8, 16);
            ctx.fillStyle = theme.defaultStroke;
            ctx.fillText(coordTag, cx + 12, cy + 20);
        }

        function updateHud() {
            hudCoords.textContent = `X: ${mouseCAD.x.toFixed(3)} | Y: ${mouseCAD.y.toFixed(3)} | Scale: ${(scale * 100).toFixed(0)}%`;
        }

        // Mouse & Navigation Events
        canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const rect = canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            const cadAtCursorX = toCADX(mouseX);
            const cadAtCursorY = toCADY(mouseY);

            const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
            scale = Math.max(0.0001, Math.min(1000, scale * zoomFactor));

            // Adjust pan so point under cursor stays at cursor
            panX = cadAtCursorX - (mouseX - (canvas.width / (window.devicePixelRatio || 1)) / 2) / scale;
            panY = cadAtCursorY + (mouseY - (canvas.height / (window.devicePixelRatio || 1)) / 2) / scale;

            render();
        }, { passive: false });

        canvas.addEventListener('mousedown', (e) => {
            const rect = canvas.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const clickY = e.clientY - rect.top;

            if (measureMode && e.button === 0) {
                // Measure click
                const cadX = toCADX(clickX);
                const cadY = toCADY(clickY);

                if (!measureStart) {
                    measureStart = { x: cadX, y: cadY };
                    modeBanner.textContent = `📏 Point A locked at (${cadX.toFixed(2)}, ${cadY.toFixed(2)}). Click Point B to finish.`;
                } else {
                    const p1 = measureStart;
                    const p2 = { x: cadX, y: cadY };
                    const dx = p2.x - p1.x;
                    const dy = p2.y - p1.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    const angle = (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360;

                    const record = {
                        id: measurements.length + 1,
                        p1,
                        p2,
                        dist,
                        dx,
                        dy,
                        angle,
                        time: new Date().toLocaleTimeString()
                    };
                    measurements.push(record);
                    measureStart = null;
                    modeBanner.textContent = `✅ Measured: ${dist.toFixed(2)} units (ΔX: ${Math.abs(dx).toFixed(2)}, ΔY: ${Math.abs(dy).toFixed(2)}). Click to measure again.`;
                    updateMeasurementSidebar();
                }
                render();
                return;
            }

            // Normal Pan drag (left or middle button)
            if (e.button === 0 || e.button === 1) {
                isDragging = true;
                lastMousePos = { x: e.clientX, y: e.clientY };
            }
        });

        window.addEventListener('mousemove', (e) => {
            const rect = canvas.getBoundingClientRect();
            mouseScreen = { x: e.clientX - rect.left, y: e.clientY - rect.top };
            mouseCAD = { x: toCADX(mouseScreen.x), y: toCADY(mouseScreen.y) };

            if (isDragging) {
                const deltaX = e.clientX - lastMousePos.x;
                const deltaY = e.clientY - lastMousePos.y;
                panX -= deltaX / scale;
                panY += deltaY / scale;
                lastMousePos = { x: e.clientX, y: e.clientY };
                render();
            } else if (showCrosshair || (measureMode && measureStart)) {
                render();
            }
        });

        window.addEventListener('mouseup', () => {
            isDragging = false;
        });

        // Keyboard Shortcuts
        window.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
            if (e.key === 'f' || e.key === 'F') fitExtents();
            else if (e.key === 'r' || e.key === 'R') resetView();
            else if (e.key === 'g' || e.key === 'G') {
                showGrid = !showGrid;
                render();
            } else if (e.key === 'm' || e.key === 'M') {
                toggleMeasureMode();
            } else if (e.key === 'Escape') {
                if (measureMode) {
                    measureStart = null;
                    toggleMeasureMode(false);
                }
            }
        });

        // Toggle measure mode
        function toggleMeasureMode(force) {
            measureMode = typeof force === 'boolean' ? force : !measureMode;
            btnMeasure.classList.toggle('active', measureMode);
            modeBanner.style.display = measureMode ? 'block' : 'none';
            if (measureMode) {
                modeBanner.textContent = "📏 Measure Mode: Click Point A on drawing";
                // Switch to measurements sidebar tab
                activateSidebarTab('measurements');
            } else {
                measureStart = null;
            }
            render();
        }

        btnMeasure.onclick = () => toggleMeasureMode();

        btnGrid.onclick = () => {
            showGrid = !showGrid;
            btnGrid.classList.toggle('cad-btn-accent', showGrid);
            render();
        };

        btnCrosshair.onclick = () => {
            showCrosshair = !showCrosshair;
            btnCrosshair.classList.toggle('cad-btn-accent', showCrosshair);
            render();
        };

        btnFit.onclick = fitExtents;
        btnReset.onclick = resetView;
        btnZoomIn.onclick = () => {
            scale *= 1.25;
            render();
        };
        btnZoomOut.onclick = () => {
            scale /= 1.25;
            render();
        };

        themeSelect.onchange = (e) => {
            activeTheme = e.target.value;
            render();
        };

        sampleSelect.onchange = (e) => {
            if (e.target.value) {
                loadSample(e.target.value);
            }
        };

        // Fullscreen toggle
        btnFullscreen.onclick = () => {
            const containerEl = container.querySelector('#cadWorkspaceContainer');
            if (!document.fullscreenElement) {
                containerEl.requestFullscreen().catch(() => {});
            } else {
                document.exitFullscreen().catch(() => {});
            }
            setTimeout(resizeCanvas, 150);
        };

        // File upload handling
        btnOpen.onclick = () => fileInput.click();
        btnDropzoneUpload.onclick = () => fileInput.click();

        fileInput.onchange = (e) => {
            if (e.target.files && e.target.files[0]) {
                handleFileUpload(e.target.files[0]);
            }
        };

        // Drag & Drop
        dropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropzone.classList.add('dragover');
        });

        dropzone.addEventListener('dragleave', () => {
            dropzone.classList.remove('dragover');
        });

        dropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropzone.classList.remove('dragover');
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                handleFileUpload(e.dataTransfer.files[0]);
            }
        });

        async function handleFileUpload(file) {
            loadingOverlay.style.display = 'flex';
            loadingText.textContent = `Analyzing ${file.name}...`;

            const formData = new FormData();
            formData.append('file', file);

            try {
                const resp = await fetch('/tools/api/dwg-convert', {
                    method: 'POST',
                    body: formData
                });

                const data = await resp.json();
                if (data.status === 'success') {
                    loadDrawingData(data);
                } else {
                    alert(`CAD Parsing Error: ${data.message || 'Could not parse drawing'}`);
                }
            } catch (err) {
                console.error("DWG parse error:", err);
                alert(`Error uploading file: ${err.message}`);
            } finally {
                loadingOverlay.style.display = 'none';
            }
        }

        async function loadSample(sampleType) {
            loadingOverlay.style.display = 'flex';
            loadingText.textContent = `Loading ${sampleType} blueprint...`;

            try {
                const resp = await fetch(`/tools/api/dwg-sample/${sampleType}`);
                const data = await resp.json();
                if (data.status === 'success') {
                    loadDrawingData(data);
                }
            } catch (err) {
                console.error("Error loading sample:", err);
            } finally {
                loadingOverlay.style.display = 'none';
            }
        }

        function loadDrawingData(data) {
            currentDrawing = data;
            dropzone.style.display = 'none';

            // Populate layers visibility
            layersVisibility = {};
            if (data.layers) {
                Object.keys(data.layers).forEach(layerName => {
                    layersVisibility[layerName] = data.layers[layerName].visible !== false;
                });
            }

            // Update UI sidebar tabs
            updateLayersSidebar();
            updatePropertiesSidebar();
            measurements = [];
            updateMeasurementSidebar();

            // Fit to viewport
            fitExtents();
        }

        function updateLayersSidebar() {
            if (!currentDrawing || !currentDrawing.layers) {
                layersContainer.innerHTML = '<p style="color: var(--text-dim); font-size: 0.8rem; text-align: center; padding: 2rem 0;">No layers detected.</p>';
                layerCountEl.textContent = '0';
                return;
            }

            const layerKeys = Object.keys(currentDrawing.layers);
            layerCountEl.textContent = layerKeys.length;

            layersContainer.innerHTML = layerKeys.map(k => {
                const layer = currentDrawing.layers[k];
                const isChecked = layersVisibility[k] !== false;
                return `
                    <div class="cad-layer-row">
                        <div class="cad-layer-left">
                            <input type="checkbox" id="chk_layer_${k}" ${isChecked ? 'checked' : ''} data-layer="${k}" style="cursor: pointer;">
                            <span class="cad-layer-swatch" style="background: ${layer.color};"></span>
                            <span class="cad-layer-name" title="${layer.name}">${layer.name}</span>
                        </div>
                        <span style="font-size: 0.72rem; color: var(--text-dim); font-family: var(--font-mono);">${layer.count || 0} ent</span>
                    </div>
                `;
            }).join('');

            // Bind checkbox events
            layersContainer.querySelectorAll('input[type="checkbox"]').forEach(chk => {
                chk.onchange = (e) => {
                    const layerName = e.target.getAttribute('data-layer');
                    layersVisibility[layerName] = e.target.checked;
                    render();
                };
            });
        }

        btnToggleAllLayers.onclick = () => {
            if (!currentDrawing || !currentDrawing.layers) return;
            const keys = Object.keys(currentDrawing.layers);
            const anyVisible = keys.some(k => layersVisibility[k]);
            const targetState = !anyVisible;
            keys.forEach(k => {
                layersVisibility[k] = targetState;
            });
            updateLayersSidebar();
            render();
        };

        function updatePropertiesSidebar() {
            if (!currentDrawing) return;
            container.querySelector('#propFileName').textContent = currentDrawing.filename || "drawing.dwg";
            container.querySelector('#propFileSize').textContent = currentDrawing.file_size ? Utils.formatBytes(currentDrawing.file_size) : "Native Vector";
            container.querySelector('#propCadVersion').textContent = currentDrawing.version || "AutoCAD Standard";

            const ext = currentDrawing.extents || { width: 0, height: 0 };
            container.querySelector('#propExtWidth').textContent = `${ext.width.toFixed(2)} u`;
            container.querySelector('#propExtHeight').textContent = `${ext.height.toFixed(2)} u`;

            const stats = currentDrawing.stats || {};
            container.querySelector('#statLines').textContent = stats.lines || 0;
            container.querySelector('#statCircles').textContent = stats.circles || 0;
            container.querySelector('#statPolylines').textContent = stats.polylines || 0;
            container.querySelector('#statArcs').textContent = stats.arcs || 0;
            container.querySelector('#statTexts').textContent = stats.texts || 0;
            container.querySelector('#statTotal').textContent = stats.total || 0;
        }

        function updateMeasurementSidebar() {
            measureCountEl.textContent = measurements.length;
            if (measurements.length === 0) {
                measurementListEl.innerHTML = '<p style="color: var(--text-dim); font-size: 0.8rem; text-align: center; padding: 2rem 0;">No measurements recorded yet.<br>Click "Measure" above to start.</p>';
                return;
            }

            measurementListEl.innerHTML = measurements.map((m, idx) => `
                <div class="cad-measure-item">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
                        <strong style="color: #38bdf8;">Measurement #${idx + 1}</strong>
                        <span style="color: var(--text-dim); font-size: 0.7rem;">${m.time}</span>
                    </div>
                    <div style="font-size: 0.85rem; font-weight: 700; color: #f59e0b;">${m.dist.toFixed(3)} units</div>
                    <div style="color: var(--text-muted); font-size: 0.72rem; margin-top: 2px;">
                        ΔX: ${Math.abs(m.dx).toFixed(2)} | ΔY: ${Math.abs(m.dy).toFixed(2)} | ∠ ${m.angle.toFixed(1)}°
                    </div>
                </div>
            `).reverse().join('');
        }

        btnClearMeasurements.onclick = () => {
            measurements = [];
            measureStart = null;
            updateMeasurementSidebar();
            render();
        };

        // Sidebar Tabs Navigation
        const tabBtns = container.querySelectorAll('.cad-sidebar-tab-btn');
        tabBtns.forEach(btn => {
            btn.onclick = () => activateSidebarTab(btn.getAttribute('data-tab'));
        });

        function activateSidebarTab(tabKey) {
            tabBtns.forEach(b => b.classList.toggle('active', b.getAttribute('data-tab') === tabKey));
            container.querySelector('#cadSidebarLayers').style.display = tabKey === 'layers' ? 'block' : 'none';
            container.querySelector('#cadSidebarProperties').style.display = tabKey === 'properties' ? 'block' : 'none';
            container.querySelector('#cadSidebarMeasurements').style.display = tabKey === 'measurements' ? 'block' : 'none';
        }

        // Export High-Res PNG
        btnExportPng.onclick = () => {
            if (!currentDrawing) {
                alert("Please load or open a DWG / DXF file first.");
                return;
            }
            const offCanvas = document.createElement('canvas');
            offCanvas.width = canvas.width;
            offCanvas.height = canvas.height;
            const offCtx = offCanvas.getContext('2d');
            offCtx.drawImage(canvas, 0, 0);

            const dataUrl = offCanvas.toDataURL('image/png');
            const a = document.createElement('a');
            a.download = `${currentDrawing.filename ? currentDrawing.filename.replace(/\.[^/.]+$/, "") : "blueprint"}_export.png`;
            a.href = dataUrl;
            a.click();
        };

        // Export Vector SVG
        btnExportSvg.onclick = () => {
            if (!currentDrawing || !currentDrawing.extents) {
                alert("Please load or open a DWG / DXF file first.");
                return;
            }
            const ext = currentDrawing.extents;
            const pad = Math.max(ext.width, ext.height) * 0.05;
            const minX = ext.min_x - pad;
            const minY = ext.min_y - pad;
            const width = ext.width + pad * 2;
            const height = ext.height + pad * 2;

            let svgMarkup = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="${minX} ${-ext.max_y - pad} ${width} ${height}">\n`;
            svgMarkup += `  <rect x="${minX}" y="${-ext.max_y - pad}" width="${width}" height="${height}" fill="#181c24" />\n`;

            for (const ent of currentDrawing.entities) {
                if (ent.layer && layersVisibility[ent.layer] === false) continue;
                const col = ent.color || '#38bdf8';
                if (ent.type === 'LINE') {
                    svgMarkup += `  <line x1="${ent.start[0]}" y1="${-ent.start[1]}" x2="${ent.end[0]}" y2="${-ent.end[1]}" stroke="${col}" stroke-width="0.8" />\n`;
                } else if (ent.type === 'CIRCLE') {
                    svgMarkup += `  <circle cx="${ent.center[0]}" cy="${-ent.center[1]}" r="${ent.radius}" stroke="${col}" stroke-width="0.8" fill="none" />\n`;
                } else if (ent.type === 'POLYLINE' && ent.points) {
                    const pts = ent.points.map(p => `${p[0]},${-p[1]}`).join(' ');
                    svgMarkup += `  <${ent.closed ? 'polygon' : 'polyline'} points="${pts}" stroke="${col}" stroke-width="0.8" fill="none" />\n`;
                } else if (ent.type === 'TEXT') {
                    svgMarkup += `  <text x="${ent.point[0]}" y="${-ent.point[1]}" font-size="${ent.height || 4}" fill="${col}">${ent.text}</text>\n`;
                }
            }
            svgMarkup += `</svg>`;

            const blob = new Blob([svgMarkup], { type: 'image/svg+xml' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.download = `${currentDrawing.filename ? currentDrawing.filename.replace(/\.[^/.]+$/, "") : "drawing"}.svg`;
            a.href = url;
            a.click();
            URL.revokeObjectURL(url);
        };

        // Download Converted DXF
        btnExportDxf.onclick = async () => {
            if (!currentDrawing) {
                alert("Please load or open a DWG / DXF file first.");
                return;
            }
            if (currentDrawing.dxf_content) {
                const blob = new Blob([currentDrawing.dxf_content], { type: 'application/dxf' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.download = `${currentDrawing.filename ? currentDrawing.filename.replace(/\.[^/.]+$/, "") : "drawing"}.dxf`;
                a.href = url;
                a.click();
                URL.revokeObjectURL(url);
            } else {
                alert("DXF conversion is available directly via standard export.");
            }
        };

        // Initial render
        render();
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
