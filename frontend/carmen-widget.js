(function(_,T){typeof exports=="object"&&typeof module<"u"?T(exports):typeof define=="function"&&define.amd?define(["exports"],T):(_=typeof globalThis<"u"?globalThis:_||self,T(_.CarmenBot={}))})(this,(function(_){"use strict";class T{constructor(t){this.baseUrl=t.replace(/\/$/,"")}async getRooms(t,e){try{const i=await fetch(`${this.baseUrl}/api/chat/rooms/${t}/${e}`);if(!i.ok)throw new Error(`Failed to fetch rooms: ${i.status}`);return await i.json()}catch(i){return console.error("GetRooms Error:",i),[]}}async createRoom(t,e,i="บทสนทนาใหม่"){const r=await fetch(`${this.baseUrl}/api/chat/rooms`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({bu:t,username:e,title:i})});if(!r.ok)throw new Error(`Failed to create room: ${r.status}`);return await r.json()}async getRoomHistory(t){const e=await fetch(`${this.baseUrl}/api/chat/room-history/${t}`);if(!e.ok)throw new Error(`Failed to fetch history: ${e.status}`);return await e.json()}async deleteRoom(t){try{const e=await fetch(`${this.baseUrl}/api/chat/rooms/${t}`,{method:"DELETE"});if(!e.ok)throw new Error(`Failed to delete room: ${e.status}`);return await e.json()}catch(e){throw console.error("DeleteRoom Error:",e),e}}async sendMessage(t){const e=await fetch(`${this.baseUrl}/api/chat`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(t)});if(!e.ok){let i="Unknown Error";try{const r=await e.json();i=r.detail||JSON.stringify(r)}catch{i=await e.text()}throw new Error(`API Error ${e.status}: ${i}`)}return await e.json()}async sendFeedback(t,e){try{await fetch(`${this.baseUrl}/api/chat/feedback/${t}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({score:e})})}catch(i){console.error("Feedback Error:",i)}}async clearHistory(t,e,i){try{const r=new URLSearchParams({bu:t,username:e});if(i&&r.append("room_id",i),!(await fetch(`${this.baseUrl}/api/chat/history?${r.toString()}`,{method:"DELETE"})).ok)throw new Error("Failed to clear history")}catch(r){console.error("ClearHistory Error:",r)}}async getHistory(t,e,i){try{const r=new URLSearchParams({bu:t,username:e,session_id:i||""}),s=await fetch(`${this.baseUrl}/chat/history?${r.toString()}`,{method:"GET"});return s.ok?await s.json():[]}catch(r){return console.warn("API Error:",r),[]}}}function j(h="#34558b"){return`
    :host {
        display: block !important;
        position: fixed !important; 
        bottom: 32px !important; 
        right: 32px !important; 
        z-index: 2000000 !important;
        width: 0 !important; height: 0 !important;
        background: transparent !important;
        pointer-events: none !important; /* Allow clicking through host except where children are */
        --primary-color: ${h};
        --primary-gradient: linear-gradient(135deg, ${h} 0%, ${h} 110%);
        --glass-bg: rgba(255, 255, 255, 0.75);
        --glass-border: rgba(255, 255, 255, 0.5);
        --glass-shadow: 0 12px 48px rgba(0, 0, 0, 0.12);
        
        /* Sidebar Colors */
        --sidebar-bg: #0f172a;
        --sidebar-hover: #1e293b;
        --sidebar-text: #f1f5f9;
        
        /* Chat Colors */
        --bg-light: #f8fafc;
        --text-dark: #0f172a;
        --text-gray: #64748b;
        
        --radius-xl: 32px;
        --radius-lg: 24px;
        --radius-md: 16px;
        
        --font-inter: 'Inter', system-ui, -apple-system, sans-serif;
        --font-sarabun: 'Sarabun', sans-serif;
        
        --transition-snappy: all 0.7s cubic-bezier(0.34, 1.56, 0.64, 1);
        --transition-sidebar: width 0.5s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.4s ease;

        font-family: var(--font-inter) !important;
        line-height: 1.5 !important; 
        text-align: left !important; color: var(--text-dark) !important;
    }
    
    /* Ensure children can receive pointer events */
    .chat-btn, .chat-box, .chat-tooltip {
        pointer-events: auto !important;
    }

    
    * { box-sizing: border-box !important; }

    /* Custom Scrollbar */
    ::-webkit-scrollbar { width: 5px !important; height: 5px !important; }
    ::-webkit-scrollbar-track { background: transparent !important; }
    ::-webkit-scrollbar-thumb { 
        background: rgba(0,0,0,0.1) !important; 
        border-radius: 10px !important; 
        transition: background 0.3s !important;
    }
    .chat-sidebar ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1) !important; }
    *:hover::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.2) !important; }
    .chat-sidebar:hover::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2) !important; }
    
    /* Launcher Button */
    .chat-btn { 
        width: 72px !important; height: 72px !important; 
        background: var(--primary-gradient) !important; 
        border-radius: 24px !important; /* Squircle style */
        box-shadow: 0 12px 32px rgba(0, 0, 0, 0.2), inset 0 -4px 0 rgba(0,0,0,0.1) !important; 
        cursor: pointer !important; 
        display: flex !important; justify-content: center !important; align-items: center !important; 
        transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1) !important;
        position: absolute !important; bottom: 0 !important; right: 0 !important;
        z-index: 2000002 !important;
        overflow: hidden !important;
    }
    
    .chat-btn::before {
        content: '' !important; position: absolute !important; inset: 0 !important;
        background: linear-gradient(45deg, transparent, rgba(255,255,255,0.2), transparent) !important;
        transform: translateX(-100%) !important; transition: 0.6s !important;
    }
    
    .chat-btn:hover { 
        transform: translateY(-8px) scale(1.02) !important; 
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3) !important;
        border-radius: 20px !important;
    }
    
    .chat-btn:hover::before { transform: translateX(100%) !important; }
    
    .chat-btn svg { width: 32px !important; height: 32px !important; transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1) !important; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2)) !important; }
    .chat-btn:hover svg { transform: scale(1.1) rotate(-8deg) !important; }

    /* Pulsing Glow */
    .chat-btn:not(:hover) {
        animation: launcherPulse 3s infinite ease-in-out !important;
    }
    
    @keyframes launcherPulse {
        0%, 100% { box-shadow: 0 12px 32px rgba(0, 0, 0, 0.2), 0 0 0 0 rgba(52, 85, 139, 0.4); }
        50% { box-shadow: 0 16px 36px rgba(0, 0, 0, 0.25), 0 0 0 15px rgba(52, 85, 139, 0); }
    }

    /* Chat Window */
    .chat-box { 
        position: absolute !important; bottom: 84px; right: 0; 
        width: 360px !important; height: 600px !important; max-height: 85vh !important; 
        background: linear-gradient(135deg, 
                    rgba(255, 255, 255, 0.98) 0%, 
                    rgba(250, 250, 252, 0.98) 50%,
                    rgba(255, 255, 255, 0.98) 100%) !important; 
        border-radius: var(--radius-xl) !important; 
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15), 
                    0 8px 24px rgba(0, 0, 0, 0.1),
                    0 0 0 1px rgba(0, 0, 0, 0.05) !important;
        border: 1px solid rgba(0, 0, 0, 0.08) !important;
        display: none !important; flex-direction: row !important; overflow: hidden !important; 
        transform-origin: bottom right !important;
        animation: fadeIn 0.4s ease-out forwards !important;
        transition: width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1), 
                    height 0.6s cubic-bezier(0.34, 1.56, 0.64, 1), 
                    transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1),
                    opacity 0.6s ease, top 0.6s cubic-bezier(0.34, 1.56, 0.64, 1), 
                    left 0.6s cubic-bezier(0.34, 1.56, 0.64, 1), 
                    bottom 0.6s cubic-bezier(0.34, 1.56, 0.64, 1), 
                    right 0.6s cubic-bezier(0.34, 1.56, 0.64, 1), 
                    border-radius 0.6s ease !important;
        z-index: 1000000 !important;
        backface-visibility: hidden !important;
    }
    
    /* Content transition masking to prevent "jitter" during reflow */
    .chat-box.resizing {
        overflow: hidden !important;
        pointer-events: none !important;
        display: flex !important; /* Force flex during transition */
    }
    .chat-box.resizing #carmenChatBody,
    .chat-box.resizing .suggestions-container {
        opacity: 0.1 !important;
        filter: blur(8px) !important;
        transition: opacity 0.3s ease, filter 0.3s ease !important;
    }
    .chat-box.open { display: flex !important; }
    
    @keyframes fadeIn { 
        from { opacity: 0; transform: scale(0.95); filter: blur(4px); } 
        to { opacity: 1; transform: scale(1); filter: blur(0); } 
    }
    
    @keyframes fadeOut { 
        from { opacity: 1; transform: scale(1); filter: blur(0); }
        to { opacity: 0; transform: scale(0.95); filter: blur(4px); } 
    }

    .chat-box.closing {
        animation: fadeOut 0.3s ease-out forwards !important;
        pointer-events: none !important;
    }

    /* Floating Glass Card Menu */
    .chat-sidebar {
        position: absolute !important;
        left: 10px !important;
        top: 70px !important; 
        bottom: auto !important;
        height: auto !important;
        max-height: calc(100% - 90px) !important;
        width: 200px !important; 
        
        display: flex !important; 
        flex-direction: column !important;
        
        /* Glass Effect */
        background: rgba(30, 41, 59, 0.95) !important; 
        backdrop-filter: blur(16px) saturate(180%) !important;
        -webkit-backdrop-filter: blur(16px) saturate(180%) !important;
        
        border: 1px solid rgba(255, 255, 255, 0.1) !important;
        border-radius: 20px !important;
        box-shadow: 0 20px 40px rgba(0,0,0,0.4), 
                    0 0 0 1px rgba(255,255,255,0.05) inset !important;
        
        overflow: hidden !important; 
        transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
        
        transform: translateX(-20px) scale(0.9) !important;
        opacity: 0 !important;
        visibility: hidden !important;
        
        z-index: 150 !important;
    }
    
    .chat-box.expanded .chat-sidebar.sidebar-visible { 
        transform: translateX(0) scale(1) !important;
        opacity: 1 !important;
        visibility: visible !important;
    }

    /* Extra safety: Never show sidebar in Small Mode */
    .chat-box:not(.expanded) .chat-sidebar {
        transform: translateX(-20px) scale(0.9) !important;
        opacity: 0 !important;
        pointer-events: none !important;
    }
    
    .sidebar-header { 
        padding: 28px 20px 20px 20px !important;
        border-bottom: 1px solid rgba(255,255,255,0.05) !important;
        margin-bottom: 8px !important;
    }
    .new-chat-btn {
        width: 100% !important; padding: 14px !important;
        background: var(--primary-gradient) !important; 
        border: none !important;
        color: white !important; border-radius: 14px !important;
        cursor: pointer !important; font-size: 14px !important; font-weight: 700 !important;
        display: flex !important; align-items: center !important; justify-content: center !important;
        transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important;
        box-shadow: 0 8px 20px rgba(52, 85, 139, 0.3) !important;
    }
    .new-chat-btn:hover { transform: translateY(-2px) !important; box-shadow: 0 12px 24px rgba(52, 85, 139, 0.4) !important; filter: brightness(1.1) !important; }

    .room-list { 
        flex: 1 !important; 
        overflow-y: auto !important; 
        padding: 16px 12px !important; 
        display: flex !important; flex-direction: column !important; gap: 8px !important;
    }
    .room-item {
        padding: 14px 16px !important; border-radius: 14px !important;
        color: #94a3b8 !important; cursor: pointer !important;
        display: flex !important; align-items: center !important; gap: 8px !important;
        transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important; 
        position: relative !important;
        background: rgba(255,255,255,0.03) !important;
        border: 1px solid rgba(255,255,255,0.05) !important;
    }
    .room-item:hover { 
        background: rgba(255,255,255,0.08) !important; 
        color: white !important; 
        transform: translateX(4px) !important;
        border-color: rgba(255,255,255,0.1) !important;
    }
    .room-item.active { 
        background: rgba(52, 85, 139, 0.15) !important; 
        color: white !important; 
        border-color: var(--primary-color) !important;
        box-shadow: inset 0 0 0 1px var(--primary-color) !important;
    }
    .room-item.active::before {
        content: '' !important; position: absolute !important; left: 0 !important; top: 25% !important; bottom: 25% !important;
        width: 3px !important; background: var(--primary-color) !important; border-radius: 0 4px 4px 0 !important;
        box-shadow: 0 0 10px var(--primary-color) !important;
    }
    .room-title { font-size: 13.5px !important; font-weight: 500 !important; white-space: nowrap !important; overflow: hidden !important; text-overflow: ellipsis !important; flex: 1 !important; }
    .delete-room-btn { opacity: 0; color: #f87171 !important; font-size: 18px !important; border: none !important; background: transparent !important; cursor: pointer !important; transition: 0.2s !important; }
    .room-item:hover .delete-room-btn { opacity: 1 !important; }

    /* Main Content Area */
    .chat-main { 
        flex: 1 !important; 
        display: flex !important; 
        flex-direction: column !important; 
        min-width: 0 !important; 
        height: 100% !important; 
        background: transparent !important; 
        position: relative !important; 
    }

    /* Glass Header */
    .chat-header { 
        background: var(--primary-gradient) !important; 
        padding: 24px 28px !important; 
        display: flex !important; justify-content: space-between !important; align-items: center !important; 
        color: white !important; flex-shrink: 0 !important;
        position: relative !important;
        z-index: 100 !important;
        user-select: none !important;
        -webkit-user-select: none !important;
    }
    .header-info { display: flex !important; align-items: center !important; gap: 14px !important; }
    .avatar-wrapper {
        width: 48px !important; height: 48px !important; 
        background: linear-gradient(135deg, rgba(255,255,255,0.25), rgba(255,255,255,0.1)) !important; 
        border-radius: 16px !important;
        display: flex !important; align-items: center !important; justify-content: center !important;
        backdrop-filter: blur(12px) !important;
        border: 1px solid rgba(255,255,255,0.3) !important;
        box-shadow: 0 8px 16px rgba(0,0,0,0.1) !important;
        animation: avatarFloat 4s infinite ease-in-out !important;
    }
    @keyframes avatarFloat {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-4px); }
    }
    .avatar-inner svg { width: 28px !important; height: 28px !important; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1)) !important; }

    .chat-header h3 { font-size: 19px !important; font-weight: 700 !important; letter-spacing: -0.02em !important; margin: 0 !important; text-shadow: 0 2px 4px rgba(0,0,0,0.1) !important; }
    .status-indicator { font-size: 11px !important; font-weight: 500 !important; opacity: 0.8 !important; display: flex !important; align-items: center !important; gap: 6px !important; margin-top: 4px !important; text-transform: uppercase !important; letter-spacing: 0.05em !important; }
    .status-indicator .dot { width: 7px !important; height: 7px !important; background: #22c55e !important; border-radius: 50% !important; display: inline-block !important; border: 1.5px solid rgba(255,255,255,0.4) !important; box-shadow: 0 0 8px #22c55e !important; }

    /* Header Tools */
    .header-tools { display: flex !important; gap: 10px !important; align-items: center !important; }
    .icon-btn { 
        width: 36px !important; height: 36px !important; border-radius: 14px !important; 
        display: flex !important; align-items: center !important; justify-content: center !important;
        background: rgba(255,255,255,0.15) !important; cursor: pointer !important; transition: 0.2s !important;
    }
    .icon-btn:hover { background: rgba(255,255,255,0.25) !important; transform: scale(1.05) !important; }
    .icon-btn svg { width: 22px !important; height: 22px !important; fill: white !important; }
    #carmen-menu-btn { display: none !important; margin-right: 4px !important; }

    /* Chat Body */
    .chat-body { 
        flex: 1 !important; padding: 24px !important; overflow-y: auto !important; 
        background: linear-gradient(to bottom, rgba(252, 252, 254, 0.5) 0%, rgba(248, 249, 252, 0.5) 100%) !important; 
        background-image: radial-gradient(circle at 2px 2px, rgba(0, 0, 0, 0.02) 1px, transparent 0) !important;
        background-size: 24px 24px !important;
        display: flex !important; flex-direction: column !important; gap: 20px !important; 
        scroll-behavior: smooth !important;
    }

    /* Message Bubbles */
    .msg { 
        width: fit-content !important; max-width: 88% !important; 
        padding: 14px 20px !important; font-size: 15px !important; 
        box-shadow: 0 2px 8px rgba(0,0,0,0.04) !important;
        font-family: var(--font-sarabun) !important;
        position: relative !important;
        animation: msgPop 0.5s cubic-bezier(0.22, 1, 0.36, 1) backwards !important;
        will-change: transform, opacity !important;
    }
    @keyframes msgPop { from { opacity: 0; transform: scale(0.9) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
    
    .msg img { 
        max-width: 100% !important; 
        height: auto !important; 
        border-radius: 12px !important; 
        margin: 8px 0 !important;
        display: block !important;
    }

    .msg.user { 
        background: #0f172a !important; color: white !important; 
        align-self: flex-end !important; margin-left: auto !important; 
        border-radius: 20px 20px 4px 20px !important;
        box-shadow: 0 4px 12px rgba(15, 23, 42, 0.15) !important;
    }
    .msg.bot { 
        background: white !important; color: var(--text-dark) !important; 
        align-self: flex-start !important; margin-right: auto !important; 
        border-radius: 20px 20px 20px 4px !important; 
        border: 1px solid #f1f5f9 !important;
        padding-bottom: 38px !important;
    }

    /* Message Content extras */
    .video-container { width: 100% !important; margin: 12px 0 !important; border-radius: 12px !important; overflow: hidden !important; }
    .video-ratio-box { position: relative !important; padding-top: 56.25% !important; background: #000 !important; }
    .video-ratio-box iframe { position: absolute !important; top: 0 !important; left: 0 !important; width: 100% !important; height: 100% !important; border: 0 !important; }

    .typing-indicator { display: flex; align-items: center !important; gap: 4px !important; padding: 12px 18px !important; background: white !important; border-radius: 16px 16px 16px 4px !important; width: fit-content !important; border: 1px solid #f1f5f9 !important; margin-top: 10px !important; }
    .typing-indicator.hidden { display: none !important; }
    .typing-dot { width: 6px !important; height: 6px !important; background-color: #cbd5e1 !important; border-radius: 50% !important; animation: bounce 1.4s infinite ease-in-out both !important; }
    .typing-dot:nth-child(1) { animation-delay: -0.32s !important; } 
    .typing-dot:nth-child(2) { animation-delay: -0.16s !important; }
    @keyframes bounce { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1); } }

    /* Suggestions */
    .suggestions-container { 
        display: flex !important; flex-wrap: wrap !important; align-items: flex-start !important; 
        gap: 6px !important; margin: 8px 0 !important; 
        padding: 0 4px !important;
    }
    .suggestion-chip { 
        background: rgba(255,255,255,0.8) !important; 
        backdrop-filter: blur(4px) !important;
        border: 1px solid #e2e8f0 !important; 
        border-radius: 10px !important; 
        padding: 6px 12px !important; 
        font-size: 13px !important; color: var(--text-dark) !important; 
        cursor: pointer !important; transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important; 
        box-shadow: 0 2px 4px rgba(0,0,0,0.02) !important; 
        max-width: 100% !important;
        animation: chipEnter 0.5s cubic-bezier(0.16, 1, 0.3, 1) backwards !important;
    }
    .suggestion-chip:hover { 
        background: white !important; 
        border-color: var(--primary-color) !important; 
        color: var(--primary-color) !important; 
        transform: translateY(-2px) !important; 
        box-shadow: 0 8px 16px rgba(0, 0, 0, 0.08) !important; 
    }
    @keyframes chipEnter {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
    }

    /* Welcome Hero */
    .welcome-hero {
        padding: 32px 20px 16px 20px !important;
        text-align: center !important;
        animation: heroFade 0.8s ease-out !important;
    }
    .welcome-hero .hero-icon {
        width: 64px !important; height: 64px !important;
        background: var(--primary-gradient) !important;
        border-radius: 22px !important;
        margin: 0 auto 16px auto !important;
        display: flex !important; align-items: center !important; justify-content: center !important;
        box-shadow: 0 16px 32px rgba(52, 85, 139, 0.2) !important;
        animation: heroIconPop 1s cubic-bezier(0.16, 1, 0.3, 1) !important;
    }
    .welcome-hero .hero-icon svg { width: 32px !important; height: 32px !important; }
    .welcome-hero h2 { font-size: 20px !important; font-weight: 700 !important; color: var(--text-dark) !important; margin-bottom: 8px !important; }
    .welcome-hero p { color: var(--text-gray) !important; font-size: 14px !important; line-height: 1.5 !important; max-width: 260px !important; margin: 0 auto !important; }

    @keyframes heroFade { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes heroIconPop { from { transform: scale(0.5) rotate(-20deg); opacity: 0; } to { transform: scale(1) rotate(0); opacity: 1; } }

    /* Footer & Input */
    .chat-footer { 
        padding: 20px 24px 24px 24px !important; 
        background: var(--glass-bg) !important; 
        backdrop-filter: blur(12px) !important;
        border-top: 1px solid var(--glass-border) !important; 
        display: flex !important; gap: 12px !important; align-items: center !important; 
    }
    .chat-input { 
        flex: 1 !important; padding: 14px 20px !important; 
        border-radius: 16px !important; 
        border: 1px solid #e2e8f0 !important; 
        outline: none !important; background: white !important; 
        font-family: var(--font-sarabun) !important; font-size: 15px !important; 
        transition: border-color 0.2s, box-shadow 0.2s !important; 
        resize: none !important;
        min-height: 50px !important;
        max-height: 120px !important;
        overflow-y: auto !important;
        line-height: 1.5 !important;
    }
    .chat-input:focus { 
        border-color: var(--primary-color) !important; 
        box-shadow: 0 0 0 4px rgba(52, 85, 139, 0.1), 0 4px 12px rgba(52, 85, 139, 0.05) !important;
        background: white !important;
    }
    
    .send-btn { 
        width: 48px !important; height: 48px !important; 
        background: #0f172a !important; color: white !important; 
        border-radius: 14px !important; cursor: pointer !important; 
        display: flex !important; align-items: center !important; justify-content: center !important; 
        transition: var(--transition-snappy) !important; 
    }
    .send-btn:hover { background: var(--primary-color) !important; transform: scale(1.05) !important; }
    .send-btn svg { width: 24px !important; height: 24px !important; fill: white !important; }

    /* Modals & Overlays */
    .alert-overlay {
        position: absolute !important; inset: 0 !important;
        background: rgba(15, 23, 42, 0.4) !important;
        backdrop-filter: blur(8px) !important;
        z-index: 10000 !important; display: none;
        justify-content: center !important; align-items: center !important;
        padding: 24px !important; animation: fadeIn 0.3s ease !important;
    }
    .alert-box {
        background: white !important; width: 100% !important; max-width: 320px !important;
        padding: 32px !important; border-radius: 28px !important;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25) !important;
        text-align: center !important; transform: scale(1) !important;
        border: 1px solid rgba(0,0,0,0.05) !important;
        animation: scaleUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) !important;
        font-family: var(--font-sarabun) !important;
    }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes scaleUp { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
    
    .alert-icon { font-size: 32px !important; margin-bottom: 16px !important; }
    .alert-title { font-weight: 700 !important; font-size: 18px !important; margin-bottom: 8px !important; }
    .alert-desc { color: var(--text-gray) !important; font-size: 14px !important; margin-bottom: 24px !important; }
    .btn-alert { 
        padding: 12px 24px !important; border-radius: 12px !important; font-weight: 600 !important; cursor: pointer !important; transition: 0.2s !important; width: 100% !important;
    }
    .btn-confirm { background: #0f172a !important; color: white !important; margin-bottom: 8px !important; }
    .btn-cancel { background: #f1f5f9 !important; color: var(--text-dark) !important; }

    /* Tooltip */
    .chat-tooltip {
        position: absolute !important; bottom: 88px !important; right: 0 !important;
        background: rgba(255,255,255,0.9) !important; 
        backdrop-filter: blur(12px) !important;
        padding: 12px 18px !important;
        border-radius: 20px !important; 
        box-shadow: 0 20px 40px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04) !important;
        display: none; align-items: center !important; gap: 14px !important;
        animation: tooltipEnter 0.6s cubic-bezier(0.16, 1, 0.3, 1) backwards !important;
        z-index: 2000001 !important;
        width: max-content !important; cursor: pointer !important;
        max-width: 320px !important;
    }
    .chat-tooltip.show { display: flex !important; }
    
    @keyframes tooltipEnter { 
        0% { opacity: 0; transform: translateY(20px) scale(0.9); filter: blur(4px); } 
        100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); } 
    }
    
    .tooltip-avatar {
        width: 38px !important; height: 38px !important;
        flex-shrink: 0 !important;
    }
    .tooltip-avatar .avatar-inner {
        width: 100% !important; height: 100% !important;
        background: var(--primary-gradient) !important;
        border-radius: 12px !important;
        display: flex !important; align-items: center !important; justify-content: center !important;
        box-shadow: 0 4px 8px rgba(52, 85, 139, 0.2) !important;
    }
    .tooltip-avatar .avatar-inner svg { width: 22px !important; height: 22px !important; }

    .tooltip-content { display: flex !important; flex-direction: column !important; gap: 3px !important; }
    .tooltip-greet { font-weight: 700 !important; font-size: 13px !important; color: var(--primary-color) !important; letter-spacing: 0.02em !important; }
    .tooltip-text { font-size: 13px !important; font-weight: 500 !important; color: var(--text-dark) !important; line-height: 1.4 !important; }
    
    .tooltip-close { 
        position: absolute !important; top: -8px !important; right: -8px !important;
        width: 24px !important; height: 24px !important;
        background: white !important; color: #94a3b8 !important;
        border-radius: 50% !important;
        display: flex !important; align-items: center !important; justify-content: center !important;
        box-shadow: 0 4px 8px rgba(0,0,0,0.1) !important;
        cursor: pointer !important; transition: 0.2s !important;
        border: 1px solid rgba(0,0,0,0.05) !important;
    }
    .tooltip-close:hover { color: #f87171 !important; transform: scale(1.1) !important; }

    /* Image Preview */
    .image-preview-container { 
        padding: 12px 24px !important; background: #f8fafc !important; 
        border-top: 1px solid #e2e8f0 !important; position: relative !important;
    }
    .preview-box { width: 60px !important; height: 60px !important; border-radius: 10px !important; overflow: hidden !important; border: 2px solid white !important; box-shadow: 0 4px 12px rgba(0,0,0,0.1) !important; }
    .preview-box img { width: 100% !important; height: 100% !important; object-fit: cover !important; }
    #clear-image-btn { position: absolute !important; top: 6px !important; left: 66px !important; background: #fee2e2 !important; color: #ef4444 !important; border: none !important; border-radius: 50% !important; width: 24px !important; height: 24px !important; display: flex !important; align-items: center !important; justify-content: center !important; cursor: pointer !important; }

    /* Message Tools (Copy/Feedback) */
    .tools-container { 
        position: absolute !important; bottom: 8px !important; left: 20px !important; 
        display: flex !important; align-items: center !important; gap: 8px !important;
        opacity: 0.6 !important; transition: 0.2s !important;
    }
    .msg:hover .tools-container { opacity: 1 !important; }
    .copy-btn, .feedback-btn { 
        background: transparent !important; border: none !important; cursor: pointer !important; 
        padding: 4px !important; display: flex !important; align-items: center !important; 
        color: var(--text-gray) !important; transition: 0.2s !important;
    }
    .copy-btn:hover { color: var(--primary-color) !important; }
    .feedback-btn:hover { color: #f59e0b !important; }
    .separator { width: 1px !important; height: 12px !important; background: #e2e8f0 !important; }
    .feedback-group { display: flex !important; gap: 4px !important; }

    /* Footer Extras */
    .icon-btn-footer {
        background: transparent !important; border: none !important; color: var(--text-gray) !important;
        cursor: pointer !important; transition: 0.2s !important; display: flex !important; align-items: center !important;
    }
    .icon-btn-footer:hover { color: var(--primary-color) !important; transform: scale(1.1) !important; }

    /* Expanded View */
    .chat-box.expanded {
        position: fixed !important; 
        top: 20px !important; bottom: 84px !important; left: 20px !important; right: 20px !important;
        width: calc(100vw - 40px) !important; height: auto !important; 
        max-height: calc(100vh - 120px) !important; 
        border-radius: 24px !important; 
        box-shadow: 0 40px 100px rgba(0,0,0,0.5) !important;
    }
    .chat-box.expanded #carmen-menu-btn { display: flex !important; }
    
    /* Responsive */
    @media (max-width: 480px) {
        .chat-box {
            width: 100% !important;
            height: 100% !important;
            max-height: 100dvh !important;
            bottom: 0 !important;
            right: 0 !important;
            top: 0 !important;
            left: 0 !important;
            border-radius: 0 !important;
            transform: none !important;
        }
        
        .chat-box.open {
            display: flex !important;
        }
        
        .chat-sidebar {
            width: 80% !important;
            height: auto !important;
            top: 70px !important;
            max-height: calc(100% - 100px) !important;
        }
    }

    /* Typing Indicator */
    .typing-indicator-container { padding: 16px 20px !important; width: fit-content !important; min-width: 60px !important; display: flex !important; align-items: center !important; justify-content: center !important; }
    .typing-dots { display: flex !important; gap: 4px !important; align-items: center !important; height: 100% !important; }
    .typing-dots span {
        width: 8px !important; height: 8px !important;
        background: #94a3b8 !important; border-radius: 50% !important;
        animation: typingBounce 1.4s infinite ease-in-out !important;
        display: block !important;
    }
    .typing-dots span:nth-child(1) { animation-delay: -0.32s !important; }
    .typing-dots span:nth-child(2) { animation-delay: -0.16s !important; }
    
    @keyframes typingBounce {
        0%, 80%, 100% { transform: scale(0); }
        40% { transform: scale(1); }
    }

    /* Markdown Styles */
    .msg ul, .msg ol { margin: 8px 0 !important; padding-left: 24px !important; }
    .msg li { margin-bottom: 4px !important; line-height: 1.5 !important; }
    .msg ul { list-style-type: disc !important; }
    .msg ol { list-style-type: decimal !important; }
    .carmen-link { color: var(--primary-color) !important; text-decoration: none !important; font-weight: 500 !important; }
    .carmen-link:hover { text-decoration: underline !important; }
    /* Markdown Styles */
    .msg ul, .msg ol { margin: 8px 0 !important; padding-left: 24px !important; }
    .msg li { margin-bottom: 4px !important; line-height: 1.5 !important; }
    .msg ul { list-style-type: disc !important; }
    .msg ol { list-style-type: decimal !important; }
    .carmen-link { color: var(--primary-color) !important; text-decoration: none !important; font-weight: 500 !important; }
    .carmen-link:hover { text-decoration: underline !important; }
    `}const v={launcher:'<svg viewBox="0 0 24 24" width="28" height="28" fill="white"><path fill="white" d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>',botAvatar:`
        <div class="avatar-inner">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                <path d="M2 17l10 5 10-5"></path>
                <path d="M2 12l10 5 10-5"></path>
            </svg>
        </div>`,clear:'<svg viewBox="0 0 24 24"><path d="M15 16h4v2h-4zm0-8h7v2h-7zm0 4h6v2h-6zM3 18c0 1.1.9 2 2 2h6c1.1 0 2-.9 2-2V8H3v10zM14 5h-3l-1-1H6L5 5H2v2h12z"/></svg>',close:'<svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>',send:'<svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>',copy:'<svg viewBox="0 0 24 24" width="14" height="14" style="display:block;"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" fill="#64748b"/></svg>',check:'<svg viewBox="0 0 24 24" width="14" height="14"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" fill="#16a34a"/></svg>',thumbsUp:"👍",thumbsDown:"👎",clip:'<svg viewBox="0 0 24 24" width="24" height="24" fill="#64748b"><path d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5a2.5 2.5 0 0 1 5 0v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5a2.5 2.5 0 0 0 5 0V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z"/></svg>'};function M(h,t=!1){return`
        <div class="room-item ${t?"active":""}" data-id="${h.room_id}">
            <div class="room-title" title="${h.title||"บทสนทนาใหม่"}">
                ${h.title||"บทสนทนาใหม่"}
            </div>
            <button class="delete-room-btn" data-id="${h.room_id}" title="ลบห้อง">×</button>
        </div>
    `}function B(){return`
        <div class="msg bot-msg typing-indicator-container">
            <div class="typing-dots">
                <span></span><span></span><span></span>
            </div>
        </div>
    `}function I(h={showClear:!0,showAttach:!0}){const{showClear:t,showAttach:e}=h;return`
        <div class="chat-btn" id="carmen-launcher">${v.launcher}</div>
        
        <div class="chat-box" id="carmenChatWindow">
            
            <div class="chat-sidebar" id="carmenSidebar">
                <div class="sidebar-header">
                    <button id="new-chat-btn" class="new-chat-btn">+ เริ่มแชทใหม่</button>
                </div>
                <div class="room-list" id="carmenRoomList">
                    </div>
            </div>

            <div class="chat-main">
                
                <div id="carmen-alert-overlay" class="alert-overlay">
                    <div class="alert-box">
                        <div class="alert-icon" id="carmen-alert-icon">⚠️</div>
                        <div class="alert-title" id="carmen-alert-title">แจ้งเตือน</div>
                        <div class="alert-desc" id="carmen-alert-desc">ข้อความแจ้งเตือน</div>
                        <div class="alert-actions" id="carmen-alert-actions"></div>
                    </div>
                </div>

                <div class="chat-header">
                    <div class="header-info">
                        <div class="icon-btn" id="carmen-menu-btn" title="เมนู">☰</div>
                        
                        <div class="avatar-wrapper">
                            ${v.botAvatar}
                        </div>
                        
                        <div class="title-wrapper">
                            <h3>Carmen AI Specialist</h3>
                            <div class="status-indicator">
                                <span class="dot"></span> คลังความรู้ AI พร้อมบริการ
                            </div>
                        </div>
                    </div>
                    
                    <div class="header-tools">
                        <div class="icon-btn" id="carmen-expand-btn" title="ขยายหน้าจอ">⛶</div>
                        ${t?`<div class="icon-btn" id="carmen-clear-btn" title="ล้างแชท">${v.clear}</div>`:""}
                        <div class="icon-btn" id="carmen-close-btn" title="ปิด">${v.close}</div>
                    </div>
                </div>

                <div class="chat-body" id="carmenChatBody">
                    </div>

                <div id="carmenImagePreview" class="image-preview-container" style="display:none;">
                    <div class="preview-box">
                        <img id="preview-img-element" src="" />
                    </div>
                    <button id="clear-image-btn" type="button" title="ลบรูป">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                    </button>
                </div>

                <div class="chat-footer">
                    ${e?`
                        <input type="file" id="carmen-file-input" accept="image/*" style="display: none;">
                        <button class="icon-btn-footer" id="carmen-attach-btn" title="แนบรูป">${v.clip}</button>
                    `:""}
                    <textarea id="carmenUserInput" class="chat-input" rows="1" placeholder="พิมพ์ข้อความที่นี่..."></textarea>
                    <button class="send-btn" id="carmen-send-btn" title="ส่งข้อความ">${v.send}</button>
                </div>
            </div>
        </div>
    `}function z(){return`
        <div class="tooltip-avatar">
            ${v.botAvatar}
        </div>
        <div class="tooltip-content">
            <span class="tooltip-greet">ผู้ช่วย AI พร้อมให้คำแนะนำ</span>
            <span class="tooltip-text">สอบถามข้อมูลคู่มือหรือการใช้งานได้ทันที!</span>
        </div>
        <div class="tooltip-close" id="carmen-tooltip-close">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </div>
    `}function L(h,t,e){return h!=="bot"?"":`
        <div class="tools-container">
            <button class="copy-btn" title="คัดลอกข้อมูล">
                ${v.copy}
            </button>
            ${t?`
                <div class="separator"></div>
                <div class="feedback-group">
                    <button class="feedback-btn" onclick="window.carmenRate('${t}', 1, this)" title="มีประโยชน์">${v.thumbsUp}</button>
                    <button class="feedback-btn" onclick="window.carmenRate('${t}', -1, this)" title="ไม่ถูกต้อง">${v.thumbsDown}</button>
                </div>
            `:""}
        </div>
    `}const F=Object.freeze(Object.defineProperty({__proto__:null,createMessageExtras:L,createRoomItemHTML:M,createTooltipHTML:z,createTypingIndicatorHTML:B,createWidgetHTML:I},Symbol.toStringTag,{value:"Module"}));function R(h){if(!h)return null;try{const t=/^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/,e=h.match(t);return e&&e[7]&&e[7].trim()?e[7].trim():null}catch{return null}}function H(h,t){if(!h)return"";let e=String(h);const i=t?t.replace(/\/$/,""):"",r=/\[(.*?)\]\((https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.be)[^\s<)"']+)\)/g;e=e.replace(r,(c,o,p)=>{const b=R(p);return b?`
                <div class="video-container carmen-processed-video">
                    <div class="video-ratio-box">
                        <iframe src="https://www.youtube.com/embed/${b}" 
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                                allowfullscreen>
                        </iframe>
                    </div>
                </div>
            `:c});const s=/(https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.be)[^\s<)"']+)/g;e=e.replace(s,(c,o,p,b)=>{const x=b.substring(Math.max(0,p-10),p);if(/src=['"]$|href=['"]$|\($/.test(x))return c;const l=R(c);return l?`
                <div class="video-container carmen-processed-video">
                    <div class="video-ratio-box">
                        <iframe src="https://www.youtube.com/embed/${l}" 
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                                allowfullscreen>
                        </iframe>
                    </div>
                </div>
            `:c});const n=c=>{let o=c.trim();if(o.includes("youtube.com")||o.includes("youtu.be")||o.startsWith("data:"))return o;if(/^(http|https):/.test(o)){if(!(o.includes("127.0.0.1")||o.includes("localhost")||i&&o.startsWith(i))){const b=o.split("/").pop().split("?")[0];return`${i}/images/${b}`}if(!o.includes("/images/")){const b=o.split("/").pop();return`${i}/images/${b}`}return o}return`${i}/images/${o.split("/").pop()}`};e=e.replace(/!\[(.*?)\]\((.*?)\)/g,(c,o,p)=>{if(p.includes("youtube.com")||p.includes("youtu.be"))return c;const b=n(p);return`<br><a href="${b}" target="_blank"><img src="${b}" alt="${o}" class="carmen-processed-img"></a><br>`}),e=e.replace(/<img\s+[^>]*src=["']([^"']+)["'][^>]*>/gi,(c,o)=>{if(c.includes("carmen-processed-img")||o.includes("youtube"))return c;const p=n(o);return`<br><a href="${p}" target="_blank"><img src="${p}" class="carmen-processed-img"></a><br>`}),e=e.replace(s,(c,o,p,b)=>{const x=b.substring(Math.max(0,p-10),p);return/src=['"]$|href=['"]$|>$/.test(x)?c:`<a href="${c}" target="_blank" style="color:#2563eb; text-decoration:underline;">${c}</a>`}),e=e.replace(/(?:^|[\s>])(?:ดูรูป\s*)?`?([\w\-]+\.(?:png|jpg|jpeg|gif|svg|webp))`?/gi,(c,o)=>{const p=`${i}/images/${o}`;return`<br><a href="${p}" target="_blank"><img src="${p}" alt="${o}" class="carmen-processed-img"></a><br>`});const m=e.split(`
`);let a=[],u=!1,d=!1;for(let c of m){let o=c.trim();if(/^---+$/.test(o)){u&&(a.push("</ul>"),u=!1),d&&(a.push("</ol>"),d=!1),a.push('<hr style="border:none; border-top:1px solid #e2e8f0; margin:12px 0;">');continue}if(/^### (.+)$/.test(o)){u&&(a.push("</ul>"),u=!1),d&&(a.push("</ol>"),d=!1),a.push(`<div style="font-weight:700; font-size:15px; margin:12px 0 6px 0;">${o.replace(/^### /,"")}</div>`);continue}if(/^## (.+)$/.test(o)){u&&(a.push("</ul>"),u=!1),d&&(a.push("</ol>"),d=!1),a.push(`<div style="font-weight:700; font-size:16px; margin:14px 0 6px 0;">${o.replace(/^## /,"")}</div>`);continue}if(/^[-*] (.+)$/.test(o)){d&&(a.push("</ol>"),d=!1),u||(a.push("<ul>"),u=!0),a.push(`<li>${o.replace(/^[-*] /,"")}</li>`);continue}if(/^\d+\.\s+(.+)$/.test(o)){u&&(a.push("</ul>"),u=!1),d||(a.push("<ol>"),d=!0),a.push(`<li>${o.replace(/^\d+\.\s+/,"")}</li>`);continue}u&&(a.push("</ul>"),u=!1),d&&(a.push("</ol>"),d=!1),o===""?a.length>0&&a[a.length-1]!=="<br>"&&a.push("<br>"):a.push(o+"<br>")}return u&&a.push("</ul>"),d&&a.push("</ol>"),e=a.join(""),e=e.replace(/(<br>){3,}/g,"<br><br>"),e=e.replace(/`([^`]+)`/g,'<code style="background:#f1f5f9; padding:2px 6px; border-radius:4px; font-size:13px;">$1</code>'),e=e.replace(/\*\*(.*?)\*\*/g,"<b>$1</b>"),e=e.replace(new RegExp("(?<!\\*)\\*([^*]+)\\*(?!\\*)","g"),"<i>$1</i>"),e}const A={theme:"#34558b",title:"Carmen AI Specialist"},U=["กดปุ่ม refresh ใน workbook ไม่ได้ ทำยังไง","บันทึกใบกำกับภาษีซื้อ ใน excel แล้ว import ได้หรือไม่","program carmen สามารถ upload file เข้า program RDPrep ของสรรพากรได้ หรือไม่","ฉันสามารถสร้าง ใบเสร็จรับเงิน โดยไม่เลือก Tax Invoice ได้หรือไม่","ฉันสามารถบันทึก JV โดยที่ debit และ credit ไม่เท่ากันได้หรือไม่"],y={error_missing_config:"❌ CarmenBot Error: กรุณาระบุ 'bu', 'user' และ 'apiBase' ใน Config ด้วยครับ (Required)",welcome_title:"สวัสดีค่ะ Carmen พร้อมช่วย!",welcome_desc:"สอบถามข้อมูลจากคู่มือบริษัท หรือเริ่มบทสนทนาใหม่ได้ทันทีด้านล่างนี้ค่ะ",history_loading:"⏳ กำลังโหลด...",history_empty:"ยังไม่มีประวัติการแชท",alert_confirm:"ตกลง",alert_cancel:"ยกเลิก",delete_room_confirm_title:"ยืนยันลบห้องแชท?",delete_room_confirm_desc:"บทสนทนาที่เลือกจะถูกลบถาวร และไม่สามารถกู้คืนได้",clear_history_confirm_title:"ล้างประวัติห้องนี้?",clear_history_confirm_desc:"ข้อความในห้องนี้จะถูกลบทั้งหมด",file_too_large:"ไฟล์ใหญ่เกินไป",file_too_large_desc:"ไม่เกิน 5MB ครับ"};class O{constructor(t){this.bot=t,this.theme=t.theme,this.title=t.title||"Carmen AI Specialist",this.shadow=null}findElement(t){if(!this.shadow)return document.getElementById(t)||document.querySelector(t);if(!t.includes(" ")&&!t.includes(".")&&!t.startsWith("#")){const e=this.shadow.getElementById(t);return e||this.shadow.querySelector(`#${t}`)}return this.shadow.querySelector(t)}injectStyles(){if(this.shadow&&this.shadow.getElementById("carmen-style"))return;const t=document.createElement("link");t.href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Sarabun:wght@300;400;500;600&display=swap",t.rel="stylesheet",document.head.appendChild(t);const e=document.createElement("style");e.id="carmen-style",e.innerText=j(this.theme),this.shadow?this.shadow.appendChild(e):document.head.appendChild(e)}createDOM(){if(document.getElementById("carmen-chat-widget"))return;const t=document.createElement("div");t.id="carmen-chat-widget",Object.assign(t.style,{position:"fixed",bottom:"32px",right:"32px",zIndex:"2000000",width:"0",height:"0",display:"block",pointerEvents:"none"}),document.body.appendChild(t),this.shadow=t.attachShadow({mode:"open"}),this.shadow.innerHTML=I({showClear:this.bot.showClearHistoryButton,showAttach:this.bot.showAttachFileButton}),this.injectStyles();const e=this.findElement(".title-wrapper h3");e&&(e.textContent=this.title)}showWelcomeMessage(){const t=this.findElement("carmenChatBody");if(!t)return;t.innerHTML="";const e=document.createElement("div");e.className="welcome-hero";const i=y.welcome_title;e.innerHTML=`
            <div class="hero-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                    <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                    <path d="M2 17l10 5 10-5"></path>
                    <path d="M2 12l10 5 10-5"></path>
                </svg>
            </div>
            <h2 id="welcome-typing-title"></h2>
            <p style="opacity: 0; transform: translateY(10px); transition: all 0.8s ease;" id="welcome-desc-text">${y.welcome_desc}</p>
        `,t.appendChild(e);const r=this.findElement("welcome-typing-title"),s=this.findElement("welcome-desc-text");let n=0;const m=()=>{n<i.length?(r.textContent+=i.charAt(n),n++,setTimeout(m,40)):s&&(s.style.opacity="1",s.style.transform="translateY(0)")};setTimeout(m,300),setTimeout(()=>this.addSuggestions(),1200)}showModal({title:t,text:e,icon:i="💡",confirmText:r=y.alert_confirm,cancelText:s=null,onConfirm:n=null}){const m=this.findElement("carmen-alert-overlay"),a=this.findElement("carmen-alert-icon"),u=this.findElement("carmen-alert-title"),d=this.findElement("carmen-alert-desc"),c=this.findElement("carmen-alert-actions");if(!m)return;if(a.textContent=i,u.textContent=t,d.innerHTML=e,c.innerHTML="",s){const p=document.createElement("button");p.className="btn-alert btn-cancel",p.textContent=s,p.onclick=()=>{m.style.display="none"},c.appendChild(p)}const o=document.createElement("button");o.className="btn-alert btn-confirm",o.textContent=r,o.onclick=()=>{m.style.display="none",n&&n()},c.appendChild(o),m.style.display="flex"}scrollToBottom(){const t=this.findElement("carmenChatBody");t&&(t.scrollTop=t.scrollHeight)}addMessage(t,e,i=null,r=null){const s=this.findElement("carmenChatBody");if(!s)return;const n=document.createElement("div");n.className=`msg ${e}`;const m=H(t||"",this.bot.apiBase),a=typeof L=="function"?L(e,i):"";n.innerHTML=m+a,s.appendChild(n),this.scrollToBottom(),e==="bot"&&this.bot.bindCopyEvent(n)}addStreamingMessage(){const t=this.findElement("carmenChatBody");if(!t)return{};const e=document.createElement("div");e.className="msg bot";const i=Date.now();return e.innerHTML=`
            <div class="typing-indicator" id="loading-${i}">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            </div>
            <span id="streaming-content-${i}" style="display:none;"></span>
        `,t.appendChild(e),this.scrollToBottom(),{container:e,loader:e.querySelector(`#loading-${i}`),span:e.querySelector(`#streaming-content-${i}`)}}addSuggestions(t){this.shadow&&this.shadow.querySelectorAll(".suggestions-container").forEach(s=>s.remove());const e=t||this.bot.suggestedQuestions;if(!e||e.length===0)return;const i=this.findElement("carmenChatBody"),r=document.createElement("div");r.className="suggestions-container",e.forEach((s,n)=>{const m=document.createElement("button");m.innerText=s,m.className="suggestion-chip",m.style.animationDelay=`${n*.1}s`,m.onclick=()=>{this.bot.sendMessage(s),r.remove()},r.appendChild(m)}),i.appendChild(r),this.scrollToBottom()}clearImageSelection(){this.bot.currentImageBase64=null;const t=this.findElement("carmen-file-input");t&&(t.value="");const e=this.findElement("carmenImagePreview");e&&(e.style.display="none")}renderRoomList(t,e){const i=this.findElement("carmenRoomList");i&&(t&&t.length>0?(i.innerHTML="",t.forEach(r=>{const s=r.room_id===e,n=document.createElement("div");n.innerHTML=M(r,s),i.appendChild(n.firstElementChild)})):i.innerHTML=`<div style="padding:20px; text-align:center; color:#64748b; font-size:13px;">${y.history_empty}</div>`)}showTooltip(){if(localStorage.getItem(`carmen_tooltip_seen_${this.bot.bu}`))return;const e=document.getElementById("carmen-chat-widget"),i=document.createElement("div");i.className="chat-tooltip",i.id="carmen-tooltip",i.innerHTML=z(),this.shadow?this.shadow.appendChild(i):e.appendChild(i),setTimeout(()=>i.classList.add("show"),2e3);const r=this.findElement("carmen-tooltip-close"),s=this.findElement("carmen-launcher"),n=()=>{i.classList.remove("show"),setTimeout(()=>i.remove(),500),localStorage.setItem(`carmen_tooltip_seen_${this.bot.bu}`,"true")};r&&(r.onclick=m=>{m.stopPropagation(),n()}),i&&(i.onclick=()=>{s&&s.click(),n()}),s&&s.addEventListener("click",n)}setupGlobalFunctions(){window.carmenRate=async(t,e,i)=>{const r=i.parentElement;r.innerHTML=e===1?'<span style="font-size:11px; color:#16a34a;">ขอบคุณค่ะ ❤️</span>':'<span style="font-size:11px; color:#991b1b;">ขอบคุณค่ะ 🙏</span>',await this.bot.api.sendFeedback(t,e)}}bindCopyEvent(t){const e=t.querySelector(".copy-btn");e&&(e.onclick=()=>{const i=t.querySelector(".msg-bubble span")||t.querySelector(".msg-bubble")||t,r=i.innerText||i.textContent;navigator.clipboard.writeText(r).then(()=>{const s=e.innerHTML;e.innerHTML=v.check,setTimeout(()=>{e.innerHTML=s},2e3)}).catch(s=>{console.error("Failed to copy text: ",s)})})}showLauncher(){const t=this.findElement("carmen-launcher");t&&(t.style.display="flex")}}class N{constructor(t){this.bot=t,this.api=t.api,this.roomKey=`carmen_room_${t.bu}_${t.username}`,this.typingBuffer="",this.isTyping=!1}async createNewChat(){this.bot.currentRoomId=null,localStorage.removeItem(this.roomKey),this.bot.ui.showWelcomeMessage(),await this.loadRoomList()}async switchRoom(t){this.bot.currentRoomId!==t&&(this.bot.currentRoomId=t,localStorage.setItem(this.roomKey,t),await this.loadHistory(t),await this.loadRoomList())}async deleteChatRoom(t){this.bot.ui.showModal({icon:"🗑️",title:y.delete_room_confirm_title,text:y.delete_room_confirm_desc,confirmText:"ลบทิ้ง",cancelText:y.alert_cancel,onConfirm:async()=>{try{await this.api.deleteRoom(t),this.bot.currentRoomId===t?this.createNewChat():await this.loadRoomList()}catch(e){console.error("Delete Error:",e)}}})}async loadRoomList(){try{const t=await this.api.getRooms(this.bot.bu,this.bot.username);this.bot.ui.renderRoomList(t,this.bot.currentRoomId)}catch(t){console.error("Room List Error:",t)}}async loadHistory(t){const e=this.bot.ui.findElement("carmenChatBody");if(e){e.children.length===0&&(e.innerHTML=`<div style="text-align:center; padding:20px; color:#94a3b8;">${y.history_loading}</div>`);try{const i=await this.api.getRoomHistory(t);e.innerHTML="",i.messages&&i.messages.length>0?(i.messages.forEach(r=>{this.bot.ui.addMessage(r.message,r.sender,r.id,r.sources)}),setTimeout(()=>this.bot.ui.scrollToBottom(),100)):this.bot.ui.showWelcomeMessage()}catch(i){console.warn("History Load Error:",i),this.createNewChat()}}}async sendMessage(t=null){const e=this.bot.ui.findElement("carmenUserInput"),i=t||e.value.trim();if(!i&&!this.bot.currentImageBase64)return;if(!this.bot.currentRoomId)try{const o=i.substring(0,30)+(i.length>30?"...":""),p=await this.api.createRoom(this.bot.bu,this.bot.username,o);this.bot.currentRoomId=p.room_id,localStorage.setItem(this.roomKey,this.bot.currentRoomId),await this.loadRoomList()}catch{this.bot.ui.addMessage("⚠️ สร้างห้องสนทนาไม่สำเร็จ","bot");return}let r=i;this.bot.currentImageBase64&&(r=`<img src="${this.bot.currentImageBase64}" style="max-width:100%; border-radius:8px; margin-bottom:5px;"><br>${i}`),this.bot.ui.addMessage(r,"user"),e.value="";const s=this.bot.currentImageBase64;this.bot.ui.clearImageSelection(),this.bot.ui.shadow&&this.bot.ui.shadow.querySelectorAll(".suggestions-container").forEach(o=>o.remove());const n=this.bot.ui.addStreamingMessage();n.loader&&(n.loader.style.display="none");const m=B(),a=document.createElement("div");a.innerHTML=m;const u=a.firstElementChild;n.container.appendChild(u),this.bot.ui.scrollToBottom();let d=null,c=null;try{const p=(await fetch(`${this.bot.apiBase}/api/chat/stream`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({text:i,image:s,bu:this.bot.bu,username:this.bot.username,room_id:this.bot.currentRoomId,prompt_extend:this.bot.prompt_extend})})).body.getReader(),b=new TextDecoder("utf-8");this.typingBuffer="";let x="",l=!0;const f=()=>{if(this.typingBuffer.length>0){l&&(u&&u.remove(),n.span&&(n.span.style.display="block"),l=!1);const g=this.typingBuffer.length>50?5:this.typingBuffer.length>10?2:1;x+=this.typingBuffer.substring(0,g),this.typingBuffer=this.typingBuffer.substring(g),n.span&&(n.span.innerHTML=H(x,this.bot.apiBase),this.bot.ui.scrollToBottom())}(this.isTyping||this.typingBuffer.length>0)&&requestAnimationFrame(()=>setTimeout(f,15))};for(this.isTyping=!0,f();;){const{done:g,value:w}=await p.read();if(g)break;const $=b.decode(w,{stream:!0}).split(`
`);for(const E of $)if(E.trim())try{const k=JSON.parse(E);k.type==="chunk"?this.typingBuffer+=k.data:k.type==="sources"?d=k.data:k.type==="done"&&(c=k.id,this.loadRoomList())}catch{}}if(this.isTyping=!1,n.loader&&n.loader.remove(),c&&n.container){const{createMessageExtras:g}=await Promise.resolve().then(()=>F),w=g("bot",c,d);n.container.insertAdjacentHTML("beforeend",w),this.bot.bindCopyEvent(n.container)}}catch(o){console.error("Stream Error:",o)}}}class P{constructor(t){this.bot=t,this.closeTimeout=null}attach(){const t=this.bot.ui.findElement("carmenChatWindow"),e=this.bot.ui.findElement("carmen-launcher"),i=this.bot.ui.findElement("carmen-close-btn"),r=this.bot.ui.findElement("carmen-expand-btn"),s=this.bot.ui.findElement("new-chat-btn"),n=this.bot.ui.findElement("carmenRoomList"),m=this.bot.ui.findElement("carmen-menu-btn"),a=this.bot.ui.findElement("carmenSidebar"),u=this.bot.ui.findElement(".chat-header"),d=()=>{t.classList.contains("closing")||(t.classList.add("closing"),a&&a.classList.remove("sidebar-visible"),localStorage.setItem(`carmen_open_${this.bot.bu}`,"false"),localStorage.setItem(`carmen_expanded_${this.bot.bu}`,"false"),this.closeTimeout=setTimeout(()=>{t.classList.remove("open","expanded","closing"),this.closeTimeout=null},800))};if(e&&(e.onclick=()=>{const l=t.classList.contains("open"),f=t.classList.contains("closing");l&&!f?d():(this.closeTimeout&&(clearTimeout(this.closeTimeout),this.closeTimeout=null),t.classList.remove("closing"),t.classList.add("open"),localStorage.setItem(`carmen_open_${this.bot.bu}`,"true"),a&&a.classList.remove("sidebar-visible"),setTimeout(()=>this.bot.ui.scrollToBottom(),100))}),u&&t){const l=localStorage.getItem(`carmen_chat_pos_${this.bot.bu}`);if(l)try{const f=JSON.parse(l);t.style.bottom=f.bottom,t.style.right=f.right}catch{}this._setupDraggable(u,t)}i&&(i.onclick=d),r&&(r.onclick=()=>{const l=!t.classList.contains("expanded");if(t.classList.add("resizing"),t.classList.toggle("expanded"),localStorage.setItem(`carmen_expanded_${this.bot.bu}`,l?"true":"false"),l)t.style.bottom="",t.style.right="";else{const f=localStorage.getItem(`carmen_chat_pos_${this.bot.bu}`);if(f)try{const g=JSON.parse(f);t.style.bottom=g.bottom,t.style.right=g.right}catch{}}!l&&a&&a.classList.remove("sidebar-visible"),setTimeout(()=>{t.classList.remove("resizing"),this.bot.ui.scrollToBottom()},600)}),s&&(s.onclick=()=>this.bot.chat.createNewChat()),n&&(n.onclick=async l=>{const f=l.target.closest(".delete-room-btn"),g=l.target.closest(".room-item");if(f){l.stopPropagation();const w=f.getAttribute("data-id");this.bot.chat.deleteChatRoom(w);return}if(g){const w=g.getAttribute("data-id");this.bot.chat.switchRoom(w)}}),m&&a&&(m.onclick=()=>a.classList.toggle("sidebar-visible"));const c=this.bot.ui.findElement("carmen-clear-btn");c&&(c.onclick=()=>{this.bot.currentRoomId&&this.bot.ui.showModal({icon:"🗑️",title:y.clear_history_confirm_title,text:y.clear_history_confirm_desc,confirmText:"ลบเลย",cancelText:y.alert_cancel,onConfirm:async()=>{await this.bot.api.clearHistory(this.bot.bu,this.bot.username,this.bot.currentRoomId),await this.bot.chat.loadHistory(this.bot.currentRoomId)}})});const o=this.bot.ui.findElement("carmen-attach-btn");if(o){const l=this.bot.ui.findElement("carmen-file-input");o.onclick=()=>l.click(),l.onchange=f=>{const g=f.target.files[0];if(!g)return;if(g.size>5*1024*1024){this.bot.ui.showModal({icon:"⚠️",title:y.file_too_large,text:y.file_too_large_desc}),l.value="";return}const w=new FileReader;w.onload=S=>{this.bot.currentImageBase64=S.target.result;const $=this.bot.ui.findElement("carmenImagePreview"),E=this.bot.ui.findElement("preview-img-element");$&&E&&(E.src=this.bot.currentImageBase64,$.style.display="flex")},w.readAsDataURL(g)}}const p=this.bot.ui.findElement("clear-image-btn");p&&(p.onclick=()=>this.bot.ui.clearImageSelection());const b=this.bot.ui.findElement("carmen-send-btn"),x=this.bot.ui.findElement("carmenUserInput");b&&(b.onclick=()=>{this.bot.chat.sendMessage(),x&&(x.style.height="auto")}),x&&(x.addEventListener("input",function(){this.style.height="auto",this.style.height=this.scrollHeight+"px"}),x.addEventListener("keydown",l=>{l.key==="Enter"&&!l.shiftKey&&(l.preventDefault(),this.bot.chat.sendMessage(),x.style.height="auto")}))}_setupDraggable(t,e){let i=0,r=0,s=0,n=0,m=!1,a=null;const u=o=>{if(e.classList.contains("expanded"))return;const p=o.type.startsWith("touch")?o.touches[0]:o;i=p.clientX,r=p.clientY;const b=window.getComputedStyle(e);s=parseInt(b.bottom)||84,n=parseInt(b.right)||0,window.addEventListener("mousemove",d,{passive:!1}),window.addEventListener("mouseup",c),window.addEventListener("touchmove",d,{passive:!1}),window.addEventListener("touchend",c),m=!1,e.style.transition="none",document.body.style.userSelect="none",document.body.style.webkitUserSelect="none"},d=o=>{const p=o.type.startsWith("touch")?o.touches[0]:o,b=p.clientX,x=p.clientY;!m&&Math.abs(b-i)<5&&Math.abs(x-r)<5||(m||(m=!0,e.style.top="auto",e.style.left="auto"),o.cancelable&&o.preventDefault(),a&&cancelAnimationFrame(a),a=requestAnimationFrame(()=>{const l=i-b,f=r-x,g=s+f,w=n+l,S=e.getBoundingClientRect(),$=-22,E=window.innerHeight-S.height-42,k=-22,D=window.innerWidth-S.width-42;e.style.bottom=Math.min(Math.max($,g),E)+"px",e.style.right=Math.min(Math.max(k,w),D)+"px"}))},c=()=>{window.removeEventListener("mousemove",d),window.removeEventListener("mouseup",c),window.removeEventListener("touchmove",d),window.removeEventListener("touchend",c),a&&cancelAnimationFrame(a),e.style.transition="",document.body.style.userSelect="",document.body.style.webkitUserSelect="",m&&localStorage.setItem(`carmen_chat_pos_${this.bot.bu}`,JSON.stringify({bottom:e.style.bottom,right:e.style.right}))};t.addEventListener("mousedown",u),t.addEventListener("touchstart",u,{passive:!0}),t.style.cursor="move"}}class C{constructor(t={}){if(Object.keys(t).length===0&&(t=this._getConfigFromScript()),!t.bu||!t.user||!t.apiBase){console.error(y.error_missing_config),t.isCustomElement||alert(y.error_missing_config);return}this.apiBase=t.apiBase.replace(/\/$/,""),this.bu=t.bu,this.username=t.user,this.theme=t.theme||A.theme,this.title=t.title||A.title,this.prompt_extend=t.prompt_extend||null,this.showClearHistoryButton=t.showClearHistoryButton!==!1,this.showAttachFileButton=t.showAttachFileButton!==!1,this.suggestedQuestions=U,this.currentImageBase64=null,this.currentRoomId=localStorage.getItem(`carmen_room_${this.bu}_${this.username}`),this.api=new T(this.apiBase),this.ui=new O(this),this.chat=new N(this),this.events=new P(this),this.init()}_getConfigFromScript(){const t=document.currentScript||document.querySelector('script[src*="carmen-widget.js"]');return t?{bu:t.getAttribute("data-bu"),user:t.getAttribute("data-user"),apiBase:t.getAttribute("data-api-base"),theme:t.getAttribute("data-theme"),title:t.getAttribute("data-title"),prompt_extend:t.getAttribute("data-prompt-extend")}:{}}async init(){this.ui.injectStyles(),this.ui.createDOM(),this.ui.setupGlobalFunctions(),this.events.attach(),this.ui.showLauncher(),await this.chat.loadRoomList(),this.currentRoomId?await this.chat.loadHistory(this.currentRoomId):this.ui.showWelcomeMessage(),this.ui.showTooltip(),this._restoreUIState()}_restoreUIState(){const t=localStorage.getItem(`carmen_open_${this.bu}`)==="true",e=localStorage.getItem(`carmen_expanded_${this.bu}`)==="true";if(t){const i=this.ui.findElement("carmenChatWindow");i&&i.classList.add("open")}if(e){const i=this.ui.findElement("carmenChatWindow");if(i){i.classList.add("expanded");const r=this.ui.findElement("carmenSidebar");r&&r.classList.add("sidebar-visible")}}}sendMessage(t){return this.chat.sendMessage(t)}bindCopyEvent(t){this.ui.bindCopyEvent(t)}}if(window.CarmenBot=C,"customElements"in window){class h extends HTMLElement{connectedCallback(){const e=this.getAttribute("bu"),i=this.getAttribute("user"),r=this.getAttribute("api-base");e&&i&&r&&new C({bu:e,user:i,apiBase:r,theme:this.getAttribute("theme"),title:this.getAttribute("title"),isCustomElement:!0})}}customElements.define("carmen-chatbot",h)}document.currentScript&&document.currentScript.hasAttribute("data-bu")&&new C,_.CarmenBot=C,Object.defineProperty(_,Symbol.toStringTag,{value:"Module"})}));
