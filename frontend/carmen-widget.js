(function(g,b){typeof exports=="object"&&typeof module<"u"?b(exports):typeof define=="function"&&define.amd?define(["exports"],b):(g=typeof globalThis<"u"?globalThis:g||self,b(g.CarmenBot={}))})(this,(function(g){"use strict";function b(m="#34558b"){return`
    :root {
        
        --primary-color: ${m};
        --primary-gradient: linear-gradient(135deg, ${m} 0%, ${m} 100%);
        
        --bg-light: #f8fafc;
        --text-dark: #1e293b;
        --text-gray: #64748b;
        --radius-xl: 24px;
        --radius-lg: 18px;
        --shadow-window: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    }
    #carmen-chat-widget { 
        position: fixed !important; bottom: 24px !important; right: 24px !important; z-index: 999999 !important; 
        font-family: 'Inter', 'Sarabun', sans-serif !important; line-height: 1.6 !important; 
        text-align: left !important; color: #1e293b !important; font-size: 16px !important;
    }
    
    #carmen-chat-widget * { box-sizing: border-box !important; outline: none !important; }
    
    #carmen-chat-widget h3, #carmen-chat-widget p, #carmen-chat-widget span, 
    #carmen-chat-widget button, #carmen-chat-widget input {
        margin: 0 !important; padding: 0 !important; border: none !important; 
        background: none !important; box-shadow: none !important;
        font-family: inherit !important; font-weight: normal !important;
        max-width: none !important; appearance: none !important;
    }

    #carmen-chat-widget img {
        margin: 4px 2px !important; padding: 0 !important; border: 1px solid #e2e8f0 !important;
        display: inline-block !important; vertical-align: top !important;
    }
    #carmen-chat-widget .msg img,
    #carmen-chat-widget #preview-img-element {
        max-width: 100% !important;
        max-height: 200px !important; 
        width: auto !important; height: auto !important;
        border-radius: 8px !important; cursor: pointer !important; object-fit: contain !important;
    }

    /* --- Launcher --- */
    #carmen-chat-widget .chat-btn { 
        width: 64px !important; height: 64px !important; 
        background: var(--primary-gradient) !important; 
        border-radius: 50% !important; 
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2) !important; 
        cursor: pointer !important; 
        display: flex !important; justify-content: center !important; align-items: center !important; 
        transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s !important;
    }
    #carmen-chat-widget .chat-btn:hover { transform: scale(1.1) rotate(-5deg) !important; box-shadow: 0 15px 35px rgba(0, 0, 0, 0.3) !important; }
    .chat-box.open ~ .chat-btn { transform: scale(0) !important; opacity: 0 !important; pointer-events: none !important; }

    /* --- Main Window --- */
    #carmen-chat-widget .chat-box { 
        position: absolute !important; bottom: 80px !important; right: 0 !important; 
        width: 380px !important; height: 650px !important; max-height: 80vh !important; 
        background: #ffffff !important; 
        border-radius: var(--radius-xl) !important; 
        box-shadow: var(--shadow-window) !important;
        display: none; flex-direction: column !important; overflow: hidden !important; 
        border: 1px solid rgba(255,255,255,0.8) !important;
        transform-origin: bottom right !important;
        animation: slideIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards !important;
    }
    #carmen-chat-widget .chat-box.open { display: flex !important; }
    @keyframes slideIn { from { opacity: 0; transform: translateY(20px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }

    /* --- Header --- */
    #carmen-chat-widget .chat-header { 
        background: var(--primary-gradient) !important; 
        padding: 20px !important; 
        display: flex !important; justify-content: space-between !important; align-items: center !important; 
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1) !important;
        color: white !important;
        flex-shrink: 0 !important;
    }
    #carmen-chat-widget .avatar-wrapper {
        position: relative !important; width: 42px !important; height: 42px !important; 
        background: rgba(255,255,255,0.2) !important; border-radius: 50% !important;
        display: flex !important; align-items: center !important; justify-content: center !important;
        backdrop-filter: blur(4px) !important;
    }
    #carmen-chat-widget .status-dot {
        position: absolute !important; bottom: 0 !important; right: 0 !important;
        width: 10px !important; height: 10px !important; background: #22c55e !important;
        border: 2px solid var(--primary-color) !important; /* ใช้สี theme ตัดขอบ */
        border-radius: 50% !important;
        box-shadow: 0 0 0 1px rgba(0,0,0,0.1) !important;
    }
    #carmen-chat-widget .chat-header h3 { 
        margin: 0 !important; font-size: 17px !important; font-weight: 700 !important; 
        letter-spacing: 0.3px !important; color: white !important; 
    }
    
    #carmen-chat-widget .header-tools { display: flex !important; gap: 8px !important; }
    #carmen-chat-widget .icon-btn { 
        cursor: pointer !important; width: 32px !important; height: 32px !important; 
        border-radius: 50% !important; display: flex !important; align-items: center !important; justify-content: center !important;
        background: rgba(255,255,255,0.15) !important; transition: 0.2s !important;
    }
    #carmen-chat-widget .icon-btn:hover { background: rgba(255,255,255,0.3) !important; transform: scale(1.05) !important; }
    #carmen-chat-widget .icon-btn svg { width: 18px !important; height: 18px !important; fill: white !important; }

    /* --- Body --- */
    #carmen-chat-widget .chat-body { 
        flex: 1 !important; padding: 20px !important; overflow-y: auto !important; 
        background: var(--bg-light) !important; 
        display: flex !important; flex-direction: column !important; gap: 14px !important; 
        scroll-behavior: smooth !important;
    }
    .chat-body::-webkit-scrollbar { width: 6px !important; }
    .chat-body::-webkit-scrollbar-thumb { background-color: #cbd5e1 !important; border-radius: 10px !important; border: 2px solid #f1f5f9 !important; }
    .chat-body::-webkit-scrollbar-track { background: transparent !important; }

    /* --- Messages --- */
    #carmen-chat-widget .msg { 
        max-width: 85% !important; padding: 12px 16px !important; font-size: 14px !important; 
        position: relative !important; word-wrap: break-word !important; 
        line-height: 1.6 !important; animation: msgFadeIn 0.3s ease-out forwards !important;
        box-shadow: 0 2px 5px rgba(0,0,0,0.03) !important;
        border-radius: 18px !important; 
    }
    @keyframes msgFadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

    #carmen-chat-widget .msg.user { 
        background: var(--primary-gradient) !important; color: white !important; 
        align-self: flex-end !important; border-radius: var(--radius-lg) var(--radius-lg) 4px var(--radius-lg) !important;
    }
    #carmen-chat-widget .msg.bot { 
        background: white !important; color: var(--text-dark) !important; 
        align-self: flex-start !important; border-radius: var(--radius-lg) var(--radius-lg) var(--radius-lg) 4px !important;
        padding-bottom: 34px !important; border: 1px solid #f1f5f9 !important;
    }

    /* --- Typing Indicator --- */
    #carmen-chat-widget .typing-indicator { 
        display: none; 
        background: white !important; 
        padding: 12px 16px !important; border-radius: var(--radius-lg) var(--radius-lg) var(--radius-lg) 4px !important;
        width: fit-content !important; margin-left: 0 !important; margin-top: 10px !important;
        box-shadow: 0 2px 5px rgba(0,0,0,0.03) !important;
        align-items: center !important; gap: 5px !important; border: 1px solid #f1f5f9 !important;
    }
    #carmen-chat-widget .typing-dot { width: 6px !important; height: 6px !important; background-color: #94a3b8 !important; border-radius: 50% !important; display: inline-block !important; animation: bounce 1.4s infinite ease-in-out both !important; }
    #carmen-chat-widget .typing-dot:nth-child(1) { animation-delay: -0.32s !important; } 
    #carmen-chat-widget .typing-dot:nth-child(2) { animation-delay: -0.16s !important; }
    @keyframes bounce { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1); } }

    /* --- Suggestions --- */
    #carmen-chat-widget .suggestions-container { 
        display: flex !important; flex-direction: column !important; 
        align-items: flex-end !important; flex-wrap: nowrap !important; 
        gap: 8px !important; margin: 10px 0 !important; padding-right: 5px !important;
    }
    
    #carmen-chat-widget .suggestion-chip { 
        background: white !important; 
        border: 1px solid #e2e8f0 !important;
        border-radius: 18px 4px 18px 18px !important; padding: 10px 16px !important; 
        font-size: 13px !important; color: var(--text-dark) !important; cursor: pointer !important; 
        transition: all 0.2s !important; box-shadow: 0 2px 4px rgba(0,0,0,0.02) !important;
        max-width: 90% !important; text-align: right !important;
        animation: slideInChip 0.4s cubic-bezier(0.16, 1, 0.3, 1) backwards !important;
    }
    #carmen-chat-widget .suggestion-chip:hover { 
        background: #eff6ff !important; border-color: var(--primary-color) !important; 
        color: var(--primary-color) !important; transform: translateX(-5px) !important; 
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1) !important; 
    }
    @keyframes slideInChip { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    #carmen-chat-widget .suggestion-chip:nth-child(1) { animation-delay: 0.1s !important; }
    #carmen-chat-widget .suggestion-chip:nth-child(2) { animation-delay: 0.25s !important; }
    #carmen-chat-widget .suggestion-chip:nth-child(3) { animation-delay: 0.35s !important; }
    #carmen-chat-widget .suggestion-chip:nth-child(4) { animation-delay: 0.45s !important; }
    #carmen-chat-widget .suggestion-chip:nth-child(5) { animation-delay: 0.55s !important; }

    /* --- Footer --- */
    #carmen-chat-widget .chat-footer { 
        padding: 16px 20px 20px 20px !important; 
        background: white !important; border-top: 1px solid #f1f5f9 !important; 
        display: flex !important; gap: 10px !important; align-items: center !important;
        flex-shrink: 0 !important;
    }
    #carmen-chat-widget .chat-input { 
        flex: 1 !important; padding: 12px 18px !important; border-radius: 30px !important; 
        border: 1px solid #e2e8f0 !important; outline: none !important; background: #f8fafc !important; 
        font-family: 'Sarabun', sans-serif !important; font-size: 14px !important; color: var(--text-dark) !important;
        transition: all 0.2s !important; margin-left: 5px !important; height: 46px !important;
    }
    #carmen-chat-widget .chat-input:focus { 
        border-color: var(--primary-color) !important; background: white !important; 
        box-shadow: 0 0 0 4px rgba(0, 0, 0, 0.05) !important; 
    }
    #carmen-chat-widget .send-btn { 
        width: 46px !important; height: 46px !important; 
        background: var(--primary-gradient) !important; color: white !important; border: none !important; border-radius: 50% !important; 
        cursor: pointer !important; display: flex !important; align-items: center !important; justify-content: center !important; 
        transition: 0.2s !important; box-shadow: 0 6px 15px rgba(0, 0, 0, 0.1) !important;
        flex-shrink: 0 !important;
    }
    #carmen-chat-widget .send-btn:hover { transform: scale(1.05) !important; box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2) !important; }
    #carmen-chat-widget .send-btn svg { width: 24px !important; height: 24px !important; fill: white !important; margin-left: 4px !important; display: block !important; }

    /* --- Image Upload & Preview --- */
    #carmen-chat-widget .icon-btn-footer {
        background: none !important; border: none !important; cursor: pointer !important; padding: 8px !important;
        display: flex !important; align-items: center !important; justify-content: center !important;
        border-radius: 50% !important; transition: 0.2s !important; width: 40px !important; height: 40px !important;
    }
    #carmen-chat-widget .icon-btn-footer:hover { background: #f1f5f9 !important; }

    #carmen-chat-widget .image-preview-container {
        display: none; 
        padding: 10px 15px !important; background: #f1f5f9 !important; border-top: 1px solid #e2e8f0 !important;
        align-items: center !important; justify-content: space-between !important; gap: 15px !important;
        flex-shrink: 0 !important;
    }
    #carmen-chat-widget .preview-box { flex: 1 !important; display: flex !important; justify-content: flex-start !important; }
    
    #carmen-chat-widget #preview-img-element {
        height: 60px !important; width: auto !important; max-width: 100% !important;
        border-radius: 6px !important; border: 1px solid #cbd5e1 !important;
        object-fit: cover !important; display: block !important;
    }

    #carmen-chat-widget #clear-image-btn {
        background: white !important; 
        border: 1px solid #cbd5e1 !important; 
        border-radius: 8px !important;
        width: 36px !important; height: 36px !important;
        cursor: pointer !important; display: flex !important; align-items: center !important; justify-content: center !important;
        transition: all 0.2s !important; flex-shrink: 0 !important;
    }
    #carmen-chat-widget #clear-image-btn:hover { background: #fee2e2 !important; border-color: #ef4444 !important; }
    #carmen-chat-widget #clear-image-btn svg { width: 20px !important; height: 20px !important; stroke: #ef4444 !important; }

    /* Tools */
    #carmen-chat-widget .tools-container { position: absolute !important; bottom: 6px !important; right: 10px !important; display: flex !important; gap: 6px !important; opacity: 0.6 !important; transition: 0.2s !important; }
    #carmen-chat-widget .msg.bot:hover .tools-container { opacity: 1 !important; }
    #carmen-chat-widget .copy-btn, #carmen-chat-widget .feedback-btn { background: transparent !important; border: none !important; cursor: pointer !important; padding: 4px !important; border-radius: 4px !important; transition: 0.2s !important; width: 24px !important; height: 24px !important; display: flex !important; align-items: center !important; justify-content: center !important; }
    #carmen-chat-widget .copy-btn svg { width: 14px !important; height: 14px !important; fill: #64748b !important; }
    #carmen-chat-widget .copy-btn:hover, #carmen-chat-widget .feedback-btn:hover { background: #f1f5f9 !important; transform: scale(1.1) !important; }

    /* Tooltip */
    #carmen-chat-widget .chat-tooltip {
        position: fixed !important; bottom: 105px !important; right: 20px !important;
        background: rgba(255, 255, 255, 0.95) !important; backdrop-filter: blur(8px) !important;
        color: var(--text-dark) !important; padding: 14px 20px !important; border-radius: 18px !important;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 10px 15px -3px rgba(0, 0, 0, 0.1) !important;
        font-size: 14px !important; font-weight: 500 !important;
        display: flex !important; align-items: center !important; gap: 12px !important; z-index: 99998 !important;
        opacity: 0 !important; transform: translateY(10px) scale(0.95) !important; pointer-events: none !important;
        max-width: 280px !important; border: 1px solid rgba(255,255,255,0.8) !important;
        transition: opacity 0.4s, transform 0.4s !important;
    }
    #carmen-chat-widget .chat-tooltip.show {
        opacity: 1 !important; 
        pointer-events: auto !important;
        animation: tooltipFloat 3s ease-in-out infinite !important;
        transform: translateY(0) scale(1);
    }
    
    @keyframes tooltipFloat { 
        0%, 100% { transform: translateY(0) scale(1); } 
        50% { transform: translateY(-6px) scale(1); } 
    }

    #carmen-chat-widget .chat-tooltip::after {
        content: ''; position: absolute !important; bottom: -6px !important; right: 32px !important;
        width: 14px !important; height: 14px !important; background: rgba(255, 255, 255, 0.95) !important;
        backdrop-filter: blur(8px) !important; transform: rotate(45deg) !important;
        border-bottom: 1px solid rgba(255,255,255,0.8) !important; border-right: 1px solid rgba(255,255,255,0.8) !important;
    }
    #carmen-chat-widget .tooltip-close {
        width: 22px !important; height: 22px !important; background: #f1f5f9 !important; border-radius: 50% !important;
        display: flex !important; align-items: center !important; justify-content: center !important;
        cursor: pointer !important; color: #94a3b8 !important; font-size: 16px !important; line-height: 1 !important;
    }
    #carmen-chat-widget .tooltip-close:hover { background: #fee2e2 !important; color: #ef4444 !important; }

    @media (max-width: 480px) {
        #carmen-chat-widget { z-index: 999999 !important; }
        #carmen-chat-widget .chat-box {
            position: fixed !important; top: 0 !important; left: 0 !important; right: 0 !important; bottom: 0 !important;
            width: 100% !important; height: 100% !important; max-height: 100% !important;
            border-radius: 0 !important; margin: 0 !important; border: none !important;
        }
        #carmen-chat-widget .chat-header { padding-top: max(20px, env(safe-area-inset-top)) !important; border-radius: 0 !important; }
        #carmen-chat-widget .chat-box.open ~ .chat-btn { display: none !important; }
    }
    
    #carmen-chat-widget .alert-overlay {
        position: absolute !important;
        top: 0 !important; left: 0 !important;
        width: 100% !important; height: 100% !important;
        background: rgba(255, 255, 255, 0.85) !important;
        backdrop-filter: blur(4px) !important;
        z-index: 1000 !important;
        display: none;
        flex-direction: column !important;
        justify-content: center !important; align-items: center !important;
        padding: 20px !important;
        border-radius: var(--radius-xl) !important;
        animation: fadeInOverlay 0.2s ease-out !important;
    }

    @keyframes fadeInOverlay { from { opacity: 0; } to { opacity: 1; } }

    #carmen-chat-widget .alert-box {
        background: white !important;
        width: 100% !important;
        padding: 24px 20px !important;
        border-radius: 20px !important;
        box-shadow: 0 10px 25px rgba(0,0,0,0.15) !important;
        text-align: center !important;
        border: 1px solid #f1f5f9 !important;
        transform: scale(0.95);
        animation: popIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards !important;
    }

    @keyframes popIn { to { transform: scale(1); } }

    #carmen-chat-widget .alert-icon { font-size: 40px !important; margin-bottom: 15px !important; display: block !important; }
    
    #carmen-chat-widget .alert-title { 
        font-size: 18px !important; font-weight: 700 !important; 
        color: var(--text-dark) !important; margin-bottom: 8px !important; 
    }
    
    #carmen-chat-widget .alert-desc { 
        font-size: 14px !important; color: var(--text-gray) !important; 
        margin-bottom: 20px !important; line-height: 1.5 !important; 
    }

    #carmen-chat-widget .alert-actions { 
        display: flex !important; gap: 10px !important; justify-content: center !important; 
    }

    #carmen-chat-widget .btn-alert {
        flex: 1 !important; padding: 10px !important; border-radius: 12px !important;
        font-size: 14px !important; font-weight: 600 !important; cursor: pointer !important;
        transition: 0.2s !important; border: none !important;
    }

    #carmen-chat-widget .btn-confirm { 
        background: var(--primary-gradient) !important; color: white !important; 
        box-shadow: 0 4px 10px rgba(0,0,0,0.2) !important; 
    }
    #carmen-chat-widget .btn-confirm:hover { transform: translateY(-2px) !important; }

    #carmen-chat-widget .btn-cancel { 
        background: #f1f5f9 !important; color: var(--text-dark) !important; 
    }
    #carmen-chat-widget .btn-cancel:hover { background: #e2e8f0 !important; }
    `}const d={launcher:'<svg viewBox="0 0 24 24" width="28" height="28" fill="white"><path fill="white" d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>',botAvatar:`
        <div class="avatar-wrapper">
            <div style="font-size:26px;">👩‍💼</div>
            <div class="status-dot"></div>
        </div>`,clear:'<svg viewBox="0 0 24 24"><path d="M15 16h4v2h-4zm0-8h7v2h-7zm0 4h6v2h-6zM3 18c0 1.1.9 2 2 2h6c1.1 0 2-.9 2-2V8H3v10zM14 5h-3l-1-1H6L5 5H2v2h12z"/></svg>',close:'<svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>',send:'<svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>',copy:'<svg viewBox="0 0 24 24" width="14" height="14" style="display:block;"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" fill="#64748b"/></svg>',check:'<svg viewBox="0 0 24 24" width="14" height="14"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" fill="#16a34a"/></svg>',thumbsUp:"👍",thumbsDown:"👎",clip:'<svg viewBox="0 0 24 24" width="24" height="24" fill="#64748b"><path d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5a2.5 2.5 0 0 1 5 0v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5a2.5 2.5 0 0 0 5 0V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z"/></svg>'};class y{constructor(t){this.baseUrl=t.replace(/\/$/,"")}async getHistory(t,e,a){try{const i=new URLSearchParams({bu:t,username:e,session_id:a||""}),o=await fetch(`${this.baseUrl}/chat/history?${i.toString()}`,{method:"GET"});return o.ok?await o.json():[]}catch(i){return console.warn("API Error:",i),[]}}async clearHistory(t,e){try{const a=new URLSearchParams({bu:t,username:e});await fetch(`${this.baseUrl}/chat/history?${a.toString()}`,{method:"DELETE"})}catch(a){console.error("Failed to clear history:",a)}}async sendMessage(t){const e=await fetch(`${this.baseUrl}/chat`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(t)});if(!e.ok){let a="Unknown Error";try{const i=await e.json();a=i.detail||JSON.stringify(i)}catch{a=await e.text()}throw new Error(`API Error ${e.status}: ${a}`)}return await e.json()}async sendFeedback(t,e){try{await fetch(`${this.baseUrl}/chat/feedback/${t}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({score:e})})}catch(a){console.error("Feedback Error:",a)}}}function w(m={showClear:!0,showAttach:!0}){const{showClear:t,showAttach:e}=m;return`
        <div class="chat-btn" id="carmen-launcher">${d.launcher}</div>
        
        <div class="chat-box" id="carmenChatWindow">

            
            <div id="carmen-alert-overlay" class="alert-overlay">
                <div class="alert-box">
                    <div class="alert-icon" id="carmen-alert-icon">⚠️</div>
                    <div class="alert-title" id="carmen-alert-title">แจ้งเตือน</div>
                    <div class="alert-desc" id="carmen-alert-desc">ข้อความแจ้งเตือน</div>
                    <div class="alert-actions" id="carmen-alert-actions">
                        </div>
                </div>
            </div>
            <div class="chat-header">
               <div style="display:flex; align-items:center; gap:12px;">
                 ${d.botAvatar}
                 <div style="display:flex; flex-direction:column;">
                   <h3>Carmen Chatbot</h3>
                   <span style="font-size:11px; opacity:0.9; font-weight:400;">Online • พร้อมช่วยเหลือ</span>
                 </div>
               </div>
               
               <div class="header-tools">
                 ${t?`<div class="icon-btn" id="carmen-clear-btn" title="ล้างแชท">${d.clear}</div>`:""}
                 <div class="icon-btn" id="carmen-close-btn" title="ปิด">${d.close}</div>
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
              ${e?`
                  <input type="file" id="carmen-file-input" accept="image/*" style="display: none;">
                  <button class="icon-btn-footer" id="carmen-attach-btn" title="แนบรูป">${d.clip}</button>
              `:""}

              <input type="text" id="carmenUserInput" class="chat-input" placeholder="พิมพ์ข้อความ...">
              <button class="send-btn" id="carmen-send-btn">${d.send}</button>
            </div>
        </div>
    `}function v(){return`
        <div style="display:flex; flex-direction:column; gap:2px;">
            <span style="font-weight:600; color:#334155;">👋 สวัสดี</span>
            <span style="font-size:13px; color:#64748b;">สงสัยตรงไหนถาม <span style="color:#2563eb; font-weight:600;">Carmen</span> ได้เลย</span>
        </div>
        <div class="tooltip-close" id="carmen-tooltip-close">×</div>
    `}function k(m,t,e){let a="";return m==="bot"&&(a+=`
            <div class="tools-container" style="display: flex; align-items: center; justify-content: flex-end; gap: 8px; margin-top: 6px; padding-top: 4px;">
                <button class="copy-btn" title="คัดลอก" style="background: none; border: none; cursor: pointer; opacity: 0.6; padding: 2px;">
                    ${d.copy}
                </button>
                ${t?`
                    <div style="width: 1px; height: 12px; background: #cbd5e1;"></div>
                    <div style="display: flex; gap: 5px;">
                        <button class="feedback-btn" onclick="window.carmenRate('${t}', 1, this)" title="มีประโยชน์" style="background: none; border: none; cursor: pointer; font-size: 12px; opacity: 0.7; padding: 0;">${d.thumbsUp}</button>
                        <button class="feedback-btn" onclick="window.carmenRate('${t}', -1, this)" title="ไม่ถูกต้อง" style="background: none; border: none; cursor: pointer; font-size: 12px; opacity: 0.7; padding: 0;">${d.thumbsDown}</button>
                    </div>
                `:""}
            </div>
        `),a}function I(m){const t=m.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);return t?t[1]:null}function B(m,t){let e=m;e=e.replace(/!\[(.*?)\]\s*\((.*?)\)/g,(i,o,r)=>{let n=r.trim();if(n.includes("images/")||n.endsWith(".png")||n.endsWith(".jpg")){n=n.replace(/^(\.\/|\/)/,"");const s=t?t.replace(/\/$/,""):"";return`<br><img src="${n.startsWith("http")?n:`${s}/${n}`}" alt="${o}" style="max-width: 100%; height: auto; border-radius: 8px; border: 1px solid #e2e8f0; cursor: pointer; margin: 5px 0;" onclick="window.open(this.src, '_blank')" onerror="this.style.display='none';"><br>`}return`<img src="${n}" alt="${o}" style="max-width: 100%; height: auto; border-radius: 8px; margin: 5px 0;"><br>`}),e=e.replace(/<img\s+([\s\S]*?)>/gi,(i,o)=>{if(o.includes("http"))return i;const r=o.match(/src=["'](.*?)["']/i);if(!r)return i;let n=r[1];if(n.includes("images/")||n.endsWith(".png")||n.endsWith(".jpg")){let s=n.trim().replace(/^(\.\/|\/)/,"");const u=`${t?t.replace(/\/$/,""):""}/${s}`,p=o.match(/alt=["'](.*?)["']/i),c=p?p[1]:"image";return`<br><img src="${u}" alt="${c}" style="max-width: 100%; height: auto; border-radius: 8px; cursor: pointer; border: 1px solid #e2e8f0; margin: 5px 0;" onclick="window.open(this.src, '_blank')" onerror="this.style.display='none';"><br>`}return i});const a=/(https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.be)[^\s<)"']+)/g;return e=e.replace(a,i=>{const o=I(i);return o?`<br><iframe src="https://www.youtube.com/embed/${o}" style="width:100%; height:200px; border:0; border-radius:8px; margin:10px 0;" allowfullscreen></iframe><br>`:`<a href="${i}" target="_blank" style="color:#2563eb;">${i}</a>`}),e=e.replace(/\*\*(.*?)\*\*/g,"<b>$1</b>").replace(/\n/g,"<br>"),e}class f{constructor(t={}){if(!t.bu||!t.user){const i="❌ CarmenBot Error: กรุณาระบุ 'bu' และ 'user' ใน Config ด้วยครับ (Required)";console.error(i),alert(i);return}const a=t.apiUrl||"https://carmen-chatbot-api.onrender.com";this.apiBase=a.replace(/\/$/,""),this.bu=t.bu,this.username=t.user,this.theme=t.theme||"#34558b",this.title=t.title||null,this.prompt_extend=t.prompt_extend||null,this.showClearHistoryButton=t.showClearHistoryButton!==!1,this.showAttachFileButton=t.showAttachFileButton!==!1,this.api=new y(this.apiBase),this.sessionKey=`carmen_sess_${this.bu}_${this.username}`,this.sessionId=localStorage.getItem(this.sessionKey),this.sessionId||(this.sessionId=`sess_${Date.now()}_${Math.random().toString(36).substring(7)}`,localStorage.setItem(this.sessionKey,this.sessionId)),this.suggestedQuestions=["กดปุ่ม refresh ใน workbook ไม่ได้ ทำยังไง","บันทึกใบกำกับภาษีซื้อ ใน excel แล้ว import ได้หรือไม่","program carmen สามารถ upload file เข้า program RDPrep ของสรรพากรได้ หรือไม่","ฉันสามารถสร้าง ใบเสร็จรับเงิน โดยไม่เลือก Tax Invoice ได้หรือไม่","ฉันสามารถบันทึก JV โดยที่ debit และ credit ไม่เท่ากันได้หรือไม่"],this.currentImageBase64=null,this.init()}init(){this.injectStyles(),this.createDOM(),this.attachEvents(),this.setupGlobalFunctions(),this.showLauncher();const t=document.getElementById("carmenUserDisplay");t&&(t.innerText=`${this.bu!=="global"?`[${this.bu}] `:""}${this.username}`),this.loadHistory(),this.showTooltip()}showModal({title:t,text:e,icon:a="💡",confirmText:i="ตกลง",cancelText:o=null,onConfirm:r=null}){const n=document.getElementById("carmen-alert-overlay"),s=document.getElementById("carmen-alert-icon"),l=document.getElementById("carmen-alert-title"),u=document.getElementById("carmen-alert-desc"),p=document.getElementById("carmen-alert-actions");if(s.textContent=a,l.textContent=t,u.innerHTML=e,p.innerHTML="",o){const h=document.createElement("button");h.className="btn-alert btn-cancel",h.textContent=o,h.onclick=()=>{n.style.display="none"},p.appendChild(h)}const c=document.createElement("button");c.className="btn-alert btn-confirm",c.textContent=i,c.onclick=()=>{n.style.display="none",r&&r()},p.appendChild(c),n.style.display="flex"}injectStyles(){if(document.getElementById("carmen-style"))return;const t=document.createElement("link");t.href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Sarabun:wght@300;400;500;600&display=swap",t.rel="stylesheet",document.head.appendChild(t);const e=document.createElement("style");e.id="carmen-style",e.innerText=b(this.theme),document.head.appendChild(e)}createDOM(){if(document.getElementById("carmen-chat-widget"))return;const t=document.createElement("div");t.id="carmen-chat-widget",t.innerHTML=w({showClear:this.showClearHistoryButton,showAttach:this.showAttachFileButton}),document.body.appendChild(t)}setupGlobalFunctions(){window.carmenRate=async(t,e,a)=>{const i=a.parentElement;i.innerHTML=e===1?'<span style="font-size:11px; color:#16a34a;">ขอบคุณค่ะ ❤️</span>':'<span style="font-size:11px; color:#991b1b;">ขอบคุณค่ะ 🙏</span>',await this.api.sendFeedback(t,e)}}showTooltip(){if(localStorage.getItem(`carmen_tooltip_seen_${this.bu}`))return;const e=document.getElementById("carmen-chat-widget"),a=document.createElement("div");a.className="chat-tooltip",a.id="carmen-tooltip",a.innerHTML=v(),e.appendChild(a),setTimeout(()=>a.classList.add("show"),2e3);const i=document.getElementById("carmen-tooltip-close"),o=document.getElementById("carmen-launcher"),r=()=>{a.classList.remove("show"),setTimeout(()=>a.remove(),500),localStorage.setItem(`carmen_tooltip_seen_${this.bu}`,"true")};i.onclick=n=>{n.stopPropagation(),r()},a.onclick=()=>{o.click(),r()},o.addEventListener("click",r)}attachEvents(){const t=document.getElementById("carmenChatWindow"),e=document.getElementById("carmen-launcher");e&&(e.onclick=()=>{t.classList.toggle("open"),t.classList.contains("open")&&setTimeout(()=>this.scrollToBottom(),0)}),document.getElementById("carmen-close-btn").onclick=()=>t.classList.remove("open");const a=document.getElementById("carmen-clear-btn");a&&(a.onclick=()=>{this.showModal({icon:"🗑️",title:"ล้างประวัติแชท?",text:"ข้อความทั้งหมดจะถูกลบ<br>และไม่สามารถกู้คืนได้",confirmText:"ลบเลย",cancelText:"ยกเลิก",onConfirm:async()=>{const n=document.getElementById("carmenChatBody");n.innerHTML='<div style="text-align:center; padding:20px; color:#94a3b8;">⏳ กำลังล้างข้อมูล...</div>',await this.api.clearHistory(this.bu,this.username),n.innerHTML="",this.sessionId=`sess_${Date.now()}_${Math.random().toString(36).substring(7)}`,localStorage.setItem(this.sessionKey,this.sessionId),this.showModal({icon:"✨",title:"เรียบร้อย",text:"ล้างประวัติการสนทนาแล้วครับ",confirmText:"ตกลง"}),setTimeout(()=>this.addSuggestions(),1e3)}})});const i=document.getElementById("carmen-file-input"),o=document.getElementById("carmen-attach-btn");document.getElementById("carmenImagePreview"),document.getElementById("preview-img-element");const r=document.getElementById("clear-image-btn");o&&i&&(o.onclick=()=>i.click(),i.onchange=n=>{n.target.files[0],i.onchange=s=>{const l=s.target.files[0];if(l&&l.size>5*1024*1024){this.showModal({icon:"⚠️",title:"ไฟล์ใหญ่เกินไป",text:"กรุณาอัปโหลดรูปภาพ<br>ขนาดไม่เกิน 5MB ครับ",confirmText:"เข้าใจแล้ว"});return}}}),r&&(r.onclick=()=>{this.clearImageSelection()}),document.getElementById("carmen-send-btn").onclick=()=>this.sendMessage(),document.getElementById("carmenUserInput").onkeypress=n=>{n.key==="Enter"&&this.sendMessage()}}clearImageSelection(){this.currentImageBase64=null;const t=document.getElementById("carmen-file-input");t&&(t.value="");const e=document.getElementById("carmenImagePreview");e&&(e.style.display="none")}showLauncher(){const t=document.getElementById("carmen-launcher");t&&(t.style.display="flex")}async loadHistory(){const t=document.getElementById("carmenChatBody");t.innerHTML="";const e=await this.api.getHistory(this.bu,this.username,this.sessionId);if(e&&e.length>0){e.slice(-3).forEach(o=>{o&&o.message&&this.addMessage(o.message,o.sender,!1)});const i=document.createElement("div");i.style.cssText="text-align:center; font-size:11px; color:#94a3b8; margin:10px 0;",i.innerText="— ประวัติการสนทนาล่าสุด —",t.appendChild(i),setTimeout(()=>this.scrollToBottom(),100)}else this.addMessage("สวัสดีค่ะ 👋<br>มีอะไรให้ Carmen ช่วยไหมคะ?","bot",!0);setTimeout(()=>this.addSuggestions(),800)}async sendMessage(t=null){const e=document.getElementById("carmenUserInput"),a=t||e.value.trim();if(!a&&!this.currentImageBase64)return;let i=a;this.currentImageBase64&&(i=`<img src="${this.currentImageBase64}" style="max-width:100%; border-radius:8px; margin-bottom:5px;"><br>${a}`),this.addMessage(i,"user",!1),e.value="";const o=this.currentImageBase64;this.clearImageSelection(),document.querySelectorAll(".suggestions-container").forEach(n=>n.remove());let r=document.getElementById("carmenTypingIndicator");if(!r){const n=document.getElementById("carmenChatBody");r=document.createElement("div"),r.id="carmenTypingIndicator",r.className="typing-indicator",r.innerHTML='<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>',n.appendChild(r)}r.style.display="flex",this.scrollToBottom();try{const n={text:a,image:o,bu:this.bu,username:this.username,session_id:this.sessionId};this.theme&&(n.theme=this.theme),this.title&&(n.title=this.title),this.prompt_extend&&(n.prompt_extend=this.prompt_extend);const s=await this.api.sendMessage(n);document.getElementById("carmenTypingIndicator")&&(document.getElementById("carmenTypingIndicator").style.display="none"),s.answer&&this.addMessage(s.answer,"bot",!0,s.message_id,s.sources)}catch(n){console.error("Send Message Error:",n),document.getElementById("carmenTypingIndicator")&&(document.getElementById("carmenTypingIndicator").style.display="none");const s=n.toString();s.includes("402")||s.includes("Credit")?this.showModal({icon:"💸",title:"เครดิต AI หมดชั่วคราว",text:"ขออภัยครับ ระบบไม่สามารถตอบกลับได้ในขณะนี้<br>กรุณาแจ้งแอดมินให้เติมเครดิต OpenRouter",confirmText:"รับทราบ"}):this.addMessage("⚠️ Error: เกิดข้อผิดพลาดในการเชื่อมต่อ","bot",!0)}}addMessage(t,e,a=!1,i=null,o=null){const r=document.getElementById("carmenChatBody"),n=document.createElement("div");n.className=`msg ${e}`;const s=B(t,this.apiBase),l=k(e,i);r.appendChild(n);const u=p=>{const c=p.querySelector(".copy-btn");c&&(c.onclick=()=>{const h=t.replace(/!\[.*?\]\(.*?\)/g,"[รูปภาพ]").replace(/\*\*(.*?)\*\*/g,"$1").replace(/<br>/g,`
`);navigator.clipboard.writeText(h).then(()=>{c.innerHTML=d.check,c.style.opacity="1",setTimeout(()=>{c.innerHTML=d.copy,c.style.opacity="0.6"},2e3)})})};if(e==="bot"&&a){n.classList.add("typing");let p=0;const c=10;n.innerHTML="";const h=()=>{if(p<s.length){if(s.charAt(p)==="<"){let x="";for(;s.charAt(p)!==">"&&p<s.length;)x+=s.charAt(p),p++;x+=">",p++,n.innerHTML+=x}else n.innerHTML+=s.charAt(p),p++;this.scrollToBottom(),setTimeout(h,c)}else n.classList.remove("typing"),n.innerHTML=s+l,u(n),this.scrollToBottom()};h()}else n.innerHTML=s+l,u(n),this.scrollToBottom()}addSuggestions(t){document.querySelectorAll(".suggestions-container").forEach(o=>o.remove());const e=t||this.suggestedQuestions;if(!e||e.length===0)return;const a=document.getElementById("carmenChatBody"),i=document.createElement("div");i.className="suggestions-container",i.style.cssText="display: flex; gap: 6px; flex-wrap: wrap; margin-top: 10px; margin-bottom: 10px; justify-content: flex-end; padding-right: 5px;",e.forEach(o=>{const r=document.createElement("button");r.innerText=o,r.className="suggestion-chip",r.style.cssText="background: #ffffff; border: 1px solid #cbd5e1; color: #475569; padding: 8px 12px; border-radius: 18px; cursor: pointer; font-size: 12px; transition: 0.2s; max-width: 85%; text-align: left; line-height: 1.4; box-shadow: 0 1px 2px rgba(0,0,0,0.05);",r.onmouseover=()=>{r.style.background="#34558b",r.style.color="white",r.style.borderColor="#34558b"},r.onmouseout=()=>{r.style.background="#ffffff",r.style.color="#475569",r.style.borderColor="#cbd5e1"},r.onclick=()=>this.sendMessage(o),i.appendChild(r)}),a.appendChild(i),this.scrollToBottom()}scrollToBottom(){const t=document.getElementById("carmenChatBody");t&&(t.scrollTop=t.scrollHeight)}}window.CarmenBot=f,g.CarmenBot=f,Object.defineProperty(g,Symbol.toStringTag,{value:"Module"})}));
