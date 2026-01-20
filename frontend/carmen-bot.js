
const cssStyles = `
    :root {
        --primary-color: #34558b;
        --primary-gradient: linear-gradient(135deg, #34558b 0%, #34558b 100%);
        --bg-light: #f8fafc;
        --text-dark: #1e293b;
        --text-gray: #64748b;
        --radius-xl: 24px;
        --radius-lg: 18px;
        --shadow-window: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    }

    #carmen-chat-widget { 
        position: fixed; bottom: 24px; right: 24px; z-index: 99999; 
        font-family: 'Inter', 'Sarabun', sans-serif; line-height: 1.6; 
    }
    #carmen-chat-widget * { box-sizing: border-box; }

    /* --- Launcher --- */
    .chat-btn { 
        width: 64px; height: 64px; 
        background: var(--primary-gradient); 
        border-radius: 50%; 
        box-shadow: 0 10px 25px rgba(37, 99, 235, 0.4); 
        cursor: pointer; 
        display: flex; justify-content: center; align-items: center; 
        transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s;
    }
    .chat-btn:hover { transform: scale(1.1) rotate(-5deg); box-shadow: 0 15px 35px rgba(37, 99, 235, 0.5); }
    .chat-box.open ~ .chat-btn { transform: scale(0); opacity: 0; pointer-events: none; }

    /* --- Main Window --- */
    .chat-box { 
        position: absolute; bottom: 80px; right: 0; 
        width: 380px; height: 650px; max-height: 80vh; 
        background: #ffffff; 
        border-radius: var(--radius-xl); 
        box-shadow: var(--shadow-window);
        display: none; flex-direction: column; overflow: hidden; 
        border: 1px solid rgba(255,255,255,0.8);
        transform-origin: bottom right;
        animation: slideIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    .chat-box.open { display: flex; }
    @keyframes slideIn { from { opacity: 0; transform: translateY(20px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }

    /* --- Header --- */
    .chat-header { 
        background: var(--primary-gradient); 
        padding: 20px; 
        display: flex; justify-content: space-between; align-items: center; 
        box-shadow: 0 4px 15px rgba(37, 99, 235, 0.15);
        color: white;
    }
    .avatar-wrapper {
        position: relative; 
        width: 42px; height: 42px; 
        background: rgba(255,255,255,0.2); 
        border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        backdrop-filter: blur(4px);
    }
    .status-dot {
        position: absolute; bottom: 0; right: 0;
        width: 10px; height: 10px;
        background: #22c55e;
        border: 2px solid #34558b;
        border-radius: 50%;
        box-shadow: 0 0 0 1px rgba(0,0,0,0.1);
    }
    .chat-header h3 { margin: 0; font-size: 17px; font-weight: 700; letter-spacing: 0.3px; }
    
    .header-tools { display: flex; gap: 8px; }
    .icon-btn { 
        cursor: pointer; width: 32px; height: 32px; 
        border-radius: 50%; display: flex; align-items: center; justify-content: center;
        background: rgba(255,255,255,0.15); transition: 0.2s;
    }
    .icon-btn:hover { background: rgba(255,255,255,0.3); transform: scale(1.05); }
    .icon-btn svg { width: 18px; height: 18px; fill: white; }

    /* --- Body --- */
    .chat-body { 
        flex: 1; padding: 20px; overflow-y: auto; 
        background: var(--bg-light); 
        display: flex; flex-direction: column; gap: 14px; 
        scroll-behavior: smooth;
    }
    .chat-body::-webkit-scrollbar { width: 6px; }
    .chat-body::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 10px; border: 2px solid #f1f5f9; }
    .chat-body::-webkit-scrollbar-track { background: transparent; }

    /* --- Messages --- */
    .msg { 
        max-width: 85%; padding: 12px 16px; font-size: 14px; 
        position: relative !important; word-wrap: break-word; 
        line-height: 1.6; animation: msgFadeIn 0.3s ease-out forwards;
        box-shadow: 0 2px 5px rgba(0,0,0,0.03);
    }
    @keyframes msgFadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

    .msg.user { 
        background: var(--primary-gradient); color: white !important; 
        align-self: flex-end; border-radius: var(--radius-lg) var(--radius-lg) 4px var(--radius-lg);
    }
    .msg.bot { 
        background: white; color: var(--text-dark); 
        align-self: flex-start; border-radius: var(--radius-lg) var(--radius-lg) var(--radius-lg) 4px;
        padding-bottom: 34px !important; border: 1px solid #f1f5f9;
    }

    /* --- Typing Indicator --- */
    .typing-indicator { 
        display: none; background: white !important; 
        padding: 12px 16px !important; border-radius: var(--radius-lg) var(--radius-lg) var(--radius-lg) 4px !important;
        width: fit-content !important; margin-left: 0 !important; margin-top: 10px;
        box-shadow: 0 2px 5px rgba(0,0,0,0.03) !important;
        align-items: center; gap: 5px; border: 1px solid #f1f5f9 !important;
    }
    .typing-dot { width: 6px; height: 6px; background-color: #94a3b8; border-radius: 50%; display: inline-block; animation: bounce 1.4s infinite ease-in-out both; }
    .typing-dot:nth-child(1) { animation-delay: -0.32s; } .typing-dot:nth-child(2) { animation-delay: -0.16s; }
    @keyframes bounce { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1); } }

    /* --- Suggestions --- */
    .suggestions-container { 
        display: flex !important; flex-direction: column !important; 
        align-items: flex-end !important; flex-wrap: nowrap !important; 
        gap: 8px; margin: 10px 0; padding-right: 5px;
    }
    .suggestion-chip { 
        background: white; border: 1px solid #e2e8f0; 
        border-radius: 18px 4px 18px 18px; padding: 10px 16px; 
        font-size: 13px; color: var(--text-dark); cursor: pointer; 
        transition: all 0.2s; box-shadow: 0 2px 4px rgba(0,0,0,0.02);
        max-width: 90%; text-align: right;
        animation: slideInChip 0.4s cubic-bezier(0.16, 1, 0.3, 1) backwards;
    }
    .suggestion-chip:hover { 
        background: #eff6ff; border-color: var(--primary-color); 
        color: var(--primary-color); transform: translateX(-5px); 
        box-shadow: 0 4px 10px rgba(37, 99, 235, 0.15); 
    }
    @keyframes slideInChip { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    .suggestion-chip:nth-child(1) { animation-delay: 0.1s; }
    .suggestion-chip:nth-child(2) { animation-delay: 0.25s; }
    .suggestion-chip:nth-child(3) { animation-delay: 0.35s; }
    .suggestion-chip:nth-child(4) { animation-delay: 0.45s; }
    .suggestion-chip:nth-child(5) { animation-delay: 0.55s; }

    /* --- Footer --- */
    .chat-footer { 
        padding: 16px 20px 20px 20px; 
        background: white; border-top: 1px solid #f1f5f9; 
        display: flex; gap: 10px; align-items: center; 
    }
    .chat-input { 
        flex: 1; padding: 12px 18px; border-radius: 30px; 
        border: 1px solid #e2e8f0; outline: none; background: #f8fafc; 
        font-family: 'Sarabun', sans-serif; font-size: 14px; color: var(--text-dark);
        transition: all 0.2s;
        margin-left: 5px; /* ดันห่างจากปุ่มแนบรูป */
    }
    .chat-input::placeholder { color: #94a3b8; opacity: 0.8; }
    .chat-input:focus { 
        border-color: var(--primary-color); background: white; 
        box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1); 
    }
    .send-btn { 
        width: 60px; height: 60px; 
        background: var(--primary-gradient); color: white; border: none; border-radius: 50%; 
        cursor: pointer; display: flex; align-items: center; justify-content: center; 
        transition: 0.2s; box-shadow: 0 6px 15px rgba(37, 99, 235, 0.3);
        flex-shrink: 0;
    }
    .send-btn:hover { transform: scale(1.05); box-shadow: 0 8px 20px rgba(37, 99, 235, 0.45); }
    .send-btn svg { width: 34px !important; height: 34px !important; fill: white !important; margin-left: 5px; display: block; }

    /* Tools */
    .tools-container { position: absolute; bottom: 6px; right: 10px; display: flex; gap: 6px; opacity: 0.6; transition: 0.2s; }
    .msg.bot:hover .tools-container { opacity: 1; }
    .copy-btn, .feedback-btn { background: transparent; border: none; cursor: pointer; padding: 4px; border-radius: 4px; transition: 0.2s; }
    .copy-btn svg { width: 14px; height: 14px; fill: #64748b; }
    .copy-btn:hover, .feedback-btn:hover { background: #f1f5f9; transform: scale(1.1); }

    /* --- Tooltip --- */
    .chat-tooltip {
        position: fixed; bottom: 105px; right: 20px;
        background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(8px);
        color: var(--text-dark); padding: 14px 20px; border-radius: 18px;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 10px 15px -3px rgba(37, 99, 235, 0.15);
        font-size: 14px; font-weight: 500;
        display: flex; align-items: center; gap: 12px; z-index: 99998;
        opacity: 0; transform: translateY(10px) scale(0.95); pointer-events: none;
        max-width: 280px; border: 1px solid rgba(255,255,255,0.8);
        transition: opacity 0.4s, transform 0.4s;
    }
    .chat-tooltip.show {
        opacity: 1; transform: translateY(0) scale(1); pointer-events: auto;
        animation: tooltipFloat 3s ease-in-out infinite;
    }
    @keyframes tooltipFloat { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
    .chat-tooltip::after {
        content: ''; position: absolute; bottom: -6px; right: 32px;
        width: 14px; height: 14px; background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(8px); transform: rotate(45deg);
        border-bottom: 1px solid rgba(255,255,255,0.8); border-right: 1px solid rgba(255,255,255,0.8);
        box-shadow: 4px 4px 4px -2px rgba(0,0,0,0.03);
    }
    .tooltip-close {
        width: 22px; height: 22px; background: #f1f5f9; border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        cursor: pointer; color: #94a3b8; font-size: 16px; line-height: 1;
        flex-shrink: 0; transition: all 0.2s;
    }
    .tooltip-close:hover { background: #fee2e2; color: #ef4444; transform: scale(1.1); }

    /* --- Table & Code --- */
    .msg table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 12px; overflow: hidden; border-radius: 8px; border: 1px solid #e2e8f0; }
    .msg th, .msg td { padding: 8px 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }
    .msg th { background: #f8fafc; font-weight: 600; color: var(--text-dark); }
    .msg tr:last-child td { border-bottom: none; }
    .msg tr:hover { background: #fcfcfc; }
    
    .msg pre { background: #1e293b; color: #e2e8f0; padding: 12px; border-radius: 8px; overflow-x: auto; font-family: 'Consolas', monospace; font-size: 12px; margin: 10px 0; }
    .msg code { background: rgba(0,0,0,0.05); color: #d946ef; padding: 2px 4px; border-radius: 4px; font-family: monospace; }
    .msg pre code { background: transparent; color: inherit; padding: 0; }

    /* --- Mobile Responsive --- */
    @media (max-width: 480px) {
        #carmen-chat-widget { z-index: 999999 !important; }
        .chat-box {
            position: fixed !important; top: 0 !important; left: 0 !important; right: 0 !important; bottom: 0 !important;
            width: 100% !important; height: 100% !important; max-height: 100% !important;
            border-radius: 0 !important; margin: 0 !important; border: none !important;
            animation: mobileSlideUp 0.3s ease-out forwards !important;
        }
        @keyframes mobileSlideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .chat-header { padding-top: max(20px, env(safe-area-inset-top)) !important; border-radius: 0 !important; }
        .chat-box.open ~ .chat-btn { display: none !important; }
        .chat-tooltip { display: none !important; }
    }

    /* --- Image Upload & Preview --- */
    .icon-btn-footer {
        background: none; border: none; cursor: pointer; padding: 8px;
        display: flex; align-items: center; justify-content: center;
        border-radius: 50%; transition: 0.2s;
    }
    .icon-btn-footer:hover { background: #f1f5f9; }

    /* ✅ แก้ Preview เป็น Flexbox (รูปซ้าย ปุ่มขวา) */
    .image-preview-container {
        padding: 10px 15px;
        background: #f1f5f9;
        border-top: 1px solid #e2e8f0;
        display: flex; align-items: center; justify-content: space-between;
        gap: 15px;
    }

    /* ✅ ล็อคขนาดรูป */
    .preview-box { flex: 1; display: flex; justify-content: flex-start; }
    #preview-img-element {
        height: 60px; width: auto; max-width: 100%;
        border-radius: 6px; border: 1px solid #cbd5e1;
        object-fit: cover; display: block;
    }

    /* ✅ ปุ่มลบ (ไม่ต้องใช้ absolute แล้ว) */
    #clear-image-btn {
        background: white; border: 1px solid #cbd5e1; border-radius: 8px;
        width: 36px; height: 36px;
        cursor: pointer; display: flex; align-items: center; justify-content: center;
        transition: all 0.2s; flex-shrink: 0;
    }
    #clear-image-btn:hover { background: #fee2e2; border-color: #ef4444; }
`;

/* =========================================
   2. ICONS (SVG) - รวมไอคอนทั้งหมด
   ========================================= */
const ICONS = {
    launcher: `<svg viewBox="0 0 24 24" width="28" height="28" fill="white"><path fill="white" d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>`,
    botAvatar: `
        <div class="avatar-wrapper">
            <div style="font-size:26px;">👩‍💼</div>
            <div class="status-dot"></div>
        </div>`,
    clear: `<svg viewBox="0 0 24 24"><path d="M15 16h4v2h-4zm0-8h7v2h-7zm0 4h6v2h-6zM3 18c0 1.1.9 2 2 2h6c1.1 0 2-.9 2-2V8H3v10zM14 5h-3l-1-1H6L5 5H2v2h12z"/></svg>`,
    close: `<svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>`,
    send: `<svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>`,
    copy: `<svg viewBox="0 0 24 24" width="14" height="14" style="display:block;"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" fill="#64748b"/></svg>`,
    check: `<svg viewBox="0 0 24 24" width="14" height="14" fill="#16a34a"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>`,
    thumbsUp: `👍`,
    thumbsDown: `👎`,
    clip: `<svg viewBox="0 0 24 24" width="24" height="24" fill="#64748b"><path d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5a2.5 2.5 0 0 1 5 0v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5a2.5 2.5 0 0 0 5 0V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z"/></svg>`,
};

/* =========================================
   3. API SERVICE CLASS
   ========================================= */
class ChatService {
    constructor(apiBase) { this.apiBase = apiBase; }

    async sendMessage(payload) {
        const res = await fetch(`${this.apiBase}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error("API Error");
        return await res.json();
    }

    async getHistory(bu, sessionId) {
        try {
            const res = await fetch(`${this.apiBase}/history?bu=${bu}&session_id=${sessionId}`);
            if (!res.ok) return [];
            const data = await res.json();
            return data.history || [];
        } catch (e) { console.error("History Error", e); return []; }
    }

    async sendFeedback(msgId, score) {
        try {
            await fetch(`${this.apiBase}/feedback`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message_id: msgId, score: score })
            });
        } catch (e) { console.error("Feedback Error", e); }
    }
}

/* =========================================
   4. UTILS (Helpers)
   ========================================= */
function formatMessageContent(text, apiBase) {
    if (!text) return "";
    // แปลง Markdown Link [text](url) เป็น <a href>
    let formatted = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" style="color:#2563eb; text-decoration:underline;">$1</a>');
    // แปลง Markdown Bold **text** เป็น <b>
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
    // แปลง Newline เป็น <br>
    formatted = formatted.replace(/\n/g, '<br>');
    return formatted;
}

/* =========================================
   5. DOM TEMPLATES (HTML Generation)
   ========================================= */
function createWidgetHTML() {
    return `
        <div class="chat-btn" id="carmen-launcher">${ICONS.launcher}</div>
        
        <div class="chat-box" id="carmenChatWindow">
            <div class="chat-header">
               <div style="display:flex; align-items:center; gap:12px;">
                 ${ICONS.botAvatar}
                 <div style="display:flex; flex-direction:column;">
                   <h3>Carmen Chatbot</h3>
                   <span style="font-size:11px; opacity:0.9; font-weight:400;">Online • พร้อมช่วยเหลือ</span>
                 </div>
               </div>
               
               <div class="header-tools">
                 <div class="icon-btn" id="carmen-clear-btn" title="ล้างแชท">${ICONS.clear}</div>
                 <div class="icon-btn" id="carmen-close-btn" title="ปิด">${ICONS.close}</div>
               </div>
            </div>

            <div class="chat-body" id="carmenChatBody">
                <div class="typing-indicator" id="carmenTypingIndicator">
                    <div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>
                </div>
            </div>

            <div id="carmenImagePreview" class="image-preview-container" style="display:none;">
                <div class="preview-box">
                    <img id="preview-img-element" src="" />
                </div>
                <button id="clear-image-btn" type="button" title="ลบรูป">
                   <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                </button>
            </div>

            <div class="chat-footer">
              <input type="file" id="carmen-file-input" accept="image/*" style="display: none;">
              <button class="icon-btn-footer" id="carmen-attach-btn" title="แนบรูป">${ICONS.clip}</button>

              <input type="text" id="carmenUserInput" class="chat-input" placeholder="พิมพ์ข้อความ...">
              <button class="send-btn" id="carmen-send-btn">${ICONS.send}</button>
            </div>
        </div>
    `;
}

function createTooltipHTML() {
    return `
        <div style="display:flex; flex-direction:column; gap:2px;">
            <span style="font-weight:600; color:#334155;">👋 สวัสดี</span>
            <span style="font-size:13px; color:#64748b;">สงสัยตรงไหนถาม <span style="color:#2563eb; font-weight:600;">Carmen</span> ได้เลย</span>
        </div>
        <div class="tooltip-close" id="carmen-tooltip-close">×</div>
    `;
}

function createMessageExtras(sender, msgId, sources) {
    let html = '';
    // Sources
    if (sender === 'bot' && sources && sources.length > 0) {
        html += `
            <details style="margin-top: 8px; border-top: 1px solid #e2e8f0; padding-top: 8px;">
                <summary style="cursor: pointer; font-size: 11px; color: #64748b; outline: none; list-style: none;">
                    📚 อ้างอิงจาก ${sources.length} เอกสาร <span style="font-size: 9px;">▼</span>
                </summary>
                <div style="margin-top: 5px; display: flex; flex-direction: column; gap: 5px;">
                    ${sources.map(s => `
                        <div style="background: #f1f5f9; padding: 6px; border-radius: 4px; font-size: 10px; color: #475569;">
                            <strong>📄 ${s.source} (Page ${s.page})</strong>
                            <div style="margin-top:2px; opacity:0.8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                                "${s.content.substring(0, 50)}..."
                            </div>
                            <div style="font-size:9px; color:#94a3b8;">Score: ${s.score}</div>
                        </div>
                    `).join('')}
                </div>
            </details>
        `;
    }
    // Tools
    if (sender === 'bot') {
        html += `
            <div class="tools-container" style="display: flex; align-items: center; justify-content: flex-end; gap: 8px; margin-top: 6px; padding-top: 4px;">
                <button class="copy-btn" title="คัดลอก" style="background: none; border: none; cursor: pointer; opacity: 0.6; padding: 2px;">
                    ${ICONS.copy}
                </button>
                ${msgId ? `
                    <div style="width: 1px; height: 12px; background: #cbd5e1;"></div>
                    <div style="display: flex; gap: 5px;">
                        <button class="feedback-btn" onclick="window.carmenRate('${msgId}', 1, this)" title="มีประโยชน์" style="background: none; border: none; cursor: pointer; font-size: 12px; opacity: 0.7; padding: 0;">${ICONS.thumbsUp}</button>
                        <button class="feedback-btn" onclick="window.carmenRate('${msgId}', -1, this)" title="ไม่ถูกต้อง" style="background: none; border: none; cursor: pointer; font-size: 12px; opacity: 0.7; padding: 0;">${ICONS.thumbsDown}</button>
                    </div>
                ` : ''}
            </div>
        `;
    }
    return html;
}

/* =========================================
   6. MAIN CLASS
   ========================================= */
export class CarmenBot {
    constructor(config = {}) {
        // Configuration
        const defaultUrl = "https://carmen-chatbot-api.onrender.com";
        const urlToUse = config.apiUrl || defaultUrl;
        this.apiBase = urlToUse.replace(/\/$/, "");

        this.bu = config.bu || "global";
        this.username = config.user || "Guest";
        this.theme = config.theme || null;
        this.title = config.title || null;
        this.prompt_extend = config.prompt_extend || null;

        // Initialize API Service
        this.api = new ChatService(this.apiBase);

        // Session
        this.sessionKey = `carmen_sess_${this.bu}_${this.username}`;
        this.sessionId = localStorage.getItem(this.sessionKey);
        if (!this.sessionId) {
            this.sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(7)}`;
            localStorage.setItem(this.sessionKey, this.sessionId);
        }

        this.suggestedQuestions = [
            "กดปุ่ม refresh ใน workbook ไม่ได้ ทำยังไง",
            "บันทึกใบกำกับภาษีซื้อ ใน excel แล้ว import ได้หรือไม่",
            "program carmen สามารถ upload file เข้า program RDPrep ของสรรพากรได้ หรือไม่",
            "ฉันสามารถสร้าง ใบเสร็จรับเงิน โดยไม่เลือก Tax Invoice ได้หรือไม่",
            "ฉันสามารถบันทึก JV โดยที่ debit และ credit ไม่เท่ากันได้หรือไม่"
        ];

        this.currentImageBase64 = null;
        this.init();
    }

    init() {
        this.injectStyles();
        this.createDOM();
        this.attachEvents();
        this.setupGlobalFunctions();
        this.showLauncher();
        this.loadHistory();
        this.showTooltip();
    }

    injectStyles() {
        if (document.getElementById('carmen-style')) return;
        const fontLink = document.createElement('link');
        fontLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Sarabun:wght@300;400;500;600&display=swap';
        fontLink.rel = 'stylesheet';
        document.head.appendChild(fontLink);

        const styleSheet = document.createElement("style");
        styleSheet.id = 'carmen-style';
        styleSheet.innerText = cssStyles;
        document.head.appendChild(styleSheet);
    }

    createDOM() {
        if (document.getElementById('carmen-chat-widget')) return;
        const container = document.createElement('div');
        container.id = 'carmen-chat-widget';
        container.innerHTML = createWidgetHTML();
        document.body.appendChild(container);
    }

    setupGlobalFunctions() {
        window.carmenRate = async (msgId, score, btnElement) => {
            const parent = btnElement.parentElement;
            parent.innerHTML = score === 1
                ? '<span style="font-size:11px; color:#16a34a;">ขอบคุณค่ะ ❤️</span>'
                : '<span style="font-size:11px; color:#991b1b;">ขอบคุณค่ะ 🙏</span>';
            await this.api.sendFeedback(msgId, score);
        };
    }

    showTooltip() {
        const hasSeenTooltip = localStorage.getItem(`carmen_tooltip_seen_${this.bu}`);
        if (hasSeenTooltip) return;

        const container = document.getElementById('carmen-chat-widget');
        const tooltip = document.createElement('div');
        tooltip.className = 'chat-tooltip';
        tooltip.id = 'carmen-tooltip';
        tooltip.innerHTML = createTooltipHTML();
        container.appendChild(tooltip);

        setTimeout(() => tooltip.classList.add('show'), 2000);

        const closeBtn = document.getElementById('carmen-tooltip-close');
        const launcher = document.getElementById('carmen-launcher');
        const closeTooltip = () => {
            tooltip.classList.remove('show');
            setTimeout(() => tooltip.remove(), 500);
            localStorage.setItem(`carmen_tooltip_seen_${this.bu}`, 'true');
        };

        if (closeBtn) closeBtn.onclick = (e) => { e.stopPropagation(); closeTooltip(); };
        if (tooltip) tooltip.onclick = () => { launcher.click(); closeTooltip(); };
        if (launcher) launcher.addEventListener('click', closeTooltip);
    }

    attachEvents() {
        const win = document.getElementById('carmenChatWindow');
        const launcher = document.getElementById('carmen-launcher');
        const clearBtn = document.getElementById('carmen-clear-btn');
        const closeBtn = document.getElementById('carmen-close-btn');
        const sendBtn = document.getElementById('carmen-send-btn');
        const input = document.getElementById('carmenUserInput');

        // Toggle Window
        if (launcher) {
            launcher.onclick = () => {
                win.classList.toggle('open');
                if (win.classList.contains('open')) setTimeout(() => this.scrollToBottom(), 0);
            };
        }

        // Close Button
        if (closeBtn) closeBtn.onclick = () => win.classList.remove('open');

        // Clear Chat
        if (clearBtn) {
            clearBtn.onclick = () => {
                document.getElementById('carmenChatBody').innerHTML = '';
                this.sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(7)}`;
                localStorage.setItem(this.sessionKey, this.sessionId);
                this.addMessage(`ล้างแชทเรียบร้อย ✨`, 'bot', true);
                setTimeout(() => this.addSuggestions(), 1000);
            };
        }

        // Image Upload Logic (Defensive Coding)
        const fileInput = document.getElementById('carmen-file-input');
        const attachBtn = document.getElementById('carmen-attach-btn');
        const previewContainer = document.getElementById('carmenImagePreview');
        const previewImg = document.getElementById('preview-img-element');
        const clearImgBtn = document.getElementById('clear-image-btn');

        if (attachBtn && fileInput) {
            attachBtn.onclick = () => fileInput.click();
            fileInput.onchange = (e) => {
                const file = e.target.files[0];
                if (!file) return;
                if (file.size > 5 * 1024 * 1024) { alert("ไฟล์ใหญ่เกินไป (Max 5MB)"); return; }
                const reader = new FileReader();
                reader.onload = (readerEvent) => {
                    this.currentImageBase64 = readerEvent.target.result; 
                    if (previewImg && previewContainer) {
                        previewImg.src = this.currentImageBase64;
                        previewContainer.style.display = 'flex';
                    }
                    if (input) input.focus();
                };
                reader.readAsDataURL(file);
            };
        }

        if (clearImgBtn) {
            clearImgBtn.onclick = () => this.clearImageSelection();
        }

        // Send Logic
        if (sendBtn) sendBtn.onclick = () => this.sendMessage();
        if (input) input.onkeypress = (e) => { if (e.key === 'Enter') this.sendMessage(); };
    }

    clearImageSelection() {
        this.currentImageBase64 = null;
        const fileInput = document.getElementById('carmen-file-input');
        const preview = document.getElementById('carmenImagePreview');
        if (fileInput) fileInput.value = ''; 
        if (preview) preview.style.display = 'none';
    }

    showLauncher() {
        const btn = document.getElementById('carmen-launcher');
        if (btn) btn.style.display = 'flex';
    }

    async loadHistory() {
        const body = document.getElementById('carmenChatBody');
        body.innerHTML = ''; 
        const history = await this.api.getHistory(this.bu, this.sessionId);

        if (history && history.length > 0) {
            const latestHistory = history.slice(-3);
            latestHistory.forEach(msg => this.addMessage(msg.message, msg.sender, false));
            const divider = document.createElement('div');
            divider.style.cssText = 'text-align:center; font-size:11px; color:#94a3b8; margin:10px 0;';
            divider.innerText = '— ประวัติการสนทนาล่าสุด —';
            body.appendChild(divider);
            setTimeout(() => this.scrollToBottom(), 100);
        } else {
            this.addMessage(`สวัสดีค่ะ 👋<br>มีอะไรให้ Carmen ช่วยไหมคะ?`, 'bot', true);
        }
        setTimeout(() => this.addSuggestions(), 800);
    }

    async sendMessage(message = null) {
        const input = document.getElementById('carmenUserInput');
        const text = message || (input ? input.value.trim() : "");
        if (!text && !this.currentImageBase64) return;

        let displayHTML = text;
        if (this.currentImageBase64) {
            displayHTML = `<img src="${this.currentImageBase64}" style="max-width:100%; border-radius:8px; margin-bottom:5px;"><br>${text}`;
        }

        this.addMessage(displayHTML, 'user', false);
        if (input) input.value = '';
        const imageToSend = this.currentImageBase64; 
        this.clearImageSelection(); 

        document.querySelectorAll('.suggestions-container').forEach(el => el.remove());
        let indicator = document.getElementById('carmenTypingIndicator');
        if (!indicator) {
            const body = document.getElementById('carmenChatBody');
            indicator = document.createElement('div');
            indicator.id = 'carmenTypingIndicator';
            indicator.className = 'typing-indicator';
            indicator.innerHTML = '<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>';
            body.appendChild(indicator);
        }
        indicator.style.display = 'flex';
        this.scrollToBottom();

        try {
            const payload = {
                message: text,
                image: imageToSend,
                bu: this.bu,
                user: this.username,
                session_id: this.sessionId,
            };
            if (this.theme) payload.theme = this.theme;
            if (this.title) payload.title = this.title;
            if (this.prompt_extend) payload.prompt_extend = this.prompt_extend;

            const data = await this.api.sendMessage(payload);

            if (document.getElementById('carmenTypingIndicator')) {
                document.getElementById('carmenTypingIndicator').style.display = 'none';
            }
            if (data.answer) this.addMessage(data.answer, 'bot', true, data.message_id, data.sources);
        } catch (error) {
            console.error(error);
            if (document.getElementById('carmenTypingIndicator')) {
                document.getElementById('carmenTypingIndicator').style.display = 'none';
            }
            this.addMessage("⚠️ Error: เชื่อมต่อไม่ได้", 'bot', true);
        }
    }

    addMessage(text, sender, animate = false, msgId = null, sources = null) {
        const body = document.getElementById('carmenChatBody');
        const div = document.createElement('div');
        div.className = `msg ${sender}`;

        const formattedText = formatMessageContent(text, this.apiBase);
        const extrasHTML = createMessageExtras(sender, msgId, sources);

        body.appendChild(div);

        const bindCopyEvent = (element) => {
            const btn = element.querySelector('.copy-btn');
            if (btn) {
                btn.onclick = () => {
                    const rawText = text.replace(/!\[.*?\]\(.*?\)/g, '[รูปภาพ]').replace(/\*\*(.*?)\*\*/g, '$1').replace(/<br>/g, '\n');
                    navigator.clipboard.writeText(rawText).then(() => {
                        btn.innerHTML = ICONS.check;
                        btn.style.opacity = '1';
                        setTimeout(() => {
                            btn.innerHTML = ICONS.copy;
                            btn.style.opacity = '0.6';
                        }, 2000);
                    });
                };
            }
        };

        if (sender === 'bot' && animate) {
            div.classList.add('typing');
            let i = 0; const speed = 5; div.innerHTML = "";
            const typeWriter = () => {
                if (i < formattedText.length) {
                    if (formattedText.charAt(i) === '<') {
                        let tag = '';
                        while (formattedText.charAt(i) !== '>' && i < formattedText.length) { tag += formattedText.charAt(i); i++; }
                        tag += '>'; i++; div.innerHTML += tag;
                    } else { div.innerHTML += formattedText.charAt(i); i++; }
                    this.scrollToBottom();
                    setTimeout(typeWriter, speed);
                } else {
                    div.classList.remove('typing');
                    div.innerHTML = formattedText + extrasHTML;
                    bindCopyEvent(div);
                    this.scrollToBottom();
                }
            };
            typeWriter();
        } else {
            div.innerHTML = formattedText + extrasHTML;
            bindCopyEvent(div);
            this.scrollToBottom();
        }
    }

    addSuggestions(suggestions) {
        document.querySelectorAll('.suggestions-container').forEach(el => el.remove());
        const items = suggestions || this.suggestedQuestions;
        if (!items || items.length === 0) return;

        const body = document.getElementById('carmenChatBody');
        const div = document.createElement('div');
        div.className = 'suggestions-container';
        items.forEach(text => {
            const btn = document.createElement('button');
            btn.innerText = text;
            btn.className = 'suggestion-chip';
            btn.onmouseover = () => { btn.style.background = '#eff6ff'; btn.style.color = '#34558b'; btn.style.borderColor = '#34558b'; };
            btn.onmouseout = () => { btn.style.background = '#ffffff'; btn.style.color = '#1e293b'; btn.style.borderColor = '#e2e8f0'; };
            btn.onclick = () => this.sendMessage(text);
            div.appendChild(btn);
        });
        body.appendChild(div);
        this.scrollToBottom();
    }

    scrollToBottom() {
        const body = document.getElementById('carmenChatBody');
        if (body) body.scrollTop = body.scrollHeight;
    }
}

// Export Global for direct script usage
window.CarmenBot = CarmenBot;