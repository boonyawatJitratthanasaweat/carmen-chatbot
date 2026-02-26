import { ChatService } from './api.js';
import { UIManager } from './ui-manager.js';
import { ChatManager } from './chat-manager.js';
import { EventManager } from './event-manager.js';
import { DEFAULT_CONFIG, SUGGESTED_QUESTIONS, STRINGS } from './constants.js';

export class CarmenBot {
    constructor(config = {}) {
        // Support for auto-config from script tag if no config provided
        if (Object.keys(config).length === 0) {
            config = this._getConfigFromScript();
        }

        // 1. Validation
        if (!config.bu || !config.user || !config.apiBase) {
            console.error(STRINGS.error_missing_config);
            // Only alert if we're not in a custom element context during boot
            if (!config.isCustomElement) alert(STRINGS.error_missing_config);
            return;
        }

        // 2. Configuration & State
        this.apiBase = config.apiBase.replace(/\/$/, "");
        this.bu = config.bu;
        this.username = config.user;
        this.theme = config.theme || DEFAULT_CONFIG.theme;
        this.title = config.title || DEFAULT_CONFIG.title;
        this.prompt_extend = config.prompt_extend || null;
        this.showClearHistoryButton = config.showClearHistoryButton !== false;
        this.showAttachFileButton = config.showAttachFileButton !== false;

        this.suggestedQuestions = SUGGESTED_QUESTIONS;
        this.currentImageBase64 = null;
        this.currentRoomId = localStorage.getItem(`carmen_room_${this.bu}_${this.username}`);

        // 3. Initialize Services & Managers
        this.api = new ChatService(this.apiBase);
        this.ui = new UIManager(this);
        this.chat = new ChatManager(this);
        this.events = new EventManager(this);

        // Start
        this.init();
    }

    _getConfigFromScript() {
        const script = document.currentScript || document.querySelector('script[src*="carmen-widget.js"]');
        if (!script) return {};
        return {
            bu: script.getAttribute('data-bu'),
            user: script.getAttribute('data-user'),
            apiBase: script.getAttribute('data-api-base'),
            theme: script.getAttribute('data-theme'),
            title: script.getAttribute('data-title'),
            prompt_extend: script.getAttribute('data-prompt-extend')
        };
    }

    async init() {
        this.ui.injectStyles();
        this.ui.createDOM();
        this.ui.setupGlobalFunctions();
        this.events.attach();
        this.ui.showLauncher();

        await this.chat.loadRoomList();

        if (this.currentRoomId) {
            await this.chat.loadHistory(this.currentRoomId);
        } else {
            this.ui.showWelcomeMessage();
        }

        this.ui.showTooltip();

        // Restore Persisted UI State
        this._restoreUIState();
    }

    _restoreUIState() {
        const isOpen = localStorage.getItem(`carmen_open_${this.bu}`) === 'true';
        const isExpanded = localStorage.getItem(`carmen_expanded_${this.bu}`) === 'true';

        if (isOpen) {
            const win = this.ui.findElement('carmenChatWindow');
            if (win) win.classList.add('open');
        }

        if (isExpanded) {
            const win = this.ui.findElement('carmenChatWindow');
            if (win) {
                win.classList.add('expanded');
                const sidebar = this.ui.findElement('carmenSidebar');
                if (sidebar) sidebar.classList.add('sidebar-visible');
            }
        }
    }

    // Facades for common actions if needed by external scripts
    sendMessage(text) {
        return this.chat.sendMessage(text);
    }

    // Helper exposed to managers
    bindCopyEvent(container) {
        this.ui.bindCopyEvent(container);
    }
}

// Global Export
window.CarmenBot = CarmenBot;

// Register Custom Element
if ('customElements' in window) {
    class CarmenChatbotElement extends HTMLElement {
        connectedCallback() {
            const bu = this.getAttribute('bu');
            const user = this.getAttribute('user');
            const apiBase = this.getAttribute('api-base');

            if (bu && user && apiBase) {
                new CarmenBot({
                    bu, user, apiBase,
                    theme: this.getAttribute('theme'),
                    title: this.getAttribute('title'),
                    isCustomElement: true
                });
            }
        }
    }
    customElements.define('carmen-chatbot', CarmenChatbotElement);
}

// Auto-init for standard script tag usage
if (document.currentScript && document.currentScript.hasAttribute('data-bu')) {
    new CarmenBot();
}