import { getCssStyles } from './styles.js';
import { createWidgetHTML, createTooltipHTML, createMessageExtras, createRoomItemHTML } from './dom.js';
import { formatMessageContent } from './utils.js';
import { STRINGS } from './constants.js';
import { ICONS } from './assets/icons.js';

export class UIManager {
    constructor(bot) {
        this.bot = bot;
        this.theme = bot.theme;
        this.title = bot.title || 'Carmen AI Specialist';
        this.shadow = null;
    }

    findElement(selector) {
        if (!this.shadow) return document.getElementById(selector) || document.querySelector(selector);

        // If it's a simple ID (no spaces, no dots, no hashes at start)
        if (!selector.includes(' ') && !selector.includes('.') && !selector.startsWith('#')) {
            const el = this.shadow.getElementById(selector);
            if (el) return el;
            return this.shadow.querySelector(`#${selector}`);
        }

        return this.shadow.querySelector(selector);
    }

    injectStyles() {
        if (this.shadow && this.shadow.getElementById('carmen-style')) return;

        const fontLink = document.createElement('link');
        fontLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Sarabun:wght@300;400;500;600&display=swap';
        fontLink.rel = 'stylesheet';
        document.head.appendChild(fontLink);

        const styleSheet = document.createElement("style");
        styleSheet.id = 'carmen-style';
        styleSheet.innerText = getCssStyles(this.theme);

        if (this.shadow) {
            this.shadow.appendChild(styleSheet);
        } else {
            document.head.appendChild(styleSheet);
        }
    }

    createDOM() {
        if (document.getElementById('carmen-chat-widget')) return;

        const container = document.createElement('div');
        container.id = 'carmen-chat-widget';

        // Host styles applied via JS for maximum robustness
        Object.assign(container.style, {
            position: 'fixed',
            bottom: '32px',
            right: '32px',
            zIndex: '2000000',
            width: '0',
            height: '0',
            display: 'block',
            pointerEvents: 'none'
        });

        document.body.appendChild(container);

        // Attach Shadow DOM
        this.shadow = container.attachShadow({ mode: 'open' });

        // Set HTML first
        this.shadow.innerHTML = createWidgetHTML({
            showClear: this.bot.showClearHistoryButton,
            showAttach: this.bot.showAttachFileButton
        });

        // Then inject styles (appends <style> to shadow root)
        this.injectStyles();

        // Update Title if custom
        const titleEl = this.findElement('.title-wrapper h3');
        if (titleEl) titleEl.textContent = this.title;
    }

    showWelcomeMessage() {
        const body = this.findElement('carmenChatBody');
        if (!body) return;
        body.innerHTML = '';

        const hero = document.createElement('div');
        hero.className = 'welcome-hero';

        const titleText = STRINGS.welcome_title || "Carmen AI Specialist";

        hero.innerHTML = `
            <div class="hero-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                    <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                    <path d="M2 17l10 5 10-5"></path>
                    <path d="M2 12l10 5 10-5"></path>
                </svg>
            </div>
            <h2 id="welcome-typing-title"></h2>
            <p style="opacity: 0; transform: translateY(10px); transition: all 0.8s ease;" id="welcome-desc-text">${STRINGS.welcome_desc}</p>
        `;
        body.appendChild(hero);

        // Typing Effect for Title
        const titleEl = this.findElement('welcome-typing-title');
        const descEl = this.findElement('welcome-desc-text');
        let i = 0;

        const typeTitle = () => {
            if (i < titleText.length) {
                titleEl.textContent += titleText.charAt(i);
                i++;
                setTimeout(typeTitle, 40);
            } else {
                // Show description after title is done
                if (descEl) {
                    descEl.style.opacity = "1";
                    descEl.style.transform = "translateY(0)";
                }
            }
        };

        setTimeout(typeTitle, 300);
        setTimeout(() => this.addSuggestions(), 1200);
    }

    showModal({ title, text, icon = '💡', confirmText = STRINGS.alert_confirm, cancelText = null, onConfirm = null }) {
        const overlay = this.findElement('carmen-alert-overlay');
        const iconEl = this.findElement('carmen-alert-icon');
        const titleEl = this.findElement('carmen-alert-title');
        const descEl = this.findElement('carmen-alert-desc');
        const actionsEl = this.findElement('carmen-alert-actions');

        if (!overlay) return;

        iconEl.textContent = icon;
        titleEl.textContent = title;
        descEl.innerHTML = text;
        actionsEl.innerHTML = '';

        if (cancelText) {
            const cancelBtn = document.createElement('button');
            cancelBtn.className = 'btn-alert btn-cancel';
            cancelBtn.textContent = cancelText;
            cancelBtn.onclick = () => { overlay.style.display = 'none'; };
            actionsEl.appendChild(cancelBtn);
        }

        const confirmBtn = document.createElement('button');
        confirmBtn.className = 'btn-alert btn-confirm';
        confirmBtn.textContent = confirmText;
        confirmBtn.onclick = () => {
            overlay.style.display = 'none';
            if (onConfirm) onConfirm();
        };
        actionsEl.appendChild(confirmBtn);
        overlay.style.display = 'flex';
    }

    scrollToBottom() {
        const body = this.findElement('carmenChatBody');
        if (body) body.scrollTop = body.scrollHeight;
    }

    addMessage(text, sender, msgId = null, sources = null) {
        const body = this.findElement('carmenChatBody');
        if (!body) return;
        const div = document.createElement('div');
        div.className = `msg ${sender}`;

        const formattedText = formatMessageContent(text || "", this.bot.apiBase);
        const extrasHTML = (typeof createMessageExtras === 'function') ? createMessageExtras(sender, msgId, sources) : "";

        div.innerHTML = formattedText + extrasHTML;
        body.appendChild(div);
        this.scrollToBottom();

        if (sender === 'bot') {
            this.bot.bindCopyEvent(div);
        }
    }

    addStreamingMessage() {
        const body = this.findElement('carmenChatBody');
        if (!body) return {};
        const div = document.createElement('div');
        div.className = 'msg bot';
        const ts = Date.now();

        div.innerHTML = `
            <div class="typing-indicator" id="loading-${ts}">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            </div>
            <span id="streaming-content-${ts}" style="display:none;"></span>
        `;

        body.appendChild(div);
        this.scrollToBottom();

        return {
            container: div,
            loader: div.querySelector(`#loading-${ts}`),
            span: div.querySelector(`#streaming-content-${ts}`)
        };
    }

    addSuggestions(suggestions) {
        if (this.shadow) this.shadow.querySelectorAll('.suggestions-container').forEach(el => el.remove());
        const items = suggestions || this.bot.suggestedQuestions;
        if (!items || items.length === 0) return;

        const body = this.findElement('carmenChatBody');
        const div = document.createElement('div');
        div.className = 'suggestions-container';

        items.forEach((text, index) => {
            const btn = document.createElement('button');
            btn.innerText = text;
            btn.className = 'suggestion-chip';
            btn.style.animationDelay = `${index * 0.1}s`;
            btn.onclick = () => {
                this.bot.sendMessage(text);
                div.remove();
            };
            div.appendChild(btn);
        });
        body.appendChild(div);
        this.scrollToBottom();
    }

    clearImageSelection() {
        this.bot.currentImageBase64 = null;
        const fileInput = this.findElement('carmen-file-input');
        if (fileInput) fileInput.value = '';
        const preview = this.findElement('carmenImagePreview');
        if (preview) preview.style.display = 'none';
    }

    renderRoomList(rooms, currentRoomId) {
        const container = this.findElement('carmenRoomList');
        if (!container) return;

        if (rooms && rooms.length > 0) {
            container.innerHTML = '';
            rooms.forEach(room => {
                const isActive = room.room_id === currentRoomId;
                const div = document.createElement('div');
                div.innerHTML = createRoomItemHTML(room, isActive);
                container.appendChild(div.firstElementChild);
            });
        } else {
            container.innerHTML = `<div style="padding:20px; text-align:center; color:#64748b; font-size:13px;">${STRINGS.history_empty}</div>`;
        }
    }

    showTooltip() {
        const hasSeenTooltip = localStorage.getItem(`carmen_tooltip_seen_${this.bot.bu}`);
        if (hasSeenTooltip) return;
        const container = document.getElementById('carmen-chat-widget');
        const tooltip = document.createElement('div');
        tooltip.className = 'chat-tooltip';
        tooltip.id = 'carmen-tooltip';
        tooltip.innerHTML = createTooltipHTML();
        if (this.shadow) {
            this.shadow.appendChild(tooltip);
        } else {
            container.appendChild(tooltip);
        }
        setTimeout(() => tooltip.classList.add('show'), 2000);

        const closeBtn = this.findElement('carmen-tooltip-close');
        const launcher = this.findElement('carmen-launcher');
        const closeTooltip = () => {
            tooltip.classList.remove('show');
            setTimeout(() => tooltip.remove(), 500);
            localStorage.setItem(`carmen_tooltip_seen_${this.bot.bu}`, 'true');
        };
        if (closeBtn) closeBtn.onclick = (e) => { e.stopPropagation(); closeTooltip(); };
        if (tooltip) tooltip.onclick = () => { if (launcher) launcher.click(); closeTooltip(); };
        if (launcher) launcher.addEventListener('click', closeTooltip);
    }

    setupGlobalFunctions() {
        window.carmenRate = async (msgId, score, btnElement) => {
            const parent = btnElement.parentElement;
            parent.innerHTML = score === 1
                ? '<span style="font-size:11px; color:#16a34a;">ขอบคุณค่ะ ❤️</span>'
                : '<span style="font-size:11px; color:#991b1b;">ขอบคุณค่ะ 🙏</span>';
            await this.bot.api.sendFeedback(msgId, score);
        };
    }

    bindCopyEvent(container) {
        const copyBtn = container.querySelector('.copy-btn');
        if (!copyBtn) return;

        copyBtn.onclick = () => {
            const content = container.querySelector('.msg-bubble span') || container.querySelector('.msg-bubble') || container;
            const textToCopy = content.innerText || content.textContent;

            navigator.clipboard.writeText(textToCopy).then(() => {
                const originalHTML = copyBtn.innerHTML;
                copyBtn.innerHTML = ICONS.check || '✅';
                setTimeout(() => {
                    copyBtn.innerHTML = originalHTML;
                }, 2000);
            }).catch(err => {
                console.error('Failed to copy text: ', err);
            });
        };
    }

    showLauncher() {
        const btn = this.findElement('carmen-launcher');
        if (btn) btn.style.display = 'flex';
    }
}
