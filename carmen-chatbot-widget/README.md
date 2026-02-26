
# 🤖 Carmen Chatbot Widget

The official embeddable chatbot widget for **Carmen Enterprise System**.
Easily integrate a smart AI support assistant into any web application with just a few lines of code. Supports multi-tenant knowledge bases, custom LLM models, and rich media rendering.

## ✨ Features

* **⚡ Framework Agnostic:** Works seamlessly with React, Vue, Angular, Next.js, or Vanilla JS.
* **🏢 Multi-Tenant (BU) Support:** Separates chat history, logs, and RAG knowledge base by Business Unit (e.g., HR, Account, Sales).
* **🧠 Model Selection:** Ability to specify which LLM model to use (e.g., GPT-4o, Claude-3.5) directly from the frontend configuration.
* **💾 Persistent Sessions:** Automatically manages user sessions and loads chat history.
* **🎥 Rich Media Support:** Renders Markdown formatting and automatically embeds YouTube videos from links.
* **💬 Interactive UI:** Includes typing animations, copy-to-clipboard tools, suggested questions, and feedback buttons (👍/👎).
* **📱 Mobile Responsive:** Full-screen experience on mobile devices with safe-area support.

---

## 📦 Installation

Install via NPM:

```bash
npm install carmen-chatbot-widget
# or
yarn add carmen-chatbot-widget

```

---

## 🚀 Usage

### 1. Using with React / Next.js / Vue

Import and initialize the widget inside a `useEffect` (React) or `onMounted` (Vue) hook.

```jsx
import { useEffect } from 'react';
import { CarmenBot } from 'carmen-chatbot-widget';

function App() {
  useEffect(() => {
    // Initialize the widget
    new CarmenBot({
      apiBase: "https://your-api.com", // (Required) Backend API URL
      bu: "HR",                       // (Required) Business Unit ID
      user: "John Doe",               // (Required) User Name or ID
      title: "HR Assistant 👩‍💼",       // (Optional) Header Title
      theme: "#34558b"                // (Optional) Theme Color
    });
  }, []);

  return (
    <div className="App">
      <h1>Welcome to Carmen Enterprise</h1>
    </div>
  );
}

export default App;

```

### 2. Using with Vanilla HTML (CDN)

You can use it directly via a script tag. (Note: Replace `@latest` with a specific version if needed).

```html
<!DOCTYPE html>
<html lang="en">
<body>
    <h1>My Website</h1>

    <script src="https://unpkg.com/carmen-chatbot-widget@latest/dist/carmen-widget.js"></script>

    <script>
        // Initialize once the script is loaded
        new CarmenBot({
            apiBase: "https://your-api.com",
            bu: "hotel-seaside",
            user: "Guest User",
            title: "Hotel Concierge",
            theme: "#34558b"
        });
    </script>
</body>
</html>

```

---

## ⚙️ Configuration Options

Pass these options to the `new CarmenBot(config)` constructor.

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| **`apiBase`** | `string` | **(Required)** | The backend API URL (e.g., `https://api.carmen.com`). |
| **`bu`** | `string` | **(Required)** | Business Unit ID. Isolates history and knowledge base. |
| **`user`** | `string` | **(Required)** | User identifier or display name. |
| **`title`** | `string` | `null` | Custom title text displayed in the header. |
| **`theme`** | `string` | `#34558b` | Hex color code for the widget theme. |
| **`prompt_extend`** | `string` | `null` | (Optional) Additional system instructions. |
| **`showClearHistoryButton`** | `boolean` | `true` | Show/hide the history clear button. |
| **`showAttachFileButton`** | `boolean` | `true` | Show/hide the file attachment button. |

---

## 🛠️ Development

If you want to modify the source code locally:

1. **Clone the repository.**
2. **Install dependencies:**
```bash
npm install

```


3. **Run locally (Dev Mode):**
```bash
npm run dev

```


4. **Build for Production:**
```bash
npm run build

```




