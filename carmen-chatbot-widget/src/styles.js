/* src/styles.js */

export function getCssStyles(themeColor = '#34558b') {
    return `
    :host {
        display: block !important;
        position: fixed !important; 
        bottom: 32px !important; 
        right: 32px !important; 
        z-index: 2000000 !important;
        width: 0 !important; height: 0 !important;
        background: transparent !important;
        pointer-events: none !important; /* Allow clicking through host except where children are */
        --primary-color: ${themeColor};
        --primary-gradient: linear-gradient(135deg, ${themeColor} 0%, ${themeColor} 110%);
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
    `;
}
