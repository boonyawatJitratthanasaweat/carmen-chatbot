// ✅ ฟังก์ชันดึง Video ID จาก Youtube
export function getYoutubeId(url) {
    if (!url) return null;
    try {
        const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
        const match = url.match(regExp);
        // ✅ ลบเงื่อนไข length === 11 เพื่อรองรับ video ID ที่ไม่ได้เป็น standard
        return (match && match[7] && match[7].trim()) ? match[7].trim() : null;
    } catch (e) {
        return null;
    }
}

// ✅ ฟังก์ชันแปลงข้อความแบบเบ็ดเสร็จ
export function formatMessageContent(text, apiBase) {
    if (!text) return "";
    let str = String(text);
    const cleanApiBase = apiBase ? apiBase.replace(/\/$/, '') : '';

    // 1. จัดการวิดีโอก่อน (YouTube) 🎬
    // 1.1 จัดการ Markdown link [title](youtube_url)
    const mdVideoRegex = /\[(.*?)\]\((https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.be)[^\s<)"']+)\)/g;
    str = str.replace(mdVideoRegex, (match, title, url) => {
        const videoId = getYoutubeId(url);
        if (videoId) {
            return `
                <div class="video-container carmen-processed-video">
                    <div class="video-ratio-box">
                        <iframe src="https://www.youtube.com/embed/${videoId}" 
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                                allowfullscreen>
                        </iframe>
                    </div>
                </div>
            `;
        }
        return match;
    });

    // 1.2 จัดการ raw YouTube URL
    const urlRegex = /(https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.be)[^\s<)"']+)/g;
    str = str.replace(urlRegex, (match, p1, offset, fullString) => {
        const prefix = fullString.substring(Math.max(0, offset - 10), offset);
        if (/src=['"]$|href=['"]$|\($/.test(prefix)) return match;

        const videoId = getYoutubeId(match);
        if (videoId) {
            return `
                <div class="video-container carmen-processed-video">
                    <div class="video-ratio-box">
                        <iframe src="https://www.youtube.com/embed/${videoId}" 
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                                allowfullscreen>
                        </iframe>
                    </div>
                </div>
            `;
        }
        return match;
    });

    // 2. จัดการรูปภาพ (Images) 🖼️
    const buildImageUrl = (url) => {
        let cleanUrl = url.trim();
        // ✅ ถ้าเป็น YouTube ห้ามทำเป็นรูปภาพเด็ดขาด
        if (cleanUrl.includes('youtube.com') || cleanUrl.includes('youtu.be')) return cleanUrl;

        // ✅ ถ้าเป็น data: URI (base64) ให้ใช้ตรงๆ
        if (cleanUrl.startsWith('data:')) return cleanUrl;

        // ✅ ถ้าเป็น http/https แต่ไม่ใช่ server ของเรา ให้ดึงเฉพาะชื่อไฟล์
        if (/^(http|https):/.test(cleanUrl)) {
            // ตรวจสอบว่าเป็น URL ของ server เราหรือไม่
            const isLocalServer = cleanUrl.includes('127.0.0.1') ||
                cleanUrl.includes('localhost') ||
                (cleanApiBase && cleanUrl.startsWith(cleanApiBase));

            // ถ้าเป็น URL ภายนอก (เช่น example.com) ให้ดึงเฉพาะชื่อไฟล์
            if (!isLocalServer) {
                const filename = cleanUrl.split('/').pop().split('?')[0]; // ดึงชื่อไฟล์และตัด query string ออก
                return `${cleanApiBase}/images/${filename}`;
            }

            // ถ้าเป็น server เราแต่ยังไม่มี /images/ ให้เพิ่มเข้าไป
            if (!cleanUrl.includes('/images/')) {
                const filename = cleanUrl.split('/').pop();
                return `${cleanApiBase}/images/${filename}`;
            }

            return cleanUrl;
        }

        // ✅ ถ้าเป็นแค่ชื่อไฟล์ธรรมดา ให้ใส่ path เข้าไป
        return `${cleanApiBase}/images/${cleanUrl.split('/').pop()}`;
    };

    // Markdown ![alt](url)
    str = str.replace(/!\[(.*?)\]\((.*?)\)/g, (match, alt, url) => {
        if (url.includes('youtube.com') || url.includes('youtu.be')) return match;
        const src = buildImageUrl(url);
        return `<br><a href="${src}" target="_blank"><img src="${src}" alt="${alt}" class="carmen-processed-img"></a><br>`;
    });

    // HTML <img src="...">
    str = str.replace(/<img\s+[^>]*src=["']([^"']+)["'][^>]*>/gi, (match, src) => {
        if (match.includes('carmen-processed-img') || src.includes('youtube')) return match;
        const fullSrc = buildImageUrl(src);
        return `<br><a href="${fullSrc}" target="_blank"><img src="${fullSrc}" class="carmen-processed-img"></a><br>`;
    });

    // 3. จัดการ Link ทั่วไป (ที่หลงเหลือจาก YouTube หรือ link ปกติ)
    str = str.replace(urlRegex, (match, p1, offset, fullString) => {
        const prefix = fullString.substring(Math.max(0, offset - 10), offset);
        if (/src=['"]$|href=['"]$|>$/.test(prefix)) return match;

        return `<a href="${match}" target="_blank" style="color:#2563eb; text-decoration:underline;">${match}</a>`;
    });

    // 4. Detect bare image filenames and convert to images
    str = str.replace(/(?:^|[\s>])(?:ดูรูป\s*)?`?([\w\-]+\.(?:png|jpg|jpeg|gif|svg|webp))`?/gi, (match, filename) => {
        const src = `${cleanApiBase}/images/${filename}`;
        return `<br><a href="${src}" target="_blank"><img src="${src}" alt="${filename}" class="carmen-processed-img"></a><br>`;
    });

    // 5. Formatting Markdown → HTML
    const lines = str.split('\n');
    let result = [];
    let inUl = false;
    let inOl = false;

    for (let line of lines) {
        let trimmed = line.trim();

        // Horizontal rule
        if (/^---+$/.test(trimmed)) {
            if (inUl) { result.push('</ul>'); inUl = false; }
            if (inOl) { result.push('</ol>'); inOl = false; }
            result.push('<hr style="border:none; border-top:1px solid #e2e8f0; margin:12px 0;">');
            continue;
        }

        // Headers
        if (/^### (.+)$/.test(trimmed)) {
            if (inUl) { result.push('</ul>'); inUl = false; }
            if (inOl) { result.push('</ol>'); inOl = false; }
            result.push(`<div style="font-weight:700; font-size:15px; margin:12px 0 6px 0;">${trimmed.replace(/^### /, '')}</div>`);
            continue;
        }
        if (/^## (.+)$/.test(trimmed)) {
            if (inUl) { result.push('</ul>'); inUl = false; }
            if (inOl) { result.push('</ol>'); inOl = false; }
            result.push(`<div style="font-weight:700; font-size:16px; margin:14px 0 6px 0;">${trimmed.replace(/^## /, '')}</div>`);
            continue;
        }

        // Unordered list
        if (/^[-*] (.+)$/.test(trimmed)) {
            if (inOl) { result.push('</ol>'); inOl = false; }
            if (!inUl) { result.push('<ul>'); inUl = true; }
            result.push(`<li>${trimmed.replace(/^[-*] /, '')}</li>`);
            continue;
        }

        // Ordered list
        if (/^\d+\.\s+(.+)$/.test(trimmed)) {
            if (inUl) { result.push('</ul>'); inUl = false; }
            if (!inOl) { result.push('<ol>'); inOl = true; }
            result.push(`<li>${trimmed.replace(/^\d+\.\s+/, '')}</li>`);
            continue;
        }

        // Close any open lists
        if (inUl) { result.push('</ul>'); inUl = false; }
        if (inOl) { result.push('</ol>'); inOl = false; }

        // Normal line
        if (trimmed === '') {
            // Only add spacing if previous item wasn't already a break
            if (result.length > 0 && result[result.length - 1] !== '<br>') {
                result.push('<br>');
            }
        } else {
            result.push(trimmed + '<br>');
        }
    }
    if (inUl) result.push('</ul>');
    if (inOl) result.push('</ol>');

    str = result.join('');

    // Clean up excessive breaks
    str = str.replace(/(<br>){3,}/g, '<br><br>');

    // Inline formatting
    str = str.replace(/`([^`]+)`/g, '<code style="background:#f1f5f9; padding:2px 6px; border-radius:4px; font-size:13px;">$1</code>');
    str = str.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
    str = str.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<i>$1</i>');

    return str;
}