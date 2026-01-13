(function() {
    // ===============================================
    // ⚙️ ตั้งค่า Server
    // ===============================================
    // const BASE_URL = "https://carmen-chatbot-api.onrender.com"; // ☁️ สำหรับ Render
    const BASE_URL = ""; 

    const API_URL_CHAT = `${BASE_URL}/chat`; 
    const API_URL_HISTORY = `${BASE_URL}/chat/history`;
    // ===============================================

    // 💡 รายการคำถามแนะนำ
    const SUGGESTED_QUESTIONS = [
        "Voucher มีกี่ประเภทอะไรบ้าง",
        "ขั้นตอน Create Vendor มีอะไรบ้าง",
        "A/R คืออะไร",
        "Carmen Add-in ใช้ทำอะไร",
        "นโยบายการเงิน"
    ];

    let accessToken = "";
    let currentUser = "";
    
    // สร้าง Widget Container
    let container = document.getElementById('carmen-chat-widget');
    if (!container) {
        container = document.createElement('div');
        container.id = 'carmen-chat-widget';
        container.style.display = 'none'; 
        document.body.appendChild(container);
    }

    // 🎨 CSS Style (เขียนใหม่ แก้ Bug ทับกัน)
    const styles = `
      @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;600&display=swap');
      
      #carmen-chat-widget { 
          position: fixed; bottom: 20px; right: 20px; z-index: 99990; 
          font-family: 'Sarabun', sans-serif; 
      }
      
      /* ปุ่มเปิดแชท (กลมๆ มุมขวาล่าง) */
      .chat-btn { 
          width: 60px; height: 60px; 
          background: #2563eb; /* สีน้ำเงิน */
          border-radius: 50%; 
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4); 
          cursor: pointer; 
          display: flex; justify-content: center; align-items: center; 
          transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); 
      }
      .chat-btn:hover { transform: scale(1.1); background: #1e40af; }
      .chat-btn svg { width: 28px; height: 28px; fill: white; }

      /* หน้าต่างแชทหลัก */
      .chat-box { 
          position: absolute; bottom: 80px; right: 0; 
          width: 380px; height: 550px; max-height: 80vh; 
          background: #ffffff; 
          border-radius: 16px; 
          box-shadow: 0 5px 40px rgba(0,0,0,0.16); 
          display: none; flex-direction: column; overflow: hidden; 
          border: 1px solid #e5e7eb;
          animation: slideUp 0.3s ease;
      }
      .chat-box.open { display: flex; }
      @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

      /* ส่วนหัว (Header) */
      .chat-header { 
          background: #2563eb; 
          color: white; 
          padding: 16px; 
          display: flex; justify-content: space-between; align-items: center; 
          border-bottom: 1px solid #1e40af;
      }
      .chat-header h3 { margin: 0; font-size: 16px; font-weight: 600; }
      .chat-header span { font-size: 12px; opacity: 0.9; }
      .header-tools { display: flex; gap: 12px; }
      .icon-btn { cursor: pointer; opacity: 0.8; transition: 0.2s; }
      .icon-btn:hover { opacity: 1; transform: scale(1.1); }
      .icon-btn svg { width: 18px; height: 18px; fill: white; }

      /* พื้นที่แชท (Body) - จุดสำคัญที่แก้ Bug */
      .chat-body { 
          flex: 1; 
          padding: 16px; 
          overflow-y: auto; 
          background: #f8fafc; /* พื้นหลังสีเทาอ่อนมาก */
          display: flex; 
          flex-direction: column; /* เรียงแนวตั้ง */
          gap: 12px; /* ระยะห่างระหว่างข้อความ */
      }
      
      /* กล่องข้อความ (Common) */
      .msg { 
          max-width: 80%; 
          padding: 12px 16px; 
          font-size: 14px; 
          line-height: 1.5; 
          border-radius: 12px; 
          word-wrap: break-word; 
          position: relative; 
          box-shadow: 0 1px 2px rgba(0,0,0,0.05);
      }

      /* ข้อความ User (ขวา/สีน้ำเงิน) */
      .msg.user { 
          background: #2563eb; 
          color: white; 
          align-self: flex-end; /* ชิดขวา */
          border-radius: 12px 12px 2px 12px; 
      }
      
      /* ข้อความ Bot (ซ้าย/สีขาว) */
      .msg.bot { 
          background: white; 
          color: #334155; 
          align-self: flex-start; /* ชิดซ้าย */
          border-radius: 12px 12px 12px 2px; 
          border: 1px solid #e2e8f0; 
          padding-bottom: 32px; /* เผื่อที่ให้ปุ่ม Copy/Feedback */
      }

      /* Suggestion Chips (ปุ่มคำถามแนะนำ) */
      .suggestions-container { 
          display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; 
          animation: fadeIn 0.5s ease; align-self: flex-end; justify-content: flex-end;
      }
      .suggestion-chip {
          background: white; border: 1px solid #cbd5e1; border-radius: 20px;
          padding: 6px 12px; font-size: 12px; color: #475569; cursor: pointer;
          transition: 0.2s;
      }
      .suggestion-chip:hover { background: #2563eb; color: white; border-color: #2563eb; }

      /* ปุ่ม Copy & Feedback */
      .copy-btn {
          position: absolute; bottom: 6px; right: 8px;
          width: 24px; height: 24px;
          background: transparent; border: none; cursor: pointer;
          opacity: 0.6; transition: 0.2s; display: flex; align-items: center; justify-content: center;
      }
      .copy-btn:hover { opacity: 1; background: #f1f5f9; border-radius: 4px; }
      .copy-btn svg { width: 14px; height: 14px; fill: #64748b; }
      
      .feedback-container {
          position: absolute; bottom: 6px; right: 40px; /* อยู่ซ้ายปุ่ม Copy */
          display: flex; gap: 8px;
      }
      .feedback-btn { font-size: 12px; cursor: pointer; opacity: 0.5; transition: 0.2s; }
      .feedback-btn:hover { opacity: 1; transform: scale(1.2); }

      /* Animation ตอนพิมพ์ */
      .typing-indicator { font-size: 12px; color: #94a3b8; margin-left: 16px; margin-bottom: 5px; display: none; }
      .msg.bot.typing::after { content: '▋'; animation: blink 1s infinite; }
      @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }

      /* ส่วน Footer (ช่องพิมพ์) */
      .chat-footer { 
          padding: 12px; background: white; border-top: 1px solid #e5e7eb; 
          display: flex; gap: 8px; align-items: center; 
      }
      .chat-input { 
          flex: 1; padding: 10px 14px; 
          border-radius: 24px; border: 1px solid #cbd5e1; outline: none; 
          background: #f8fafc; font-family: 'Sarabun', sans-serif; font-size: 14px;
      }
      .chat-input:focus { border-color: #2563eb; background: white; }
      
      .send-btn { 
          width: 36px; height: 36px; 
          background: #2563eb; color: white; border: none; border-radius: 50%; 
          cursor: pointer; display: flex; align-items: center; justify-content: center; 
          transition: 0.2s; 
      }
      .send-btn:hover { background: #1e40af; }
      .send-btn svg { width: 16px; height: 16px; fill: white; }
    `;
    const styleSheet = document.createElement("style");
    styleSheet.innerText = styles;
    document.head.appendChild(styleSheet);

    // HTML Structure
    container.innerHTML = `
      <div class="chat-btn" onclick="window.carmenToggleChat()">
        <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
      </div>
      <div class="chat-box" id="carmenChatWindow">
        <div class="chat-header">
           <div style="display:flex; align-items:center; gap:10px;">
             <div style="font-size:24px;">👩‍💼</div>
             <div>
               <h3>Carmen AI</h3>
               <span id="carmenUserDisplay">Guest Mode</span>
             </div>
           </div>
           <div class="header-tools">
             <div class="icon-btn" onclick="window.carmenClearChat()" title="ล้างแชท"><svg viewBox="0 0 24 24"><path d="M15 16h4v2h-4zm0-8h7v2h-7zm0 4h6v2h-6zM3 18c0 1.1.9 2 2 2h6c1.1 0 2-.9 2-2V8H3v10zM14 5h-3l-1-1H6L5 5H2v2h12z"/></svg></div>
             <div class="icon-btn" onclick="window.carmenToggleChat()"><svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg></div>
           </div>
        </div>
        <div class="chat-body" id="carmenChatBody"></div>
        <div class="typing-indicator" id="carmenTypingIndicator">Carmen กำลังพิมพ์...</div>
        <div class="chat-footer">
          <input type="text" id="carmenUserInput" class="chat-input" placeholder="พิมพ์ข้อความ..." onkeypress="window.carmenCheckEnter(event)">
          <button class="send-btn" onclick="window.carmenSendMessage()">
            <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
          </button>
        </div>
      </div>
    `;

    // ==========================================
    // 🧠 Javascript Logic
    // ==========================================

    window.carmenStartSession = async function(token, username) {
        accessToken = token;
        currentUser = username;
        document.getElementById('carmen-chat-widget').style.display = 'block';
        document.getElementById('carmenUserDisplay').innerText = `User: ${username}`;
        document.getElementById('carmenChatWindow').classList.add('open');

        const body = document.getElementById('carmenChatBody');
        body.innerHTML = ''; 

        try {
            const res = await fetch(API_URL_HISTORY, {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            if (res.ok) {
                const history = await res.json();
                if (history.length > 0) {
                    history.forEach(msg => {
                        addMessage(msg.message, msg.sender, false);
                    });
                    // ขีดคั่นประวัติ
                    const divider = document.createElement('div');
                    divider.style.cssText = 'text-align:center; font-size:11px; color:#94a3b8; margin:10px 0;';
                    divider.innerText = '— ประวัติการสนทนาล่าสุด —';
                    body.appendChild(divider);
                } else {
                    addMessage(`สวัสดีค่ะคุณ ${username} 👋<br>มีอะไรให้ Carmen ช่วยไหมคะ?`, 'bot', true);
                }
            }
        } catch (e) {
            addMessage(`สวัสดีค่ะคุณ ${username} 👋<br>มีอะไรให้ Carmen ช่วยไหมคะ?`, 'bot', true);
        }

        setTimeout(() => addSuggestions(), 800); 
    };

    window.carmenLogoutAction = function() {
        accessToken = "";
        currentUser = "";
        document.getElementById('carmenChatBody').innerHTML = '';
        document.getElementById('carmenChatWindow').classList.remove('open');
        document.getElementById('carmen-chat-widget').style.display = 'none';
        if(window.onCarmenLogout) window.onCarmenLogout();
    };

    window.carmenToggleChat = function() {
        document.getElementById('carmenChatWindow').classList.toggle('open');
    };

    window.carmenClearChat = function() {
        document.getElementById('carmenChatBody').innerHTML = '';
        addMessage(`ล้างแชทเรียบร้อยค่ะ ✨`, 'bot', true);
        setTimeout(() => addSuggestions(), 1000);
    };

    window.carmenCheckEnter = function(e) { if(e.key === 'Enter') window.carmenSendMessage(); };

    window.carmenSendMessage = async function() {
        const input = document.getElementById('carmenUserInput');
        const text = input.value.trim();
        if(!text) return;
        
        addMessage(text, 'user', false);
        input.value = '';
        
        // ซ่อน Suggestion เดิม
        const suggestions = document.querySelectorAll('.suggestions-container');
        suggestions.forEach(el => el.style.display = 'none');

        document.getElementById('carmenTypingIndicator').style.display = 'block';
        scrollToBottom();

        try {
            const response = await fetch(API_URL_CHAT, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`
                },
                body: JSON.stringify({ text: text })
            });

            if(response.status === 401) {
                alert("Session หมดอายุ กรุณา Login ใหม่");
                window.carmenLogoutAction();
                return;
            }

            const data = await response.json();
            document.getElementById('carmenTypingIndicator').style.display = 'none';
            
            if(data.answer) {
                addMessage(data.answer, 'bot', true, data.message_id);
            } else {
                addMessage("ขออภัยค่ะ ไม่ได้รับคำตอบ", 'bot', true);
            }
        } catch (error) {
            document.getElementById('carmenTypingIndicator').style.display = 'none';
            addMessage("⚠️ Error: เชื่อมต่อไม่ได้", 'bot', true);
        }
    };

    function getYoutubeId(url) {
        const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
        return match ? match[1] : null;
    }

    function addSuggestions() {
        const body = document.getElementById('carmenChatBody');
        const div = document.createElement('div');
        div.className = 'suggestions-container';

        SUGGESTED_QUESTIONS.forEach(q => {
            const chip = document.createElement('div');
            chip.className = 'suggestion-chip';
            chip.innerText = q;
            chip.onclick = function() {
                document.getElementById('carmenUserInput').value = q;
                window.carmenSendMessage();
            };
            div.appendChild(chip);
        });

        body.appendChild(div);
        scrollToBottom();
    }

    // 🪄 Create Message Element
    function addMessage(text, sender, animate = false, msgId = null) {
        const body = document.getElementById('carmenChatBody');
        const div = document.createElement('div');
        div.className = `msg ${sender}`;
        
        let formattedText = text.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>');

        // YouTube Logic
        let videoContent = "";
        const urlRegex = /(https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.be)[^\s<)"']+)/g;
        formattedText = formattedText.replace(urlRegex, (url) => {
            const videoId = getYoutubeId(url);
            if (videoId) {
                videoContent += `<div style="position:relative; width:100%; padding-bottom:56.25%; height:0; border-radius:8px; overflow:hidden; margin-top:8px;">
                                    <iframe src="https://www.youtube.com/embed/${videoId}?rel=0" style="position:absolute; top:0; left:0; width:100%; height:100%; border:0;" allowfullscreen></iframe>
                                 </div>`;
                return `<a href="${url}" target="_blank" style="color:#2563eb; text-decoration:underline;">(ดูวิดีโอ)</a>`; 
            }
            return `<a href="${url}" target="_blank" style="color:#2563eb;">${url}</a>`;
        });

        // Tools HTML
        let toolsHTML = '';
        if (sender === 'bot') {
            // Copy Button
            toolsHTML += `
                <button class="copy-btn" title="คัดลอก">
                    <svg viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
                </button>
            `;
            // Feedback Buttons
            if (msgId) {
                toolsHTML += `
                    <div class="feedback-container">
                        <div class="feedback-btn" onclick="window.carmenRate(${msgId}, 1, this)" title="มีประโยชน์">👍</div>
                        <div class="feedback-btn" onclick="window.carmenRate(${msgId}, -1, this)" title="ไม่ถูกต้อง">👎</div>
                    </div>
                `;
            }
        }

        body.appendChild(div);

        // Copy Logic
        const btn = div.querySelector('.copy-btn');
        if (btn) {
            btn.onclick = function() {
                const rawText = text.replace(/\*\*/g, '').replace(/<br>/g, '\n'); 
                navigator.clipboard.writeText(rawText).then(() => {
                    btn.innerHTML = `<svg viewBox="0 0 24 24" style="fill:#16a34a"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>`;
                    setTimeout(() => {
                        btn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>`;
                    }, 2000);
                });
            };
        }

        // Display Content
        if (sender === 'bot' && animate) {
            div.classList.add('typing');
            let i = 0;
            const speed = 10; // พิมพ์เร็วขึ้นนิดนึง
            function typeWriter() {
                if (i < formattedText.length) {
                    if (formattedText.charAt(i) === '<') {
                        let tag = '';
                        while (formattedText.charAt(i) !== '>' && i < formattedText.length) { tag += formattedText.charAt(i); i++; }
                        tag += '>'; i++;
                        div.innerHTML += tag;
                    } else {
                        div.innerHTML += formattedText.charAt(i);
                        i++;
                    }
                    scrollToBottom();
                    setTimeout(typeWriter, speed);
                } else {
                    div.classList.remove('typing');
                    div.innerHTML = formattedText + videoContent + toolsHTML; // แปะ Tools ตอนจบ
                    scrollToBottom();
                }
            }
            div.innerHTML = ""; 
            typeWriter();
        } else {
            div.innerHTML = formattedText + videoContent + toolsHTML;
            scrollToBottom();
        }
    }

    function scrollToBottom() {
        const body = document.getElementById('carmenChatBody');
        body.scrollTop = body.scrollHeight;
    }

    window.carmenRate = async function(msgId, score, btnElement) {
        const parent = btnElement.parentElement;
        parent.innerHTML = score === 1 
            ? '<span style="font-size:11px; color:#16a34a;">ขอบคุณค่ะ ❤️</span>' 
            : '<span style="font-size:11px; color:#991b1b;">ขอบคุณค่ะ 🙏</span>';
        
        try {
            await fetch(`${BASE_URL}/chat/feedback/${msgId}`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`
                },
                body: JSON.stringify({ score: score })
            });
        } catch(e) { console.error(e); }
    };

})();