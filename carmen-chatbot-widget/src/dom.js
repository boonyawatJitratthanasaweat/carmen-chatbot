import { ICONS } from './assets/icons.js';

// 🆕 สร้าง HTML สำหรับรายการห้องใน Sidebar
export function createRoomItemHTML(room, isActive = false) {
    return `
        <div class="room-item ${isActive ? 'active' : ''}" data-id="${room.room_id}">
            <div class="room-title" title="${room.title || 'บทสนทนาใหม่'}">
                ${room.title || 'บทสนทนาใหม่'}
            </div>
            <button class="delete-room-btn" data-id="${room.room_id}" title="ลบห้อง">×</button>
        </div>
    `;
}

export function createTypingIndicatorHTML() {
    return `
        <div class="msg bot-msg typing-indicator-container">
            <div class="typing-dots">
                <span></span><span></span><span></span>
            </div>
        </div>
    `;
}

export function createWidgetHTML(options = { showClear: true, showAttach: true }) {
    const { showClear, showAttach } = options;

    return `
        <div class="chat-btn" id="carmen-launcher">${ICONS.launcher}</div>
        
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
                            ${ICONS.botAvatar}
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
                        ${showClear ? `<div class="icon-btn" id="carmen-clear-btn" title="ล้างแชท">${ICONS.clear}</div>` : ''}
                        <div class="icon-btn" id="carmen-close-btn" title="ปิด">${ICONS.close}</div>
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
                    ${showAttach ? `
                        <input type="file" id="carmen-file-input" accept="image/*" style="display: none;">
                        <button class="icon-btn-footer" id="carmen-attach-btn" title="แนบรูป">${ICONS.clip}</button>
                    ` : ''}
                    <textarea id="carmenUserInput" class="chat-input" rows="1" placeholder="พิมพ์ข้อความที่นี่..."></textarea>
                    <button class="send-btn" id="carmen-send-btn" title="ส่งข้อความ">${ICONS.send}</button>
                </div>
            </div>
        </div>
    `;
}

export function createTooltipHTML() {
    return `
        <div class="tooltip-avatar">
            ${ICONS.botAvatar}
        </div>
        <div class="tooltip-content">
            <span class="tooltip-greet">ผู้ช่วย AI พร้อมให้คำแนะนำ</span>
            <span class="tooltip-text">สอบถามข้อมูลคู่มือหรือการใช้งานได้ทันที!</span>
        </div>
        <div class="tooltip-close" id="carmen-tooltip-close">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </div>
    `;
}

export function createMessageExtras(sender, msgId, sources) {
    if (sender !== 'bot') return '';

    return `
        <div class="tools-container">
            <button class="copy-btn" title="คัดลอกข้อมูล">
                ${ICONS.copy}
            </button>
            ${msgId ? `
                <div class="separator"></div>
                <div class="feedback-group">
                    <button class="feedback-btn" onclick="window.carmenRate('${msgId}', 1, this)" title="มีประโยชน์">${ICONS.thumbsUp}</button>
                    <button class="feedback-btn" onclick="window.carmenRate('${msgId}', -1, this)" title="ไม่ถูกต้อง">${ICONS.thumbsDown}</button>
                </div>
            ` : ''}
        </div>
    `;
}