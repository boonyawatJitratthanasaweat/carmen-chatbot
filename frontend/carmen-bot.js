(function() {
    const API_URL_CHAT = "https://carmen-chatbot-api.onrender.com/chat"; 
    // ✅ เพิ่ม URL สำหรับ History
    const API_URL_HISTORY = "https://carmen-chatbot-api.onrender.com/chat/history";

    const SUGGESTED_QUESTIONS = [
        "วิธีบันทึกข้อมูล",
        "การคำนวณค่าเสื่อมราคา",
        "วิธีสร้างรหัสลูกหนี้",
        "ยกเลิกรายการอย่างไร"
    ];

    let accessToken = "";
    let currentUser = "";
    
    let container = document.getElementById('carmen-chat-widget');
    if (!container) {
        container = document.createElement('div');
        container.id = 'carmen-chat-widget';
        container.style.display = 'none'; 
        document.body.appendChild(container);
    }

    const styles = `
      @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;600&display=swap');
      #carmen-chat-widget { position: fixed; bottom: 20px; right: 20px; z-index: 99990; font-family: 'Sarabun', sans-serif; }
      
      .chat-btn { width: 65px; height: 65px; background: #000; border-radius: 50%; box-shadow: 0 8px 24px rgba(0,0,0,0.25); cursor: pointer; display: flex; justify-content: center; align-items: center; transition: all 0.3s; }
      .chat-btn:hover { transform: scale(1.1) rotate(5deg); }
      .chat-btn svg { width: 32px; height: 32px; fill: white; }

      .chat-box { position: absolute; bottom: 85px; right: 0; width: 400px; height: 600px; background: white; border-radius: 20px; box-shadow: 0 12px 48px rgba(0,0,0,0.15); display: none; flex-direction: column; overflow: hidden; border: 1px solid #eee; }
      .chat-box.open { display: flex; }

      .chat-header { background: #000; color: white; padding: 15px 20px; display: flex; justify-content: space-between; align-items: center; }
      .header-tools { display: flex; gap: 10px; }
      .icon-btn { cursor: pointer; opacity: 0.8; transition: 0.2s; display: flex; align-items: center; }
      .icon-btn:hover { opacity: 1; transform: scale(1.1); }
      .icon-btn svg { width: 20px; height: 20px; fill: white; }

      .chat-body { flex: 1; padding: 20px; overflow-y: auto; background: #f8f9fa; display: flex; flex-direction: column; gap: 10px; }
      
      .msg { max-width: 85%; padding: 10px 14px; font-size: 14px; line-height: 1.6; border-radius: 12px; word-wrap: break-word; position: relative; }
      .msg.user { background: #000; color: white; align-self: flex-end; border-radius: 18px 18px 4px 18px; }
      
      .msg.bot { 
          background: white; 
          color: #333; 
          align-self: flex-start; 
          border-radius: 18px 18px 18px 4px; 
          border: 1px solid #ddd; 
          padding-bottom: 28px; 
      }
      .msg.bot:hover .copy-btn { opacity: 1; }

      .suggestions-container { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 5px; margin-bottom: 10px; padding: 0 10px; animation: fadeIn 0.5s ease; }
      .suggestion-chip {
          background: #fff;
          border: 1px solid #ddd;
          border-radius: 16px;
          padding: 8px 14px;
          font-size: 13px;
          color: #555;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
          box-shadow: 0 2px 4px rgba(0,0,0,0.02);
      }
      .suggestion-chip:hover {
          background: #000;
          color: #fff;
          border-color: #000;
          transform: translateY(-2px);
      }

      .copy-btn {
          position: absolute;
          bottom: 4px; right: 6px;
          width: 24px; height: 24px;
          background: transparent; border: none; cursor: pointer;
          opacity: 0; transition: opacity 0.2s;
          display: flex; align-items: center; justify-content: center;
          border-radius: 4px; z-index: 10;
      }
      .copy-btn:hover { background: #f0f0f0; }
      .copy-btn svg { width: 14px; height: 14px; fill: #aaa; }
      .copy-btn.copied svg { fill: #10b981; }

      .msg.bot.typing::after { content: '▋'; animation: blink 1s infinite; font-size: 12px; margin-left: 2px; }
      @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }

      .video-wrapper { position: relative; width: 100%; padding-bottom: 56.25%; height: 0; margin-top: 10px; margin-bottom: 5px; border-radius: 12px; overflow: hidden; background: #000; animation: fadeIn 0.5s ease; }
      .video-wrapper iframe { position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0; }
      @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

      .chat-footer { padding: 10px; background: white; border-top: 1px solid #eee; display: flex; gap: 5px; align-items: center; }
      .chat-input { flex: 1; padding: 10px 15px; border-radius: 20px; border: 1px solid #ddd; outline: none; background: #f9f9f9; font-family: 'Sarabun', sans-serif;}
      
      .send-btn { width: 40px; height: 40px; background: #000; color: white; border: none; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: 0.2s; }
      .send-btn:hover { background: #333; }
      .send-btn svg { width: 18px; height: 18px; fill: white; } 
      
      .typing-indicator { font-size: 12px; color: #888; margin-left: 20px; display: none; margin-bottom: 5px; }
    `;
    const styleSheet = document.createElement("style");
    styleSheet.innerText = styles;
    document.head.appendChild(styleSheet);

    container.innerHTML = `
      <div class="chat-btn" onclick="window.carmenToggleChat()">
        <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
      </div>
      <div class="chat-box" id="carmenChatWindow">
        <div class="chat-header">
           <div style="display:flex; align-items:center; gap:10px;">
             <span>👩‍💼</span>
             <div><strong style="font-size:14px;">Carmen</strong><br><span style="font-size:10px; opacity:0.8;" id="carmenUserDisplay">Guest</span></div>
           </div>
           <div class="header-tools">
             <div class="icon-btn" onclick="window.carmenClearChat()" title="ล้างแชท"><svg viewBox="0 0 24 24"><path d="M15 16h4v2h-4zm0-8h7v2h-7zm0 4h6v2h-6zM3 18c0 1.1.9 2 2 2h6c1.1 0 2-.9 2-2V8H3v10zM14 5h-3l-1-1H6L5 5H2v2h12z"/></svg></div>
             <div class="icon-btn" onclick="window.carmenLogoutAction()" title="ออกจากระบบ"><svg viewBox="0 0 24 24"><path d="M10.09 15.59L11.5 17l5-5-5-5-1.41 1.41L12.67 11H3v2h9.67l-2.58 2.59zM19 3H5c-1.11 0-2 .9-2 2v4h2V5h14v14H5v-4H3v4c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/></svg></div>
             <div class="icon-btn" onclick="window.carmenToggleChat()"><svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg></div>
           </div>
        </div>
        <div class="chat-body" id="carmenChatBody"></div>
        <div class="typing-indicator" id="carmenTypingIndicator">กำลังพิมพ์...</div>
        <div class="chat-footer">
          <input type="text" id="carmenUserInput" class="chat-input" placeholder="พิมพ์ข้อความ..." onkeypress="window.carmenCheckEnter(event)">
          <button class="send-btn" onclick="window.carmenSendMessage()">
            <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
          </button>
        </div>
      </div>
    `;

    // Global Functions
    window.carmenStartSession = async function(token, username) {
        accessToken = token;
        currentUser = username;
        document.getElementById('carmen-chat-widget').style.display = 'block';
        document.getElementById('carmenUserDisplay').innerText = `User: ${username}`;
        document.getElementById('carmenChatWindow').classList.add('open');

        const body = document.getElementById('carmenChatBody');
        body.innerHTML = ''; // ล้างของเก่าก่อนเสมอ กันซ้ำ

        // ✅ โหลดประวัติแชทจาก Server
        try {
            const res = await fetch(API_URL_HISTORY, {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            if (res.ok) {
                const history = await res.json();
                if (history.length > 0) {
                    // ถ้ามีประวัติ ให้วนลูปแสดงผล (แบบไม่อนิเมท)
                    history.forEach(msg => {
                        addMessage(msg.message, msg.sender, false);
                    });
                    // ขีดเส้นแบ่งว่า "จบประวัติเก่า"
                    const divider = document.createElement('div');
                    divider.style.textAlign = 'center';
                    divider.style.fontSize = '10px';
                    divider.style.color = '#ccc';
                    divider.style.margin = '10px 0';
                    divider.innerText = '--- ประวัติการสนทนาล่าสุด ---';
                    body.appendChild(divider);
                } else {
                     // ถ้าไม่มีประวัติเก่าเลย ให้ทักทายใหม่
                    addMessage(`สวัสดีค่ะคุณ ${username} 👋<br>มีอะไรให้ Carmen ช่วยไหมคะ?`, 'bot', true);
                }
            }
        } catch (e) {
            console.error("Failed to load history", e);
            // ถ้าโหลดไม่ได้ ก็ทักทายปกติ
            addMessage(`สวัสดีค่ะคุณ ${username} 👋<br>มีอะไรให้ Carmen ช่วยไหมคะ?`, 'bot', true);
        }

        // โชว์คำถามแนะนำเสมอ
        setTimeout(() => addSuggestions(), 1000); 
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
        // อันนี้ล้างแค่หน้าจอ ไม่ได้ลบ DB (ถ้าจะลบ DB ต้องทำ API เพิ่ม)
        document.getElementById('carmenChatBody').innerHTML = '';
        addMessage(`ล้างแชทหน้าจอเรียบร้อยค่ะ ✨`, 'bot', true);
        setTimeout(() => addSuggestions(), 1000);
    };

    window.carmenCheckEnter = function(e) { if(e.key === 'Enter') window.carmenSendMessage(); };

    window.carmenSendMessage = async function() {
        const input = document.getElementById('carmenUserInput');
        const text = input.value.trim();
        if(!text) return;
        
        addMessage(text, 'user', false);
        input.value = '';
        
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
                addMessage(data.answer, 'bot', true);
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
        // เช็คว่ามี suggestion อยู่แล้วไหม ถ้ามีไม่ต้องเพิ่มซ้ำ
        if (body.querySelector('.suggestions-container')) return;

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

    function addMessage(text, sender, animate = false) {
        const body = document.getElementById('carmenChatBody');
        const div = document.createElement('div');
        div.className = `msg ${sender}`;
        
        let formattedText = text.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>');

        let videoContent = "";
        const urlRegex = /(https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.be)[^\s<)"']+)/g;
        formattedText = formattedText.replace(urlRegex, (url) => {
            const videoId = getYoutubeId(url);
            if (videoId) {
                videoContent += `<div class="video-wrapper"><iframe src="https://www.youtube.com/embed/${videoId}?rel=0" frameborder="0" allowfullscreen></iframe></div>`;
                return `<a href="${url}" target="_blank" style="color:#2563eb; text-decoration:underline;">(ลิงก์วิดีโอ)</a>`; 
            }
            return `<a href="${url}" target="_blank" style="color:#2563eb;">เปิดลิงก์</a>`;
        });

        let copyBtnHTML = '';
        if (sender === 'bot') {
            copyBtnHTML = `
                <button class="copy-btn" title="คัดลอก">
                    <svg viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
                </button>
            `;
        }

        body.appendChild(div);

        function attachCopyEvent() {
            const btn = div.querySelector('.copy-btn');
            if (btn) {
                btn.onclick = function() {
                    const rawText = text.replace(/\*\*/g, '').replace(/<br>/g, '\n'); 
                    navigator.clipboard.writeText(rawText).then(() => {
                        btn.classList.add('copied');
                        btn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>`;
                        setTimeout(() => {
                            btn.classList.remove('copied');
                            btn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>`;
                        }, 2000);
                    });
                };
            }
        }

        if (sender === 'bot' && animate) {
            div.classList.add('typing');
            div.innerHTML = copyBtnHTML; 
            
            let i = 0;
            const speed = 15;

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
                    div.innerHTML = formattedText + videoContent + copyBtnHTML;
                    attachCopyEvent();
                    scrollToBottom();
                }
            }
            div.innerHTML = ""; 
            typeWriter();
        } else {
            div.innerHTML = formattedText + videoContent + copyBtnHTML;
            attachCopyEvent();
            scrollToBottom();
        }
    }

    function scrollToBottom() {
        const body = document.getElementById('carmenChatBody');
        body.scrollTop = body.scrollHeight;
    }

})();