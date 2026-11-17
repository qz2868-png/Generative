# Replicate AI Image Generator (Vanilla JS, HTML, CSS)

A simple web project that generates images via [Replicate.com](https://replicate.com) using an API proxy, based on the p5.js example by [Dan O'Sullivan (dano)](https://editor.p5js.org/dano/sketches/tearUK5WJ).

---

## 📁 Project Structure

```text
├── index.html       # Semantic UI markup with prompt input, buttons, status & image container
├── style.css        # Clean, modern, responsive dark-mode styling
├── script.js        # Vanilla JavaScript implementing the fetch request to the Replicate proxy
└── README.md        # Documentation and guide
```

---

## 🚀 How to Run

Because this is pure HTML, CSS, and JavaScript, you can run it in multiple ways:

### Option 1: Directly in your browser
Simply double-click [`index.html`](file:///Users/linda/CODE/Generative/index.html) or open it directly in Chrome, Safari, Firefox, or Edge.

### Option 2: Using a simple local HTTP server
In your terminal, inside this directory:
```bash
# Using Python 3
python3 -m http.server 8000

# Or using npx
npx serve .
```
Then visit `http://localhost:8000`.

---

## 🔍 How it Works

1. **Proxy Endpoint:**
   Calls `https://itp-ima-replicate-proxy.web.app/api/create_n_get`, which securely handles the communication with Replicate's servers without exposing private API keys or triggering CORS blocks in client-side code.

2. **Payload Structure:**
   Sends a JSON POST request with the model identifier and prompt:
   ```json
   {
     "model": "google/nano-banana-2",
     "input": {
       "prompt": "A student trying to learn how use a machine learning API"
     }
   }
   ```

3. **Response Handling:**
   The proxy polls Replicate and returns the completed prediction JSON:
   ```json
   {
     "status": "succeeded",
     "output": "https://replicate.delivery/...",
     "metrics": { "predict_time": 8.48 }
   }
   ```
   The JavaScript receives the resulting image URL, preloads it, updates the live timer, and renders it directly onto the webpage with options to copy or download.

